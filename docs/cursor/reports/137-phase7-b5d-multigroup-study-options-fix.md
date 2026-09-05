# LOCKDIN — PHASE 7 B5D-F2 MULTI-GROUP STUDY-OPTION FIX

**Date:** 2026-09-05 UTC
**Status:** PASS WITH REVIEW NOTES — implementation and automated verification complete; Production browser QA deferred to B5D-R3; Preview/local browser NOT EXECUTED
**Baseline / Report 136 freeze:** `a9d4ae8ce02ad7a77d19c804b2bb75c649f37fa3` (`main`, matching `origin/main` at Part B start)
**Repository action:** Reviewable working-tree product + Report 137 diff only. No B5D-F2 commit, push, deployment, migration, hosted catalogue mutation, visibility change, membership backfill, or Production write.

## Scope and frozen evidence

| Report | Role |
| --- | --- |
| Report 134 | Original BLOCKED B5D browser run (B5D-001 / B5D-002) |
| Report 135 | B5D-F1 Settings route-enrollment fix |
| Report 136 | Post-F1 Production browser QA — **BLOCKED** on B5D-003 |
| Report 137 (this file) | B5D-F2 multi-group study-option selection fix |

Reports 134–136 were not modified.

### B5D-003 Production reproduction (Report 136)

- Production web/API SHA: `3467eeeb4e2198856fad301400edcd2d965036e9` (contained B5D-F1)
- History 9489 / May–June 2027 / syllabus version 19 / Full A Level
- Three required 1/1 groups: AS History Option; Paper 3 Prescribed Topic; Paper 4 Depth Study Option
- First group accepted one selection; second and third could not; Save stayed disabled
- No membership Save; pin snapshot unchanged; new seven hidden; Feb/Mar = 0

## Confirmed root cause

**CONFIRMED** — exactly as Report 136 diagnosed.

`toggleStudyOptionSelection` compared the **global** `selectedIds.length` to the **current group's** `maxSelections`. After any single selection, `selectedIds.length === 1` blocked every other 1/1 group.

`optionGroupValid` and `routeDraftValidationError` were already per-group. `StudyOptionPicker` already computed `groupSelected` per group for display. Only the toggle helper enforced a global cap. Server `lockdin_resolve_route_assignment` already requires each route-set group to satisfy its own cardinality and was **not** changed.

## Fix

### Before

```ts
if (selectedIds.length >= maxSelections) return selectedIds;
```

### After

```ts
const groupOptionIds = new Set(group.options.map((option) => option.id));
// membership by stable option IDs from the catalogue group
const groupSelectedCount = selectedIds.filter((id) =>
  groupOptionIds.has(id),
).length;
if (groupSelectedCount >= group.maxSelections) return selectedIds;
```

Signature now takes the group (`maxSelections` + `options`) so capacity is scoped by group membership IDs — not labels, subject codes, or array indices. Deselect of an already-selected option remains unconditional.

### Files changed

| File | Change |
| --- | --- |
| `artifacts/revision-platform/src/lib/route-selection.ts` | Per-group toggle semantics |
| `artifacts/revision-platform/src/components/study-option-picker.tsx` | Pass full `group` into toggle |
| `artifacts/revision-platform/src/lib/route-selection.test.ts` | History / Geography / Psychology / Sociology / no-option / multi-subject coverage |
| `artifacts/revision-platform/src/pages/settings.mutation.test.tsx` | Settings History 3×1/1 browser-style regression |
| `docs/cursor/reports/137-phase7-b5d-multigroup-study-options-fix.md` | This report |

No History-/Geography-/Psychology-/Sociology-specific product branches. No route-manifest, migration, catalogue, or visibility edits.

## Automated proof

### History 9489 (Production-shaped fixtures)

- Select one AS + one Paper 3 + one Paper 4 → total **3** selections with each group max 1
- Same-group second option blocked; deselect/reselect works
- Validation: 0/3, 1/3, 2/3 invalid; 3/3 valid
- `routeAssignments` payload: one route ID + three option IDs (one per group)

### Geography 9696 (catalogue/unit data; no visibility change)

- Group A 2/2 + Group B 2/2 → four total selections valid
- Third option in the same 2/2 group blocked

### Psychology 9990

- 0/1 invalid; 2 valid; third blocked

### Sociology 9699

- 0/1 invalid; 2 and 3 valid; catalogue has only three options (no fabricated fourth)

### No-option / multi-subject

- Economics-shaped zero-group catalogue valid after route choice
- History + Economics payload rows independent

### Settings UI regression

Focused Settings test selects Full A Level History with three 1/1 groups, proves Save enables only after all three, same-group over-select blocked, and payload `{ optionIds: [10, 14, 17] }`.

### Existing B5D-F1 regressions

Full Revision Platform suite (292) includes prior History single-group, Chemistry multi-route, session clear, multi-subject, retained null-route, and safe-error cases — all still PASS.

### Server / integration

Dedicated local HTTP/RPC integration suite re-run after unsetting an inherited hosted `DATABASE_URL` (target-safety gate): **PASS**. Existing cases continue to prove:

- missing/incomplete option cardinality → rejected, 0 writes
- invalid option → rejected, 0 writes
- valid multi-option assignment → atomic membership + option rows

Server validation was not weakened. No new migration. Migrations **0016 / 0017 / 0018** unchanged (diff name-only empty under `lib/db/migrations`).

## Preview / local browser QA

**NOT EXECUTED — PREVIEW BROWSER NOT AVAILABLE**

Do not treat automated tests as Production browser PASS. Post-deploy B5D-R3 must exercise History 9489 / May–June 2027 / Full A Level / three-group selection against Production.

## Production / data safety

| Check | Result |
| --- | --- |
| Hosted mutations | 0 |
| Deployment | NONE |
| New-seven visibility | UNCHANGED |
| Feb/Mar | UNCHANGED |
| Route manifests | UNCHANGED |
| New migration | NONE |

## Test results

| Suite | Result |
| --- | --- |
| Focused `route-selection` + `settings.mutation` | PASS (36) |
| `pnpm check:migrations` | PASS (19 / head `0018_…`) |
| Route-manifest | PASS (46) |
| Harness | PASS (44 passed / 1 skipped) |
| Scripts unit | PASS (44) |
| Revision Platform | PASS (292) |
| API unit | PASS (190) |
| Local HTTP/RPC integration | PASS |
| `pnpm typecheck` | PASS |
| `git diff --check` | PASS |

## Remaining post-deployment QA (B5D-R3)

After owner review, freeze, and Production deploy of the exact B5D-F2 SHA:

1. History 9489 / May–June 2027 / Full A Level — select all three 1/1 groups; Save; persist
2. Same-group over-select blocked in browser
3. B5D-002 actionable error path (deferred while Save was impossible)
4. Settings same-version route change; Study Plan; Past Papers; Progress; responsive; a11y
5. Cleanup + hosted invariants

Do **not** start B5E until B5D passes.

## Verdict

**PASS WITH REVIEW NOTES**

Review notes: Preview/Production browser confirmation remains for B5D-R3 after deploy.
