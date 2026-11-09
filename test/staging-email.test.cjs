const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { zodResolver } = require('@hookform/resolvers/zod');

function load(file, appEnv, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    URL,
    process: { env: { NODE_ENV: 'production', NEXT_PUBLIC_APP_ENV: appEnv, NEXT_PUBLIC_BASE_URL: 'https://synthetic-backend.invalid' } },
    console,
    fetch: mocks.fetch,
    require(name) {
      if (name in mocks) return mocks[name];
      if (name === '@/lib/account-email') return load('src/lib/account-email.ts', appEnv);
      if (name === 'zod' || name === 'node:crypto') return require(name);
      throw Error('Unexpected test dependency: ' + name);
    },
  });
  return module.exports;
}

for (const appEnv of ['staging', 'production', undefined, 'development', 'STAGING']) {
  test(`email policy and React Hook Form resolver agree with server code: ${appEnv ?? 'unset'} (NODE_ENV=production)`, async () => {
    const policy = load('src/lib/account-email.ts', appEnv);
    const login = load('src/app/login/login.zod.ts', appEnv).getLoginSchema(key => key);
    const add = load('src/app/(dashboard)/users/add/add.zod.ts', appEnv).getAddUserSchema('en');
    const resolver = zodResolver(login);
    for (const [email, allowed] of [
      ['admin@synthetic.local', appEnv === 'staging'],
      ['valid.user@mcit.gov.eg', true],
      ['admin@synthetic.local.evil.invalid', false],
      ['admin@evilsynthetic.local', false],
      ['admin@mcit.gov.eg.evil.invalid', false],
      ['admin@example.com', false],
      ['@synthetic.local', false],
      ['admin@@synthetic.local', false],
    ]) {
      const input = { email, password: 'ValidPass#2026' };
      assert.equal(policy.isAllowedAccountEmail(email), allowed, email);
      assert.equal(login.safeParse(input).success, allowed, email);
      assert.equal(add.safeParse({ ...input, id: '9001', name: 'Synthetic User', role: 'tester' }).success, allowed, email);
      const resolved = await resolver(input, {}, { criteriaMode: 'firstError', shouldUseNativeValidation: false, fields: {} });
      assert.equal(!resolved.errors.email, allowed, email);
    }
    assert.equal(login.safeParse({ email: 'valid@mcit.gov.eg', password: 'weak' }).success, false);
  });
}

for (const appEnv of ['staging', 'production', undefined]) {
  test(`Auth.js server validates email before backend authentication: ${appEnv ?? 'unset'}`, async () => {
    let calls = 0, writes = 0, backendAccepts = true;
    const { authConfig } = load('authjsConfig/authjsConfig.ts', appEnv, {
      'next-auth/providers/credentials': config => config,
      '@/lib/db': { pool: { query: async () => { writes++; return { rows: [] }; } } },
      fetch: async (_url, init) => {
        calls++;
        assert.equal(JSON.parse(init.body).password, 'test-password-kept-unchanged');
        return { ok: backendAccepts, json: async () => ({ user: { id: 1, email: 'admin@synthetic.local', name: 'Synthetic', role: 'admin' }, access_token: 'synthetic-token', sessionId: 'synthetic-session' }) };
      },
    });
    const authorize = authConfig.providers[0].authorize;
    const user = await authorize({ email: 'admin@synthetic.local', password: 'test-password-kept-unchanged', NEXT_PUBLIC_APP_ENV: 'staging' });
    assert.equal(user !== null, appEnv === 'staging');
    assert.equal(calls, appEnv === 'staging' ? 1 : 0);
    assert.equal(writes, appEnv === 'staging' ? 2 : 0);
    const beforeOfficial = calls;
    assert.ok(await authorize({ email: 'valid@mcit.gov.eg', password: 'test-password-kept-unchanged' }));
    assert.equal(calls, beforeOfficial + 1, 'Ministry addresses must still reach backend authentication');
    backendAccepts = false;
    writes = 0;
    assert.equal(await authorize({ email: 'valid@mcit.gov.eg', password: 'test-password-kept-unchanged' }), null);
    assert.equal(writes, 0, 'Backend rejection must never create sessions');
    const previousCalls = calls;
    assert.equal(await authorize({ email: 'invalid@example.com', password: 'test-password-kept-unchanged' }), null);
    assert.equal(calls, previousCalls);
  });

  test(`login server action uses the same email policy: ${appEnv ?? 'unset'}`, async () => {
    let calls = 0;
    const { sendUserLogin } = load('src/app/login/login.services.ts', appEnv, {
      '@/lib/app-fetch': { appFetch: async () => { calls++; return { ok: true, json: async () => ({ user: {} }) }; } },
    });
    const attempt = sendUserLogin({ email: 'admin@synthetic.local', password: 'unchanged' });
    if (appEnv === 'staging') await attempt;
    else await assert.rejects(attempt, /Email domain is not allowed/);
    assert.equal(calls, appEnv === 'staging' ? 1 : 0);
    await sendUserLogin({ email: 'valid@mcit.gov.eg', password: 'unchanged' });
  });
}

test('selected build config cannot inherit the staging flag from another config or shell and strips quotes/trailing slashes', () => {
  const script = fs.readFileSync('scripts/cloudflare-windows-junctions.cjs', 'utf8');
  for (const selected of ['wrangler.jsonc', 'wrangler.staging.jsonc', 'wrangler.production.jsonc']) {
    const env = {
      NEXT_PUBLIC_APP_ENV: 'staging',
      AUTH_URL: '  "https://example.invalid/" ',
      NEXT_PUBLIC_BASE_URL: " 'https://api.example.invalid/' ",
      AUTH_SECRET: 'synthetic-build-secret-fixture',
      DATABASE_URL: 'synthetic-production-url-fixture',
    };
    vm.runInNewContext(script, {
      __dirname: require('node:path').resolve('scripts'),
      URL,
      process: { env, platform: 'test', argv: ['node', 'script', '--config=' + selected] },
      require(name) { if (name === 'node:fs' || name === 'node:path' || name === 'node:crypto') return require(name); throw Error(name); },
    });
    assert.equal(env.MCIT_WRANGLER_CONFIG, selected);
    assert.equal(env.NEXT_PUBLIC_APP_ENV, selected === 'wrangler.staging.jsonc' ? 'staging' : 'production');
    if (selected === 'wrangler.staging.jsonc') {
      assert.equal(env.AUTH_URL, 'https://mcit-test-case-front-staging.hassan-a173784.workers.dev');
      assert.equal(env.NEXT_PUBLIC_BASE_URL, 'https://mcit-test-case-backend-staging.onrender.com');
    } else if (selected === 'wrangler.production.jsonc') {
      assert.equal(env.AUTH_URL, 'https://mcit-test-case-front-prod.mcit-gov.workers.dev');
      assert.equal(env.NEXT_PUBLIC_BASE_URL, 'https://mcit-test-case-backend.onrender.com');
      assert.equal(env.AUTH_SECRET === 'synthetic-build-secret-fixture', false);
      assert.match(env.AUTH_SECRET, /^[A-Za-z0-9_-]{43}$/);
      assert.equal(env.DATABASE_URL, '');
      assert.equal(env.DATABASE_CA_CERT, '');
      assert.equal(env.PGSSLROOTCERT_PEM, '');
    } else {
      assert.equal(env.AUTH_URL, 'https://example.invalid');
      assert.equal(env.NEXT_PUBLIC_BASE_URL, 'https://api.example.invalid');
      assert.equal(env.AUTH_SECRET, 'synthetic-build-secret-fixture');
      assert.equal(env.DATABASE_URL, 'synthetic-production-url-fixture');
    }
  }
  const prodDefault = JSON.parse(fs.readFileSync('wrangler.jsonc', 'utf8'));
  const prodDedicated = JSON.parse(fs.readFileSync('wrangler.production.jsonc', 'utf8'));
  const staging = JSON.parse(fs.readFileSync('wrangler.staging.jsonc', 'utf8'));
  assert.equal(prodDefault.vars?.NEXT_PUBLIC_APP_ENV, undefined);
  assert.equal(prodDedicated.name, 'mcit-test-case-front-prod');
  assert.equal(prodDedicated.workers_dev, true);
  assert.equal(prodDedicated.preview_urls, false);
  assert.equal(prodDedicated.vars.NEXT_PUBLIC_APP_ENV, 'production');
  assert.equal(prodDedicated.vars.AUTH_URL, 'https://mcit-test-case-front-prod.mcit-gov.workers.dev');
  assert.equal(prodDedicated.vars.NEXT_PUBLIC_BASE_URL, 'https://mcit-test-case-backend.onrender.com');
  assert.equal(prodDedicated.services[0].service, 'mcit-test-case-front-prod');
  assert.match(prodDedicated.hyperdrive[0].id, /^[a-f0-9]{32}$/);
  assert.match(prodDedicated.kv_namespaces[0].id, /^[a-f0-9]{32}$/);
  assert.equal(prodDedicated.hyperdrive[0].localConnectionString, undefined);
  assert.equal(staging.vars.NEXT_PUBLIC_APP_ENV, 'staging');
  assert.notEqual(prodDefault.kv_namespaces[0].id, staging.kv_namespaces[0].id);
  assert.notEqual(prodDedicated.kv_namespaces[0].id, staging.kv_namespaces[0].id);
  assert.notEqual(prodDedicated.hyperdrive[0].id, staging.hyperdrive[0].id);
});
