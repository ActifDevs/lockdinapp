# Phase 5 Slice 2 — Read-State Reconciliation Implementation and Validation

## Baseline

- Repository baseline: `8d781b2bbfda6a69f56977cda82efebbafb10f8e`
- `main` and `origin/main` matched at preflight.
- The working tree was clean before the feature branch was created.
- Feature branch: `phase5-slice2-read-state-reconciliation`

## Entry audit

Report 72, `72-phase5-slice2-entry-reconciliation-and-read-state-audit.md`,
authorized this implementation with no Gate 0 owner decisions. Its approved
boundary is read/loading/error/recovery semantics for Subject Detail, Study
Plan, Past Papers, and the Settings public subject catalogue.

## Final implementation contract

Each affected query surface now distinguishes initial loading, success with
data, genuine empty data, failure without data, manual retry, and cached data
with a failed refresh. Query cancellation is treated as a lifecycle event and
does not render a user-facing error. Secondary dependency failure remains
localized so unrelated page functions stay available.

## Shared read-state behavior

`ReadStateNotice` provides a small accessible, configurable error/stale notice
for page, section, and form-local placement. It accepts contextual title and
description copy, safe shared error text, retry behavior, compact placement,
and stale-data presentation. The shared query error helper now derives safe
HTTP status semantics without exposing arbitrary server messages and filters
abort/cancellation errors.

## Subject Detail

- The primary subject keeps its full-page loading skeleton.
- A primary 404 renders a deliberate subject-not-found state with navigation
  back to Subjects; transient primary failures remain retryable.
- Cached subject data remains mounted after a refresh failure with an explicit
  stale warning.
- Syllabus, performance, and both task surfaces use localized loading,
  failure, retry, genuine-empty, and stale-refresh states.
- Syllabus failure never claims `0%`; performance failure never claims genuine
  zero/N/A data; task failure never renders the no-tasks state.
- The unused subject-attempts query and all existing mutations are unchanged.

## Study Plan

- Task failure is distinct from the existing genuine-empty experience and is
  retryable.
- Cached task rows remain visible with a refresh-failed warning.
- Membership state affects task creation only. Already-loaded tasks remain
  usable during membership loading, failure, or genuine zero membership.
- Creation controls explain loading/failure/zero membership, provide localized
  retry, and link genuine zero membership to Settings.
- Task mutation behavior is unchanged.

## Past Papers

- A single attempts read state governs the chart and history so an attempts
  failure cannot create false first-paper invitations or empty history.
- Cached attempts remain visible with a stale warning and retry.
- Assessment-component loading, failure, genuine empty, retry, and cached
  refresh failure are form-local; history and chart remain usable.
- Existing membership error and partial-page behavior is preserved.
- Mutation behavior is unchanged; component-dependent submission is disabled
  only when no valid component can be selected.

## Settings

- The public subject catalogue distinguishes loading, failure with retry,
  genuine empty, success, and cached refresh failure.
- Catalogue failure disables subject-selection editing only.
- Existing membership handling, Account, Appearance, Alerts, profile lifecycle,
  theme behavior, and Slice 1 notification preferences are unchanged.

## Genuine empty vs error behavior

Successful empty arrays continue to render the established empty experiences.
Undefined data with a failed request renders an explicit localized error and
retry instead. No affected failure path is interpreted as zero progress, zero
tasks, zero attempts, empty components, or an empty public catalogue.

## Cached-data refresh-failure behavior

When TanStack Query supplies cached data alongside `isError`, the cached
content stays visible and an accessible notice states that refresh failed and
the content may be outdated. Retry remains available. Existing identity-change
cache clearing remains authoritative and was not modified.

## Cancellation behavior

Abort and cancellation-shaped errors are recognized by the shared helper and
do not render `ReadStateNotice`. No cancellation framework, toast, or page-level
auth behavior was added.

## 401 / 403 behavior

The existing global 401 handler remains the sole sign-out/cache-clear/redirect
authority. Pages do not duplicate it. A 403 receives localized permission copy
and never initiates logout. Primary Subject Detail 404 is deliberate not-found
UI; secondary 404s remain localized dependency failures.

## Files changed

- `artifacts/revision-platform/src/lib/query-error-message.ts`
- `artifacts/revision-platform/src/lib/query-error-message.test.ts`
- `artifacts/revision-platform/src/components/read-state-notice.tsx`
- `artifacts/revision-platform/src/components/read-state-notice.test.tsx`
- `artifacts/revision-platform/src/pages/subject-detail.tsx`
- `artifacts/revision-platform/src/pages/subject-detail.read-states.test.tsx`
- `artifacts/revision-platform/src/pages/study-plan.tsx`
- `artifacts/revision-platform/src/pages/study-plan.read-states.test.tsx`
- `artifacts/revision-platform/src/pages/past-papers.tsx`
- `artifacts/revision-platform/src/pages/past-papers.test.ts`
- `artifacts/revision-platform/src/pages/settings.tsx`
- `artifacts/revision-platform/src/pages/settings.read-states.test.tsx`
- this report

## Focused tests

The final focused Slice 2 run passed **6 files / 50 tests**. Mounted coverage
includes primary and secondary loading, success, 404, transient failure, retry,
genuine empty, cached-data refresh failure, partial-page usability, form-local
dependencies, safe 403 copy, and cancellation suppression.

## Full validation

| Gate | Result |
| --- | --- |
| Full frontend suite | **PASS — 24 files / 133 tests** |
| Repository-wide typecheck | **PASS** |
| Root build wrapper | Stopped at the unrelated mockup Vite config because `PORT` was not supplied |
| Scoped frontend build without required env | Confirmed the expected `PORT`/`BASE_PATH` guard |
| Scoped frontend Production build (`PORT=3000`, `BASE_PATH=/`) | **PASS — 3,273 modules** |
| Global-auth policy | **PASS — 33/33** |
| Request-ID middleware | **PASS — 10/10** |

The successful build emitted only the existing tooltip/sheet sourcemap notices
and a non-blocking base-format warning from the Windows command environment.
No hosted or Production database integration was run.

## Security review

**SLICE 2 READ-STATE SECURITY REVIEW: PASS**

No auth boundary, logout flow, direct Supabase application-data access,
ownership enforcement, token handling, backend contract, or identity cache
isolation changed. Arbitrary raw error messages are no longer returned by the
shared presentation helper. The 401/403 distinction and global-auth regression
suites remain green.

## Scope review

NAVIGATION STATE IMPLEMENTATION:

NOT INCLUDED — DEFERRED TO SEPARATE PHASE 5 SLICE

The final source diff contains no navigation persistence, Wouter/history,
Calendar URL state, backend, database, migration, RLS, RPC, OpenAPI, generated
client, Supabase configuration, AuthProvider, Vercel configuration, environment,
reference-data, checkpoint, or mutation/cache-reconciliation work. The
Impeccable detector reported only the incumbent square tab-underlines as
rounded-border heuristic warnings; those tab classes predate this slice and
were not changed.

## Preview

PENDING

## Human QA

PENDING

Human QA must use the exact verified Preview source. It should cover normal
authenticated page loads, controlled dependency failure/retry, cached stale
notices, localized partial-page behavior, and the absence of logout/session
loops. Navigation persistence is explicitly excluded.

## Merge status

NOT MERGED TO MAIN
