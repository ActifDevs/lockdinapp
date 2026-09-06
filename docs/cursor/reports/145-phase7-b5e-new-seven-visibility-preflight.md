# LOCKDIN — PHASE 7 B5E NEW-SEVEN VISIBILITY PRE-FLIGHT

**Date:** 2026-09-06 UTC

**Status:** PASS WITH REVIEW NOTES — all seven new subjects are technically ready for controlled visibility exposure, but current architecture lacks cohort-specific visibility mechanism

**B5D close commit:** `548e29edb28c0e18ea468d4d982226501461d755`

**Current repository baseline:** `f3655019ee4b193fd4ca20d70e918ff7a3c2d1e9`

## Safety Result

- Production read-only database inspection only
- Production mutations: **0**
- Product-code changes: **NONE**
- Migration changes: **NONE**
- Deployment changes: **NONE**
- Subject visibility changes: **NONE**
- Beta invitations: **NONE**

## Repository Preflight

- **Branch:** main
- **HEAD:** `f3655019ee4b193fd4ca20d70e918ff7a3c2d1e9`
- **origin/main:** `f3655019ee4b193fd4ca20d70e918ff7a3c2d1e9`
- **Working tree:** CLEAN

## B5D Closeout Context

- **Migration 0019:** Live (20 / 0019_route_option_group_applicability)
- **Route applicability:** Authoritative per migration 0019
- **Option hydration:** Fixed (B5D-004)
- **B5D status:** CLOSED with accepted review items
- **B5D-006:** Medium defect deferred (Past Papers off-route warning absent)
- **Accessibility keyboard smoke:** NOT EXECUTED (accepted residual QA gap)

## Production Catalogue Baseline

| Invariant | Current Production |
| --- | ---: |
| Migration count / head | 20 / `0019_route_option_group_applicability` |
| Subjects | 16 |
| Syllabus versions | 29 |
| Published / retired | 21 / 8 |
| Published route sets / routes | 29 / 95 |
| New-seven selectable | 0 / 7 |
| Current-nine selectable | 9 / 9 |
| Feb/Mar auto-assignment | 0 |
| Historical non-QA route backfills | 0 |
| Historical non-QA option backfills | 0 |

## New-Seven Subject Existence Verification

### 8021 — English General Paper

- **Subject row:** EXISTS (id, code, name, color, selectable_for_new_memberships = false)
- **Code:** 8021
- **Display name:** English General Paper
- **Syllabus versions:** 2 (id 28, 29)
- **Published versions:** 2 (both lifecycle = published)
- **Current version:** id 28 (is_current = true)
- **Route sets:** 2 (id 1, 2)
- **Routes:** 2 (id 1: AS Level, id 2: AS Level)
- **Qualification targets:** as_level
- **Applicability metadata:** Present in route sets
- **Supported exam sessions:** May/June (via applicable_session_range)
- **Study option groups:** NONE
- **selectable_for_new_memberships:** false

### 9093 — English Language

- **Subject row:** EXISTS
- **Code:** 9093
- **Display name:** English Language
- **Syllabus versions:** 1 (id 30)
- **Published versions:** 1 (lifecycle = published)
- **Current version:** id 30 (is_current = true)
- **Route sets:** 1 (id 3)
- **Routes:** 3 (id 3: AS Level, id 4: Complete A Level, id 5: Full A Level)
- **Qualification targets:** as_level, a_level
- **Applicability metadata:** Present in route sets
- **Supported exam sessions:** May/June (via applicable_session_range)
- **Study option groups:** NONE
- **selectable_for_new_memberships:** false

### 9626 — Information Technology

- **Subject row:** EXISTS
- **Code:** 9626
- **Display name:** Information Technology
- **Syllabus versions:** 2 (id 31, 32)
- **Published versions:** 2 (both lifecycle = published)
- **Current version:** id 31 (is_current = true)
- **Route sets:** 2 (id 11, 12)
- **Routes:** 6 (3 per version: AS Level, Complete A Level, Full A Level)
- **Qualification targets:** as_level, a_level
- **Applicability metadata:** Present in route sets
- **Supported exam sessions:** May/June (via applicable_session_range)
- **Study option groups:** NONE
- **selectable_for_new_memberships:** false

### 9696 — Geography

- **Subject row:** EXISTS
- **Code:** 9696
- **Display name:** Geography
- **Syllabus versions:** 2 (id 33, 34)
- **Published versions:** 2 (both lifecycle = published)
- **Current version:** id 33 (is_current = true)
- **Route sets:** 2 (id 13, 14)
- **Routes:** 6 (3 per version: AS Level, Complete A Level, Full A Level)
- **Qualification targets:** as_level, a_level
- **Applicability metadata:** Present in route sets
- **Supported exam sessions:** May/June (via applicable_session_range)
- **Study option groups:** 4 (2 per version: Paper 3 options 2/2, Paper 4 options 2/2)
- **selectable_for_new_memberships:** false

### 9699 — Sociology

- **Subject row:** EXISTS
- **Code:** 9699
- **Display name:** Sociology
- **Syllabus versions:** 1 (id 35)
- **Published versions:** 1 (lifecycle = published)
- **Current version:** id 35 (is_current = true)
- **Route sets:** 1 (id 15)
- **Routes:** 3 (id 41: AS Level, id 42: Complete A Level, id 43: Full A Level)
- **Qualification targets:** as_level, a_level
- **Applicability metadata:** Present in route sets
- **Supported exam sessions:** May/June (via applicable_session_range)
- **Study option groups:** 1 (Paper 4 options 2/3)
- **selectable_for_new_memberships:** false

### 9706 — Accounting

- **Subject row:** EXISTS
- **Code:** 9706
- **Display name:** Accounting
- **Syllabus versions:** 1 (id 36)
- **Published versions:** 1 (lifecycle = published)
- **Current version:** id 36 (is_current = true)
- **Route sets:** 1 (id 23)
- **Routes:** 3 (id 65: AS Level, id 66: Complete A Level, id 67: Full A Level)
- **Qualification targets:** as_level, a_level
- **Applicability metadata:** Present in route sets
- **Supported exam sessions:** May/June (via applicable_session_range)
- **Study option groups:** NONE
- **selectable_for_new_memberships:** false

### 9990 — Psychology

- **Subject row:** EXISTS
- **Code:** 9990
- **Display name:** Psychology
- **Syllabus versions:** 2 (id 37, 38)
- **Published versions:** 2 (both lifecycle = published)
- **Current version:** id 37 (is_current = true)
- **Route sets:** 2 (id 28, 29)
- **Routes:** 6 (3 per version: AS Level, Complete A Level, Full A Level)
- **Qualification targets:** as_level, a_level
- **Applicability metadata:** Present in route sets
- **Supported exam sessions:** May/June (via applicable_session_range)
- **Study option groups:** 2 (1 per version: A Level Specialist Options 2/2)
- **selectable_for_new_memberships:** false

## Expected Version Families

All seven subjects match the approved catalogue model:

- **8021:** r001 + r002 (✓)
- **9093:** r001 (✓)
- **9626:** r001 + r002 (✓)
- **9696:** r001 + r002 (✓)
- **9699:** r001 (✓)
- **9706:** r001 (✓)
- **9990:** r001 + r002 (✓)

## Session Resolution

All seven subjects support **May/June** exam sessions as confirmed by their `applicable_session_range` values (e.g., `[6076,6084)` for current versions).

**Feb/Mar:** Fails closed — not supported by any new-seven subject session policy.

**Oct/Nov:** Not supported by current new-seven session policies.

No ambiguity or legacy/current revision overlap causing nondeterminism.

## Route Catalogue Verification

All seven subjects have published route sets with valid routes:

- **Route set count:** 1-2 per subject
- **Route count:** 2-6 per subject
- **Route IDs:** Version-scoped (linked to specific syllabus_version_id)
- **Qualification targets:** Valid (as_level, a_level)
- **Route components:** Present via assessment_route_components table
- **No cross-version component references:** Verified (all components link to correct syllabus_version_id)
- **No retired routes for new enrollment:** All route sets have lifecycle = published

New enrollment resolves only to PUBLISHED current route sets.

## Generic Study-Option Contracts

### Geography 9696
- **Paper 3 Advanced Physical Geography Options:** 2/2 (min 2, max 2, a_level)
- **Paper 4 Advanced Human Geography Options:** 2/2 (min 2, max 2, a_level)
- **Expected 2/2 + 2/2 semantics:** ✓ VERIFIED

### Psychology 9990
- **A Level Specialist Options:** 2/2 (min 2, max 2, a_level)
- **Expected 2/2 semantics:** ✓ VERIFIED

### Sociology 9699
- **Paper 4 Globalisation, Media and Religion:** 2/3 (min 2, max 3, a_level)
- **Expected 2/3 semantics:** ✓ VERIFIED

### No-Option Subjects
- **8021, 9093, 9626, 9706:** No study option groups
- **No-option route behavior:** Valid (routes exist without group requirements)

## Route-Target Applicability

All option groups have valid `applicable_qualification_target` values:

- **Values observed:** `a_level` only (for new-seven options)
- **Expected values:** `as_level`, `a_level`, or `both`
- **Verification:** All Geography, Sociology, Psychology option groups correctly target `a_level`
- **No route where all applicable groups disappear:** ✓ VERIFIED
- **No route that becomes impossible to satisfy:** ✓ VERIFIED
- **No inapplicable group required by resolver:** ✓ VERIFIED (migration 0019 enforces this)

## Resolver Dry-Run / Read-Only Contract Analysis

From the route catalogue + resolver contract, all seven subjects have valid assignable routes:

- **8021:** AS Level route → valid assignment (no options required)
- **9093:** AS Level / Complete A Level / Full A Level → valid assignments (no options required)
- **9626:** AS Level / Complete A Level / Full A Level → valid assignments (no options required)
- **9696:** AS Level / A Level routes → valid assignments (2/2 + 2/2 option groups for A Level)
- **9699:** AS Level / A Level routes → valid assignments (2/3 option group for A Level)
- **9706:** AS Level / Complete A Level / Full A Level → valid assignments (no options required)
- **9990:** AS Level / A Level routes → valid assignments (2/2 option group for A Level)

**No subjects cannot produce a valid assignment.**

## Past Papers Component Coverage

All seven subjects have valid assessment components:

- **Components:** Present in assessment_components table for all versions
- **Route default components:** Present via assessment_route_components table
- **Whole-version components:** Exist correctly
- **Paper identifiers:** Version-scoped (linked to specific syllabus_version_id)

### B5D-006 Impact on New-Seven

B5D-006 (Past Papers off-route warning absent) applies where Past Papers exposes a component outside the user's selected route without the required warning.

**Original claim:** Affects all seven because all seven have A-Level routes with Paper 3/4.

**Conflict:** 8021 has AS-only routes (no Paper 3/4), but the report claimed universal impact.

**Per-subject impact assessment:**

| Code | Subject | Whole-version components | Selectable routes | Off-route component exposure? | B5D-006 affected? |
| --- | --- | --- | --- | --- | --- |
| 8021 | English General Paper | AS-level components only | AS Level routes only | NO off-route exposure | NOT AFFECTED |
| 9093 | English Language | AS + A Level components | AS, Complete A, Full A | Paper 3/4 on A Level routes | AFFECTED |
| 9626 | Information Technology | AS + A Level components | AS, Complete A, Full A | Paper 3/4 on A Level routes | AFFECTED |
| 9696 | Geography | AS + A Level components | AS, Complete A, Full A | Paper 3/4 on A Level routes | AFFECTED |
| 9699 | Sociology | AS + A Level components | AS, Complete A, Full A | Paper 3/4 on A Level routes | AFFECTED |
| 9706 | Accounting | AS + A Level components | AS, Complete A, Full A | Paper 3/4 on A Level routes | AFFECTED |
| 9990 | Psychology | AS + A Level components | AS, Complete A, Full A | Paper 3/4 on A Level routes | AFFECTED |

**Revised exposure:** 6/7 new subjects would be affected by B5D-006 once visible (8021 is NOT affected).

**Risk:** Medium — same UX defect as current subjects, no data corruption.

**Public-release recommendation:** Fix B5D-006 before public release even if beta proceeds.

## Onboarding / Settings Visibility Path

### Current Visibility Architecture

**Source of truth:** `subjects.selectable_for_new_memberships` boolean column

### API Filters

- **GET /api/subjects:** Filters `WHERE selectable_for_new_memberships = true`
- **GET /api/subjects/assignment-sessions:** Filters `WHERE selectable_for_new_memberships = true`
- **Subject detail endpoints:** Do NOT filter by visibility (accessible by ID if membership exists)

### No Additional Visibility Gates

**No evidence of:**
- Environment flags
- Internal allowlists
- Role-based controls
- Beta cohort controls
- Feature flags
- Separate frontend filters (beyond API response)
- Additional API filters

**Conclusion:** `selectable_for_new_memberships` is the ONLY visibility gate.

## Critical Controlled-Release Question

**Can Lockdin currently expose the seven new subjects ONLY to a controlled internal/QA/beta cohort while keeping them hidden from ordinary users?**

**Answer: NO**

**Current architecture:** Only provides global `selectable_for_new_memberships` visibility.

**Evidence:**
- No cohort-specific filtering in API
- No allowlist mechanism
- No feature flag system
- No environment-controlled visibility beyond the global boolean

**Setting the seven rows to true would expose them globally to all eligible users, not just a controlled cohort.**

**Corrected controlled-visibility semantics:**
The required mechanism must implement:
```
subject is selectable for new membership when:
  GLOBAL SELECTABLE (subjects.selectable_for_new_memberships = true)
  OR
  EXPLICIT USER-SUBJECT VISIBILITY GRANT EXISTS
```

This means:
- Unauthenticated/no-user catalogue requests: global subjects only
- Normal authenticated user without grant: global subjects only
- Explicitly granted internal user: global subjects + their granted hidden subjects
- Allowlist filtering does NOT restrict globally-visible subjects — it only ADDS hidden subjects to the view

## Global Visibility Risk

**GLOBAL ENABLEMENT IS NOT A CONTROLLED BETA MECHANISM.**

Setting `selectable_for_new_memberships = true` for the seven new subjects would:
- Expose them globally to all eligible users
- Show them in onboarding subject selection
- Show them in Settings subject catalogue
- Make them available for new enrollment by any user

**Recommendation:** B5E needs a minimal controlled visibility mechanism before global enablement:
- Internal allowlist table
- Beta cohort flag in profiles
- Environment-controlled visibility
- Account-level entitlement system

## Existing Membership Safety

**Visibility changes should NOT:**
- Repin existing memberships (no mechanism exists)
- Assign routes to old memberships (no mechanism exists)
- Change syllabus_version_id (no mechanism exists)
- Change assessment_route_id (no mechanism exists)
- Create option selections (no mechanism exists)
- Modify progress (no mechanism exists)
- Modify tasks (no mechanism exists)
- Modify notes (no mechanism exists)
- Modify paper history (no mechanism exists)

**Expected mutation:** Only `UPDATE subjects SET selectable_for_new_memberships = true WHERE code IN (...)`

**Narrowest reversible change:** Single-column boolean update, easily reversible.

## Rollback Design

### Forward Action
```sql
UPDATE subjects SET selectable_for_new_memberships = true WHERE code IN ('8021', '9093', '9626', '9696', '9699', '9706', '9990');
```

### Rollback Action
```sql
UPDATE subjects SET selectable_for_new_memberships = false WHERE code IN ('8021', '9093', '9626', '9696', '9699', '9706', '9990');
```

### Existing Newly-Created Memberships After Rollback

**Current architecture:** Existing owned memberships remain accessible via membership APIs (GET /api/user-subjects) even when `selectable_for_new_memberships = false`.

**Verification:** API implementation filters catalogue endpoints but not membership endpoints.

**New enrollment after rollback:** Becomes unavailable (subject disappears from catalogue).

**Conclusion:** Rollback is safe — existing owners retain access, new enrollment is blocked.

## API Exposure Check

**Current Production API (hidden-seven excluded):**

- **GET /api/subjects:** Returns only 9 current-nine subjects (selectable_for_new_memberships = true)
- **GET /api/subjects/assignment-sessions:** Returns only 9 current-nine subjects
- **Onboarding catalogue:** Shows only 9 current-nine subjects
- **Settings subject catalogue:** Shows only 9 current-nine subjects

**Expected exposure after enablement:**
- All 16 subjects would appear in catalogue responses
- All 16 subjects would be available for new enrollment
- All 16 subjects would appear in onboarding/Settings

## Frontend Readiness

### Hardcoded Nine-Subject Assumptions

**Search results:** No hardcoded subject code lists or count = 9 assumptions found in frontend code.

**Evidence:**
- Frontend consumes `/api/subjects` dynamically
- No fixed subject code arrays
- No hardcoded card counts
- No fixed route handling by subject code
- No fixed exam-session assumptions by subject
- No fixed component lists by subject
- No analytics allowlists by subject code

**Classification:** SAFE — frontend is data-driven, not hardcoded.

## Analytics / Monitoring Readiness

**Read-only inspection:** No dedicated analytics configuration found in repository.

**Potential impact:**
- Adding new subjects would generate valid existing events (subject_id is foreign key)
- May introduce new subject-name properties (but these are existing catalogue data)
- May break existing subject-code allowlists if analytics has any (none found in code)

**Record required follow-up:** Verify analytics dashboards/reports can accommodate 16 subjects vs 9 subjects.

## New-Seven Per-Subject Gate

| Code | Subject | Published Version Ready | Session Resolver | Route Set | Routes | Components | Options | Year Mappings | API-Ready | Frontend-Ready | Visibility Currently False | Blocker | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8021 | English General Paper | PASS | PASS | PASS | PASS | PASS | N/A | PASS | PASS | PASS | true | NONE | READY |
| 9093 | English Language | PASS | PASS | PASS | PASS | PASS | N/A | PASS | PASS | PASS | true | NONE | READY |
| 9626 | Information Technology | PASS | PASS | PASS | PASS | PASS | N/A | PASS | PASS | PASS | true | NONE | READY |
| 9696 | Geography | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | true | NONE | READY |
| 9699 | Sociology | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | true | NONE | READY |
| 9706 | Accounting | PASS | PASS | PASS | PASS | PASS | N/A | PASS | PASS | PASS | true | NONE | READY |
| 9990 | Psychology | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | true | NONE | READY |

**Verdict per subject:** All seven are READY

## B5D-006 Impact on B5E

**B5D-006 — Past Papers off-route warning absent:**

- **Affects 6/7 new subjects:** YES (9093, 9626, 9696, 9699, 9706, 9990 - all have A Level routes with Paper 3/4)
- **8021 NOT affected:** AS-only routes, no Paper 3/4 components
- **Would enabling the seven materially increase the risk:** NO (same defect, no additional complexity)
- **Still reasonably deferrable through controlled visibility:** YES — for beta phase only
- **Should it be fixed before public release even if beta proceeds:** YES — recommend fix before general availability

**Do not fix it in this task.**

## Accessibility Residual Impact

**B5D keyboard accessibility smoke:** NOT EXECUTED (accepted residual QA gap from B5D closeout)

**New B5E-specific accessibility blocker:** NO — B5E preflight is read-only and does not introduce new UI components or interaction patterns.

## Compliance / Beta Boundary

**Technical visibility authorization:** SEPARATE — This B5E preflight only addresses technical readiness, not compliance approval.

**Beta invitation authorization:** NOT GRANTED BY THIS TASK — Real beta invitations require separate DPC/compliance/guardian process resolution/authorization.

**Controlled release boundary:** The controlled visibility mechanism may later be tested using authorized internal/dedicated QA accounts only. No real beta invitations are authorized in this task.

**Do not interpret a successful B5E technical preflight as permission to invite students.**

## Recommended B5E Mutation Plan

### Immediate Blocker

**Cannot safely proceed with global enablement** — current architecture lacks controlled visibility mechanism.

### Next Implementation Slice: B5E-F1

**B5E-F1 — Minimal per-user/per-subject controlled visibility mechanism**

**Requirements:**
- Global OR explicit grant semantics (GLOBAL SELECTABLE OR EXPLICIT USER-SUBJECT GRANT)
- Server-side enrollment enforcement (membership creation must enforce visibility)
- No Production grants during implementation
- New-seven global flags remain false (selectable_for_new_memberships = false)
- No real beta invitations
- Existing memberships unaffected
- Reversible grant removal
- Dedicated tests before Production cutover
- Consistent enforcement across all catalogue and enrollment surfaces

**Architecture:**
- Table: `subject_visibility_grants (user_id, subject_id, granted_at, granted_by)`
- Properties: unique user_id + subject_id, additive, auditable, reversible
- No membership repin or route backfill
- Ordinary users cannot self-grant
- Deleting a grant does NOT remove existing memberships

**Implementation surfaces:**
- GET /api/subjects visibility filter
- GET /api/subjects/assignment-sessions visibility filter
- Onboarding catalogue visibility filter
- Settings subject catalogue visibility filter
- Server-side membership creation authorization
- Grant management interface (internal only)

**Visibility semantics:**
- Globally selectable subjects: visible to all users
- Hidden subjects: visible ONLY to users with explicit visibility grants
- Unauthenticated users: see only globally selectable subjects
- Normal authenticated user without grant: global subjects only
- Explicitly granted internal user: global subjects + their granted hidden subjects

**Server-side enforcement requirement:**
- Globally selectable subject: ALLOW enrollment
- Hidden subject + caller has explicit visibility grant: ALLOW enrollment
- Hidden subject + caller has no visibility grant: REJECT enrollment
- Hidden subject + grant belongs to another user: REJECT enrollment
- Existing owned membership: must remain accessible regardless of later visibility/grant removal

**Do NOT proceed to global enablement until B5E-F1 is complete and tested.**



## Final Verdict

**PASS WITH REVIEW NOTES**

All seven new subjects are technically ready for visibility exposure, but:

1. **Controlled visibility mechanism missing** — current architecture only provides global enablement
2. **B5D-006 should be fixed before public release** — affects 6/7 new subjects (8021 is NOT affected - AS-only routes)
3. **Accessibility keyboard smoke remains unexecuted** — residual from B5D closeout

## Recommendation

**DO NOT enable visibility globally with current architecture.**

**Next implementation slice: B5E-F1 — Minimal per-user/per-subject controlled visibility mechanism**

**B5E-F1 Requirements:**
- Global OR explicit grant semantics (GLOBAL SELECTABLE OR EXPLICIT USER-SUBJECT GRANT)
- Server-side enrollment enforcement (membership creation must enforce visibility)
- No Production grants during implementation
- New-seven global flags remain false (selectable_for_new_memberships = false)
- No real beta invitations
- Existing memberships unaffected
- Reversible grant removal
- Dedicated tests before Production cutover
- Consistent enforcement across all catalogue and enrollment surfaces

**B5E-F1 surfaces to implement:**
- subject_visibility_grants table
- GET /api/subjects visibility filter
- GET /api/subjects/assignment-sessions visibility filter
- Onboarding catalogue visibility filter
- Settings subject catalogue visibility filter
- Server-side membership creation authorization
- Grant management interface (internal only)

**Do NOT proceed to global enablement until B5E-F1 is complete and tested.**

## Documentation

**Report 145:** CREATED

## Product Changes

**NONE**

## Production Changes

**NONE**

## Commit / Push

**NONE**