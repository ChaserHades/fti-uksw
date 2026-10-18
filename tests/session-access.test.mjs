// Run: node --test tests/session-access.test.mjs
// Real JWT verification, guards, actions and routes; isolated database/cookie fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dependency = createRequire(import.meta.url);
const secret = 'isolated-test-key-not-an-application-secret';
const key = new TextEncoder().encode(secret);
const account = { id: 'test-user', name: 'Current name', email: 'current@uksw.edu',
  role: 'ADMIN', statusVerifikasi: 'APPROVED', mustChangePassword: false };
const compiled = new Map();
function compile(file) {
  if (!compiled.has(file)) compiled.set(file, ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText);
  return compiled.get(file);
}
async function token(overrides = {}, options = {}) {
  let jwt = new SignJWT({ ...account, name: 'Old name', ...overrides })
    .setProtectedHeader({ alg: options.algorithm || 'HS256' }).setIssuedAt();
  if (options.expiration !== null) jwt = jwt.setExpirationTime(options.expiration || '5m');
  return jwt.sign(new TextEncoder().encode(options.secret || secret));
}
function fixture({ cookie, user = { ...account }, databaseError = false, business = {} } = {}) {
  const state = { cookie, user, reads: 0, businessCalls: [], cookieOptions: null };
  const forbiddenBusiness = (model, method) => () => {
    state.businessCalls.push(`${model}.${method}`);
    throw new Error(`Unexpected business operation ${model}.${method}`);
  };
  const prisma = new Proxy({}, { get: (_, model) => new Proxy({}, { get: (_, method) => {
    if (model === 'user' && method === 'findUnique') return async query => {
      state.reads++;
      assert.equal(query.where.id, account.id);
      assert.ok(query.select, 'Session lookup must explicitly select safe fields');
      assert.equal(query.select.password, undefined);
      if (databaseError) throw new Error('Fixture database unavailable');
      return state.user;
    };
    return business[model]?.[method] || forbiddenBusiness(model, method);
  } }) });
  const modules = new Map();
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    const mod = { exports: {} };
    const readDependency = name => {
      if (name === '@/lib/prisma') return { prisma };
      if (name === 'next/headers') return { cookies: async () => ({
        get: () => state.cookie ? { value: state.cookie } : undefined,
        set: (name, value, options) => { assert.equal(name, 'fti_session'); state.cookie = value; state.cookieOptions = options; },
        delete: name => { assert.equal(name, 'fti_session'); state.cookie = undefined; },
      }) };
      if (name === 'next/navigation') return { redirect: target => { throw Object.assign(new Error('Redirect'), { target }); } };
      if (name === 'next/cache') return { revalidatePath: () => {} };
      if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
      if (name.startsWith('.')) {
        const relative = path.posix.normalize(path.posix.join(path.posix.dirname(file), name)) + '.ts';
        return relative === 'lib/prisma.ts' ? { prisma } : load(relative);
      }
      return dependency(name);
    };
    vm.runInNewContext(compile(file), { module: mod, exports: mod.exports, require: readDependency,
      process: { env: { JWT_SECRET: secret, NODE_ENV: 'test' } },
      TextEncoder, Response, Request, URL, Buffer, Date, console }, { filename: file });
    modules.set(file, mod.exports);
    return mod.exports;
  }
  return { state, load };
}
function apiFiles(dir) {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return apiFiles(file);
    return /^routes?\.ts$/.test(entry.name) ? [file] : [];
  });
}
const endpoints = apiFiles('app/api').filter(file => !file.startsWith('app/api/auth/') && !file.startsWith('app/api/cron/'))
  .flatMap(file => [...fs.readFileSync(path.join(root, file), 'utf8').matchAll(/export async function (GET|POST|PUT|DELETE)\(/g)]
    .map(match => ({ file, method: match[1] })));
const request = method => new Request('http://localhost/api/test', {
  method, ...(method === 'GET' ? {} : { headers: { 'content-type': 'application/json' }, body: '{}' }),
});
const params = () => ({ params: Promise.resolve({ id: 'target-id' }) });

for (const invalid of ['missing', 'malformed', 'expired', 'wrong-signature', 'wrong-algorithm', 'missing-id', 'missing-exp']) {
  test(`JWT ${invalid}: reject before querying database`, async () => {
    let cookie;
    if (invalid === 'malformed') cookie = 'invalid-jwt';
    if (invalid === 'expired') cookie = await token({}, { expiration: '1s ago' });
    if (invalid === 'wrong-signature') cookie = await token({}, { secret: 'different-test-key' });
    if (invalid === 'wrong-algorithm') cookie = await token({}, { algorithm: 'HS384' });
    if (invalid === 'missing-id') cookie = await token({ id: undefined });
    if (invalid === 'missing-exp') cookie = await token({}, { expiration: null });
    const f = fixture({ cookie });
    assert.equal(await f.load('lib/session.ts').getSession(), null);
    assert.equal(f.state.reads, 0);
  });
}
test('current database profile replaces old JWT permissions without exposing credentials', async () => {
  const f = fixture({ cookie: await token(), user: { ...account, role: 'TEKNISI', statusVerifikasi: 'REJECTED',
    mustChangePassword: true, name: null, password: 'MUST_NOT_ESCAPE' } });
  const session = await f.load('lib/session.ts').getSession();
  assert.deepEqual(JSON.parse(JSON.stringify(session)), { ...account, role: 'TEKNISI', statusVerifikasi: 'REJECTED', mustChangePassword: true, name: '' });
});
test('same token observes approval and subsequent role changes on the next request', async () => {
  const f = fixture({ cookie: await token({ role: 'TEKNISI', statusVerifikasi: 'PENDING' }), user: { ...account, statusVerifikasi: 'PENDING' } });
  const guard = f.load('lib/auth.ts');
  assert.equal((await guard.checkApiAuth()).error.status, 403);
  f.state.user = { ...account, role: 'UNIVERSITAS' };
  const approved = await guard.checkApiAuth();
  assert.equal(approved.error, null); assert.equal(approved.session.role, 'UNIVERSITAS');
  f.state.user = { ...account, role: 'TEKNISI' };
  await assert.rejects(guard.requireRole('ADMIN'), error => error.target === '/unauthorized');
});
for (const scenario of ['missing', 'expired', 'deleted', 'database-failure', 'pending', 'rejected', 'force-change']) {
  test(`all ${endpoints.length} protected API handlers deny ${scenario} before business access`, async () => {
    const options = { cookie: await token() };
    let expected = 403;
    if (scenario === 'missing') { options.cookie = undefined; expected = 401; }
    if (scenario === 'expired') { options.cookie = await token({}, { expiration: '1s ago' }); expected = 401; }
    if (scenario === 'deleted') { options.user = null; expected = 401; }
    if (scenario === 'database-failure') { options.databaseError = true; expected = 401; }
    if (scenario === 'pending') options.user = { ...account, statusVerifikasi: 'PENDING' };
    if (scenario === 'rejected') options.user = { ...account, statusVerifikasi: 'REJECTED' };
    if (scenario === 'force-change') options.user = { ...account, mustChangePassword: true };
    for (const { file, method } of endpoints) {
      const f = fixture(options);
      const response = await f.load(file)[method](request(method), params());
      assert.equal(response.status, expected, `${method} ${file}`);
      assert.equal(response.headers.get('location'), null, 'API must return JSON, not redirect');
      assert.equal(typeof (await response.json()).error, 'string');
      assert.deepEqual(f.state.businessCalls, [], `${method} ${file}`);
      assert.ok(f.state.reads <= 1, 'No user business lookup after denial');
    }
  });
}
for (const [user, destination] of [
  [null, '/login'], [{ ...account, statusVerifikasi: 'PENDING' }, '/pending'],
  [{ ...account, statusVerifikasi: 'REJECTED' }, '/rejected'],
  [{ ...account, mustChangePassword: true }, '/force-change-password'],
]) {
  test(`page guard redirects to ${destination}`, async () => {
    const f = fixture({ cookie: await token(), user });
    await assert.rejects(f.load('lib/auth.ts').requireAuth(), error => error.target === destination);
  });
}
for (const role of ['ADMIN', 'TEKNISI', 'UNIVERSITAS']) {
  test(`${role}: approved identity/read access preserved; admin-only access remains restricted`, async () => {
    const current = { ...account, role };
    const f = fixture({ cookie: await token({ role: 'ADMIN' }), user: current, business: {
      user: { findMany: async () => [] },
      pengeluaran: { findMany: async () => [], count: async () => 0 },
    } });
    const me = await f.load('app/api/me/route.ts').GET();
    assert.equal(me.status, 200); assert.equal((await me.json()).role, role);
    const read = await f.load('app/api/pengeluaran/route.ts').GET(request('GET'));
    assert.equal(read.status, 200); assert.equal((await read.json()).totalCount, 0);
    const users = await f.load('app/api/users/route.ts').GET(request('GET'));
    assert.equal(users.status, role === 'ADMIN' ? 200 : 403);
    const page = await f.load('lib/auth.ts').requireRole(role, 'ADMIN');
    assert.equal(page.role, role);
  });
}
for (const state of ['PENDING', 'REJECTED', 'force-change', 'demoted', 'deleted']) {
  test(`verification action denies ${state} administrator`, async () => {
    const user = state === 'deleted' ? null : { ...account,
      statusVerifikasi: ['PENDING', 'REJECTED'].includes(state) ? state : 'APPROVED',
      mustChangePassword: state === 'force-change', role: state === 'demoted' ? 'TEKNISI' : 'ADMIN' };
    const f = fixture({ cookie: await token(), user });
    const response = await f.load('actions/verifikasi.ts').verifikasiUserAction('target-id', 'APPROVE');
    assert.equal(response.success, false); assert.deepEqual(f.state.businessCalls, []);
  });
}
test('approved administrator can still verify a user', async () => {
  let updated;
  const f = fixture({ cookie: await token(), business: { user: { update: async query => { updated = query; return {}; } } } });
  assert.equal((await f.load('actions/verifikasi.ts').verifikasiUserAction('target-id', 'APPROVE')).success, true);
  assert.equal(updated.where.id, 'target-id'); assert.equal(updated.data.statusVerifikasi, 'APPROVED');
});
test('forced password change succeeds and unlocks subsequent API access', async () => {
  let updated;
  const f = fixture({ cookie: await token(), user: { ...account, mustChangePassword: true }, business: {
    user: { update: async query => { updated = query; f.state.user = { ...account, ...query.data }; return f.state.user; } },
  } });
  assert.equal((await f.load('lib/auth.ts').checkApiAuth()).error.status, 403);
  const form = new FormData(); form.set('password', 'fixture-password-only'); form.set('confirmPassword', 'fixture-password-only');
  assert.equal((await f.load('actions/auth.ts').changePasswordAction(form)).success, true);
  assert.equal(updated.where.id, account.id); assert.equal(updated.data.mustChangePassword, false);
  assert.ok(await bcrypt.compare('fixture-password-only', updated.data.password));
  assert.equal((await f.load('lib/auth.ts').checkApiAuth()).error, null);
  const payload = (await jwtVerify(f.state.cookie, key)).payload;
  assert.equal(payload.mustChangePassword, false); assert.equal(payload.password, undefined);
  assert.equal(payload.exp - payload.iat, 7 * 24 * 60 * 60);
  assert.equal(f.state.cookieOptions.httpOnly, true); assert.equal(f.state.cookieOptions.sameSite, 'lax');
});
for (const state of ['PENDING', 'REJECTED']) {
  test(`${state} password action cannot mutate account; logout remains available`, async () => {
    const f = fixture({ cookie: await token(), user: { ...account, statusVerifikasi: state } });
    const actions = f.load('actions/auth.ts');
    assert.ok((await actions.changePasswordAction(new FormData())).error);
    assert.deepEqual(f.state.businessCalls, []);
    await assert.rejects(actions.logoutAction(), error => error.target === '/login');
    assert.equal(f.state.cookie, undefined);
  });
}
test('password mismatch does not update account or clear forced-change state', async () => {
  const f = fixture({ cookie: await token(), user: { ...account, mustChangePassword: true } });
  const form = new FormData(); form.set('password', 'fixture-password-only'); form.set('confirmPassword', 'different-fixture-password');
  assert.ok((await f.load('actions/auth.ts').changePasswordAction(form)).error);
  assert.deepEqual(f.state.businessCalls, []); assert.equal(f.state.user.mustChangePassword, true);
});
