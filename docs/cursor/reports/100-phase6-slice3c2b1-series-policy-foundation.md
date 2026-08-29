# Phase 6 Slice 3C2B1 — Series Policy Foundation

- **Date:** 2026-08-29
- **Branch:** `phase6-slice3c2b1-series-policy-foundation`
- **Base `origin/main`:** `964dab8d1867f62907b8584442967bc0cf78390c`

## Baseline

`main` was clean at identity-adoption closeout. 6.3C2A remains CLOSED. Hosted journal head is still **0013_useful_husk**. Nine `r001` identities adopted. Applicability NULL. Strict assignment OFF. New memberships still pin DEFAULT.

## Owner model

Continuous 0011 range alone is insufficient. Automatic assignment also requires a version-owned `product_auto_assign = true` row for the declared series. v1 product series are May/June and Oct/Nov. Feb/Mar stays in the enum; automatic assignment is deferred. No geography/centre/official-availability columns.

## Migration 0014

`lib/db/migrations/0014_perpetual_nighthawk.sql` (journal `when` `1788044465654`).

0000–0013 unchanged. No Production seed rows. No hard-coded hosted version ids.

## Series-policy table

`syllabus_version_exam_series`:

- `syllabus_version_id` FK → `syllabus_versions.id` **ON DELETE CASCADE** (version-owned metadata; live pins still RESTRICT versions)
- `series` `exam_sitting_series` NOT NULL
- `product_auto_assign` boolean NOT NULL DEFAULT false
- PK `(syllabus_version_id, series)`

RLS enabled. PUBLIC/anon/authenticated table privileges revoked.

FALSE and ABSENT both fail closed. The table is not Cambridge availability truth.

## Resolver correction

`lockdin_resolve_applicable_syllabus_version` now requires published + complete range contain + matching policy row with `product_auto_assign = true` + exactly one row. Zero → `no_applicable_syllabus_version`. Many → `ambiguous_applicable_syllabus_version`. No `is_current` fallback. `search_path = ''`. EXECUTE still revoked from PUBLIC/anon/authenticated.

## Security

Resolver remains internal. Students cannot execute it. Clients do not select `syllabusVersionId` or see policy rows.

## Assignment remains DEFAULT

`lockdin_complete_onboarding*` and `lockdin_replace_user_subjects*` are **unchanged**. They still join `is_current = true`. Structured session is metadata only. No repin.

## Disposable proof

Harness reconstructs pre-0000 → 0014. Synthetic C2B1 fixtures only.

## Continuous-range regression

Range May/June 2026–Oct/Nov 2027 with May/June+Oct/Nov TRUE and Feb/Mar FALSE: MJ/ON resolve; Feb/Mar 2027 rejects.

## Legacy membership regression

NULL session pair + existing pin remains valid. C1 pin-aware reads unchanged. C2A session-foundation proof still passes after adding policy rows for its resolver cases.

## Tests

- Scripts / frontend / libs typecheck: PASS
- API unit: 136 passed; 1 existing auth-policy case (`DELETE /exam-dates/1`) returned 405 instead of 401 (method not routed). Unrelated to 0014.
- Frontend: 212 PASS
- Syllabus unit: 36 PASS
- Harness target-safety: 20 PASS
- Disposable `lockdin-db-harness` pre-0000 → 0014 including series-policy proof: PASS
- Stock API integration: NOT CLAIMED

## Deployment compatibility

0014 is additive plus an unused-for-assignment resolver body. Applying 0014 on hosted later, before C2B2, must not change live DEFAULT assignment. Current Production app does not require the new table.

## Hosted state

HOSTED 0014: **NOT APPLIED**

SERIES POLICY DATA: **NOT POPULATED**

APPLICABILITY DATA: **NOT POPULATED**

STRICT ASSIGNMENT: **NOT ENABLED**

NEW MEMBERSHIP SELECTOR: **LEGACY DEFAULT**

SECOND GRAPH: **NONE**

## Rollout boundary

Do not activate assignment in this slice.

## C2B2 prerequisites

1. 0014 deployed and healthy  
2. All selectable Production versions have owner-approved applicability windows  
3. Product-auto-assignment series rows populated consistently  
4. Intended-session capture adequate for v1 series  
5. Resolver fixtures remain PASS  
6. No ambiguous applicable versions  
7. Production data audit passes  
8. Owner explicitly authorizes tracked C2B2 cutover  

## Final verdict

Implementation on the feature branch only. Merge not performed.
