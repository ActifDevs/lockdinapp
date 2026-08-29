# Phase 6 — Legacy Syllabus Identity Adoption

- **Date:** 2026-08-29
- **Research merge SHA:** `ddffa4fc2b6215ffe0f8489a704dfe73b609f83e`
- **Parents:** `4ece69d1d4bf24ff7d88380f076a24576d1078e1` `e1bc3dbb674aa7104ce0e6b9582cb11ac90c565e`
- **Hosted project:** `hazvcdrcvsxmuwdfiucx`
- **Mechanism:** `pnpm --filter @workspace/scripts syllabus:adopt` (one subject per invocation)

## Research merge

`phase6-syllabus-applicability-research` at `e1bc3db` (Report 98 membership correction after `a232d63`) merged `--no-ff` to `main` and pushed. Diff vs `origin/main` was five research/docs files only (Reports 96–98 + `docs/reference-data/syllabus-applicability/`). No runtime, migration, API, frontend, or secret files.

Report 98 on that merge records **12 / 12 / 0** memberships, not the superseded 15/13 wording.

## Identity policy

`logical_revision_key` is an **internal Lockdin immutable snapshot id**: `{subjectCode}-rNNN`. Hosted legacy graphs are `r001`. Cambridge examination years are not encoded. External provenance stays in the research artifact.

- `9489-r001`: VERIFIED Cambridge History 9489, 2027–2029 Version 2, Images 718292.
- Other eight: external edition remains **PROBABLE**.

## Pre-adoption hosted state

Journal **14** rows; head hash `2e9c58cc…d53dcde` / `when` `1788038002411` = `0013_useful_husk`. Nine published DEFAULT versions; keys/hashes/applicability NULL; drafts 0; proposed `*-r001` unused. Memberships 12; valid same-subject pins 12; null 0; mismatches 0. Pin fingerprint `3460451db93e0f6982c549e57030aa35`. Graph: 136 units, 520 topics, 3198 outcomes, 50 components, 4817 junctions. Tasks 14; topic_progress 39; past_paper_attempts 6.

## Adoption commands

Sequential, subject-code order. Each returned `LEGACY-ADOPTED` / Overall OK.

| Code | Command | Result | Stored sha256 |
| --- | --- | --- | --- |
| 9231 | `--files=9231 --revision=9231-r001` | PASS | `f3f2b9ce…e76e` |
| 9489 | `--files=9489 --revision=9489-r001` | PASS | `d451305b…26c7` |
| 9609 | `--files=9609 --revision=9609-r001` | PASS | `47bef670…23ef` |
| 9618 | `--files=9618 --revision=9618-r001` | PASS | `cbc4240d…ae75` |
| 9700 | `--files=9700 --revision=9700-r001` | PASS | `058a5aba…c1f6` |
| 9701 | `--files=9701 --revision=9701-r001` | PASS | `987a41ef…d486` |
| 9702 | `--files=9702 --revision=9702-r001` | PASS | `286920d0…43be` |
| 9708 | `--files=9708 --revision=9708-r001` | PASS | `5bfc60ac…0a8d` |
| 9709 | `--files=9709 --revision=9709-r001` | PASS | `e720d0d5…566a` |

No SQL adopt. No bulk `--files` list.

## Per-subject fingerprints

Post-adopt `loadCanonicalGraphForVersion` + `hashCanonicalGraph` equals stored `content_sha256` and the Report 98 pre-adopt source/hosted match for all nine.

## Adopted mappings

IDENTITY ADOPTION: **9/9 COMPLETE**

LOGICAL REVISION KEYS: **INTERNAL LOCKDIN SNAPSHOT IDs**

## Graph integrity

Units/topics/outcomes/components/junctions unchanged. Fingerprints unchanged.

## Membership/pin safety

user_subjects still 12; valid pins 12; null 0; mismatches 0. Pin fingerprint unchanged. Tasks / topic_progress / past_paper_attempts counts unchanged.

## Hosted state after adoption

Still 9 versions, 0 drafts, 0 second graph. Lifecycle published; `is_current` true; `source_file` and label unchanged. Applicability NULL **9/9**.

APPLICABILITY: **NOT POPULATED**

HOSTED SECOND GRAPH: **NONE**

MIGRATION 0014: **NOT CREATED** (journal still 14 / 0013)

STRICT ASSIGNMENT: **NOT ENABLED**

## Production smoke

Canonical `https://lockdinapp-web.vercel.app`:

| Request | Status |
| --- | --- |
| GET `/api/healthz` | 200 `{"status":"ok"}` |
| GET `/api/healthz/db` | 200 `{"status":"ok","database":"ok"}` |
| GET `/api/tasks` (anonymous) | 401 Unauthorized |
| GET `/api/subjects` | 200 catalogue |
| GET `/api/subjects/7` | 200 Physics 9702 |
| GET `/api/subjects/7/syllabus` | 200 |
| GET `/api/subjects/7/assessment-components` | 200 (5 components) |

No 5xx. No raw DB detail. No application-data write QA. Vercel log tooling was not available; smoke responses showed no runtime importer/adoption path.

## External provenance distinction

Adoption success does not promote the eight PROBABLE Cambridge editions to VERIFIED.

## Applicability status

APPLICABILITY POPULATION: **NOT READY**

## C2B boundary

Schema/resolver **design** remains: 0011 range + future `syllabus_version_exam_series (syllabus_version_id, series, product_auto_assign)`. Initial automatic series May/June + Oct/Nov; Feb/Mar deferred; geography out of v1. Strict cutover **blocked** on applicability data. **0014 not created.**

## Known limitations

Identity metadata does not change current DEFAULT assignment. Research branch HEAD at merge was `e1bc3db`, not the earlier known `a232d63`.

## Final verdict

IDENTITY ADOPTION: 9/9 COMPLETE

LOGICAL REVISION KEYS: INTERNAL LOCKDIN SNAPSHOT IDs

APPLICABILITY: NOT POPULATED

HOSTED SECOND GRAPH: NONE

MIGRATION 0014: NOT CREATED

STRICT ASSIGNMENT: NOT ENABLED

PHASE 6: IN PROGRESS
