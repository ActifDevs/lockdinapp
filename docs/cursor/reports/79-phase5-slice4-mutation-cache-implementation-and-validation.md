# Phase 5 Slice 4 — Mutation / Cache Implementation and Validation

- **Date:** 2026-08-26
- **Slice 4 implementation baseline:** `d19815cc06455a2f06f1ad21f8e450ea5a3257ac`
- **Branch:** `phase5-slice4-mutation-cache-reconciliation`
- **Merge status:** **NOT MERGED TO MAIN**

## Baseline

- Canonical `origin/main` after Report 78: `d19815cc06455a2f06f1ad21f8e450ea5a3257ac`
- Slice 3 closeout: `bb388c624f69fd9249f53c2cc3340024b10a2356`
- Diff `bb388c..origin/main`: Report 78 only (`docs/cursor/reports/78-phase5-slice4-mutation-cache-entry-reconciliation.md`)
- Working tree at branch creation: clean
- Feature branch created from that SHA

## Report 78 handoff

Entry verdict **PASS — IMPLEMENTATION PLAN READY**. Gate 0: none.

This slice implements the audited UX/cache gaps only. Bulk topic convergence was implemented more strictly than Report 78’s original “TanStack coalesces invalidations” note: the batch settles first, then one aggregate invalidation runs.

## Final implementation scope

Frontend only:

- Study Plan Add Task modal error placement and safe copy
- Dashboard mission toggle failure toast
- Subject Detail task/topic failure toasts
- Deterministic bulk unit topic updates
- Past Papers log-attempt modal error and delete toast
- Settings profile success → Dashboard summary invalidation
- Shared `getMutationErrorMessage`
- Focused mutation tests

## Mutation error-safety contract

`getMutationErrorMessage` maps HTTP status and network failures to fixed copy. It never returns `error.message`, SQL, stacks, or arbitrary server detail.

- 401: no extra logout; global auth remains authoritative
- 403: permission copy; no sign-out
- 400/409/429/5xx/network/unknown: safe retry-oriented copy

Toasts and modal alerts use that helper (or a single fixed bulk-unit sentence).

## Study Plan

Create-task failures stay in the Add Task dialog (`Alert` + safe copy). Form values remain. Dialog stays open. Pending submit stays disabled. Success still closes/resets and invalidates tasks, dashboard summary, and progress overview. List toggle/delete still use page-level `actionError`, now via the safe helper. Mutation `reset()` clears stale create errors on open/close.

## Dashboard

Mission toggle `onError` shows a destructive toast. Success invalidations are unchanged. Pending/toggling protection is unchanged.

## Subject Detail task mutation

Task toggle `onError` toast. Slice 2 read states and Slice 3 `?tab=` are untouched. Task aggregate invalidation is unchanged.

## Subject Detail topic mutation

Single-topic cycle `onError` toast. Success still invalidates syllabus, subject, dashboard summary, and progress overview.

## Bulk topic convergence

Bulk updates use a **separate** `useUpdateSyllabusTopic` instance with **no** per-item `onSuccess` invalidation.

Flow:

1. Start the intended topic `mutateAsync` calls
2. `Promise.allSettled` until every started update finishes
3. Invalidate syllabus/subject/dashboard/progress **once**
4. At most **one** toast if any update rejected
5. Always clear `unitBusyId`
6. Partial success still refetches so the UI matches saved state

This avoids per-topic invalidation storms and per-topic toasts.

## Past Papers

Log Attempt failures render a destructive alert inside the modal. Inputs remain. Dialog stays open. Submit re-enables after failure. `reset()` clears stale errors on open/close. Success still closes/resets and keeps existing invalidations. Delete failures use a destructive toast. `?subject=` is unchanged.

## Profile cache convergence

After a successful `updateUser` profile save, Settings invalidates `getGetDashboardSummaryQueryKey()` only. Failed saves do not invalidate. Saved badge/toast, membership `setQueryData`, notification prefs, and `?tab=` are unchanged.

## Cache invalidation contract

Generated helpers only; no global purge.

- Tasks: list + dashboard summary + progress overview
- Topics: syllabus + subject + dashboard summary + progress overview (bulk: once after settle)
- Attempts: list + dashboard summary + progress overview + subject performance when subject id is known
- Profile: dashboard summary on success

## Auth/account isolation

No AuthProvider, token, 401, ownership, or membership-validation changes. URL filters still grant no mutation authority.

## Slice 2 regression

Loading, empty, stale, retry, and Subject Detail 404 paths were not redesigned. Existing read-state tests passed.

## Slice 3 regression

`tab`, `view`, `subject`, calendar replace semantics were not changed. Mutation tests assert relevant search params remain.

## Files changed

- `artifacts/revision-platform/src/lib/query-error-message.ts`
- `artifacts/revision-platform/src/lib/query-error-message.test.ts`
- `artifacts/revision-platform/src/pages/study-plan.tsx`
- `artifacts/revision-platform/src/pages/dashboard.tsx`
- `artifacts/revision-platform/src/pages/subject-detail.tsx`
- `artifacts/revision-platform/src/pages/past-papers.tsx`
- `artifacts/revision-platform/src/pages/settings.tsx`
- `artifacts/revision-platform/src/pages/study-plan.read-states.test.tsx`
- `artifacts/revision-platform/src/pages/past-papers.test.ts`
- `artifacts/revision-platform/src/pages/study-plan.mutation.test.tsx` (new)
- `artifacts/revision-platform/src/pages/dashboard.mutation.test.tsx` (new)
- `artifacts/revision-platform/src/pages/subject-detail.mutation.test.tsx` (new)
- `artifacts/revision-platform/src/pages/past-papers.mutation.test.tsx` (new)
- `artifacts/revision-platform/src/pages/settings.mutation.test.tsx` (new)
- this report

## Focused tests

- `study-plan.mutation.test.tsx` — 4
- `dashboard.mutation.test.tsx` — 3
- `subject-detail.mutation.test.tsx` — 4
- `past-papers.mutation.test.tsx` — 4
- `settings.mutation.test.tsx` — 2
- `getMutationErrorMessage` — 3

## Full validation

Canonical `pnpm` wrappers succeeded on macOS. No Windows signal-pipe launcher failure.

| Check | Result |
| --- | --- |
| Frontend Vitest | PASS: 31 files, 204 tests (was 26 / 184) |
| `pnpm run typecheck` | PASS |
| `PORT=3000 BASE_PATH=/` frontend build | PASS: 3,275 modules (was 3,274); existing sourcemap warnings |
| Global auth | PASS: 33/33 |
| Request-ID | PASS: 10/10 |

No hosted/Production DB integration.

## Security review

**SLICE 4 MUTATION SECURITY REVIEW: PASS**

No tokens, passwords, auth headers, session values, or DB credentials in the diff. No backend/API/schema/RLS/Supabase/Vercel/env changes. Failures never render raw server text.

**SLICE 2 READ-STATE REGRESSION: NONE DETECTED**

**SLICE 3 NAVIGATION REGRESSION: NONE DETECTED**

## Preview

Initially: PENDING

## Human QA

Initially: PENDING

## Merge status

**NOT MERGED TO MAIN**
