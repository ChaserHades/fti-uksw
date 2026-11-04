// Run after npm run build with TEST_DATABASE_ADMIN_URL set to a local PostgreSQL
// connection with CREATEDB permission. Only a newly created test database is used.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Client } from 'pg';
import { SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import xlsx from 'xlsx';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

test('peminjaman with real HTTP, Prisma and PostgreSQL', { timeout: 120_000 }, async t => {
  assert.ok(process.env.TEST_DATABASE_ADMIN_URL, 'Set TEST_DATABASE_ADMIN_URL explicitly; the application database is never a test target.');
  const url = new URL(process.env.TEST_DATABASE_ADMIN_URL);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only local PostgreSQL is supported.');
  assert.ok(fs.existsSync(path.join(root, '.next/BUILD_ID')), 'Run npm run build first.');
  const database = 'fti_loan_test_' + randomUUID().replaceAll('-', '');
  const admin = new Client({ connectionString: url.toString() });
  const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fti-loan-test-'));
  const log = fs.openSync(path.join(logDir, 'server.log'), 'w', 0o600);
  let db, blocker, server, serverClosed, created = false;
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE ${database}`);
    created = true;
    url.pathname = '/' + database;
    db = new Client({ connectionString: url.toString() });
    await db.connect();
    const migrations = path.join(root, 'prisma/migrations');
    for (const name of fs.readdirSync(migrations).filter(n => /^\d/.test(n)).sort()) {
      await db.query(fs.readFileSync(path.join(migrations, name, 'migration.sql'), 'utf8'));
    }
    for (const [id, role] of [['admin', 'ADMIN'], ['tech', 'TEKNISI'], ['univ', 'UNIVERSITAS']]) {
      await db.query(`INSERT INTO users (id, name, email, password, role, "statusVerifikasi", "updatedAt")
        VALUES ($1, $1, $2, 'TEST_HASH_MUST_NOT_BE_RETURNED', $3, 'APPROVED', now())`, [id, id + '@example.test', role]);
    }
    await db.query(`INSERT INTO kategori (id, nama, "updatedAt") VALUES ('test-category', 'Test category', now())`);

    const portProbe = net.createServer();
    await new Promise(resolve => portProbe.listen(0, '127.0.0.1', resolve));
    const port = portProbe.address().port;
    await new Promise(resolve => portProbe.close(resolve));
    const secret = randomUUID();
    server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: url.toString(), JWT_SECRET: secret },
      stdio: ['ignore', log, log],
    });
    serverClosed = once(server, 'close');
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let i = 0; i < 100; i++) {
      assert.equal(server.exitCode, null, 'Test server exited; inspect ' + logDir);
      try {
        if ((await fetch(base + '/api/me')).status === 401) { ready = true; break; }
      } catch { /* Server is still starting. */ }
      await pause(100);
    }
    assert.ok(ready, 'Test server did not become ready; inspect ' + logDir);
    const cookies = {};
    for (const id of ['admin', 'tech', 'univ']) {
      cookies[id] = 'fti_session=' + await new SignJWT({ id, sessionVersion: 0 })
        .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('5m')
        .sign(new TextEncoder().encode(secret));
    }
    const send = (route, body, actor = 'admin') => fetch(base + route, {
      method: 'POST', headers: { 'content-type': 'application/json', ...(actor ? { cookie: cookies[actor] } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
    });
    const payload = (id, name = 'Test borrower') => ({ barangId: id, namaPeminjam: name,
      ruanganTujuan: ' Test room ', deadlineKembali: '2099-01-01', catatan: 'Concurrency fixture' });
    const borrow = (id, name, actor) => send('/api/peminjaman', payload(id, name), actor);
    const asset = async (status = 'TERSEDIA', deleted = false) => {
      const id = randomUUID();
      await db.query(`INSERT INTO barang (id, label, "kategoriId", status, "deletedAt", "updatedAt")
        VALUES ($1, $1, 'test-category', $2, $3, now())`, [id, status, deleted ? new Date() : null]);
      return id;
    };
    const state = async id => {
      const { rows: [row] } = await db.query(`SELECT status,
        (SELECT count(*)::int FROM peminjaman WHERE "barangId" = $1) AS loans,
        (SELECT count(*)::int FROM peminjaman WHERE "barangId" = $1 AND status = 'AKTIF') AS active,
        (SELECT count(*)::int FROM log_aktivitas l JOIN peminjaman p ON p.id = l."entitasId"
          WHERE p."barangId" = $1 AND l.entitas = 'PEMINJAMAN' AND l.aksi = 'CREATE') AS logs
        FROM barang WHERE id = $1`, [id]);
      return row;
    };
    const assertSafe = body => {
      assert.ok(body.user.id);
      assert.equal(body.user.password, undefined);
      assert.equal(body.user.sessionVersion, undefined);
      assert.equal(body.barang.status, 'DIPINJAM');
    };

    await t.test('two overlapping requests: one 201, one 409, one loan and one log (three rounds)', async () => {
      blocker = new Client({ connectionString: url.toString() });
      await blocker.connect();
      for (let round = 0; round < 3; round++) {
        const id = await asset();
        await blocker.query('BEGIN');
        await blocker.query('SELECT id FROM barang WHERE id = $1 FOR UPDATE', [id]);
        const pending = Promise.all([borrow(id, 'Borrower A', 'admin'), borrow(id, 'Borrower B', 'tech')]);
        pending.catch(() => {});
        try {
          // Both HTTP requests must be waiting for a database lock before release.
          // This proves overlap instead of relying on request timing alone.
          let waiting = 0;
          for (let i = 0; i < 60; i++) {
            const { rows: [row] } = await db.query(`SELECT count(*)::int AS n FROM pg_stat_activity
              WHERE datname = current_database() AND wait_event_type = 'Lock'`);
            waiting = row.n;
            if (waiting >= 2) break;
            await pause(50);
          }
          assert.ok(waiting >= 2, 'Both borrowing requests should overlap inside PostgreSQL');
        } finally {
          await blocker.query('COMMIT');
        }
        const responses = await pending;
        assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
        const winner = await responses.find(r => r.status === 201).json();
        assertSafe(winner);
        assert.equal(winner.ruanganTujuan, 'Test room');
        const loser = await responses.find(r => r.status === 409).json();
        assert.match(loser.error, /sudah dipinjam|tidak lagi tersedia/);
        assert.deepEqual(await state(id), { status: 'DIPINJAM', loans: 1, active: 1, logs: 1 });
        assert.equal((await borrow(id, 'Retry')).status, 409);
        assert.equal((await state(id)).loans, 1);
      }
    });

    await t.test('different assets can be borrowed together', async () => {
      const ids = await Promise.all([asset(), asset()]);
      const responses = await Promise.all(ids.map(id => borrow(id)));
      assert.deepEqual(responses.map(r => r.status), [201, 201]);
      for (const id of ids) assert.deepEqual(await state(id), { status: 'DIPINJAM', loans: 1, active: 1, logs: 1 });
    });

    await t.test('missing, deleted and maintenance assets do not create loans', async () => {
      assert.equal((await borrow(randomUUID())).status, 400);
      for (const [status, deleted, expected] of [['TERSEDIA', true, 400], ['MAINTENANCE', false, 409]]) {
        const id = await asset(status, deleted);
        assert.equal((await borrow(id)).status, expected);
        assert.deepEqual(await state(id), { status, loans: 0, active: 0, logs: 0 });
      }
    });

    for (const table of ['peminjaman', 'log_aktivitas']) {
      await t.test(`failure inserting ${table} rolls back status, loan and log; retry succeeds`, async () => {
        const id = await asset();
        const { rows: [{ n: logsBefore }] } = await db.query('SELECT count(*)::int AS n FROM log_aktivitas');
        await db.query(`CREATE FUNCTION fail_loan_fixture() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN RAISE EXCEPTION 'Intentional rollback fixture'; END; $$`);
        await db.query(`CREATE TRIGGER fail_loan_fixture BEFORE INSERT ON ${table}
          FOR EACH ROW EXECUTE FUNCTION fail_loan_fixture()`);
        try {
          assert.equal((await borrow(id)).status, 500);
          assert.deepEqual(await state(id), { status: 'TERSEDIA', loans: 0, active: 0, logs: 0 });
          const { rows: [{ n }] } = await db.query('SELECT count(*)::int AS n FROM log_aktivitas');
          assert.equal(n, logsBefore);
        } finally {
          await db.query(`DROP TRIGGER fail_loan_fixture ON ${table}`);
          await db.query('DROP FUNCTION fail_loan_fixture()');
        }
        const response = await borrow(id, ' Retry borrower ');
        assert.equal(response.status, 201);
        const body = await response.json();
        assertSafe(body);
        assert.equal(body.namaPeminjam, 'Retry borrower');
        assert.deepEqual(await state(id), { status: 'DIPINJAM', loans: 1, active: 1, logs: 1 });
      });
    }

    await t.test('normal return permits a later loan of the same asset', async () => {
      const id = await asset();
      const first = await borrow(id);
      assert.equal(first.status, 201);
      const loan = await first.json();
      const returned = await send(`/api/peminjaman/${loan.id}/kembali`, {}, 'tech');
      assert.equal(returned.status, 200);
      assert.equal((await returned.json()).status, 'SELESAI');
      assert.deepEqual(await state(id), { status: 'TERSEDIA', loans: 1, active: 0, logs: 1 });
      assert.equal((await borrow(id, 'Next borrower', 'tech')).status, 201);
      assert.deepEqual(await state(id), { status: 'DIPINJAM', loans: 2, active: 1, logs: 2 });
    });

    await t.test('anonymous and university users cannot borrow', async () => {
      const id = await asset();
      assert.equal((await borrow(id, 'Anonymous', null)).status, 401);
      assert.equal((await borrow(id, 'University', 'univ')).status, 403);
      assert.deepEqual(await state(id), { status: 'TERSEDIA', loans: 0, active: 0, logs: 0 });
    });

    await t.test('deadline flags, filters, dashboard, export and return agree without GET writes', async () => {
      const read = async route => {
        const response = await fetch(base + route, { headers: { cookie: cookies.admin } });
        assert.equal(response.status, 200);
        return response.json();
      };
      const before = await read('/api/dashboard/stats');
      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const yesterday = new Date(new Date(day).getTime() - 86400000).toISOString().slice(0, 10);
      const tomorrow = new Date(new Date(day).getTime() + 86400000).toISOString().slice(0, 10);
      const todayLate = now > new Date(day + 'T11:00:00Z');
      const prefix = 'deadline-' + randomUUID();
      const records = [];
      for (const [label, date, late] of [['yesterday', yesterday, true], ['today', day, todayLate], ['future', tomorrow, false]]) {
        const id = await asset();
        const response = await send('/api/peminjaman', { ...payload(id, prefix + '-' + label), deadlineKembali: date });
        assert.equal(response.status, 201);
        records.push({ ...(await response.json()), expectedLate: late });
      }
      const query = '?search=' + encodeURIComponent(prefix);
      const all = await read('/api/peminjaman' + query);
      assert.equal(all.totalCount, 3);
      for (const row of records) assert.equal(all.data.find(r => r.id === row.id).terlambat, row.expectedLate);
      const filtered = await read('/api/peminjaman' + query + '&status=TERLAMBAT&userId=admin');
      assert.deepEqual(filtered.data.map(r => r.id).sort(), records.filter(r => r.expectedLate).map(r => r.id).sort());
      assert.equal(filtered.totalCount, 1 + Number(todayLate));
      const paged = await read('/api/peminjaman' + query + '&status=TERLAMBAT&limit=1');
      assert.equal(paged.data.length, 1);
      assert.equal(paged.totalCount, filtered.totalCount);
      assert.equal((await read('/api/dashboard/stats')).terlambat, before.terlambat + filtered.totalCount);
      for (const format of ['csv', 'xlsx']) {
        const response = await fetch(base + '/api/peminjaman/export?format=' + format, { headers: { cookie: cookies.admin } });
        assert.equal(response.status, 200);
        const workbook = xlsx.read(Buffer.from(await response.arrayBuffer()), { type: 'buffer' });
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        for (const row of records) assert.equal(rows.find(r => r.PEMINJAM === row.namaPeminjam).KETERANGAN, row.expectedLate ? 'Terlambat' : 'Aktif');
      }
      const { rows: stored } = await db.query('SELECT terlambat FROM peminjaman WHERE id = ANY($1::text[])', [records.map(r => r.id)]);
      assert.ok(stored.every(r => r.terlambat === false), 'Read and export must not persist computed lateness');
      const lateReturn = await send(`/api/peminjaman/${records[0].id}/kembali`, {});
      assert.equal(lateReturn.status, 200);
      assert.equal((await lateReturn.json()).terlambat, true);
      const onTimeReturn = await send(`/api/peminjaman/${records[2].id}/kembali`, {});
      assert.equal(onTimeReturn.status, 200);
      assert.equal((await onTimeReturn.json()).terlambat, false);
      // A historical on-time return must not become late as time passes.
      await db.query('UPDATE peminjaman SET "deadlineKembali" = $1, "tanggalKembali" = $2 WHERE id = $3',
        [yesterday, yesterday + 'T10:00:00Z', records[2].id]);
      const history = await read('/api/peminjaman' + query + '&status=TERLAMBAT');
      assert.ok(history.data.some(r => r.id === records[0].id && r.status === 'SELESAI' && r.terlambat));
      assert.ok(!history.data.some(r => r.id === records[2].id));
      assert.equal((await read('/api/dashboard/stats')).terlambat, before.terlambat + Number(todayLate));
    });
  } finally {
    if (server && server.exitCode === null) server.kill('SIGTERM');
    if (serverClosed) await serverClosed;
    fs.closeSync(log);
    if (blocker) await blocker.end();
    if (db) await db.end();
    if (created) await admin.query(`DROP DATABASE ${database} WITH (FORCE)`);
    await admin.end();
  }
});
