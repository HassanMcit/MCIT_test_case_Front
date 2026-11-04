# Schedule and User Assignment redesign

## Interface

Both Add New Project and Edit Project share the redesigned cyan-accented card,
calendar header, timeline guidance, side-by-side desktop date fields and stacked
mobile layout. Dialogs are wider on desktop and retain viewport-bounded scrolling.
All labels, validation, controls and direction support English LTR and Arabic RTL.

The reusable custom picker replaces every `datetime-local` input in this section:

- Monthly calendar with month/year selectors, previous/next controls, cyan selected
  dates, and a today outline.
- Roving keyboard focus: arrows move days/weeks, Home/End move within a week,
  Page Up/Down change months, Shift+Page Up/Down change years, Enter/Space select.
- Separate 12-hour clock, minute control and AM/PM buttons.
- Changes remain drafts until Apply. Cancel, Escape and outside dismissal preserve
  the saved value; reopening resets drafts. Clear removes the current value.
- Base UI popover handles placement, dismissal and focus restoration. Popup width
  is capped to the viewport and its height scrolls on smaller screens.
- Cairo wall-clock values use the existing UTC conversion/validation. DST gaps and
  ambiguous repeated hours are rejected rather than silently selecting an instant.
  No timezone or timestamp storage contract changed.

Assignment uses the installed Base UI combobox with keyboard navigation, search
by name/role, actual database role badges, loading/error/retry states and an explicit
Unassigned option. No user is selected automatically.

## Backend and data safety

**No migration is needed.** No database/environment configuration changed and no
production database was started, queried, migrated or modified for testing.

The existing nullable `assignedTesterId` field now accepts a designated user with
database role `tester` **or** `admin`. Its legacy API/column name is retained to
avoid renaming data, breaking existing callers or creating a duplicate assignment
system. Existing project memberships, primary-management markers, transactions,
authorization guards and cache invalidation remain in use.

`GET /api/users/assignable` is an admin-only minimal directory returning
`id`, `name`, `role` for Tester/Admin users. The earlier `/api/users/testers`
endpoint remains tester-only for compatibility. All existing project management
permissions remain unchanged; assigning a Tester does not grant Admin permissions.
Unknown/ineligible roles are rejected by the backend even if a client submits an ID.

The deadline worker is already recipient-role agnostic. It continues using current
membership and the persistent `(project, deadline, recipient)` delivery ledger.
Tests cover assignment and overdue notifications for both roles, reassignment,
removal, closed projects, restart/deduplication and recipient isolation. No new
worker or notification persistence mechanism was introduced.

The new directory uses the same authenticated scoped force-cache policy and users
tag. Existing project/assignment mutations invalidate relevant tags and paths, and
the transactional database revision prevents stale cross-instance cached views.

## Changed files

Frontend:

- `src/app/(dashboard)/projects/ProjectScheduleFields.tsx`
- `src/app/(dashboard)/projects/ProjectsForm.tsx`
- `src/app/(dashboard)/projects/eligible-users.action.ts` (replaces `eligible-testers.action.ts`)
- `src/app/(dashboard)/projects/project-schedule.zod.ts`
- `src/components/ui/project-date-time-picker.tsx`
- `src/components/ui/project-user-combobox.tsx`
- `src/components/ui/schedule-calendar.tsx`
- `src/lib/schedule-picker.ts`
- `src/lib/project-time.ts` (comment clarified)
- `test/project-cache.test.cjs`
- `test/schedule-picker.test.cjs`
- `test/support/schedule-components.cjs`
- `package.json` (expanded test command)
- Documentation and paired backend Git reference.

Backend:

- `src/projects/projects.service.ts`
- `src/projects/dto/project.dto.ts`
- `src/users/users.controller.ts`
- `src/users/users.service.ts`
- `test/project-deadlines.integration.cjs`
- `PROJECT_DEADLINES.md`

## Verification and limits

`npm run test:projects` in the frontend includes pure calendar/clock tests,
component callback tests for draft/apply/cancel/clear and DST validation, actual
Base UI/React server rendering in both languages, responsive class assertions,
role selection/search/removal, and existing caching/authentication tests.

The backend suite runs only against an isolated in-memory PGlite PostgreSQL
instance. Added coverage verifies both role values, the new directory's access
control, creation/edit/removal, notifications to both recipients, and unchanged
legacy project/user snapshots. Existing workflow tests verify definitions,
assignments and execution-history preservation. No production data is a test target.

An ignored local preview was prepared without any database connection. Browser
verification was blocked by the computer-use tool because it could not reliably
verify the browser URL. No alternative UI automation was used to bypass that
restriction. Visual browser/mobile-device testing therefore remains outstanding;
SSR/responsive markup and interaction callback tests are not claimed as browser E2E.

Final results: **13 frontend tests and 25 backend integration tests pass**. Both
production builds and TypeScript checks pass. Focused lint checks pass; full
repository lint still reports the pre-existing formatting/style and floating-promise
errors. No new runtime dependency was added.

Commits are local only. No production migration or deployment is authorized or
performed. Existing repository-wide lint debt is reported separately from focused
checks on the changed components.
