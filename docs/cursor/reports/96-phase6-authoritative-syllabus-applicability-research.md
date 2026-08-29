# Phase 6 — Authoritative Syllabus Applicability Research

- **Date:** 2026-08-29
- **Branch:** `phase6-syllabus-applicability-research`
- **Base `origin/main`:** `4ece69d1d4bf24ff7d88380f076a24576d1078e1`
- **Hosted mutation:** none
- **C2B / 0014 / adopt / import / publish:** not performed

## Baseline

`main` was clean and matched `origin/main` at C2A closeout. Hosted journal head remains **0013_useful_husk**. Strict assignment is off. New memberships still pin DEFAULT. Hosted identity and applicability remain unset. One published version per subject.

## Research method

1. Repository first: `manifest.ts`, nine CSVs under `data/syllabi/raw/`, reports 90/91/94/95, migrations 0011/0013.
2. Read-only hosted inventory (authorized Session pooler; no credentials here).
3. External discovery via search, then **official Cambridge International PDFs** as authority.
4. Search snippets and third-party sites were not used as evidence.

Unofficial evidence used as authority: **NO**.

## Current subject inventory

Hosted (2026-08-29, read-only): nine subjects, **one** `published` + `is_current` version each. `logical_revision_key` **null**. `content_sha256` **null**. `applicable_*` **null**. `label` = `Current syllabus`. `source_file` matches the manifest CSV name.

| Id | Code | Name | Source file |
| --- | --- | --- | --- |
| 1 | 9231 | Further Mathematics | `9231_further_mathematics.csv` |
| 2 | 9489 | History | `9489_history.csv` |
| 3 | 9609 | Business | `9609_business.csv` |
| 4 | 9618 | Computer Science | `9618_computer_science.csv` |
| 5 | 9700 | Biology | `9700_biology.csv` |
| 6 | 9701 | Chemistry | `9701_chemistry.csv` |
| 7 | 9702 | Physics | `9702_physics.csv` |
| 8 | 9708 | Economics | `9708_economics.csv` |
| 9 | 9709 | Mathematics | `9709_mathematics.csv` |

Manifest `validFrom` / `validTo` remain **null** by design (no guessed windows at import).

## Official source inventory

Every subject has at least one official `cambridgeinternational.org/Images/…-syllabus.pdf`.

Primary PDFs used (publication id in filename):

| Code | Primary official PDF | Years stated on cover |
| --- | --- | --- |
| 9231 | `697357-2026-2027-syllabus.pdf` | 2026 and 2027 |
| 9489 | `697368-2026-syllabus.pdf` | 2026 only |
| 9609 | `697371-2026-2028-syllabus.pdf` | 2026, 2027 and 2028 |
| 9618 | `697372-2026-syllabus.pdf` | 2026 only |
| 9700 | `664560-2025-2027-syllabus.pdf` | 2025, 2026 and 2027 |
| 9701 | `664563-2025-2027-syllabus.pdf` | 2025, 2026 and 2027 |
| 9702 | `664565-2025-2027-syllabus.pdf` | 2025, 2026 and 2027 |
| 9708 | `697423-2026-2028-syllabus.pdf` | 2026, 2027 and 2028 |
| 9709 | `697427-2026-2027-syllabus.pdf` | 2026 and 2027 |

Successor or predecessor official PDFs exist for several codes (for example 9702 `744626` 2028–2030; 9489 `718292` 2027–2029). Those are recorded as related documents, not as silent identity.

## Version identity mapping

**VERIFIED MATCH: 0/9**

**PROBABLE: 9/9**

**AMBIGUOUS: 0/9** (treated as probable-with-open-questions rather than a separate bucket)

**UNRESOLVED: 0/9** (official PDF obtained for every code)

No CSV contains an official examination-year field. Several consecutive official editions state **no significant teaching changes**. Therefore a graph can match the **specification family** without uniquely identifying **one** examination-year PDF. That fails the VERIFIED bar for automatic data preparation.

History is the sharpest edition risk: official 2026 is a one-year syllabus; official 2027–2029 changes content and assessment. CSV topics (including France 1774–1814 and The Holocaust) align with the **2026** official topic list, not automatically with 2027–2029.

## Proposed logical revision keys

Convention: `{subjectCode}-{firstExamYear}-{lastExamYear}`

Candidates (owner-approved only; **not applied**):

- `9231-2026-2027`
- `9489-2026-2026`
- `9609-2026-2028`
- `9618-2026-2026`
- `9700-2025-2027`
- `9701-2025-2027`
- `9702-2025-2027`
- `9708-2026-2028`
- `9709-2026-2027`

## Examination-year evidence

Official cover wording is recorded in `current-version-research.json`. First/last **calendar years** are stated on those PDFs. They are **not** hosted applicability.

Verified unique sitting endpoints for the Lockdin graph: **0/9** (edition not unique).

## Examination-series evidence

Official documents name **June** and **November** for all nine.

**March** appears as **India only** on: 9609, 9700, 9701, 9702, 9708, 9709 (and similarly worded later-edition science/maths PDFs).

**March not listed** on the primary 9231 2026–2027 and 9618 2026 PDFs.

**9489 2026** official PDF: syllabus is **no longer available in the March series**.

Lockdin enum mapping: March → `Feb/Mar`, June → `May/June`, November → `Oct/Nov`.

## Applicability endpoints

Proposed **only as research candidates** if the owner accepts the primary PDF edition:

| Code | From | To | Caveat |
| --- | --- | --- | --- |
| 9231 | 2026 May/June | 2027 Oct/Nov | No March in that PDF |
| 9489 | 2026 May/June | 2026 Oct/Nov | 2027+ is a different official syllabus |
| 9609 | 2026 May/June | 2028 Oct/Nov | March India-only |
| 9618 | 2026 May/June | 2026 Oct/Nov | 2027–2029 is a separate PDF |
| 9700 | 2025 May/June | 2027 Oct/Nov | March India-only |
| 9701 | 2025 May/June | 2027 Oct/Nov | March India-only |
| 9702 | 2025 May/June | 2027 Oct/Nov | March India-only |
| 9708 | 2026 May/June | 2028 Oct/Nov | March India-only |
| 9709 | 2026 May/June | 2027 Oct/Nov | March India-only |

Feb/Mar inside a multi-year May/June→Oct/Nov ordinal range is **not** thereby globally available.

## Validity vs series availability

**RANGE ALONE SAFE: NO**

0011 `applicable_session_range` is a continuous inclusive ordinal interval. That models **specification validity over ordered sittings**, not **who may sit March** or **whether March exists**.

**C2B SERIES-AVAILABILITY VALIDATION REQUIRED: YES**

Conceptual recommendation: **C — version-level allowed exam-series set**, used **together with** the 0011 range. Not UI-only. A subject-level table is weaker if editions differ (History 2026 vs 2027). Do not implement here.

## Feb/Mar findings

| March support (official primary PDF) | Codes |
| --- | --- |
| India only | 9609, 9700, 9701, 9702, 9708, 9709 |
| Not listed | 9231, 9618 |
| Explicitly withdrawn | 9489 (2026) |

Current frontend picker still omits Feb/Mar (6.3D). C2B must not treat enum membership as global availability.

## Content-match findings

Science and maths CSVs match official paper lists and numbered/named topics closely (9702 topics 1–25; 9709 papers 1–6; 9231 papers 1–4).

Biology CSV also stores “Assessment objectives” / “Mathematical requirements” as main topics — importer artefacts, not a second specification.

Chemistry CSV uses short component labels (“Paper 1”) while official titles are longer; codes 9701/1–5 match.

History CSV aligns with **2026** official option titles; **do not** assume 2027–2029.

**OWNER REVIEW REQUIRED** before identity adoption for every subject because the examination-year edition is a product choice.

AS and A Level are **one combined official specification** per code. Profile `level` must not select a different syllabus version.

## Unresolved subjects

None lacking an official PDF. All remain **unresolved as a unique Lockdin edition**.

## C2B implications

Current schema **cannot** safely assign if:

- the student picks Feb/Mar and the version’s continuous range contains that ordinal, but Cambridge offers March only in India or not at all;
- History 2026 vs 2027 windows would be different official graphs.

**C2B CURRENT MODEL SUFFICIENT: NO**

**C2B DESIGN CORRECTION REQUIRED: YES** (allowed-series on the version, plus range)

**C2B BLOCKED ON UNRESOLVED DATA: YES** (no VERIFIED unique edition; no owner-approved keys/windows)

## Adoption readiness

**HOSTED LEGACY ADOPTION READY: NO**

Prefer one later complete batch after owner picks keys. Partial adopt is not recommended.

IDENTITY ADOPTION READY per subject: **NO** (all nine).

## Applicability-population readiness

**HOSTED APPLICABILITY POPULATION READY: NO**

Year windows without a proven unique edition and without a series-availability model are not enough.

## Risks

- Adopting a key that names 2025–2027 while the CSV is actually an earlier identical-structure edition.
- Populating a May/June–Oct/Nov range that implies Feb/Mar globally.
- Treating History 2027–2029 as the current Lockdin graph.
- Inferring identity from `is_current`, filename, or calendar year (forbidden; not done).

## Owner decisions required

1. For each subject, which official examination-year PDF is **the** Lockdin current graph.
2. Approve or revise the `{code}-{from}-{to}` key convention.
3. Product rule for India-only March: store Feb/Mar as available, restrict by centre, or omit globally.
4. Approve C2B design: range **plus** version-level allowed series (recommended).
5. Authorize a later **complete** adopt + applicability population workstream (not this branch).

## Final verdict

Research artifact: `docs/reference-data/syllabus-applicability/`.

RESEARCH: **PARTIAL** (official sources found; unique edition not verified).

IDENTITY ADOPTION: **NOT READY**

APPLICABILITY POPULATION: **NOT READY**

C2B: **NEEDS DESIGN CORRECTION** and remains **BLOCKED** on owner edition choices.

STRICT ASSIGNMENT: **NOT ENABLED**
