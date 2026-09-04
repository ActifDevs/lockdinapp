# LOCKDIN — PHASE 7 B5C HOSTED HIDDEN-CATALOGUE CUTOVER

**Report:** 133  
**Date:** 2026-09-04  
**Status:** **B5C/B5CR CLOSED AND FROZEN**  
**B5C Production cutover:** PASS  
**B5CR tooling reproducibility:** PASS  
**Browser QA:** DEFERRED TO B5D INTERNAL/RC QA  
**New seven:** HIDDEN  
**Prior:** Report 132 B5B/B5BR CLOSED AND FROZEN  

**Repository baseline (pre-freeze):** `8978d3beda7d90db6069b5783c49c047af1af3a1`  
`feat(product): integrate assessment routes and safe catalogue visibility`

**Hosted Production after B5C:**

| Metric | Value |
| --- | --- |
| Migration count | **19** |
| Migration head | `0018_subject_visibility_and_route_assignment` |
| Subjects | **16** |
| Syllabus versions | **29** |
| Published | **21** |
| Retired | **8** |
| Published route sets | **29** |
| Routes | **95** |
| Route components | **333** |
| Study option groups | **13** |
| Study options | **45** |
| Option-unit mappings | **72** |
| Year mappings | **54** |
| History r002 year mappings | **27** |
| History AS component-null | **448** |
| Current nine selectable | **9/9** |
| New seven selectable | **0/7** |
| Memberships | **15** (unchanged pins) |
| `assessment_route_id` populated | **0** |
| Option selections | **0** |
| Feb/Mar `product_auto_assign` | **0** |
| Production product SHA | `8978d3beda7d90db6069b5783c49c047af1af3a1` (already live) |

**Not performed in B5C/B5CR freeze:** new-seven visibility enablement, membership repin, route backfill, beta invitations, B5D browser QA, additional catalogue/reference publication, Vercel redeploy.

---

## 0. Purpose

First authorized Production slice for:

1. Apply tracked `0018`
2. Adopt the approved 16-subject catalogue with new seven **hidden**
3. Publish the approved route/reference model (29 manifests)
4. Verify frozen route-aware product against completed data (no ceremonial redeploy)

---

## 1. Repository preflight

| Check | Result |
| --- | --- |
| Branch | `main` |
| HEAD | `8978d3beda7d90db6069b5783c49c047af1af3a1` |
| `origin/main` | `8978d3beda7d90db6069b5783c49c047af1af3a1` |
| Working tree at start | CLEAN |

---

## 2. Hosted identity

| Item | Value |
| --- | --- |
| Project | Lockdin-app |
| Project ref | `hazvcdrcvsxmuwdfiucx` |
| Region | `eu-west-1` |
| Environment | Production hosted |
| Connection proof | Session pooler host contains project ref; secrets not recorded |

---

## 3. Vercel preflight (before DB writes)

| Project | Production SHA | State |
| --- | --- | --- |
| `lockdinapp` (API) | `8978d3beda7d90db6069b5783c49c047af1af3a1` | READY |
| `lockdinapp-web` | `8978d3beda7d90db6069b5783c49c047af1af3a1` | READY |

**Classification:** **A — ALREADY B5B**

**Runtime health (24h errors at preflight):** none observed for either project.

**Compatibility note:** B5B product was already live against hosted still on `0017` at preflight — treated as an active compatibility window; controlled `0018` + catalogue + routes prioritized. No improvised redeploy.

**After cutover:** same SHA still READY — **CASE A — do not redeploy for ceremony.**

---

## 4. Pre-cutover hosted fingerprint

| Metric | Required | Observed |
| --- | --- | --- |
| Migrations | 18 / `0017` | PASS |
| Subjects / versions / published / retired | 9 / 9 / 9 / 0 | PASS |
| Memberships | 15 | PASS |
| Route sets / routes | 0 / 0 | PASS |
| New seven | ABSENT | PASS |
| `assessment_route_id` non-null | 0 | PASS |
| Feb/Mar auto-assign | 0 | PASS |
| Current-nine r001 content hashes | B3/B4/B5A match | PASS |

**Membership aggregate:** 9489:1, 9700:2, 9701:4, 9702:4, 9708:1, 9709:3, others:0.

**Membership snapshot SHA-256:**  
`649a60a12ce103b9177272f47c9dbc5ba21d4ba3a72084b156bcbcfeb189b5b8`

---

## 5. Fresh recovery artifact

| Item | Value |
| --- | --- |
| UTC timestamp | `20260904T224604Z` |
| Type | `pg_dump` custom `--schema=public --schema=drizzle --no-owner --no-acl` |
| Size | **310090** bytes |
| SHA-256 | `e6e6fc21b45b92094ca2c84eb1e980a884604cd9019acb20eae0c3ef9a3c4735` |
| Storage | `~/lockdin-recovery/b5c/` (mode 700), outside git |
| Git storage | NO |
| Retained after cutover | YES |

---

## 6. Restore + full B5C rehearsal

| Step | Result |
| --- | --- |
| Disposable local Postgres | `127.0.0.1:55433` container `lockdin-b5c-restore` (not reused from B3/B5A) |
| Restore semantic match to hosted pre-cutover | PASS (18/`0017`, 9/9/15, routes 0, snap SHA match) |
| Apply `0018` via tracked migrate | PASS → 19 / `0018` |
| Post-0018 pre-catalogue fingerprint | subjects 9, memberships 15, routes 0, snap unchanged |
| Catalogue adoption (B3 tooling) | PASS after supersession prep (see §6.1) |
| History P1–P4 + 448 AS-null | PASS |
| Resolver matrix | PASS |
| Route structural/hash/DB resolve | PASS 29/29 |
| Route publication + identical republish | PASS / NO-OP 29/29 |
| Final rehearsal counts | 16 / 29 / 21 / 8 / 29 / 95 / 333 / 13 / 45 / 72 / 54 |
| Membership invariance | PASS (snap SHA exact) |
| Product/API route viability (SQL/RPC) | PASS |

### 6.1 Supersession prep (required on hosted-from-restore path)

Frozen B3R fresh DBs publish current-nine r001 **without** successor-overlapping windows first. Hosted baseline already had overlapping published r001 windows, so applicability apply for successors failed with `applicability_window_overlap`.

**Deterministic prep (content/pins unchanged):** null `applicable_from_*` / `applicable_to_*` on the eight superseded published r001 keys immediately before successor applicability + publish/retire. End state matches B3 retired r001 (null windows).

---

## 7. Production apply gate reconfirm

| Check | Result |
| --- | --- |
| Repository commit | `8978d3b…` |
| Hosted project ref | `hazvcdrcvsxmuwdfiucx` |
| Hosted head pre-0018 | `0017_route_reference_immutability` |
| Fresh backup verified | YES |
| Restore + full rehearsal | PASS |
| Membership snapshot | unchanged |
| Hosted baseline fingerprint | unchanged |

---

## 8. Hosted migration `0018`

| Item | Result |
| --- | --- |
| Path | `pnpm --filter @workspace/db migrate` (tracked only) |
| Count / head | **19** / `0018_subject_visibility_and_route_assignment` |
| Visibility default | `false` |
| Current nine selectable | **9/9** |
| Subjects/versions/memberships/routes after migrate | still 9 / 9 / 15 / 0 |
| Membership snap | unchanged |
| Forbidden paths | not used (`drizzle-kit push`, Dashboard DDL, ad-hoc ALTER) |

---

## 9. Post-0018 fingerprint

**SHA-256:** `9e3b60018afdd54f94b71349553a015e4ac7d9ab097eca5435553235a73272fa`  

Canonical payload stored outside git at `~/lockdin-recovery/b5c/post0018-fingerprint.json` (includes membership snap, r001 content hashes, counts, head, visibility).

---

## 10. Hosted cutover gate

One-shot env boundary (not persisted in shell profile):

- `LOCKDIN_ALLOW_HOSTED_CATALOGUE_CUTOVER=1`
- exact project ref / repository commit / migration head `0018…`
- backup confirmed
- expected/actual fingerprint = post-0018 fingerprint above

**Gate:** AUTHORIZED for catalogue + route mutation.

### 10.1 Operational wiring note (review)

Frozen CLIs called `assertCatalogueMutationAuthorized({ argv })` without loading `hostedCutoverGateInputFromEnv()`, and route publish CLI only called the local publication gate. During B5C:

1. Ephemeral in-tree wiring was applied for the cutover window (auto-load env gate; hosted route publish path).
2. Out-of-repo orchestrators under `~/lockdin-recovery/b5c/` drove the B3 write-set with `--hosted-cutover`.
3. In-tree wiring was **reverted** after cutover so the preferred repository diff remains Report 133 only.

**Recommendation:** permanently land the env auto-load + hosted route CLI path in a follow-up freeze so future slices do not need ephemeral patches.

---

## 11. Hosted catalogue adoption

| Item | Result |
| --- | --- |
| New subject rows | **7** |
| New syllabus versions | **20** |
| Historical r001 preserved | **9** |
| Superseded r001 retired | **8** |
| Membership writes | **0** |
| New-seven `selectable_for_new_memberships` | all **false** |
| Chemistry model | `9701-r001` retired; `r002` 2025–2027 current; `r003` 2028–2030 published; four memberships remain on r001 |
| History 9489-r002 | P1–P4 present; **448** AS component-null |
| Feb/Mar enabled | **0** |

---

## 12. Hosted route resolution + publication

| Check | Result |
| --- | --- |
| Structural | PASS 29/29 |
| Hash | PASS 29/29 |
| DB resolution dry-run | PASS 29/29 |
| Publish | 29 published |
| Identical republish | NO-OP 29/29 |
| Counts | sets 29 / routes 95 / components 333 / groups 13 / options 45 / units 72 / year maps 54 / History r002 maps 27 |

---

## 13. Membership post-cutover proof

| Check | Result |
| --- | --- |
| Rows | 15 |
| Version-pin changes | 0 |
| Route-ID changes | 0 |
| Route-ID populated | 0 |
| Option-selection rows | 0 |
| Snapshot SHA | exact pre-cutover match |

---

## 14. Product deployment decision

**CASE A** — `8978d3b` already live on API + web Production. **No redeploy.**

Post-cutover Vercel confirmation: both projects still READY on `8978d3beda7d90db6069b5783c49c047af1af3a1`.

---

## 15. Product smoke

| Surface | Result | Method |
| --- | --- | --- |
| Current-nine catalogue filter | PASS | SQL equiv of `selectable_for_new_memberships` → exactly 9 current-nine codes |
| New-seven hidden | PASS | DB visibility false; not in selectable set |
| Existing legacy null-route memberships | PASS | 15 null routes preserved |
| Route catalogue for selectable targets | PASS | every current-nine current version has published route set (zero-route = 0) |
| EXPLICIT multi-route current targets | PASS | all nine current targets are multi-route |
| Settings / Past Papers / Progress UI | PASS WITH NOTE | not browser-exercised in this slice; code already frozen on live SHA; DB contracts required by those surfaces are present |
| No route assignment to existing 15 | PASS | no membership route writes |

**New-enrollment viability (read-only):** published route contracts exist for all selectable current-nine targets; no supported path is missing route reference data.

---

## 16. Resolver + integrity

| Check | Result |
| --- | --- |
| Forward resolver sample matrix | PASS |
| Feb/Mar | FAIL CLOSED (rehearsal + hosted) |
| Orphan versions/routes | 0 |
| Cross-version route refs | 0 |
| Membership drift | 0 |

---

## 17. Tests (frozen SHA)

| Suite | Result |
| --- | --- |
| `pnpm check:migrations` | PASS (19 / `0018`) |
| `test:route-manifest` | PASS (46) |
| `test:harness` | PASS (34 + 1 skipped) |
| `test:unit` | PASS (41) |
| `pnpm typecheck` | PASS |
| API `assessment-routes.test` | PASS |
| Frontend route/membership selection tests | PASS |

---

## 18. Hosted safety invariants

| Invariant | Result |
| --- | --- |
| New-seven visibility enabled | **NO** |
| Membership repin | **NONE** |
| Route backfill | **NONE** |
| Beta invitations | **NONE** |
| Public new-seven exposure | **NONE** |

---

## 19. Recovery readiness

| Item | Status |
| --- | --- |
| Fresh B5C dump retained | YES |
| SHA | `e6e6fc21b45b92094ca2c84eb1e980a884604cd9019acb20eae0c3ef9a3c4735` |
| Restore proof | PASS (pre-cutover rehearsal) |
| Outside repo | YES |

---

## 20. Remaining blockers / review notes (B5C-time)

At B5C close these notes were open:

1. Permanent hosted CLI gate wiring (ephemeral only during B5C; reverted).
2. Supersession window-null prep depended on out-of-repo SQL/scripts.
3. Full interactive browser smoke deferred.

**B5CR closes items 1–2.** Item 3 remains deferred to B5D (not a data-integrity blocker).

---

## 21. Repository (B5C-time)

| Item | Status |
| --- | --- |
| Report 133 | CREATED |
| Commit | **NONE** |
| Push | **NONE** |

---

## 22. B5C final verdict (historical)

**PASS WITH REVIEW NOTES**

B5C HOSTED HIDDEN-CATALOGUE CUTOVER COMPLETE.

HOSTED NOW CONTAINS THE FULL 16-SUBJECT CATALOGUE + ROUTE MODEL.

NEW SEVEN REMAIN HIDDEN.

---

## 24. B5CR — cutover-tooling reproducibility hardening

**Date:** 2026-09-04  
**Scope:** permanent operational tooling only  
**Hosted writes during B5CR:** **0**

### 24.1 Permanent hosted gate wiring

| Path | Change |
| --- | --- |
| `scripts/src/hosted-cutover/mutation-target.ts` | `--hosted-cutover` auto-loads `hostedCutoverGateInputFromEnv()` when no explicit gate object is passed. Fail-closed; DATABASE_URL alone never authorizes. |
| Syllabus import/adopt/publish, applicability apply, component-catalogue | Already call `assertCatalogueMutationAuthorized`; now inherit env gate on hosted mode. |
| `scripts/src/route-manifest/cli.ts` + `publish-safety.ts` | Permanent hosted publish path: `--hosted-cutover` → `assertHostedRoutePublicationAllowed` (full cutover gate). Local path unchanged (`LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION=1` + loopback). |

**Negative tests:** `scripts/src/hosted-cutover/__tests__/mutation-target.test.ts` (missing flag, wrong project/host/commit/migration/fingerprint/backup, local-vs-hosted separation, hosted route path).

### 24.2 Explicit supersession preparation

| Artifact | Role |
| --- | --- |
| `scripts/src/syllabus/supersession-prepare.ts` | Generic prepare: prove historical published + content hash + successor present + overlap; clear **only** applicability window fields; never touch content/pins/routes. |
| `scripts/src/syllabus/supersession-cli.ts` | `syllabus:prepare-supersession --plan=… [--apply] [--hosted-cutover]` with dry-run default. |
| `docs/reference-data/…/b5c-supersession-prepare-plan.json` | Eight generic targets (no pin counts; fresh-B3 safe). |
| `…/b5c-supersession-prepare-plan.hosted-restore.json` | Same targets + hosted pre-B5C pin counts. |
| `b3-local-adoption.ts` / `b3-local-publish-resume.ts` | Explicit **PREPARE SUPERSESSION** step before successor applicability. |

**Sequence (visible in logs):**  
historical published r001 → prepare supersession → apply successor applicability → publish successor → retire r001.

**Resumability:** per-target transaction for window clear; classify statuses `needs-clear` / `already-prepared` / `already-retired`; publish-resume skips already-published successors.

### 24.3 In-repo B5C reproduction orchestrator

`scripts/src/syllabus/b5c-cutover-rehearsal.ts` + `syllabus:b5c-cutover-rehearsal`

Against restored pre-B5C dump @ loopback after tracked `0018`:

1. Mocked hosted-gate wiring proof (non-authorizing for loopback writes)
2. `syllabus:b3-local-adopt` (includes explicit supersession via hosted-restore plan)
3. `route-manifest:b3-local-publish-all`
4. Final count + membership snapshot assertions

**No ephemeral patches. No out-of-repo orchestration. No manual SQL.**

### 24.4 B5CR reproduction results

| Check | Result |
| --- | --- |
| Restore pre-B5C dump (`~/lockdin-recovery/b5c/…`) | PASS — 18/`0017`, 9/9/15, routes 0, snap `649a60a1…` |
| Tracked `0018` | PASS — 19 / `0018` |
| Permanent tooling only | **YES** |
| Ephemeral patch required | **NO** |
| Manual SQL required | **NO** |
| Final catalogue | 16 / 29 / 21 / 8 |
| Routes | 29 / 95 (+ 333 / 13 / 45 / 72 / 54; History 27 + 448 AS-null) |
| Membership changes | **0** (snap exact) |
| New-seven hidden | **7/7** |
| Identical rerun (supersession already-retired + publish SKIP + routes NO-OP 29/29) | PASS |

Disposable DB: `127.0.0.1:55434` container `lockdin-b5cr-restore` (not Production).

### 24.5 Production reconfirm after B5CR

| Metric | Value |
| --- | --- |
| Migration | 19 / `0018` |
| Subjects / versions / published / retired | 16 / 29 / 21 / 8 |
| Route sets / routes | 29 / 95 |
| Memberships | 15 |
| New-seven selectable | 0/7 |
| Membership snap | unchanged |
| Hosted B5CR writes | **0** |

### 24.6 Browser smoke

**DEFERRED TO B5D INTERNAL/RC QA** — not an unresolved B5C data-integrity blocker.

### 24.7 B5CR tests

| Suite | Result |
| --- | --- |
| `pnpm check:migrations` | PASS |
| `test:route-manifest` | PASS |
| `test:harness` (incl. mutation-target) | PASS |
| `test:unit` (incl. supersession plan) | PASS |
| Hosted gate negatives | PASS |
| B5C backup reproduction | PASS |
| Idempotent rerun | PASS |
| `pnpm typecheck` | PASS |

### 24.8 B5CR remaining blockers

None for tooling reproducibility.

Deferred (B5D): interactive browser QA of Settings / Past Papers / Progress against hosted 16-subject + route model.

---

## 25. Final combined verdict

**PASS — B5C/B5CR CLOSED AND FROZEN**

B5C hosted hidden-catalogue cutover remains complete.

B5CR permanently lands hosted CLI gate wiring + supersession orchestration and proves B5C is reproducible from reviewed repository tooling alone against the retained pre-cutover backup.

New seven remain **HIDDEN**.

Interactive browser QA of Settings / Past Papers / Progress: **DEFERRED TO B5D**.

---

## 26. Recommendation

B5C + B5CR CLOSED AND FROZEN.

HOSTED FULL 16-SUBJECT DATA MODEL: **LIVE**

NEW SEVEN: **STILL HIDDEN**

NEXT:
**B5D — INTERNAL / RC BROWSER QA OF THE HOSTED 16-SUBJECT SYSTEM.**

**NO NEW-SEVEN VISIBILITY ENABLEMENT UNTIL B5D PASSES.**
