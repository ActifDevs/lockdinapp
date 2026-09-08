# LOCKDIN — PHASE 7 B5G-03R STUDY PLAN SUBJECT VALIDATION FIX

**Date:** 2026-09-08 UTC

**Status:** PASS — the remaining A11Y-003 Subject validation-copy defect is
fixed locally; no Production deployment or mutation occurred

## Repository Baseline

- B5G-03 blocked-report SHA:
  `75f84f1386d9e258f241a33804fb9c887e2a5ab4`
- Starting branch: `main`
- Starting state: clean, with `HEAD = origin/main`
- Frozen historical record:
  `docs/cursor/reports/155-phase7-b5g-03-accessibility-production-regression.md`

Report 155 remains unchanged and preserves the Production reproduction and
BLOCKED conclusion.

## A11Y-003 Production Reproduction

B5G-03 established that empty Add task submission rendered:

- Task Title: `Title is required`
- Subject: `Expected number, received nan`

Both messages were visible and associated, but the Subject message exposed raw
coercion terminology rather than user-facing required-field guidance.

## Exact Root Cause

The Study Plan schema used:

`z.coerce.number().min(1, "Subject is required")`

The Radix Select has no selected value in its placeholder state, and React Hook
Form therefore supplied `undefined` for `subjectId`. Zod numeric coercion
converted `undefined` and non-numeric strings to `NaN`. That failed the number
type check before `.min(1, "Subject is required")` could run, producing Zod's
default `Expected number, received nan` message. The already-fixed shared
`FormMessage` correctly displayed this schema output; it was not the remaining
fault.

Independent characterization confirmed:

- `""` coerced to `0` and reached the required message;
- `undefined` coerced to `NaN` and produced raw type copy;
- a non-numeric string also produced raw type copy; and
- a numeric subject ID string was accepted.

## Schema-Level Fix

The schema now owns two explicit input classes:

- `""`, `undefined`, and `null` are preprocessed to the empty numeric sentinel
  `0`, then produce `Subject is required` through the existing minimum rule;
- non-numeric values produce `Select a valid subject` through the number
  schema's explicit invalid-type message.

Valid numeric subject ID strings continue to coerce to numbers. Positive IDs
retain the existing client behavior; unknown or disallowed positive IDs remain
subject to the unchanged server-side validation contract. No validation text
is replaced in the UI, no special case was added to `FormMessage`, and no
server-side validation was weakened.

## Files Changed

- `artifacts/revision-platform/src/pages/study-plan.tsx`
- `artifacts/revision-platform/src/pages/study-plan.mutation.test.tsx`
- `docs/cursor/reports/156-phase7-b5g-03r-study-plan-subject-validation-fix.md`

## Validation Proof

| Contract                                     | Result                                                       |
| -------------------------------------------- | ------------------------------------------------------------ |
| Empty-string Subject                         | PASS — `Subject is required`                                 |
| Undefined Subject / actual placeholder state | PASS — `Subject is required`                                 |
| Null Subject                                 | PASS — `Subject is required`                                 |
| Non-numeric Subject                          | PASS — `Select a valid subject`; no number/NaN/internal copy |
| Valid numeric Subject ID string              | PASS                                                         |
| Title and Subject both empty                 | PASS — both messages visible                                 |
| Subject `aria-invalid`                       | PASS — `true`                                                |
| Subject association                          | PASS — `aria-describedby` includes rendered message ID       |
| First-invalid focus                          | PASS — Task Title                                            |
| Invalid submission mutation                  | PASS — no create mutation                                    |
| Existing valid create behavior               | PASS                                                         |

The Study Plan Select test double now exposes the actual trigger as a labelled
combobox while retaining the native option harness used by existing valid-flow
tests. This permits direct regression proof of the Subject field's invalid and
described-by state.

## Regression Matrix

| Gate                                             | Result                     |
| ------------------------------------------------ | -------------------------- |
| Focused Study Plan validation                    | PASS — 1 file, 9 tests     |
| Study Plan + bounded A11Y-001/002/004 regression | PASS — 6 files, 37 tests   |
| Full frontend suite                              | PASS — 48 files, 322 tests |
| Frontend typecheck                               | PASS                       |
| Frontend production build                        | PASS                       |
| `git diff --check`                               | PASS                       |

The production build used required local-only `PORT=3000` and `BASE_PATH=/`
values. It completed with the existing base-path and sourcemap-location
warnings; no build failure occurred.

The mechanical UI detector repeated four pre-existing rounded-tab border
warnings in unchanged Study Plan tab markup. This slice did not alter those
lines or introduce a new detector finding.

## Preserved Accessibility and Product Boundaries

- A11Y-001 route-radio keyboard behavior: **UNCHANGED / PASS**
- A11Y-002 shared focus restoration: **UNCHANGED / PASS**
- A11Y-004 mobile More Escape behavior: **UNCHANGED / PASS**
- B5D-006 warning implementation: **UNCHANGED**
- Study Plan valid mutation/retry behavior: **UNCHANGED / PASS**
- API and database behavior: **UNCHANGED**

## Production and Release Safety

- Production changes: **NONE**
- Deployment: **NONE**
- Migrations: **NONE**
- Database changes: **NONE**
- Vercel configuration changes: **NONE**
- Subject visibility changes: **NONE**
- Real beta invitations: **NONE**

## Final Verdict

**PASS**

The next separately authorized slice is B5G-03R2: deploy the exact B5G-03R SHA
and repeat only the Study Plan empty-Subject Production validation check. Do not
repeat the other three accessibility tests unless an unexpected regression
appears. Do not repeat B5E/B5F QA, enable new-seven subjects globally, or invite
real beta users.
