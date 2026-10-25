# Test execution milestone

## Delivered

The existing Next.js/NestJS/PostgreSQL application now supports project releases, test cycles, assigned cycle items, append-only execution attempts, definition snapshots, execution history, and scoped execution analytics. Existing pages, bilingual styling, users, projects, test-case records, quality portfolio, and CSV/XLSX integrations remain in place. No Bugs, Requirements, Traceability, or AI modules were added.

Entry points:

- Sidebar: **Releases & Test Cycles** (`/test-cycles`). Project cards link directly to their cycles.
- Admin: select a project; create a release; create a cycle for that release; add existing cases; assign project members; activate the cycle.
- Tester: open an assigned active cycle, open a case, inspect its saved definition, enter actual result/notes/environment/optional duration, and use PASS/FAIL/BLOCKED/SKIP or save a Not Run reset. Each save is another attempt.
- Case table and failed-case details link to `/test-cases/:id/history`, with paginated attempts and the definition used for each attempt.
- Dashboard: execution overview with project/release/cycle/tester filters, latest cycle-item outcomes, all-attempt count, release progress, and active-cycle progress. Existing dashboard functionality is retained.

## Data model and migration

Migration ID: `20261025_execution_workflow_v1` in `backend/src/database/workflow-migration.ts`.

Added tables:

| Table | Purpose |
| --- | --- |
| `schema_migrations` | Transactional migration ledger |
| `releases` | Project-owned versions, descriptions, planning/active/testing/released/archived status, start/target release dates, actor/timestamps |
| `test_cycles` | Project/release testing phase with planning/active/completed/archived status and start/end dates |
| `test_cycle_items` | Existing case selected for a cycle, assigned tester, immutable definition snapshot |
| `test_executions` | Individual attempt, actual actor/name, result, actual result, notes, environment, time, optional duration, source/provenance and definition snapshot |

Relationships: Project -> Release -> Cycle -> Cycle Item -> Execution. The cycle item also references the original Test Case. Composite foreign keys prevent mismatched cycle/project and execution/item identities. Releases have project-scoped, case-insensitive version uniqueness. Foreign keys restrict deletion of history-bearing cases/projects/releases/cycles. No deletion endpoint for executions is exposed.

`test_cases_current` is a compatibility view. Existing case lists, project/user summaries, dashboard reads, bug-email data and CSV exports read the latest attempt from that view while continuing to expose their existing response shapes. A Not Run execution maps to the legacy `pending` wire value in that view; new execution APIs use `not_run` explicitly.

The migration:

1. Opens one database transaction and acquires an advisory migration lock.
2. Creates the new tables, constraints/indexes and compatibility view.
3. Copies one historical execution per existing case that has a passed/failed/blocked/skipped outcome or nonempty actual result. Source is `legacy`; a unique `sourceKey` records its original case ID.
4. Preserves original case rows, fields, IDs, tester and execution data unchanged. No release/cycle is fabricated for old results. Pending rows with only a generated timestamp are not treated as completed executions. Rows with an actual result but no completed status become provenance-marked Not Run records.
5. Records the migration only on success. Errors roll back the migration; subsequent runs skip the already-applied version instead of duplicating historical attempts.

The previous schema uses TIMESTAMP without a time zone for `executedAt`; historical values are interpreted as UTC, consistent with the application's ISO-UTC writes. The raw original timestamp remains in the legacy snapshot. Check this assumption against historical manual imports before production rollout. Already-overwritten historical results cannot be reconstructed.

New cycle execution does not update `test_cases.status`, `actualResult`, `executedAt`, or result notes. The original combined case form remains a compatibility path: result edits append a `compatibility` execution; definition-only edits do not append an attempt. Actor identity is taken from authentication. New definitions store a pending/null result baseline, with any initial completed result saved separately as an execution.

Case changes after cycle enrollment do not change that cycle's snapshot; a later cycle captures the revised definition. Multiple retests in a cycle remain separate records. Reassignment changes planned work, not previous execution actors.

## Apply and rollback

The backend currently initializes its schema at startup. The workflow migration is integrated immediately after existing table initialization and before existing seeding. **Starting this updated backend against an unmigrated database applies the migration.** No configured/shared/production database was started or migrated during development; verification used an isolated temporary PostgreSQL engine.

Before deployment, take and verify a PostgreSQL backup, restore a sanitized staging copy, and review orphan project links and timezone assumptions. The migration deliberately does not infer project ownership from module/project-name text: cases without `projectId` remain preserved but must be explicitly associated with a project before cycle selection. Do not guess associations for duplicate project names.

To explicitly inspect/apply against an existing application database, set `DATABASE_URL` securely for the intended database, build the backend, then run from `backend/`:

```powershell
npm run build
npm run migrate:workflow -- --dry-run
npm run migrate:workflow -- --apply
```

The CLI requires an explicit environment variable; it does not load the tracked backend `.env`. Dry-run executes the migration transaction and rolls it back, returning execution source counts. It assumes existing application tables are present. First-time empty databases can use the normal backend initialization path. Apply the backend before deploying frontend callers of the new endpoints.

There is deliberately no destructive down migration. Roll back application versions only with a reviewed compatibility plan; retain execution tables/history and the ledger. An older backend would resume writing legacy result columns, so do not run old/new writers concurrently or assume an old release will display new attempts. Restore only from a verified backup when appropriate, preserving post-backup attempts separately.

## API inventory

All endpoints below have the existing `/api` prefix and global JWT guard.

| Method | Path | Permission |
| --- | --- | --- |
| GET, POST | `/projects/:projectId/releases` | Admin/assigned member read; admin create |
| GET, PATCH | `/projects/:projectId/releases/:id` | Admin/assigned member read; admin edit/archive |
| GET, POST | `/test-cycles` | Scoped read; admin create |
| GET, PATCH | `/test-cycles/:id` | Project member read; admin edit/activate/complete/archive |
| GET | `/test-cycles/:id/candidates` | Admin; paginated project cases not already in cycle |
| GET, POST | `/test-cycles/:id/items` | Project member read; admin adds case snapshots/assignments |
| PATCH | `/test-cycles/:id/items/:itemId` | Admin assigns/reassigns project members |
| POST | `/test-cycles/:id/items/:itemId/executions` | Admin or assigned tester; active cycle and writable project/release required |
| GET | `/test-cases/:id/executions` | Authorized case/project reader; paginated complete attempt history |
| GET | `/dashboard/executions` | Scoped execution statistics and release/cycle progress |

Lists use the existing `{data,meta}` convention. Concrete query DTOs bound page/limit (1–100), positive IDs and search length. Input DTOs validate dates, statuses, text lengths, array size and duration; services validate merged date ranges, ownership, lifecycle, project membership and uniqueness. Batch enrollment is atomic: a wrong-project case, invalid tester or duplicate rolls back the entire request.

Modified existing behavior:

- Case GET/PATCH/DELETE enforce resource-level authorization; destination project is checked when moving a case.
- Legacy case POST/PATCH append execution history for result writes; they no longer replace stored execution results.
- Cases with history/cycle membership cannot move projects or be deleted. Project deletion rejects release/execution dependencies; archive the project instead.
- Project assignment filters cannot substitute another user's scope for a non-admin caller.
- Case status validation now consistently accepts blocked/skipped in addition to pending/passed/failed.
- Case/project/user/dashboard readers use the compatibility view. New workflow reads are uncached authenticated requests; mutations invalidate existing data tags and affected routes.
- Backend TypeScript configuration includes Vitest global declarations to fix the existing full-project typecheck errors.

No new QA Lead role was invented: current supported roles remain unchanged. Admins manage; assigned project members read; only the assigned tester or admin can record cycle attempts. Released/archived releases and completed/archived cycles are read-only. Multiple active releases are supported for parallel/hotfix work.

## Metric definitions

- Total Executions: all recorded outcomes except Not Run reset records, including legacy/compatibility attempts when no release/cycle filter excludes them. Blocked/skipped are counted as attempted outcomes, not successful completions.
- Outcome counts/progress: latest attempt per cycle item, including zero-attempt Not Run items. Retests do not double-count planned cases. `executed = total - notRun`; skipped/blocked count as processed items.
- Pass Rate: passed/(passed+failed), with the denominator displayed. Legacy dashboard's original passed/all-case summary remains separately available.
- Dashboard tester filter: latest actor for executed cycle items, falling back to assigned tester for unexecuted items; all-attempt totals filter the actual historical actor. Cycle table tester filter represents current assignment.
- Release progress combines its cycle items, so the same test in two cycles represents two planned checks. Legacy records without release/cycle are included in all-attempt history, not invented cycle progress.
- Progress cards show a bounded selection of recent/active contexts (six cards; backend cycle-card list up to 100), while summary totals and release aggregates are calculated across all matching records.

## Verification

`backend/test/workflow.integration.cjs` runs against PGlite, a temporary real PostgreSQL WASM engine, with NestJS HTTP routing, global JWT guard, DTO validation and actual SQL. No application runtime dependency was added. Test tooling is installed only under ignored `.qa-test-tools/`:

```powershell
# From the frontend workspace root, once:
npm install --prefix .qa-test-tools --no-save --package-lock=false --ignore-scripts @electric-sql/pglite
# From backend:
npm run build
npm run test:workflow
```

The suite covers migration rollback/idempotency/data preservation, JWT/DTO boundaries, permissions and ID guessing, uniqueness/date validation, cross-project enrollment, batch rollback, tester assignment, append-only retests, immutable snapshots, spoofed actors, metrics/filtering, legacy form compatibility, deletion/move safeguards, closed lifecycles, cross-release history and pagination beyond 100 records. The temporary adapter matches node-postgres DATE/row-count behavior; multi-connection contention and hosting-specific PostgreSQL behavior still need staging validation.

The original starter e2e imports the real AppModule and can seed the configured database. Do not use it against a shared database as a substitute for these isolated tests.

Completed automated checks: 14 isolated PostgreSQL/Nest HTTP integration tests passed; frontend and backend full-project TypeScript checks passed; both production builds passed. A local frontend production-server smoke check returned 200 for login and redirected anonymous requests for cycle management, a cycle workspace, and case history to login. The migration CLI was also checked to refuse running without an explicitly supplied `DATABASE_URL`.

Manual staging checks still required: apply a backup-backed migration on representative data; full browser login/admin/tester flows; Arabic/English and mobile modal/table layout; keyboard/accessibility behavior; concurrent administrators/testers; production hosting SSE/session behavior; existing quality XLSX and case CSV/email exports after real data migration. Existing Phase 0 security findings are documented in `audit/00-security-audit.md`; this milestone does not claim to resolve all of them.
