// Local-only smoke checks. No login credentials or production services.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = 'http://127.0.0.1:8787';
async function main() {
  const results = [];
  async function check(path, expected, options = {}) {
    const response = await fetch(base + path, { ...options, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, expected, path);
    results.push({ path, status: response.status });
    return response;
  }
  const login = await check('/login', 200);
  const html = await login.text();
  const assets = [...new Set([...html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g)].map(match => match[1]))];
  assert.ok(assets.length >= 3);
  for (const asset of assets) {
    assert.ok(asset.startsWith('/_next/static/'), 'Only local assets are tested');
    await check(asset, 200);
  }
  for (const path of ['/dashboard', '/projects', '/test-cases', '/users', '/devices', '/quality', '/assign-projects', '/test-cycles']) {
    const response = await check(path, 307);
    assert.equal(new URL(response.headers.get('location'), base).pathname, '/login');
  }
  assert.equal(await (await check('/api/auth/session', 200)).json(), null);
  const providers = await (await check('/api/auth/providers', 200)).json();
  assert.equal(providers.credentials.type, 'credentials');
  assert.ok((await (await check('/api/auth/csrf', 200)).json()).csrfToken);
  await check('/api/quality', 401);
  await check('/api/quality/1', 401);
  await check('/api/quality', 401, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  await check('/api/test-cases/import-cache', 401, { method: 'POST' });
  await check('/icon.png', 200);
  await check('/_next/image?url=%2Ficon.png&w=64&q=75', 200);
  const { chromium } = require('../.qa-test-tools/node_modules/playwright');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [], blockedRequests = [];
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
        blockedRequests.push(url.origin);
        return route.abort();
      }
      return route.continue();
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/login');
    await page.locator('input[type="password"]').waitFor();
    await page.goto(base + '/dashboard');
    await page.waitForURL('**/login');
    assert.equal(errors.length, 0, errors.join('\n'));
  } finally { await browser.close(); }
  fs.mkdirSync('scratch', { recursive: true });
  const report = { runtime: 'local workerd', results, browserErrors: errors, blockedExternalRequests: blockedRequests, authenticatedDatabaseIntegration: 'not tested; requires disposable test services' };
  fs.writeFileSync('scratch/cloudflare-local-smoke.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
