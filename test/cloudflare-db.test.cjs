const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load({ env = {}, binding, fail, emitErrorOnEnd = false, emitPostEndError = false } = {}) {
  const clients = [];
  class Client extends EventEmitter {
    constructor(config) {
      super();
      this.config = config;
      this.connection = new EventEmitter();
      clients.push(this);
    }
    async connect() {
      if (fail === 'connect') throw new Error('connect failed');
    }
    async query(text, values) {
      if (fail === 'query') throw new Error('query failed');
      return { rows: [{ ok: true }], text, values };
    }
    async end() {
      this.closed = true;
      if (emitErrorOnEnd) {
        // Simulate pg-cloudflare emitting a socket error on the Client EventEmitter during teardown
        this.emit('error', new Error('CloudflareSocket closed during teardown'));
      }
      if (emitPostEndError) {
        queueMicrotask(() => {
          this.emit('error', new Error('Post-close reader cancellation error'));
        });
      }
    }
  }
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/lib/db.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    URL,
    process: { env },
    require(name) {
      if (name === 'pg') return { Client };
      if (name === '@opennextjs/cloudflare') return { getCloudflareContext: () => ({ env: { HYPERDRIVE: binding } }) };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return {
    pool: module.exports.pool,
    resolveDirectDatabaseConfig: module.exports.resolveDirectDatabaseConfig,
    sanitizeDatabaseEnvValue: module.exports.sanitizeDatabaseEnvValue,
    clients,
  };
}

test('concurrent and subsequent Hyperdrive queries never share clients and explicitly avoid worker-side TLS negotiation', async () => {
  const { pool, clients } = load({ env: { MCIT_CLOUDFLARE: 'true', PGSSLMODE: 'require' }, binding: { connectionString: 'local-hyperdrive?sslmode=require' } });
  assert.equal(clients.length, 0, 'import performs no database I/O');
  const params = [42];
  const [result] = await Promise.all([pool.query('SELECT $1', params), pool.query('SELECT 2')]);
  await pool.query('SELECT 3');
  assert.equal(result.text, 'SELECT $1');
  assert.equal(result.values, params);
  assert.equal(clients.length, 3);
  assert.ok(clients.every(c => c.closed && c.config.connectionString === 'local-hyperdrive?sslmode=require' && c.config.ssl === false));
});

test('missing Hyperdrive fails closed even when DATABASE_URL exists', async () => {
  const { pool, clients } = load({ env: { MCIT_CLOUDFLARE: 'true', DATABASE_URL: 'must-not-use' } });
  await assert.rejects(pool.query('SELECT 1'), /HYPERDRIVE binding is required/);
  assert.equal(clients.length, 0);
});

for (const fail of ['connect', 'query']) {
  test(`client closes after ${fail} failure`, async () => {
    const { pool, clients } = load({ env: { DATABASE_URL: 'local-only' }, fail });
    await assert.rejects(pool.query('SELECT 1'), new RegExp(`${fail} failed`));
    assert.equal(clients[0].closed, true);
  });
}

test('missing local configuration never opens a database client', async () => {
  const { pool, clients } = load();
  await assert.rejects(pool.query('SELECT 1'), /DATABASE_URL is required/);
  assert.equal(clients.length, 0);
});

test('direct database connections enforce verified TLS (rejectUnauthorized: true) and strip surrounding quotes', async () => {
  const { pool, clients } = load({
    env: {
      DATABASE_URL:
        '"postgresql://neondb_owner:synthetic@ep-restless-sky-bahmv7ek.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require"',
    },
  });
  await pool.query('SELECT 1');
  assert.equal(clients.length, 1);
  assert.match(clients[0].config.connectionString, /sslmode=verify-full/);
  assert.equal(clients[0].config.ssl?.rejectUnauthorized, true);

  const loopback = load({
    env: {
      DATABASE_URL: "'postgresql://local:local@127.0.0.1:54329/mcit_test_local'",
    },
  });
  await loopback.pool.query('SELECT 1');
  assert.equal(loopback.clients[0].config.ssl, false);

  const dbSource = fs.readFileSync('src/lib/db.ts', 'utf8');
  assert.ok(!/rejectUnauthorized\s*:\s*false/.test(dbSource), 'src/lib/db.ts must never use rejectUnauthorized: false');

  const supabaseDirect = load({
    env: {
      DATABASE_URL: 'postgresql://postgres.cecxrscpuwowodogojar:dummy@aws-1-eu-central-1.pooler.supabase.com:5432/postgres',
    },
  });
  await supabaseDirect.pool.query('SELECT 1');
  assert.equal(supabaseDirect.clients[0].config.ssl?.rejectUnauthorized, true);
  assert.match(supabaseDirect.clients[0].config.ssl?.ca, /BEGIN CERTIFICATE/);
  const parsedCert = new (require('node:crypto').X509Certificate)(supabaseDirect.clients[0].config.ssl?.ca);
  assert.match(parsedCert.subject, /Supabase Root 2021 CA/);
});

test('pg-cloudflare socket-close error events during and after client.end() never trigger unhandled rejections', async () => {
  const unhandled = [];
  const captureUnhandled = (error) => unhandled.push(error);
  process.on('unhandledRejection', captureUnhandled);
  try {
  const { pool, clients } = load({
    env: { MCIT_CLOUDFLARE: 'true' },
    binding: { connectionString: 'local-hyperdrive' },
    emitErrorOnEnd: true,
    emitPostEndError: true,
  });
  const res = await pool.query('SELECT 1');
  assert.deepEqual(res.rows, [{ ok: true }]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(clients.length, 1);
  assert.equal(clients[0].closed, true);
  assert.deepEqual(unhandled, []);
  } finally {
    process.removeListener('unhandledRejection', captureUnhandled);
  }
});
