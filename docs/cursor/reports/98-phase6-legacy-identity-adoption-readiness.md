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

Membership aggregates (no user ids): 15 `user_subjects` rows; 13 have a version pin. Pins were not changed.

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
