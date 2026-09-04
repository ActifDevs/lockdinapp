# LOCKDIN — PHASE 7 16-SUBJECT REFERENCE-ADOPTION PLAN (SLICE B1)

**Report:** 127

**Date:** 2026-09-04

**Status:** B1 FINAL — OWNER DECISIONS COMPLETE — READY FOR FREEZE REVIEW — NO PUBLICATION / NO DB MUTATION / NO COMMIT

**Cross-References:**
- Reports 120–126 (frozen A1/A2A/A2B)
- Report 102 — prior Chemistry equivalence (**superseded** by refresh)
- Commit `c04b64e` — new-seven candidates
- Commit `96796ef` — current-nine refresh candidates
- Report 128 — B2 artifact authoring inventory

**Baseline:** `main` @ `96796ef2ced1da5dd04559cc49346388834e483e`
**Migration head:** `0017_route_reference_immutability` (count 18)

---

## 0. Reconciliation History

| Pass | Baseline | Outcome |
| --- | --- | --- |
| First B1 | `1c10772` | **PASS WITH EVIDENCE GAPS** — new-seven artifacts unavailable then (valid at the time). |
| New-seven B1+B2 | `c04b64e` | Gaps closed; B2 authored initial manifests. |
| Current-nine refresh | `96796ef` | Independent refresh reconciliation; most subjects → **C**; 9609/9709 temporarily **D**. |
| **Owner-decision amendment** | same `96796ef` | **9609 → C (`9609-r002`)**, **9709 → C (`9709-r002`)** authorized. D-class **NONE**. |

Candidates remain evidence only — not imported.

---

## 1. Executive Summary

### Final B1 verdict

**PASS**

| Item | Status |
| --- | --- |
| Content-quality owner decisions | **NONE remaining** |
| Blocking evidence conflicts | **NONE** |
| Forward 16-subject version model | **COMPLETE** |
| B3 | **HOLD** — separate authorization required |

---

## 2. Final Current-Nine Target Version Model

| Code | Forward target | Historical pin |
| --- | --- | --- |
| 9231 | **`9231-r001`** (canonically verified) | n/a |
| 9489 | **`9489-r002`** | r001 retained |
| 9609 | **`9609-r002`** | r001 retained |
| 9618 | **`9618-r002`** | r001 retained |
| 9700 | **`9700-r002`** | r001 retained |
| 9701 | **`9701-r002`** (2025–2027) + **`9701-r003`** (2028–2030) | r001 retained |
| 9702 | **`9702-r002`** | r001 retained |
| 9708 | **`9708-r002`** | r001 retained |
| 9709 | **`9709-r002`** (one graph; 2026–2027 ≡ 2028–2030) | r001 retained |

Do **not** mutate any r001. Do **not** create separate 9709 family versions.

---

## 3. Per-Subject Primary Classifications (final)

| Code | Class | Notes |
| --- | --- | --- |
| 9231 | **A** | Exact content hash match with refresh. |
| 9489 | **C** | Target r002; 448 AS component-null; P1–P4 catalogue; year maps. |
| 9609 | **C** | **Owner authorized.** Fresh extraction restores official Promotion-methods boundaries (AS requirements 177→181). Not a typography-only fix. |
| 9618 | **C** | Target r002. |
| 9700 | **C** | AO removed from content graph. |
| 9701 | **C** | Two families; Report 102 equivalence superseded. |
| 9702 | **C** | Target r002. |
| 9708 | **C** | Target r002. |
| 9709 | **C** | **Owner authorized.** Fidelity refresh (9 official wording corrections; same 153 identities / route architecture). One r002 spanning equivalent official families. |

**D-class remaining:** **NONE**
**Evidence conflicts:** **NONE**

---

## 4. Owner Decision Detail — 9609 / 9709

### 9609 Business → `9609-r002`

- Source family: **2026–2028**
- Routes: **3** (AS / staged / full)
- Weights: AS 40/60; A 20/30/30/20
- No study options; no year mappings
- r001 historical for pins only

### 9709 Mathematics → `9709-r002`

- Official 2026–2027 and 2028–2030 remain **CONTENT-EQUIVALENT** → **one** refreshed canonical
- Preserve both official source identities in provenance
- Routes: **8** unchanged architecture (incl. Pure-only `not_eligible`)
- Prohibitions preserved (P2 not for A; P4+P6 invalid; P1/P3 compulsory rules)
- No study options; no year mappings
- Fidelity refresh, not route redesign

---

## 5. Active Target Route Counts

**Distinguish active targets from all authored historical artifacts.**

### Current-nine forward target — **37**

| Version | Routes |
| --- | ---: |
| 9231-r001 | 5 |
| 9489-r002 | 3 |
| 9609-r002 | 3 |
| 9618-r002 | 3 |
| 9700-r002 | 3 |
| 9701-r002 | 3 |
| 9701-r003 | 3 |
| 9702-r002 | 3 |
| 9708-r002 | 3 |
| 9709-r002 | 8 |
| **Total** | **37** |

### New-seven forward target — **29** (unchanged)

### Full 16-subject forward-looking target — **66**

### All authored files (incl. historical r001 mirrors) — **29 files / 95 route variants**

Historical manifests are **not** automatic future assignment targets.

---

## 6. Current-Nine Refresh Register (unchanged facts)

11/11 files under `data/syllabi/candidates/current-nine-refresh/` remain the evidence basis. Classifications in the register for 9609/9709 are now **C** (owner-resolved), not D.

---

## 7. History / Chemistry (preserved)

- **9489-r002:** 448 AS component-null; P1–P4 catalogue; 27 year mappings with refresh unit titles.
- **9701-r002 / r003:** dual official families; Report 102 equivalence superseded.

---

## 8. New-Seven (preserved)

8021 r001+r002 · 9093 r001 · 9626 r001+r002 · 9696 r001+r002 · 9699 r001 · 9706 r001 · 9990 r001+r002 → **29** routes.

---

## 9. Remaining Review Notes / B3 Gate

Non-blocking notes only (import sequencing). **No open D decisions.**

**B3 HOLD** until separate owner authorization. Do not import, publish, repin, or hosted-apply.

---

## 10. Data Safety

CSV changes **NONE** · Imports **0** · Route/reference DB writes **0** · Membership **NONE** · Hosted **NONE** · Commit/push **NONE**
