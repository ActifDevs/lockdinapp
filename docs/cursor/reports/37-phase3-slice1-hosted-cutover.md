# Phase 3 Slice 1 — Hosted Cutover

## Executive Summary

Phase 3 Slice 1 passed its hosted cutover gate against the immutable Vercel Preview. The resumed work began after migrations 0004 and 0005 had already been applied, did not reapply either migration, and did not modify hosted schema, grants, RLS, Auth configuration, Vercel configuration, or shared syllabus data.

Exactly two disposable users completed normal email-confirmed signup and password login. Their hosted onboarding, membership isolation, atomic replacement, 1–5 validation, direct Data API security, current-version integrity, and task ownership checks passed. Both sessions were globally signed out before both Auth users were deleted. Their two temporary Mail.tm inboxes were also deleted. The final hosted audit returned all user-owned tables to the zero-row baseline with no orphans.

Production remained healthy and remained on pre-Slice-1 application code. The Preview was not promoted.

## Git Baseline

Branch:
`phase3-s1-user-subjects`

Application commit tested:
`0e4c11f598a976c7518b4b9eb90c52c2835cedaf`

At the start of the continuation, local `HEAD` and `origin/phase3-s1-user-subjects` both resolved to the tested commit, the working tree was clean, Reports 35 and 36 were present, Report 37 was absent, and migrations 0000–0005 were unchanged.

## Preview Deployment

- Immutable Preview URL: `https://lockedinapp-r5v5ttalu-gidiprogrammers-projects.vercel.app`
- Branch: `phase3-s1-user-subjects`
- Commit: `0e4c11f598a976c7518b4b9eb90c52c2835cedaf`
- Target: Vercel Preview, not Production
- State: READY

The immutable Preview artifact was independently exercised. Its frontend bundle targeted hosted Supabase project `hazvcdrcvsxmuwdfiucx`, exposed only the expected publishable client key class, contained no service-role marker, and did not use a loopback Supabase target. Localhost strings found in the bundle were inert constants from the bundled Supabase client library, not deployed configuration.

## Hosted Database Pre-E2E State

The fresh pre-E2E check ran inside an explicit read-only transaction and was rolled back.

| Relation | Rows |
| --- | ---: |
| `auth.users` | 0 |
| `public.profiles` | 0 |
| `public.user_subjects` | 0 |
| `public.tasks` | 0 |
| `public.subjects` | 9 |
| `public.syllabus_versions` | 9 |
| Current syllabus versions | 9 |

No unexplained hosted user-owned data was present before the two test users were created.

## Migration Status

- 0004 ALREADY APPLIED BEFORE RESUME
- 0005 ALREADY APPLIED BEFORE RESUME
- NOT REAPPLIED DURING THIS CONTINUATION

No migration was generated or edited. No migration command was run during this continuation.

## Hosted Journal Verification

PASS. The hosted Drizzle journal contained exactly six entries corresponding to migrations 0000–0005 before E2E and the identical six entries after cleanup.

## Preview Smoke Verification

| Request | Expected | Observed |
| --- | ---: | ---: |
| `GET /` | 200 | 200 |
| `GET /login` | 200 | 200 |
| `GET /signup` | 200 | 200 |
| `GET /api/healthz` | 200 | 200 |
| `GET /api/healthz/db` | 200 | 200 |
| `GET /api/tasks` unauthenticated | 401 | 401 |
| `GET /api/user-subjects` unauthenticated | 401 | 401 |

The mandatory Slice 1 endpoint gate passed: `/api/user-subjects` returned 401 rather than 404.

## Hosted User A Onboarding

PASS. USER A completed normal email-confirmed signup and password login, then completed onboarding through the Preview API with five distinct subjects from the live hosted catalogue.

- Profile marked onboarded: yes
- Memberships created: 5
- Starter tasks created: 5
- Membership subject IDs distinct: yes
- Membership syllabus versions current and subject-matched: yes
- USER B rows present at this point: no

No disposable address, password, token, or confirmation URL is recorded.

## Hosted User B Onboarding

PASS. USER B independently completed normal email-confirmed signup and password login, then completed onboarding through the Preview API with one hosted catalogue subject different from USER A's initial selection.

- Profile marked onboarded: yes
- Memberships created: 1
- Starter tasks created: 1
- Membership syllabus version current and subject-matched: yes
- USER A rows exposed to USER B: no

No disposable address, password, token, or confirmation URL is recorded.

## 1–5 Subject Validation

PASS.

| Case | Result | Atomicity check |
| --- | --- | --- |
| 1 distinct valid subject | Accepted | Exact one-row set committed |
| 5 distinct valid subjects | Accepted | Exact five-row set committed |
| 0 subjects | Rejected | Previous five-row set unchanged |
| 6 distinct valid subjects | Rejected | Previous five-row set unchanged |
| Duplicate subject IDs | Rejected | Previous five-row set unchanged |
| Nonexistent subject ID | Rejected | Previous five-row set unchanged |
| `userId` ownership field | Rejected | Previous five-row set unchanged |
| `user_id` ownership field | Rejected | Previous five-row set unchanged |
| `ownerId` ownership field | Rejected | Previous five-row set unchanged |
| `owner_id` ownership field | Rejected | Previous five-row set unchanged |

No rejected request produced a partial membership update, and USER B's membership remained unchanged throughout USER A's boundary probes.

## Membership Read Isolation

PASS. Authenticated `GET /api/user-subjects` returned only the caller's selected set for both users. USER A never received USER B's membership, USER B never received USER A's memberships, returned display data matched the canonical catalogue, and the API response exposed no user ownership identifier.

## Atomic Replacement

PASS.

- USER A: 5 → 1 succeeded with the exact requested set.
- USER A: 1 → 5 succeeded with the exact requested set.
- USER B stayed unchanged during both USER A replacements.
- USER B then completed an independent valid replacement.
- USER A stayed unchanged during USER B's replacement.
- USER A's five historical starter tasks remained after subjects were removed and restored.

## Direct Data API Security

PASS. Tests used the real hosted Supabase sessions for USER A and USER B.

- Owner SELECT: allowed and returned only the caller's rows.
- Cross-user SELECT: hidden in both directions.
- Authenticated direct INSERT: denied.
- Foreign-owner INSERT: denied.
- Authenticated direct UPDATE: denied.
- Authenticated direct DELETE: denied.
- Unauthenticated SELECT: denied.
- Observed denial code: `42501`.
- Membership state remained unchanged after all denied operations.

## Current-Version Integrity

PASS. Every final membership row for both users joined to a current syllabus version whose `subject_id` matched the membership `subject_id`. The normal Preview API provided no mechanism to select an arbitrary syllabus version, and no syllabus version row was modified.

## Task Ownership Regression

PASS.

- USER A listed exactly USER A's five starter tasks.
- USER B listed exactly USER B's one starter task.
- USER A's PATCH attempt against USER B's task returned 404.
- USER A's DELETE attempt against USER B's task returned 404.
- USER B's task still existed after both probes.

## Session / Cache Isolation

NOT RUN. No interactive browser session was available for an honest manual flash/cache observation. API session isolation, bidirectional membership isolation, and logout/session revocation were verified, but this report does not claim a manual UI cache check.

## Disposable User Cleanup

PASS.

- Exactly two disposable inboxes were created for the two confirmation emails.
- USER A global sign-out: passed.
- USER B global sign-out: passed.
- USER A Auth user deletion: passed.
- USER B Auth user deletion: passed.
- Temporary inbox deletions: 2 of 2 passed.
- Dependent profile, membership, and task rows were removed by cascade.

No disposable credentials, access/refresh tokens, confirmation URLs, or actual disposable email addresses were written to the repository or this report.

## Post-Cleanup Counts

| Relation | Rows |
| --- | ---: |
| `auth.users` | 0 |
| `public.profiles` | 0 |
| `public.user_subjects` | 0 |
| `public.tasks` | 0 |

Orphan profiles: 0. Orphan memberships: 0. Orphan tasks: 0.

## Hosted Schema / Security Final State

PASS.

- Journal: unchanged, exactly 0000–0005.
- `user_subjects` RLS: enabled.
- `user_subjects` policies: exactly `user_subjects_select_own`.
- Data API grant among `PUBLIC`, `anon`, and `authenticated`: authenticated SELECT only.
- Maximum-five trigger: enabled.
- Subjects: unchanged at 9.
- Syllabus versions: unchanged at 9, all 9 current.
- Shared syllabus/reference rows modified: none.

## Production Health

| Request | Observed |
| --- | ---: |
| `GET /api/healthz` | 200 |
| `GET /api/healthz/db` | 200 |
| `GET /login` | 200 |
| `GET /signup` | 200 |
| `GET /api/user-subjects` | 404 |

Hosted Supabase contains the Slice 1 schema. The immutable Preview contains the Slice 1 application code. Production remains on pre-Slice-1 application code, so its 404 for `/api/user-subjects` is expected. The Preview was not promoted.

## Repository Changes

Only this Report 37 file was added. No implementation, migration, prior report, environment, or deployment configuration file was modified.

## Remaining Risks

- Manual browser UI session/cache isolation was not run; it remains the only explicitly unobserved check in this hosted continuation.
- Production intentionally remains pre-Slice-1 until the separately controlled integration merge and deployment process occurs.

Neither item invalidates the hosted API, database security, cleanup, or Production-health evidence recorded above.

## Final Slice 1 Hosted Verdict

SLICE 1 HOSTED CUTOVER PASSED — READY TO MERGE INTO PHASE3 INTEGRATION
