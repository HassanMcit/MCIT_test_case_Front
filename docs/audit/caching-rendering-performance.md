**Caching, rendering, navigation, and loading audit — 2026-11-05**

Implementation baseline: `86aaeca`. Installed runtime: Next.js **16.3.6**, App Router, React **19.2.8**, Auth.js JWT sessions, Node/PostgreSQL. No dependencies were added.

**Architecture and findings.** Root layout is a Server Component that reads the language cookie; dashboard layout is a persistent Client Component containing one SessionProvider, Navbar, and Sidebar. Most pages fetch on the server and pass snapshots into interactive Client Components. Cycle lists, cycle items, and execution history previously added client-side fetch waterfalls. Security/account screens intentionally perform fresh reads. There are five `loading.tsx` boundaries: root, dashboard group, dashboard page, projects, and test cases. No pathname-keyed shared layout or template was found that needed removal. Leaf-page remounting on ordinary navigation is expected; the date picker's open/closed key intentionally resets drafts.

Existing caches already partition backend GETs and SQL fallbacks by current identity/role/database revision. However, nested loaders repeatedly decoded the same cookie and queried authorization; Test Cases immediately refetched its SSR snapshot with a timestamp cache buster; empty user/assignment snapshots triggered another fetch; Add/Projects serialized independent reads; a commented-out Projects directory still fetched; dashboard refresh fetched twice; sidebar stats waited on a redundant endpoint; and notification read-time tag invalidation discarded unrelated Router Cache entries. Dynamic page segments had zero reuse, while default prefetch stopped at loading boundaries.

**Cache policy implemented.** This application does not enable Cache Components. The installed local guides document `unstable_cache` as the supported existing-mode alternative; enabling `use cache`/`cacheLife`/`cacheTag` would require an additional Cache Components/rendering migration. This change retains the existing mode rather than introducing that migration across authenticated routes.

| Layer/data | Scope and lifetime | Authorization/freshness |
| --- | --- | --- |
| Current session/role/revision | React `cache`, one RSC render/request only | Next request checks cookies, token lifetime, current database role, device revocation, token cutoff, and database revision again. Not a global auth cache. Outside RSC memoization, checks remain fresh. |
| Quality catalog and portfolio summary | Authenticated shared Data Cache; default 60s; `quality-apps` tag; database revision + normalized filters | Every lookup first authenticates. Existing permissions allow this same catalog to all signed-in roles. Undefined/`All`/empty-search consumers now use the same key. No assessment notes, tester identities, directories, or sessions enter this shared cache. |
| Projects, assignments, test cases, users, workflow data, quality assessment details | Existing user/role/revision-scoped fetch/SQL caches; default 60s | Admin checks and project filtering remain in place. Backend bearer token and scope headers remain part of fetch keys. Assessment history stays identity-scoped. |
| Explicit TTL overrides | Caller value respected, including `false`; `0` bypasses persistent caching | Previously both helpers overwrote caller TTLs with 60s. Auth still precedes SQL-cache lookup, including an uncached SQL read. |
| Auth/profile/session/audit/security/export/notification reads and all non-GET writes | Fresh/no-store where already designated | No shared response cache or new browser persistence. Existing private API response headers remain unchanged. |
| Intent-prefetched workflow page payloads | Next.js browser-memory Router Cache, 30s | Only the five main sidebar workflow links opt into full prefetch on hover, keyboard focus, or touch intent. No eager full fetching of every sidebar destination. Dynamic stale time remains **0**; account/security destinations do not opt into full prefetch. |

All application page HTML remains dynamically rendered: the language cookie and authorization are request-dependent. **No page was made globally static, no SSR was disabled, and no authenticated HTML was put in a shared cache.** Static JS/CSS/image delivery remains Next.js-managed. A session boundary now detects confirmed account/device/role changes, hides the old private tree during a native router refresh, and resets private client state before showing the new payload. Learning the initial session does not trigger another refresh; ordinary same-user navigation preserves the shared layout.

| Route group | Rendering/data behavior |
| --- | --- |
| `/dashboard` | Dynamic SSR, private projects/test cases/admin overview; one refresh action returns the new RSC tree without a second `router.refresh()`. |
| `/add`, `/projects`, `/test-cases` | Dynamic SSR; independent reads parallel; private project/case data plus authorized shared catalog. Test Cases no longer immediately overwrites filtered server results with an unfiltered timestamp-busted request. |
| `/quality` | Dynamic SSR with authorized shared catalog/metrics. |
| `/quality/[id]` | Dynamic SSR with private assessment history. |
| `/test-cycles`, `/test-cycles/[id]` | Dynamic SSR now includes the initial cycle list/items. Mount effects consume those snapshots without immediately reloading them. Subsequent filters, pagination, and mutations still fetch fresh scoped results. Cycle metadata and item refreshes start together. Release choices load when the cycle form opens. |
| `/test-cases/[id]/history` | Dynamic SSR now includes the first history result, including an error result. Subsequent pagination remains interactive and scoped. |
| `/users`, `/assign-projects` | Dynamic, permission-dependent SSR snapshots. An actual empty list is valid ready content, not a reason for a second request or skeleton. |
| Devices/security, sessions, reset codes, account/password pages | Keep existing permissions and necessary fresh client reads/loading states. No shared caching added. |
| Defect email/report composition | Existing private case cache retained; actual exports remain fresh. |
| Login, recovery, not-found, redirect aliases | Existing behavior retained. In particular, the post-login router refresh remains because it crosses an authentication boundary. |

**Loading and navigation.** All five loading boundaries and the existing UI were retained. Ready prefetched payloads bypass the fallback through normal Next.js rendering; genuinely pending/expired/unprefetched content still has a loading boundary. There is no blanket hidden skeleton, artificial delay, disabled SSR, or custom keep-alive cache. Shared shell components preserve their normal lifetime. No localStorage, IndexedDB, SWR, or TanStack Query cache was introduced.

**Notification reconciliation.** Reads remain `no-store`. Concurrent focus/stream/poll reads coalesce; events arriving during an older read cause one trailing fresh read. A healthy SSE connection reconciles once a minute, disconnected foreground tabs retain the existing 5s fallback, and hidden tabs pause polling. Focus still requests fresh data. Temporary failures retain the last valid snapshot for that mounted session. Identity/device/role changes reset state; cleanup invalidates old responses and queued work. Mark-read operations reconcile once after writing, so a pre-mutation poll cannot overwrite the updated read state. Read and mark-read operations no longer purge unrelated route payloads; genuine SSE/other-tab assignment events explicitly refresh route data. The existing Auth.js revocation polling and login/logout flow were not changed.

**Invalidation.** Existing successful-write `updateTag` and `revalidatePath` calls were retained for project CRUD, assignment changes, test case CRUD, quality CRUD/assessments, and workflow execution changes. They expire affected server data and refresh/invalidate the invoking browser's route payloads. Quality's shared cache uses the existing `quality-apps` tag. Existing database revision triggers also make old scoped/shared keys unreachable on the next authenticated server read across instances. No trigger, migration, or database schema was changed or executed. Notification data is not in the Data Cache, so its state is reconciled with fresh reads instead of routine tag purges.

Other users' already displayed pages are not a push subscription to every write. Ordinary browser snapshots may be reused for up to 30s, and visible pages do not acquire a new background polling timer. Actual assignment events refresh the receiving tab. Refresh or an expired/new server request always checks authorization and the current revision; backend mutations remain authorized regardless of a previously rendered UI snapshot. This bounded browser reuse should be reviewed against any stricter future freshness requirement.

**Exact modified files.**

| File | Change |
| --- | --- |
| `next.config.ts` | Keep dynamic stale time 0; shorten full-prefetch lifetime from 180s to 30s. |
| `package.json` | Add unit and production-browser performance test commands. |
| `tsconfig.json` | Exclude ignored scratch/test-tool projects from the application's compilation; fixtures independently build/type-check. |
| `src/app/myUtil.ts` | Request-local RSC authorization memoization. |
| `src/lib/scoped-cache.ts` | Authorized shared read cache; respect TTL/uncached options while preserving private scope. |
| `src/lib/app-fetch.ts` | Respect explicit revalidation lifetimes and uncached reads. |
| `src/lib/fast-read.ts` | Clear completed timeout-race timers. |
| `src/components/IntentLink.tsx` | Native full prefetch on intent, without storing page data itself. |
| `src/components/Sidebar/Sidebar.tsx` | Use intent links for the five main workflow routes. |
| `src/components/Sidebar/sidebar.action.ts` | Compute available scoped stats without waiting for a redundant legacy endpoint; bound the fallback wait. |
| `src/components/Navbar/Navbar.tsx` | Scoped, deduplicated notification lifecycle and genuine-event route refresh. |
| `src/components/Navbar/notifications.action.ts` | No routine Router Cache purges; expose temporary read unavailability so valid state can remain visible. |
| `src/components/MySession/MySession.tsx` | Invalidate browser payloads and reset private state on confirmed session-identity changes; keep initial SSR and ordinary same-user layout lifetime. |
| `src/app/(dashboard)/add/page.tsx` | Parallel projects/catalog reads. |
| `src/app/(dashboard)/projects/page.tsx` | Parallel projects/catalog reads. |
| `src/app/(dashboard)/projects/ProjectsForm.tsx` | Remove unused eager directory read; avoid extra reads after create/update when revalidated server props supply the result. |
| `src/app/(dashboard)/projects/getProjects.action.ts` | Preserve Next.js rendering/control-flow exceptions. |
| `src/app/(dashboard)/dashboard/DashboardClient.tsx` | Remove the duplicate refresh request. |
| `src/app/(dashboard)/quality/quality.action.ts` | Share only catalog reads; canonicalize filters; retain private details and framework rendering signals. |
| `src/app/(dashboard)/test-cases/TestCasesTable.tsx` | Remove duplicate timestamp-busted mount fetch. |
| `src/app/(dashboard)/test-cases/test-cases.action.ts` | Stable read cache version; preserve framework rendering signals. |
| `src/app/(dashboard)/users/UsersClient.tsx` | Consume empty SSR lists as valid snapshots. |
| `src/app/(dashboard)/assign-projects/AssignProjectsClient.tsx` | Consume empty SSR lists without duplicate fetch/loading. |
| `src/app/(dashboard)/test-cycles/page.tsx` | Preload the authorized initial cycle page. |
| `src/app/(dashboard)/test-cycles/WorkflowManager.tsx` | Use initial snapshot; defer release-option fetching to the form. |
| `src/app/(dashboard)/test-cycles/[id]/page.tsx` | Preload metadata and first items in parallel. |
| `src/app/(dashboard)/test-cycles/[id]/CycleWorkspace.tsx` | Consume initial data without duplicate mount reads; parallelize later metadata/item reads. |
| `src/app/(dashboard)/test-cycles/workflow.action.ts` | Rethrow Next.js control-flow exceptions while keeping ordinary API errors visible. |
| `src/app/(dashboard)/test-cases/[id]/history/page.tsx` | Fetch the first history result during SSR. |
| `src/app/(dashboard)/test-cases/[id]/history/ExecutionHistory.tsx` | Seed the first result and preserve normal subsequent pagination. |
| `test/performance-cache.test.cjs` | Mocked database/network tests of the real helpers, actions, and mount effects. |
| `test/performance-browser.cjs` | Isolated production Next.js/Chrome fixture, including a baseline mode. |
| `docs/audit/caching-rendering-performance.md` | This report. |

**Verification and measurements.** Production-mode Chrome tests build a separate Next 16.3.6 fixture using the actual cache/session helpers and IntentLink. JWT decoding, database rows, and mutations are synthetic; the fixture binds only to localhost and never imports the production pool. It uses controlled 30/100/120ms delays. These are **single-run fixture measurements, not production page benchmarks**. The fixture uses a webpack production build; the real application's Turbopack production build is checked separately. Hover preparation time is excluded from click-to-content measurements. Fallback observations are DOM observations, not a video frame count.

| Measurement | Baseline | Optimized sample |
| --- | ---: | ---: |
| First fixture visit, including hydration | 473ms | 438ms |
| Authorization database reads in the initial RSC render | 6 | 1 |
| Prepared navigation, click to content | 843ms | 46ms |
| RSC requests on prepared navigation click | 1 | 0 |
| Loading fallback observed during prepared navigation | Yes | No |
| Previously visited prepared route, click to content | 340ms | 35ms |
| RSC requests on that revisit click | 1 | 0 |
| Catalog reads after two authorized identities | 2 | 1 |

First-load timings varied between runs, so no production first-load speedup or SLA is claimed. The reliable findings are reduced request counts, authorization isolation, data-cache reuse, and the absence of a fallback for a ready browser payload.

Verified behaviors:

- Initial SSR rendering and browser hydration; no fixture runtime/hydration errors detected.
- Intent navigation and revisits within the browser cache lifetime; shared layout DOM remains mounted.
- Refresh rechecks authorization while reusing still-valid scoped/shared data.
- Browser snapshot expiration after a real 31-second wait causes a new prefetch/server request.
- Separate Admin, Tester, and User contexts receive their own private data; only the authorized catalog is shared.
- Tester/User mutation rejection, role changes on fresh requests, and revoked-session rejection.
- Same-browser account switching after warming an old user's private payload, an announced role change, and session removal; old route payloads are not reused across the confirmed identity boundary. This uses a synthetic session provider to exercise the real boundary, not production Auth.js login.
- Native fixture create/update/delete immediately update rendered data through tag/path invalidation.
- Real quality CRUD/assessment actions invalidate their shared read cache against a mocked database; unauthorized writes never reach that database.
- Empty SSR snapshots, cycle/history seeds, notification overlap/trailing reads, hidden-tab behavior, disconnected fallback, and obsolete-response cancellation.

Checks: TypeScript and application production build pass; 19 existing frontend tests and 10 new performance tests pass. The supplemental layout audit passes 378 component viewport/direction checks. Repository-wide Biome remains failing on pre-existing issues (1,230 errors, 1,912 warnings, 83 infos); full before/after diagnostics comparison adds no diagnostics to modified production files, and the new helper/test files pass Biome checks.

**Remaining limits and next steps.** Full authenticated application-route navigation, real Auth.js login/logout/device behavior, production CRUD, and deployment latency were not exercised against production accounts or records. Validate these in staging before rollout. The isolated fixture verifies the cache mechanisms, not every real page's post-hydration behavior.

Large 500/1000-row dashboard/test-case payloads, aggregate computation, client bundle sizes, Render cold starts, database latency, and legacy client-side workflow pagination remain likely bottlenecks. Some existing error paths return empty/default data rather than an explicit recoverable error; they were not redesigned here. Profile real route TTFB/LCP, query timings, and request counts before changing business pagination/aggregation. Existing global database revisions and broad mutation tags favor consistency but reduce hit rates under frequent writes; finer resource revisions would require a separately scoped backend/schema design. A coordinated cache handler is needed if cross-instance invalidation must be pushed beyond revision-key freshness; no deployment-specific infrastructure was assumed. Cache Components migration can be evaluated separately with explicit auth/Suspense boundaries.

Re-run from the project root:

```text
npm run test:projects
npm run test:performance
npm run test:performance:browser
node test/performance-browser.cjs --baseline=86aaeca
npx tsc --noEmit
npm run lint
npm run build
npm run test:layout
```

The browser runner requires Chrome and Playwright, available locally under the ignored `.qa-test-tools/node_modules` directory. Measurements/build logs live under ignored `scratch/performance-*`; fixture apps have independent strict TypeScript builds. The fixture source is test-only and must not be deployed as an application.

The final isolated result is in `scratch/performance-final-audit.json`; it was produced with `--report-name=performance-final-audit --port=3347` to keep concurrent test runs from overwriting its fixture/results. Concurrent edits to `TestCaseForm.tsx`, the dashboard layout, and global CSS were preserved outside this optimization patch. Route-wide `force-cache` exports also appeared during the audit; those blanket overrides were removed because the installed fetch implementation can let them override explicit fresh-read exceptions. Build/test runs must not share a Next.js build directory concurrently; an overlapping build was retried after its lock cleared.

No backend source, database records, migrations, seed scripts, credentials, environment files, or authentication callbacks were changed. No production mutations were executed. Nothing was pushed or deployed.
