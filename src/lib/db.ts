import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required (server-only)");

export const pool =
  global.__pgPool ||
  new Pool({
    connectionString,
    max: process.env.NETLIFY === "true" ? 2 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ...(process.env.NETLIFY === "true"
      ? { query_timeout: 10000, statement_timeout: 10000 }
      : {}),
    ssl: { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  global.__pgPool = pool;
}
