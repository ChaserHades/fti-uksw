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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

test('pengeluaran validation with real HTTP, Prisma and PostgreSQL', { timeout: 120_000 }, async t => {
  assert.ok(process.env.TEST_DATABASE_ADMIN_URL, 'Set TEST_DATABASE_ADMIN_URL explicitly; the application database is never a test target.');
  const url = new URL(process.env.TEST_DATABASE_ADMIN_URL);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only local PostgreSQL is supported.');
  assert.ok(fs.existsSync(path.join(root, '.next/BUILD_ID')), 'Run npm run build first.');
  const database = 'fti_expense_test_' + randomUUID().replaceAll('-', '');
  const admin = new Client({ connectionString: url.toString() });
  const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fti-expense-test-'));
  const log = fs.openSync(path.join(logDir, 'server.log'), 'w', 0o600);
  let db, server, serverClosed, created = false;
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

    await db.query(`INSERT INTO barang (id, label, "kategoriId", status, "updatedAt")
      VALUES ('asset-1', 'UJI-07', 'test-category', 'TERSEDIA', now())`);
    const form = (changes = {}) => {
      const fd = new FormData();
      for (const [key, value] of Object.entries({ judul: 'UJI-07', nominal: '1000.50', tanggal: '2024-02-29',
        jenis: 'PEMBELIAN_ASET', pembelianKe: '1', barangIds: '["asset-1"]', ...changes })) {
        if (value !== undefined) fd.set(key, value);
      }
      return fd;
    };
    const send = (method, route, body, actor = 'admin') => fetch(base + route, {
      method, headers: actor ? { cookie: cookies[actor] } : {}, body, signal: AbortSignal.timeout(15_000),
    });
    const snapshot = async () => {
      const result = {};
      for (const table of ['pengeluaran', 'kelompok_pembelian', 'barang', 'log_aktivitas']) {
        result[table] = (await db.query(`SELECT * FROM ${table} ORDER BY id`)).rows;
      }
      return result;
    };
    const invalid = [
      { nominal: '1000abc' }, { nominal: 'Infinity' }, { nominal: '-1' }, { nominal: '0' },
      { tanggal: '2026-02-30' }, { pembelianKe: '1.5' }, { judul: ' ' }, { jenis: 'SALAH' },
      { barangIds: '{' }, { barangIds: 'null' }, { barangIds: '[123]' },
      { nota: 'not a file' }, { nota: new File(['bad'], 'nota.exe') },
    ];
    await t.test('invalid creates leave no expense, purchase group, asset change or log', async () => {
      const before = await snapshot();
      for (const changes of invalid) {
        const response = await send('POST', '/api/pengeluaran', form(changes));
        assert.equal(response.status, 400, JSON.stringify(changes));
        assert.equal(typeof (await response.json()).error, 'string');
        assert.deepEqual(await snapshot(), before);
      }
    });
    let id, groupId, originalNota;
    await t.test('valid create saves amount, PDF, purchase group, asset relation and log', async () => {
      const response = await send('POST', '/api/pengeluaran', form({ nota: new File(['PDF fixture'], 'nota.pdf') }));
      assert.equal(response.status, 201);
      const data = await response.json();
      id = data.id; groupId = data.kelompokPembelianId; originalNota = data.notaUrls[0];
      assert.equal(data.nominal, 1000.5);
      assert.equal(data.kodePembelian, '022024-001');
      assert.equal(data.user.password, undefined);
      assert.equal(data.user.sessionVersion, undefined);
      assert.match(originalNota, /^data:application\/pdf;base64,/);
      const detail = await send('GET', '/api/pengeluaran/' + id);
      assert.equal(detail.status, 200);
      assert.equal((await detail.json()).barang[0].id, 'asset-1');
      assert.equal((await db.query('SELECT "kelompokPembelianId" FROM barang WHERE id = $1', ['asset-1'])).rows[0].kelompokPembelianId, groupId);
      assert.equal((await db.query("SELECT count(*)::int AS n FROM log_aktivitas WHERE entitas = 'PENGELUARAN' AND aksi = 'CREATE'")).rows[0].n, 1);
    });
    await t.test('invalid edits preserve existing values, attachment, group, relations and log', async () => {
      assert.ok(id);
      const before = await snapshot();
      for (const changes of invalid) {
        const response = await send('PUT', '/api/pengeluaran/' + id, form({ pembelianKe: '2', ...changes }));
        assert.equal(response.status, 400, JSON.stringify(changes));
        assert.deepEqual(await snapshot(), before);
      }
    });
    await t.test('valid edit appends attachment and preserves omitted asset selection; explicit [] clears it', async () => {
      let response = await send('PUT', '/api/pengeluaran/' + id, form({ nominal: '2000.75', barangIds: undefined,
        keterangan: 'Keterangan edit', nota: new File(['PNG fixture'], 'nota.png') }));
      assert.equal(response.status, 200);
      let data = await response.json();
      assert.equal(data.nominal, 2000.75);
      assert.equal(data.deskripsi, 'Keterangan edit');
      assert.equal(data.kelompokPembelianId, groupId);
      assert.equal(data.notaUrls.length, 2);
      assert.equal(data.notaUrls[0], originalNota);
      let detail = await send('GET', '/api/pengeluaran/' + id);
      assert.equal((await detail.json()).barang.length, 1);
      response = await send('PUT', '/api/pengeluaran/' + id, form({ barangIds: '[]' }));
      assert.equal(response.status, 200);
      data = await response.json();
      assert.equal(data.notaUrls.length, 2);
      detail = await send('GET', '/api/pengeluaran/' + id);
      assert.equal((await detail.json()).barang.length, 0);
    });
    await t.test('query validation and normal filter/search/pagination work through HTTP', async () => {
      for (const query of ['limit=0', 'limit=10junk', 'limit=501', 'jenis=SALAH']) {
        assert.equal((await send('GET', '/api/pengeluaran?' + query)).status, 400);
      }
      for (const query of ['', 'limit=500', 'limit=1&jenis=PEMBELIAN_ASET&search=UJI-07']) {
        const response = await send('GET', '/api/pengeluaran?' + query);
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.equal(data.totalCount, 1);
        assert.equal(data.data[0].id, id);
        assert.equal(data.data[0].user.password, undefined);
      }
    });
    await t.test('malformed form data is 400; anonymous and other roles cannot mutate cashflow', async () => {
      const before = await snapshot();
      for (const [actor, expected] of [['admin', 400], [null, 401], ['tech', 403], ['univ', 403]]) {
        for (const [method, route] of [['POST', '/api/pengeluaran'], ['PUT', '/api/pengeluaran/' + id]]) {
          const response = await send(method, route, '{', actor);
          assert.equal(response.status, expected);
        }
      }
      assert.deepEqual(await snapshot(), before);
    });
  } finally {
    if (server && server.exitCode === null) server.kill('SIGTERM');
    if (serverClosed) await serverClosed;
    fs.closeSync(log);
    if (db) await db.end();
    if (created) await admin.query(`DROP DATABASE ${database} WITH (FORCE)`);
    await admin.end();
  }
});
