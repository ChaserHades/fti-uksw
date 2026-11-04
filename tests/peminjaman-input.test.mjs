import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireDependency = createRequire(import.meta.url);
const valid = { barangId: 'asset-1', namaPeminjam: ' Nama Uji ', ruanganTujuan: ' Lab 1 ',
  deadlineKembali: '2024-02-29', catatan: ' Catatan asli ' };
const noDatabase = new Proxy({}, { get: () => assert.fail('Invalid input must not reach Prisma') });

function load(prisma = noDatabase, role = 'ADMIN') {
  const cache = new Map();
  function read(file) {
    if (cache.has(file)) return cache.get(file);
    const mod = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const requireModule = name => {
      if (name === '@/lib/prisma') return { prisma };
      if (name === '@/lib/auth') return { checkApiAuth: async () => ({
        session: role ? { id: 'operator', role } : null,
        error: role ? null : Response.json({ error: 'Unauthorized' }, { status: 401 }),
      }) };
      return name.startsWith('@/') ? read(name.slice(2) + '.ts') : requireDependency(name);
    };
    vm.runInNewContext(code, { module: mod, exports: mod.exports, require: requireModule,
      Response, Request, URL, Date }, { filename: file });
    cache.set(file, mod.exports);
    return mod.exports;
  }
  return read('app/api/peminjaman/route.ts');
}
const post = body => new Request('http://localhost/api/peminjaman', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body,
});
const get = query => new Request('http://localhost/api/peminjaman' + query);

test('malformed JSON and non-object bodies return 400 before any Prisma access', async () => {
  const api = load();
  for (const body of ['', '{', 'null', '[]', '123', 'true', '"text"']) {
    const response = await api.POST(post(body));
    assert.equal(response.status, 400, body);
    assert.match((await response.json()).error, /JSON/);
  }
});

for (const [field, message] of [
  ['barangId', 'Barang wajib dipilih'], ['namaPeminjam', 'Nama peminjam wajib diisi'],
  ['ruanganTujuan', 'Ruangan wajib diisi'], ['deadlineKembali', 'Deadline kembali wajib diisi'],
]) {
  test(`${field}: missing, blank and wrong types are rejected before Prisma`, async () => {
    const api = load();
    for (const value of [undefined, null, '', ' \n ', 123, false, {}, []]) {
      const response = await api.POST(post(JSON.stringify({ ...valid, [field]: value })));
      assert.equal(response.status, 400, JSON.stringify(value));
      assert.equal((await response.json()).error, message);
    }
  });
}

test('invalid calendar dates and ambiguous date formats cannot create a loan', async () => {
  const api = load();
  for (const date of ['invalid', '2026-02-29', '2026-02-30', '2026-04-31', '2026-13-01',
    '0000-01-01', '10000-01-01', '2026-00-01', '2026-01-00', '01/02/2026',
    '2026-02-30T10:00:00Z', '2026-01-01T25:00:00Z', '2026-01-01T10:00:00']) {
    const response = await api.POST(post(JSON.stringify({ ...valid, deadlineKembali: date })));
    assert.equal(response.status, 400, date);
    assert.match((await response.json()).error, /tanggal yang valid/);
  }
});

test('catatan rejects non-text values before Prisma', async () => {
  const api = load();
  for (const value of [123, false, {}, []]) {
    const response = await api.POST(post(JSON.stringify({ ...valid, catatan: value })));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'Catatan harus berupa teks');
  }
});

test('valid historical/leap dates and ISO timestamps preserve data and server-owned fields', async () => {
  for (const date of ['2024-02-29', '2000-01-01', '9999-12-31', '2026-11-04T00:00:00.000Z', '2026-11-04T07:00:00+07:00']) {
    for (const note of [undefined, null, '', ' Catatan asli ']) {
      const calls = [];
      const api = load({ $transaction: fn => fn({
        barang: { updateMany: async q => { calls.push(['claim', q]); return { count: 1 }; } },
        peminjaman: { create: async q => {
          calls.push(['loan', q]); return { id: 'loan-1', ...q.data, barang: { label: 'A-1' } };
        } },
        logAktivitas: { create: async q => { calls.push(['log', q]); } },
      }) });
      const response = await api.POST(post(JSON.stringify({ ...valid, deadlineKembali: date, catatan: note,
        userId: 'other-user', status: 'SELESAI', terlambat: true })));
      assert.equal(response.status, 201);
      const result = await response.json();
      assert.deepEqual(calls.map(c => c[0]), ['claim', 'loan', 'log']);
      assert.equal(result.namaPeminjam, 'Nama Uji');
      assert.equal(result.ruanganTujuan, 'Lab 1');
      assert.equal(result.deadlineKembali, new Date(date).toISOString());
      assert.equal(result.catatan, note ?? null);
      assert.equal(result.userId, 'operator');
      assert.equal(result.status, 'AKTIF');
      assert.equal(result.terlambat, false);
      assert.equal(calls[0][1].where.status, 'TERSEDIA');
      assert.equal(calls[0][1].where.deletedAt, null);
    }
  }
});

test('invalid limit/status returns 400 before database reads', async () => {
  const api = load();
  for (const limit of ['0', '-1', '501', '1.5', '10junk', 'NaN', 'Infinity', '1e2', ' ', '99999999999999999999']) {
    const response = await api.GET(get('?limit=' + encodeURIComponent(limit)));
    assert.equal(response.status, 400, limit);
    assert.match((await response.json()).error, /Limit/);
  }
  for (const status of ['invalid', 'aktif', 'ALL', ' ']) {
    const response = await api.GET(get('?status=' + encodeURIComponent(status)));
    assert.equal(response.status, 400, status);
    assert.match((await response.json()).error, /Status/);
  }
});

test('existing list sizes, status filters and pagination remain supported', async () => {
  for (const [query, limit] of [['', 50], ['?limit=&status=', 50], ['?limit=1', 1], ['?limit=6', 6], ['?limit=500', 500]]) {
    let take;
    const api = load({ peminjaman: {
      findMany: async q => { take = q.take; return []; }, count: async () => 0,
    } });
    assert.equal((await api.GET(get(query))).status, 200);
    assert.equal(take, limit + 1);
  }
  for (const status of ['AKTIF', 'SELESAI', 'TERLAMBAT']) {
    const queries = [];
    const api = load({ peminjaman: {
      findMany: async q => { queries.push(q); return [
        { id: 'first', status: 'SELESAI', terlambat: false }, { id: 'extra', status: 'SELESAI', terlambat: false },
      ]; }, count: async q => { queries.push(q); return 3; },
    } });
    const response = await api.GET(get(`?status=${status}&limit=1&cursor=previous&userId=operator&search=Nama`));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.data.length, 1);
    assert.equal(result.nextCursor, 'first');
    assert.equal(result.totalCount, 3);
    assert.equal(queries[0].cursor.id, 'previous');
    assert.equal(queries[0].skip, 1);
    assert.equal(queries[0].where.userId, 'operator');
    assert.equal(queries[0].where.OR[0].namaPeminjam.contains, 'Nama');
    assert.deepEqual(queries[0].where, queries[1].where);
    if (status === 'TERLAMBAT') assert.equal(queries[0].where.AND.length, 1);
    else assert.equal(queries[0].where.status, status);
  }
});

test('authentication and role checks happen before parsing invalid input', async () => {
  for (const [role, expected] of [[null, 401], ['UNIVERSITAS', 403]]) {
    const api = load(noDatabase, role);
    assert.equal((await api.POST(post('{'))).status, expected);
    if (!role) assert.equal((await api.GET(get('?limit=invalid'))).status, 401);
  }
});

test('unexpected database failures are not mislabeled as input errors', async () => {
  const failure = new Error('simulated unavailable database');
  const api = load({ $transaction: async () => { throw failure; } });
  await assert.rejects(api.POST(post(JSON.stringify(valid))), error => error === failure);
});
