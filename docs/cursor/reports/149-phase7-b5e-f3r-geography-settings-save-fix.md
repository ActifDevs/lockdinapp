# LOCKDIN - PHASE 7 B5E-F3R GEOGRAPHY SETTINGS SAVE FIX

**Date:** 2026-09-06 UTC

**Status:** PASS - local implementation complete; Production unchanged

## Defect

- **ID:** B5E-001
- **Title:** Geography valid 2/2 + 2/2 selection leaves Settings `Save
  subjects` disabled
- **Severity:** HIGH
- **Release impact:** Blocks controlled Geography enrollment through Settings
- **Data-integrity impact:** NONE OBSERVED
- **Backend contract:** PASS
- **Frontend save-state:** FAILED before this fix

Report 148 is preserved as the historical controlled QA record and was frozen
with disposition **BLOCKED - GEOGRAPHY SETTINGS SAVE-STATE DEFECT**.

## Root Cause

Settings save readiness, route rendering, and request construction were not
driven by one explicit validation result. The parent save gate consumed only a
string error helper while option rendering and payload construction separately
derived applicable groups and option IDs. This made multi-group validity
implicit and left no shared contract proving that two independently complete
2/2 groups constituted one valid assignment.

The backend/API accepted the valid Geography assignment. No database,
migration, visibility, or Production defect was found.

## Fix

Added the generic `validateRouteDraft` contract in
`artifacts/revision-platform/src/lib/route-selection.ts`. It returns the
applicable groups, applicable option IDs, and one validation result enforcing:

- valid route selection;
- each applicable group's own `minSelections` / `maxSelections`;
- no inapplicable, unknown, or duplicate option IDs;
- valid no-option routes.

Settings, onboarding route rendering, and the retained-membership assessment
panel now consume this shared validation result. No subject-specific Geography
branch or hardcoded subject ID was added.

## Geography Proof

The frontend tests prove:

- Paper 3 at 0/2 and 1/2 is invalid;
- Paper 3 at 2/2 is valid;
- Paper 4 at 0/2 and 1/2 is invalid;
- Paper 4 at 2/2 is valid;
- combined 2/2 + 2/2 enables `Save subjects`;
- a third selection in either 2/2 group is blocked;
- the request payload contains exactly four valid option IDs.

## Regression Matrix

- History 9489, three independent 1/1 groups: PASS
- Psychology 9990, 2/2 group: PASS
- Sociology 9699, 2/3 group: PASS
- No-option route: PASS
- Representative route/session Settings mutations: PASS

Existing assessment-panel hydration and applicability tests remain passing.

## Files Changed

- `artifacts/revision-platform/src/lib/route-selection.ts`
- `artifacts/revision-platform/src/lib/route-selection.test.ts`
- `artifacts/revision-platform/src/pages/settings.tsx`
- `artifacts/revision-platform/src/pages/settings.mutation.test.tsx`
- `artifacts/revision-platform/src/components/onboarding-route-step.tsx`
- `artifacts/revision-platform/src/components/membership-assessment-panel.tsx`
- This report

## Test Results

- Focused frontend tests: **45 passed**
- Full frontend suite: **305 passed across 46 test files**
- Frontend typecheck: **PASS**
- Frontend production build: **PASS** with `PORT=3000 BASE_PATH=/`
- Initial build invocation without required environment variables was blocked by
  the existing Vite configuration; no source failure was involved.
- `git diff --check`: **PASS**

## Production Boundary

- Production changes: **NONE**
- Deployment: **NONE**
- Migration changes: **NONE**
- Global new-seven visibility changes: **NONE**
- Visibility grants: **0**
- Temporary new-seven memberships: **0**
- Real beta invitations: **NONE**
- B5D-006: **OPEN - MEDIUM**

## Final Verdict

**PASS**

The generic frontend validation fix is locally verified. The next separately
authorized slice is B5E-F3R2: deploy and perform a targeted Geography browser
retest. Do not repeat the full seven-subject QA, enable global new-seven
visibility, or invite real beta users.
