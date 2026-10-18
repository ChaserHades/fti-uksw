// Run: node --test tests/api-user-privacy.test.mjs
// Execute real handlers with an in-memory Prisma boundary; no database writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import xlsx from 'xlsx';
const requireDependency = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const user = {
  id: 'user-1', name: 'Petugas', email: 'petugas@uksw.edu', role: 'ADMIN',
  statusVerifikasi: 'APPROVED', mustChangePassword: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  password: 'FIXTURE_PASSWORD_HASH_DO_NOT_EXPOSE', provider: 'credentials',
  futureSecret: 'FIXTURE_FUTURE_SECRET_DO_NOT_EXPOSE',
};
const expectedUser = {
  id: user.id, name: user.name, email: user.email, role: user.role,
  statusVerifikasi: user.statusVerifikasi, mustChangePassword: false,
  createdAt: user.createdAt.toISOString(),
};
const expense = { id: 'expense-1', judul: 'Pembelian', nominal: 1000, notaUrls: ['old-nota'], user };
const asset = { id: 'asset-1', label: 'LAP-APP-072026-001', status: 'TERSEDIA', deletedAt: null,
  kategori: { nama: 'Laptop' }, ruangan: { nama: 'Lab' } };
const loan = { id: 'loan-1', barangId: asset.id, namaPeminjam: 'Peminjam',
  ruanganTujuan: 'Lab', status: 'AKTIF', createdAt: new Date('2026-01-01'),
  deadlineKembali: new Date('2026-02-01'), barang: asset, user };

// Model Prisma's scalar defaults and nested select/include, including credentials
// when a handler mistakenly requests an entire User. Unknown future scalar fields
// are deliberately present to check that projection is an allowlist.
function project(record, query = {}) {
  if (record == null) return record;
  if (Array.isArray(record)) return record.map(row => project(row, query));
  const fields = query.select || Object.fromEntries(Object.entries(record)
    .filter(([, value]) => value === null || typeof value !== 'object' || value instanceof Date ||
      (Array.isArray(value) && value.every(item => typeof item !== 'object')))
    .map(([key]) => [key, true]));
  const result = {};
  for (const [key, selection] of Object.entries({ ...fields, ...query.include })) {
    if (!selection || !(key in record)) continue;
    result[key] = selection === true ? record[key] : project(record[key], selection);
  }
  return result;
}
function load(file, prisma, session = user) {
  const cache = new Map();
  function read(relative) {
    if (cache.has(relative)) return cache.get(relative);
    const mod = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const requireModule = name => {
      if (name === '@/lib/prisma') return { prisma };
      if (name === '@/lib/session') return { getSession: async () => session };
      if (name === '@/lib/auth') return { checkApiAuth: async () => ({ session, error: session ? null : Response.json({ error: 'Unauthorized' }, { status: 401 }) }) };
      if (name.startsWith('@/')) return read(name.slice(2) + '.ts');
      return requireDependency(name);
    };
    vm.runInNewContext(code, { module: mod, exports: mod.exports, require: requireModule,
      Response, Request, URL, Buffer, Date, console }, { filename: relative });
    cache.set(relative, mod.exports);
    return mod.exports;
  }
  return read(file);
}
function request(url, method = 'GET', body) {
  return new Request('http://localhost' + url, { method,
    ...(body instanceof FormData ? { body } : body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}) });
}
const params = id => ({ params: Promise.resolve({ id }) });
async function json(response, status = 200) {
  assert.equal(response.status, status);
  const body = await response.json();
  assert.ok(!JSON.stringify(body).includes(user.password));
  assert.ok(!JSON.stringify(body).includes(user.futureSecret));
  return body;
}
function assertProfile(value) { assert.deepEqual(value, expectedUser); }

for (const [route, model, record] of [
  ['peminjaman', 'peminjaman', loan], ['pengeluaran', 'pengeluaran', expense],
]) {
  test(`GET ${route}: profile retained, credentials excluded`, async () => {
    const handler = load(`app/api/${route}/route.ts`, {
      [model]: { findMany: async q => [project(record, q)], count: async () => 1 },
    });
    const body = await json(await handler.GET(request(`/api/${route}`)));
    assert.equal(body.totalCount, 1); assert.equal(body.nextCursor, null);
    assert.equal(body.data[0].id, record.id); assertProfile(body.data[0].user);
  });
}
test('POST peminjaman: existing transaction returns safe user profile', async () => {
  const calls = [];
  const tx = {
    peminjaman: { create: async q => { calls.push(['loan', q.data]); return project({ ...loan, ...q.data }, q); } },
    barang: { update: async q => { calls.push(['asset', q.data]); return asset; } },
    logAktivitas: { create: async () => { calls.push(['log']); } },
  };
  const handler = load('app/api/peminjaman/route.ts', { barang: { findUnique: async () => asset }, $transaction: fn => fn(tx) });
  const body = await json(await handler.POST(request('/api/peminjaman', 'POST', {
    barangId: asset.id, namaPeminjam: 'Peminjam', ruanganTujuan: 'Lab', deadlineKembali: '2026-02-01',
  })), 201);
  assertProfile(body.user); assert.equal(body.namaPeminjam, 'Peminjam');
  assert.deepEqual(calls.map(c => c[0]), ['loan', 'asset', 'log']);
  assert.equal(calls[1][1].status, 'DIPINJAM');
});
test('POST pengeluaran: expense and log flow preserved', async () => {
  let logged = false;
  const handler = load('app/api/pengeluaran/route.ts', {
    pengeluaran: { create: async q => project({ ...expense, ...q.data }, q) },
    logAktivitas: { create: async () => { logged = true; } },
  });
  const fd = new FormData();
  for (const [k, v] of Object.entries({ judul: 'Pembelian', nominal: '1000', tanggal: '2026-01-01', jenis: 'LAINNYA' })) fd.set(k, v);
  const body = await json(await handler.POST(request('/api/pengeluaran', 'POST', fd)), 201);
  assertProfile(body.user); assert.equal(body.nominal, 1000); assert.ok(logged);
});
test('GET expense detail: nested user is safe', async () => {
  const handler = load('app/api/pengeluaran/[id]/route.ts', { pengeluaran: { findUnique: async q => project(expense, q) } });
  const body = await json(await handler.GET(request('/api/pengeluaran/expense-1'), params('expense-1')));
  assert.equal(body.id, expense.id); assertProfile(body.user);
});
for (const method of ['POST', 'DELETE']) {
  test(`${method} nota: attachment mutation preserved, safe response`, async () => {
    let update;
    const handler = load('app/api/pengeluaran/[id]/nota/route.ts', { pengeluaran: {
      findUnique: async () => expense,
      update: async q => { update = q.data; return project(expense, q); },
    } });
    const fd = new FormData(); fd.set('nota', new File(['fixture'], 'nota.pdf', { type: 'application/pdf' }));
    const body = await json(await handler[method](request('/api/pengeluaran/expense-1/nota', method,
      method === 'POST' ? fd : { url: 'old-nota' }), params('expense-1')));
    assertProfile(body.user);
    if (method === 'POST') assert.match(update.notaUrls.push, /^data:application\/pdf;base64,/);
    else assert.equal(update.notaUrls.set.length, 0);
  });
}
for (const mode of ['group', 'legacy']) {
  test(`GET invoice ${mode}: all nested profiles are safe`, async () => {
    let fallbackCalls = 0;
    const item = { ...asset, kelompokPembelian: mode === 'group' ? { id: 'group-1', pengeluaran: [expense] } : null };
    const handler = load('app/api/barang/[id]/invoice/route.ts', {
      barang: { findUnique: async q => project(item, q) },
      pengeluaran: { findMany: async q => { fallbackCalls++; assert.equal(q.where.kodePembelian, '072026-001'); return [project(expense, q)]; } },
    });
    const body = await json(await handler.GET(request('/api/barang/asset-1/invoice'), params('asset-1')));
    assert.equal(body.barang.id, asset.id); assert.equal(body.pengeluarans.length, 1);
    assertProfile(body.pengeluaran.user); assertProfile(body.pengeluarans[0].user);
    if (mode === 'group') assertProfile(body.barang.kelompokPembelian.pengeluaran[0].user);
    assert.equal(fallbackCalls, mode === 'legacy' ? 1 : 0);
  });
}
test('PUT user: returns UI fields without password, preserves update payload', async () => {
  let update;
  const handler = load('app/api/users/[id]/route.ts', { user: { update: async q => { update = q.data; return project({ ...user, ...q.data }, q); } } });
  const input = { name: 'Updated', email: user.email, role: 'TEKNISI', statusVerifikasi: 'APPROVED' };
  const body = await json(await handler.PUT(request('/api/users/user-1', 'PUT', input), params('user-1')));
  assert.deepEqual(body, { ...expectedUser, name: 'Updated', role: 'TEKNISI' });
  assert.deepEqual(JSON.parse(JSON.stringify(update)), input);
});
for (const format of ['csv', 'xlsx']) {
  test(`export ${format}: existing columns and operator name preserved`, async () => {
    const handler = load('app/api/peminjaman/export/route.ts', { peminjaman: { findMany: async q => [project(loan, q)] } });
    const response = await handler.GET(request(`/api/peminjaman/export?format=${format}`));
    assert.equal(response.status, 200);
    const workbook = xlsx.read(Buffer.from(await response.arrayBuffer()), { type: 'buffer' });
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    assert.equal(rows[0].DIPROSES_OLEH, user.name); assert.equal(rows[0].PEMINJAM, loan.namaPeminjam);
    assert.deepEqual(Object.keys(rows[0]), ['NO', 'BARANG', 'LABEL BARANG', 'PEMINJAM',
      'RUANGAN TUJUAN', 'TANGGAL PINJAM', 'DEADLINE KEMBALI', 'TANGGAL KEMBALI',
      'STATUS', 'KETERANGAN', 'CATATAN', 'DIPROSES_OLEH']);
    assert.ok(!JSON.stringify(rows).includes(user.password));
  });
}
test('anonymous invoice and non-admin user edit retain access rejection', async () => {
  const invoice = load('app/api/barang/[id]/invoice/route.ts', {}, null);
  assert.equal((await invoice.GET(request('/api/barang/asset-1/invoice'), params('asset-1'))).status, 401);
  const edit = load('app/api/users/[id]/route.ts', {}, { ...user, role: 'TEKNISI' });
  assert.equal((await edit.PUT(request('/api/users/user-1', 'PUT', { name: 'No access' }), params('user-1'))).status, 403);
});
