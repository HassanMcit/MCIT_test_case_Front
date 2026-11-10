const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(token) {
  const module = { exports: {} };
  const response = (location) => ({ location, cookies: { set() {} } });
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/middleware.ts','utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    module, exports: module.exports, URL, Date, atob, process: { env: { AUTH_SECRET: 'unit-test-only' } },
    require(name) {
      if (name === 'next-auth/jwt') return { getToken: async () => token };
      if (name === 'next/server') return { NextResponse: { next: () => response(null), redirect: url => response(url.pathname) } };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return module.exports;
}
const request = pathname => ({ url: `https://local.invalid${pathname}`, nextUrl: { pathname } });
const jwt = exp => `x.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.x`;

test('unauthenticated users are redirected and expired backend tokens are rejected', async () => {
  assert.equal((await load(null).default(request('/dashboard'))).location, '/login');
  assert.equal((await load({ credentialToken: jwt(1), loginAt: Date.now() }).default(request('/projects'))).location, '/login');
});
test('valid login retains route access and avoids login-page loops', async () => {
  const token = { credentialToken: jwt(Math.floor(Date.now()/1000)+3600), loginAt: Date.now() };
  const middleware = load(token).default;
  assert.equal((await middleware(request('/dashboard'))).location, null);
  assert.equal((await middleware(request('/login'))).location, '/dashboard');
});
test('all original protected-route matchers remain present', () => {
  let original;
  try {
    original = require('node:child_process').execFileSync('git', ['show','main:src/proxy.ts'], { encoding:'utf8' });
  } catch {
    original = require('node:child_process').execFileSync('git', ['show','HEAD~1:src/proxy.ts'], { encoding:'utf8' });
  }
  const originalMatchers = original.slice(original.indexOf('export const config'));
  const migrated = fs.readFileSync('src/middleware.ts','utf8');
  assert.equal(migrated.slice(migrated.indexOf('export const config')).replace(/\r\n/g, '\n'), originalMatchers.replace(/\r\n/g, '\n'));
});
