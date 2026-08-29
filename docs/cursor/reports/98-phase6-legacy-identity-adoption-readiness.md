# Phase 6 — Legacy Identity Policy Reconciliation and Adoption Readiness

- **Date:** 2026-08-29
- **Branch:** `phase6-syllabus-applicability-research`
- **Base `origin/main`:** `4ece69d1d4bf24ff7d88380f076a24576d1078e1`
- **Hosted mutation:** none
- **Adoption / applicability / C2B / 0014:** not performed

## Identity policy

Owner decision: `logical_revision_key` is an **internal Lockdin snapshot id**.

Approved convention: `{subjectCode}-rNNN`

Existing hosted legacy graph per subject: **r001**

Cambridge examination years are **not** encoded in the key.

Superseded (not erased): `{code}-{firstYear}-{lastYear}` (Report 96) and `{code}-{firstYear}-{lastYear}-v{N}` (Report 97).

External Cambridge edition remains provenance only. Example: `9489-r001` is the Lockdin graph; official History 9489 2027–2029 Version 2 (Images 718292) stays in the research artifact.

Internal identity readiness and external edition certainty are separate gates.

## Hosted baseline (read-only)

Authorized Session pooler; project ref check passed. `BEGIN READ ONLY` for inventory. Journal **14** rows. Head hash `2e9c58cc…d53dcde` / `when` `1788038002411` equals committed `0013_useful_husk.sql`. No 0014.

Nine subjects, **one** `published` + `is_current` version each. `logical_revision_key` NULL. `content_sha256` NULL. `source_file` matches the manifest CSV. Applicability NULL. No second graph.

Membership aggregates (no user ids): **12** `user_subjects` rows; **12** have a valid same-subject `syllabus_version_id`. Hosted `syllabus_version_id` is **NOT NULL**. Null pins: **0**. Subject/version mismatches: **0**. Missing referenced versions: **0**.

Report 98 originally said “15 rows; 13 have a version pin.” That was wrong. The 15 came from `subjects LEFT JOIN user_subjects` with `count(*)`: 9231, 9609, and 9618 have **zero** memberships, but the left join still produced one null-extended row each (`count(*) = 1`, `count(pin) = 0`). Real memberships are 12. The “13” was a further mis-sum of those mixed aggregates (the non-null pin filter on the same left join is 12, not 13). Pins were not changed.

## Graph verification

Source hashes: current importer (`parseAndValidateCsv` → `normalizeSyllabus` → `hashNormalizedSyllabus`).

Hosted hashes: `loadCanonicalGraphForVersion` + `hashCanonicalGraph` (same definition as adopt).

**9/9 MATCH.** No mismatches. No repair.

## Adoption contract

6.3B adopt does not require a verified Cambridge year. Each subject has:

1. exactly one identity-null candidate for subject + `source_file`
2. repository canonical fingerprint
3. hosted canonical fingerprint
4. exact hash equality
5. lifecycle `published`
6. no conflicting `logical_revision_key`
7. metadata-only NULL → key/hash would be the adopt write (not done)

Therefore all nine are **identity-adoption-ready** as `{code}-r001`.

The other eight remain **PROBABLE** externally. That does not block r001 adopt.

## Applicability

Still **NOT READY** for a nine-subject population batch. Only 9489 has a VERIFIED official edition. Range-only write remains unsafe. Official India-only March stays in provenance; automatic assignment stays May/June + Oct/Nov.

## Series model (design only)

Owner-approved future table (not created):

`syllabus_version_exam_series (syllabus_version_id, series, product_auto_assign)` unique on `(syllabus_version_id, series)`.

Answers product auto-assignment only. Does **not** encode official geographic eligibility. Do **not** add `official_availability` enum. C2B selects a version for a **declared** session. Centre / country / zone / entry eligibility are out of C2B v1. Feb/Mar remains in the enum; frontend omission is not a v1 blocker.

## C2B

Schema/resolver **design** can proceed: existing 0011 range + future product series table.

Strict cutover remains **blocked on authoritative applicability data**.

## Safety

No adopt, no populate, no import/publish, no pin change, no second graph, no 0014, no runtime commit.
