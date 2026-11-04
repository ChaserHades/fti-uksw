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
const noDatabase = new Proxy({}, { get: () => assert.fail('Invalid input must not reach Prisma') });

function load(file, prisma = noDatabase, role = 'ADMIN') {
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
      Response, Request, URL, Date, Buffer }, { filename: file });
    cache.set(file, mod.exports);
    return mod.exports;
  }
  return read(file);
}

const base = { judul: ' Uji Cashflow ', nominal: '1000.50', tanggal: '2024-02-29', jenis: 'LAINNYA' };
const params = { params: Promise.resolve({ id: 'expense-1' }) };
function request(method, changes = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...base, ...changes })) {
    if (value !== undefined) form.set(key, value);
  }
  return new Request('http://localhost/api/pengeluaran', { method, body: form });
}
const fileFor = method => `app/api/pengeluaran/${method === 'PUT' ? '[id]/' : ''}route.ts`;

for (const method of ['POST', 'PUT']) {
  for (const [field, values] of [
    ['judul', [undefined, '', '  ', new File(['x'], 'text.txt')]],
    ['nominal', [undefined, '', ' ', '0', '-1', '1000abc', 'Infinity', 'NaN', '1e999', '0x10', new File(['1'], 'n.txt')]],
    ['tanggal', [undefined, '', 'bad', '2026-02-30', '2026-02-29', '0000-01-01', '2026-01-01T00:00:00', new File(['x'], 'd.txt')]],
    ['jenis', [undefined, '', 'SALAH', new File(['x'], 'j.txt')]],
    ['pembelianKe', ['0', '-1', '1.5', '1abc', '2147483648', 'Infinity', new File(['x'], 'p.txt')]],
    ['barangIds', ['{', 'null', '{}', '"asset-1"', '[123]', '[null]', '[""]', '[" "]', new File(['[]'], 'ids.txt')]],
    ['nota', ['', 'text', new File(['x'], 'nota.exe')]],
  ]) {
    test(`${method} ${field}: invalid input returns 400 before any database access`, async () => {
      const api = load(fileFor(method));
      for (const value of values) {
        const response = await api[method](request(method, { [field]: value, ...(field === 'pembelianKe' ? {} : { pembelianKe: '1' }) }), params);
        assert.equal(response.status, 400, `${field}: ${String(value)}`);
        assert.equal(typeof (await response.json()).error, 'string');
      }
    });
  }
  test(`${method}: optional text fields cannot contain uploaded files`, async () => {
    const api = load(fileFor(method));
    for (const key of ['namaBarang', 'progdi', 'deskripsi', 'keterangan', 'jenisBukti', 'nomorBukti']) {
      const response = await api[method](request(method, { [key]: new File(['x'], 'field.txt') }), params);
      assert.equal(response.status, 400, key);
    }
  });
  test(`${method}: unreadable form body returns 400, permissions are checked first`, async () => {
    for (const [role, expected] of [['ADMIN', 400], ['TEKNISI', 403], ['UNIVERSITAS', 403], [null, 401]]) {
      const response = await load(fileFor(method), noDatabase, role)[method](new Request('http://localhost/api/pengeluaran', {
        method, headers: { 'content-type': 'application/json' }, body: '{}',
      }), params);
      assert.equal(response.status, expected);
    }
  });
  test(`${method}: valid input keeps amount, attachment and relation semantics`, async () => {
    for (const barangIds of [undefined, '[]', '["asset-1"]']) {
      const calls = [];
      const save = async q => { calls.push(['save', q.data]); return { id: 'expense-1', ...q.data }; };
      const api = load(fileFor(method), {
        pengeluaran: { create: save, update: save },
        logAktivitas: { create: async q => { calls.push(['log', q.data]); } },
      });
      const response = await api[method](request(method, { barangIds,
        deskripsi: ' Deskripsi tambah ', keterangan: 'Keterangan edit',
        nota: new File(['PDF test'], 'NOTA.PDF', { type: 'application/pdf' }),
      }), params);
      assert.equal(response.status, method === 'POST' ? 201 : 200);
      const result = await response.json();
      assert.equal(result.nominal, 1000.5);
      assert.equal(result.tanggal, '2024-02-29T00:00:00.000Z');
      assert.equal(result.pembelianKe, null);
      assert.deepEqual(calls.map(c => c[0]), ['save', 'log']);
      assert.equal(calls[1][1].aksi, method === 'POST' ? 'CREATE' : 'UPDATE');
      assert.equal(result.deskripsi, method === 'POST' ? 'Deskripsi tambah' : 'Keterangan edit');
      const notes = method === 'POST' ? result.notaUrls : result.notaUrls.push;
      assert.match(notes[0], /^data:application\/pdf;base64,/);
      if (method === 'PUT' && barangIds !== undefined) assert.equal(result.barang.set.length, JSON.parse(barangIds).length);
      else if (barangIds === '["asset-1"]') assert.equal(result.barang.connect[0].id, 'asset-1');
      else assert.equal(result.barang, undefined);
    }
  });
  test(`${method}: positive decimal/scientific values and optional empty values still work`, async () => {
    for (const value of ['1', '1.25', '.5', '1e3', ' 1000 ']) {
      const save = async q => ({ id: 'expense-1', ...q.data });
      const api = load(fileFor(method), {
        pengeluaran: { create: save, update: save }, logAktivitas: { create: async () => ({}) },
      });
      const response = await api[method](request(method, { nominal: value, pembelianKe: '', barangIds: '',
        nota: new File([], 'empty.pdf'), tanggal: '2026-11-04T00:00:00Z' }), params);
      assert.equal(response.status, method === 'POST' ? 201 : 200);
      const result = await response.json();
      assert.equal(result.nominal, Number(value));
      assert.equal(result.pembelianKe, null);
      assert.equal(method === 'POST' ? result.notaUrls.length : result.notaUrls, method === 'POST' ? 0 : undefined);
    }
  });
}

test('GET rejects invalid limit/jenis before Prisma', async () => {
  const api = load(fileFor('POST'));
  for (const query of ['limit=0', 'limit=-1', 'limit=501', 'limit=1.5', 'limit=10junk', 'jenis=SALAH']) {
    const response = await api.GET(new Request('http://localhost/api/pengeluaran?' + query));
    assert.equal(response.status, 400, query);
  }
});
test('GET preserves filters, search, pagination and defaults', async () => {
  for (const [query, limit] of [['', 50], ['?limit=&jenis=', 50], ['?limit=500', 500],
    ['?limit=1&jenis=MAINTENANCE&search=Uji&cursor=previous', 1]]) {
    const queries = [];
    const api = load(fileFor('POST'), { pengeluaran: {
      findMany: async q => { queries.push(q); return limit === 1 ? [{ id: 'first' }, { id: 'extra' }] : []; },
      count: async q => { queries.push(q); return 3; },
    } });
    const response = await api.GET(new Request('http://localhost/api/pengeluaran' + query));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(queries[0].take, limit + 1);
    assert.deepEqual(queries[0].where, queries[1].where);
    if (limit === 1) {
      assert.equal(result.nextCursor, 'first');
      assert.equal(result.data.length, 1);
      assert.equal(result.totalCount, 3);
      assert.equal(queries[0].where.jenis, 'MAINTENANCE');
      assert.equal(queries[0].where.OR[0].judul.contains, 'Uji');
      assert.equal(queries[0].cursor.id, 'previous');
    }
  }
});
