# Garage release: remaining execution gates

No production changes, main-branch pushes, merges or deployments were performed in this pass. The CORS fix and runtime-check improvements are local follow-up changes and require review/publication before they can be deployed. Production data, backups, provider settings and runtime permissions have not been verified through authenticated provider access.

## Exact source promotion assessment

Read-only GitHub ref checks show:

| Repository | main | reviewed branch | ancestry |
| --- | --- | --- | --- |
| Backend | `d22304ab199b94f933144e599571a0aac506185e` | `61299a07ac7dc9e965f932361168c5b455283116` | main is the review commit's ancestor; 0 commits behind, 1 ahead |
| Frontend | `acdc0d974f9f97fb3b9383576888892abbed1527` | `9c6d4f95fee36d994b2ee1007a22963cb0a86136` | main is the review commit's ancestor; 0 commits behind, 1 ahead |

There is no divergent committed main history or merge conflict for either reviewed commit. The reviewed diffs contain the import/provenance implementation, its UI/client/tests/runbook and deployment safeguards. Backend project-deletion changes are intentional compatibility protection for provenance. The frontend's nested backend pointer intentionally references `61299a07`; Render must deploy from its actual standalone backend repository rather than assume that pointer deploys source.

The working trees also contain older unrelated local edits and generated build outputs. Do not run `git add .`, build a release from the entire dirty working tree, or include those edits in a release. Promote reviewed commits from a clean checkout. The new CORS/runtime follow-up must be committed separately on top of `61299a07`, reviewed, and assigned its own immutable SHA. **Deploying `61299a07` alone does not include the CORS fix.** The frontend application code remains at `9c6d4f9`; this new operational document is a separate documentation change.

The review commits include `[skip render] [skip ci]`. Frontend `vercel.json` disables automatic Git deployments only for `codex/garage-bulk-import`; it does not disable a future confirmed production branch. Do not remove these safeguards or rely on a merge automatically deploying. After approval, manually deploy the approved immutable backend release revision, then the approved frontend revision with the Production environment. Recheck main/ref ancestry immediately before promotion if GitHub has changed. No force push or overwrite is required.

## CORS implementation and environment

- `createCorsOptions()` in `backend/src/security/cors.ts` is wired into the actual Nest bootstrap.
- The default exact allowlist contains `https://mcit-test-case-front.vercel.app` and the backend service origin `https://mcit-test-case-backend.onrender.com`. The latter preserves same-origin Swagger API calls; it is not derived from an untrusted Host header.
- Optional `CORS_ALLOWED_ORIGINS` adds comma-separated exact HTTPS origins or explicitly trusted HTTP loopback origins. For example, a developer can configure `http://localhost:3000`; an operator can configure one exact trusted preview URL. No wildcard previews, regex/suffix matching, automatic localhost allowance, URL paths, credentials, or `null` origins are accepted.
- Malformed configuration fails startup. Untrusted request/preflight origins receive 403 before the handler runs. Trusted preflight receives 204 with the exact origin, allowed methods/headers, credentials flag, `Vary: Origin`, and a five-minute maximum age.
- Credentials support is retained for trusted origins. Cookie-only calls do not become authenticated: backend authentication still requires a valid backend JWT, and current database roles still enforce administrator authorization. Origin-less Next.js/CLI calls continue through those same guards.
- No environment change is needed for the production frontend. Additional origin configuration requires an explicit trusted-origin decision; do not allow every `*.vercel.app` preview.

This is a local security fix. The previously observed production CORS issue remains until an approved release deploys it.

## Actions requiring provider access

### Render: inspect and run the existing-runtime probe

1. Open the existing `mcit-test-case-backend` service in the Render Dashboard. In **Settings → Build & Deploy**, record the linked repository, branch, root directory, native/Docker type, build/start/pre-deploy commands and auto-deploy setting. Do not change them yet.
2. Open **Events / deploy history**, open the currently Live successful deployment, and record its commit SHA and deploy ID. Record an available previous successful deployment for rollback. A GitHub main SHA is not proof of Render's live SHA or configured branch.
3. Open **Environment**. Privately confirm `DATABASE_URL` targets the correct Supabase project, and `JWT_SECRET` is explicitly configured. Confirm the effective production runtime. Do not copy secrets, deploy-hook URLs or connection strings into chat. No variables should be edited during this check.
4. Look for **Shell**. Availability depends on service type/compute plan; I cannot verify it without provider access. If available, open it and use the existing service environment. The live artifact does not yet contain the new probe, so running a nonexistent script filename will not work. Instead, paste this wrapper, paste the **entire contents** of `backend/scripts/production-baseline.cjs`, then the terminator:

```sh
node <<'GARAGE_READ_ONLY'
# Replace this line with the complete production-baseline.cjs JavaScript contents.
GARAGE_READ_ONLY
```

The pasted contents must replace the placeholder comment, including the script's final invocation. The program requires only the already-installed `pg`, never imports AppModule, never loads `.env`, never starts the server, and uses a read-only transaction which is rolled back. Its output contains no credentials. It reports the original case count/IDs/fingerprint, schema/migration markers, target project/application, both owners/memberships, existing Garage records, duplicate IDs, runtime privileges, actual client TLS/peer certificate verification and provenance RLS if present. A count different from 65 is a reconciliation blocker, not permission to change records. Exit zero only means the DB probe passed its local gates; backups and deployment configuration still need provider verification.

5. If Shell is unavailable, inspect whether **Jobs / one-off jobs** are available for the service. A one-off job uses the current build artifact/environment; it does not magically contain this review branch. Only a standalone inline read-only probe is appropriate at this stage. Do not run the application startup, a migration, the importer, a paid plan upgrade or a new job without its applicable approval. The Supabase SQL Editor alternative below requires no Render job.

Return only the service branch, live/rollback SHAs or deploy IDs, Shell/Jobs availability, variable-presence confirmations, and sanitized probe output. If the probe reports an error code, report that code rather than a connection string.

Official references: [Render shell access](https://render.com/docs/ssh), [one-off jobs](https://render.com/docs/one-off-jobs).

### Supabase: baseline and recovery evidence

1. Select the correct production Supabase project and open **SQL Editor → New query**.
2. Open `backend/scripts/production-baseline.sql`. Run the first read-only transaction through `ROLLBACK`. If `migration_ledger` is not NULL, separately run its final migration-ledger SELECT. All statements are reads or transaction-local settings; they do not apply a migration.
3. Save the baseline case IDs/count/fingerprint, project/application row, owner IDs/roles/memberships, existing Garage groups, duplicates and migration names. The SQL Editor role is not necessarily the Render runtime role; it cannot establish Render's connection permissions or client TLS. Use the runtime probe for those, or have the authorized operator inspect the actual configured role privately.
4. Open **Database → Backups**. Record the latest successful backup timestamp, retention and whether PITR/recovery is actually available for this project's plan. Do not click Restore, change plans or enable paid features. If no recovery point or independent backup exists, stop the release until the owner approves a backup/recovery solution.

Backup availability is not inferable from application SQL or local tests. [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups).

### Vercel: production branch and rollback evidence

1. Open the existing frontend project. Under **Settings → Git**, confirm its linked repository.
2. Under **Settings → Environments → Production → Branch Tracking**, record the production branch. Do not switch it.
3. Under **Deployments**, inspect the currently promoted Production deployment and its commit/source branch. Confirm the `mcit-test-case-front.vercel.app` domain is assigned to it. The last observed successful GitHub Production record was `acdc0d9`; verify the actual current alias and deployment ID in Vercel.
4. Under **Settings → Environment Variables**, privately confirm Production-scoped `NEXT_PUBLIC_BASE_URL` equals `https://mcit-test-case-backend.onrender.com`, `AUTH_SECRET` is set, and `DATABASE_URL` targets the same application database. Do not reveal secret values or edit/redeploy during inspection.
5. Confirm the previous good Production deployment remains eligible for rollback; do not activate rollback now. Return the branch, current/rollback commit or deployment IDs, and non-sensitive configuration confirmations.

Official references: [Vercel production branch](https://vercel.com/docs/git), [Vercel rollback](https://vercel.com/docs/cli/rollback).

## Approved release execution gates

Do not ask for final deployment approval until provider checks and database baseline/recovery evidence are complete. The approval must identify the new backend security follow-up SHA (base `61299a07`) and frontend `9c6d4f9`, exact service/projects, migration and any explicitly requested environment changes.

1. Preserve a verified recovery point and the existing-row baseline. Confirm prerequisite workflow/project/cache migrations are already applied; do not bundle missing migrations into this release silently.
2. Build the approved backend revision cleanly. Run its migration check/DDL dry-run using the Render environment and reviewed artifact. Apply `20261105_test_case_imports_v1` only after migration approval. Prefer Render pre-deploy where supported; a one-off job based on the old deployed artifact is not a substitute for the reviewed artifact.
3. Deploy that backend revision, verify the current database-backed admin, trusted/untrusted CORS, existing case APIs and protected import/verification routes. If this fails, do not deploy the frontend.
4. Deploy the reviewed frontend in Production. Verify normal login, original cases, project/application filters and authorized visibility. Compare the saved original IDs/fingerprint; do not include newly imported IDs in that comparison.
5. Run only the authenticated Excel import dry-run. Present all 51 rows, actual project/user IDs, exact Page Names, 30/21 assignment, planned Cairo timeline, conflicts, `previewHash` and `canCommit`. Deployment approval does not approve the import.
6. Wait for separate explicit import approval before `--commit`. Then verify persisted definitions/source data in Supabase, the existing API, cache invalidation, and the browser. Until those succeed, do not claim the 51 cases are available.

For application rollback, restore the prior frontend first, then the prior backend using provider-supported retained deployments. Keep the additive migration/table and provenance; do not drop them or restore the database merely to roll back application code. Render rollback does not undo database changes and can affect auto-deploy settings; confirm settings afterwards. Returning to the old backend also restores its known permissive CORS behavior, so a reviewed security-only roll-forward may be preferable. [Render rollbacks](https://render.com/docs/rollbacks).

## Local verification for this follow-up

- Backend TypeScript/Nest build passes.
- 48 backend tests pass, including six CORS security tests, real PostgreSQL WASM import/RLS/deletion/transaction tests, and read-only runtime/SQL baseline validation. The real import service tests now run with the production CORS allowlist enabled.
- Thirty frontend regressions pass against the isolated reviewed frontend, including cache authorization, role/revocation checks, project workflows and scheduling. The real Desktop workbook validation also passes (79 unique relevant tests total).
- Full backend Oxlint now passes with no errors. Existing strictNullChecks configuration, unused-variable and error-stringification warnings remain. Floating-promise findings were fixed with startup rejection handling, documented fire-and-forget audit calls that catch their own errors, and explicit Node test registrations. No lint rules were disabled. The reviewed frontend and main both have the same 585 full-scan errors and 285 warnings on canonical Git source; these are pre-existing findings with no additional release diagnostics. The seven new frontend/client files pass targeted Biome checks. Broad unrelated frontend refactoring was deliberately excluded.
- The isolated production build of exact frontend commit `9c6d4f9` passes, including TypeScript and page generation. Source was exported with git archive and no production .env copied. Installed dependencies were shared via a local junction; the local multiple-lockfile warning was non-fatal. The first sandbox attempt could not download Google Fonts; rerunning the same source build with permitted network access succeeded.
- No local Supabase connection retry, production migration, production import, deployment, merge or production-branch push was performed. Validated follow-up changes are published only to the review branches with deployment-skip safeguards.
