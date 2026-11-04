# Project schedules, designated testers, notifications, and caching

## Project contract

New projects require `startAt` and `endAt`, ISO 8601 strings with an explicit UTC
offset, with start strictly before end. PostgreSQL stores both as `TIMESTAMPTZ`.
`assignedTesterId` is optional/nullable and must reference an existing user with
role `tester`. Existing projects retain null schedules and assignments. Partial
backend updates validate the merged old/new date pair; null date patches are
rejected. The existing application/module field is now saved by the authorized
backend transaction rather than a second frontend SQL update.

The create and edit dialogs use labeled native date/time controls, existing
Input/Label styles, React Hook Form/Zod validation for creation, and the shared
schedule schema for editing. Server actions also validate payloads with Zod;
Nest DTOs and the service validate independently. Tester names come from the
admin-only `GET /api/users/testers` endpoint, with search, loading, retry, and
unassigned options. No assignment is required even if tester loading fails.
Project grid/list/details display the designated tester; table/details show
schedule values. Notification links open the project's existing details modal
using `/projects?project=<id>` after the normal scoped projects read.

Inputs always represent **Africa/Cairo**, independently of the browser's timezone.
Conversion uses the runtime IANA timezone database. Winter UTC+02 and summer
UTC+03 are round-trip checked; missing spring-forward and ambiguous fall-back
wall times are rejected with bilingual guidance. The user must choose an
unambiguous time. No third-party datetime dependency was added.

### Relationship to existing team assignments

The designated tester is also a member of `project_assignments`, which remains
the source of project access. `primaryManaged` identifies memberships created
only by the designated-tester control. Changing/removing that tester removes
only those memberships; independently assigned team members remain. Removing
membership using the original assignment screen clears a matching designated
tester through a database trigger. Creation, assignment notification, schedule,
and membership changes commit atomically. Existing multi-member assignment
workflows remain available.

## Migrations and deployment order

Backend source migrations:

- `src/database/project-deadlines-migration.ts`:
  `20261104_project_deadlines_v1`; nullable project columns `startAt`, `endAt`,
  `assignedTesterId`, backward-compatible `application` column, date-pair check,
  assignment-management marker/trigger, notification `titleEn`, `messageEn`,
  `link`, due-project index, and `project_deadline_deliveries` ledger.
- `src/database/cache-revision-migration.ts`:
  `20261104_cache_revision_v1`; singleton `app_cache_revision` and transactional
  business-table invalidation triggers.

Each migration uses a transaction, advisory lock, and the existing
`schema_migrations` ledger. No existing row is deleted or fabricated a schedule.
The existing workflow migration must already have run. Backend startup applies
these migrations after schema/workflow initialization. **Deploy the backend and
its migrations before the frontend**, which requires the revision table for
fresh authorization checks.

To apply explicitly after building the backend, provide `DATABASE_URL` securely
for the intended target and run from `backend/`:

```powershell
npm run build
npm run migrate:project-deadlines -- --dry-run
npm run migrate:project-deadlines -- --apply
```

The CLI never loads a tracked `.env`. Dry-run rolls each migration back. Take a
database backup and verify on staging before production rollout. There is no
destructive down migration; retain delivery history and migration ledgers during
application rollback. Production/shared data was not migrated during this task.

## Backend deadline worker

`ProjectDeadlinesService` uses Nest lifecycle hooks to scan at application startup
and every 30 seconds, with no new scheduling dependency. It runs without browsers.
An always-running backend process is required; a sleeping host delivers missed
deadlines on its next startup/wake scan. Each scan processes up to 200 projects;
larger backlogs drain in subsequent scans.

Only active projects with an end time at or before PostgreSQL `NOW()`, a designated
tester, and matching membership qualify. Unassigned/future/archived/completed/
cancelled projects do not notify. An already-expired project is accepted and
notified on the next scan. A changed deadline or newly designated recipient gets
one delivery for that new `(projectId, endAt, userId)` tuple. Restoring an old
deadline/recipient tuple does not send it again.

A single PostgreSQL statement locks due project rows using `FOR UPDATE SKIP
LOCKED`, inserts the unique delivery tuple with `ON CONFLICT DO NOTHING`, and
inserts the bilingual unread notification. Failure rolls back both inserts.
This prevents duplicate delivery across restarts and concurrent backend workers.
The database clock supplies the authoritative UTC comparison. Edits lock project
rows, serializing schedule changes with delivery.

After persistence, notifications emit through the existing recipient-filtered SSE
service on that backend instance. The existing **fresh five-second UI polling**
also picks up deliveries made by other instances, missed events, and restarts.
Unread counts/read operations remain recipient-scoped. Arabic is stored in the
existing title/message fields; English uses the new optional fields, with legacy
notifications retaining their original text. Errors log and retry next scan;
local overlapping scans are suppressed and the interval is cleared on shutdown.

## Application-wide cache policy

The installed Next.js 16.3.6 guides were reviewed: `fetch.md`,
`unstable_cache.md`, and `updateTag.md`. This project retains the supported
non-Cache-Components mode; it does not turn on Cache Components or mix their
route restrictions into the current application. `unstable_cache` is wrapped
for existing SQL reads; migrating the entire app to `use cache` is separate work.

All server-side API integrations use `src/lib/app-fetch.ts`:

- Cacheable authenticated GETs explicitly use **`cache: "force-cache"`**,
  a 60-second revalidation interval, existing resource tags, and a scope header
  containing current user ID, current role, and database revision. Authorization
  headers also form part of Next's cache key.
- Before any persistent cache lookup, `getCurrentUserSession` freshly reads the
  user/role, token cutoff, device revocation state, and database revision. Session
  information itself is never persistently cached. Failed checks fail closed.
- `scoped-cache.ts` keys expensive SQL reads by the same identity/role/revision
  plus their explicit arguments. Cookie/session reads happen outside the cache.
- Projects, assignments, users, test cases, releases, cycles, cycle items,
  executions, quality applications, and quality checklists bump the shared
  revision in their write transaction. This covers backend APIs, direct frontend
  SQL, multiple frontend instances, and permission changes. Rollbacks do not bump
  the committed revision. This deliberately favors correctness over fine-grained
  cache reuse: a business write invalidates more data than strictly necessary.
- Existing successful mutations use `updateTag`/`revalidatePath` for immediate
  read-your-own-writes; project mutations also invalidate notification tags.
  Quality HTTP mutations use `revalidateTag(tag, { expire: 0 })`, supported from
  Route Handlers, plus `revalidatePath`. Revision changes provide cross-instance
  invalidation even where a local tag cache is not shared.
- Removed blanket `fetchCache="force-cache"` and unsupported custom
  `unstable_dynamicStaleTime` exports from routes. Dynamic router stale time is
  zero; static assets retain normal framework caching. Pages remain dynamically
  authenticated while eligible data reads are cached.

### Every application route audited

| Route | Data/cache policy |
| --- | --- |
| `/` | Redirect only; no data cache |
| `/login` | Authentication POST and warmup are no-store; no cached session |
| `/forgot-password`, `/forget-password` | Recovery form; sensitive auth requests no-store |
| `/dashboard` | Scoped cached projects/cases/users; execution metrics cached through authenticated workflow GETs |
| `/projects` | Scoped cached project list, applications, tester directory; create/edit/delete no-store; tags/paths/revision invalidation |
| `/add` | Scoped cached projects and next-ID lookup; create no-store; uniqueness enforced by database |
| `/test-cases` | Scoped cached lists/details; writes no-store; tags/paths/revision invalidation |
| `/test-cases/[id]/history` | Scoped authenticated execution-history GETs; execution writes invalidate revision/tags |
| `/test-cases/email` | Scoped cached failed-case source data; composing/exporting/desktop integration is not cached |
| `/test-cycles` | Scoped authenticated releases/cycles GETs; mutations no-store |
| `/test-cycles/[id]` | Scoped authenticated items/executions GETs; mutations no-store; backend checks assignment/lifecycle |
| `/quality` | Authenticated scoped SQL cache with category/search arguments |
| `/quality/[id]` | Authenticated scoped SQL cache with application ID; writes invalidate quality caches |
| `/assign-projects` | Scoped cached admin directory/projects; assignment writes no-store |
| `/users/assign-projects` | Redirect alias; no independent data fetch |
| `/users` | Live admin guard before scoped cached user directory; mutations no-store |
| `/users/add` | User creation no-store; invalidates users/projects/dashboard data |
| `/devices` | Live admin-guarded audit/session SQL reads; no persistent cache |
| `/change-password` | Sensitive authentication mutation no-store |
| `/reset-codes` | Existing client-local/demo recovery display; no server data fetch/cache added |
| `/api/auth/[...nextauth]` | Auth.js session/auth processing remains fresh and private |
| `/api/quality` | Fresh cookie authorization; GET uses guarded scoped SQL cache; admin POST no-store/private HTTP response |
| `/api/quality/[id]` | Fresh authorization and scoped SQL GET; admin PATCH/DELETE with tag/path/revision invalidation |
| `/api/quality/[id]/checklist` | Authenticated POST; trusted actor from session, no caching; tag/path/revision invalidation |
| `/api/users/notifications/stream` | No-store SSE proxy; no-cache/no-transform streaming response |
| `/api/warmup` | Operational health/connection warmup no-store |
| `/api/open-default-apps`, `/api/open-outlook-classic` | Side-effecting POST integrations, never data-cached |
| `not-found`, loading components, layouts | No independent cached data; root cookie language remains request-specific |
| Icons and `public/` assets | Normal Next/browser static-asset caching; not authenticated fetch data |

### Request/function exceptions and alternatives

| Integration | Reason force caching is unsafe or incompatible | Alternative |
| --- | --- | --- |
| Auth config, login services, password/profile actions, `/api/auth/*` | Credentials/session/revocation must be current | Explicit no-store |
| Navbar notification GETs and read mutations | Worker writes occur without frontend invalidation; unread state changes rapidly | No-store plus SSE and five-second polling |
| Navbar profile/session GET | Private current identity and security state | No-store |
| `users/sessions.action.ts` | Revocations and last-seen data must be current | Fresh SQL and server admin guard |
| `devices/audit-logs.action.ts` | Security events must be current and restricted | Fresh SQL and server admin guard |
| `exportProjectReport.action.ts` | Personalized generated document/report with live permission checks | Existing fresh authorized SQL; do not cache generated report output |
| `xlsxTemplateBuilder.ts`, export modal and email composer | Client-side generation/composition, not server fetch data | Generate per request from authorized source data |
| `device-telemetry.ts` external IP lookup | Device-specific, rapidly changing third-party response | Browser no-store |
| Warmup/health requests | Caching defeats health/wakeup behavior | No-store |
| SSE | Streaming responses cannot be used as shared snapshots | No-store, no-cache/no-transform |
| All POST/PATCH/PUT/DELETE requests | Side effects must execute on every submission | `appFetch` strips cache tags/options and forces no-store, including computed workflow methods |

Raw server `fetch` remains only in the policy helper, Auth.js credential POST,
warmup, and SSE proxy. Browser fetches remain for warmup, telemetry, and the two
desktop POST integrations. All server-action API reads/mutations were audited
and routed through the common policy. Direct SQL reads were reviewed: reusable
business reads use scoped caching; audit/session/export reads stay live.

## Verification

Frontend: `npm run test:projects` runs Node tests for Cairo conversion, winter/
summer offsets, DST gaps/ambiguity, nullable assignment and invalid schedules,
Arabic/English accessible field rendering, fetch policy, revision/user isolation,
SQL cache scoping, and live role/revocation checks. Cache storage is mocked for
these policy tests; the Next production build validates actual integration.

Backend: build then `npm run test:projects` and `npm run test:workflow`. Tests use
the existing isolated PGlite PostgreSQL tooling under `.qa-test-tools/`, never
application credentials. Coverage includes migration dry-run/idempotency,
legacy preservation, HTTP validation/authorization, optional/assigned creation,
UTC round trips, merged-date edits, removal/reassignment, original membership
workflow, overdue/unassigned/future/closed projects, duplicate scans/restarts,
recipient-only read/SSE, notification failure rollback/retry, revision changes,
and worker lifecycle/error handling. Existing execution-workflow tests are retained.

Install the existing optional isolated test engine on a fresh checkout with
`npm install --prefix .qa-test-tools --no-save @electric-sql/pglite` from the
frontend root; no production dependency was added.

Both applications are typechecked and built. Repository-wide lint reports existing
format/style errors in the frontend and existing floating-promise errors in
backend startup/workflow tests; focused checks for new modules are run separately.
No live production migration or authenticated browser end-to-end run is claimed.

## Changed-file inventory

Frontend repository:

- `.gitignore`
- `authjsConfig/authjsConfig.ts`
- `docs/project-deadlines-and-caching.md`
- `next.config.ts`
- `package.json`
- `src/app/(dashboard)/add/page.tsx`
- `src/app/(dashboard)/add/test-case.action.ts`
- `src/app/(dashboard)/assign-projects/assign.action.ts`
- `src/app/(dashboard)/assign-projects/page.tsx`
- `src/app/(dashboard)/change-password/changepassword.action.ts`
- `src/app/(dashboard)/change-password/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/devices/audit-logs.action.ts`
- `src/app/(dashboard)/devices/page.tsx`
- `src/app/(dashboard)/projects/ProjectScheduleFields.tsx`
- `src/app/(dashboard)/projects/ProjectsForm.tsx`
- `src/app/(dashboard)/projects/add-project.interface.ts`
- `src/app/(dashboard)/projects/addprodject.action.ts`
- `src/app/(dashboard)/projects/deleteProject.action.ts`
- `src/app/(dashboard)/projects/eligible-testers.action.ts`
- `src/app/(dashboard)/projects/getAllUsers.action.ts`
- `src/app/(dashboard)/projects/getProjects.action.ts`
- `src/app/(dashboard)/projects/page.tsx`
- `src/app/(dashboard)/projects/project-schedule.zod.ts`
- `src/app/(dashboard)/projects/updateProject.action.ts`
- `src/app/(dashboard)/quality/[id]/page.tsx`
- `src/app/(dashboard)/quality/page.tsx`
- `src/app/(dashboard)/quality/quality.action.ts`
- `src/app/(dashboard)/reset-codes/page.tsx`
- `src/app/(dashboard)/test-cases/[id]/history/page.tsx`
- `src/app/(dashboard)/test-cases/email/page.tsx`
- `src/app/(dashboard)/test-cases/page.tsx`
- `src/app/(dashboard)/test-cases/test-cases.action.ts`
- `src/app/(dashboard)/test-cycles/[id]/page.tsx`
- `src/app/(dashboard)/test-cycles/page.tsx`
- `src/app/(dashboard)/test-cycles/workflow.action.ts`
- `src/app/(dashboard)/users/add/add.action.ts`
- `src/app/(dashboard)/users/add/page.tsx`
- `src/app/(dashboard)/users/assign-projects/page.tsx`
- `src/app/(dashboard)/users/page.tsx`
- `src/app/(dashboard)/users/sessions.action.ts`
- `src/app/(dashboard)/users/user.action.ts`
- `src/app/api/quality/[id]/checklist/route.ts`
- `src/app/api/quality/[id]/route.ts`
- `src/app/api/quality/route.ts`
- `src/app/api/users/notifications/stream/route.ts`
- `src/app/forget-password/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/layout.tsx`
- `src/app/login/login.services.ts`
- `src/app/login/page.tsx`
- `src/app/myUtil.ts`
- `src/app/page.tsx`
- `src/components/Navbar/Navbar.tsx`
- `src/components/Navbar/navbar.action.ts`
- `src/components/Navbar/notifications.action.ts`
- `src/components/Sidebar/sidebar.action.ts`
- `src/lib/app-fetch.ts`
- `src/lib/device-telemetry.ts`
- `src/lib/fast-read.ts`
- `src/lib/private-response.ts`
- `src/lib/project-time.ts`
- `src/lib/scoped-cache.ts`
- `test/project-cache.test.cjs`

Backend repository:

- `PROJECT_DEADLINES.md`
- `package.json`
- `scripts/migrate-project-deadlines.cjs`
- `src/database/cache-revision-migration.ts`
- `src/database/database.service.ts`
- `src/database/project-deadlines-migration.ts`
- `src/projects/dto/project.dto.ts`
- `src/projects/project-deadlines.service.ts`
- `src/projects/projects.module.ts`
- `src/projects/projects.service.ts`
- `src/users/users.controller.ts`
- `src/users/users.module.ts`
- `src/users/users.service.ts`
- `test/project-deadlines.integration.cjs`

Final verification: **7 frontend tests and 24 backend integration tests passed**; both production builds and TypeScript checks passed. New-module focused lint checks passed; a before/after lint comparison found no increase in error counts on modified existing frontend files. Full-repository lint retains baseline failures. The frontend Git link to the backend is updated to the paired backend commit.
