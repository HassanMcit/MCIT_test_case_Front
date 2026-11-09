// Safe initialization & synthetic seeding helper for an isolated local/staging PostgreSQL database.
// Strictly blocks any connection to production Supabase hosts.
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const FORBIDDEN_HOST_PATTERNS = [
  /supabase\.co/i,
  /supabase\.com/i,
  /pooler\.supabase/i,
  /onrender\.com/i,
];

const ALLOWED_STAGING_TARGETS = [
  {
    host: 'ep-restless-sky-bahmv7ek.c-8.eu-central-1.aws.neon.tech',
    database: 'neondb',
    user: 'neondb_owner',
  },
  {
    host: '127.0.0.1',
    database: 'mcit_test_local',
    user: 'local',
  },
  {
    host: 'localhost',
    database: 'mcit_test_local',
    user: 'local',
  },
];

function assertSafeDatabaseTarget(connectionString) {
  if (!connectionString) {
    throw new Error('Database connection string is required');
  }
  for (const pattern of FORBIDDEN_HOST_PATTERNS) {
    if (pattern.test(connectionString)) {
      throw new Error(
        `Refusing to run test schema/seed against forbidden or production-like host matching ${pattern}`,
      );
    }
  }
  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error('Invalid PostgreSQL connection string format');
  }
  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error(`Unsupported database protocol: ${parsed.protocol}`);
  }
  const dbName = parsed.pathname.replace(/^\/+/, '');
  const user = decodeURIComponent(parsed.username || '');
  const host = parsed.hostname.toLowerCase();
  const matched = ALLOWED_STAGING_TARGETS.find(
    (t) => t.host === host && t.database === dbName && t.user === user,
  );
  if (!matched) {
    throw new Error(
      `Refusing to connect: target (${host}/${dbName} as ${user}) is not in ALLOWED_STAGING_TARGETS`,
    );
  }
  return { host, database: dbName, user };
}

function getSchemaSql() {
  return fs.readFileSync(path.join(__dirname, 'local-test-schema.sql'), 'utf8');
}

function getSeedSql() {
  return fs.readFileSync(path.join(__dirname, 'local-test-seed.sql'), 'utf8');
}

async function createIsolatedLocalPostgres({ dataDir = 'memory://', seed = true } = {}) {
  const pgliteRoot =
    process.env.PGLITE_MODULE ||
    path.resolve(__dirname, '../.qa-test-tools/node_modules/@electric-sql/pglite');
  const { PGlite } = require(pgliteRoot);
  const { createPgConfig } = require(
    path.join(pgliteRoot, 'dist/node-postgres/index.cjs'),
  );

  const pglite = new PGlite(dataDir);
  await pglite.waitReady;

  await pglite.exec(getSchemaSql());
  if (seed) {
    await pglite.exec(getSeedSql());
  }

  // Facade matching src/lib/db.ts: each query creates, connects, and closes its own pg.Client.
  // Because PGlite runs PostgreSQL in single-session WASM mode, serialize concurrent pg.Client
  // wire-protocol exchanges so Promise.all([pool.query(...), pool.query(...)]) never interleaves Parse/Bind/Sync frames.
  let queue = Promise.resolve();
  const pool = {
    query(text, values) {
      const run = async () => {
        const client = new Client(createPgConfig(pglite));
        try {
          await client.connect();
          return await client.query(text, values);
        } finally {
          await client.end();
        }
      };
      const next = queue.then(run, run);
      queue = next.then(
        () => {},
        () => {},
      );
      return next;
    },
  };

  return {
    pglite,
    pool,
    async close() {
      await pglite.close();
    },
  };
}

async function initializeExternalTestPostgres(connectionString, { seed = true } = {}) {
  const verifiedTarget = assertSafeDatabaseTarget(connectionString);
  const client = new Client({
    connectionString,
    ssl:
      verifiedTarget.host === '127.0.0.1' || verifiedTarget.host === 'localhost'
        ? false
        : { rejectUnauthorized: true },
  });
  try {
    await client.connect();
    const identityRes = await client.query(
      'SELECT current_database() AS db, current_user AS usr, version() AS ver',
    );
    const row = identityRes.rows[0] || {};
    if (row.db !== verifiedTarget.database || row.usr !== verifiedTarget.user) {
      throw new Error(
        `Connected database identity mismatch: expected ${verifiedTarget.user}@${verifiedTarget.database}, got ${row.usr}@${row.db}`,
      );
    }
    await client.query(getSchemaSql());
    if (seed) {
      await client.query(getSeedSql());
    }
    return {
      host: verifiedTarget.host,
      database: row.db,
      user: row.usr,
      version: row.ver,
    };
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  (async () => {
    const targetDir = process.argv.includes('--persist')
      ? path.resolve(__dirname, '../.wrangler/local-test-pgdata')
      : 'memory://';
    if (targetDir !== 'memory://') {
      fs.mkdirSync(path.dirname(targetDir), { recursive: true });
    }
    const { pool, close } = await createIsolatedLocalPostgres({
      dataDir: targetDir,
      seed: true,
    });
    try {
      const [tables, migrations, counts, rev] = await Promise.all([
        pool.query(`
          SELECT table_name, table_type
          FROM information_schema.tables
          WHERE table_schema = 'public'
          ORDER BY table_name ASC
        `),
        pool.query(`SELECT name FROM schema_migrations ORDER BY name ASC`),
        pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM users) AS users_count,
            (SELECT COUNT(*)::int FROM projects) AS projects_count,
            (SELECT COUNT(*)::int FROM project_assignments) AS assignments_count,
            (SELECT COUNT(*)::int FROM test_cases) AS test_cases_count,
            (SELECT COUNT(*)::int FROM test_case_imports) AS imports_count,
            (SELECT COUNT(*)::int FROM releases) AS releases_count,
            (SELECT COUNT(*)::int FROM test_cycles) AS cycles_count,
            (SELECT COUNT(*)::int FROM test_executions) AS executions_count,
            (SELECT COUNT(*)::int FROM quality_applications) AS quality_apps_count,
            (SELECT COUNT(*)::int FROM quality_checklists) AS quality_checklists_count
        `),
        pool.query(`SELECT id, revision::int AS revision FROM app_cache_revision`),
      ]);
      console.log(
        JSON.stringify(
          {
            ok: true,
            mode: targetDir === 'memory://' ? 'memory' : targetDir,
            tablesCount: tables.rows.length,
            tables: tables.rows.map((r) => `${r.table_name} (${r.table_type})`),
            migrations: migrations.rows.map((r) => r.name),
            counts: counts.rows[0],
            cacheRevision: rev.rows[0],
          },
          null,
          2,
        ),
      );
    } finally {
      await close();
    }
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  assertSafeDatabaseTarget,
  createIsolatedLocalPostgres,
  initializeExternalTestPostgres,
};
