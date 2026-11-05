// Read-only public HTTP checks and a bounded connection attempt using the
// application's locally configured production database URL. Never logs secrets.
const fs = require('node:fs');
const { Pool } = require('pg');
const FRONT = 'https://mcit-test-case-front.vercel.app';
const BACK = 'https://mcit-test-case-backend.onrender.com';
async function get(label, url, options = {}, summarize) {
  try {
    const response = await fetch(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Garage-readonly-release-check', ...options.headers } });
    const result = { label, status: response.status, location: response.headers.get('location'), cacheControl: response.headers.get('cache-control'), allowOrigin: response.headers.get('access-control-allow-origin'), allowCredentials: response.headers.get('access-control-allow-credentials') };
    if (response.ok && summarize) Object.assign(result, await summarize(response));
    console.log(JSON.stringify(result));
  } catch (error) { console.log(JSON.stringify({ label, error: error.cause?.code || error.name })); }
}
async function database() {
  const lines = fs.readFileSync('.env.production', 'utf8').split(/\r?\n/);
  const found = lines.map(line => line.match(/^\s*DATABASE_URL\s*=\s*(.*?)\s*$/)).find(Boolean);
  if (!found) { console.log(JSON.stringify({ label: 'database', error: 'No locally configured production DATABASE_URL' })); return; }
  const connectionString = found[1].replace(/^(['"])(.*)\1$/, '$2');
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 10000, query_timeout: 12000, max: 1 });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout='10s'");
    for (const [label, sql] of [
      ['schema', `SELECT to_regclass('public.test_case_imports') AS provenance_table,to_regclass('public.schema_migrations') AS migration_ledger,to_regclass('public.test_cases_current') AS current_view`],
      ['existing_case_baseline', `SELECT COUNT(*)::int AS total,md5(string_agg(md5(to_jsonb(tc)::text),'' ORDER BY id)) AS content_fingerprint FROM test_cases tc`],
      ['garage_cases', `SELECT p.id AS project_id,p.name,p.application,tc.module,u.id AS owner_id,u.name AS owner,COUNT(*)::int AS cases FROM test_cases tc JOIN projects p ON p.id=tc."projectId" LEFT JOIN users u ON u.id=tc."testerId" WHERE p.name='Testing Garage System' GROUP BY p.id,p.name,p.application,tc.module,u.id,u.name`],
      ['permissions', `SELECT has_schema_privilege(current_user,'public','CREATE') AS can_create,has_table_privilege(current_user,'public.test_cases','SELECT,INSERT') AS can_read_insert,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user`],
    ]) console.log(JSON.stringify({ label, rows: (await client.query(sql)).rows }));
    const ledger = (await client.query("SELECT to_regclass('public.schema_migrations') AS value")).rows[0].value;
    if (ledger) console.log(JSON.stringify({ label: 'migrations', rows: (await client.query("SELECT name FROM schema_migrations WHERE name IN ('20261025_execution_workflow_v1','20261104_project_deadlines_v1','20261104_cache_revision_v1','20261105_test_case_imports_v1') ORDER BY name")).rows }));
    await client.query('ROLLBACK');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.log(JSON.stringify({ label: 'database', error: error.code || 'connection_timeout_or_failure' }));
  } finally { if (client) client.release(); await pool.end(); }
}
async function main() {
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), mode: 'read-only; no login, migration or import' }));
  await Promise.all([
    get('backend_openapi', `${BACK}/api/docs-json`, {}, async r => { const doc = await r.json(); return { garageImportDocumented: !!doc.paths?.['/api/test-cases/bulk-import/garage'], garageVerificationDocumented: !!doc.paths?.['/api/test-cases/bulk-import/garage/{batchHash}'] }; }),
    get('backend_auth', `${BACK}/api/auth/me`),
    get('backend_test_cases', `${BACK}/api/test-cases?limit=1`),
    get('frontend_import_cache_route', `${FRONT}/api/test-cases/import-cache`),
    get('frontend_test_cases', `${FRONT}/test-cases`),
    get('frontend_anonymous_session', `${FRONT}/api/auth/session`, {}, async r => ({ anonymousSession: await r.json() === null })),
    get('cors_trusted', `${BACK}/api/test-cases/bulk-import/garage`, { method: 'OPTIONS', headers: { Origin: FRONT, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } }),
    get('cors_untrusted', `${BACK}/api/test-cases/bulk-import/garage`, { method: 'OPTIONS', headers: { Origin: 'https://untrusted.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } }),
    ...['Front','Backend'].map(repo => get(`github_${repo}_deployments`, `https://api.github.com/repos/HassanMcit/MCIT_test_case_${repo}/deployments?per_page=3`, {}, async r => ({ deployments: (await r.json()).map(d => ({ id: d.id, sha: d.sha, ref: d.ref, environment: d.environment, createdAt: d.created_at })) }))),
    database(),
  ]);
}
main().catch(error => { console.error(error.code || error.name); process.exitCode = 1; });
