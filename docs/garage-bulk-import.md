# Garage workbook import: implementation and operator runbook

Production status: **not deployed; no production records imported**. Production deployment (including the additive migration) and the production commit require the owner's explicit approval. Local tests use isolated PostgreSQL WASM (PGlite), synthetic accounts and synthetic cases. Never start the backend locally with its production `.env` just to run these tests.

Confirmed service locations: frontend **https://mcit-test-case-front.vercel.app** on Vercel, backend on Render, PostgreSQL on Supabase. GitHub pushes are separate from deployment approval; review automatic deployment rules before merging either release branch.

For the current CORS security follow-up, runtime probe, clean-build results, provider access steps and approval gates, see [garage-release-readiness.md](garage-release-readiness.md). Backend commit 61299a07 is the reviewed base; the security follow-up is required before release.

## Production readiness review

Read-only public checks found the Vercel login page returning 200 with private/no-store caching, the anonymous Auth.js session returning `null` with private/no-store caching, and Render `/api/auth/me` returning 401 without credentials. The live CORS configuration allows the correct frontend origin, but also reflects an unrelated origin with credentials enabled. This matches the existing `origin: true` source configuration. A restricted production origin allowlist should be reviewed before deployment; no production CORS settings have been changed. Server-to-server login/import/cache requests still require genuine backend JWT administrator authorization and do not rely on CORS for security.

Required existing environment variables: Render `DATABASE_URL` and `JWT_SECRET`; Vercel `DATABASE_URL`, `AUTH_SECRET`, and `NEXT_PUBLIC_BASE_URL` pointing to the Render origin. Render supplies `PORT`; production processes should run with `NODE_ENV=production`. `JWT_EXPIRES_IN` and `BACKEND_URL` are optional existing backend settings. `AUTH_URL`/`AUTH_TRUST_HOST` depend on the existing Auth.js host setup and should not be changed blindly. The CLI uses temporary, privately entered `GARAGE_IMPORT_EMAIL`/`GARAGE_IMPORT_PASSWORD`. No secrets or environment variables were changed. Local presence checks are not verification of live Render/Vercel environment values.

The additive migration now enables RLS without client policies and revokes PUBLIC table privileges. The database owner/backend role retains access; ordinary client roles cannot read or insert provenance, including when records exist. Five-second lock and thirty-second statement timeouts bound migration lock waits. Project deletion is now transactional and blocks imported provenance before detaching cases; ordinary eligible project deletion still works. Existing standalone-case deletion continues to cascade provenance through the case foreign key.

The migration must finish **before the new backend accepts traffic and before the frontend is updated**. It does not require a separate earlier deployment: startup awaits it before `listen()`. Prefer an explicitly approved Render pre-deploy migration, where supported, so errors block rollout while the old service remains available. Render's documented sequence is build → pre-deploy → start ([Render deployment documentation](https://render.com/docs/deploys)).

The new `backend/scripts/migrate-test-case-imports.cjs` runs only with the existing Render environment, never loads a local `.env`, and supports `--check` (read-only prerequisites/TLS/access checks), `--dry-run` (DDL transaction rolled back), and `--apply` (approved migration). It blocks missing prerequisite workflow/project/cache migrations, missing configured JWT secret, unencrypted DB connections, and unexpected existing provenance security. Docker now includes the scripts directory. No command below has been run against production:

```sh
# In the built backend service/image on Render, after explicit approval:
node scripts/migrate-test-case-imports.cjs --check
node scripts/migrate-test-case-imports.cjs --dry-run
# Approved pre-deploy command:
node scripts/migrate-test-case-imports.cjs --apply
```

Inspect the actual linked repository and root before configuring Render: for the standalone backend repository the root is `.`, build is `npm ci && npm run build`, start is `npm run start:prod`; for a genuine monorepo checkout the root may be `backend`. Do not assume the frontend repository's nested Git pointer provides backend source to Render. Preserve the existing native/Docker service type. Confirm effective TLS, database ownership/grants, migration ledger, existing bootstrap user, and backup/recovery availability privately in the provider dashboards. Existing startup bootstrap/profile-maintenance code still runs on restart; this review does not claim the entire startup path is read-only. Live dashboard configuration, deployment commit SHAs and production user/project IDs remain pending verification.

Deploy the backend first, confirm the migration/security checks and authenticated existing list/detail/project APIs, then deploy Vercel with `npm ci` and `npm run build`. The frontend changes require the new table. If the backend fails, do not deploy the frontend. Roll back application versions in reverse order if necessary and keep the additive table and provenance; do not drop tables or delete source records as an application rollback.

After deployment approval and successful smoke checks, execute only the default online dry-run described below, show its complete 51-row plan and actual IDs, and obtain a **separate** explicit approval before using `--commit`. Deployment approval does not authorize importing cases.

## Deployment and connectivity findings

- The configured API is `https://mcit-test-case-backend.onrender.com`, consistent with a Render Web Service. `backend/Dockerfile` runs the Nest HTTP server; `main.ts` listens on `process.env.PORT`. No Render blueprint or authenticated Render management connection is available in this workspace, so the live service type, region, deployed commit, and live environment values could not be independently inspected.
- The locally configured database is **external Supabase PostgreSQL**, at `aws-1-eu-central-1.pooler.supabase.com:6543`, database `postgres`. The development, production and backend local configuration files point to the same endpoint. Credentials are deliberately omitted here. This does not prove Render's live `DATABASE_URL` is identical.
- DNS resolves. TCP port 6543 times out from this computer, before PostgreSQL authentication or TLS negotiation. That does not establish whether Supabase restrictions, a firewall, routing, or another network policy is responsible; it also does not prove backend-only access.
- The API responds over HTTPS. An unauthenticated Test Cases request returns 401 as expected. That response alone does not prove the backend can query PostgreSQL.
- The backend uses its existing `DatabaseService.db` pool and Render's `DATABASE_URL`. The import client does not need a database connection, database password, database port access, or a local server.
- The backend currently supplies no explicit SSL object to `pg`; connection-string/provider settings govern it. The frontend direct-read pool separately configures SSL. No production SSL settings or environment variables were changed.

Before approving deployment, check Render Dashboard → the existing backend service: confirm **Web Service**, root/build settings, deployed revision, and existing `DATABASE_URL` provider/host/port/SSL parameters without copying its secret value into logs or chat. Confirm a known working administrator can log in and read `/api/auth/me` and `/api/projects`. Successful online dry-run is the decisive test that the deployed service can query its database and resolve all import relationships.

A Render internal database URL applies only if PostgreSQL is actually hosted on Render and the service can reach that database's private network. The configured Supabase endpoint is external; do not replace it with an invented Render internal URL. If a connection or TLS change is needed, propose the provider-issued configuration for approval first. This implementation requires no environment-variable changes.

## API and authorization

The existing global `JwtAuthGuard` and `JwtStrategy` protect both new routes. The strategy verifies JWT signatures/expiry, loads the current role from PostgreSQL, and checks revocation. The import service additionally requires an existing authenticated **admin**. A JWT claiming `admin` for a database tester is rejected. No public-route exception, fabricated production token or authorization bypass was added.

- `POST /api/auth/login` is the official login endpoint.
- `GET /api/auth/me` verifies the authenticated account.
- `POST /api/test-cases/bulk-import/garage` accepts `{ dryRun: true, rows: [{ original: { /* exact Excel column/value pairs */ } }] }`.
- The default is dry-run. Exactly 51 sequential IDs and all eleven source columns are required; strings and nulls are retained verbatim. Invalid values, formulas, unknown source columns and oversized content are rejected instead of truncated. Only original `Pass` and `Fail` statuses are supported for this workbook.
- A preview returns the actual project ID, actual owner IDs, exact page names, planned timestamps, each row's insert/skip/conflict action, source `batchHash`, and a `previewHash` binding that plan to the current mappings and records.
- Commit uses the same POST with `dryRun: false` and the reviewed `previewHash`. A changed mapping/source/existing record invalidates the preview. Any conflict or insert failure rolls back the entire batch. No update, overwrite, project creation, user creation or membership grant is performed.
- `GET /api/test-cases/bulk-import/garage/:batchHash` verifies PostgreSQL definitions, retained source metadata and the current-result view. It is admin-only.
- `POST <frontend>/api/test-cases/import-cache` accepts `{ batchHash }` and the same Bearer credential. It independently verifies the admin and persisted import with Render before expiring the relevant Next.js tags and paths. It does not need local PostgreSQL access.

Preview performs no business writes and leaves the cache revision unchanged. Normal authentication presence updates and audit logging may still occur. Audit descriptions distinguish preview from import.

## Exact field mapping

| Excel field / requirement | Existing destination |
| --- | --- |
| Test Case ID | `test_cases.testId`, unchanged (`TC_001`–`TC_051`) |
| Project | Resolve exactly one existing `projects.name = 'Testing Garage System'`; use its `id` in `test_cases.projectId` |
| Application / Module dropdown | Require that project's `application = 'Garage System'`; store `test_cases.module = 'Garage System'` |
| Excel Module | `test_cases.pageName`, verbatim; also retained in original source metadata |
| Test Scenario | `test_cases.scenario` |
| Pre-Conditions | `test_cases.preConditions`, preserving nulls and whitespace |
| Test Steps | `test_cases.steps`, a JSON array containing the whole original cell as one string; all numbering and line endings survive |
| Expected Result | `test_cases.expectedResult` |
| Actual Result | `test_cases.actualResult`, source-reported current baseline |
| Status | `Pass → passed`, `Fail → failed`; original spelling retained separately |
| Defect ID | `test_case_imports.original['Defect ID']` |
| Tester | `test_case_imports.original.Tester`, distinct from assigned owner and importing admin |
| Execution Date | Original text in `test_case_imports.original['Execution Date']`; never silently parse the ambiguous locale/timezone |
| Requested owner | Existing `test_cases.testerId`: rows 1–30 resolve **Alaa Eldin Mohsen**, rows 31–51 resolve **Hassan Ali** |
| Planned schedule | `test_case_imports.plannedAt` plus `plannedTimezone = 'Africa/Cairo'`, rows 1–30 only |
| Import actor and time | `test_case_imports.importedById`, `importedAt` |
| Audit timestamps | Existing database defaults for `createdAt` and `updatedAt`; no backdating |

There is **no `applicationId`**. The architecture uses text application selections (`projects.application` and `test_cases.module`); the separate quality application directory has no foreign-key relationship from these cases.

`testerId` is used as the assigned tester/owner for these imported definitions. No importer is passed as a creator or executor. The source dates lack verified locale/timezone information, so `executedAt` remains NULL and **no `test_executions` rows are fabricated**. Both the reported results and every original cell remain visible through the API and the expandable Imported Excel details on the existing Test Cases page.

The plan is November 5, 2026, 09:00–11:25 Cairo, five-minute intervals (07:00–09:25 UTC). The runtime validates the IANA Cairo offset for that date. Hassan's rows have no planned timestamps and receive real import/audit timestamps.

Both names must resolve uniquely; non-admin owners must already be project members. Ambiguous/missing users, a missing/duplicate project, a different application, or missing access blocks the batch. No IDs are guessed.

## Additive migration and duplicate policy

`backend/src/database/test-case-import-migration.ts` adds **test_case_imports** and its source/batch uniqueness indexes. The metadata is separate so editing ordinary notes cannot destroy original source content or import attribution. It is keyed to the existing case and cascades when that case is legitimately deleted. No existing column, ID format, record, execution, relationship, or timestamp is rewritten.

The migration follows the existing `schema_migrations` / advisory-lock / transaction convention. It runs once during backend startup after the existing workflow, project and cache migrations. Deploying the backend will therefore apply it; approve and review this migration as part of deployment. The tests exercise migration preview rollback and repeat application.

`test_cases.testId` is already TEXT in the repository schema. The ordinary DTO regex is the limitation; this dedicated import DTO can preserve underscores without a destructive migration. Existing project-scoped uniqueness remains intact. Dry-run also detects an older global unique index with conflicting IDs in another project and blocks import. Inspect and propose a separate migration rather than dropping constraints automatically. Unexpected live schema errors roll back the transaction.

An identical previously imported definition with matching provenance is skipped. A pre-existing foreign record or a changed imported definition is a conflict, even if its ID matches. The import never renumbers conflicting IDs. Concurrent duplicate inserts are stopped by database uniqueness and cause whole-batch rollback. Retry by obtaining a fresh preview; do not delete conflicting records to force an import.

Affected business tables: `test_cases`, `test_case_imports`. Existing triggers increment `app_cache_revision` transactionally; the endpoint also explicitly increments it once for a non-empty batch. `schema_migrations` records the migration; the existing audit/session mechanisms continue to record the authenticated activity. No projects, applications, users, memberships or execution-history records are created by the import.

## Production execution, after explicit approval

1. Approve and deploy the backend changes to the existing Render service using its normal deployment process. Keep its existing database credentials and JWT configuration. Native build: `npm ci` then `npm run build`, start: `npm run start:prod`, service root `backend`; alternatively use its existing Docker deployment. The backend is a separate Git repository in this workspace, so publish its changes through that repository's actual deployment branch. Do not assume a frontend commit deploys it.
2. Approve and deploy the frontend changes (API cache route, metadata read/display) to its normal host **after** the backend migration is applied. No additional dependency is needed for the importer: the frontend repository already contains `xlsx`.
3. Open PowerShell in `D:\MCIT\test_case`. Privately enter an **existing administrator** account's credentials into this process. Do not put passwords/tokens into chat, command arguments, source files or committed `.env` files:

```powershell
$importCredential = Get-Credential -Message 'Existing Test Case Management administrator'
$env:GARAGE_IMPORT_EMAIL = $importCredential.UserName
$env:GARAGE_IMPORT_PASSWORD = $importCredential.GetNetworkCredential().Password
```

4. Perform the online dry run. This sends the full workbook only to the existing HTTPS backend; the default cannot insert cases:

```powershell
try {
  node scripts/import-garage.cjs --file 'C:\Users\hassa\Desktop\The Garage System Testing Report.xlsx' --api 'https://mcit-test-case-backend.onrender.com'
} finally {
  Remove-Item Env:GARAGE_IMPORT_EMAIL, Env:GARAGE_IMPORT_PASSWORD -ErrorAction SilentlyContinue
  $importCredential = $null
}
```

Review `canCommit: true`, `conflicts: []`, project ID/name/application, both actual owner IDs, 30/21 counts, all 51 page mappings and planned timestamps. On a new batch expect `wouldInsert: 51`, `skipped: 0`. Keep the returned **previewHash** (not a credential). Do not substitute the offline batch hash: the online hash includes live mappings.

5. Obtain **separate explicit approval for the production import** based on this preview. After approval, repeat the private credential setup and use the exact reviewed hash. Replace the frontend origin with the application's real frontend origin (no path):

```powershell
try {
  node scripts/import-garage.cjs --file 'C:\Users\hassa\Desktop\The Garage System Testing Report.xlsx' --api 'https://mcit-test-case-backend.onrender.com' --commit --preview-hash '<reviewed-online-previewHash>' --frontend 'https://mcit-test-case-front.vercel.app'
} finally {
  Remove-Item Env:GARAGE_IMPORT_EMAIL, Env:GARAGE_IMPORT_PASSWORD -ErrorAction SilentlyContinue
  $importCredential = $null
}
```

The CLI logs in through `/api/auth/login`, keeps the JWT only in memory, checks `/api/auth/me`, sends the import, then checks persisted PostgreSQL data through the new verification endpoint, reads **all 51 individual records through the existing API**, compares every original field and mapping, and checks the existing list endpoint. The final frontend call expires caches. It never opens PostgreSQL from this computer or writes a JSON file as storage.

If the final verification or cache call fails **after commit**, records may already be saved. Do not report that the transaction failed or blindly reinsert. Inspect the returned import result, obtain another preview (identical records should show 51 skips), and resolve the failed verification/cache request. `previewHash` can become stale after any relevant mapping/record change; obtain a fresh preview and approval when that happens.

6. Refresh `/test-cases?projectId=<actual-project-id>`. Confirm the 51 original IDs, Garage System application, varying page names and assigned owners. Expand Imported Excel details to inspect original Tester, Defect ID, Execution Date, full steps and the explicitly planned timeline. Check search, pagination and project/status filters. Check with the two owners and another existing authorized project member; an unrelated user must not gain access. No redeployment is needed for subsequent imports once this implementation is deployed.

## Independent verification from Render / database console

The verification endpoint executes SQL against the backend's actual PostgreSQL connection, recomputes canonical source hashes, checks 51 definitions and their original cells, checks names and 30/21 ownership, and compares the current-result view. This provides direct database verification without exposing a database socket locally.

For an independent read-only check from Render's authorized shell or the provider SQL console (substitute the approved batch hash):

```sql
SELECT p.id, p.name, p.application, tc.module, u.name AS owner, COUNT(*)
FROM test_case_imports i
JOIN test_cases tc ON tc.id = i."testCaseId"
JOIN projects p ON p.id = tc."projectId"
JOIN users u ON u.id = tc."testerId"
WHERE i."batchHash" = '<batchHash>'
GROUP BY p.id, p.name, p.application, tc.module, u.name;

SELECT tc."testId", COUNT(*)
FROM test_cases tc JOIN projects p ON p.id=tc."projectId"
WHERE p.name='Testing Garage System' AND tc."testId" ~ '^TC_0[0-9]{2}$'
GROUP BY tc."testId" HAVING COUNT(*) > 1;

SELECT tc."testId", i."sourceRow", tc."pageName", i.original->>'Module' AS source_page,
       i."plannedAt" AT TIME ZONE 'Africa/Cairo' AS planned_cairo,
       i.original->>'Tester' AS original_tester,
       i.original->>'Execution Date' AS reported_execution_date,
       tc."createdAt", tc."updatedAt", tc."executedAt", i."importedAt"
FROM test_case_imports i JOIN test_cases tc ON tc.id=i."testCaseId"
WHERE i."batchHash"='<batchHash>' ORDER BY i."sourceRow";
```

Expected: exactly two grouped ownership rows with counts 30 and 21; no duplicate rows; page name equals source Module for every row; the first 30 planned times range from 09:00 to 11:25, the rest NULL. Audit/import timestamps are real import times; source execution dates remain explicitly reported source text.

## Local validation completed

- Nest build and Next.js production build pass, including TypeScript checks.
- 46 backend tests pass across Garage import, existing workflow, deletion and project deadline suites. Coverage includes genuine PostgreSQL transactions, rollback after a deliberately injected metadata failure, unique/source conflicts, stale preview, idempotent rerun, JWT authentication/expiry/current database role, outsider permissions, missing memberships, source integrity, actual audit times, list/search/filter/pagination and exact 30/21 ownership.
- Cache authorization/invalidation and read-only validation of the actual Desktop workbook pass (2 more tests). Offline source: 51 sequential rows, 11 columns, 13 distinct page names, canonical batch hash `7a332076ea55ed4889b38ca5d0268af84517c5fa0702abce3a0e96cffd7f5527`.
- New frontend/CLI files pass targeted Biome checks; new backend import files pass targeted Oxlint with the existing project strictNullChecks configuration warnings. Full repository lint is still failing: backend existing workflow tests have floating-promise diagnostics, and the root Biome scan includes numerous existing/generated/backend formatting and lint findings. Unrelated code was not reformatted.
- **Not verified yet:** live Render environment, live database user/project IDs, production online dry-run, production writes, production API comparisons or production browser visibility. No production deployment or import was attempted.

Reproduce from the workspace root:

```powershell
npm.cmd install --prefix .qa-test-tools --no-save --package-lock=false @electric-sql/pglite
Push-Location backend
npm.cmd run build
npm.cmd run test:release
Pop-Location
$env:GARAGE_WORKBOOK='C:\Users\hassa\Desktop\The Garage System Testing Report.xlsx'
node --test test/garage-import-cache.test.cjs test/garage-workbook.test.cjs
Remove-Item Env:GARAGE_WORKBOOK
node scripts/import-garage.cjs --file 'C:\Users\hassa\Desktop\The Garage System Testing Report.xlsx' --offline-preview
npm.cmd run build
```
