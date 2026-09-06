# LOCKDIN — PHASE 7 B5D FINAL PRODUCTION CUTOVER / QA

**Date:** 2026-09-06 UTC

**Status:** CLOSED — PASS WITH ACCEPTED REVIEW ITEMS — migration 0019 succeeded with zero passive data drift, all B5D core requirements are fixed and verified, owner accepted B5D-006 (Medium) and unexecuted accessibility smoke as non-blocking residual items

**B5D-F3R application SHA:** `eb79025ad37681dbef57d4b0d2f4120237c4a739`

**Current origin/main (pre-close):** `d976335fa4d1b3f18187135a4164c6de1627f616`

## Repository

- **B5D-F3R application SHA:** `eb79025ad37681dbef57d4b0d2f4120237c4a739`
- **Current origin/main (pre-close):** `d976335fa4d1b3f18187135a4164c6de1627f616`
- **B5D close commit:** `548e29edb28c0e18ea468d4d982226501461d755`
- **Deployment descendant proof:** The three commits after B5D-F3R are documentation-only reports (141, 142, 143). Git diff `eb79025..HEAD` shows only added documentation files with 504 insertions, zero product-code changes.
- **Working-tree boundary:** Clean before Report 144 creation (only `.playwright-mcp/` untracked, a build artifact directory, removed before freeze)

## Fresh Production Backup

The authoritative snapshot-bound backup and restore fidelity were completed in Report 143:

- **Snapshot-bound backup:** PASS — Exported MVCC snapshot `00000036-000032F3-1` with pg_dump, 874,548 bytes, SHA-256 `b00e8f235615faee6df147c546ea769f0534bb7c1d5e8a5989895cfb83152abf`
- **Full restore:** PASS — Restored into fresh PostgreSQL 17.6.1.143 container with `pg_restore --exit-on-error --no-owner --no-acl`, exit code 0
- **Restore fidelity:** PASS — All six canonical hashes match exactly (pins, routes, options, catalogue counts, membership counts, new-seven/Feb-Mar invariants)

No new backup was created for this report. Report 143's authoritative snapshot-bound backup remains the proven baseline.

## Production Migration

- **Pre-cutover state:** 19 migrations / `0018_subject_visibility_and_route_assignment` (timestamp `1788080000000`)
- **Post-cutover state:** 20 migrations / `0019_route_option_group_applicability` (timestamp `1788090000000`)
- **Passive data drift:** NONE — All canonical hashes unchanged after migration 0019
- **Production cutover:** Completed successfully per Report 143 verification

## Deployment

### Web Deployment

- **Deployment ID:** `dpl_GCb2HKPPnzs6w243npFGKHnZpaNk`
- **URL:** `lockdinapp-ln304d0ni-actif-devs.vercel.app`
- **State:** READY
- **Git SHA:** `d976335fa4d1b3f18187135a4164c6de1627f616`
- **Commit message:** `docs: close B5D route snapshot reconciliation`

### API Deployment

- **Deployment ID:** `dpl_HLq93MhpT4dGiQpjCDm6HEguoten`
- **URL:** `lockdinapp-dena4imae-actif-devs.vercel.app`
- **State:** READY
- **Git SHA:** `d976335fa4d1b3f18187135a4164c6de1627f616`
- **Commit message:** `docs: close B5D route snapshot reconciliation`

### B5D-F3R Implementation Live

**YES** — Both deployments contain the frozen B5D-F3R implementation (commit `eb79025`) with only documentation additions afterward. The serving product tree is the B5D-F3R codebase.

## B5D-001

**FIXED**

Production browser evidence confirms the Settings route-aware enrollment / remediation UI presents the route picker before submission and no longer attempts the original route-less Save path. The historical defect was that Settings new-subject enrollment did not present the required assessment route picker/options before Save, causing the frontend to attempt enrollment without a valid route assignment. B5D-F1 fixed this, and subsequent Production browser runs proved the route picker appears before Save.

## B5D-002

**PASS**

Safe client validation errors are working correctly. Users receive appropriate client-side validation feedback for invalid route/option selections. Server HTTP 400 responses were not intentionally forced during this QA cycle but are covered by existing validation logic.

## B5D-003

**FIXED**

The multi-group study option constraint violation is resolved. History Full A Level now correctly enforces exactly one option from each of the three required groups (Modern Europe, First World War origins, European interwar depth study). Same-group second selection is blocked correctly. Three required 1/1 groups: PASS.

## B5D-004

**FIXED**

### Route Hydration
- **PASS** — Saved Full A Level route (ID 13) survives navigation away/back
- **PASS** — Saved route survives hard reload
- **PASS** — Saved route survives sign-out/sign-in cycle

### Option Hydration
- **PASS** — All three saved options [1, 4, 7] survive navigation
- **PASS** — All three saved options survive hard reload
- **PASS** — All three saved options survive sign-out/sign-in cycle

### Reload / Navigation / Refetch
- **PASS** — No empty-option hydration regression after navigation
- **PASS** — No empty-option hydration regression after hard reload
- **PASS** — No empty-option hydration regression after session persistence

### Session Persistence
- **PASS** — Manual sign-out/sign-in cycle completed by owner
- **PASS** — Post-sign-in confirmation: History route 13, options [1,4,7] exactly preserved

## B5D-005

**FIXED**

### Full → AS
- **PASS** — Controlled mutation from Full A Level (route 13) to AS Level (route 11)
- **Result:** HTTP 200, syllabus version 2 unchanged
- **AS-only group filtering:** PASS — Only AS-applicable options (group 1) remained
- **A-Level groups excluded:** PASS — Paper 3 and Paper 4 options removed atomically
- **AS save:** PASS
- **Stale A-Level options removed:** PASS
- **Reload:** PASS — Route 11 persisted with options [1]

### AS → Full
- **PASS** — Controlled restoration from AS (route 11) to Full A Level (route 13)
- **Result:** HTTP 200, syllabus version 2 unchanged
- **Route restoration:** PASS — Full A Level route 13 restored
- **Options restoration:** PASS — Full three-option set [1,4,7] restored
- **Three required 1/1 groups:** PASS
- **Same-group second selection:** BLOCKED CORRECTLY

## B5D-006

**Past Papers off-route warning: FAIL**

### Reproduction
A controlled AS-state check was performed during browser QA:

1. History was saved temporarily as AS route ID 11
2. In Past Papers, Paper 3 was selected
3. **Observed behavior:**
   - Past Papers did NOT request the assessment route catalogue
   - Paper 3 / Paper 4 appeared as ordinary choices
   - Selecting Paper 3 produced NO off-route warning
   - The shipped off-route warning requirement did not work

### Paper Submission
The paper was **not submitted** in this off-route state. Only selection was exercised. Route/version/options remained intact throughout.

### Severity
**MEDIUM** — This is a UX defect that reduces user guidance but does not corrupt data. Paper logging does not mutate route/version/options, the whole syllabus remains intact, and users can still use Past Papers functionality. There is no evidence of data corruption or release-blocking behavior.

### Data Integrity Impact
**NONE** — The off-route state did not affect route assignment, syllabus version, or option selections. The defect is limited to missing warning UI feedback.

## Study Plan

- **Create:** PASS — Temporary task creation workflow exercised successfully
- **Edit:** NOT EXECUTED — Edit functionality was not actually exercised during the documented browser QA. No shipped Edit control was available or exercised.
- **Complete:** PASS — Task completion workflow exercised successfully
- **Dashboard refresh:** PASS — Tasks reflected correctly on dashboard
- **Cleanup:** PASS — Temporary task deletion converged successfully

## Past Papers

- **Normal attempt:** PASS — Temporary paper attempt workflow exercised successfully
- **Cleanup:** PASS — Temporary paper deletion converged successfully, paper log returned to empty baseline
- **Route/version/options preserved:** PASS — History remained at version 2, route 13, options [1,4,7] after paper cleanup
- **Off-route warning:** FAIL — B5D-006 (see above)

## Progress

- **Whole-syllabus denominator:** PASS — History remained full syllabus with 81 subtopics
- **Route-change preservation:** PASS — Progress preserved during Full → AS → Full cycle
- **UI:** PASS — No NaN/undefined regression observed, progress tracking works correctly

## Navigation

- **Hard refresh:** PASS — State persisted correctly
- **Back/Forward:** PASS — Browser navigation worked without redirect loops
- **Direct URLs:** PASS — Direct URL access worked correctly
- **Sign-out/in:** PASS — Session persistence cycle completed successfully

## Responsive

- **Desktop:** PASS — Tested at approximately 1440×1000, all views functional
- **Mobile 390×844:** PASS — Required mobile views exercised (Settings, route/options, Dashboard, Study Plan, Past Papers, Progress)
- **No horizontal overflow or blocking clipped controls:** PASS

## Accessibility

**NOT EXECUTED** — The dedicated keyboard smoke test (Tab, Shift+Tab, Space, Enter on route radios, study-option checkboxes, focus states, labels/errors, Save state) was not completed in the documented browser QA evidence. No PASS or PARTIAL state can be claimed.

**Owner review note:** The owner accepts the unexecuted dedicated keyboard accessibility smoke as a non-blocking residual QA gap for B5D closeout. This is NOT evidence of accessibility compliance.

## Hidden Seven

- **Still hidden:** PASS — New-seven subjects remain non-selectable
- **Visibility mutations:** 0 — No new-seven visibility changes occurred during cutover or QA

## Final Hosted State

Based on Report 143 authoritative snapshot and Report 142 baseline:

- **Migration:** 20 / 0019
- **Subjects:** 16
- **Versions:** 29
- **Published:** 21
- **Retired:** 8
- **Route sets:** 29
- **Routes:** 95
- **Memberships:** 15
- **New-seven selectable:** 0
- **Feb/Mar:** 0
- **Historical non-QA pin drift:** 0
- **Historical non-QA route backfills:** 0
- **Historical non-QA option backfills:** 0
- **QA fixture History:** version 2 / route 13 / options [1,4,7]
- **Temporary task residue:** 0
- **Temporary paper residue:** 0

## Runtime

### Web Runtime Logs (Last 1 hour)
- **Unexpected 5xx:** NONE
- **Fatal exceptions:** NONE
- **Observed logs:** Normal HTTP 304 cache hits for API endpoints (`/api/tasks`, `/api/subjects`, `/api/user-subjects`, `/api/profile`, `/api/progress/overview`, `/api/past-paper-attempts`, `/api/subjects/*/performance`, `/api/subjects/*/syllabus-versions/*/assessment-routes`)
- **Deployment:** `dpl_GCb2HKPPnzs6w243npFGKHnZpaNk` (branch `main`, SHA `d976335`)

### API Runtime Logs (Last 1 hour)
- **Result:** No logs found — This is due to Vercel Hobby plan runtime-log retention (1 hour). The API deployment is READY (`dpl_HLq93MhpT4dGiQpjCDm6HEguoten`, SHA `d976335`) but recent log history is not available.
- **Classification:** NOT EXECUTED — TOOLING UNAVAILABLE (plan retention limit)

### Migration-Related Errors
- **NONE** — No migration-related errors observed in available Web logs

### Route-Assignment Errors
- **NONE** — No route-assignment errors observed in available Web logs

### Past Papers Errors
- **NONE** — No Past Papers errors observed in available Web logs

### Expected Validation 4xx
- Expected safe client validation responses are NOT classified as crashes

## Defects

| Severity | Count | Detail |
| --- | ---: | --- |
| Blocker | 0 | None |
| Critical | 0 | None |
| High | 0 | None |
| Medium | 1 | B5D-006: Past Papers does not warn on off-route paper selection |
| Low | 0 | None |

## Product Changes During Cutover / QA

**NONE** — No product-code changes were made during the B5D cutover or QA cycle. All changes after B5D-F3R were documentation-only reports.

## Documentation

- **Report 144:** CREATED and corrected (metadata housekeeping)

## Commit / Push

- **Report 144:** COMMITTED AND PUSHED (B5D close commit)
- **Push:** PASS

## Final Verdict

**PASS WITH OWNER REVIEW**

**Owner review:** ACCEPTED

**Accepted residual items:**
- B5D-006 Medium — deferred to a separate post-B5D fix/backlog slice
- Dedicated keyboard accessibility smoke NOT EXECUTED — documented residual QA gap

**Formal B5D status:** CLOSED — PASS WITH ACCEPTED REVIEW ITEMS

This does NOT mean B5D-006 is fixed.
This does NOT mean accessibility was tested.

**B5D closure summary:**
1. **Migration 0019:** Successful with zero passive data drift
2. **Core B5D requirements:** All fixed and verified (B5D-001, B5D-003, B5D-004, B5D-005)
3. **B5D-002:** Safe client validation working correctly
4. **Route persistence/hydration:** PASS
5. **Full→AS→Full:** PASS
6. **Study Plan core behavior:** PASS
7. **Past Papers core logging:** PASS
8. **Progress:** PASS
9. **Navigation:** PASS
10. **Desktop/mobile:** PASS
11. **Hidden seven:** Remain hidden
12. **Feb/Mar:** Remain disabled
13. **Runtime health:** Acceptable (no 5xx, no fatal exceptions in available logs)

## B5E Boundary

B5D is formally closed after this report freeze.

B5E may begin only as its already-defined:
- Controlled new-seven visibility PRE-FLIGHT

Do NOT enable the seven subjects merely because B5D is closed.
Do NOT change visibility in this task.
Compliance / beta-invitation restrictions remain separate.

## Recommendation

B5D is formally CLOSED.

Next authorized phase:
B5E controlled new-seven visibility PRE-FLIGHT.

Do NOT enable visibility in this task.
Compliance / beta-invitation restrictions remain separate.