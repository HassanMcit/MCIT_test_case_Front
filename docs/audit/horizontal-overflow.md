# Horizontal overflow audit

Frontend-only changes, 2026-11-05. Baseline: `da1a4273f49570b0d04e298d99b7fdcee1365ccc`.

## Findings and fixes

The dashboard had three nested `overflow-x-hidden` wrappers. These hid oversized content rather than providing reliable sizing. They were removed; no horizontal overflow suppression was added to `html` or `body`.

Browser measurements of the original components, with only those dashboard clipping wrappers removed, identified:

- `DashboardClient`'s `div.absolute.-top-10.right-20.w-96`: its 384px decoration plus its 80px offset exceeded narrow screens. At 375px and 390px in RTL, both document and body measured **464px**. Both decorative glows now have maximum widths accounting for their offsets.
- Navbar's notification panel (`absolute.top-full.w-80`): anchoring its fixed width to the bell placed its left edge outside the 375px LTR viewport. The mobile panel now uses viewport insets; tablet/desktop retain the original anchored design.
- The closed mobile sidebar remained a visible, transformed offscreen element. It is now invisible while closed on mobile, visible on desktop, and still fixed with the same desktop width and slide-in behavior.

The Add Test Case form's unwrapped header, dense desktop grid at the sidebar breakpoint, and shared intrinsic sizing were additional weak points. The form now wraps its heading/status and label/action rows, uses responsive padding, and switches to four/five columns at `xl` instead of `lg`. Dashboard flex/grid containers can shrink, long text can wrap, cards and table containers have width constraints, and content-sized textareas cannot expand or be resized horizontally beyond their containers. Tables keep local horizontal scrolling. Shared popovers are constrained to available viewport width. Navbar names truncate within a bounded width.

The original Add page did not produce document overflow with the synthetic initial values used here. The reported screenshot/live-data state was not available, so its precise reproduction is not claimed.

## Exact files changed

| File | Change |
| --- | --- |
| `src/app/(dashboard)/layout.tsx` | Remove three blanket clipping wrappers; give shell/main explicit shrinking and width constraints. Preserve directional desktop sidebar padding. |
| `src/app/globals.css` | Dashboard-scoped flex/grid minimum inline sizes, text wrapping, form-control and local-scroller maximum inline sizes. |
| `src/app/(dashboard)/add/TestCaseForm.tsx` | Wrapping headers/actions; responsive padding and grid breakpoints. |
| `src/app/(dashboard)/dashboard/DashboardClient.tsx` | Bound decorative glow widths. |
| `src/app/(dashboard)/quality/QualityClient.tsx` | Replace page-level clipping with shrinkable containers. |
| `src/app/(dashboard)/quality/[id]/AppDetailClient.tsx` | Replace page-level clipping with a shrinkable container. |
| `src/components/Navbar/Navbar.tsx` | Mobile notification placement, menu width limits, bounded profile text and shrinkable groups. |
| `src/components/Sidebar/Sidebar.tsx` | Constrain drawer width and hide its closed mobile state. |
| `src/components/ui/card.tsx` | Shrinkable, bounded card/content. |
| `src/components/ui/table.tsx` | Bounded, shrinkable local scrolling container. |
| `src/components/ui/textarea.tsx` | Minimum/maximum width constraints and vertical-only resizing; retain content sizing. |
| `src/components/ui/popover.tsx` | Constrain positioner/popup to viewport and available width. |
| `test/layout-overflow.cjs` | Read-only Chrome layout regression audit with synthetic fixtures. |
| `package.json` | Add `test:layout` command; no dependency changes. |
| `docs/audit/horizontal-overflow.md` | Findings, coverage, results, and limitations. |

Root layout, native/shared inputs and selects, calendars, project/date/user pickers, export modal, loading/error screens, and every `src/app` page were reviewed. Their existing sizing/local scroll behavior is retained unless listed above. There is no standalone Teams route; Teams controls remain in the existing users/test-case flows. No Teams calls were launched.

## Verification

The audit renders actual React frontend components into headless Chrome, using compiled Tailwind styles and the application's built Almarai/Geist fonts. All server actions are blocked before loading frontend modules; session/navigation are synthetic; all browser network requests are blocked. Animations/transitions are disabled to measure settled geometry. Open states are selected in the test loader only, without changing production components.

Every fixture is measured at **1920, 1440, 1366, 1024, 768, 390, and 375px**, in **English LTR and Arabic RTL**. It checks both `document.documentElement.scrollWidth <= window.innerWidth` and `document.body.scrollWidth <= window.innerWidth`, reports uncontained offscreen elements, and verifies that locally overflowing tables can change `scrollLeft` in either direction.

Coverage:

- Dashboard, Add Test Case, All Test Cases, Projects, Quality Portfolios, quality application details.
- Users & Permissions, Add New User, Assign Projects, Test Cycles, cycle workspace.
- Devices/security, reset codes, change password, defect email/report composition, execution history.
- Login, password recovery, and not-found page components. Root, alternate password-recovery, and user-assignment alias routes were reviewed as redirects/re-exports.
- Open mobile sidebar, notification menu, profile menu, project creation modal, quality registration modal, export-report modal, long unbroken textarea values, and failed/defect form state.

Results:

- **378/378 component viewport/direction checks pass**; no document/body horizontal overflow or uncontained offscreen elements.
- Wide tables retain local horizontal scrolling. At 375px, the Test Cases table is 1282px inside a 343px scroller; document/body remain 375px. Scroll movement was verified in both directions.
- `tsc --noEmit`: pass.
- `npm run build`: pass, including Next.js TypeScript validation.
- `npm run test:projects`: 19/19 pass.
- `npm run lint`: fails on existing repository issues (1,235 errors, 1,921 warnings, 83 infos). Per-file comparison against the baseline adds no lint diagnostics in the changed production files. The new audit script and package manifest pass Biome checks.
- `git diff --check`: pass.

**Limits:** This is a component/browser geometry audit, not a signed-in end-to-end route test. The browser connection host was unavailable and no authenticated test session was available. Server-loaded data, post-hydration interactions, portaled select/date-popover collision handling, and production-data-specific content have not been verified end to end. Initial loading states are measured where components load their data in effects. Actual authenticated route navigation remains a follow-up verification step; authentication was not bypassed or modified.

## Re-running

Requires Chrome and Playwright (available locally under the ignored `.qa-test-tools/node_modules`, or installed in the normal Node resolution path). Build first so the audit can reuse the real font assets:

```text
npm run build
npm run test:layout
```

JSON measurements and representative screenshots are written to ignored `scratch/overflow-*` files. To inspect the old layout with dashboard clipping removed only in the fixture loader:

```text
node test/layout-overflow.cjs --baseline=da1a4273f49570b0d04e298d99b7fdcee1365ccc
```

No backend source, API behavior, database records, migrations, seeds, environment variables, credentials, authentication, authorization, or caching were changed. Nothing was pushed or deployed.
