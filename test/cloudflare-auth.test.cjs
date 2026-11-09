// Synthetic callback/action tests. No network sockets, credentials or database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks, globals = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, {
    module, exports: module.exports, Date, Buffer, URL, console,
    process: { env: { NEXT_PUBLIC_BASE_URL: 'https://synthetic.invalid' } },
    require(name) {
      if (name in mocks) return mocks[name];
      if (name === 'node:crypto') return require(name);
      throw new Error(`Unexpected dependency: ${name}`);
    },
    ...globals,
  });
  return module.exports;
}
function auth({ ok = true, sessionActive = true, minTokenIat = 0, envOverride = {}, failSessionInsert = false, backendSessionId = 'synthetic-session' } = {}) {
  const queries = [];
  const query = async (sql, values) => {
    queries.push({ sql, values });
    if (failSessionInsert && sql.includes('INSERT INTO user_login_sessions')) {
      throw new Error('duplicate key value violates unique constraint "user_login_sessions_sessionId_key"');
    }
    if (sql.includes('SELECT "isActive"')) return { rows: [{ isActive: sessionActive }] };
    if (sql.includes('SELECT "minTokenIat"')) return { rows: [{ minTokenIat }] };
    if (sql.includes('SELECT id FROM user_login_sessions')) return { rows: [{ id: 9 }] };
    return { rows: [] };
  };
  const customEnv = { NEXT_PUBLIC_BASE_URL: 'https://synthetic.invalid', ...envOverride };
  const mod = load('authjsConfig/authjsConfig.ts', {
    '@/lib/account-email': load('src/lib/account-email.ts', {}),
    'next-auth/providers/credentials': (config) => config,
    '@/lib/db': { pool: { query } },
  }, {
    process: { env: customEnv },
    fetch: async (url, init) => {
      assert.equal(url, 'https://synthetic.invalid/api/auth/login');
      assert.equal(init.method, 'POST');
      const response = { user: { id: 7, name: 'Synthetic', email: 'test@example.invalid', role: 'tester' }, access_token: 'synthetic-token' };
      if (backendSessionId) response.sessionId = backendSessionId;
      return { ok, json: async () => response };
    },
  });
  return { config: mod.authConfig, mod, env: customEnv, queries };
}
const token = { id: '7', sid: 'synthetic-session', role: 'tester', iat: 100 };

test('Credentials rejection never creates sessions or audit rows', async () => {
  const { config, queries } = auth({ ok: false });
  assert.equal(await config.providers[0].authorize({ email: 'test@mcit.gov.eg', password: 'synthetic' }), null);
  assert.equal(queries.length, 0);
});
test('successful Credentials callback uses backend-owned session and preserves cutoff, audit and token claims', async () => {
  const { config, queries } = auth();
  const user = await config.providers[0].authorize({ email: 'test@mcit.gov.eg', password: 'synthetic' });
  assert.equal(queries.length, 2);
  assert.ok(queries.every((query) => !query.sql.includes('INSERT INTO user_login_sessions')));
  assert.match(queries[0].sql, /UPDATE users/);
  assert.match(queries[1].sql, /INSERT INTO audit_logs/);
  const jwt = config.callbacks.jwt({ token: {}, user });
  assert.equal(jwt.credentialToken, 'synthetic-token');
  assert.equal(jwt.sid, 'synthetic-session');
  assert.equal(jwt.role, 'tester');
});
test('quoted AUTH_URL and NEXT_PUBLIC_BASE_URL are sanitized without duplicating backend-created sessions', async () => {
  const { config, env, queries } = auth({
    envOverride: {
      AUTH_URL: '  export AUTH_URL = "https://mcit-test-case-front-staging.hassan-a173784.workers.dev/"  ',
      NEXTAUTH_URL: "'https://mcit-test-case-front-staging.hassan-a173784.workers.dev/'",
      NEXT_PUBLIC_BASE_URL: ' "https://synthetic.invalid/" ',
    },
    failSessionInsert: true,
  });
  assert.equal(env.AUTH_URL, 'https://mcit-test-case-front-staging.hassan-a173784.workers.dev');
  assert.equal(env.NEXTAUTH_URL, 'https://mcit-test-case-front-staging.hassan-a173784.workers.dev');
  assert.equal(env.NEXT_PUBLIC_BASE_URL, 'https://synthetic.invalid');
  assert.equal(config.trustHost, true);

  const user = await config.providers[0].authorize({ email: 'test@mcit.gov.eg', password: 'synthetic' });
  assert.equal(user.id, '7');
  assert.equal(queries.length, 2);
  assert.match(queries[0].sql, /UPDATE users/);
  assert.match(queries[1].sql, /INSERT INTO audit_logs/);
});

test('legacy backend response without sessionId persists a session with conflict protection', async () => {
  const { config, queries } = auth({ backendSessionId: null });
  const user = await config.providers[0].authorize({ email: 'test@mcit.gov.eg', password: 'synthetic' });
  assert.match(user.sid, /^[0-9a-f-]{36}$/i);
  assert.equal(queries.length, 3);
  assert.match(queries[0].sql, /INSERT INTO user_login_sessions/);
  assert.match(queries[0].sql, /ON CONFLICT \("sessionId"\) DO UPDATE/);
  assert.match(queries[1].sql, /UPDATE users/);
  assert.match(queries[2].sql, /INSERT INTO audit_logs/);
});
for (const [name, state] of [['device revoked', { sessionActive: false }], ['user cutoff advanced', { minTokenIat: 200 }]]) {
  test(`session callback rejects ${name} without restoring presence`, async () => {
    const { config, queries } = auth(state);
    const session = await config.callbacks.session({ session: { user: {} }, token });
    assert.equal(session.user.isRevoked, true);
    assert.ok(queries.every(q => !/INSERT|UPDATE/.test(q.sql)));
  });
}
test('active session retains identity and completes the presence heartbeat', async () => {
  const { config, queries } = auth();
  const session = await config.callbacks.session({ session: { user: {} }, token });
  assert.equal(session.user.isRevoked, false);
  assert.equal(session.user.id, '7');
  assert.equal(session.user.role, 'tester');
  assert.match(queries.at(-1).sql, /UPDATE user_login_sessions SET "lastSeenAt"/);
});
function sessions(role) {
  const queries = [], tags = [];
  const actions = load('src/app/(dashboard)/users/sessions.action.ts', {
    '@/app/myUtil': { getCurrentUserSession: async () => ({ id: 1, role }) },
    '@/lib/db': { pool: { query: async (sql, values) => {
      queries.push({ sql, values });
      return { rows: [{ userId: 7, userName: 'Synthetic', email: 'test@example.invalid' }] };
    } } },
    'next/cache': { updateTag: tag => tags.push(tag) },
  });
  return { actions, queries, tags };
}
test('tester cannot revoke sessions or issue database writes', async () => {
  const { actions, queries } = sessions('tester');
  assert.equal((await actions.revokeLoginSession('synthetic-session')).success, false);
  assert.equal((await actions.revokeAllOtherSessions(7)).success, false);
  assert.equal(queries.length, 0);
});
test('admin revocation preserves device revocation, user cutoff, security audit and invalidation', async () => {
  const { actions, queries, tags } = sessions('admin');
  assert.equal((await actions.revokeLoginSession('synthetic-session')).success, true);
  assert.equal(queries.length, 3);
  assert.match(queries[0].sql, /"isActive" = FALSE/);
  assert.match(queries[1].sql, /"minTokenIat"/);
  assert.match(queries[2].sql, /INSERT INTO audit_logs/);
  assert.deepEqual(tags, ['login-sessions', 'audit-logs']);
});
test('audit helper completes presence and audit insertion before reporting success', async () => {
  const queries = [], tags = [];
  const { recordSystemAuditLog } = load('src/lib/audit.ts', {
    'next/headers': { headers: async () => new Headers() },
    'next/cache': { revalidateTag: tag => tags.push(tag) },
    '@/app/myUtil': { getCurrentUserSession: async () => ({ id: 7, name: 'Synthetic', email: 'test@example.invalid', role: 'tester' }) },
    '@/lib/db': { pool: { query: async (sql, values) => {
      queries.push({ sql, values });
      return { rows: sql.includes('SELECT id,') ? [{ id: 9, sessionId: 'synthetic-session' }] : [] };
    } } },
  }, { Headers });
  assert.equal(await recordSystemAuditLog({ action: 'synthetic', actionCategory: 'SECURITY', ip: '127.0.0.1', userAgent: 'Synthetic' }), true);
  assert.match(queries.at(-1).sql, /INSERT INTO audit_logs/);
  assert.equal(queries.at(-1).values[0], 7);
  assert.deepEqual(tags, ['audit-logs', 'login-sessions']);
});
test('KVIncrementalCache handles hits, build-time entries, and read/write/delete quota errors gracefully', async () => {
  class IgnorableError extends Error {}
  let cfEnv = {};
  const errorsLogged = [];
  const kvModule = load(
    'node_modules/@opennextjs/cloudflare/dist/api/overrides/incremental-cache/kv-incremental-cache.js',
    {
      '@opennextjs/aws/adapters/logger.js': { error: (...args) => errorsLogged.push(args) },
      '@opennextjs/aws/utils/error.js': { IgnorableError },
      '../../cloudflare-context.js': { getCloudflareContext: () => ({ env: cfEnv }) },
      '../internal.js': {
        computeCacheKey: (k, opts) => `${opts.prefix || 'incremental-cache'}:${opts.buildId || 'b1'}:${opts.cacheType || 'cache'}:${k}`,
        debugCache: () => {},
      },
    },
    {
      process: { env: { OPEN_NEXT_BUILD_ID: 'build-123' } },
      globalThis: { __BUILD_TIMESTAMP_MS__: 1700000000000 },
    }
  );
  const cache = kvModule.default;

  // 1. Missing binding throws IgnorableError
  await assert.rejects(() => cache.get('k1', 'cache'), IgnorableError);

  // 2. Build-time entry (no lastModified) + runtime entry (with lastModified)
  const store = new Map([
    ['incremental-cache:build-123:cache:prerender', { html: '<p>ok</p>' }],
    ['incremental-cache:build-123:fetch:runtime', { value: { data: 42 }, lastModified: 1700000005000 }],
  ]);
  cfEnv = {
    NEXT_INC_CACHE_KV: {
      get: async (k) => store.get(k) ?? null,
      put: async (k, v) => store.set(k, JSON.parse(v)),
      delete: async (k) => store.delete(k),
    },
  };
  const buildEntry = await cache.get('prerender', 'cache');
  assert.equal(buildEntry.lastModified, 1700000000000);
  assert.deepEqual(buildEntry.value, { html: '<p>ok</p>' });
  const runtimeEntry = await cache.get('runtime', 'fetch');
  assert.equal(runtimeEntry.lastModified, 1700000005000);
  assert.deepEqual(runtimeEntry.value, { data: 42 });

  // 3. KV failure behavior (e.g. Free tier 1,000 writes/day limit or transient KV error) never crashes request
  cfEnv = {
    NEXT_INC_CACHE_KV: {
      get: async () => { throw new Error('KV read error'); },
      put: async () => { throw new Error('KV daily write limit exceeded (Free plan 1000/day)'); },
      delete: async () => { throw new Error('KV delete error'); },
    },
  };
  assert.equal(await cache.get('any', 'cache'), null);
  await assert.doesNotReject(() => cache.set('any', { ok: true }, 'fetch'));
  await assert.doesNotReject(() => cache.delete('any'));
  assert.equal(errorsLogged.length, 3);
});
test('wrangler.jsonc and URL handling keep AUTH_URL and NEXT_PUBLIC_BASE_URL separated without production fallbacks', () => {
  const wranglerConfig = JSON.parse(fs.readFileSync('wrangler.jsonc', 'utf8'));
  assert.equal(wranglerConfig.name, 'mcit-test-case-front');
  assert.equal(wranglerConfig.services[0].service, 'mcit-test-case-front');
  assert.equal(wranglerConfig.kv_namespaces[0].binding, 'NEXT_INC_CACHE_KV');
  assert.match(wranglerConfig.kv_namespaces[0].id, /^[a-f0-9]{32}$/);
  assert.notEqual(wranglerConfig.kv_namespaces[0].id, '00000000000000000000000000000000');
  assert.equal(wranglerConfig.hyperdrive[0].id, '00000000000000000000000000000000');
  assert.equal(wranglerConfig.r2_buckets, undefined);

  const stagingConfig = JSON.parse(fs.readFileSync('wrangler.staging.jsonc', 'utf8'));
  assert.equal(stagingConfig.name, 'mcit-test-case-front-staging');
  assert.equal(stagingConfig.services[0].service, 'mcit-test-case-front-staging');
  assert.equal(stagingConfig.kv_namespaces[0].binding, 'NEXT_INC_CACHE_KV');
  assert.equal(stagingConfig.kv_namespaces[0].id, '982fb5e2076049db927135af01ee8a21');
  assert.notEqual(stagingConfig.kv_namespaces[0].id, wranglerConfig.kv_namespaces[0].id);
  assert.equal(stagingConfig.hyperdrive[0].binding, 'HYPERDRIVE');
  assert.equal(stagingConfig.hyperdrive[0].id, '05ed75e5fe7f4bfd8a1ee3caaf41874d');
  assert.equal(stagingConfig.r2_buckets, undefined);
  assert.equal(stagingConfig.vars.MCIT_CLOUDFLARE, 'true');
  assert.equal(stagingConfig.vars.AUTH_TRUST_HOST, 'true');
  assert.equal(
    stagingConfig.vars.AUTH_URL,
    'https://mcit-test-case-front-staging.hassan-a173784.workers.dev'
  );
  assert.equal(
    stagingConfig.vars.NEXT_PUBLIC_BASE_URL,
    'https://mcit-test-case-backend-staging.onrender.com'
  );
  assert.notEqual(stagingConfig.vars.AUTH_URL, stagingConfig.vars.NEXT_PUBLIC_BASE_URL);

  const changePwdSrc = fs.readFileSync('src/app/(dashboard)/change-password/changepassword.action.ts', 'utf8');
  const streamSrc = fs.readFileSync('src/app/api/users/notifications/stream/route.ts', 'utf8');
  const nextConfigSrc = fs.readFileSync('next.config.ts', 'utf8');
  assert.ok(!changePwdSrc.includes('mcit-test-case-backend.onrender.com'));
  assert.ok(!streamSrc.includes('mcit-test-case-backend.onrender.com'));
  assert.ok(!nextConfigSrc.includes('mcit-test-case-backend.onrender.com'));
});

test('production wrangler configuration resolves Auth.js URLs to mcit-test-case-front-prod.mcit-gov.workers.dev', () => {
  const prodConfig = JSON.parse(fs.readFileSync('wrangler.production.jsonc', 'utf8'));
  assert.equal(prodConfig.name, 'mcit-test-case-front-prod');
  assert.equal(prodConfig.workers_dev, true);
  assert.equal(prodConfig.preview_urls, false);
  assert.equal(prodConfig.vars.AUTH_URL, 'https://mcit-test-case-front-prod.mcit-gov.workers.dev');
  assert.equal(prodConfig.vars.NEXT_PUBLIC_BASE_URL, 'https://mcit-test-case-backend.onrender.com');
  assert.equal(prodConfig.vars.AUTH_TRUST_HOST, 'true');

  const authUrl = new URL(prodConfig.vars.AUTH_URL);
  assert.equal(authUrl.origin, 'https://mcit-test-case-front-prod.mcit-gov.workers.dev');

  // Verify the derived provider endpoint URLs match the new hostname exactly
  const signinUrl = `${authUrl.origin}/api/auth/signin/credentials`;
  const callbackUrl = `${authUrl.origin}/api/auth/callback/credentials`;
  assert.equal(signinUrl, 'https://mcit-test-case-front-prod.mcit-gov.workers.dev/api/auth/signin/credentials');
  assert.equal(callbackUrl, 'https://mcit-test-case-front-prod.mcit-gov.workers.dev/api/auth/callback/credentials');
  assert.ok(!signinUrl.includes('hassan-a173784'));
  assert.ok(!callbackUrl.includes('hassan-a173784'));
});
