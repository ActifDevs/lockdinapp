# LOCKDIN — PHASE 7 STUDY-ROUTE OFFICIAL EVIDENCE AUDIT

**Report:** 121

**Date:** 2026-09-03

**Status:** DOCUMENTATION-ONLY EVIDENCE AUDIT — OWNER REVIEW REQUIRED

**Scope:** all nine current Cambridge International AS & A Level subjects pinned to Lockdin `r001` syllabus versions
**Implementation authority:** none. This report does not authorize migration `0016`, route manifests, schema/data/source/test changes, or hosted writes.

## Executive conclusion

The official Cambridge evidence is sufficient to enumerate the qualification routes for all nine current subjects. The inventory is **34 canonical route variants**:

- 5 for Further Mathematics 9231;
- 8 for Mathematics 9709; and
- 3 each for History 9489, Business 9609, Computer Science 9618, Biology 9700, Chemistry 9701, Physics 9702, and Economics 9708.

No reviewed official syllabus in the pinned `r001` families changes its valid paper combination by examination series. A route-specific series-availability relation is therefore **not justified by this audit**. Version-level series policy remains the correct first gate. Regional availability is separate: March is India-only where offered, and History 9489 is unavailable to US schools from 2027.

The audit does **not** clear all nine route manifests for publication. The approved generic model is adequate for qualification target, single-series/staged/full pathway, progression eligibility, and current-sitting/carried-forward roles. Two evidence findings prevent a safe all-nine backfill without a small design correction:

1. **Qualification weighting is route-contextual, not an invariant component fact.** Six graphs contain Papers 1–2 or 1–3 only under `AS Level`, with AS weightings, while the same papers contribute different A Level weightings in a full same-series route. The proposed route-component relation deliberately carries no weighting. A full A Level route can resolve an existing component ID, but it cannot return the official A Level weighting from the current graph.
2. **History has independently chosen and year-rotated content inside fixed papers.** The official qualification route is still Papers 1+2 or Papers 1–4, but the current r001 occurrence mapping hard-codes the 2027 Paper 1/Paper 2 rotation and cannot express the 2028 or 2029 rotation, nor the student's independent Paper 3 and Paper 4 topic choices. Component-only route relevance therefore cannot provide precise History outcome focus.

Accordingly:

- **Evidence-backed and backfillable now:** 9231, 9700, 9709.
- **Official route evidence complete but reference-model correction required before publication:** 9489, 9609, 9618, 9701, 9702, 9708.
- **All-nine route-mandatory cutover:** blocked until those two generic modeling questions are resolved and the corrected natural-key/outcome mappings are reviewed.

No Production user data was inspected. Existing membership cardinalities and user route distributions remain unknown.

## Audit boundary and method

This audit used, in descending authority:

1. the exact official Cambridge syllabus PDFs and their assessment-route tables;
2. the official Cambridge qualification page for each exact subject code, including notices;
3. official syllabus updates where a current page identified one; and
4. repository evidence: the Phase 6 applicability research, population manifest, nine 12-column CSVs, current canonical hashes, and the approved Report 120 product/design decisions.

Unofficial revision sites, tutoring sites, summary tables, and inferred paper combinations were not used. Similarity between subjects was never treated as evidence: the Chemistry and Physics tables were checked independently even though their structures match Biology.

The PDFs were downloaded only into a temporary audit directory for extraction and hashing. They were not added to the repository. PDF SHA-256 values in the source register below identify the bytes retrieved on 2026-09-03; they are source-provenance hashes, not Lockdin syllabus content hashes.

## Interpretation rules

- A **route** is one official qualification/pathway/component-role combination, not an arbitrary bag of papers.
- AS choices which lead to different future progression or different staged completion papers are distinct canonical routes.
- A staged route lists prior AS papers as `carried_forward` and completion papers as `current_sitting`.
- A full same-series A Level route lists every required paper as `current_sitting`.
- An AS-only route has `qualificationTarget=as_level`, `pathwayType=single_series`; completed A Level routes use `qualificationTarget=a_level` with `staged_completion` or `full_same_series`.
- `progressionEligibility=not_applicable` for completed A Level routes. AS is `eligible` except Mathematics Papers 1+2, which is explicitly `not_eligible`.
- Candidate keys below are review candidates, not created manifest keys.
- Paper codes are matched to the existing Lockdin natural key `(syllabus version, paper code, level)`. The listed `AS`/`A` suffix is the current CSV `Level` value used for resolution, not a separately editable membership qualification.

## Pinned r001 identity register

All hashes below are the already-reviewed canonical graph hashes in `docs/reference-data/syllabus-applicability/population-manifest.json`. This task did not recompute, change, or republish them.

| Subject | r001 key | Existing content SHA-256 | Product applicability | Existing automatic series policy |
| --- | --- | --- | --- | --- |
| Further Mathematics 9231 | `9231-r001` | `f3f2b9ce60a90826da78a123dad8ae9386da5003d9594ac6780ffd211e9ee76e` | May/June 2023–Oct/Nov 2030 | May/June, Oct/Nov; Feb/Mar false |
| History 9489 | `9489-r001` | `d451305b402521724f58a6cf51fb9a795ba989681dd102410a0c22c270ee26c7` | May/June 2027–Oct/Nov 2029 | May/June, Oct/Nov; Feb/Mar false |
| Business 9609 | `9609-r001` | `47bef6703c0d26f37bac77200f2fa4dfbd4e265948a912c8b447f840f9d723ef` | May/June 2023–Oct/Nov 2028 | May/June, Oct/Nov; Feb/Mar false |
| Computer Science 9618 | `9618-r001` | `cbc4240de8d64cb32c855194187b288a094764b0d2d9e2e6dc3cd40a2470ae75` | May/June 2024–Oct/Nov 2029 | May/June, Oct/Nov; Feb/Mar false |
| Biology 9700 | `9700-r001` | `058a5aba48c0f80ef3bc3d4dc67ad2e056b37cdef476c2ae5e39d1de563fc1f6` | May/June 2025–Oct/Nov 2030 | May/June, Oct/Nov; Feb/Mar false |
| Chemistry 9701 | `9701-r001` | `987a41ef98117648459fffe40f60835a5193918d3467ea60528d6138f725d486` | May/June 2025–Oct/Nov 2030 | May/June, Oct/Nov; Feb/Mar false |
| Physics 9702 | `9702-r001` | `286920d02cbfae80964bb21642aeef619052ef6094949526b45aa5448b8643be` | May/June 2025–Oct/Nov 2030 | May/June, Oct/Nov; Feb/Mar false |
| Economics 9708 | `9708-r001` | `5bfc60acd8587c67006315702685aea431cc80e46726669b90956f91ef270a8d` | May/June 2023–Oct/Nov 2028 | May/June, Oct/Nov; Feb/Mar false |
| Mathematics 9709 | `9709-r001` | `e720d0d50929a2cc1e298eda51f3d931ad65a77c6ebdb6ffb1e5516d9c4a566a` | May/June 2023–Oct/Nov 2030 | May/June, Oct/Nov; Feb/Mar false |

## Cross-subject decision matrix

| Subject | Official route variants | Student choice beyond target/pathway | Route combinations vary by series? | Natural keys resolve? | Outcome-focus compatibility | Route-manifest verdict |
| --- | ---: | --- | --- | --- | --- | --- |
| 9231 Further Mathematics | 5 | AS applied-paper branch; staged branch follows it | No | Yes, including level-specific duplicates | Complete | **EVIDENCE-BACKED / BACKFILLABLE** |
| 9489 History | 3 qualification routes | AS option, Paper 3 topic, Paper 4 option; AS topic-to-paper rotation varies by year | No | Yes for papers, but full-A weighting context is absent | **Blocked for precise focus** | **BLOCKED pending History option/rotation and weighting design** |
| 9609 Business | 3 | None | No | Yes, using mixed AS/A component levels for full A | Complete at paper/outcome level; A weighting context absent | **BLOCKED pending weighting design** |
| 9618 Computer Science | 3 | None | No | Yes, using mixed AS/A component levels for full A | Complete at paper/outcome level; A weighting context absent | **BLOCKED pending weighting design** |
| 9700 Biology | 3 | None | No | Yes; AS and A duplicates exist for Papers 1–3 | Complete; 39 syllabus-wide occurrences remain universally relevant | **EVIDENCE-BACKED / BACKFILLABLE** |
| 9701 Chemistry | 3 | None | No | Yes, using mixed AS/A component levels for full A | Complete at paper/outcome level; A weighting context absent | **BLOCKED pending weighting design** |
| 9702 Physics | 3 | None | No | Yes, using mixed AS/A component levels for full A | Complete at paper/outcome level; A weighting context absent | **BLOCKED pending weighting design** |
| 9708 Economics | 3 | None | No | Yes, using mixed AS/A component levels for full A | Complete at paper/outcome level; A weighting context absent | **BLOCKED pending weighting design** |
| 9709 Mathematics | 8 | AS applied/pure branch; three staged and two full-A branches | No | Yes, including level-specific duplicates | Complete | **EVIDENCE-BACKED / BACKFILLABLE** |

| Subject | Code | AS routes | Staged A routes | Full A routes | Multiple choice? | Carry-forward rules? | Series-specific? | Model fit |
| --- | --- | ---: | ---: | ---: | --- | --- | --- | --- |
| Further Mathematics | 9231 | 2 | 2 | 1 | Yes | Yes; completion papers depend on prior AS branch | No | Fits |
| History | 9489 | 1 | 1 | 1 | One qualification route per context; separate content options | Yes | No | Extension required for weighting and option/rotation focus |
| Business | 9609 | 1 | 1 | 1 | No after context | Yes | No | Extension required for weighting |
| Computer Science | 9618 | 1 | 1 | 1 | No after context | Yes | No | Extension required for weighting |
| Biology | 9700 | 1 | 1 | 1 | No after context | Yes | No | Fits |
| Chemistry | 9701 | 1 | 1 | 1 | No after context | Yes | No | Extension required for weighting |
| Physics | 9702 | 1 | 1 | 1 | No after context | Yes | No | Extension required for weighting |
| Economics | 9708 | 1 | 1 | 1 | No after context | Yes | No | Extension required for weighting |
| Mathematics | 9709 | 3 | 3 | 2 | Yes | Yes; Pure-only AS cannot progress | No | Fits |

## Subject audits

### 1. Further Mathematics 9231

**Pinned identity:** `9231-r001`; hash `f3f2b9ce60a90826da78a123dad8ae9386da5003d9594ac6780ffd211e9ee76e`.

**Official evidence and validity:**

- [Cambridge qualification page — Further Mathematics 9231](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-further-9231/)
- Publication 597381, examinations 2023–2025.
- [Publication 697357, examinations 2026–2027, version 3](https://www.cambridgeinternational.org/Images/697357-2026-2027-syllabus.pdf), assessment overview pp. 10–12.
- [Publication 744603, examinations 2028–2030](https://www.cambridgeinternational.org/Images/744603-2028-2030-syllabus.pdf).
- All three editions offer June and November. The reviewed component and route structures are materially stable across the r001 range.

**Components:**

| Paper | Official title | Duration | Marks | AS weighting | A weighting | Existing natural keys |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Further Pure Mathematics 1 | 120 min | 75 | 60% | 30% | `9231/1` AS; `9231/1` A |
| 2 | Further Pure Mathematics 2 | 120 min | 75 | — | 30% | `9231/2` A |
| 3 | Further Mechanics | 90 min | 50 | 40% | 20% | `9231/3` AS; `9231/3` A |
| 4 | Further Probability & Statistics | 90 min | 50 | 40% | 20% | `9231/4` AS; `9231/4` A |

**Canonical routes:**

| Candidate key | Student-facing label | Target / pathway / progression | Component roles |
| --- | --- | --- | --- |
| `as_further_mechanics` | AS Level — Further Mechanics (Papers 1 + 3) | AS / single series / eligible | current: `1 AS`, `3 AS` |
| `as_further_statistics` | AS Level — Further Probability & Statistics (Papers 1 + 4) | AS / single series / eligible | current: `1 AS`, `4 AS` |
| `a_staged_from_mechanics` | Complete A Level — after AS Further Mechanics | A / staged completion / n/a | carried: `1 AS`, `3 AS`; current: `2 A`, `4 A` |
| `a_staged_from_statistics` | Complete A Level — after AS Further Probability & Statistics | A / staged completion / n/a | carried: `1 AS`, `4 AS`; current: `2 A`, `3 A` |
| `a_full_same_series` | Full A Level — all four papers this series | A / full same series / n/a | current: `1 A`, `2 A`, `3 A`, `4 A` |

**Prohibited combinations:** Paper 2 is unavailable for AS. AS cannot be Papers 1+2, 1+3+4, or any combination omitting Paper 1. A Level requires all four papers; staged completion must take the complementary pair shown above and cannot carry and retake the same route component as part of the canonical route.

**Mapping and ambiguity:** all seven current component natural keys resolve exactly once, with matching title, duration, marks, qualification weighting, and non-null outcome occurrences. The official table's heading says “Mathematics” on the 2026–2027 page, but the document, components, surrounding structure, and 2028–2030 correction make clear that the table is for Further Mathematics 9231; this is an official editorial label defect, not a route ambiguity.

**Verdict:** **EVIDENCE-BACKED / BACKFILLABLE**. Five routes; no series-specific branch.

### 2. History 9489

**Pinned identity:** `9489-r001`; hash `d451305b402521724f58a6cf51fb9a795ba989681dd102410a0c22c270ee26c7`.

**Official evidence and validity:**

- [Cambridge qualification page — History 9489](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-history-9489/)
- [Publication 718292, examinations 2027–2029, version 2](https://www.cambridgeinternational.org/Images/718292-2027-2029-syllabus.pdf), content overview pp. 9, assessment overview pp. 10–11, yearly rotation pp. 37–38.
- [Official 2027–2029 syllabus update, publication 726254](https://www.cambridgeinternational.org/Images/726254-2027-2029-syllabus-update.pdf).
- June and November only. The qualification page states that 9489 is unavailable to US schools from 2027; Cambridge provides codes 8101, 8102, 9981, and 9982 for that region. This regional restriction is not a paper-route difference.

**Components:**

| Paper | Official title | Duration | Marks | AS weighting | A weighting | Existing natural key |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Historical Sources | 75 min | 40 | 40% | 20% | `9489/1` AS |
| 2 | Outline Study | 105 min | 60 | 60% | 30% | `9489/2` AS |
| 3 | Historical Interpretations | 75 min | 40 | — | 20% | `9489/3` A |
| 4 | Depth Study | 105 min | 60 | — | 30% | `9489/4` A |

**Canonical qualification routes:**

| Candidate key | Student-facing label | Target / pathway / progression | Component roles |
| --- | --- | --- | --- |
| `as_single_series` | AS Level — Papers 1 + 2 this series | AS / single series / eligible | current: `1 AS`, `2 AS` |
| `a_staged_completion` | Complete A Level — carry forward AS, take Papers 3 + 4 | A / staged completion / n/a | carried: `1 AS`, `2 AS`; current: `3 A`, `4 A` |
| `a_full_same_series` | Full A Level — Papers 1–4 this series | A / full same series / n/a | current: `1 AS`, `2 AS`, `3 A`, `4 A` |

**Prohibited combinations:** AS requires both Papers 1 and 2 in one series. Staged completion requires a carried-forward AS result plus Papers 3 and 4. Full A Level requires all four papers in one series. No paper may be substituted. A chosen Paper 3 topic or Paper 4 option does not remove a paper and is not evidence for an arbitrary component route.

**Independent content choices and rotations:**

- Papers 1 and 2 use one common AS option: European, American, or International. One of that option's three topics is assigned to Paper 1 and the other two to Paper 2, rotating in 2027, 2028, and 2029.
- Paper 3 independently chooses one of: origins of the First World War, Holocaust, or origins/development of the Cold War.
- Paper 4 independently chooses European, American, or International depth study.
- These dimensions do not alter the three qualification paper combinations, but they materially alter the study outcomes relevant to the student.

**Mapping and ambiguity:** all four paper natural keys resolve exactly once and all 659 CSV rows have non-null learning outcomes. However, the current CSV maps only France 1774–1814 to Paper 1 and all eight other AS topics to Paper 2, which is exactly the 2027 rotation, not 2028 or 2029. The r001 version is applicable across all three years. The route-component model also has no route-to-outcome or separately normalized option selection. A full-A route additionally exposes AS qualification weightings (40% and 60%) for Papers 1 and 2 instead of their official A Level contributions (20% and 30%).

**Verdict:** **BLOCKED**. The three qualification routes are evidence-backed, but a production route contract must not claim precise route-relevant History outcomes until the owner chooses a generic option/rotation model and the occurrence mapping is corrected. Regional eligibility for US schools also requires a product-scope decision if US centres are in beta scope.

### 3. Business 9609

**Pinned identity:** `9609-r001`; hash `47bef6703c0d26f37bac77200f2fa4dfbd4e265948a912c8b447f840f9d723ef`.

**Official evidence and validity:**

- [Cambridge qualification page — Business 9609](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-business-9609/)
- [Publication 595459, examinations 2023–2025](https://www.cambridgeinternational.org/Images/595459-2023-2025-syllabus.pdf).
- [Publication 697371, examinations 2026–2028](https://www.cambridgeinternational.org/Images/697371-2026-2028-syllabus.pdf), assessment overview p. 10.
- June and November, plus March in India. The route table is unchanged across the r001 family.

**Components:**

| Paper | Official title | Duration | Marks | AS weighting | A weighting | Existing natural key |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Business Concepts 1 | 75 min | 40 | 40% | 20% | `9609/1` AS |
| 2 | Business Concepts 2 | 90 min | 60 | 60% | 30% | `9609/2` AS |
| 3 | Business Decision-Making | 105 min | 60 | — | 30% | `9609/3` A |
| 4 | Business Strategy | 75 min | 40 | — | 20% | `9609/4` A |

**Canonical routes:** `as_single_series` — “AS Level — Papers 1 + 2 this series” (current `1 AS`, `2 AS`, eligible); `a_staged_completion` — “Complete A Level — carry forward AS, take Papers 3 + 4” (carried `1 AS`, `2 AS`; current `3 A`, `4 A`); `a_full_same_series` — “Full A Level — Papers 1–4 this series” (all current, using the four available keys).

**Prohibited combinations:** AS without both Papers 1 and 2; staged A without a carried AS result or without both Papers 3 and 4; full A without all four; any elective substitution.

**Mapping and ambiguity:** all four natural keys resolve exactly once; names, durations, marks, and all 690 outcome rows match the official paper structure. The full-A mapping must currently use `1 AS` and `2 AS`, whose stored 40%/60% values are not the official A Level 20%/30% values.

**Verdict:** **BLOCKED pending weighting design**. Route evidence is complete and the paper set is unambiguous; manifest publication waits on a generic representation of route-contextual qualification weighting.

### 4. Computer Science 9618

**Pinned identity:** `9618-r001`; hash `cbc4240de8d64cb32c855194187b288a094764b0d2d9e2e6dc3cd40a2470ae75`.

**Official evidence and validity:**

- [Cambridge qualification page — Computer Science 9618](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-computer-science-9618/)
- Publication 636089, examinations 2024–2025.
- [Publication 697372, examination 2026, version 2](https://www.cambridgeinternational.org/Images/697372-2026-syllabus.pdf), assessment overview pp. 11–12.
- [Publication 721397, examinations 2027–2029](https://www.cambridgeinternational.org/Images/721397-2027-2029-syllabus.pdf).
- June and November only. The official 2026 update is editorial/no significant teaching change; the four-paper route structure is stable across the r001 family.

**Components:**

| Paper | Official title | Duration | Marks | AS weighting | A weighting | Existing natural key |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Theory Fundamentals | 90 min | 75 | 50% | 25% | `9618/1` AS |
| 2 | Fundamental Problem-solving and Programming Skills | 120 min | 75 | 50% | 25% | `9618/2` AS |
| 3 | Advanced Theory | 90 min | 75 | — | 25% | `9618/3` A |
| 4 | Practical | 150 min | 75 | — | 25% | `9618/4` A |

**Canonical routes:** `as_single_series` — “AS Level — Papers 1 + 2 this series” (current `1 AS`, `2 AS`, eligible); `a_staged_completion` — “Complete A Level — carry forward AS, take Papers 3 + 4” (carried `1 AS`, `2 AS`; current `3 A`, `4 A`); `a_full_same_series` — “Full A Level — Papers 1–4 this series” (all current).

**Prohibited combinations:** identical structural rule to the official table: AS 1+2 only; staged AS 1+2 then 3+4 only; full A 1+2+3+4 only. Paper 4 programming-language choice is an assessment implementation detail, not a paper route.

**Mapping and ambiguity:** all four natural keys resolve exactly once; titles, durations, marks, and 366 non-null outcome rows align. Full A must use `1 AS` and `2 AS`, each stored as 50% of AS rather than 25% of A.

**Verdict:** **BLOCKED pending weighting design**. Official route evidence is complete and unambiguous.

### 5. Biology 9700

**Pinned identity:** `9700-r001`; hash `058a5aba48c0f80ef3bc3d4dc67ad2e056b37cdef476c2ae5e39d1de563fc1f6`.

**Official evidence and validity:**

- [Cambridge qualification page — Biology 9700](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-biology-9700/)
- [Publication 664560, examinations 2025–2027](https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf), assessment overview pp. 10–11.
- [Publication 744622, examinations 2028–2030](https://www.cambridgeinternational.org/Images/744622-2028-2030-syllabus.pdf).
- June and November, plus March in India. The five-paper route structure is stable across the r001 family.

**Components:**

| Paper | Official title | Duration | Marks | AS weighting | A weighting | Existing natural keys |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Multiple Choice | 75 min | 40 | 31% | 15.5% | `9700/1` AS; `9700/1` A |
| 2 | AS Level Structured Questions | 75 min | 60 | 46% | 23% | `9700/2` AS; `9700/2` A |
| 3 | Advanced Practical Skills | 120 min | 40 | 23% | 11.5% | `9700/3` AS; `9700/3` A |
| 4 | A Level Structured Questions | 120 min | 100 | — | 38.5% | `9700/4` A |
| 5 | Planning, Analysis and Evaluation | 75 min | 30 | — | 11.5% | `9700/5` A |

**Canonical routes:**

- `as_single_series` — “AS Level — Papers 1–3 this series”; AS/single-series/eligible; current `1 AS`, `2 AS`, `3 AS`.
- `a_staged_completion` — “Complete A Level — carry forward AS, take Papers 4 + 5”; A/staged/n/a; carried `1 AS`, `2 AS`, `3 AS`; current `4 A`, `5 A`.
- `a_full_same_series` — “Full A Level — Papers 1–5 this series”; A/full-same-series/n/a; current `1 A`, `2 A`, `3 A`, `4 A`, `5 A`.

**Prohibited combinations:** AS requires 1+2+3 in one series; staged completion requires carried AS plus 4+5; full A requires all five in one series; no practical-paper substitution.

**Mapping and ambiguity:** all ten level-aware natural keys resolve exactly once and preserve official qualification weightings. The CSV has 861 component-linked rows and 39 component-null syllabus-wide rows (16 A Level and 23 AS & A Level). Under the approved rule, those 39 outcomes remain relevant to every route; they are not failed mappings.

**Verdict:** **EVIDENCE-BACKED / BACKFILLABLE**. Three routes; no series-specific branch.

### 6. Chemistry 9701

**Pinned identity:** `9701-r001`; hash `987a41ef98117648459fffe40f60835a5193918d3467ea60528d6138f725d486`.

**Official evidence and validity:**

- [Cambridge qualification page — Chemistry 9701](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-chemistry-9701/)
- [Publication 664563, examinations 2025–2027](https://www.cambridgeinternational.org/Images/664563-2025-2027-syllabus.pdf), assessment overview pp. 11–12.
- [Publication 744624, examinations 2028–2030](https://www.cambridgeinternational.org/Images/744624-2028-2030-syllabus.pdf).
- June and November, plus March in India. The route structure is stable across the r001 family.

**Components:** identical official timings/marks/weighting pattern to the independently checked Biology table: Paper 1 Multiple Choice, 75 min, 40 marks, 31% AS/15.5% A; Paper 2 AS Structured Questions, 75 min, 60 marks, 46% AS/23% A; Paper 3 Advanced Practical Skills, 120 min, 40 marks, 23% AS/11.5% A; Paper 4 A Level Structured Questions, 120 min, 100 marks, 38.5% A; Paper 5 Planning, Analysis and Evaluation, 75 min, 30 marks, 11.5% A.

**Canonical routes:** `as_single_series` (current `1 AS`, `2 AS`, `3 AS`, eligible); `a_staged_completion` (carried `1 AS`, `2 AS`, `3 AS`; current `4 A`, `5 A`); `a_full_same_series` (all five current, using the five available keys). Student labels match Biology with “Papers 1–3”, “carry forward AS, take Papers 4 + 5”, and “Papers 1–5”.

**Prohibited combinations:** AS 1+2+3 only; staged completion carried AS then 4+5 only; full A all five only.

**Mapping and ambiguity:** five natural keys resolve exactly once and all 798 outcomes are component-linked. Unlike Biology, the CSV has no A-level natural keys for Papers 1–3. A full A route can therefore only use AS components with 31%/46%/23% weightings, not the official A contributions 15.5%/23%/11.5%.

**Verdict:** **BLOCKED pending weighting design**. Official route evidence is complete and unambiguous.

### 7. Physics 9702

**Pinned identity:** `9702-r001`; hash `286920d02cbfae80964bb21642aeef619052ef6094949526b45aa5448b8643be`.

**Official evidence and validity:**

- [Cambridge qualification page — Physics 9702](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-physics-9702/)
- [Publication 664565, examinations 2025–2027](https://www.cambridgeinternational.org/Images/664565-2025-2027-syllabus.pdf), assessment overview pp. 11–12.
- [Publication 744626, examinations 2028–2030](https://www.cambridgeinternational.org/Images/744626-2028-2030-syllabus.pdf).
- June and November, plus March in India. The route structure is stable across the r001 family.

**Components:** Paper 1 Multiple Choice, 75 min, 40 marks, 31% AS/15.5% A; Paper 2 AS Level Structured Questions, 75 min, 60 marks, 46% AS/23% A; Paper 3 Advanced Practical Skills, 120 min, 40 marks, 23% AS/11.5% A; Paper 4 A Level Structured Questions, 120 min, 100 marks, 38.5% A; Paper 5 Planning, Analysis and Evaluation, 75 min, 30 marks, 11.5% A.

**Canonical routes:** `as_single_series` (current `1 AS`, `2 AS`, `3 AS`, eligible); `a_staged_completion` (carried `1 AS`, `2 AS`, `3 AS`; current `4 A`, `5 A`); `a_full_same_series` (all five current). Student labels match the science pattern above.

**Prohibited combinations:** AS 1+2+3 only; staged completion carried AS then 4+5 only; full A all five only.

**Mapping and ambiguity:** five natural keys resolve exactly once and all 518 outcome rows are linked. No A-level natural keys exist for Papers 1–3, so the same full-A weighting defect as Chemistry remains.

**Verdict:** **BLOCKED pending weighting design**. Official route evidence is complete and unambiguous.

### 8. Economics 9708

**Pinned identity:** `9708-r001`; hash `5bfc60acd8587c67006315702685aea431cc80e46726669b90956f91ef270a8d`.

**Official evidence and validity:**

- [Cambridge qualification page — Economics 9708](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-economics-9708/)
- [Publication 595463, examinations 2023–2025, version 2](https://www.cambridgeinternational.org/Images/595463-2023-2025-syllabus.pdf).
- [Publication 697423, examinations 2026–2028, version 2](https://www.cambridgeinternational.org/Images/697423-2026-2028-syllabus.pdf), assessment overview pp. 11–12.
- June and November, plus March in India. The route table is stable across the r001 family.

**Components:**

| Paper | Official title | Duration | Marks | AS weighting | A weighting | Existing natural key |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | AS Level Multiple Choice | 60 min | 30 | 33% | 17% | `9708/1` AS |
| 2 | AS Level Data Response and Essays | 120 min | 60 | 67% | 33% | `9708/2` AS |
| 3 | A Level Multiple Choice | 75 min | 30 | — | 17% | `9708/3` A |
| 4 | A Level Data Response and Essays | 120 min | 60 | — | 33% | `9708/4` A |

**Canonical routes:** `as_single_series` — “AS Level — Papers 1 + 2 this series” (current `1 AS`, `2 AS`, eligible); `a_staged_completion` — “Complete A Level — carry forward AS, take Papers 3 + 4” (carried `1 AS`, `2 AS`; current `3 A`, `4 A`); `a_full_same_series` — “Full A Level — Papers 1–4 this series” (all current).

**Prohibited combinations:** AS 1+2 only; staged carried AS then 3+4 only; full A all four only; no paper substitution.

**Mapping and ambiguity:** all four natural keys resolve exactly once; durations/marks and all 518 outcome rows align. The full-A route would expose AS 33%/67% for Papers 1/2 rather than A 17%/33%.

**Verdict:** **BLOCKED pending weighting design**. Official route evidence is complete and unambiguous.

### 9. Mathematics 9709

**Pinned identity:** `9709-r001`; hash `e720d0d50929a2cc1e298eda51f3d931ad65a77c6ebdb6ffb1e5516d9c4a566a`.

**Official evidence and validity:**

- [Cambridge qualification page — Mathematics 9709](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/)
- [Publication 597421, examinations 2023–2025](https://www.cambridgeinternational.org/Images/597421-2023-2025-syllabus.pdf).
- [Publication 697427, examinations 2026–2027, version 4](https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf), structure and route tables pp. 10–16.
- [Publication 744634, examinations 2028–2030](https://www.cambridgeinternational.org/Images/744634-2028-2030-syllabus.pdf).
- June and November, plus March in India. The six components and eight concrete route variants are stable across the r001 family.

**Components:**

| Paper | Official title | Duration | Marks | AS weighting | A weighting | Existing natural keys |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Pure Mathematics 1 | 110 min | 75 | 60% | 30% | `9709/1` AS; `9709/1` A |
| 2 | Pure Mathematics 2 | 75 min | 50 | 40% | — | `9709/2` AS |
| 3 | Pure Mathematics 3 | 110 min | 75 | — | 30% | `9709/3` A |
| 4 | Mechanics | 75 min | 50 | 40% | 20% | `9709/4` AS; `9709/4` A |
| 5 | Probability & Statistics 1 | 75 min | 50 | 40% | 20% | `9709/5` AS; `9709/5` A |
| 6 | Probability & Statistics 2 | 75 min | 50 | — | 20% | `9709/6` A |

**Canonical routes:**

| Candidate key | Student-facing label | Target / pathway / progression | Component roles |
| --- | --- | --- | --- |
| `as_pure_only` | AS Level — Pure Mathematics only (Papers 1 + 2) | AS / single / **not eligible** | current: `1 AS`, `2 AS` |
| `as_mechanics` | AS Level — Pure Mathematics + Mechanics (Papers 1 + 4) | AS / single / eligible | current: `1 AS`, `4 AS` |
| `as_statistics` | AS Level — Pure Mathematics + Statistics (Papers 1 + 5) | AS / single / eligible | current: `1 AS`, `5 AS` |
| `a_staged_mechanics_to_statistics` | Complete A Level — after AS Mechanics | A / staged / n/a | carried: `1 AS`, `4 AS`; current: `3 A`, `5 A` |
| `a_staged_statistics_to_mechanics` | Complete A Level — add Mechanics | A / staged / n/a | carried: `1 AS`, `5 AS`; current: `3 A`, `4 A` |
| `a_staged_statistics_to_statistics_2` | Complete A Level — continue with Statistics 2 | A / staged / n/a | carried: `1 AS`, `5 AS`; current: `3 A`, `6 A` |
| `a_full_mechanics_statistics` | Full A Level — Mechanics + Statistics (Papers 1, 3, 4 + 5) | A / full same series / n/a | current: `1 A`, `3 A`, `4 A`, `5 A` |
| `a_full_statistics` | Full A Level — Statistics route (Papers 1, 3, 5 + 6) | A / full same series / n/a | current: `1 A`, `3 A`, `5 A`, `6 A` |

**Prohibited combinations:** Paper 2 is AS-only and cannot count toward A Level; Papers 4 and 6 cannot be combined because Paper 6 depends on Paper 5; Paper 1 is compulsory for AS and A; Paper 3 is compulsory for A; any combination outside the eight rows above is invalid. The AS pure-only route must carry an explicit non-progression warning.

**Mapping and ambiguity:** all eleven level-aware natural keys resolve once, with matching title, duration, marks, weighting, and 226 non-null outcome rows. Candidate labels expose the meaningful choice without raw route keys. “After AS Statistics” alone is insufficient for staged A Level because two valid completion routes remain; the labels deliberately distinguish adding Mechanics from continuing to Statistics 2.

**Verdict:** **EVIDENCE-BACKED / BACKFILLABLE**. Eight routes; no series-specific branch.

## Required subject classification register

This register applies the requested audit vocabulary explicitly. It is additive to the evidence detail above.

### Component cross-check classifications

| Subject | Component-specific mappings | Syllabus-wide outcomes | Official-component cross-check | Natural-key classification | Outcome-relevance classification |
| --- | --- | ---: | --- | --- | --- |
| 9231 | Yes | 0 | **EXACT MATCH** | **COMPATIBLE** | **SUPPORTED** |
| 9489 | Yes | 0 | Paper identities **EXACT MATCH**; A-weight context absent; 2028/2029 AS rotation not represented | **LEVEL-MODEL ISSUE** plus **CONTENT GRAPH DISCREPANCY** | **INSUFFICIENT MAPPING** for option/year focus; qualification-route union remains complete |
| 9609 | Yes | 0 | Names/durations/marks **EXACT MATCH**; full-A weight context absent | **LEVEL-MODEL ISSUE** | **SUPPORTED WITH REVIEW NOTES** |
| 9618 | Yes | 0 | Names/durations/marks **EXACT MATCH**; full-A weight context absent | **LEVEL-MODEL ISSUE** | **SUPPORTED WITH REVIEW NOTES** |
| 9700 | Yes | 39 | **EXACT MATCH** | **COMPATIBLE** | **SUPPORTED WITH REVIEW NOTES**: syllabus-wide rows must always survive filtering |
| 9701 | Yes | 0 | Titles have **MINOR PRESENTATION DIFFERENCE**; duration/marks match; full-A weight context absent | **LEVEL-MODEL ISSUE** | **SUPPORTED WITH REVIEW NOTES** |
| 9702 | Yes | 0 | Names/durations/marks **EXACT MATCH**; full-A weight context absent | **LEVEL-MODEL ISSUE** | **SUPPORTED WITH REVIEW NOTES** |
| 9708 | Yes | 0 | Generic CSV titles are a **MINOR PRESENTATION DIFFERENCE**; duration/marks match; full-A weight context absent | **LEVEL-MODEL ISSUE** | **SUPPORTED WITH REVIEW NOTES** |
| 9709 | Yes | 0 | **EXACT MATCH** | **COMPATIBLE** | **SUPPORTED** |

No official paper is missing and no unexpected paper exists in any of the nine graphs. “Level-model issue” means the paper resolves uniquely but its stored qualification context cannot supply the correct full-A weighting; it does not mean the paper identity is ambiguous.

### Route cardinality and onboarding behavior

| Subject | AS this sitting | Completing A Level from AS | Full A Level in one series | Before context is supplied |
| --- | --- | --- | --- | --- |
| 9231 | 2 — **ASK** | 2 — **ASK**, or one if the prior AS route is already authoritative | 1 — **AUTO-SELECT** | 5 — ambiguous |
| 9489 | 1 qualification route — **AUTO-SELECT**, then separate History option choices | 1 qualification route — **AUTO-SELECT**, then separate History option choices | 1 qualification route — **AUTO-SELECT**, then separate History option choices | 3 — ambiguous |
| 9609 | 1 — **AUTO-SELECT** | 1 — **AUTO-SELECT** | 1 — **AUTO-SELECT** | 3 — ambiguous |
| 9618 | 1 — **AUTO-SELECT** | 1 — **AUTO-SELECT** | 1 — **AUTO-SELECT** | 3 — ambiguous |
| 9700 | 1 — **AUTO-SELECT** | 1 — **AUTO-SELECT** | 1 — **AUTO-SELECT** | 3 — ambiguous |
| 9701 | 1 — **AUTO-SELECT** | 1 — **AUTO-SELECT** | 1 — **AUTO-SELECT** | 3 — ambiguous |
| 9702 | 1 — **AUTO-SELECT** | 1 — **AUTO-SELECT** | 1 — **AUTO-SELECT** | 3 — ambiguous |
| 9708 | 1 — **AUTO-SELECT** | 1 — **AUTO-SELECT** | 1 — **AUTO-SELECT** | 3 — ambiguous |
| 9709 | 3 — **ASK** | 3 — **ASK**; prior Mechanics leaves one, prior Statistics leaves two, prior Pure-only leaves none | 2 — **ASK** | 8 — ambiguous |

### Route-series findings

Every one of the 34 routes is valid in both May/June and October/November throughout its r001 family. Every subject classification is:

**Route-series finding: NONE.**

No `ROUTE-SERIES EXTENSION REQUIRED` finding exists. February/March remains unsupported in Lockdin and was not introduced. India-only March and the History US restriction are regional/version applicability facts, not changes to a route's paper combination.

### Candidate-label review

All keys and labels remain **PROPOSED — NOT APPROVED**.

| Label pattern or subject-specific label | Review classification | Note |
| --- | --- | --- |
| “AS Level — Papers … this exam series” | **CLEAR** | Use when one fixed AS combination remains after context |
| “Complete A Level — carry forward AS, take Papers …” | **CLEAR** | Matches official carry-forward concept; help text should explain time-limit eligibility |
| “Full A Level — all papers in one exam series” | **CLEAR** | Prefer “exam series” over the unqualified word “series” |
| 9231 “AS Level — Further Mechanics” / “AS Level — Further Probability & Statistics” | **CLEAR** | Show paper codes secondarily |
| 9231 “Complete A Level — after AS Further Mechanics/Probability & Statistics” | **CLEAR** | Current papers should be listed beneath the label |
| 9709 “AS Level — Pure Mathematics only” | **NEEDS TEAM REVIEW** | Must carry a prominent “cannot be used to complete A Level” warning |
| 9709 “Complete A Level — after AS Mechanics” | **CLEAR** | Only one valid completion branch |
| 9709 “Complete A Level — add Mechanics” / “continue with Statistics 2” | **CLEAR** | Distinguishes the two completions after AS Statistics |
| 9709 “Full A Level — Mechanics + Statistics” / “Statistics route” | **CLEAR** | Show the four paper names/codes beneath |
| History AS/complete/full labels without option names | **POTENTIALLY CONFUSING** | Qualification route is clear, but study focus remains incomplete until History options are separately captured |

### Subject quality-gate verdicts

| Subject | Audit quality status | Required subject verdict | New ambiguity |
| --- | --- | --- | --- |
| 9231 | **PASS — ROUTE EVIDENCE COMPLETE** | **ROUTE MODEL FITS** | None material |
| 9489 | **BLOCKED — ARCHITECTURE EXTENSION REQUIRED** | **ARCHITECTURE EXTENSION REQUIRED** | History option/rotation relevance; regional scope; full-A weighting |
| 9609 | **BLOCKED — ARCHITECTURE EXTENSION REQUIRED** | **ARCHITECTURE EXTENSION REQUIRED** | Route-contextual weighting only |
| 9618 | **BLOCKED — ARCHITECTURE EXTENSION REQUIRED** | **ARCHITECTURE EXTENSION REQUIRED** | Route-contextual weighting only |
| 9700 | **PASS WITH REVIEW NOTES** | **ROUTE MODEL FITS** | Preserve 39 syllabus-wide occurrences |
| 9701 | **BLOCKED — ARCHITECTURE EXTENSION REQUIRED** | **ARCHITECTURE EXTENSION REQUIRED** | Route-contextual weighting only |
| 9702 | **BLOCKED — ARCHITECTURE EXTENSION REQUIRED** | **ARCHITECTURE EXTENSION REQUIRED** | Route-contextual weighting only |
| 9708 | **BLOCKED — ARCHITECTURE EXTENSION REQUIRED** | **ARCHITECTURE EXTENSION REQUIRED** | Route-contextual weighting only |
| 9709 | **PASS — ROUTE EVIDENCE COMPLETE** | **ROUTE MODEL FITS** | None material |

There are **zero** subjects blocked by incomplete official evidence. Six are blocked because complete evidence exposed a generic representation gap.

## Existing r001 lifecycle compatibility

| Subject group | Can an independent route layer attach without changing content hash, content graph, applicability, DEFAULT, or pins? | Publication consequence |
| --- | --- | --- |
| 9231, 9700, 9709 | Yes | Route-contract drafting can follow owner approval; publication still requires normal review |
| 9609, 9618, 9701, 9702, 9708 | Yes, after weighting is represented in the separate route layer | Do not publish under the current no-weight route-component design |
| 9489 | Yes for the three qualification routes; precise study focus needs a separate option/rotation layer | Do not silently alter the hashed r001 graph; any true content correction must use reviewed revision lifecycle |

The History finding is explicitly a **CONTENT GRAPH DISCREPANCY**: its static Paper 1/Paper 2 outcome occurrences represent 2027 only while the version is applicable through 2029. This report does not authorize correcting it. No proposed route requires changing `content_sha256`, applicability, DEFAULT, or any existing membership pin.

## Generic-model stress test

### What the approved model represents safely

The Report 120 fields are sufficient for all 34 official qualification routes:

| Required fact | Generic representation | Result |
| --- | --- | --- |
| Qualification awarded | `qualification_target` | Pass |
| AS taken now vs A completed from prior AS vs full A now | `pathway_type` | Pass |
| AS route may/may not progress | `progression_eligibility` | Pass |
| Prior versus current papers | route-component `role` | Pass |
| Fixed paper combination | ordered route-component rows | Pass |
| Version pin | route set attached to exact immutable syllabus version | Pass |
| No arbitrary combinations | manifest-only keys plus server validation | Pass |
| Route change does not repin | composite same-version foreign keys and RPC invariant | Pass |
| Series-specific route availability | not required by evidence | Pass; retain version-level policy |

The fixed-route subjects do not require subject-code branches. Further Mathematics and Mathematics are handled by additional canonical rows, not bespoke schema. The 34 rows also validate the approved separation between qualification target and pathway: `A Level` alone cannot distinguish staged completion from a full same-series sitting.

### Explicit answers to the eight stress-test questions

1. **Can `qualification_target` represent every route? YES.** Every route targets exactly AS Level or A Level.
2. **Can `pathway_type` represent every route? YES.** `single_series`, `staged_completion`, and `full_same_series` cover all 34 qualification pathways.
3. **Are `current_sitting` and `carried_forward` enough? YES for component timing/role.** They are not a substitute for History's independent topic/option selection.
4. **Is `progression_eligibility` sufficient? YES.** It captures eligible fixed AS routes and the 9709 Pure-only prohibition; completed A routes are not applicable.
5. **Is any additional route-level concept required? NO new pathway enum is required, but an additional generic representation is required.** The next design task must place qualification-context weighting correctly and represent History's option/rotation facts without conflating them with qualification routes.
6. **Is route-specific series availability required? NO.** All route combinations are stable across May/June and October/November.
7. **Can every component be resolved through current natural keys? YES uniquely, but six subjects return a `LEVEL-MODEL ISSUE` for full-A weighting context.** There are no ambiguous or missing paper identities.
8. **Can current outcome/component mappings support route relevance? NO for precise History option/year focus; YES or YES WITH REVIEW NOTES for the other eight.** Biology's syllabus-wide rows are supported by the approved universal-relevance rule.

### Where the model is not yet safe

#### A. Qualification weighting belongs to route context

For Business, History, Computer Science, Chemistry, Physics, and Economics, the current graph has only AS-level component records for the papers that serve both AS and A Level. Those records carry AS qualification weighting. In a full A route they remain the same physical assessment papers, but their qualification contribution changes.

This is not safely solved by:

- showing the AS weighting in an A route;
- suppressing all weighting forever;
- picking a paper by code alone and ignoring the natural-key level;
- copying weights into labels; or
- fabricating duplicate components ad hoc in a route manifest.

The evidence therefore requires a generic design decision about where qualification-context weighting is authoritative. This audit does not design that schema. Any resolution must preserve the independently hashed r001 content graphs unless a separate reviewed content-revision process is explicitly authorized.

#### B. History needs a separate option/rotation dimension

History proves that a qualification route and a student's study focus are not always the same fact. Expanding the three official routes into 27 or more cross-product “routes” whose component sets are identical would be misleading. A future design must represent the independent option selections and official year rotation generically while preserving the three audited qualification routes. The data shape, schema placement, hashing boundary, and UI contract are deliberately deferred to the next planning task.

### Legacy membership cardinality consequence

With `profiles.level`, progress, tasks, and paper attempts correctly excluded as authority, an existing membership pin plus intended session does not identify a unique route for any of the nine subjects. Series does not narrow the route inventory. Therefore, based on current authoritative membership fields alone:

- 9231 memberships have 5 candidates;
- 9709 memberships have 8 candidates; and
- every other subject membership has 3 candidates.

The future migration must assume **zero automatically assignable legacy memberships** unless another reviewed authoritative field is introduced. This is a logical cardinality result, not a Production user count. Legacy rows should remain null and use the approved deferrable confirmation flow.

## Series and regional availability findings

| Subjects | Official availability in reviewed family | Lockdin r001 automatic policy | Route-specific difference? |
| --- | --- | --- | --- |
| 9231, 9618 | June, November | May/June and Oct/Nov true | No |
| 9489 | June, November; unavailable to US schools from 2027 | May/June and Oct/Nov true | No; regional product constraint exists |
| 9609, 9700, 9701, 9702, 9708, 9709 | June, November; March in India | May/June and Oct/Nov true; Feb/Mar false | No; India March is deliberately outside automatic policy |

This audit supports keeping route availability out of the initial schema. It does not by itself authorize enabling February/March. Before claiming worldwide beta availability, the owner should state whether India March and US-centre eligibility are out of scope or require a region-aware applicability design.

## Source archive plan

No source PDF is committed by this report. For the future route-reference task:

1. Create a tracked source registry under the future route-reference directory containing subject code, publication ID, exact official title, validity, version, official URL, retrieved-at date, byte length, SHA-256, page/table locators, and any official update/notices.
2. Preserve a byte-identical PDF only where Cambridge licensing and repository policy permit. Otherwise keep the registry and hash in Git and store the permitted evidence copy in a controlled internal archive; never replace the official URL with an unofficial mirror.
3. Re-fetch before review. If bytes change under the same URL, retain both hashes, identify the official version/update, and re-audit affected facts.
4. Cite the full official family that covers r001; do not let one mid-family PDF silently stand for adjacent years.
5. Keep source-document hashes separate from `syllabus_versions.content_sha256` and the future route-manifest hash.

### Required official source register by subject

| Subject | Official source files to retain by identity | Validity | Required locator and audit relevance |
| --- | --- | --- | --- |
| 9231 | [597381](https://www.cambridgeinternational.org/Images/597381-2023-2025-syllabus.pdf), [697357](https://www.cambridgeinternational.org/Images/697357-2026-2027-syllabus.pdf), [744603](https://www.cambridgeinternational.org/Images/744603-2028-2030-syllabus.pdf) | 2023–2025; 2026–2027; 2028–2030 | Structure, Assessment overview, and route table (pp. 10–12 in 697357): two AS choices, complementary staged roles, all-four full A |
| 9489 | [718292](https://www.cambridgeinternational.org/Images/718292-2027-2029-syllabus.pdf), [726254 update](https://www.cambridgeinternational.org/Images/726254-2027-2029-syllabus-update.pdf), [qualification-page notices](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-history-9489/) | 2027–2029 | Content overview p. 9; assessment/route pp. 10–11; rotations pp. 37–38; update and regional/series notices |
| 9609 | [595459](https://www.cambridgeinternational.org/Images/595459-2023-2025-syllabus.pdf), [697371](https://www.cambridgeinternational.org/Images/697371-2026-2028-syllabus.pdf) | 2023–2025; 2026–2028 | Assessment overview/route table (p. 10 in 697371): fixed AS, staged, full routes and qualification weights |
| 9618 | [636089](https://www.cambridgeinternational.org/Images/636089-2024-2025-syllabus.pdf), [697372](https://www.cambridgeinternational.org/Images/697372-2026-syllabus.pdf), [721397](https://www.cambridgeinternational.org/Images/721397-2027-2029-syllabus.pdf), [747145 update](https://www.cambridgeinternational.org/Images/747145-2026-syllabus-update.pdf) | 2024–2025; 2026; 2027–2029 | Assessment overview/route table (pp. 11–12 in 697372): fixed AS, staged, full routes; Paper 4 practical detail; update continuity |
| 9700 | [664560](https://www.cambridgeinternational.org/Images/664560-2025-2027-syllabus.pdf), [744622](https://www.cambridgeinternational.org/Images/744622-2028-2030-syllabus.pdf) | 2025–2027; 2028–2030 | Assessment overview/route table (pp. 10–11 in 664560): five papers, staged roles, qualification weights |
| 9701 | [664563](https://www.cambridgeinternational.org/Images/664563-2025-2027-syllabus.pdf), [744624](https://www.cambridgeinternational.org/Images/744624-2028-2030-syllabus.pdf) | 2025–2027; 2028–2030 | Assessment overview/route table (pp. 11–12 in 664563): five papers, staged roles, qualification weights |
| 9702 | [664565](https://www.cambridgeinternational.org/Images/664565-2025-2027-syllabus.pdf), [744626](https://www.cambridgeinternational.org/Images/744626-2028-2030-syllabus.pdf) | 2025–2027; 2028–2030 | Assessment overview/route table (pp. 11–12 in 664565): five papers, staged roles, qualification weights |
| 9708 | [595463](https://www.cambridgeinternational.org/Images/595463-2023-2025-syllabus.pdf), [697423](https://www.cambridgeinternational.org/Images/697423-2026-2028-syllabus.pdf), [748950 update](https://www.cambridgeinternational.org/Images/748950-2026-2028-syllabus-update.pdf) | 2023–2025; 2026–2028 | Assessment overview/route table (pp. 11–12 in 697423): fixed AS, staged, full routes; version-2 update provenance |
| 9709 | [597421](https://www.cambridgeinternational.org/Images/597421-2023-2025-syllabus.pdf), [697427](https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf), [744634](https://www.cambridgeinternational.org/Images/744634-2028-2030-syllabus.pdf) | 2023–2025; 2026–2027; 2028–2030 | Structure and route tables pp. 10–16 in 697427: three AS, three staged A, two full A, non-progression and Paper 4+6 prohibition |

### PDF byte register retrieved 2026-09-03

| Publication / validity | Retrieved PDF SHA-256 |
| --- | --- |
| 597381 / 9231 / 2023–2025 | `833df9ae12990656ca45d2b4b584b4643aa1f933b6faf5a19214f94c4befc520` |
| 697357 / 9231 / 2026–2027 | `02c88d06ada474d94a2124a272ed587b5f7afbb1157aef47eff9674b7375fa78` |
| 744603 / 9231 / 2028–2030 | `15224814c4b3265da9e7b35707bf58f2c2f826a536d7b6b40939fbcb0eacf517` |
| 718292 / 9489 / 2027–2029 | `52d8eefaa07d603c231f63ccefe035f42a81bfa95c7ab184665c48c2a6d724ba` |
| 595459 / 9609 / 2023–2025 | `edceae4a6c4996c747fa641ea22260e271e428c20b35d6620a7e558c6a991a5e` |
| 697371 / 9609 / 2026–2028 | `2c7a9283173acecb7e6fe18589895017d815f42e1a6a2bcd8c7ac250e3eccc68` |
| 636089 / 9618 / 2024–2025 | `086aa17c2b29678bb4f6de83d09b28f0274b4d5c652aa0b224cfa1e066fbac92` |
| 697372 / 9618 / 2026 | `bf1b77a2b765d10eb4b005ecae0412add35cf6113ba3218a517893abfc9f2470` |
| 721397 / 9618 / 2027–2029 | `c8a4c6d033c07c6d8025689abed5ef481d581c28bae640986d275303ed6c08bc` |
| 664560 / 9700 / 2025–2027 | `5e6fe634a2c2ae95bf823c742e585140e7a4495224373b5aaaccb78fe2e35db1` |
| 744622 / 9700 / 2028–2030 | `81a421ceeb4b9c747385592326a67967c9e24df4aabcca6a24cebc2f024e07cc` |
| 664563 / 9701 / 2025–2027 | `bc40af1d0789b3217524f380337d3a36e49264f5f28ab991e3e85c9102d53ad2` |
| 744624 / 9701 / 2028–2030 | `1a1284ecd41eaace3fe8c1c277dd9dcc0d61399be161672d57da8ff1d6f372dc` |
| 664565 / 9702 / 2025–2027 | `1cba1cdca33c51a39dd6dfdc69d612f48967abcd89b6ceacdf9ffd6fa2e2b195` |
| 744626 / 9702 / 2028–2030 | `468f4a01b9459701e5b21a010fde12538aa16413a25496c311f7ce6fdd585e8c` |
| 595463 / 9708 / 2023–2025 | `d4c06e4e792aae7c9a62591b78f757cb01329ff18fcf599e431372bdd01f5cad` |
| 697423 / 9708 / 2026–2028 | `0f02e7efdc1175b58b165665f08a54c0c4a82226a3b79492ea9c681dca7db0d8` |
| 597421 / 9709 / 2023–2025 | `3a7a37692399f47ff5e0d94cc41f9dd33d3b99467ce83aa4bad28c6136f96256` |
| 697427 / 9709 / 2026–2027 | `dd0131f3cd8d4e3c270e7936cbb909c15f4cb8053f8337b67c16e8ec0b8bc5e5` |
| 744634 / 9709 / 2028–2030 | `5e2bcb5e72870931a6758e26b3d929f2b659ebbcef274bcb12e5009572b0bf03` |

## Owner decisions now required

1. **Model-amendment planning:** authorize a documentation-only design amendment to resolve qualification-context weighting and History option/rotation relevance; exact schema choices are not proposed in this audit.
2. **Regional beta scope:** state whether India February/March and US-centre History eligibility are out of scope; otherwise commission region-aware applicability design.
3. **Terminology:** approve the labels in this report as the copy baseline, subject to normal accessibility and localization review. Recommended generic copy is “AS Level”, “Complete A Level — carry forward AS”, “Full A Level — all papers this series”, “Papers to take now”, and “Carried-forward AS papers”. Avoid exposing `single_series`, `staged_completion`, `current_sitting`, `r001`, or raw component levels.

## Recommended next planning task

Produce a documentation-only **Report 120 design amendment** (or the next sequential report if owner governance prefers an additive artifact) that resolves the two findings above before migration authorization:

- normalize qualification weighting at the route/component boundary without changing existing content hashes merely for cleanup;
- define a generic History-capable study-option and year-rotation model, including outcome relevance and intended-session interaction;
- update manifest shape, canonical hashing, validation, publication constraints, API response shape, legacy-null behavior, and acceptance tests conceptually;
- reclassify all nine subject manifests against the amended model; and
- preserve every existing pin, progress record, attempt, task, and nullable legacy `profiles.level` value.

Only after the owner approves that amendment should a future task author the nine manifests and source registry. Migration `0016` remains justified but **not authorized for creation**.

## Final audit status

**Official route enumeration:** COMPLETE for all nine subjects.

**All-nine reference backfill readiness:** BLOCKED by two generic model findings.

**Migration `0016`:** NOT CREATED; implementation remains unauthorized.

**Repository changes in this task:** this report only.
**Hosted/Production access:** none.
