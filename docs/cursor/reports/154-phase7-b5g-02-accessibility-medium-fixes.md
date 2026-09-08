# LOCKDIN — PHASE 7 B5G-02 ACCESSIBILITY MEDIUM FIXES

**Date:** 2026-09-08 UTC

**Status:** PASS — all four B5G-01 Medium accessibility findings fixed and
verified locally; no Production deployment or mutation performed

## Repository Baseline

- B5G-01 close SHA: `90d393943242513aafc5e1a3c89b2ed179d51b9c`
- Starting branch: `main`
- Starting state: clean, with `HEAD = origin/main`
- Frozen historical record:
  `docs/cursor/reports/153-phase7-b5g-01-accessibility-responsive-smoke.md`

## Scope and Product Boundary

This slice changed only frontend accessibility behavior, regression tests, and
this report. It made no migration, API contract, database, Production
configuration, subject-visibility, fixture, or invitation change.

- Production changes: **NONE**
- Production deployment: **NONE**
- Real beta invitations: **NONE**
- New-seven visibility changes: **NONE**
- B5E/B5F fixture recreation: **NONE**

## A11Y-001 — Assessment Route Radio Keyboard Model

**Root cause:** the Settings assessment routes used buttons with `radio` roles
and click handlers, but every radio remained in normal tab order and the group
had no arrow-key handler.

The membership assessment panel now uses a generic route-indexed radio model:

- the selected route is the single `tabIndex=0` item;
- all other routes use `tabIndex=-1`;
- Right/Down selects and focuses the next route;
- Left/Up selects and focuses the previous route;
- movement wraps at either end;
- Space retains native button activation;
- selection continues to update only the local draft; and
- route applicability and option reconciliation still use the existing shared
  `applicableOptionIds` behavior.

No subject name, subject ID, route ID, or History/Geography case is hardcoded.
The current route catalogue exposes no disabled-route state, so disabled-item
skipping is not applicable to the present data model.

**Proof:** the component regression covers all four arrows, wrapping, roving
tab stops, one selected radio, and continued draft-only operation. Existing
Settings mutation coverage verifies that persistence still occurs only through
the explicit Update/Save action.

## A11Y-002 — Responsive Form Panel Focus Restoration

**Root cause:** Add task and Log paper controlled `ResponsiveFormPanel`
instances were opened without Radix trigger primitives or an explicit return
target. Radix therefore had no invocation element to focus on close.

Study Plan and Past Papers now record the active invocation element immediately
before opening and pass the reference into the shared responsive panel. The
shared panel owns the close behavior for both its desktop Dialog and mobile
Sheet variants through `onCloseAutoFocus`. It prevents the default only when
the recorded element remains connected, focuses that element, and otherwise
allows the primitive's safe default behavior without throwing.

This covers Escape, Cancel, and successful controlled close paths. A shared
panel regression verifies focus return for Escape, Cancel, and Save/success.
The Study Plan and Past Papers page suites verify the two wired flows and their
existing close/mutation behavior.

## A11Y-003 — Study Plan Required-Field Messages

**Root cause:** the shared `FormMessage` correctly derived the React Hook Form /
Zod error message and rendered a paragraph with the associated ID, but used a
self-closing paragraph and never inserted the derived `body`. This produced an
empty described element and color-only feedback.

`FormMessage` now renders its derived body inside the existing message
paragraph. The Zod schema remains the single source for `Title is required` and
`Subject is required`. Existing `FormControl` behavior continues to set
`aria-invalid` and include the message ID in `aria-describedby`.

The empty-submit regression proves the title message is visible and associated,
the field is invalid, and the form remains rejected. The same shared
`FormMessage`/`FormControl` path renders and associates the subject error;
existing valid-create tests remain green and no create mutation is issued by
the empty submission.

## A11Y-004 — Mobile More Escape Behavior

**Root cause:** the mobile More disclosure had click/native Enter activation
but no scoped Escape behavior.

The mobile primary navigation now handles Escape only while its own More
disclosure is open. It closes the disclosure and focuses the retained More
button reference. Click/tap toggle, native Enter activation, destination links,
route-driven close behavior, and desktop navigation are unchanged.

The App Shell regression uses keyboard Enter to open, moves focus into the
disclosure, presses Escape, and verifies `aria-expanded=false` plus focus on
More.

## Files Changed

- `artifacts/revision-platform/src/components/app-shell.tsx`
- `artifacts/revision-platform/src/components/app-shell.test.tsx`
- `artifacts/revision-platform/src/components/membership-assessment-panel.tsx`
- `artifacts/revision-platform/src/components/membership-assessment-panel.test.tsx`
- `artifacts/revision-platform/src/components/responsive-form-panel.tsx`
- `artifacts/revision-platform/src/components/responsive-form-panel.test.tsx`
- `artifacts/revision-platform/src/components/ui/form.tsx`
- `artifacts/revision-platform/src/pages/study-plan.tsx`
- `artifacts/revision-platform/src/pages/study-plan.mutation.test.tsx`
- `artifacts/revision-platform/src/pages/past-papers.tsx`
- this report

## Verification

| Gate | Result |
| --- | --- |
| Focused Settings / Study Plan / Past Papers / App Shell / shared panel | PASS — 9 files, 95 tests |
| Full frontend suite | PASS — 48 files, 318 tests |
| Frontend typecheck | PASS |
| Frontend production build | PASS — local `PORT=3000`, `BASE_PATH=/` |
| Mechanical UI detector | PASS — no new findings emitted |
| `git diff --check` | PASS |

The first production-build invocation correctly stopped because the Vite
configuration requires explicit `PORT` and `BASE_PATH`; the recorded result is
the subsequent successful build with local-only values. The build emitted two
existing sourcemap-location warnings for tooltip/sheet modules and completed
successfully.

## Regression and Responsive Assessment

- B5D-006 warning implementation and semantics were not changed; Settings
  regression suites remain green.
- History option controls, route applicability, and persistence behavior remain
  covered by the Settings suites.
- Study Plan and Past Papers mutation/read-state suites remain green.
- The layout structure and sizing classes of Settings, Study Plan, Past Papers,
  responsive panels, and mobile navigation were not expanded or repositioned.
- The shared panel fix applies equally to its desktop Dialog and 390 × 844
  mobile Sheet branch; no new horizontal sizing, clipping, or overflow behavior
  was introduced.

## Final Verdict

**PASS**

The four Medium B5G-01 findings are corrected with shared implementations where
appropriate and all required local gates pass. The next separately authorized
slice is B5G-03: deploy the exact B5G-02 SHA and perform targeted Production
accessibility regression without repeating full B5E/B5F QA, globally enabling
new-seven subjects, or inviting real beta users.
