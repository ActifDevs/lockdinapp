# LOCKDIN - PHASE 7 B5E-F3 CONTROLLED INTERNAL NEW-SEVEN END-TO-END QA

**Date:** 2026-09-06 UTC

**Status:** BLOCKED - GEOGRAPHY SETTINGS SAVE-STATE DEFECT - controlled QA
completed, all temporary Production state removed, and the Settings UI could
not save a valid Geography configuration

## Scope and Safety Result

- Dedicated internal QA account only
- Production migration changes: **NONE**
- Product-code changes: **NONE**
- Migration-file changes: **NONE**
- Deployment changes: **NONE**
- Global `selectable_for_new_memberships` changes: **NONE**
- Real beta invitations: **NONE**
- B5D-006: **NOT FIXED**
- Temporary grants and memberships: **REMOVED**

The QA fixture was the existing authenticated internal account. Credentials and
tokens are not recorded in this report.

## Repository

- B5E-F2 close SHA:
  `eaea856208661e403d9e6857ebb8210aa3b09ab2`
- Production application implementation SHA:
  `3acb9bf3b81f65dbfc795f3f3f217b21b2c311a0`
- Branch: `main`
- HEAD / `origin/main` at preflight:
  `eaea856208661e403d9e6857ebb8210aa3b09ab2`
- Working-tree boundary: this report only
- Report committed or pushed: **NO**

## Production Baseline and Final Invariants

The read-only baseline matched the B5E-F2 closeout:

| Invariant | Baseline | Final |
| --- | ---: | ---: |
| Migrations / head | 21 / `0020_subject_visibility_grants` | 21 / `0020_subject_visibility_grants` |
| Subjects | 16 | 16 |
| Syllabus versions | 29 | 29 |
| Published / retired versions | 21 / 8 | 21 / 8 |
| Route sets / routes | 29 / 95 | 29 / 95 |
| Memberships | 15 | 15 |
| Route-assigned memberships | 2 | 2 |
| Option selections | 3 | 3 |
| Visibility grants | 0 | 0 |
| Current-nine globally selectable | 9/9 | 9/9 |
| New-seven globally selectable | 0/7 | 0/7 |
| Temporary new-seven memberships | 0 | 0 |
| Feb/Mar rows | 0 | 0 |

The QA account baseline was restored exactly to its original three
memberships: subjects 9489, 9708, and 9709. Its original History route and
three option selections remained unchanged. Other users retained their
original three memberships each. No non-QA pin, route, or option drift was
observed.

## Deployment and Runtime

| Surface | Deployment | State | Git SHA |
| --- | --- | --- | --- |
| Web | `dpl_76HEjfoMDo5WQYd5egeC96zbXzE9` | READY | `eaea856208661e403d9e6857ebb8210aa3b09ab2` |
| API | `dpl_8APK7umf7Smw2QFX7gJebAmUykko` | READY | `eaea856208661e403d9e6857ebb8210aa3b09ab2` |

The deployed application tree contains the frozen implementation SHA
`3acb9bf3b81f65dbfc795f3f3f217b21b2c311a0`, with the later repository commits
being documentation-only.

Vercel runtime-error inspection over the QA window found:

- Unexpected 5xx clusters: **NONE**
- Fatal/runtime error clusters: **NONE**
- Visibility authorization error clusters: **NONE**
- Route resolver error clusters: **NONE**
- Option validation error clusters: **NONE**

One browser console 400 corresponded to the intentional invalid Sociology
option-contract request and was classified as expected validation, not a
runtime crash.

## Controlled Catalogue Proof

All seven grants were created for the QA account only:

`8021, 9093, 9626, 9696, 9699, 9706, 9990`

While grants existed:

- QA authenticated catalogue: **16 subjects**
- Unauthenticated/no-grant catalogue: **9 subjects**
- Cross-user visibility leakage: **0**
- All seven global flags: **false**

After cleanup:

- QA authenticated catalogue: **9 subjects**
- Unauthenticated/no-grant catalogue: **9 subjects**
- Visibility grants: **0**
- New-seven subjects hidden again: **7/7**

## Per-Subject Results

### 8021 - English General Paper

- Visibility with QA grant: **PASS**
- May/June session resolution: **PASS**
- AS-only route: **PASS**
- No A-Level route offered: **PASS**
- No option groups: **PASS**
- Temporary membership persisted as version 28, route 1, with zero option rows:
  **PASS**
- Subject workspace and Past Papers surface loaded: **PASS**
- Cleanup: **PASS**

### 9093 - English Language

- Visibility with QA grant: **PASS**
- May/June session resolution: **PASS**
- AS, Complete A, and Full A routes: **PASS**
- No option groups: **PASS**
- Representative Full A membership persisted as version 30, route 5, with zero
  option rows: **PASS**
- Subject workspace loaded: **PASS**
- B5D-006 observation: not independently reproduced in this run; residual
  remains open
- Cleanup: **PASS**

### 9626 - Information Technology

- Visibility with QA grant: **PASS**
- May/June session resolution: **PASS**
- AS, Complete A, and Full A routes: **PASS**
- No option groups: **PASS**
- Representative Full A membership persisted as version 31, route 31, with
  zero option rows: **PASS**
- Subject workspace loaded: **PASS**
- Cleanup: **PASS**

### 9696 - Geography

- Visibility with QA grant: **PASS**
- May/June session resolution: **PASS**
- Full A route: **PASS**
- Paper 3 group: **2/2**, valid
- Paper 4 group: **2/2**, valid
- API membership persisted as version 34, route 40, with option rows
  `27, 28, 31, 32`: **PASS**
- Subject workspace loaded and hydrated after navigation: **PASS**
- Same-group over-selection was blocked by the UI control: **PASS**
- Cleanup: **PASS**

**Review note:** the Settings route/option controls rendered the valid
Geography selection, but the top-level `Save subjects` button remained disabled
despite the valid 2/2 + 2/2 contract. No product code was changed. The
authenticated Production API path was used to complete the explicitly
authorized membership persistence proof. This is a QA finding, not a claimed
frontend save-path pass.

### 9699 - Sociology

- Visibility with QA grant: **PASS**
- May/June session resolution: **PASS**
- AS, Complete A, and Full A route structure: **PASS**
- A-Level option contract: **2/3**
- Invalid 1/3 API enrollment rejected with HTTP 400 and safe validation text:
  **PASS**
- Valid 2/3 membership persisted as version 35, route 42, options 35 and 36:
  **PASS**
- Subject workspace loaded: **PASS**
- Cleanup: **PASS**

### 9706 - Accounting

- Visibility with QA grant: **PASS**
- May/June session resolution: **PASS**
- AS, Complete A, and Full A routes: **PASS**
- No option groups: **PASS**
- Representative Full A membership persisted as version 36, route 67, with
  zero option rows: **PASS**
- Cleanup: **PASS**

### 9990 - Psychology

- Visibility with QA grant: **PASS**
- May/June session resolution: **PASS**
- AS, Complete A, and Full A route structure: **PASS**
- Specialist option contract: **2/2**
- Valid membership persisted as version 37, route 92, options 38 and 39:
  **PASS**
- Subject workspace loaded: **PASS**
- Cleanup: **PASS**

## Save, Reload, and Hydration

- New-seven catalogue visibility through the authenticated application:
  **PASS**
- No-grant catalogue isolation: **PASS**
- API route/version/option persistence: **PASS**
- Subject workspace navigation after enrollment: **PASS**
- Existing QA membership retention: **PASS**
- Invalid Sociology option contract failed closed without partial new-seven
  membership: **PASS**
- Geography Settings save control: **REVIEW NOTE** as described above

## Responsive and Generic UI

The standard desktop Settings, Subjects, route, option, subject-workspace, and
Past Papers surfaces were exercised. A dedicated 390 x 844 responsive pass
over new-seven subjects was not claimed after cleanup because the temporary
grants were required to be removed before completion. Existing current-nine
responsive coverage remains historical B5D evidence and is not relabeled as
new-seven evidence.

## Final Cleanup

- QA temporary new-seven memberships: **0**
- QA temporary visibility grants: **0**
- Non-QA visibility grants: **0**
- New-seven option rows: **0**
- QA catalogue restored to current-nine: **9**
- Normal/no-grant catalogue: **9**
- Global new-seven exposure: **0/7**
- Existing QA current-nine memberships: **UNCHANGED**
- Non-QA memberships: **UNCHANGED**
- Historical non-QA pin drift: **0**
- Historical non-QA route drift: **0**
- Historical non-QA option drift: **0**

## Residuals and Compliance Boundary

- B5D-006 Past Papers off-route warning: **OPEN - MEDIUM**
- Dedicated keyboard accessibility smoke: **NOT CLAIMED**
- Geography Settings save-state finding: **OPEN QA REVIEW NOTE**
- B5E-001: **OPEN - HIGH** - Geography valid 2/2 + 2/2 selection leaves
  Settings `Save subjects` disabled
- Real beta invitation authorization: **NOT EXECUTED**
- Global new-seven exposure: **NOT EXECUTED**

## Final Verdict

**BLOCKED - GEOGRAPHY SETTINGS SAVE-STATE DEFECT**

The controlled visibility mechanism, seven-subject catalogue isolation, session
resolution, route contracts, option semantics, API persistence, existing-user
safety, and cleanup all passed. The shipped Settings enrollment UI could not
save an otherwise valid Geography 2/2 + 2/2 configuration. The authenticated
API persistence proof confirms backend correctness but does not satisfy the
browser/UI enrollment requirement. No Production data-integrity issue was
observed.

## Recommendation

Owner review Report 148 before any further stage. B5E-001 blocks controlled
Geography enrollment through Settings and is not a database defect. Do not
enable global new-seven visibility and do not invite real beta users.
Separately authorize the B5E-F3R fix slice. B5D-006 remains open.
