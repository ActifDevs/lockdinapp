# Phase 6 — Current Syllabus Edition Identification

- **Date:** 2026-08-29
- **Branch:** `phase6-syllabus-applicability-research`
- **Base `origin/main`:** `4ece69d1d4bf24ff7d88380f076a24576d1078e1`
- **Prior research:** Report 96 (status 9/9 PROBABLE)
- **Hosted mutation:** none

## Method

1. Re-read Report 96 and `docs/reference-data/syllabus-applicability/`.
2. Fingerprint each Lockdin CSV (BOM-aware): main topics, subtopics, learning outcomes, paper codes, durations, marks, weightings.
3. Download official Cambridge PDFs already cited in Report 96, plus adjacent editions and official syllabus-update PDFs.
4. Compare CSV strings to adjacent official editions. Prefer unique topic titles, removed options, and assessment rename over cover years.
5. Use git history of `data/syllabi/raw/` as supporting evidence only (`a2ad506`, `3547a9c`, 2026-07-27).
6. Do not raise VERIFIED without a discriminator where adjacent editions exist.

Unofficial sites were not used as authority.

## Official candidates

Examined official `cambridgeinternational.org/Images/…` PDFs include: 697357, 744603, 697368, 718292, 748946, 697371, 595459, 697372, 721397, 747145, 664560, 744622, 664563, 744624, 664565, 744626, 697423, 595463, 748950, 697427, 597421, 744634.

Every PDF prints an official **Version N** and a published month. Several year-spans have Version 2+ updates (same examination years, new document version).

## Structural fingerprints

All nine CSVs use the same importer columns. Distinctive repository facts:

- **9489:** twenty option titles including 2027-only Paper 4 themes; Paper 1 labelled Historical Sources.
- **9231 / 9709:** named Pure / Mechanics / Statistics papers with official durations.
- **9609:** Papers 1–4 Business Concepts / Decision-Making / Strategy.
- **9618:** Paper 4 Practical 150 minutes, 75 marks.
- **9700 / 9701 / 9702:** Papers 1–5 science pattern; biology CSV also stores Assessment objectives / Mathematical requirements as main topics (importer noise).
- **9708:** Papers 1–4 timings 60/120/75/120 minutes.

## Edition discriminators

**History is the only subject with a unique match.**

Official 2026 (697368) vs 2027–2029 (718292):

| Discriminator | Lockdin CSV | Official 2026 | Official 2027–2029 |
| --- | --- | --- | --- |
| AS Europe date range | Russia 1881–1924; Europe 1774-style options | Modern Europe, 1750–1921; Russian Revolution 1894–1921; four AS topics including Industrial Revolution in Britain | Modern Europe, 1774–1924; Russia from autocracy to revolution, 1881–1924; three AS topics |
| Paper 1 title | Historical Sources | Document question | Historical Sources |
| France key question | immediate **consequences** | immediate **outcomes** (2026 wording) | immediate **consequences** |
| Paper 4 extras | Malaysia/Indonesia; South Africa/Zimbabwe; A time of challenges: the USA 1961–74 | Different international/American depth themes (e.g. Britain 1919–39; China and Japan 1912–45) | Those CSV titles appear as new 2027 options |
| Official change log | — | One-year 2026 syllabus; content unchanged for 2026 | pp. 78–80: reviewed for first examination in 2027 |

Report 96’s France / Holocaust overlap is **non-discriminating** (both editions). That previous PROBABLE identity (2026) is superseded, not silently overwritten.

**All other subjects:** adjacent official PDFs state **no significant teaching changes**. CSV topic/LO fingerprints did not uniquely pick one examination-year PDF. Extract-only LO mismatches (chemistry, physics, business) were treated as **insufficient** after the same terms appeared in the later PDF.

## Assessment-component matching

Paper codes and timings agree with the official family for every subject. They do **not** unique-identify year-span except History’s Paper 1 rename (Document question → Historical Sources).

## Repository provenance

- `a2ad506` (2026-07-27): added all nine CSVs.
- `3547a9c` (2026-07-27): import corrections for history, biology, chemistry, mathematics.

No commit records an official Cambridge document id. History’s 2027 syllabus already existed by that date; that supports, but does not replace, the content match.

## Subject-by-subject result

| Code | Source file | Candidates examined | Best match | Official id / version | Years | Confidence | Identity ready | Applicability ready |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 9231 | `9231_further_mathematics.csv` | 697357, 744603 | 2026–2027 v3 (not unique vs 2028–2030) | 697357 / v3 | 2026–2027 | PROBABLE | NO | NO |
| 9489 | `9489_history.csv` | 697368, 718292, 748946 | **2027–2029 v2** | **718292 / v2** | **2027–2029** | **VERIFIED** | **YES** | NO |
| 9609 | `9609_business.csv` | 595459, 697371 | 2026–2028 v2 (not unique vs 2023–2025) | 697371 / v2 | 2026–2028 | PROBABLE | NO | NO |
| 9618 | `9618_computer_science.csv` | 697372, 721397, 747145 | 2026 v2 (not unique vs 2027–2029) | 697372 / v2 | 2026 | PROBABLE | NO | NO |
| 9700 | `9700_biology.csv` | 664560, 744622 | 2025–2027 v1 (not unique vs 2028–2030) | 664560 / v1 | 2025–2027 | PROBABLE | NO | NO |
| 9701 | `9701_chemistry.csv` | 664563, 744624 | 2025–2027 v1 (not unique vs 2028–2030) | 664563 / v1 | 2025–2027 | PROBABLE | NO | NO |
| 9702 | `9702_physics.csv` | 664565, 744626 | 2025–2027 v1 (not unique vs 2028–2030) | 664565 / v1 | 2025–2027 | PROBABLE | NO | NO |
| 9708 | `9708_economics.csv` | 595463, 697423, 748950 | 2026–2028 v2 (not unique vs 2023–2025) | 697423 / v2 | 2026–2028 | PROBABLE | NO | NO |
| 9709 | `9709_mathematics.csv` | 597421, 697427, 744634 | 2026–2027 v4 (not unique vs 2023–2025 or 2028–2030) | 697427 / v4 | 2026–2027 | PROBABLE | NO | NO |

History official series: June and November only. Not available in all administrative zones; not available in the US from 2027 (official change log). Lockdin has no zone model — recorded only.

## Logical revision key recommendation

**Recommend C-style:** `{subjectCode}-{firstExamYear}-{lastExamYear}-v{officialSyllabusVersion}`

Example: `9489-2027-2029-v2`

Store separately: Cambridge Images publication id, published month, official URL.

**YEAR-SPAN-ONLY KEY SAFE: NO**

Evidence of same-year-span amendments: 9709 2026–2027 Version 4; 9231 2026–2027 Version 3; 9609/9708 2026–2028 Version 2; 9618 2026 Version 2; 9489 2026 Version 3; official “syllabus update” PDFs (748946, 747145, 748950).

Images id alone is useful provenance but is a CMS filename, not the printed syllabus Version.

Do not apply keys hosted.

## March policy implications

Official India-only March remains recorded for 9609, 9700, 9701, 9702, 9708, 9709.

9231 / 9618 / 9489 (2027–2029): March not listed as available.

**Automatic assignment: DEFERRED** for India-only Feb/Mar.

**Initial automatic series: May/June + Oct/Nov.**

Feb/Mar stays in the Lockdin enum. No picker work in this pass.

## Series-model recommendation

Continuous 0011 range alone remains **INSUFFICIENT** (including verified History: May/June 2027 → Oct/Nov 2029 still contains Feb/Mar 2028 and 2029).

**Recommend:** child table `syllabus_version_exam_series` with:

- `series` (`exam_sitting_series`)
- `official_availability` (`global` / `india_only` / `not_offered` / `unresolved`)
- `product_auto_assign` (boolean)

Keep the 0011 validity range. Do not rely on UI-only restrictions. Do not implement here.

## Remaining ambiguity

Eight of nine graphs still cannot be tied to a single official examination-year PDF because Cambridge republishes near-identical teaching content across adjacent spans.

## Identity adoption readiness

**PARTIAL.** Only 9489 is VERIFIED. Prefer one later complete batch; do not adopt History alone unless the owner explicitly wants a single-subject trial.

## Applicability readiness

**NOT READY** for hosted population. History years/series are known, but range-only write would still be unsafe under the current resolver model.

## C2B implications

Design correction is specified enough for owner review: range **plus** version-level series rows (official vs product flags). Implementation still blocked on the eight unresolved identities if C2B is meant to cover all nine subjects.

## Owner decisions

1. Approve History identity `9489-2027-2029-v2` (Images 718292) and the key convention that includes official Version N.
2. For the other eight: accept PROBABLE “current teaching-family” keys, or wait for another discriminator (not available from these CSVs).
3. Approve child-table series model vs an enum array.
4. Confirm v1 automatic assignment is May/June + Oct/Nov only.
5. Do not authorize hosted adopt/populate from this branch.
