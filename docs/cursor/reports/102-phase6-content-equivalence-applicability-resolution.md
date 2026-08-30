# Phase 6 — Content-Equivalence Applicability Resolution

- **Date:** 2026-08-29
- **Branch:** `phase6-content-equivalence-applicability`
- **Base `origin/main`:** `202332973d5de722c0ab79ec9dc36c6a8619fd06`
- **Hosted mutation:** none
- **C2B2 / 0015 / populate / import / publish / repin:** not performed

## Model correction

Owner decision: `logical_revision_key` identifies an immutable **Lockdin content snapshot**. Official Cambridge PDFs are **external provenance**. Applicability is the **contiguous examination-session period** where that snapshot remains **materially equivalent** to official syllabus content and assessment.

The previous requirement that applicability wait until one r001 graph is proven to come from **exactly one** Cambridge PDF edition is **superseded**, not erased.

Example applied only where proven: 9702 official 2025–2027 and 2028–2030 are one r001 family. History 2026 is **not** merged into 9489-r001.

## Method

1. Re-read Reports 96–101 and `docs/reference-data/syllabus-applicability/` (schema 3).
2. Define material-equivalence criteria before subject conclusions.
3. Re-use Report 97 forensic CSV↔PDF comparisons; re-open official `cambridgeinternational.org/Images` PDFs and subject-page citations for adjacent predecessor and successor editions.
4. Require official change notes plus structural (topics/papers) agreement to raise **EQUIVALENT VERIFIED**.
5. Do not write hosted.

Unofficial sites were not used as authority.

## Material-equivalence criteria

Equivalent only if app-relevant meaning stays compatible: topics, subtopics, learning outcomes where represented, meaningful grouping/order, assessment components/codes/type/duration/marks/weighting, AS/A structure.

Breaks: added/removed topic, assessment-structure change, meaningfully changed outcome, component change. Minor editorial wording may be non-material. “No significant teaching changes” is supporting evidence and was checked against paper lists and topic titles.

Labels: EQUIVALENT VERIFIED / EQUIVALENT PROBABLE / NOT EQUIVALENT / UNRESOLVED.

## Subject content families

| Code | Official editions in family | r001 relation | Earliest | Latest | First known non-equivalent adjacent |
| --- | --- | --- | --- | --- | --- |
| 9231 | 597381 2023–2025; 697357 2026–2027 v3; 744603 2028–2030 | EQUIVALENT VERIFIED all three | 2023 May/June | 2030 Oct/Nov | No rewrite located before 2023 or after 2030 |
| 9489 | 718292 2027–2029 v2 only | EQUIVALENT VERIFIED vs 718292; 697368 2026 **NOT EQUIVALENT** | 2027 May/June | 2029 Oct/Nov | 2026 official edition |
| 9609 | 595459 2023–2025; 697371 2026–2028 v2 | EQUIVALENT VERIFIED | 2023 May/June | 2028 Oct/Nov | No 2029+ official PDF located |
| 9618 | 636089 2024–2025 v2; 697372 2026 v2; 721397 2027–2029 v2 | EQUIVALENT VERIFIED | 2024 May/June | 2029 Oct/Nov | 2021–2023 first-9618 lineage not used as window start |
| 9700 | 664560 2025–2027; 744622 2028–2030 | EQUIVALENT VERIFIED | 2025 May/June | 2030 Oct/Nov | 2022–2024 science family |
| 9701 | 664563 2025–2027; 744624 2028–2030 | EQUIVALENT VERIFIED | 2025 May/June | 2030 Oct/Nov | 2022–2024 science family |
| 9702 | 664565 2025–2027; 744626 2028–2030 | EQUIVALENT VERIFIED; 554625 2022–2024 **NOT EQUIVALENT** | 2025 May/June | 2030 Oct/Nov | 554625 2022–2024 |
| 9708 | 595463 2023–2025; 697423 2026–2028 | EQUIVALENT VERIFIED | 2023 May/June | 2028 Oct/Nov | No 2029+ official PDF located |
| 9709 | 597421 2023–2025; 697427 2026–2027 v4; 744634 2028–2030 | EQUIVALENT VERIFIED | 2023 May/June | 2030 Oct/Nov | No 2031+ official PDF located |

## Official edition evidence

Every family member is an official Images PDF already cited in Reports 96–97 plus adjacent official files located this pass (597381, 636089, 554625, 748946/747145/748950/729291 updates). History successor 2030+ was **not** found. 718219 is a related US-option document, not a reason to change 9489-r001.

Canonical source hashes remain those recorded at adopt (Report 99). This pass does not re-hash hosted.

## Assessment equivalence

All nine r001 CSVs keep the official paper-code families (9231/1–4, 9489 papers including Historical Sources, 9609/1–4, 9618/1–4 with 150-minute Paper 4, science 1–5, 9708/1–4, 9709/1–6). Across each verified family, June and November remain listed. March is India-only or not listed; **Feb/Mar automatic assignment stays DEFERRED**. June/November support did **not** change inside any verified family.

## Applicability boundaries

C2B v1 proposed endpoints use first supported May/June through last supported Oct/Nov of the verified family. History remains 2027 May/June–2029 Oct/Nov. Sciences do not extend into 2022–2024.

## Series verification

May/June and Oct/Nov: verified throughout **9/9** families. Geography/centre/zone remain provenance only.

## Distinct-version boundaries

| Code | NEXT DISTINCT SNAPSHOT REQUIRED | First official period needing a different graph |
| --- | --- | --- |
| 9231 | UNKNOWN | None located after 2030 |
| 9489 | YES | 2026 official 9489 (past); 2030+ unknown |
| 9609 | UNKNOWN | None located after 2028 |
| 9618 | UNKNOWN | None located after 2029 |
| 9700 | YES | 2022–2024 official Biology |
| 9701 | YES | 2022–2024 official Chemistry |
| 9702 | YES | 2022–2024 official Physics (554625) |
| 9708 | UNKNOWN | None located after 2028 |
| 9709 | UNKNOWN | None located after 2030 |

Do **not** import r002.

## Proposed Production data

Research-only. Do not write hosted.

| Code | From | To | Series rows |
| --- | --- | --- | --- |
| 9231-r001 | 2023 May/June | 2030 Oct/Nov | May/June true; Oct/Nov true |
| 9489-r001 | 2027 May/June | 2029 Oct/Nov | May/June true; Oct/Nov true |
| 9609-r001 | 2023 May/June | 2028 Oct/Nov | May/June true; Oct/Nov true |
| 9618-r001 | 2024 May/June | 2029 Oct/Nov | May/June true; Oct/Nov true |
| 9700-r001 | 2025 May/June | 2030 Oct/Nov | May/June true; Oct/Nov true |
| 9701-r001 | 2025 May/June | 2030 Oct/Nov | May/June true; Oct/Nov true |
| 9702-r001 | 2025 May/June | 2030 Oct/Nov | May/June true; Oct/Nov true |
| 9708-r001 | 2023 May/June | 2028 Oct/Nov | May/June true; Oct/Nov true |
| 9709-r001 | 2023 May/June | 2030 Oct/Nov | May/June true; Oct/Nov true |

No Feb/Mar rows (or false).

## Unresolved subjects

None lacking a verified r001 family. Forward bounds after the last official PDF remain **unknown**, not open-ended forever.

## C2B2 readiness

Schema/resolver (0014 + series-policy TRUE) is implemented. Production applicability and series rows are still **0**. Strict cutover remains **blocked** until owner authorizes a tracked populate + C2B2.

## Owner decisions

1. Accept these nine content-family windows as the applicability write set.
2. Accept May/June + Oct/Nov `product_auto_assign = true` only.
3. Authorize a later hosted populate workstream (not this branch).
4. Authorize C2B2 only after populate + audit.

## Final verdict

CONTENT-FAMILY RESEARCH: **PASS**

APPLICABILITY POPULATION: **READY FOR OWNER REVIEW**

C2B2: **BLOCKED** (data not written; assignment still DEFAULT)

HOSTED 0014: unchanged. SERIES POLICY DATA: not populated. APPLICABILITY: not populated. STRICT ASSIGNMENT: not enabled.
