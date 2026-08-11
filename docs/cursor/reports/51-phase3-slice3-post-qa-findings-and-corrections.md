# Phase 3 Slice 3 — Post-QA Findings & Corrections

## Baseline

Branch: `phase3-s3-past-paper-ownership`

Starting SHA: `741425d790d7e36d51ff7fe11798c94b07a0186b`

Current HEAD: `741425d790d7e36d51ff7fe11798c94b07a0186b` (corrections intentionally uncommitted)

## Human QA Summary

Browser isolation: PASS

Security-critical blockers: NONE

Original QA findings: 5

The verifier's original QA report remains unchanged. The security-critical browser and hosted API/RLS evidence from that report remains valid.

## QA Cross-Reference Correction

- Test 5 → Finding 1: percentage precision.
- Test 7 → Finding 2: Dashboard paper-count expectation.
- Test 8 → Finding 2: Progress paper count.
- Test 9 → Finding 3: Subject Performance tooltip.
- Finding 4: component selector ambiguity.
- Finding 5: Dashboard Subject Mastery scope.

These corrections document the intended references without rewriting the verifier's evidence.

## Finding 1 — Percentage Precision

Root cause: Past Papers and the score-trend paths rendered raw floating-point percentages returned by the API.

Correction: Added one shared presentation formatter. It rounds to at most one decimal place and omits unnecessary `.0`, then applied it to Past Papers, the chart tooltip, and the accessible score-trend summary. Stored and server-calculated values are unchanged.

Tests: Integer and fractional formatter cases, Past Papers source wiring, chart-tooltip wiring, and accessible chart-summary output.

Result: PASS — examples render as `50%`, `66.7%`, and `80%`.

## Finding 2 — Paper Count

API: `totalPapersLogged` present.

Progress UI: Existing implementation is correct; no source fix was required. A focused render test now proves that `totalPapersLogged: 2` visibly renders under `Papers logged`.

Dashboard count: OUT OF SCOPE / NOT PART OF CURRENT CONTRACT.

Regression test: PASS.

Human Preview recheck: REQUIRED.

## Finding 3 — Tooltip

Root cause: Recharts tooltip styles used raw HSL component variables as CSS colors, so browser declarations were invalid and could fall back to an unreadable white surface.

Correction: Applied the repository's canonical `hsl(var(--token))` syntax to the tooltip border, card background, item foreground, and label foreground. Analytics data and calculations are unchanged.

Tests: Focused source regression test confirms valid foreground, background, and border token syntax and shared percentage formatting.

## Finding 4 — Component Selector

Root cause: Legitimate AS/A-Level assessment-component rows shared codes and names, while the selector rendered only `componentName`.

Database duplicates: NO.

Deduplication introduced: NO.

Correction: Each option now renders `paperCode — componentName — level`, for example `9709/1 — Paper 1 Pure Mathematics 1 — AS Level`. Every option retains its original component ID as the submitted value.

Tests: Representative same-code Math-style AS/A-Level fixtures remain as two options, have distinguishable labels, and preserve IDs `42` and `46`.

## Finding 5 — Subject Mastery

Pre-existing: YES.

Correction: Dashboard now uses the authenticated `/api/user-subjects` membership list as the source of truth and filters the existing catalogue order to those selected subject IDs. No ownership model or backend endpoint was added.

Tests: A catalogue containing subjects 1–4 renders only memberships 1 and 3. Rerendering with a second user's membership displays only subject 2 and does not retain subjects 1 or 3.

## Security Scope

Auth changed: NO

RLS changed: NO

Migration added: NO

Hosted DB changed: NO

## Validation

Typecheck: PASS — workspace libraries, API server, mockup sandbox, revision platform, and scripts.

Frontend tests: 74 PASS across 15 files.

API tests: NOT REQUIRED — generated contracts and backend code were unchanged.

Frontend build: PASS — Vite production build completed with the repository-required local `PORT=3000` and `BASE_PATH=/` configuration.

`git diff --check`: PASS.

## QA Retest Required

Percentage: YES

Progress count: YES

Tooltip: YES

Component selector: YES

Subject Mastery: YES

Full A/B security/isolation retest: NO

## Findings

BLOCKERS: NONE

NON-BLOCKING:

- Focused human Preview verification remains required for the five corrected/covered presentation paths.
- Dashboard does not gain a paper-count card because that is not part of its current contract.

## Verdict

A. POST-QA CORRECTIONS PASSED LOCALLY — READY FOR PREVIEW + FOCUSED HUMAN RETEST
