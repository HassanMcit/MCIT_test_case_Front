# Cloudflare migration readiness

Worktree: D:/MCIT/test_case/scratch/cloudflare-phase1
Branch: migration/cloudflare-phase1
Base commit: 2e4213ce9214611c001f9e9e8365ded716771cf0
All migration edits remain uncommitted. Main and its unrelated edits are untouched.
No cloud resources, deployment, production connection, schema change, or data mutation occurred.

## Current result

- Full OpenNext production build PASSED on Windows.
- Local workerd preview PASSED at http://127.0.0.1:8787.
- Local smoke and headless browser checks PASSED; no browser JavaScript errors.
- Deployment bundle dry-run PASSED, with no upload.
- Real PostgreSQL/Hyperdrive and Render login integration is NOT verified: no
  disposable database/backend test services or authorized staging credentials exist.
- This is ready for the next staging-validation phase, not a verified production cutover.

## Exact toolchain

Node 24.22.1; Next.js 16.4.5; OpenNext Cloudflare 1.20.16;
Wrangler 4.158.0; pg 8.23.1; Zod 4.6.6; rclone.js 0.6.6.
Next.js and OpenNext were updated together after npm audit reported critical
advisories in Next 16.3.6. Updated audit: 0 critical, 13 high, 8 moderate, 1 low.
Remaining direct flagged packages: OpenNext/rclone (transitive tooling findings),
shadcn (tooling), xlsx (existing workbook/export dependency). No blanket audit fix,
major downgrade, or feature removal was applied. These require risk review before
public production approval. A clean audit is NOT claimed.

## Implementation

- wrangler.jsonc: Worker name (`mcit-test-case-front`), assets, matching self reference
  (`WORKER_SELF_REFERENCE -> mcit-test-case-front`, fixing Cloudflare Error 10143),
  Hyperdrive placeholder, Workers KV incremental cache (`NEXT_INC_CACHE_KV`, replacing
  R2 so no payment card or R2 activation is required), SQLite Durable Object
  revalidation queue/tag cache, Images binding, Node compatibility.
- package.json and package-lock.json: `name` set to `mcit-test-case-front` and
  `packageManager` set to `npm@11.19.1`; scripts `cf:build`, `cf:preview`, `cf:deploy`,
  and `cf:check` pass `--config=wrangler.jsonc` explicitly so Cloudflare Workers Builds
  never runs `opennextjs-cloudflare migrate` or derives a mismatched `test-case` service.
- Hyperdrive uses an all-zero placeholder resource ID and unreachable loopback port 1.
  Workers.dev and preview URLs are disabled. Do not deploy this local configuration.
- open-next.config.ts retains persistent cache and tag revalidation; auth/role/revision
  checks still precede persistent cache access. No security-result caching was added.
- Generated cloudflare-bindings.d.ts is merged into OpenNext's CloudflareEnv type.
- src/lib/db.ts preserves awaited pool.query SQL/parameter/result behavior. Every query
  creates and closes its own Client. No cross-request pool/socket is retained.
  Worker mode requires HYPERDRIVE and never falls back to DATABASE_URL.
  Explicit non-Worker DATABASE_URL remains available for local development. The
  embedded credential fallback from committed main is removed in this branch.
  No callers currently use Pool.connect or transactions; future transactions must
  use one dedicated client, rather than multiple facade calls.
- src/proxy.ts becomes src/middleware.ts with the same guards and protected matchers.
  The Next deprecation warning is expected for this OpenNext compatibility path.
- Existing audit calls in business actions are awaited; payloads and SQL are unchanged.
- Warmup/background fetch work is registered with Next request-lifetime handling.
- Windows desktop-launch API routes preserve their hosted/non-Windows fallback JSON.
- next.config.ts explicitly traces pg-cloudflare/dist and esm. Next's Node export
  tracing otherwise omits the Workers export required by the current adapter.
- scripts/cloudflare-windows-junctions.cjs is an optional local BUILD preload. It
  retries only EPERM directory links under .open-next as junctions, with source
  restricted to this worktree. It does not patch dependencies, change OS settings,
  or enter the application/Worker runtime. Normal Linux builds need no workaround.
- The optional real-workbook regression now loads its backend module only inside
  the already-conditional test, so a standalone frontend checkout can skip correctly.

## Local verification

- Unit tests: 46 passed, 1 optional real-workbook test skipped. No failures.
- Synthetic auth tests cover Credentials rejection/success, session/audit insertion,
  JWT claim propagation, revoked devices, token cutoff, presence updates, tester
  rejection and admin revocation. No real accounts, passwords or SQL server used.
- DB tests cover independent concurrent clients, unchanged SQL/parameters, cleanup
  after connect/query errors, missing configuration and missing-binding fail-closed.
- Existing project/performance tests cover authorization, revoked sessions, cache
  identity/revision separation, mutations and invalidation.
- Layout audit: 378 checks, no failures.
- Synthetic production browser fixture: roles, revocation, account-switch isolation,
  caching and navigation passed (see scratch/performance-after.json).
- Workers smoke: login and all referenced static chunks, image optimization, anonymous
  Auth.js session/providers/CSRF, eight protected route redirects, unauthorized quality
  APIs and import-cache rejection. Details: scratch/cloudflare-local-smoke.json.
- The smoke browser blocks every non-loopback request; Google Fonts CSS requests were
  blocked. No browser JavaScript errors. No production Render/Supabase calls.
- Preview prepopulation prints a temporary platform-proxy warning about internal DO
  classes; the actual built Worker exports the classes and starts successfully. Full
  authenticated cache/DO invalidation still needs disposable-service integration tests.
- TypeScript and git diff whitespace checks passed.

## Reproducible local commands

The ignored .dev.vars contains ONLY synthetic values. No .env files or production
credentials were copied. Database/API targets intentionally cannot connect.

PowerShell from this worktree:

    $env:MCIT_CLOUDFLARE='true'
    $env:DATABASE_URL='postgresql://local:local@127.0.0.1:1/local'
    $env:AUTH_SECRET='phase1-local-test-only'
    $env:AUTH_URL='http://localhost:8787'
    $env:AUTH_TRUST_HOST='true'
    $env:NEXT_PUBLIC_BASE_URL='http://127.0.0.1:1'
    $env:WRANGLER_SEND_METRICS='false'
    npm run test:unit
    npm run cf:build:windows
    npm run cf:check
    npm run cf:preview -- --port 8787 --ip 127.0.0.1

In another local terminal, with preview running:

    node scripts/verify-cloudflare-local.cjs

cf:check is wrangler deploy --dry-run; it does not upload or deploy. Linux can use
npm run cf:build without the Windows preload. Browser tests use the existing local
.qa-test-tools installation via an ignored junction; new machines need Playwright
and Chrome available separately. Do not copy this junction as a portable dependency.

## Free plan assessment

No plan upgrade or resource activation was performed. Zero monthly cost is possible
only within every involved product's allowance; it is not guaranteed for this workload.

- Workers Free: 100,000 requests/day, 10ms CPU/request, 128MB memory, 50 subrequests,
  six concurrent outgoing connections. Current documented size allowance: 64MiB
  uncompressed. Local dry-run bundle is approximately 10.63MiB uncompressed,
  2.62MiB gzip, 81 static assets. CPU suitability is not proven by wall-clock timings.
- Hyperdrive Free: 100,000 SQL statements/day. Session polling and fresh security
  queries count; cached SQL also counts. Disable Hyperdrive query caching for this app.
- SQLite Durable Objects are available on Free, subject to request/storage limits.
- R2 Standard free tier: 10GB-month, 1M Class A and 10M Class B operations/month.
  Overage can be billable. R2 activation/billing terms must be reviewed and explicitly
  approved before resource creation; the current local emulator has no cloud billing.
- Images Free: 5,000 unique transformations/month; new transformations fail after the
  allowance rather than automatically charging on Images Free.
- Existing Render and Supabase free-tier sleep, quotas and availability remain.
- Frequent session/notification polling and large XLSX exports are likely capacity
  pressure points. Measure real staging workload before promising a free deployment.

Sources checked:
https://developers.cloudflare.com/workers/platform/limits/
https://developers.cloudflare.com/hyperdrive/platform/pricing/
https://developers.cloudflare.com/durable-objects/platform/pricing/
https://developers.cloudflare.com/r2/pricing/
https://developers.cloudflare.com/images/pricing/

## Deployment preparation ? gated, NOT executed

1. Authorize and provide access to a Cloudflare account; remain on Free plans.
2. Authorize disposable staging PostgreSQL and test backend services. Run real-driver
   login, session revocation, audit persistence, cache invalidation, report and SSE tests.
3. Review remaining high dependency advisories and staging CPU/query measurements.
4. With explicit resource approval, replace the placeholder Hyperdrive ID, bind the
   existing Supabase direct endpoint privately, and disable Hyperdrive query caching.
   No Supabase migration or record import is needed. Prefer least-privilege credentials.
5. Approve/create the R2 cache bucket and SQLite DO bindings. The Wrangler migrations
   configure Cloudflare cache storage only, not production database schemas.
6. Choose Worker name and final HTTPS workers.dev/custom domain. Match self-reference
   service name. Enable the selected public route only after explicit deployment approval.
7. Set AUTH_SECRET as a Worker secret, AUTH_URL to the canonical HTTPS origin,
   AUTH_TRUST_HOST=true, and MCIT_CLOUDFLARE=true. Set NEXT_PUBLIC_BASE_URL to the
   existing Render origin for BOTH build and runtime. Never ship dummy .dev.vars.
   Hyperdrive owns the private DB credentials; do not embed them in the repository.
8. Build with production non-secret public config, repeat dry-run, then (only with
   explicit approval) upload/deploy. No deployment script or automatic CI was added.
9. Test phone/desktop and separate networks on the final HTTPS origin. Cookies do not
   transfer from Netlify; employees may need to sign in again. Review Render exact-origin
   CORS if direct browser traffic is enabled; server-to-server fetches need no CORS.
10. Keep Netlify and existing secrets/config available for rollback. Restore its domain
    routing or the prior Worker version if checks fail. No database rollback is needed.

Missing authorization/access is the next boundary: no cloud authentication, resource
creation, production DB integration, commit, push, or public deployment will occur
without the user's explicit authorization. Public access is not enabled by local preview.
