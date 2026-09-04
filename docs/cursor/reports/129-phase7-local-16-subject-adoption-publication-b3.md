# LOCKDIN — PHASE 7 B3 LOCAL 16-SUBJECT ADOPTION + PUBLICATION

**Report:** 129  
**Date:** 2026-09-04  
**Status:** B3 TECHNICALLY CLOSED (B3R) — READY FOR FREEZE — NO COMMIT / NO PUSH / NO HOSTED CUTOVER  
**Baseline:** `ea68e252774936fd6809edd92cf43f7e0a655e2c` (`docs(data): freeze 16-subject reference adoption artifacts`)  
**Migration head:** `0017_route_reference_immutability` (count **18**)

---

## 0. Purpose

Prove the frozen B1/B2 16-subject catalogue can be adopted into a **local-only** Lockdin database without:

- mutating historical r001 content graphs
- repinning memberships
- hosted Supabase / Vercel changes
- ambiguous future assignment
- bypassing immutable route-reference publication

---

## 1. Repository preflight

| Check | Result |
| --- | --- |
| Branch | `main` |
| HEAD | `ea68e252774936fd6809edd92cf43f7e0a655e2c` |
| `origin/main` | `ea68e252774936fd6809edd92cf43f7e0a655e2c` |
| Working tree at start | CLEAN |
| Report 127 | FROZEN / PASS (B1) |
| Report 128 | FROZEN / PASS (B2) |
| Route manifests | **29** |
| Forward-looking routes | **66** |
| All authored routes | **95** |
| `data/syllabi/candidates/new-seven/` | **11** CSVs |
| `data/syllabi/candidates/current-nine-refresh/` | **11** CSVs |
| Candidate CSV mutations | **NONE** |

---

## 2. Local database safety

| Item | Proof |
| --- | --- |
| `DATABASE_URL` host | `127.0.0.1:54322` (loopback) |
| `DIRECT_DATABASE_URL` | `127.0.0.1:54322` |
| `SUPABASE_URL` | `http://127.0.0.1:54321` |
| `supabase status` DB URL | `postgresql://…@127.0.0.1:54322/postgres` |
| Hosted project ref | **NONE** in active env |
| Route publication gate | `LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION=1` only after loopback proof |
| Hosted mutations | **0** |
| `supabase db push` | **NOT RUN** |
| Supabase MCP writes | **NONE** |

**Verdict:** LOCAL DATABASE SAFETY **PASS**

---

## 3. Pre-adoption local baseline (after synthetic residue cleanup)

Synthetic residue removed via trigger-bypass cleanup (memberships unchanged):

- orphan route/components referencing deleted route sets
- Chemistry `pin-preserve-test-*` empty successor (restored `9701` default to real CSV version)
- orphan syllabus versions with missing subjects (`A1-*` / `B1-*`)
- `TEST-0001` subject

| Metric | Pre (clean) |
| --- | ---: |
| Subjects | 9 |
| Syllabus versions | 9 (identity-null published graphs) |
| Route sets | 0 |
| Routes | 0 |
| Memberships | 2 |

Membership snapshot (unchanged through entire B3):

| user | subject | syllabus_version_id | assessment_route_id |
| --- | ---: | ---: | --- |
| `a3217291-…` | 9701 | **6** (`9701-r001`) | null |
| `a3217291-…` | 9709 | **9** (`9709-r001`) | null |

---

## 4. Content adoption

### 4.1 New versions created: **20**

| Family | Versions |
| --- | --- |
| Current-nine refresh | `9489-r002`, `9609-r002`, `9618-r002`, `9700-r002`, `9701-r002`, `9701-r003`, `9702-r002`, `9708-r002`, `9709-r002` (**9**) |
| New-seven | `8021-r001/r002`, `9093-r001`, `9626-r001/r002`, `9696-r001/r002`, `9699-r001`, `9706-r001`, `9990-r001/r002` (**11**) |

### 4.2 9231

Refresh candidate hash ≡ adopted `9231-r001`  
`f3f2b9ce60a90826da78a123dad8ae9386da5003d9594ac6780ffd211e9ee76e`  
**No r002 created.** Future resolution remains `9231-r001`.

### 4.3 Content hashes (selected)

| Key | SHA-256 |
| --- | --- |
| 9489-r002 | `f5389bdbeb9a1ccff15e0bb89c4305b2ab4a03cde9376e271e9855b9ae9352e6` (includes catalogue P1/P2) |
| 9701-r002 | `134a26f077ed74467e7d6f86e340d2bc7ad5ecbfc56a64d414874ab81eaea803` |
| 9701-r003 | `581812bf8b469be099b028def9bba96de15ba9c22c33e4ce860d5be88b2a5fee` (**≠ r002**) |
| 9709-r002 | `2a9bde58e736344fce5c267ca1b474f15bcf6bc69da8709159fe3bf13cc651fd` |

Full assignment-eligible write-set recorded in:

`docs/reference-data/syllabus-applicability/b3-local-population-manifest.json`

### 4.4 Historical r001 preservation

- All nine legacy graphs **legacy-adopted** with Report 102 content hashes unchanged.
- Superseded r001 lifecycles set to **`retired`** via `--retire-revision` on successor publish (content immutable; pins untouched).
- Retired keys: 9489, 9609, 9618, 9700, 9701, 9702, 9708, 9709.

---

## 5. History special catalogue

| Check | Result |
| --- | --- |
| 9489-r002 components P1–P4 | **PASS** (`9489/1`…`9489/4`) |
| Catalogue seed | inserted P1/P2; P3/P4 already from CSV |
| AS learning outcomes with `component_id` null | **448** |
| LO→P1/P2 manufactured links | **NONE** |
| Year mappings on `9489-r002` | **27** |
| Year mappings on historical `9489-r001` route set | **27** |

---

## 6. Applicability / series

| Policy | Result |
| --- | --- |
| Official family windows on forward targets | **PASS** |
| May/June `product_auto_assign=true` | **21** (all published assignment versions) |
| Oct/Nov `product_auto_assign=true` | **21** |
| Feb/Mar enabled | **0** (**DISABLED**) |
| Forward supersession | retire r001 + publish non-overlapping successors |

**Note:** DB exclusion `syllabus_versions_applicable_windows_no_overlap` prevents retired r001 from holding the same session window as published r002. Assignment ignores retired lifecycles. Historical History year-map validation therefore falls back to manifest `sources[].validity` when DB window is null (generic resolve change; see §10).

---

## 7. Resolver proofs

| Case | Result |
| --- | --- |
| 8021 2027→r001 / 2028→r002 | PASS |
| 9626 2027→r001 / 2028→r002 | PASS |
| 9696 2026→r001 / 2027–2028→r002 | PASS |
| 9990 2027→r001 / 2028→r002 | PASS |
| 9701 2027→r002 / 2028→r003 | PASS |
| 9709 2027–2028→r002 | PASS |
| 9489 2027–2029→r002 | PASS |
| 9609 / 9618 / 9700 / 9702 / 9708 → approved target | PASS |
| 9231 → r001 | PASS |
| Feb/Mar | **FAIL CLOSED** (`no_applicable_syllabus_version`) |
| Unsupported (e.g. 9700 2029) | **FAIL CLOSED** |

---

## 8. Membership immutability

| Check | Result |
| --- | --- |
| Membership rows created/deleted | **0** |
| `syllabus_version_id` changes | **0** |
| `assessment_route_id` changes | **0** |
| Historical pins preserved | **PASS** (still versions 6 and 9) |

---

## 9. Route publication (local)

| Gate | Result |
| --- | --- |
| Structural validate | **PASS 29/29** |
| Canonical hash | **PASS 29/29** |
| DB reference resolution (dry-run) | **PASS 29/29** |
| Trusted local publish | **29 published** |
| Identical republish | **NO-OP 29/29** |
| Immutability | **PASS** |

### Expected vs actual (derived from 29 manifests)

| Metric | Expected | Actual |
| --- | ---: | ---: |
| Published route sets | 29 | 29 |
| Routes | 95 | 95 |
| Route components | (manifest-derived) | 333 |
| Study option groups | 13 | 13 |
| Study options | 45 | 45 |
| Option–unit mappings | 72 | 72 |
| Year mappings | 54 | 54 |
| History r002 year maps | 27 | 27 |

---

## 10. Tooling changes (generic only)

| Change | Why |
| --- | --- |
| `SYLLABUS_NEW_SEVEN_SUBJECTS` + registry lookup | Import new-seven via `--csv=` without breaking raw nine validate loop |
| `--csv=` persists basename as `source_file` | Distinct successor provenance |
| `syllabus:component-catalogue` | Seed version-scoped papers without LO links; rehash drafts |
| `syllabus:applicability --manifest=` | Apply non-canonical write-sets |
| `resolve.ts` sources validity fallback | Publish historical year-mapped routes when retired r001 cannot store overlapping DB windows |
| Local schema repair | Active local DB was missing `min_selections`/`max_selections` vs current 0016 file (drift from earlier apply). Repaired in place; **no new migration** |
| B3 orchestration helpers | Local adoption / publish-all scripts under `scripts/src/` |

**No frontend / API / membership backfill / hosted config.**

---

## 11. Post-adoption catalogue state

| Metric | Count |
| --- | ---: |
| Subjects | **16** |
| Syllabus versions | **29** |
| Published versions | **21** |
| Retired versions | **8** |
| Published route sets | **29** |
| Routes | **95** |

---

## 12. Tests

| Suite | Result |
| --- | --- |
| `pnpm check:migrations` | **PASS** count=18 head=`0017_route_reference_immutability` |
| `test:route-manifest` | **PASS** 38/38 |
| `test:harness` | **PASS** 21/21 |
| `test:unit` | **PASS** 41/41 |
| component-catalogue focused | **PASS** |
| `pnpm typecheck` (scripts) | **PASS** |

---

## 13. Hosted safety

| Surface | Result |
| --- | --- |
| Hosted DB mutations | **0** |
| Hosted migration | **NONE** |
| Vercel | **NONE** |
| Commit | **NONE** |
| Push | **NONE** |

---

## 14. Remaining review notes (non-blocking for local B3)

> **Superseded by §16 (B3R closure).** Original notes retained for chronology.

1. Local DB previously drifted from current 0016 (missing option-group cardinality columns) — repaired locally; confirm other environments match journal hash for 0016 before hosted cutover.
2. Retired r001 cannot store overlapping assignment windows (DB exclusion). Historical route year maps rely on manifest `sources[].validity` when DB window is null. Consider a future owner-approved migration to exempt `retired` from the exclusion if DB-side historical windows are desired.
3. Working tree contains B3 tooling + Report 129 + local population manifest — awaiting owner freeze commit.

---

## 15. Verdict (original B3)

**PASS WITH REVIEW NOTES**

B3 LOCAL ADOPTION COMPLETE.

**NEXT:** OWNER REVIEW + FREEZE B3 BEFORE ANY HOSTED CUTOVER OR STUDENT-FACING INTEGRATION.

---

## 16. B3R — review-note closure (2026-09-04)

### Fresh DB migration reproduction

| Item | Result |
| --- | --- |
| Fresh disposable DB | **CREATED** (dedicated `lockdin-db-harness` on `127.0.0.1:55422`) |
| Baseline | pre-0000 bootstrap + tracked Drizzle chain |
| Tracked migrations applied | **PASS** |
| Migration count | **18** |
| Migration head | **`0017_route_reference_immutability`** |
| `min_selections` / `max_selections` | **PRESENT** (NOT NULL + approved CHECKs) without manual ALTER |
| Selection PK allows multi-option per group | **PASS** |
| Manual schema repair required on fresh DB | **NO** |
| Fresh B3 adoption + route publish counts | **PASS** (16/29/21/8/29/95/13/45/72/54; History 27 + 448 AS-null; Feb/Mar 0) |

### Classification of original drift

**HISTORICAL LOCAL DATABASE DRIFT ONLY**

A clean application of the tracked migration chain (after pre-0000 bootstrap) creates the final approved route schema. The earlier developer DB was missing cardinality columns because its applied 0016 journal hash predated the final tracked file contents / had residual schema drift — not because the tracked chain is incomplete.

**NO NEW MIGRATION REQUIRED FOR THIS DRIFT**

### sources[].validity fallback

| Contract | Result |
| --- | --- |
| Fallback scope | Route-manifest **reference resolution only**; gated to `lifecycle === "retired"` when DB applicability is null |
| Function | `effectiveApplicabilityYears` / `parseSourceValidityYears` in `scripts/src/route-manifest/resolve.ts` |
| Catalog loads lifecycle | `loadReferenceCatalogFromDatabase` |
| Published/draft null DB applicability | **FAILS CLOSED** (`missing_applicability_window`) — sources validity must not substitute |
| Conflicting / missing historical validity | **FAILS CLOSED** |
| Runtime assignment reads source validity | **NO** — `lockdin_resolve_applicable_syllabus_version` (0014) uses only published lifecycle + DB session range + series policy |
| Retired historical year-map resolution | **PASS** |
| Feb/Mar | still **FAIL CLOSED** via SQL resolver |
| Focused tests | `validity-fallback-b3r.test.ts` + route-manifest suite **PASS** |
| Fallback verdict | **APPROVED** |

### Overlapping retired window decision

Retaining **null DB applicability on retired r001** when windows would overlap published successors remains approved. Historical provenance stays in immutable manifests/`sources[].validity`. Exempting `retired` from the exclusion constraint is an **OPTIONAL FUTURE DATA-MODEL ENHANCEMENT**, not a B3 blocker.

### Membership / resolver reconfirm (developer B3 local DB)

| Check | Result |
| --- | --- |
| Membership pin changes | **0** |
| `assessment_route_id` changes | **0** |
| Retired r001 new-assignment eligibility | **NONE** |
| Successor assignment (e.g. 9489 2027→r002) | **PASS** |

### Remaining B3 blockers

**NONE**

### B3R verdict

**PASS**

B3 TECHNICALLY CLOSED AND READY FOR FREEZE.

**NEXT:** B3 FREEZE COMMIT/PUSH. **NO HOSTED CUTOVER YET.**
