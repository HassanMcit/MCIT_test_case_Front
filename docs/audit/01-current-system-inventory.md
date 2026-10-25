# Phase 1: current-system inventory

Source revisions and verification boundaries are recorded in `00-security-audit.md`. Paths below are relative to the frontend checkout; backend source is in its separate `backend/` Git repository. Features are verified in code, not certified as working in production.

## Architecture and dependencies

- Frontend: Next.js 16.3.6 App Router, React 19.2.8, TypeScript, Tailwind 4, shadcn/Base UI components, lucide icons, React Hook Form, Zod 4, React Hot Toast, NextAuth 5 beta, `pg`, and SheetJS `xlsx`.
- Backend: NestJS 12 modules/controllers/services, Passport JWT, bcryptjs, class-validator/class-transformer, Swagger, and `pg.Pool`.
- Active persistence is PostgreSQL with handwritten SQL. `DatabaseService.onModuleInit` connects, creates/alters tables, and seeds the default admin. There are no active ORM entities or Prisma migrations in `backend/src`; package seed metadata, comments, Docker database settings, and a committed SQLite file are stale/conflicting artifacts.
- Core path: browser -> Next pages/client components -> server actions -> authenticated Nest REST -> PostgreSQL.
- Parallel persistence path: Next quality route handlers/server actions and NextAuth callbacks -> a separate frontend PostgreSQL pool -> the same table names. This bypasses Nest guards/interceptors and duplicates business logic.
- Common shell: `src/app/(dashboard)/layout.tsx`, `MySession`, Navbar, Sidebar, language context. Existing design uses white cards, pale blue background, navy text, cyan/teal actions, rounded controls, responsive sidebar, and Arabic/English RTL/LTR support. Preserve these patterns.
- Reads frequently use `force-cache`; mutations invalidate multiple tags and paths. Read failures often become empty arrays/zero metrics, hiding authorization/network/backend errors.

## Feature map

| Feature | Frontend pages/components/actions | Backend ownership/models | Verified behavior and permission dependencies |
| --- | --- | --- | --- |
| Login/session | `/login`, `login-form.tsx`, `authjsConfig/authjsConfig.ts`, `/api/auth/[...nextauth]`, `myUtil.ts`, `proxy.ts`, `MySession` | Auth module/controller/service, JwtStrategy; `users`, `user_login_sessions` | Credentials login obtains seven-day backend JWT; NextAuth stores it in encrypted session token. Proxy checks token age/expiry; frontend polls session every 3 seconds. Backend re-reads role and applies revocation checks. |
| Password recovery/change | `/forget-password`, `/forgot-password`, `forget-password-form.tsx`, `/change-password` actions/Zod | Auth; `password_resets`, `users` | Generate 15-minute code, verify, reset; authenticated old/new-password change. Recovery currently returns/logs code rather than proving delivery. |
| Users/testers | `/users`, `/users/add`, `LoginSessionsSection`, user/add/session actions; Navbar profile actions | Users module/controller/service; `users`, assignments, test cases | Admin create/list/update/delete non-admin users; optional employee ID aliases; user cards show assigned projects and case counts. Own name/photo editing. Public basic directory. Teams chat/call links. |
| Assignment | `/assign-projects`; `/users/assign-projects` redirects there | Users; `project_assignments`, `notifications` | Admin assigns/unassigns project; assignment creates notification and emits in-process SSE event. Unique user/project pair. |
| Projects | `/projects`, `ProjectsForm.tsx`, create/read/update/delete actions | Projects module/controller/service; `projects`, assignments, test cases | Admin CRUD; tester list defaults to assigned projects; detail checks membership. Filters environment/status/search/assignment. Cards include users, total/passed/failed/pending/success rate; detail API includes five recent cases. Delete disallows assigned users, then detaches test cases. |
| Test definitions/results | `/add`, `TestCaseForm.tsx`, `/test-cases`, `TestCasesTable.tsx`, server actions and shared Zod | TestCases module/controller/service; `test_cases`, users/projects | Create/edit/view/delete, dynamic string steps, project/module, preconditions, expected/actual result, tester, updater, timestamp, notes, priority/status/severity. Definition and execution occupy one mutable row. Scoped list but object operations lack equivalent access checks. |
| Dashboard/analytics | `/dashboard`, `DashboardClient.tsx`, dashboard actions; Sidebar KPI action | Dashboard module/controller/service; cases, projects, assignments | Overall counts, pass rate, daily chart, severity breakdown, project/user summaries and frontend filters. Admin global vs assigned-project tester views. All execution statistics are derived from current case rows. |
| Search/filter/pagination | TestCasesTable, ProjectsForm, Users page, quality clients, AuditLogsTable | Query handling in cases/projects/audit services | Case backend supports page/limit/status/priority/module/project/search. UI loads 100 cases and filters locally; no true page-navigation workflow across all results. Users filter locally by name/email/role. Quality filters category/search. Audit list paginated. |
| CSV/Excel | TestCasesTable CSV; `quality/QualityClient.tsx` CSV and dynamic `xlsx` export | No import/export controller/module | Cases export only loaded, locally filtered records, with BOM and bilingual headers. Quality exports an XLSX `QA Report` sheet from a predefined application matrix merged with matched live values, plus CSV. No file parser/upload/import workflow found in `src` or `backend/src`. |
| Bug communication | `/test-cases/email`, `EmailComposer.tsx`, `/api/open-outlook-classic`, `/api/open-default-apps`, `lib/teams.ts` | Cases are fetched via TestCases; custom audit events | Failed-case selection, bilingual text/HTML report and preview, email/client integration and Teams links. `BUG-` is a case ID/display convention, not a defect entity or lifecycle. Failed-case fetch capped at 100. |
| Quality portfolio | `/quality`, `/quality/[id]`, QualityClient, AppDetailClient, quality actions, `/api/quality/*` | Table creation in DatabaseService, business logic in Next; `quality_applications`, `quality_checklists` | Register/edit/delete apps, search/category, availability/function checklist, score/status, last ten assessment records, CSV/XLSX. Apps are separate from projects; no project FK. Some headline/export values are defaults or fixed examples. |
| Notifications | Navbar actions/UI, `/api/users/notifications/stream` proxy | Users; notifications and RxJS Subject | Fetch latest 30 and unread count, mark one/all read, assignment SSE with heartbeat. Events are process-local, so multi-instance delivery is not durable. |
| Audit/devices | `/devices`, AuditLogsTable, LoginSessionsSection, audit/session actions | AuditLogs module/controller/service/interceptor; audit/session tables | Admin audit search/category/user/pagination; session list and revoke one/all, with ownership rules for non-admins. UI restricts devices to a named primary admin, while API authorizes all admins. `/devices` omitted from proxy matcher. |
| Reset-code screen | `/reset-codes` | No connected reset-management API | Client sample records, countdown/copy/local mark-used. `previewAsAdmin` defaults true. This is a mock UI, not actual password-reset administration; `lead_qa` here is sample data. |

## API inventory

Nest endpoints have `/api` prefix and global JWT authentication unless noted. Frontend Next endpoints are listed separately because Nest's guard does not cover them.

| Owner | Methods and paths | Current enforcement |
| --- | --- | --- |
| Auth | `POST /auth/login`, `/auth/forgot-password`, `/auth/verify-reset-code`, `/auth/reset-password` | Public |
| Auth | `GET /auth/me`; `POST /auth/change-password`, `/auth/logout` | Authenticated |
| Auth | `GET /auth/sessions`; `POST /auth/sessions/:sessionId/revoke`, `/auth/sessions/revoke-all` | Admin all; others own sessions; inline revoke-all body has no DTO class |
| Users | `POST /users`; `GET /users`; `PATCH /users/:id`; `DELETE /users/:id` | Admin; cannot delete admin target |
| Users | `GET /users/all`, `/users/:id/photo` | Public |
| Users | `GET /users/:id`, `/users/profile`, `/users/my-assigned-projects`, `/users/profile/photo` | Authenticated; arbitrary user detail has no membership policy |
| Users | `PATCH` or `POST /users/profile`; `POST`, `PATCH`, or `PUT /users/profile/photo` | Authenticated, own profile |
| Users | `POST /users/:id/assign-project`; `DELETE /users/:id/assign-project/:projectId` | Admin |
| Users | `GET /users/notifications`, `/users/notifications/stream` (SSE); `PATCH /users/notifications/read-all`, `/users/notifications/:id/read` | Current user; strategy also accepts query token |
| Projects | `POST /projects`; `PATCH`, `DELETE /projects/:id` | Admin |
| Projects | `GET /projects`, `/projects/:id` | Assigned list/detail for non-admin, with assignment-filter bypass described in audit |
| TestCases | `POST`, `GET /test-cases`; `GET /test-cases/next-id`; `GET`, `PATCH`, `DELETE /test-cases/:id` | Authenticated; list scoped, object access unscoped |
| Dashboard | `GET /dashboard/stats`, `/dashboard/chart`, `/dashboard/severity` | Authenticated; current-user project scope in service |
| AuditLogs | `GET /audit-logs`; `POST /audit-logs/log` | Admin read; authenticated client-event write |
| Swagger | `/api/docs` | Unconditionally mounted middleware |
| Next Auth | `GET`, `POST /api/auth/[...nextauth]` | NextAuth handlers |
| Next quality | `GET`, `POST /api/quality`; `GET`, `PATCH`, `DELETE /api/quality/:id`; `POST /api/quality/:id/checklist` | No handler authentication/authorization |
| Next integration | `POST /api/open-outlook-classic`, `/api/open-default-apps` | No handler authentication |
| Next notifications | `GET /api/users/notifications/stream` | Relays supplied query JWT; upstream validates it |

## Database model inventory

Schema source: `backend/src/database/database.service.ts`, `initTables`; this is the schema declared by code, not a verified dump of deployed schema. Existing tables are not fully reconciled by `CREATE TABLE IF NOT EXISTS`.

| Table | Fields and relationships |
| --- | --- |
| `users` | SERIAL id; name, unique email, bcrypt password, role (TEXT default tester), photo/profileImage, createdAt/updatedAt; minTokenIat added by ALTER. IDs can also be supplied employee numbers. |
| `projects` | SERIAL id; name, description, environment (staging), status (active), timestamps. Name is not unique. |
| `test_cases` | SERIAL id; testId, module, pageName, scenario, preConditions, steps as JSON-encoded TEXT, expectedResult, actualResult, priority, status, severity, notes, executedAt, testerId, updatedById, projectId, timestamps. User/project FKs use SET NULL. Unique index on `(COALESCE(projectId,0), testId)`. |
| `project_assignments` | id; userId/projectId FKs with CASCADE, assignedAt, unique user/project. |
| `password_resets` | id; email, plaintext code, expiresAt, integer used flag, createdAt; no user FK. |
| `notifications` | id; userId FK CASCADE, title, message, projectId without FK, read flag, createdAt. |
| `user_login_sessions` | id; unique sessionId, userId FK CASCADE, identity/telemetry snapshots, isActive, createdAt/lastSeenAt/revokedAt. |
| `audit_logs` | id; nullable userId FK SET NULL, identity/role snapshots, action/category/description, method/endpoint, telemetry, status, createdAt; indexes on user/time. |
| `quality_applications` | id; name/nameAr/category/url/environment/version/status, passRate, suitesCount, bugsCount, lastCheck, defaultFunctions JSONB, timestamps; no project/release relationship. |
| `quality_checklists` | id; appId FK CASCADE, testerId FK SET NULL, testerName, availability flag, functionsResults JSONB, counts/score/notes, createdAt. |

No release, requirement, cycle, run, test-case revision, execution, defect, or defect-execution link table/module exists in active source.

## Roles and workflow

Supported account creation roles are `admin`, `tester`, `user`; most policies distinguish only admin versus non-admin. No enforced QA lead/manager role exists. `lead_qa` on the reset preview does not establish one. Role columns are unconstrained TEXT. UI navigation hiding and identity-specific restrictions differ from backend policy.

Current core workflow:

1. Admin creates users/projects and assigns users to projects.
2. Tester chooses project, fills definition and result together, picks priority/status, optionally severity and execution metadata.
3. Frontend derives an ID from up to 100 fetched cases; backend separately scans suffixes and may replace a duplicate with its generated next ID. UI changes `TC-`/`BUG-` prefix with result status.
4. Save writes one case row; frontend always supplies a current execution timestamp, including pending cases. A later edit replaces results on that row, not an execution event.
5. Table, project cards, dashboard, user summaries, CSV and bug email all read that mutable row. Historical outcomes cannot be reconstructed from those records; audit logs contain descriptions, not complete execution snapshots.
6. Quality assessments follow a separate app/checklist workflow with limited historical display. They are not linked to the core test cases/projects.

## Validation and architectural debt

- Frontend status schema accepts pending/passed/failed/skipped/blocked; backend DTO accepts only pending/passed/failed. Analytics inconsistently groups other values as pending versus exact pending matches.
- Frontend scenario requires one character, backend five. Frontend requires pageName, backend makes it optional. Backend module allows 2–200 characters, but actions silently trim to 50. Backend permits empty steps arrays/expected-result strings; frontend attempts stronger required checks.
- Pagination, days, project filters, and several inline/intersection request bodies lack concrete query/body DTOs and bounded validation. Date regex checks shape rather than valid calendar dates. FK errors/unique races are not consistently translated to stable API errors.
- Module/project-name matching is a legacy fallback in scope/count queries. Duplicate or renamed project names can misattribute orphan cases; detail/list/user/dashboard queries apply different fallback rules. Backfill only reviewed unambiguous relationships.
- ID generation is duplicated and read-then-write, so concurrent creation can collide. Backend uniqueness is project/null-project based while some generators check module; retries are not a substitute for atomic allocation.
- Users/project aggregate queries use N+1 lookups. Dashboard chart issues queries per day; unbounded `days` can multiply load. Missing FK/filter indexes need query-plan review on representative data.
- Dashboard actions recompute headline counts/severity from at most 500 fetched cases whenever any cases exist, so they can replace complete backend aggregates with truncated counts. Project totals use the maximum of backend and fetched totals while result counts may come only from the fetched subset. The chart service returns an array, while the action reads `cJson.data`; severity fallback returns `{total, breakdown:[{priority,...}]}` while frontend types expect `{totalFailed, breakdown:[{severity,...}]}`. Align these contracts before relying on release analytics.
- Frontend and backend both insert the same login sessionId, causing a duplicate-key attempt after a successful backend insert; audit login duplication also exists. Errors are caught, making drift harder to see.
- Quality scores/writes/mapping are duplicated in server actions and API handlers. Assessment insert and summary update are not transactional. Quality summary includes a fixed critical-defect count; default app metrics and predefined export examples can look like measured data.
- Startup DDL/seeding is not a versioned migration system; `runMigrations` is disabled. `photo` and `profileImage`, `testerId` and `userId`, employee IDs and database IDs add alias complexity. Persisted avatar file is shared across users and default-admin startup behavior.
- Auth is split across custom cookie decoding, proxy expiry checks, NextAuth DB checks, and backend JWT checks. Cached reads can outlive role/membership changes; scope changes need immediate invalidation or uncached protected reads. Cache URL user parameters are not an authorization boundary; backend currently prefers `req.user`.
- TestCasesTable and EmailComposer are large components combining display, editing, reporting, and integrations. Extract coherent pieces incrementally while preserving interaction behavior and tokens.
- Backend's only discovered test is a starter e2e that expects a removed route and initializes the real configured database. There are no discovered unit permission/history/import tests. See baseline typecheck results in Phase 0.

The upgrade plan must preserve existing bilingual forms, case content/IDs, project assignment notifications, scoped metrics, profile/session management, exports, email templates and responsive shell while correcting these contracts deliberately.
