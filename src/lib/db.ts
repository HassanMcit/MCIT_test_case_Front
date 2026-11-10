import { Pool, PoolConfig } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function resolveConnectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Cloudflare OpenNext bindings / Hyperdrive
  const cfEnv = (globalThis as any).process?.env || (globalThis as any).__env || {};
  if (cfEnv.DATABASE_URL) return cfEnv.DATABASE_URL;
  if (cfEnv.HYPERDRIVE?.connectionString) return cfEnv.HYPERDRIVE.connectionString;

  return "";
}

function createPoolInstance(): Pool {
  if (global.__pgPool) return global.__pgPool;

  const connectionString = resolveConnectionString();
  const config: PoolConfig = {
    connectionString: connectionString || undefined,
    max: process.env.NETLIFY === "true" ? 2 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ...(process.env.NETLIFY === "true"
      ? { query_timeout: 10000, statement_timeout: 10000 }
      : {}),
    ssl: { rejectUnauthorized: false },
  };

  const p = new Pool(config);

  if (process.env.NODE_ENV !== "production") {
    global.__pgPool = p;
  }
  return p;
}

// Lazy proxy: does not throw on module import if DATABASE_URL is not yet populated
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const activePool = createPoolInstance();
    const val = (activePool as any)[prop];
    return typeof val === "function" ? val.bind(activePool) : val;
  },
});
