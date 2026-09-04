# LOCKDIN — PHASE 7 B4 HOSTED CATALOGUE CUTOVER PREFLIGHT

**Report:** 130  
**Date:** 2026-09-04  
**Status:** NO-GO — REMEDIATION REQUIRED — NO HOSTED MUTATION — NO COMMIT / NO PUSH  
**Baseline:** `a304be6634c7b5d29e2542bd124abb5e33dca0c4` (`feat(data): add reproducible 16-subject local adoption tooling`)  
**Prior:** Report 129 B3/B3R CLOSED AND FROZEN  

**Cross-References:**
- Reports 127–129 (B1/B2/B3/B3R frozen local 16-subject model)
- Migration head in repository: `0017_route_reference_immutability` (count **18**)

---

## 0. Purpose

Read-only planning + preflight for a future controlled hosted catalogue cutover.

**This slice did not:**

- write to hosted Supabase
- apply migrations
- publish routes
- import syllabus content
- change memberships
- commit or push

---

## 1. Repository preflight

| Check | Result |
| --- | --- |
| Branch | `main` |
| HEAD | `a304be6634c7b5d29e2542bd124abb5e33dca0c4` |
| `origin/main` | `a304be6634c7b5d29e2542bd124abb5e33dca0c4` |
| Working tree | CLEAN (Report 130 only after this write) |

---

## 2. Hosted identity

| Item | Value |
| --- | --- |
| Project name | `Lockdin-app` |
| Project ref | `hazvcdrcvsxmuwdfiucx` |
| Region | `eu-west-1` |
| Environment | Production hosted (linked CLI project) |
| Database host class | Session pooler (`aws-0-eu-west-1.pooler.supabase.com`) |
| Inspection mode | `BEGIN READ ONLY` over authorized Session pooler URL from `.env.local.hosted.bak` |
| `transaction_read_only` | `on` |
| Supabase MCP `execute_sql` / `list_migrations` | Permission denied (not used) |
| Secrets in this report | **NONE** |

**Read-only proof:** PASS

---

## 3. Hosted migration state

| Item | Expected (repo) | Hosted |
| --- | --- | --- |
| Migration count | **18** | **16** |
| Migration head | `0017_route_reference_immutability` | `0015_silent_sentinel` |
| Journal hashes 0000–0015 | — | **Exact match** to tracked SQL file SHA-256 |
| `0016_assessment_routes_and_study_options` | present | **MISSING** |
| `0017_route_reference_immutability` | present | **MISSING** |

### Physical schema vs final tracked 0016 contract

| Object | Hosted |
| --- | --- |
| `assessment_route_sets` | **MISSING** |
| `assessment_routes` | **MISSING** |
| `assessment_route_components` | **MISSING** |
| `assessment_study_option_groups` | **MISSING** |
| `assessment_study_options` | **MISSING** |
| `assessment_study_option_units` | **MISSING** |
| `assessment_study_option_year_mappings` | **MISSING** |
| `user_subject_option_selections` | **MISSING** |
| `user_subjects.assessment_route_id` | **MISSING** |
| `min_selections` / `max_selections` | **N/A** (table absent) |

### Classification

**C. HOSTED BEHIND REPOSITORY**

**Remediation required (do not execute in B4):**

1. Owner-authorized hosted schema catch-up applying **only** tracked `0016` then `0017` via the normal Drizzle migrate path (not Dashboard DDL, not `drizzle-kit push`).
2. Re-verify physical 0016 contract (cardinality columns, selection PK, route tables, `assessment_route_id`).
3. Only then reconsider catalogue/reference adoption.

**Do not invent Migration 0018 for this gap.**

---

## 4. Hosted catalogue baseline (read-only)

| Table / metric | Count |
| --- | --- |
| subjects | **9** |
| syllabus_versions | **9** |
| published | **9** |
| retired | **0** |
| draft | **0** |
| identity-null (`logical_revision_key` or `content_sha256` null) | **0** |
| syllabus_units | 136 |
| syllabus_topics | 520 |
| syllabus_learning_outcomes | 3198 |
| assessment_components | 50 |
| versions with full applicability window | **9** |
| versions with null applicability | **0** |
| syllabus_version_exam_series | 27 (9 × 3 series) |
| assessment_route_* / study-option tables | **0** (tables absent) |
| user_subjects | **15** |
| user_subject_option_selections | table absent |

Applicability and series policy live on / beside `syllabus_versions` (`applicable_*` columns + `syllabus_version_exam_series`) — not separate `syllabus_version_applicability` tables.

---

## 5. Current-nine hosted state

All nine subjects exist as a single **published** `*-r001` each. Content hashes **exact-match** B3 population-manifest expected r001 hashes.

| Code | Revision | Lifecycle | content_sha256 prefix | Applicability | Pins | Components | Units | Topics | Outcomes | Route sets |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 9231 | 9231-r001 | published | `f3f2b9ce60a90826` | 2023 May/June → 2030 Oct/Nov | 0 | 7 | 4 | 24 | 84 | 0 |
| 9489 | 9489-r001 | published | `d451305b40252172` | 2027 May/June → 2029 Oct/Nov | 1 | 4 | 21 | 81 | 659 | 0 |
| 9609 | 9609-r001 | published | `47bef6703c0d26f3` | 2023 May/June → 2028 Oct/Nov | 0 | 4 | 5 | 34 | 345 | 0 |
| 9618 | 9618-r001 | published | `cbc4240de8d64cb3` | 2024 May/June → 2029 Oct/Nov | 0 | 4 | 19 | 45 | 366 | 0 |
| 9700 | 9700-r001 | published | `058a5aba48c0f80e` | 2025 May/June → 2030 Oct/Nov | 2 | 8 | 22 | 62 | 405 | 0 |
| 9701 | 9701-r001 | published | `987a41ef98117648` | 2025 May/June → 2030 Oct/Nov | 4 | 5 | 25 | 104 | 554 | 0 |
| 9702 | 9702-r001 | published | `286920d02cbfae80` | 2025 May/June → 2030 Oct/Nov | 4 | 5 | 27 | 81 | 373 | 0 |
| 9708 | 9708-r001 | published | `5bfc60acd8587c67` | 2023 May/June → 2028 Oct/Nov | 1 | 4 | 7 | 51 | 259 | 0 |
| 9709 | 9709-r001 | published | `e720d0d50929a2cc` | 2023 May/June → 2030 Oct/Nov | 3 | 9 | 6 | 38 | 153 | 0 |

Series policy (all nine): Feb/Mar `product_auto_assign=false`; May/June + Oct/Nov `true`.

**vs Reports 127–129:** Hosted is still the **historical r001-only** catalogue. No r002/r003 successors. No retirements. Compatible with B3 “legacy-adopt r001 identity / import successors” model **after** schema catch-up.

---

## 6. New-seven residue

| Code | Subject row | Versions | Memberships |
| --- | --- | --- | --- |
| 8021 | ABSENT | — | — |
| 9093 | ABSENT | — | — |
| 9626 | ABSENT | — | — |
| 9696 | ABSENT | — | — |
| 9699 | ABSENT | — | — |
| 9706 | ABSENT | — | — |
| 9990 | ABSENT | — | — |

**Unexpected residue:** **NONE**

---

## 7. Membership safety snapshot

| Metric | Value |
| --- | --- |
| Membership total | **15** |
| Primary key | `(user_id, subject_id)` — no surrogate `id` |
| `assessment_route_id` column | **MISSING** (all route IDs effectively N/A) |
| Option selections | table absent |
| Snapshot ready | **YES** (aggregates below; raw user UUIDs not published) |

### Pins by subject

| Subject | Memberships |
| --- | --- |
| 9489 | 1 |
| 9700 | 2 |
| 9701 | 4 |
| 9702 | 4 |
| 9708 | 1 |
| 9709 | 3 |
| 9231 / 9609 / 9618 | 0 |

### Pins by syllabus version (all historical r001)

| Subject | Revision | version_id | Pins |
| --- | --- | --- | --- |
| 9489 | 9489-r001 | 2 | 1 |
| 9700 | 9700-r001 | 5 | 2 |
| 9701 | 9701-r001 | 6 | 4 |
| 9702 | 9702-r001 | 7 | 4 |
| 9708 | 9708-r001 | 8 | 1 |
| 9709 | 9709-r001 | 9 | 3 |

**Cutover invariant:** every one of these 15 pins must remain on the same `syllabus_version_id` unless a later owner-authorized membership migration says otherwise.

---

## 8. Route / reference baseline

| Item | Hosted |
| --- | --- |
| Legitimate route/reference rows | **0** |
| Synthetic/test route residue | **NONE** (tables absent) |
| Unexpected route rows | **NONE** |

---

## 9. Hosted assignment resolver

Function: `public.lockdin_resolve_applicable_syllabus_version(p_subject_id integer, p_exam_year integer, p_exam_series exam_sitting_series) → integer`

| Contract check | Result |
| --- | --- |
| Present | YES |
| Filters `lifecycle = 'published'` | YES |
| Uses DB applicability (`applicable_session_range`) | YES |
| Joins `syllabus_version_exam_series` + `product_auto_assign` | YES |
| Fail closed on 0 or >1 | YES (array length check in function body) |
| Manifest `sources[].validity` | **NOT referenced** |
| Feb/Mar auto-assign enabled rows | **0** (all nine Feb/Mar policies false) |

**Hosted function matches tracked Phase 6 contract:** PASS (relative to applied head `0015`; not yet post-0016/0017 schema).

---

## 10. Intended hosted target (from frozen B3)

| Metric | Target |
| --- | --- |
| Subjects | 16 |
| Syllabus versions | 29 |
| Published | 21 |
| Retired | 8 |
| Route sets | 29 |
| Routes | 95 |
| Option groups / options / option-units / year maps | 13 / 45 / 72 / 54 |
| History r002 year maps | 27 |
| History AS component-null | 448 |

Forward version model and new-seven keys: unchanged from Reports 127–129 / §11 of the B4 brief.

Expected writes (conceptual, **not executed**):

| Write class | Count / note |
| --- | --- |
| New subjects | 7 |
| New syllabus versions | 20 |
| Historical r001 preserved | 9 (legacy-adopt / pin preserve) |
| Retirements | 8 (superseded r001 after successors publish) |
| Route manifests published | 29 |
| Membership writes | **0** |

---

## 11. Cutover write-set plan (ordered, not executed)

A. Hosted backup / restore point (see §13)  
B. Schema compatibility gate — apply `0016` then `0017`; re-verify physical contract  
C. Adopt seven new subject metadata rows  
D. Legacy-adopt current-nine r001 identity if any field still needs alignment (hashes already match)  
E. Import approved new immutable syllabus versions (20)  
F. Seed History r002 component catalogue  
G. Apply applicability windows  
H. Apply series policies (Feb/Mar false)  
I. Retire superseded r001 versions (pin-preserving)  
J. Resolver proof matrix  
K. Resolve all 29 route manifests  
L. Trusted hosted route publication — **only if separately authorized**  
M. Identical republish NO-OP proof  
N. Membership preservation comparison (expect 0 pin / 0 route-id deltas unless route-id backfill is separately authorized)  
O. Final integrity audit  

---

## 12. Tooling hosted-safety assessment

| Tooling | Current posture | Verdict |
| --- | --- | --- |
| B3 orchestrator (`syllabus:b3-local-adopt`) | Hard loopback block | **LOCAL-ONLY HARD BLOCKED** |
| B3R fresh reproduction | Loopback + destructive local flag | **LOCAL-ONLY HARD BLOCKED** |
| Route-manifest publish | `LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION=1` + loopback | **LOCAL-ONLY HARD BLOCKED** |
| Generic syllabus import / adopt / publish CLI | Uses `DATABASE_URL`; **no** loopback gate | **UNSAFE / NEED NEW SAFETY GATE** |
| Applicability CLI / populate | No loopback gate | **UNSAFE / NEED NEW SAFETY GATE** |
| Component-catalogue CLI | No loopback gate | **UNSAFE / NEED NEW SAFETY GATE** |

**Do not weaken local-only guards.**

### Proposed one-time hosted cutover gate (design only — not implemented in B4)

Require **all** of:

1. `LOCKDIN_ALLOW_HOSTED_CATALOGUE_CUTOVER=1`
2. Explicit expected project ref `hazvcdrcvsxmuwdfiucx`
3. Explicit expected non-loopback host fingerprint (pooler/direct for that ref)
4. Explicit repository commit `a304be6634c7b5d29e2542bd124abb5e33dca0c4` (or later freeze SHA)
5. Pre-cutover fingerprint/counts matching this Report 130 baseline (or a refreshed read-only snapshot)
6. Explicit backup-completed confirmation flag/token
7. Migration head gate: hosted must already be at `0017` before catalogue writes

---

## 13. Backup / recovery

| Mechanism | Observed |
| --- | --- |
| Supabase physical backups CLI (`backups list`) | `walg_enabled=true`, `pitr_enabled=false`, `backups=[]` |
| Point-in-time recovery | **Not enabled** |
| Logical dump option | Available in principle (`pg_dump` / Supabase dump) — **not taken in B4** |

**Recovery readiness:** **BLOCKED / WEAK** for automated PITR.

**Before any hosted write slice:**

1. Enable / confirm a usable restore path (PITR **or** fresh physical backup **or** verified logical dump of catalogue + membership tables).
2. Catalogue-only logical backup should include at minimum: `subjects`, `syllabus_versions`, graph tables, `syllabus_version_exam_series`, `user_subjects`, and (after 0016) all assessment route/option tables.
3. Halfway-failure recovery: prefer restore-to-timestamp/backup over DELETE — published versions and published route sets are immutable; partial imports are not safely “undone” by ordinary deletes.

---

## 14. Transaction boundaries / resumability

| Phase | Atomicity | Resumability |
| --- | --- | --- |
| Schema migrate 0016/0017 | Per-migration transaction (Drizzle) | Re-run migrate only if journal incomplete |
| Version import | Per-version preferred | Identical hash → NO-OP / reuse; different hash same revision → FAIL CLOSED |
| Component catalogue | Per-version | Idempotent seed + rehash drafts if needed |
| Applicability / series / retire | Per-version or small batches | Fail closed on overlap/exclusion |
| Route publication | Per route-set | Identical publish → NO-OP; mismatch → FAIL CLOSED |
| Global single transaction for all 29 publishes | Impractical | Resume from unpublished sets only |

Membership mutation must remain outside the catalogue write path.

---

## 15. Stop conditions

Stop immediately if any of:

- hosted schema still missing 0016/0017 or cardinality columns
- unexpected migration history / hash mismatch on 0000–0015
- unexpected catalogue counts vs refreshed baseline
- unknown current-nine content hash
- membership snapshot changes during cutover
- unclassified route/reference residue
- resolver ambiguity (0 or >1)
- Feb/Mar `product_auto_assign=true`
- candidate / manifest hash mismatch
- publication mismatch
- any membership pin mutation
- required backup/restore path unavailable

---

## 16. Post-cutover verification plan

Prove:

- 16 / 29 / 21 / 8 subjects/versions/lifecycle
- 29 route sets / 95 routes / option + year-map counts
- History 448 AS null + 27 r002 year maps
- resolver matrix + Feb/Mar fail closed
- membership pins unchanged (15 rows; same version ids)
- `assessment_route_id` unchanged unless separately authorized backfill
- orphan count 0; cross-version refs 0; ambiguous applicability 0
- published route hashes exact; republish NO-OP 29/29

---

## 17. Product / UI exposure risk

| Question | Answer |
| --- | --- |
| Does `GET /api/subjects` return all DB subjects? | **YES** (`artifacts/api-server/src/routes/subjects.ts`) |
| Does onboarding load that catalogue for selection? | **YES** (`artifacts/revision-platform/src/pages/onboarding.tsx`) |
| Would adding 7 subjects make them immediately selectable? | **YES** |
| Does current UI support assessment route / study-option selection? | **NO** (no route-selection surface found) |
| Are new route fields currently ignored by UI? | Route tables/columns **absent** on hosted today; UI does not consume them |

**Classification:**  
**HOSTED CATALOGUE MUST WAIT FOR PRODUCT INTEGRATION**  
**or** an explicit visibility/feature-gate (not designed/implemented in B4) so unfinished subjects cannot enter onboarding.

### Cutover timing recommendation

**B. AFTER API/UI route integration (and/or subject visibility gate), but before RC QA**

Also blocked on **hosted schema catch-up** first.

Not recommended: catalogue adoption before 0016/0017, or before a student-facing exposure control.

---

## 18. Final GO / NO-GO

### Verdict

**NO-GO — REMEDIATION REQUIRED**

### Blockers (ordered)

1. **Hosted migrations behind** — missing `0016` + `0017`; entire route/option schema absent.  
2. **Backup/PITR weak** — PITR disabled; physical backup list empty; need verified restore point before writes.  
3. **Product exposure** — new subjects would appear in live onboarding without route-selection UX.  
4. **Hosted cutover safety gate** — generic syllabus/applicability/component CLIs are not yet gated for hosted use.

### Non-blockers / positive findings

- Current-nine r001 content hashes match B3 expected hashes (legacy-adopt friendly).  
- New-seven residue absent.  
- Membership snapshot small, well-defined, all on r001.  
- Resolver contract healthy; Feb/Mar fail closed.  
- No route residue to clean.

---

## 19. Recommended next slice

**NEXT (owner-authorized, separate):**

1. **Hosted schema catch-up preflight + apply** for tracked `0016` → `0017` only (with backup/restore proof).  
2. In parallel or immediately after: **product visibility / route-selection integration plan**.  
3. Implement the **hosted catalogue cutover safety gate**.  
4. Only then: **controlled hosted catalogue + route publication cutover** using frozen B3 artifacts.

**Do not execute hosted cutover from this report alone.**

---

## 20. Data safety (this slice)

| Action | Count |
| --- | --- |
| Hosted writes | **0** |
| Hosted migrations applied | **0** |
| Membership changes | **0** |
| Vercel changes | **0** |
| Commit | **NONE** |
| Push | **NONE** |
