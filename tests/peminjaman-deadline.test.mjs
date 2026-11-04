import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import xlsx from 'xlsx';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dependency = createRequire(import.meta.url);
const compiled = new Map();

function load(file, { prisma = {}, now = '2026-11-04T11:00:00.001Z' } = {}) {
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return new Date(now).getTime(); }
  }
  const cache = new Map();
  function read(relative) {
    if (cache.has(relative)) return cache.get(relative);
    if (!compiled.has(relative)) compiled.set(relative, ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText);
    const mod = { exports: {} };
    const requireModule = name => {
      if (name === '@/lib/prisma') return { prisma };
      if (name === '@/lib/auth') return { checkApiAuth: async () => ({ session: { id: 'operator', role: 'ADMIN' }, error: null }) };
      if (name.startsWith('@/')) return read(name.slice(2) + '.ts');
      if (name.startsWith('.')) return read(path.normalize(path.join(path.dirname(relative), name)) + '.ts');
      return dependency(name);
    };
    vm.runInNewContext(compiled.get(relative), { module: mod, exports: mod.exports,
      require: requireModule, Date: Clock, Response, Request, URL, Buffer, console });
    cache.set(relative, mod.exports);
    return mod.exports;
  }
  return read(file);
}

// Evaluate the Prisma conditions against fixtures; real PostgreSQL coverage is
// also included in the HTTP integration suite.
function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'AND') return value.every(item => matches(row, item));
    if (key === 'OR') return value.some(item => matches(row, item));
    if (value && typeof value === 'object') {
      if ('lt' in value) return new Date(row[key]) < value.lt;
      if ('contains' in value) return String(row[key] || '').toLowerCase().includes(value.contains.toLowerCase());
      return matches(row[key] || {}, value);
    }
    return row[key] === value;
  });
}

function loan(id, day, status = 'AKTIF', terlambat = false) {
  return { id, namaPeminjam: id, userId: 'operator', ruanganTujuan: 'Lab',
    deadlineKembali: new Date(day), status, terlambat,
    barang: { kategori: { nama: 'Laptop' }, label: 'LAB-' + id }, user: { name: 'Petugas' } };
}
const fixtures = [
  loan('today', '2026-11-04'), loan('yesterday', '2026-11-03'), loan('future', '2026-11-05'),
  loan('returned-ontime', '2026-11-03', 'SELESAI'),
  loan('returned-late', '2026-11-03', 'SELESAI', true),
  loan('stored-late', '2026-11-05', 'AKTIF', true),
];
const request = query => new Request('http://localhost/api/peminjaman' + query);

for (const zone of ['UTC', 'Asia/Jakarta', 'Asia/Makassar', 'America/Los_Angeles']) {
  test(`18:00 WIB boundary and due-soon use the same instant under ${zone}`, () => {
    const previous = process.env.TZ;
    process.env.TZ = zone;
    try {
      const timing = load('helpers/peminjaman.ts');
      const format = load('helpers/format.ts');
      for (const deadline of ['2026-11-04', new Date('2026-11-04T00:00:00Z')]) {
        for (const [time, late, soon] of [
          ['2026-11-03T10:59:59.999Z', false, false],
          ['2026-11-03T11:00:00.000Z', false, true],
          ['2026-11-04T10:59:59.999Z', false, true],
          ['2026-11-04T11:00:00.000Z', false, false],
          ['2026-11-04T11:00:00.001Z', true, false],
        ]) {
          const now = new Date(time);
          assert.equal(timing.isOverdue(deadline, now), late);
          assert.equal(timing.isDueSoon(deadline, now), soon);
          assert.equal(format.isOverdue(deadline, now), late);
          assert.equal(format.isDueSoon(deadline, now), soon);
        }
      }
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });
}

for (const day of ['2026-11-04', '2026-12-31', '2028-02-29']) {
  test(`database filter agrees with displayed lateness across the cutoff on ${day}`, () => {
    const timing = load('helpers/peminjaman.ts');
    const midnight = new Date(day).getTime();
    for (const hours of [-8, -1, 0, 10, 11, 11 + 1 / 3600000, 17, 23, 24, 35]) {
      const now = new Date(midnight + hours * 3600000);
      for (const offset of [-2, -1, 0, 1, 2]) {
        for (const status of ['AKTIF', 'SELESAI']) {
          for (const storedLate of [false, true]) {
            for (const timeOfDay of [0, 23 * 3600000]) {
              const row = loan('fixture', new Date(midnight + offset * 86400000 + timeOfDay), status, storedLate);
              assert.equal(matches(row, timing.lateLoanFilter(now)), timing.isLoanLate(row, now));
            }
          }
        }
      }
    }
  });
}

test('completed on-time stays on-time; persisted late remains late; invalid input is not due soon', () => {
  const timing = load('helpers/peminjaman.ts');
  assert.equal(timing.isLoanLate(fixtures[3], new Date('2030-01-01')), false);
  assert.equal(timing.isLoanLate(fixtures[4], new Date('2020-01-01')), true);
  assert.equal(timing.isOverdue('invalid'), false);
  assert.equal(timing.isDueSoon('invalid'), false);
});

for (const [now, expected] of [
  ['2026-11-04T10:59:59.999Z', ['yesterday', 'returned-late', 'stored-late']],
  ['2026-11-04T11:00:00.000Z', ['yesterday', 'returned-late', 'stored-late']],
  ['2026-11-04T11:00:00.001Z', ['today', 'yesterday', 'returned-late', 'stored-late']],
]) {
  test(`list/filter/count/dashboard agree at ${now}; GET makes no writes`, async () => {
    const prisma = {
      peminjaman: {
        findMany: async q => fixtures.filter(row => matches(row, q.where)).slice(0, q.take),
        count: async q => fixtures.filter(row => matches(row, q.where)).length,
      },
      barang: { count: async () => 0, groupBy: async () => [] }, ruangan: { count: async () => 0 },
      user: { count: async () => 0 }, pengeluaran: { aggregate: async () => ({ _sum: { nominal: 0 }, _count: { id: 0 } }) },
    };
    const api = load('app/api/peminjaman/route.ts', { now, prisma });
    const filtered = await (await api.GET(request('?status=TERLAMBAT'))).json();
    assert.deepEqual(filtered.data.map(r => r.id), expected);
    assert.equal(filtered.totalCount, expected.length);
    assert.ok(filtered.data.every(r => r.terlambat));
    const all = await (await api.GET(request(''))).json();
    assert.deepEqual(all.data.filter(r => r.terlambat).map(r => r.id), expected);
    const dashboard = load('app/api/dashboard/stats/route.ts', { now, prisma });
    const stats = await (await dashboard.GET()).json();
    assert.equal(stats.terlambat, expected.length - 1); // Completed late belongs to history only.
    assert.equal(stats.dipinjam, 4);
    assert.equal(fixtures[0].terlambat, false); // GET must not persist a computed flag.
    const search = await (await api.GET(request('?status=TERLAMBAT&search=future&userId=operator'))).json();
    assert.equal(search.totalCount, 0);
    const firstPage = await (await api.GET(request('?status=TERLAMBAT&limit=1'))).json();
    assert.equal(firstPage.data.length, 1);
    assert.equal(firstPage.totalCount, expected.length);
    assert.equal(firstPage.nextCursor, expected[0]);
  });
}

for (const format of ['csv', 'xlsx']) {
  test(`export ${format} labels active overdue and completed history correctly`, async () => {
    const api = load('app/api/peminjaman/export/route.ts', { prisma: { peminjaman: { findMany: async () => fixtures } } });
    const response = await api.GET(request('/export?format=' + format));
    assert.equal(response.status, 200);
    const workbook = xlsx.read(Buffer.from(await response.arrayBuffer()), { type: 'buffer' });
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    assert.deepEqual(rows.map(r => r.KETERANGAN), ['Terlambat', 'Terlambat', 'Aktif', 'Selesai', 'Terlambat', 'Terlambat']);
    assert.equal(fixtures[0].terlambat, false);
  });
}

for (const [now, expected] of [
  ['2026-11-04T10:59:59.999Z', false],
  ['2026-11-04T11:00:00.000Z', false],
  ['2026-11-04T11:00:00.001Z', true],
]) {
  test(`return persists lateness at ${now} without changing the return flow`, async () => {
    const writes = [];
    const prisma = {
      peminjaman: { findUnique: async () => fixtures[0], update: q => { writes.push(q.data); return Promise.resolve(q.data); } },
      barang: { findUnique: async () => ({ id: 'asset', deletedAt: null }), update: q => { writes.push(q.data); return Promise.resolve(q.data); } },
      logAktivitas: { create: q => { writes.push(q.data); return Promise.resolve(q.data); } },
      $transaction: async queries => Promise.all(queries),
    };
    const api = load('app/api/peminjaman/[id]/kembali/route.ts', { now, prisma });
    const result = await api.POST(request(''), { params: Promise.resolve({ id: 'today' }) });
    assert.equal(result.status, 200);
    const body = await result.json();
    assert.equal(body.status, 'SELESAI');
    assert.equal(body.terlambat, expected);
    assert.equal(body.tanggalKembali, now);
    assert.equal(writes.length, 3);
    assert.equal(writes[1].status, 'TERSEDIA');
    assert.equal(writes[2].entitas, 'PEMINJAMAN');
  });
}
