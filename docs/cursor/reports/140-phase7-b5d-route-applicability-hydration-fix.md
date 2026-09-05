# LOCKDIN — PHASE 7 B5D-F3R ROUTE APPLICABILITY / HYDRATION FIX

**Date:** 2026-09-05 UTC
**Status:** PASS WITH REVIEW NOTES — implementation and automated local verification complete; Preview browser QA and a separately staged populated 0018→0019 rehearsal were not executed
**Report 139 freeze commit / B5D-F3R baseline:** `c9cc3cbc3980d2399d054bd15feaa480dcffa582` (`main`, matching `origin/main`)
**Repository action:** Report 139 alone was frozen and pushed. The B5D-F3R product implementation and this report remain uncommitted and unpushed for owner review. No deployment or hosted mutation was performed.

## Report 139 freeze

The authorized documentation freeze completed before product editing:

- starting `HEAD` and `origin/main`: `085d93765f186e4da1314402a9358599ef3bec4e`
- only working-tree file: Report 139
- freeze commit: `c9cc3cbc3980d2399d054bd15feaa480dcffa582`
- commit message: `docs: freeze B5D-F3 blocked assessment`
- pushed branch: `main`
- post-push `HEAD` = `origin/main` = `c9cc3cbc3980d2399d054bd15feaa480dcffa582`
- post-push working tree: clean

Report 139 remains a blocked assessment. Its B5D-004 and B5D-005 findings were not rewritten as implementation results.

## Root causes confirmed

### B5D-004

The membership read contract returned `assessmentRouteId` but not the persisted rows in `user_subject_option_selections`. `MembershipAssessmentPanel` therefore initialized every retained membership with `optionIds: []`, including after save/refetch.

### B5D-005

Canonical route-manifest applicability was correct. The defect existed in its consumers:

1. the route catalogue mapper dropped `applicableQualificationTarget`;
2. OpenAPI/generated clients did not expose it;
3. frontend rendering, validation, and payload formation used every group in the route set;
4. the migration 0018 resolver validated cardinality across every group and did not reject an option solely because its group was inapplicable to the selected route.

The authoritative rule is now implemented from structured data only:

`group target = both OR group target = selected route qualification target`

No route label, route ID, subject code, paper number, or array position is used to infer applicability.

## Additive migration 0019

Created `lib/db/migrations/0019_route_option_group_applicability.sql` and appended its journal entry. Migrations 0016, 0017, and 0018 are unchanged.

Migration 0019 replaces `public.lockdin_resolve_route_assignment` without changing its signature or its grants. The resolver now:

- reads the selected route ID and `qualification_target` from the authoritative `assessment_routes` row;
- retains the existing subject/version/route-set validation;
- deduplicates and sorts submitted option IDs;
- rejects unknown, wrong-version, wrong-route-set, and inapplicable options;
- performs generic min/max cardinality checks only for applicable groups;
- returns only the validated option IDs to the existing atomic apply/replace callers.

The existing write path remains authoritative and atomic. On Full A Level → AS Level, the caller deletes/replaces the prior option rows in the same transaction using the resolver result, so Paper 3/4 rows are removed while `syllabus_version_id` remains unchanged.

## Resolver before / after

| Concern                        | Before (0018)              | After (0019)                                                |
| ------------------------------ | -------------------------- | ----------------------------------------------------------- |
| Selected route target          | Not retained               | Read from the selected authoritative route row              |
| Required groups                | Every route-set group      | `both` or exact route-target match                          |
| Submitted option applicability | Any group in the route set | Inapplicable group is rejected                              |
| Cardinality                    | Every group                | Applicable groups only, generic min/max retained            |
| Atomic replacement             | Existing caller behavior   | Preserved; stale options removed from resolver output/write |

## Route catalogue and generated contracts

The route catalogue response now maps canonical `applicableQualificationTarget`. OpenAPI requires it on `StudyOptionGroupSummary` with `as_level`, `a_level`, and `both` values. The normal pinned Orval workflow regenerated API client and Zod types; generated files were not hand-authored.

`UserSubjectMembership` now requires `optionIds: number[]`, with an empty array for no selections.

## Membership option hydration

`GET /api/user-subjects` now reads `user_subject_option_selections` through the caller-scoped Supabase client with explicit user, subject, and syllabus-version predicates. Response construction additionally matches all three keys and sorts option IDs numerically.

Results:

- saved `assessmentRouteId` and saved option IDs hydrate together;
- no-selection memberships return `optionIds: []`;
- a null-route membership with stored option rows fails closed as inconsistent state rather than masking it;
- cross-user, cross-subject, and cross-version rows are excluded;
- the route-update response contains canonical route and option state.

`MembershipAssessmentPanel` hydrates from the canonical response, filters saved IDs through the selected route's applicable groups, and shows an actionable warning if stale canonical IDs are dropped. On a successful save it immediately hydrates from the returned canonical membership and then preserves the existing refetch callback, giving immediate and reload convergence.

## Shared frontend applicability

`applicableOptionGroups` is the single route-target derivation. `applicableOptionIds` reuses it. The derived set is used by:

- `StudyOptionPicker` rendering in Settings and onboarding;
- draft validation and save enablement;
- payload stale-ID filtering;
- initial membership hydration;
- route-change preservation/removal;
- post-save canonical convergence.

Unexpected or inapplicable submitted IDs still make a draft invalid before payload formation; payload construction also defensively filters through the same helper.

## History 9489 matrix

Production-shaped synthetic History data was used in dedicated local integration tests.

| Route target                 | Applicable groups              | Result                                                                         |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| AS Level (`as_level`)        | AS History (`both`)            | UI/helper exposes only AS; 0 invalid; 1/1 valid; server accepts AS option only |
| Complete A Level (`a_level`) | AS History + Paper 3 + Paper 4 | All three 1/1 groups required and accepted                                     |
| Full A Level (`a_level`)     | AS History + Paper 3 + Paper 4 | All three simultaneously required; same-group over-selection blocked           |

An AS payload containing Paper 3 is rejected by the resolver with zero writes. An AS payload missing the AS selection and a Full payload missing Paper 3 are also rejected with existing rows unchanged.

## Full → AS → Full proof

Starting state: Full A Level with AS + Paper 3 + Paper 4 options.

- selecting AS preserves only the still-applicable AS option in the frontend draft;
- Paper 3 and Paper 4 disappear from rendering and payload;
- the local server accepts the AS assignment;
- the database retains only the AS option row;
- the membership syllabus-version pin remains unchanged;
- selecting Full again restores all three required groups but does not resurrect removed Paper 3/4 values.

## Isolation and atomicity

Dedicated local HTTP/RPC tests proved:

- wrong-version and unknown options are rejected;
- cross-user membership updates are rejected;
- another user's membership/options do not appear in reads;
- invalid assignments produce zero writes / preserve previous rows;
- valid assignment replacement commits route and options atomically;
- Full → AS removes stale A-Level rows atomically without repinning.

## Generic regressions

Focused helper/Settings tests retain generic cardinality behavior:

- Geography 9696: independent 2/2 groups where applicable;
- Psychology 9990: 2/2;
- Sociology 9699: 2/3;
- Economics/no-option route: no picker and valid after route selection;
- multiple subjects: drafts and payloads remain independent;
- no subject-specific runtime branch was introduced.

The full frontend and API suites also retain B5D-001, B5D-002 safe-error handling, and B5D-003 per-group limits.

## Migration reproduction

The dedicated local Supabase HTTP/RPC run cleaned the disposable public schema, applied the pre-0000 bootstrap, and applied the committed migration chain from 0000 through 0019 before seeding and executing resolver integration tests.

- committed migration count: 20
- journal head: `0019_route_option_group_applicability`
- checksum/journal integrity: PASS
- fresh 0000→0019: PASS
- resolver integration after migration: PASS
- separately staged populated 0018→0019 rehearsal: NOT EXECUTED; the fresh run does execute 0019 immediately after 0018, but did not pause to seed a standalone 0018 checkpoint

## Verification

| Check                                                  | Result                                                   |
| ------------------------------------------------------ | -------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                       | PASS — lockfile already current                          |
| Supabase CLI                                           | PASS — pinned `2.109.1` available                        |
| Docker                                                 | PASS — `29.7.2` available                                |
| `pnpm check:migrations`                                | PASS — 20 migrations, head 0019                          |
| `pnpm --filter @workspace/scripts test:route-manifest` | PASS — 10 files, 46 tests                                |
| `pnpm --filter @workspace/scripts test:harness`        | PASS — 5 files, 44 passed, 1 intentional skip            |
| `pnpm --filter @workspace/scripts test:unit`           | PASS — 7 files, 44 tests                                 |
| Focused frontend B5D-004/B5D-005                       | PASS — 3 files, 43 tests                                 |
| Full Revision Platform                                 | PASS — 45 files, 299 tests                               |
| Focused API contract/resolver                          | PASS — 2 files, 5 tests                                  |
| Full API                                               | PASS — 37 files, 192 tests                               |
| Dedicated local HTTP/RPC integration                   | PASS — 6 files, 55 tests                                 |
| `pnpm typecheck`                                       | PASS — libraries, API, frontend, mockup sandbox, scripts |
| `git diff --check`                                     | PASS                                                     |

The full frontend run emitted one non-failing controlled/uncontrolled React warning in an unrelated Past Papers failure-path test. No B5D test failed.

## Preview / local browser

**NOT EXECUTED — PREVIEW BROWSER NOT AVAILABLE WITH A SAFE SEEDED AUTHENTICATED MEMBERSHIP SESSION.**

The equivalent hydration and Full → AS → Full behaviors were exercised through component tests and the dedicated disposable local HTTP/RPC environment. This is the review note preventing an unqualified PASS.

## Safety and unchanged boundaries

- Production migration applied: **NO**
- hosted mutations: **0**
- deployment: **NONE**
- product commit: **NONE**
- product push: **NONE**
- route manifest data changes: **NONE**
- migrations 0016 / 0017 / 0018: **UNCHANGED**
- Report 139 after freeze: **UNCHANGED**
- hidden-seven visibility mutations: **0**
- historical membership repins/backfills: **0**
- Feb/Mar enablement: **NONE**
- auth/config changes: **NONE**

Production remains on the previously frozen B5D-F2 application SHA pending owner review and a separately authorized cutover.

## Verdict

**PASS WITH REVIEW NOTES**

The code and automated local evidence satisfy B5D-F3R. Owner review should freeze the implementation before any hosted action. Preview browser QA and, if desired, a populated standalone 0018→0019 rehearsal remain review/cutover gates. B5E was not started.

## Recommended next step

Owner review + freeze B5D-F3R. Then, in a separately authorized cutover:

1. create a fresh Production backup;
2. restore/rehearse through migration 0019;
3. apply exact migration 0019 to Production;
4. deploy the exact frozen application SHA;
5. verify migration head, deployment SHA, and invariants;
6. run final B5D-R4 Production browser QA;
7. close B5D only if R4 passes.

Do not start B5E.
