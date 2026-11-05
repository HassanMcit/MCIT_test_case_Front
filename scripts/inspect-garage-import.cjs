const fs = require('node:fs');
const { Pool } = require('pg');

function envFile(file) {
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/)
    .map(line => line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/))
    .filter(Boolean).map(([, key, value]) => [key, value.replace(/^(['"])(.*)\1$/, '$2')]));
}

async function main() {
  const front = envFile('.env.development');
  const back = envFile('backend/.env');
  const configuredUrl = new URL(front.DATABASE_URL);
  console.log('Database endpoint:', JSON.stringify({ host: configuredUrl.hostname, port: configuredUrl.port || '5432', database: configuredUrl.pathname }));
  console.log('Configured databases match:', new URL(front.DATABASE_URL).pathname === new URL(back.DATABASE_URL).pathname && new URL(front.DATABASE_URL).hostname === new URL(back.DATABASE_URL).hostname);
  console.log('Backend API:', front.NEXT_PUBLIC_BASE_URL);
  const pool = new Pool({ connectionString: front.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
  try {
    for (const [label, sql] of [
      ['columns', `SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('test_cases','test_executions','test_cases_current','projects') ORDER BY table_name,ordinal_position`],
      ['users', `SELECT id,name,role FROM users WHERE lower(name) LIKE '%alaa%' OR lower(name) LIKE '%hassan%' ORDER BY id`],
      ['projects', `SELECT id,name,status FROM projects ORDER BY id`],
      ['assignments', `SELECT pa."userId",pa."projectId" FROM project_assignments pa JOIN users u ON u.id=pa."userId" WHERE lower(u.name) LIKE '%alaa%' OR lower(u.name) LIKE '%hassan%'`],
      ['existing_ids', `SELECT id,"testId","projectId",module,"testerId" FROM test_cases WHERE "testId" ~ '^TC_0[0-9]{2}$' ORDER BY id`],
      ['cache', `SELECT * FROM app_cache_revision`],
      ['triggers', `SELECT event_object_table,trigger_name,event_manipulation FROM information_schema.triggers WHERE trigger_schema='public' AND event_object_table IN ('test_cases','test_executions')`],
    ]) console.log(label, JSON.stringify((await pool.query(sql)).rows));
  } finally { await pool.end(); }
}
main().catch(error => { console.error(error.message, error.code || '', error.cause?.code || ''); process.exitCode = 1; });
