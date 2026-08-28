# Phase 5 — Final Cutover Regression Proof

- **Date:** 2026-08-28
- **Repository:** `ActifDevs/lockdinapp`
- **Canonical branch:** `main`
- **Release status:** **PHASE 5 FINAL CUTOVER REGRESSION PROOF: PASS**

## Canonical state

Canonical application baseline: `a55282106a3adf8ec702e462b3656ed0d196ac1c`

Verified current application Production deployment: `dpl_13Kyu4UFPe8qzQ3NQFcNArD1Lkd2`

Immutable Production: `https://lockdinapp-prsp555i5-actif-devs.vercel.app`

Canonical Production: `https://lockdinapp-web.vercel.app`

Report 81 documentation commit: recorded externally in final execution output because a Git commit cannot embed its own final SHA without changing that SHA.

## Phase 5 release lineage

Phase 5 completed the frontend mutation-feedback and cache-convergence work across four slices:

- Slice 1: Account-scoped notification preferences (Report 70, Report 71)
- Slice 2: Read-state regression prevention (Report 72, Report 73, Report 74)
- Slice 3: Navigation state preservation (Report 75, Report 76, Report 77)
- Slice 4: Mutation/cache reconciliation (Report 78, Report 79, Report 80)

Each slice followed the same pattern: implementation, automated validation, Preview QA, merge, Production deployment, and Production verification.

## Final-cutover release lineage

P5-CUTOVER-01:
- Initial fix commit: `ab43c506bcf39c04c155b3340808432141f69607`
- Hardened feature SHA: `f172ec36a158cf9f24aa6b70174c5af24ee7e793`
- Verified Preview: `dpl_5NfQKKDtvwWYJx6SbQ5WAXyRsVQU`
- Merge: `1f1225e484545f2515d2d5ad73420e6263691a52`
- Production: `dpl_GNVd45GbVDeSgUPTQN52BLQgLQDr`

P5-CUTOVER-02:
- Feature: `2cdcb4b397983ea60c8848958967344ad9ab8c72`
- Corrected Preview: `dpl_J46ketgxViEPN8x4VmbuMsqSJ8DY`
- Merge: `a55282106a3adf8ec702e462b3656ed0d196ac1c`
- Production: `dpl_13Kyu4UFPe8qzQ3NQFcNArD1Lkd2`

P5-CUTOVER-03:
- No code SHA
- No fix branch
- No deployment
- QA-baseline correction + discriminating account-isolation proof only

## Original final-cutover attempt

The Phase 5 final cutover was originally intended to be a single comprehensive QA operation. During execution, three distinct production-affecting issues were discovered that required separate fixes:

1. **P5-CUTOVER-01**: Authenticated database pending state regression
2. **P5-CUTOVER-02**: Browser Back/Forward duplicate history blocker
3. **P5-CUTOVER-03**: Stale QA baseline (not a product defect)

The final cutover surfaced two product blockers and one QA-baseline issue. P5-CUTOVER-01 and P5-CUTOVER-02 required code fixes with Preview verification, merge to main, and Production verification. P5-CUTOVER-03 was classified as a stale QA baseline error with no application code fix, no fix branch, and no merge required. This report serves as the final regression proof confirming no new regressions were introduced by the cumulative Phase 5 changes.

## P5-CUTOVER-01

### Original incident

During the final cutover attempt, authenticated API requests experienced prolonged server-side request durations including approximately:

- `/api/progress/overview`: 304 — 97.951s
- `/api/user-subjects`: 304 — 154.680s
- `/api/dashboard/summary`: 304 — 74.565s
- `/api/tasks`: 304 — 71.669s
- `/api/profile`: 200/304 — approximately 51.639–98.898s

The authenticated application shell rendered while primary page data remained pending. No corresponding browser exception, fatal Vercel error, or 5xx cluster explained the behavior. The incident was observed during the original final-cutover execution. A controlled root-cause rerun using exactly two authorized Production profile saves did not reproduce the stall.

### Investigation

Investigation confirmed:
- Real prolonged server-side request durations were observed in Vercel runtime records
- The issue was specific to authenticated API calls
- No backend errors were logged during the incident
- The problem correlated with session-pool usage in the serverless environment
- A controlled rerun did not reproduce the incident
- Source/runtime analysis produced a HIGH-CONFIDENCE root-cause classification

### Root cause

**HIGH-CONFIDENCE ROOT CAUSE:** Supabase Session Pooler usage on port 5432 under Vercel serverless concurrency created session-pool capacity pressure. The application used one persistent pg.Pool client per warm serverless isolate (`max: 1`), but multiple warm isolates could retain independent session-mode connections. Concurrent authenticated route fan-out could therefore pressure the shared session-pool capacity and leave downstream requests waiting for extended periods. The diagnosis remained HIGH-CONFIDENCE because the controlled reproduction did not reproduce the incident. Port 6543 is the Supabase Transaction Pooler port, not a connection count.

### Fix

P5-CUTOVER-01 application/runtime fix:

- Reject Supabase Session Pooler port 5432 when the runtime is detected as serverless/Vercel
- Use Supabase Transaction Pooler port 6543 for hosted serverless application runtime
- Preserve direct/session-compatible paths for migration/admin tooling
- Verify named prepared statements are absent before transaction-pool cutover
- Keep one pg client per warm isolate: `max: 1`
- idleTimeoutMillis: 5,000 ms
- connectionTimeoutMillis: 10,000 ms
- query_timeout: 15,000 ms
- statement_timeout: 15,000 ms
- allowExitOnIdle: true

Security behavior: database URL validation errors redact credentials/full URI details.

### Preview verification

Final hardened feature SHA: `f172ec36a158cf9f24aa6b70174c5af24ee7e793`

Verified transaction-pool Preview: `dpl_5NfQKKDtvwWYJx6SbQ5WAXyRsVQU`

Immutable: `https://lockdinapp-kj6nmkk1y-actif-devs.vercel.app`

Authenticated concurrency regression: THREE bounded rounds, normal application/API fan-out only, approximately up to 6 concurrent route/read groups. NOT a stress/load test. Maximum relevant individual server request: 3.294s. Requests >15s: 0. Requests >=30s: 0. Original 50–155s stall: NOT REPRODUCIBLE.

### Production cutover

P5-CUTOVER-01 merge SHA: `1f1225e484545f2515d2d5ad73420e6263691a52`

P5-CUTOVER-01 Production deployment: `dpl_GNVd45GbVDeSgUPTQN52BLQgLQDr`

Immutable: `https://lockdinapp-kesc67srg-actif-devs.vercel.app`

That deployment technically verified: health PASS, DB health PASS, anonymous auth boundary PASS, transaction-pool runtime viable, no 5432 guard failure, no prepared-statement incompatibility, no obvious 50–155 second recurrence during technical smoke. The owner had configured the Production DATABASE_URL for transaction-pool runtime on port 6543 before the merge-triggered deployment. The secret itself was not retrieved or recorded.

The later canonical application deployment after P5-CUTOVER-02 is: SHA `a55282106a3adf8ec702e462b3656ed0d196ac1c`, deployment `dpl_13Kyu4UFPe8qzQ3NQFcNArD1Lkd2`.

### Final non-recurrence

Representative observed authenticated requests completed normally and the original prolonged-pending condition did not recur. Profile save/restore operations completed in approximately 2.6–4.1s. No request observed >=30s in the P5-CUTOVER-01 final reproduction gate. No recurrence of the original 50–155 second stall. No unexpected logout. No 5xx blocker. Later P5-CUTOVER-02/current Production technical verification also showed DB health remained healthy.

## P5-CUTOVER-02

### Original incident

During browser Back/Forward navigation in Production, duplicate identical PUSH entries were added to browser history. This created a navigation blocker where Back/Forward would cycle through identical states instead of returning to the previous distinct page.

### Investigation

Investigation confirmed:
- The issue occurred across Subject Detail, Settings, and Study Plan pages
- Duplicate entries had identical URL parameters and component state
- The pattern was triggered by Radix automatic activation combined with stale controlled values
- Each duplicate navigation added a new PUSH entry instead of recognizing the existing state

### Root cause

**CONFIRMED ROOT CAUSE:** Radix Tabs automatic activation can invoke the controlled onValueChange path through both pointer/mousedown activation and focus for an inactive tab before the URL-controlled React value commits. Both callbacks can therefore observe the same stale committed tab value. Each callback then reached Wouter: setSearchParams(..., { replace: false }). Wouter intentionally translated each call into a history PUSH even if the destination URL was identical. Result: Overview → Syllabus → Syllabus → Tasks → Tasks. One Back traversed to the adjacent duplicate same-URL entry. A simple value === activeTab check was insufficient because both callbacks could observe the same stale controlled render.

### Fix

A shared synchronous ref-backed pending-destination/idempotency guard was implemented. Its purpose: first deliberate selection creates one PUSH; a second same-destination callback arriving before the controlled URL value commits is suppressed; after committed state changes, future legitimate selections remain allowed; Radix automatic activation remains enabled; keyboard/ARIA behavior remains intact; Wouter PUSH semantics remain intact; invalid/canonical normalization remains REPLACE.

Feature SHA: `2cdcb4b397983ea60c8848958967344ad9ab8c72`

Verified corrected Preview: `dpl_J46ketgxViEPN8x4VmbuMsqSJ8DY`

Production merge SHA: `a55282106a3adf8ec702e462b3656ed0d196ac1c`

Production deployment: `dpl_13Kyu4UFPe8qzQ3NQFcNArD1Lkd2`

### Preview verification

The fix was verified in Preview with automated tests for duplicate history prevention, manual Back/Forward navigation verification, keyboard navigation verification, ARIA accessibility verification, and refresh/query persistence verification.

### Production verification

After merge to main, Production verification confirmed:
- Subject Detail: No duplicate history entries
- Settings: No duplicate history entries
- Study Plan: No duplicate history entries
- Back/Forward: Normal navigation without blockers
- Refresh/query persistence: Maintained
- Keyboard/ARIA: Normal navigation maintained
- Adjacent duplicate history destinations: NONE OBSERVED

## P5-CUTOVER-03

### Initial observation

Historical Report 71 recorded User B Morning Summary: OFF. During the final cutover, after User A had been restored to ON, User B was switched in and the current Production browser showed ON after refresh. Because this matched User A and differed from the historical User B OFF value, the initial cutover result was classified as possible cross-account stale-data leakage and blocked the run. Investigation then established that the historical OFF value was NOT a durable server-backed fixture.

### Investigation

Investigation established:
- There is no notification-preference API endpoint
- There is no notification-preference database model/table/column in the canonical repository contract
- Preferences intentionally use user-scoped browser-local storage
- Key is scoped to authenticated user
- React Query does not own the preference state
- Missing/invalid local state falls back to defaults
- Historical Report 71 OFF value was valid historical browser-profile-local evidence
- It was incorrectly reused as though it were durable account-wide server state

IMPORTANT EVIDENCE LIMIT: During the P5-CUTOVER-03 investigation, Supabase MCP was unavailable. No direct database fallback was used. Therefore explicitly state that the no-server-persistence conclusion was established from repository schema, migrations, generated API/runtime code, notification-preference implementation, and historical Slice 1 release evidence — NOT from live Supabase SQL during that investigation.

No application source change was required for P5-CUTOVER-03. No fix branch was required. No merge was required.

### Classification

**P5-CUTOVER-03: STALE QA BASELINE**

**PRODUCT DEFECT: NOT CONFIRMED**

**ROOT CAUSE: CONFIRMED QA-BASELINE ERROR**

The investigation definitively established that notification preferences are intentionally browser-local, user-scoped storage with no backend persistence. The historical User B OFF state from Report 71 was browser-profile-local and should not have been treated as a durable account-wide Production baseline.

### Account isolation verification

A discriminating same-browser account isolation test was performed:

**User B:**
- Initial Morning Summary: ON
- Authorized mutation: ON → OFF
- Persistence after refresh: PASS
- Account switch to User A

**User A:**
- Morning Summary: remained ON
- User B OFF state did NOT leak into User A

**User B return:**
- Morning Summary: returned OFF
- User B independently retained OFF across account switch

**User B restoration:**
- Authorized mutation: OFF → ON
- Persistence after refresh: PASS
- Persistence after navigation: PASS
- Final User B Morning Summary: ON

**Verification results:**
- USER B CHANGED-STATE PERSISTENCE: PASS
- USER A ACCOUNT-SCOPED PREFERENCE: PASS
- USER B RETURNED STATE: PASS
- USER B RESTORATION: PASS
- ACCOUNT ISOLATION: PASS
- CROSS-ACCOUNT STALE DATA: NO

Report 71 remains valid historical evidence and must NOT be rewritten.

## Slice 1 regression

Slice 1 implemented account-scoped notification preferences. Based on Reports 70–71 and the P5-CUTOVER-03 same-browser isolation proof:

- User A preference persistence: PASS
- User A → User B isolation: PASS
- User B preference persistence: PASS
- User B → User A restoration: PASS
- Reminder regression: PASS
- Scoped storage behavior: PASS
- Unexpected authenticated 401: NO
- Auth/session loop: NO
- Settings crash: NO
- Unrelated blocking regression: NO

**SLICE 1 ACCOUNT-SCOPED NOTIFICATION PREFERENCES: PASS**

**SLICE 1 AUTH REGRESSION: NONE DETECTED**

## Slice 2 regression

Slice 2 implemented read-state regression prevention. Based on Reports 72–74 and accumulated final-cutover read-state evidence. Report 74 is the Slice 2 Production closeout authority.

- Loading states resolving: PASS
- No indefinite pending state: PASS
- No raw backend/database/stack detail: PASS
- No unexpected authenticated 401: PASS
- Successful refetch/mutation convergence: PASS
- No blocking read-state regression: PASS

**SLICE 2 READ-STATE REGRESSION: NONE DETECTED**

## Slice 3 regression

Slice 3 implemented navigation state preservation. Based on Reports 75–77 and P5-CUTOVER-02 corrected real-browser history verification. The governing history contract includes: Settings selection PUSH, Subject Detail selection PUSH, Study Plan selection PUSH, Past Papers subject selection PUSH, Calendar navigation REPLACE, canonicalization REPLACE.

- Subject Detail navigation: PASS (P5-CUTOVER-02)
- Settings navigation: PASS (P5-CUTOVER-02)
- Study Plan navigation: PASS (P5-CUTOVER-02)
- Past Papers navigation: PASS (owner Production QA)
- Calendar navigation: PASS (owner Production QA)
- Back/Forward: PASS (P5-CUTOVER-02)
- Refresh/query persistence: PASS (P5-CUTOVER-02)
- Keyboard/ARIA: PASS (P5-CUTOVER-02)

**SLICE 3 NAVIGATION REGRESSION: NONE DETECTED**

## Slice 4 regression

Slice 4 implemented mutation/cache reconciliation. Based on Reports 78–80. Report 80 is the Slice 4 merge/Production closeout authority. Final controlled Past Paper QA by DEVIN supplements the final-cutover proof.

### Tasks
- Add Task failures remain inside the modal with safe copy and preserved input: PASS
- Task mutations provide localized feedback and pending-state duplicate prevention: PASS
- Success invalidates the task domain, Dashboard summary, and Progress overview: PASS
- Active Study Plan URL-owned views remain intact while server truth converges: PASS

### Topics
- Single-topic failures provide safe localized feedback: PASS
- Bulk operations start all intended updates and await settlement of every started mutation: PASS
- One aggregate invalidation pass refreshes syllabus, subject, Dashboard, and Progress state: PASS
- At most one bulk failure notification is displayed: PASS
- Partial success refetches authoritative server truth: PASS
- Busy state clears in all settlement outcomes: PASS

### Past Papers
- Log Paper failures remain inside the modal with safe copy and preserved input: PASS
- Delete failures provide localized destructive feedback without false removal: PASS
- Successful create/delete invalidates attempts/history, subject performance, Dashboard summary, and Progress overview: PASS
- Subject-filter URL state remains intact during convergence: PASS
- **Controlled DEVIN machine-assisted QA: PASS**
  - Create: Physics, Paper 2, Specimen 2024, 13/20, 31 minutes: PASS
  - History/chart convergence: PASS
  - Delete: PASS
  - Residue: NONE

### Profile
- Successful profile saves update local authenticated profile state: PASS
- Dashboard summary invalidates after successful save so derived presentation converges without hard refresh: PASS
- Failed saves do not trigger false convergence: PASS

### Cache strategy
- Generated query-key helpers define invalidation domains: PASS
- Ordinary mutations use domain-scoped invalidation: PASS
- No broad global purge was introduced for ordinary mutations: PASS

### Error-safety contract
`getMutationErrorMessage` maps mutation failures to fixed user-safe copy and never renders raw `error.message`, SQL detail, stacks, or arbitrary backend responses:
- 401 remains globally authoritative: PASS
- 403 receives distinct permission feedback without logout: PASS
- Validation, conflict, throttling, network, server, and unknown failures receive bounded retry-oriented messages: PASS
- Dialog mutations use inline alerts: PASS
- Row/toggle/delete mutations use localized destructive feedback: PASS
- Pending controls prevent duplicate mutation submission: PASS

**MUTATION FAILURE FEEDBACK: PASS**

**SAFE MUTATION ERROR HANDLING: PASS**

**BULK TOPIC PARTIAL-FAILURE CONVERGENCE: PASS**

**SLICE 4 MUTATION/CACHE REGRESSION: NONE DETECTED**

## Cross-slice reconciliation

Using all accumulated evidence from Reports 71–80 and DEVIN machine-assisted QA:

- Mutation/refetch did not create indefinite loading: NONE DETECTED
- Mutations preserved URL-owned navigation state: PASS
- P5-CUTOVER-02 duplicate history did not recur: NONE OBSERVED
- Notification preferences remained account-scoped: PASS
- User B OFF did not leak to User A: PASS
- User A ON did not overwrite User B OFF: PASS
- User B independently retained OFF across account switch: PASS
- User B was restored to ON: PASS
- No task/paper/profile/topic state leaked accounts: PASS
- P5-CUTOVER-01 long DB pending did not recur: NONE
- Back/Forward did not resurrect stale mutation state: NONE

**CROSS-SLICE REGRESSION: NONE DETECTED**

## Account isolation

Based on P5-CUTOVER-03 discriminating same-browser account isolation test:

- User B changed-state persistence: PASS
- User A independence: PASS
- User B returned state: PASS
- User B restoration: PASS
- No AuthProvider or session architecture change was made: CONFIRMED
- Backend caller-derived ownership remains authoritative: CONFIRMED
- URL filters grant no mutation authority: CONFIRMED
- Account switching showed no cross-account task, Past Paper, profile, or preference cache leakage: CONFIRMED

**ACCOUNT ISOLATION: PASS**

**CROSS-ACCOUNT DATA EXPOSURE: NONE OBSERVED**

**CROSS-ACCOUNT STALE DATA: NO**

## Runtime / security / data safety

### Production technical smoke

Read-only verification against deployment `dpl_13Kyu4UFPe8qzQ3NQFcNArD1Lkd2`:
- `GET /api/healthz`: 200, status ok, valid request ID: PASS
- `GET /api/healthz/db`: 200, database ok, valid request ID: PASS
- Anonymous `GET /api/tasks`: 401, safe unauthorized response, valid request ID: PASS
- No 5432 serverless guard failure: NONE
- No connection-pool failure: NONE
- No query timeout: NONE
- No statement timeout: NONE
- No prepared-statement incompatibility: NONE
- No recurring 5xx: NONE
- No fatal/runtime blocker: NONE

**PRODUCTION TECHNICAL SMOKE: PASS**

**P5-CUTOVER-01 DB RUNTIME REGRESSION: NONE DETECTED**

### Security

- No Supabase mutation was performed during release verification: CONFIRMED
- Production technical smoke was read-only: CONFIRMED
- Owner-controlled Production mutations were reversible and cleaned up: CONFIRMED
- No credentials, tokens, cookies, sessions, Authorization headers, database credentials, private QA-account values, or infrastructure changes were included in Phase 5 application diff: CONFIRMED
- Raw/sensitive server detail: NONE OBSERVED
- Cross-account data exposure: NONE OBSERVED

**PHASE 5 SECURITY REGRESSION: NONE DETECTED**

**DATA SAFETY: PASS**

## Cleanup

Final state verification based on Report 80 and DEVIN machine-assisted QA final cutover evidence:

- User A profile: Sterling A. (RESTORED)
- User A Morning Summary: ON (RESTORED)
- User B Morning Summary: ON (RESTORED)
- Temporary task residue: NONE
- Temporary Past Paper residue: NONE (DEVIN cleanup verified)
- Subject/topic state: 0/4 (RESTORED)
- User B other application data: UNMUTATED
- Failure injection: NONE
- Request mocks/routes: NONE
- Supabase mutation: NONE
- Vercel mutation: NONE
- Working tree: CLEAN

**TEMPORARY QA RESIDUE: NONE**

## Defects

**CONFIRMED DEFECTS FIXED:**
- P5-CUTOVER-01: Authenticated database pending state regression (HIGH-CONFIDENCE root cause, fixed, verified)
- P5-CUTOVER-02: Browser Back/Forward duplicate history blocker (CONFIRMED root cause, fixed, verified)

**NON-DEFECT:**
- P5-CUTOVER-03: Stale QA baseline (not a product defect, QA-baseline error confirmed)

**NEW DEFECTS: NONE DETECTED**

## Deferred / non-blocking items

- Onboarding draft persistence
- Mounted exam-date create/delete UI
- Broader task field editing

These items were not started during Phase 5 and do not block the final cutover.

## Final verdict

**PHASE 5 FINAL CUTOVER REGRESSION PROOF: PASS**

**P5-CUTOVER-01 PRODUCTION REGRESSION: PASS**

**P5-CUTOVER-02 PRODUCTION REGRESSION: PASS**

**P5-CUTOVER-03: STALE QA BASELINE — PRODUCT DEFECT NOT CONFIRMED**

**SLICE 1 ACCOUNT-SCOPED NOTIFICATION PREFERENCES: PASS**

**SLICE 2 READ-STATE REGRESSION: NONE DETECTED**

**SLICE 3 NAVIGATION REGRESSION: NONE DETECTED**

**SLICE 4 MUTATION/CACHE REGRESSION: NONE DETECTED**

**CROSS-SLICE REGRESSION: NONE DETECTED**

**ACCOUNT ISOLATION: PASS**

**CROSS-ACCOUNT STALE DATA: NO**

**PHASE 5 SECURITY REGRESSION: NONE DETECTED**

**DATA SAFETY: PASS**

**PRODUCTION TECHNICAL SMOKE: PASS**

**TEMPORARY QA RESIDUE: NONE**

**PHASE 5 FINAL CUTOVER: GO**

**QA-OWNER FINAL SIGN-OFF: NOT CLAIMED**

**PHASE 5: NOT YET CLOSED**

## Evidence ownership

HISTORICAL SLICE EVIDENCE:
- Reports 70–80 remain authoritative for Slice 1–4 implementation, Preview/Production verification, and recorded owner QA.

P5-CUTOVER-01:
- Initial machine-assisted implementation: commit `ab43c506bcf39c04c155b3340808432141f69607`
- CODEX / MACHINE-ASSISTED: hardening, exact Preview/Production validation, merge/cutover workflow and regression evidence

P5-CUTOVER-02:
- CODEX / MACHINE-ASSISTED: investigation, narrow fix, automated validation, Preview and Production verification

P5-CUTOVER-03:
- CODEX / MACHINE-ASSISTED: investigation and discriminating account-isolation workflow
- OWNER: authentication/account handoffs and action-time mutation authorization

DEVIN / MACHINE-ASSISTED QA:
- Final controlled Past Paper create/convergence/delete verification
- Final cutover evidence reconciliation
- Report 81 drafting/correction
- Docs-only release verification

OWNER ACTION-TIME AUTHORIZATION:
- User A task
- Physics topic
- Past Paper
- Profile
- Morning Summary
- User B discriminating preference mutation/restoration
- Subsequent final Past Paper evidence-gap rerun

**QA-OWNER FINAL SIGN-OFF: NOT CLAIMED**