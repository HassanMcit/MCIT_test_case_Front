# Phase 0: security and architecture audit

Audit date: 2026-10-25. No application code, credentials, databases, or Git history were changed. Secret values are intentionally omitted.

## Scope and evidence

- Frontend: `bc634fe01a281ed4769df63bfad69962f51237d7`.
- Backend: `b13881263b443f2365b8aaa5e8119943f6abf2d0` in `backend/`, a Git link tracked by the frontend, with its own repository.
- Both local commits match GitHub HEAD, verified with `git ls-remote`. Both working trees were clean before this report.
- Findings below come from tracked source, controller-to-service tracing, Git index/history checks, and configuration inspection. They establish vulnerable code paths, not evidence of exploitation.
- No production login, reset request, database query, upload, mutation, or exploit was attempted. The live frontend could not be retrieved through the web tool. Deployed commit IDs, database contents, hosting controls, secret validity, and actual production reachability of these paths remain unverified.
- Installed Next.js data-security and authentication guides were consulted. No framework implementation was written.

## Prioritized findings

| ID | Severity | Evidence and impact | Recommended safe fix |
| --- | --- | --- | --- |
| S01 | Critical | `src/lib/db.ts` contains a literal PostgreSQL connection URL with a password as an environment fallback. Backend `.env` is tracked and contains `DATABASE_URL` and `JWT_SECRET`. Both repositories are public. | Treat committed credentials as exposed. Plan provider-side credential rotation, update hosting secrets, verify connections, then remove literal fallbacks and fail startup when configuration is missing. Coordinate history cleanup after rotation; history cleanup alone cannot revoke credentials. |
| S02 | Critical | Public `POST /api/auth/forgot-password` returns the newly generated code in its JSON response (`backend/src/auth/auth.service.ts`, `forgotPassword`). Public reset accepts that email/code. This defeats ownership verification for registered accounts, including admins. Codes are also logged and stored in plaintext; no delivery service is implemented in this path. | Stop returning/logging codes, send via a verified delivery channel, use cryptographic randomness and hashed challenge storage, rate-limit requests/attempts, and consume challenges atomically. Use generic responses to avoid account enumeration. |
| S03 | Critical | `src/app/api/quality/route.ts`, `[id]/route.ts`, and `[id]/checklist/route.ts` query PostgreSQL without authentication/authorization. They permit portfolio reads, creation, edits, deletion, and assessment writes. The proxy matcher protects `/quality`, not `/api/quality`. An assessment can supply another tester's identity. | Authenticate every handler and enforce project/resource policy in the service. Derive tester identity from the authenticated user. Move persistence behind NestJS; temporarily close the unprotected handlers or secure them directly while migrating callers. |
| S04 | High | `UsersService.updateProfile` accepts arbitrary `photo` strings. `serveUserPhoto` uses an absolute photo path directly with `existsSync` and `res.sendFile`. `GET /api/users/:id/photo` is public. A signed-in user can set their photo to an absolute path and then request it. | Store controlled upload IDs/object keys only; reject filesystem paths. Resolve within a dedicated upload root, enforce containment and file type, and serve through an authorization-aware endpoint. Validate in isolated tests using a harmless fixture; do not probe production files. |
| S05 | High | `DatabaseService.seedInitialData` embeds a known default admin password and creates a named administrator when absent. `AuthModule` and `JwtStrategy` share a literal fallback signing secret. | Replace automatic production seeding with a deliberate bootstrap process and one-time secret. Require configured JWT secret at startup. Review existing admin credentials and coordinate rotation/revocation; seed code preserves existing passwords, so it does not prove the deployed password matches. |
| S06 | High | `TestCasesService.findAll` scopes lists, but `findOne`, `create`, `update`, and `remove` do not enforce membership. Controllers expose these to any authenticated user; delete has no admin check. Creation/update can choose project and tester IDs. `ProjectsService.findAll` lets `assignedToUserId` take precedence over current-user scoping. | Centralize resource authorization; check reads and mutations, validate destination project on moves, and restrict tester reassignment. Restrict arbitrary user assignment filtering to admin. Add negative permission tests for every endpoint. |
| S07 | High | `generateBugHtmlTemplate` interpolates stored scenario, steps, expected/actual results, and names into HTML; preview uses `dangerouslySetInnerHTML` (`EmailComposer.tsx:1569`). No escaping/sanitization is present in this flow. | Escape stored text before HTML interpolation and sanitize any intentionally editable rich HTML. Prefer an isolated preview. Add stored-XSS regression coverage using inert test fixtures. |
| S08 | High | Profile uploads have no file-size limit and trust supplied image MIME types; missing MIME is accepted. Original extensions are retained, files are publicly served, and `data:image/*` is streamed using supplied MIME. SVG/active content and resource-exhaustion risks exist. JSON/urlencoded limits are 200 MB (`main.ts`). | Set bounded upload/body limits, verify file signatures, decode/re-encode approved raster formats, reject active formats, and use safe content headers/storage. Preserve existing photos during migration. |
| S09 | Medium | JWTs last seven days. `logout` clears some cookies but does not revoke the backend session. Change/reset-password updates passwords without revoking sessions. JWT strategy accepts a missing session row or absent `sid`; frontend session checks swallow database errors. | Revoke sessions on logout/password reset, define change-password session policy, require valid sessions for new tokens, and provide an explicit transition for legacy tokens. Make revocation failures observable and avoid granting access on unresolved state. |
| S10 | Medium | `getClientToken` is a server action returning the backend JWT to browser code. Notification SSE puts it in URLs at frontend and backend; `JwtStrategy` accepts query tokens globally. | Keep backend tokens server-side. Authenticate the frontend SSE proxy from its session cookie and forward an authorization header. Remove general query-token support after transitioning clients. URLs may be logged by infrastructure. |
| S11 | Medium | `main.ts` reflects any CORS origin with credentials; Swagger is unconditionally mounted with authorization persistence. No throttler/security-header middleware is configured in inspected source. | Allowlist intended origins, protect/disable production Swagger, and set deliberate rate and security-header policies. Verify hosting controls before choosing limits; CORS itself does not authenticate a request. |
| S12 | Medium | `GET /api/users/all` is explicitly public and exposes IDs, names, emails, roles, and photos. Any authenticated user can fetch `/users/:id` and assigned-project details. Quality handlers return raw error messages. | Replace public directory with an authorized minimal tester directory. Enforce resource policy for user details and return stable public errors with internal correlation IDs. |
| S13 | Medium | Frontend DB TLS uses `rejectUnauthorized: false`; the pool is imported directly by auth and quality code without a `server-only` marker. No confirmed browser bundling of the DB credential was found; public source exposure is already confirmed. | Require certificate verification appropriate to the provider; isolate server-only configuration/data access and minimize DTOs. Keep secrets out of `NEXT_PUBLIC_*`. The public backend base URL is not itself a secret. |
| S14 | Medium | Telemetry trusts client IP/location/MAC fields. MAC values are generated identifiers, not hardware addresses. Client audit endpoint accepts supplied descriptions/status. Login audit/session persistence is duplicated across frontend and backend. | Record server-observed identity separately from untrusted client telemetry. Label device IDs accurately; apply retention/access policy. Keep authoritative audit events in backend and distinguish client-reported events. |
| S15 | Medium | Test-case CSV quotes only some columns and does not neutralize formula-leading text. Commas/newlines in unquoted fields can corrupt rows; spreadsheet applications can interpret formulas. | Use consistent CSV serialization and spreadsheet-formula neutralization for untrusted strings. Preserve BOM and bilingual headers. Test commas, quotes, newlines, and formula-leading values. |
| S16 | Medium | Unauthenticated Next routes `/api/open-outlook-classic` and `/api/open-default-apps` spawn PowerShell on Windows. On hosted Linux they fall back. No origin/auth checks or invocation limit exist in these handlers. | Restrict to an explicitly enabled local integration, require authorization, and bound invocations. Server-side COM cannot open the remote user's desktop Outlook. The inspected Outlook arguments use base64 encoding; arbitrary shell command injection is not established. |

## Git hygiene

| Repository | Environment files | Database files | Tracked dependencies | Tracked build files |
| --- | --- | --- | ---: | ---: |
| Frontend | Local `.env.development` and `.env.production` are ignored/untracked; keys are `NEXT_PUBLIC_BASE_URL`, `AUTH_SECRET`, `DATABASE_URL` | None found in current index | 0 | 0 |
| Backend | `.env` is tracked; keys are `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `FRONTEND_URL` | `qa_test_suite.db` tracked | 18,296 under `node_modules/` | 108 under `dist/` |

Backend environment/database paths also appear in inspected Git history. Frontend path-history search found no tracked `.env*` or `.db` path, but is not an exhaustive historical secret scan. Backend `.gitignore` ignores dependencies yet they remain tracked; it omits `.env`, `dist`, and the database. Docker ignore excludes these sensitive paths, but that does not remove Git exposure. Database contents were deliberately not dumped; classify and review the committed file securely rather than assuming it is harmless or the active database.

Recommended cleanup, after backup/review: add appropriate ignore rules, remove artifacts from the index without deleting local working copies, preserve necessary upload assets, and coordinate any history rewrite with both repositories and all collaborators. Do not run these operations automatically.

## Security strengths to retain

- NestJS applies a JWT guard globally, with explicit `@Public` exceptions.
- Passwords use bcrypt; SQL values in inspected core flows are parameterized and update columns use fixed allowlists.
- Project create/update/delete and user management/assignments have explicit admin checks. Project detail checks assigned membership.
- JWT validation fetches the current database role and checks token revocation cutoffs and known inactive sessions.
- Notification mark-read updates include the owner user ID.
- DTO validation and frontend RHF/Zod are established patterns, although their coverage/contracts need alignment.

## Safe remediation order

1. Review exposure with the owner; coordinate credential replacement, production configuration, session invalidation, and recovery access. No rotation was performed in this audit.
2. Address reset-code disclosure, quality API access, profile file serving, and test-case resource authorization before exposing new data models.
3. Align validation, harden uploads/HTML/export boundaries, and add isolated permission/reset tests.
4. Clean Git tracking/history with backups and coordination. Add automated secret and dependency checks without publishing secret values in logs.
5. Proceed with the additive architecture in `02-qa-architecture-and-releases.md`.

## Verification and limits

- Frontend `tsc --noEmit --incremental false`: passed.
- Backend source-only `tsc --project backend/tsconfig.build.json --noEmit --incremental false`: passed.
- Backend full-project typecheck: failed on missing test-global types (`describe`, `beforeEach`, `it`, `afterEach`) in `test/app.e2e-spec.ts`.
- Existing e2e test initializes `AppModule`, which initializes/seeds the configured DB, and expects an obsolete `Hello World!` route. It was not executed to avoid changing a possibly shared database.
- No build/dev server was started because server rendering/startup can access the configured database. No dependency advisory lookup, production penetration test, complete historical entropy scan, or database-content audit was performed; this is not a clean bill of health for those areas.
