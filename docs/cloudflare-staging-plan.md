# Cloudflare staging plan & deployment checklist

Prepared 2026-11-06 in `migration/cloudflare-phase1`.
- **Provisioned on Cloudflare Free (approved)**: `NEXT_INC_CACHE_KV` Workers KV namespace (`id: 7c1a2d05e9234278ab113eb6e344106d`), verified via `npx wrangler kv namespace list` and bound in both `wrangler.jsonc` and `wrangler.staging.jsonc`.
- **No paid resources or payment card required**: R2 Object Storage has been completely removed.
- **No production database connections or public deployments have been executed.**

## Verified account access & Free-plan resources

- `npx wrangler whoami` succeeded with the active OAuth session.
- `npx wrangler kv namespace create NEXT_INC_CACHE_KV` succeeded on the Cloudflare Free plan without a payment card.
- `npx wrangler kv namespace list` verified the namespace (`title: NEXT_INC_CACHE_KV`, `id: 7c1a2d05e9234278ab113eb6e344106d`).
- `npx wrangler hyperdrive list` succeeded (currently 0 Hyperdrive configs; ready to create once staging PostgreSQL credentials are provided).
- No account identifiers, OAuth tokens, or database credentials are stored in repository files.

## Staging configuration (`wrangler.staging.jsonc`)

Next 16.4.5 / OpenNext 1.20.16 / Wrangler 4.158.0 / pg 8.23.1.
A dedicated `wrangler.staging.jsonc` is prepared alongside `wrangler.jsonc`:

| Resource | Staging identity (`wrangler.staging.jsonc`) | Production/Default (`wrangler.jsonc`) | Required binding/settings |
| --- | --- | --- | --- |
| Worker | `mcit-test-case-front-staging` | `mcit-test-case-front` | `.open-next/worker.js`; `nodejs_compat` + `global_fetch_strictly_public` |
| Static assets | bundled with Worker | bundled with Worker | `ASSETS` -> `.open-next/assets` |
| Worker self reference | `mcit-test-case-front-staging` | `mcit-test-case-front` | `WORKER_SELF_REFERENCE` matches Worker `name` |
| Workers KV cache | `7c1a2d05e9234278ab113eb6e344106d` | `7c1a2d05e9234278ab113eb6e344106d` | `NEXT_INC_CACHE_KV` (`KVIncrementalCache`) |
| Hyperdrive config | `05ed75e5fe7f4bfd8a1ee3caaf41874d` (`mcit-test-case-staging-db`) | awaiting DB (`0000...0000`) | `HYPERDRIVE`; `--caching-disabled=true` |
| SQLite DO queue | `DOQueueHandler` | `DOQueueHandler` | `NEXT_CACHE_DO_QUEUE`; `new_sqlite_classes` migration |
| SQLite DO tag cache | `DOShardedTagCache` | `DOShardedTagCache` | `NEXT_TAG_CACHE_DO_SHARDED`; `new_sqlite_classes` migration |
| Image optimization | `IMAGES` | `IMAGES` | Cloudflare Images binding |

## Frontend vs. Backend URL separation (`AUTH_URL` vs. `NEXT_PUBLIC_BASE_URL`)

| Variable | Role | Local Preview | Staging Worker | Production Worker |
| --- | --- | --- | --- | --- |
| `AUTH_URL` | **Frontend** canonical origin (used by Auth.js for session callbacks, CSRF checks, and login redirects) | `http://localhost:8787` | `https://mcit-test-case-front-staging.hassan-a173784.workers.dev` | `https://mcit-test-case-front.hassan-a173784.workers.dev` (or custom domain) |
| `NEXT_PUBLIC_BASE_URL` | **Backend (NestJS)** API origin (used at build time and runtime for `/api/auth/login`, `/api/test-cases`, `/api/projects`, `/api/users`, `/api/warmup`, etc.) | `https://mcit-test-case-backend-staging.onrender.com` | `https://mcit-test-case-backend-staging.onrender.com` | `https://mcit-test-case-backend.onrender.com` |
| `AUTH_TRUST_HOST` | Auth.js host header trust | `true` | `true` | `true` |
| `MCIT_CLOUDFLARE` | Enforces `HYPERDRIVE` binding in `src/lib/db.ts` | `true` | `true` | `true` |

- **Hardcoded fallback removal**: `src/app/(dashboard)/change-password/changepassword.action.ts` and `src/app/api/users/notifications/stream/route.ts` previously fell back to `"https://mcit-test-case-backend.onrender.com"` when `NEXT_PUBLIC_BASE_URL` was omitted. Both fallbacks have been removed so staging/local environments never accidentally contact the production Render backend.

## Cloudflare Free plan limits & KV failure resilience

| Product | Cloudflare Free allowance | Application behavior when limit is reached |
| --- | --- | --- |
| Workers Free | 100,000 requests/day; 10ms CPU/request; 128MB memory; 64MiB uncompressed bundle (current bundle: ~10.63MiB uncompressed / ~2.62MiB gzip) | Requests exceeding daily quota return Cloudflare quota error; no automatic billing on Free |
| Workers KV Free | 100,000 reads/day; 1,000 writes/day; 1,000 deletes/day; 1,000 lists/day; 1GB storage | `KVIncrementalCache` wraps `kv.get`, `kv.put`, and `kv.delete` in `try/catch` blocks (verified by unit tests in `test/cloudflare-auth.test.cjs`). If the 1,000 writes/day limit is exceeded, `kv.put` logs the error and resolves cleanly so HTTP responses still succeed; if `kv.get` fails, it returns `null` and falls back to fresh rendering |
| Hyperdrive Free | 100,000 SQL statements/day | Query caching disabled (`--caching-disabled=true`) so revocations, roles, and audit logs are always fresh |
| SQLite Durable Objects Free | 100,000 requests/day; 5M rows read/day; 100,000 rows written/day; 5GB storage | Used by `DOQueueHandler` and `DOShardedTagCache` for Next.js tag/path revalidation |
| Images Free | 5,000 unique transformations/month | Transformations fail closed after monthly free allowance without automatic billing |

## Verified local PostgreSQL database, schema, seed & integration tests

To verify all SQL queries, triggers, authentication, session revocation, and audit logging locally without ever touching production Supabase:
- **Schema script**: `scripts/local-test-schema.sql` — idempotent DDL creating all 18 tables (`users`, `projects`, `project_assignments`, `project_deadline_deliveries`, `test_cases`, `test_case_imports`, `releases`, `test_cycles`, `test_cycle_items`, `test_executions`, `user_login_sessions`, `audit_logs`, `password_resets`, `notifications`, `quality_applications`, `quality_checklists`, `app_cache_revision`, `schema_migrations`), the `test_cases_current` view, `clear_project_primary_tester` trigger, and `bump_app_cache_revision` triggers.
- **Synthetic seed script**: `scripts/local-test-seed.sql` — seeds strictly synthetic users (`admin@synthetic.local`, `tester1@synthetic.local`, `tester2@synthetic.local`), synthetic projects (`Synthetic Portal Project`, `Synthetic Payments Project`), synthetic test cases (`TC_SYN_001`–`TC_SYN_003`), synthetic workflow executions, and synthetic quality applications.
- **Initializer & safety guard**: `scripts/init-local-test-db.cjs` — runs `local-test-schema.sql` and `local-test-seed.sql` against an isolated local PostgreSQL 18.6 (`PGlite` + `node-postgres` `pg.Client`) instance or a non-production staging connection string, and throws an immediate error if any `.supabase.co`, `.supabase.com`, `pooler.supabase`, or `.onrender.com` host is passed.
- **Automated integration suite**: `test/cloudflare-local-postgres.test.cjs` — verifies login persistence, real Auth.js JWE cookie decoding (`myUtil.ts`), role-based access control, device/session revocation (`sessions.action.ts`), audit logging (`audit.ts`, `audit-logs.action.ts`), project/test-case/user queries (`fast-read.ts`), quality assessments (`quality.action.ts`), Excel report export (`exportProjectReport.action.ts`), and PostgreSQL triggers (`bump_app_cache_revision`, `clear_project_primary_tester`).

## Evaluation of no-payment-card PostgreSQL staging options for Cloudflare Hyperdrive

Cloudflare Hyperdrive requires a publicly reachable PostgreSQL endpoint supporting standard PostgreSQL wire protocol over TLS (`port 5432`, `sslmode=require`) and true PostgreSQL features (`PL/pgSQL` triggers, `to_jsonb`, `LATERAL`, `ILIKE`, `pg_advisory_xact_lock`).

| Provider | Payment Card Required? | Hyperdrive Compatibility | Free Plan Allowance | Verdict |
| --- | --- | --- | --- | --- |
| **1. Neon Serverless Postgres** (`neon.tech`) | **No** | **100% Compatible** (officially supported by Cloudflare Hyperdrive via Neon's **Direct / Unpooled** connection string `ep-xxx.region.aws.neon.tech:5432?sslmode=require`) | 0.5 GB storage, 100 CU-hours/month compute, PostgreSQL 16/17, full PL/pgSQL triggers & views | **Recommended #1** — completely separate from Supabase, provides a free IPv4/IPv6 direct TLS endpoint with zero card requirement |
| **2. Aiven for PostgreSQL** (`aiven.io`) | **No** | **100% Compatible** (direct TLS PostgreSQL endpoint with no upstream PgBouncer transaction pooler) | 1 free PostgreSQL instance, 5 GB storage, 1 vCPU / 1 GB RAM, always-on (no scale-to-zero cold start) | **Recommended #2** — completely separate provider, always-on free PostgreSQL instance |
| **3. Separate Supabase Free Account** | **No** (for basic Free tier) | **Caveat**: Supabase's direct connection (`db.<ref>.supabase.co:5432`) is IPv6-only unless the paid IPv4 add-on (\$4/mo) is purchased; free IPv4 requires Supavisor session mode (`aws-0-<region>.pooler.supabase.com:5432`) | 500 MB database, max 2 free projects per organization, pauses after 7 days of inactivity | **Not preferred** — Neon/Aiven avoid IPv4 pooler caveats and eliminate any risk of confusing staging with the production Supabase dashboard |
| **4. CockroachDB Serverless** | No | **Incompatible with schema** (lacks PL/pgSQL `FOR EACH STATEMENT` triggers and `pg_advisory_xact_lock`) | N/A | **Do not use** |

## Provisioned Neon Staging PostgreSQL & Cloudflare Hyperdrive (`mcit-test-case-staging-db`)

- **Staging PostgreSQL Provider**: Neon Serverless Postgres (`ep-restless-sky-bahmv7ek.c-8.eu-central-1.aws.neon.tech`, database `neondb`, role `neondb_owner`, direct TLS connection with pooling disabled).
- **Schema & Seed Initialized**: All 18 tables, `test_cases_current` view, `clear_project_primary_tester` trigger, `bump_app_cache_revision` triggers, RLS + `REVOKE ALL FROM PUBLIC` on `test_case_imports`, and synthetic seed data (`admin@synthetic.local`, `tester1@synthetic.local`, `tester2@synthetic.local` with real `bcryptjs` hashes for synthetic password `StagingTest#2026!`) have been applied and verified live against `neondb`.
- **Cloudflare Hyperdrive Created**: `mcit-test-case-staging-db` (`id: 05ed75e5fe7f4bfd8a1ee3caaf41874d`) created on Cloudflare Free with `--caching-disabled=true` and bound in `wrangler.staging.jsonc` (`wrangler.jsonc` remains untouched with placeholder `00000000000000000000000000000000`).

## Prepared Staging NestJS Backend (`D:\MCIT\test_case\scratch\garage-safe-startup`)

### 1. Isolated Backend Worktree & Startup Safety (`codex/garage-safe-startup-release`)
- **Worktree**: `D:\MCIT\test_case\scratch\garage-safe-startup` (branch `codex/garage-safe-startup-release`, synced with `WorkflowService.history()` fallback from `b82bea88`).
- **Critical Difference vs. `origin/main` (`b82bea88`)**:
  - On `origin/main`, `DatabaseService.onModuleInit()` unconditionally executes `initTables()`, `migrateWorkflow()`, `migrateProjectDeadlines()`, `migrateCacheRevision()`, `migrateTestCaseImports()`, `migrateGarageWorkbookSeed()`, and `seedInitialData()` (the `ALLOW_DATABASE_BOOTSTRAP` check in `D:\MCIT\test_case\backend` was uncommitted).
  - In `D:\MCIT\test_case\scratch\garage-safe-startup` (`codex/garage-safe-startup-release`), all automatic bootstrap DDL, destructive migrations, and production Garage workbook seeds are **completely removed from startup**. Instead, `DatabaseService.onModuleInit()` runs `assertRuntimeSchemaReady(this.db)` inside a `BEGIN READ ONLY ... ROLLBACK` transaction to verify the 18-table schema, `test_cases_current` view, `schema_migrations` ledger, and `test_case_imports` RLS without ever mutating the database.
  - Background deadline scans in `ProjectDeadlinesService.onApplicationBootstrap()` are also disabled by default unless `ENABLE_PROJECT_DEADLINE_WORKER=true` is explicitly set.

### 2. Required Staging Backend Environment Variables, Commands & Health Check
Prepared in `D:\MCIT\test_case\scratch\garage-safe-startup\.env.staging.example` and `render.staging.yaml`:

| Setting / Env Var | Staging Value | Purpose |
| --- | --- | --- |
| **Build Command** | `npm ci && npm run build` | Installs exact lockfile dependencies and runs `nest build` |
| **Start Command** | `npm run start:prod` | Runs `node dist/main` |
| **Health Check Path** | `/api/docs` (or `/api/users/all`) | Returns HTTP `200 OK` without requiring a bearer JWT (`JwtAuthGuard` is global on `/api/*` except `@Public()` routes and Swagger `/api/docs`) |
| `NODE_ENV` | `production` | Production runtime mode |
| `PORT` | `3001` (or Render's injected `PORT`) | HTTP listener port (`process.env.PORT ?? 3001`) |
| `DATABASE_URL` | Neon `neondb` direct TLS URL (`sslmode=require`) | Connects exclusively to the isolated Neon staging database (`ep-restless-sky-bahmv7ek.c-8.eu-central-1.aws.neon.tech/neondb`) |
| `JWT_SECRET` | New staging-only random secret (`openssl rand -base64 32`) | Signs and verifies staging backend JWTs; never reuses the production secret |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime matching Auth.js session maxAge |
| `ALLOW_DATABASE_BOOTSTRAP` | `false` | Explicitly disables any bootstrap/DDL/seed logic |
| `ENABLE_PROJECT_DEADLINE_WORKER` | `false` | Disables background 30s deadline notification scans on staging startup |
| `CORS_ALLOWED_ORIGINS` | `https://mcit-test-case-front-staging.hassan-a173784.workers.dev,https://mcit-test-case-backend-staging.onrender.com` | Exact comma-separated HTTPS origins allowed by `createCorsOptions()`; fails closed if malformed or wildcard |
| `BACKEND_URL` | `https://mcit-test-case-backend-staging.onrender.com` | Used by `DatabaseService.resolvePhotoUrl()` so user avatar URLs never fall back to the production Render URL |

### 3. Render Free Plan Eligibility Analysis
- **Can Render Free host the staging backend alongside production without a paid subscription?** **Yes.**
- **Free Instance Hours**: Render Free provides **750 free instance-hours per calendar month** shared across all Free Web Services in the workspace.
  - A single service running 24/7 for a 31-day month consumes at most `31 × 24 = 744 hours`.
  - Because Render Free Web Services automatically spin down after **15 minutes of inactivity** and wake up on incoming HTTP requests (and via `/api/warmup`), the combined active hours of the existing production service plus `mcit-test-case-backend-staging` remain well below the 750 free hours/month limit without requiring a paid plan or incurring charges.
- **Region Recommendation**: Select **Frankfurt (EU Central)** (`region: frankfurt`) for `mcit-test-case-backend-staging` so it is co-located in the same region (`eu-central-1`) as the Neon staging PostgreSQL database (`ep-restless-sky-bahmv7ek.c-8.eu-central-1.aws.neon.tech`).

### 4. Exact Instructions to Create the Separate Staging Render Service
1. **Push the safe backend branch** (only after user approval):
   - Push `codex/garage-safe-startup-release` from `D:\MCIT\test_case\scratch\garage-safe-startup` to `origin` (`https://github.com/HassanMcit/MCIT_test_case_Backend.git`). Do **not** push to `main` so the production Render service is never triggered.
2. **Create a NEW Web Service in the Render Dashboard** (do **not** edit `mcit-test-case-backend`):
   - Click **New +** -> **Web Service**.
   - Connect repository: `HassanMcit/MCIT_test_case_Backend`.
   - **Name**: `mcit-test-case-backend-staging`
   - **Region**: `Frankfurt (EU Central)`
   - **Branch**: `codex/garage-safe-startup-release`
   - **Runtime**: `Node`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Instance Type**: `Free` (\$0/month)
3. **Configure Environment Variables** (under **Environment**):
   - `NODE_ENV` = `production`
   - `PORT` = `3001`
   - `ALLOW_DATABASE_BOOTSTRAP` = `false`
   - `ENABLE_PROJECT_DEADLINE_WORKER` = `false`
   - `DATABASE_URL` = *(paste the Neon `neondb` direct connection string from `.dev.vars.staging`)*
   - `JWT_SECRET` = *(click Generate or paste a new 32-byte random staging secret)*
   - `JWT_EXPIRES_IN` = `7d`
   - `BACKEND_URL` = `https://mcit-test-case-backend-staging.onrender.com`
   - `CORS_ALLOWED_ORIGINS` = `https://mcit-test-case-front-staging.hassan-a173784.workers.dev,https://mcit-test-case-backend-staging.onrender.com`
4. **Configure Advanced Settings**:
   - **Health Check Path**: `/api/docs`
   - **Auto-Deploy**: `No` (or `Off` so deployments only happen when explicitly triggered)

## Staging deployment checklist

1. [x] Fix Worker name (`mcit-test-case-front`) and `WORKER_SELF_REFERENCE` binding (`Error 10143` resolved).
2. [x] Remove R2 dependency and migrate incremental cache to Workers KV (`NEXT_INC_CACHE_KV`).
3. [x] Provision `NEXT_INC_CACHE_KV` on Cloudflare Free (`7c1a2d05e9234278ab113eb6e344106d`) and update `wrangler.jsonc` and `wrangler.staging.jsonc`.
4. [x] Verify `AUTH_URL` and `NEXT_PUBLIC_BASE_URL` separation and remove hardcoded Render production URL fallbacks.
5. [x] Verify KV failure fallback behavior (`get`/`put`/`delete` resilience) and all unit/layout/OpenNext/preview smoke tests.
6. [x] Initialize Neon staging PostgreSQL (`neondb`), verify auth/revocation/audit/queries live, create Hyperdrive config `mcit-test-case-staging-db` (`05ed75e5fe7f4bfd8a1ee3caaf41874d`, `--caching-disabled=true`), and update `wrangler.staging.jsonc`.
7. [x] Prepare and verify the isolated staging NestJS backend (`D:\MCIT\test_case\scratch\garage-safe-startup`), build TypeScript (`nest build`), pass all backend release tests, and verify all NestJS services live against the 18-table Neon `neondb` schema (`scripts/verify-backend-staging-neon.cjs`).
8. [x] **Deploy and verify the separate staging NestJS backend on Render Free** (`https://mcit-test-case-backend-staging.onrender.com` on branch `codex/garage-safe-startup-release`) connected ONLY to Neon `neondb`.
9. [x] **Configure staging frontend URLs & generate staging-only `AUTH_SECRET`** for `mcit-test-case-front-staging`:
   - Generated a new 32-byte staging-only `AUTH_SECRET` in `.dev.vars.staging` and `.dev.vars` (ready to upload via `npx wrangler secret put AUTH_SECRET --config=wrangler.staging.jsonc`).
   - Set `AUTH_URL` to `https://mcit-test-case-front-staging.hassan-a173784.workers.dev` in `wrangler.staging.jsonc`.
   - Set `NEXT_PUBLIC_BASE_URL` at both build time (`scripts/cloudflare-windows-junctions.cjs`) and runtime (`wrangler.staging.jsonc`) to `https://mcit-test-case-backend-staging.onrender.com`.
10. [ ] **Update `CORS_ALLOWED_ORIGINS` on Render (`mcit-test-case-backend-staging`)**:
    - Ensure `CORS_ALLOWED_ORIGINS` in the Render Dashboard for `mcit-test-case-backend-staging` is set to `https://mcit-test-case-front-staging.hassan-a173784.workers.dev,https://mcit-test-case-backend-staging.onrender.com`.
11. [ ] **Upload `AUTH_SECRET` & deploy Worker to staging (after explicit user approval)**:
    - Upload `AUTH_SECRET` to `mcit-test-case-front-staging` and run `npx opennextjs-cloudflare deploy --config=wrangler.staging.jsonc`.
12. [ ] **Run end-to-end staging verification**:
    - Test login (`admin@synthetic.local` / `tester1@synthetic.local` with `StagingTest#2026!`), JWT session persistence, session revocation, role-based access control, audit log insertion, and cache invalidation across desktop and mobile networks.
