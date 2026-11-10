// Public GET/OPTIONS only. No login, cookies, tokens, DB, imports or mutations.
const assert = require('node:assert/strict');
const front = new URL(process.argv[2]);
assert.equal(front.pathname, '/');
assert.ok(!front.username && !front.password && !front.search && !front.hash);
assert.ok(front.protocol === 'https:' || (front.protocol === 'http:' && front.hostname === '127.0.0.1'));
const back = 'https://mcit-test-case-backend.onrender.com';
let failures = 0;
async function check(label, url, options, validate) {
  try {
    const response = await fetch(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(20000) });
    await validate(response);
    console.log(`PASS ${label} (${response.status})`);
  } catch (error) {
    failures++;
    // Do not print response bodies, tokens, connection errors or cookie values.
    console.log(`FAIL ${label} (${error.name})`);
  }
}
async function main() {
  await check('login', `${front.origin}/login`, {}, r => assert.equal(r.status, 200));
  await check('anonymous session', `${front.origin}/api/auth/session`, {}, async r => {
    assert.equal(r.status, 200); assert.equal(await r.json(), null);
  });
  await check('credentials callback origin', `${front.origin}/api/auth/providers`, {}, async r => {
    assert.equal(r.status, 200);
    const providers = await r.json();
    assert.equal(new URL(providers.credentials.callbackUrl).origin, front.origin);
    assert.equal(new URL(providers.credentials.callbackUrl).pathname, '/api/auth/callback/credentials');
  });
  for (const path of ['/dashboard', '/projects', '/test-cases', '/users', '/devices', '/assign-projects', '/test-cycles', '/quality', '/reset-codes']) {
    await check(`anonymous protected ${path}`, `${front.origin}${path}`, {}, r => {
      assert.ok([302, 303, 307, 308].includes(r.status));
      const location = new URL(r.headers.get('location'), front);
      assert.equal(location.origin, front.origin); assert.equal(location.pathname, '/login');
    });
  }
  await check('anonymous quality API', `${front.origin}/api/quality`, {}, r => assert.equal(r.status, 401));
  await check('Render rejects anonymous users', `${back}/api/auth/me`, {}, r => assert.equal(r.status, 401));
  for (const origin of [front.origin, 'https://untrusted.example']) {
    await check(`CORS ${origin === front.origin ? 'trusted' : 'untrusted'}`, `${back}/api/users/notifications/stream`, {
      method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' },
    }, r => {
      if (origin === front.origin) {
        assert.equal(r.status, 204); assert.equal(r.headers.get('access-control-allow-origin'), origin);
      } else {
        assert.equal(r.headers.get('access-control-allow-origin'), null);
        assert.ok(r.status >= 400);
      }
    });
  }
  console.log('Authenticated workflows and simultaneous real users require the manual checks in docs/netlify-emergency-release.md.');
  process.exitCode = failures ? 1 : 0;
}
main().catch(() => { console.error('Verification failed; supply the final HTTPS site origin.'); process.exitCode = 1; });
