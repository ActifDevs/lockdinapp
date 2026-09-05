# LOCKDIN — PHASE 7 B5D-F3 SETTINGS HYDRATION / ROUTE-OPTION FILTER ASSESSMENT

**Date:** 2026-09-05 UTC
**Status:** BLOCKED — the canonical applicability data is correct, but the authoritative route-assignment resolver ignores it; the requested no-migration boundary prevents a safe complete B5D-005 fix
**B5D-R3 freeze / B5D-F3 baseline:** `085d93765f186e4da1314402a9358599ef3bec4e` (`main`, matching freshly fetched `origin/main`)
**Repository action:** Report 138 was already frozen and pushed by commit `085d937`. This assessment report is the only working-tree change. No product code, migration, route manifest, syllabus CSV, catalogue visibility, hosted data, commit, push, or deployment change was made.

## Part A — Report 138 freeze

Part A was already complete at task start:

- branch: `main`
- `HEAD` = freshly fetched `origin/main` = `085d93765f186e4da1314402a9358599ef3bec4e`
- commit: `085d937 docs: freeze B5D-R3 browser QA`
- parent: `c760e76fdcb95144efa91bd9ab4c84af03e376a5`
- Report 138 is clean and tracked by the freeze commit
- working tree before Part B: clean

Reports 134–138 were read and remain unchanged. Report 138 facts and NOT EXECUTED items were not rewritten.

## B5D-004 — confirmed root cause

The canonical membership read contract does not expose saved study-option IDs, and the retained-membership panel explicitly initializes an empty list.

Evidence:

1. `GET /api/user-subjects` reads `user_subjects` only. `MEMBERSHIP_SELECT` contains `assessment_route_id` but no option-selection relation.
2. `buildMembershipResponse` returns `assessmentRouteId` but no `optionIds`.
3. OpenAPI `UserSubjectMembership` and generated API types contain no `optionIds` field.
4. `MembershipAssessmentPanel` loads the version-scoped route catalogue, then sets `routeId` from `membership.assessmentRouteId` and unconditionally sets `optionIds: []`.
5. The assessment-route PUT readback uses the same `listMemberships` path, so even a successful save returns no canonical option IDs. The subsequent Settings refetch repeats the empty hydration.
6. Report 138 independently observed route 13 and option rows 1 / 4 / 7 persisted in the database while the three checkboxes reset to empty.

Classification: **B — the API does not return optionIds and must expose them.** The frontend is also written to discard them because the current type has no such state.

Required safe fix, not applied in this blocked slice:

- add required `optionIds: number[]` to `UserSubjectMembership`;
- read caller-owned `user_subject_option_selections` scoped by user, subject, and syllabus version;
- map sorted canonical option IDs per membership;
- regenerate typed clients;
- initialize the retained draft from the membership response only after filtering against the selected route's applicable catalogue groups;
- use the mutation response or a canonical refetch after save so immediate and reload state converge.

This expansion is backward-safe for clients that ignore the new response field, but it requires contract, server, generated-client, frontend, and focused isolation tests.

## B5D-005 — revised root cause

The route-manifest data is not defective. The canonical History 9489 r002 manifest states:

| Group | `qualificationTarget` |
| --- | --- |
| AS History Option | `both` |
| Paper 3 Prescribed Topic | `a_level` |
| Paper 4 Depth Study Option | `a_level` |

Routes use structured targets: AS is `as_level`; Complete A Level and Full A Level are `a_level`. The established manifest validation rule is `both` or exact target equality.

Three separate consumers currently fail to preserve that rule:

1. `loadPublishedRouteCatalogue` reads full group rows but omits `applicableQualificationTarget` when mapping `optionGroups`.
2. OpenAPI `StudyOptionGroupSummary` and generated client types omit applicability, so the frontend cannot filter structurally.
3. `routeDraftValidationError`, `StudyOptionPicker`, and `routeAssignmentsPayload` operate on every catalogue group.

The authoritative database resolver has the same defect. In migration 0018, `lockdin_resolve_route_assignment` selects the chosen route ID but does not retain its qualification target. Its cardinality loop validates every study-option group on the route set, with no `applicable_qualification_target` predicate. It also accepts any option belonging to any group on the route set, rather than rejecting options from groups inapplicable to the chosen route.

Consequences:

- a client-only AS filter would render only the AS group and mark the draft valid;
- the resulting AS payload would contain only an AS option;
- the server would still require Paper 3 and Paper 4 and reject the assignment with invalid option cardinality;
- preserving hidden A-Level values in the payload would violate the requested stale-option and applicability requirements.

Therefore a frontend-only change would create a false-valid UI and is not safe.

## Blocking boundary

Completing B5D-005 requires the authoritative resolver to:

- derive the selected route's `qualification_target`;
- validate cardinality only for groups whose target is `both` or matches the route target;
- reject selected options belonging to inapplicable groups;
- continue enforcing subject, route-set, syllabus-version, group, and caller isolation;
- atomically replace old option rows with only the resolved applicable IDs.

Changing a deployed PostgreSQL function requires a migration or an explicitly approved equivalent schema deployment. The task says:

- do not modify 0016 / 0017 / 0018;
- no new migration expected;
- do not weaken server validation;
- server remains authoritative.

The first restriction correctly prevents rewriting history. The second prevents adding the new migration needed to fix the authoritative function. No client/API workaround can meet all required behavior without violating server authority or payload safety. Product editing stopped at this contradiction.

## History matrix at stop

| Route | Canonical applicable groups | Current client | Current resolver | Result |
| --- | --- | --- | --- | --- |
| AS Level | AS History Option only | shows/validates all three | validates all three | FAIL |
| Complete A Level | AS History + Paper 3 + Paper 4 | shows/validates all three | validates all three | Semantics coincide, not newly verified |
| Full A Level | AS History + Paper 3 + Paper 4 | shows/validates all three | validates all three | Existing B5D-003 behavior preserved |

No route IDs or labels were used to infer applicability.

## Hydration, stale options, and payload

- persisted route hydration: current route ID hydrates; option IDs do not
- reload/refetch hydration: FAIL in current contract
- post-save canonical state: FAIL for options in current contract
- route-change clearing in current panel: clears all option IDs
- route-aware stale-option filtering: not implemented because the catalogue and resolver contracts are incomplete
- AS payload acceptance: impossible under current resolver without supplying inapplicable A-Level options

No data loss was caused by this assessment. Report 138 remains the evidence that persisted option rows were intact despite the empty UI.

## Existing membership and release safety

- syllabus version pin: no mutation
- legacy null route: no mutation
- progress, tasks, notes, and past-paper history: no mutation
- historical repin: 0
- historical route backfill: 0
- hidden-seven visibility mutations: 0
- Production mutations: 0
- deployment: none

## Files changed

- `docs/cursor/reports/139-phase7-b5d-settings-hydration-route-option-filter-fix.md` — blocked root-cause assessment only

Reports 134–138, migrations 0016–0018, route manifests, syllabus CSVs, and product code are unchanged.

## Verification

| Check | Result |
| --- | --- |
| Fresh fetch / branch / SHA / clean baseline | PASS |
| Report 138 freeze | PASS — already committed and pushed as `085d937` |
| Frozen Reports 134–138 unchanged | PASS |
| B5D-004 read-contract trace | PASS — root cause confirmed |
| History applicability metadata trace | PASS — manifest data correct |
| Authoritative resolver trace | FAIL — applicability is ignored |
| Focused frontend test execution | NOT EXECUTED — workspace test binaries are unavailable (`vitest` not found) |
| Dedicated local Supabase integration | NOT EXECUTED — Supabase CLI is unavailable in this workspace environment |
| Full suites / typecheck | NOT EXECUTED — no product fix exists and workspace dependencies are unavailable |
| Preview browser | NOT EXECUTED — product fix blocked before preview |
| `git diff --check` | PASS |

## Production

Hosted mutations: **0**
Deployment: **NONE**
Production remains on the previously frozen B5D-F2 application SHA `c760e76fdcb95144efa91bd9ab4c84af03e376a5` as recorded by Report 138.

## Verdict

**BLOCKED**

B5D-004 and B5D-005 root causes are confirmed/revised, but no safe complete product fix can be produced under the no-migration boundary. B5D is not closed. B5E was not started. New-seven visibility was not changed.

## Required owner decision

Authorize an additive migration (without modifying 0016–0018) that replaces `lockdin_resolve_route_assignment` with route-target-aware applicability validation, alongside the scoped API/frontend contract changes above. Then rerun the full B5D-F3 implementation, local HTTP/RPC integration, automated suites, and Preview QA before freeze/deploy/R4.
