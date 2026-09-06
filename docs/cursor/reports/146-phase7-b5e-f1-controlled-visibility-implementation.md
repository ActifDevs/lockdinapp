# Report 146 — Phase 7 B5E-F1 Controlled Subject Visibility Implementation

## Scope and repository baseline

- Authorized scope: local/repository implementation only.
- Baseline branch: `main`.
- Baseline `HEAD` and `origin/main`: `61fb012b34f9c4aac386c8f0a736abc5ee4afb1a`.
- Baseline working tree: clean; `git diff --check` passed.
- Frozen design input: Report 145.
- Production changes: **NONE**.
- Deployment: **NONE**.

## Authoritative call graph

Catalogue reads follow the existing generated-client path:

1. Onboarding and Settings call `useListSubjects` and `useListSubjectAssignmentSessions`.
2. The generated client sends the bearer token when a session exists.
3. `GET /api/subjects` and `GET /api/subjects/assignment-sessions` use optional authentication.
4. Both routes use the same database-backed `lockdin_can_select_subject(user_id, subject_id)` predicate.
5. Anonymous callers pass no user identity and therefore receive globally selectable subjects only.

New membership writes remain inside the existing atomic RPC boundary:

1. Onboarding calls the profile-completion path; Settings calls the current-user subject replacement path.
2. The server invokes the existing user-scoped Supabase RPC wrappers.
3. `lockdin_complete_onboarding_apply` and `lockdin_replace_user_subjects_apply` validate subject visibility before inserting a new membership.
4. After visibility succeeds, the existing session resolver, syllabus-version resolver, published-route validation, applicable-option validation, and atomic membership/route/option writes remain authoritative.
5. Existing memberships are retained independently of current visibility; their read path is unchanged.

No alternate server path capable of creating a new `user_subjects` row was left outside this enforcement boundary.

## Migration 0020

`0020_subject_visibility_grants` is additive and introduces:

- `public.subject_visibility_grants(user_id, subject_id, granted_at, granted_by)`;
- primary key `(user_id, subject_id)`;
- user and subject foreign keys with cascading deletion;
- nullable grantor audit foreign key with `ON DELETE SET NULL`;
- subject and grantor indexes;
- RLS plus explicit privilege revocation for `PUBLIC`, `anon`, and `authenticated`;
- explicit DML grants for `service_role` only;
- private `SECURITY DEFINER` helper `lockdin_can_select_subject(uuid, integer)` with an empty search path;
- grant-aware replacements of the two existing atomic membership apply functions.

The helper implements exactly:

`subjects.selectable_for_new_memberships = true OR matching user/subject grant exists`.

It is the shared database rule used by catalogue reads and new-membership writes. Ordinary authenticated clients cannot select or mutate the grant table and cannot execute the helper directly. A grant creates no membership, pin, route assignment, option selection, or progress row.

## Behaviour and security results

- Anonymous and authenticated users without grants receive global subjects only.
- A user's own grant adds only that hidden subject; multiple grants are additive.
- Cross-user grants have no effect.
- A redundant grant for a global subject produces no duplicate.
- Removing a pre-enrolment grant removes the subject from both catalogues and makes a direct write fail closed.
- Removing a post-enrolment grant does not delete or mutate the owned membership, pin, route, options, or progress.
- Existing hidden memberships remain readable and retainable during Settings replacement.
- Rejected writes are atomic: no partial membership, route-assignment, or option-selection rows remain.
- API errors use the existing safe invalid-subject-selection contract and expose no database, RLS, Postgres, Supabase, or cross-user grant details.
- Session applicability remains fail closed and Feb/Mar remains disabled.

The frontend remains fully data-driven. Tests inject a server-returned hidden subject into the ordinary generated hooks in both Onboarding and Settings; no subject codes, account emails, client allowlists, authorization flags, or new-seven arrays were added to product UI code.

## Current-nine and new-seven proof

The disposable HTTP catalogue contains all current-nine subjects with `selectable_for_new_memberships = true`; an ordinary no-grant user receives 9/9 and can enrol through the normal pipeline.

All seven controlled subjects remain globally false throughout the final harness:

| Subject | Global flag | Representative grant/enrolment proof |
|---|---:|---|
| 8021 | false | Visible with own grant; AS route; no option groups |
| 9093 | false | Visible and enrols with own grant |
| 9626 | false | Visible and enrols with own grant |
| 9696 | false | A Level route; 2/2 plus 2/2 option selection |
| 9699 | false | A Level route; 2/3 option selection |
| 9706 | false | Visible and enrols with own grant |
| 9990 | false | A Level route; 2/2 option selection |

No production subject flag was changed.

## Migration rehearsal and zero-drift proof

The disposable harness now supports a bounded migration-through-tag operation. It reconstructs `0000` through `0019`, inserts a populated hidden-subject fixture with an owned membership, syllabus pin, route assignment, and option selection, snapshots the full rows and counts, applies committed migration `0020`, and compares the results exactly.

Results:

- fresh `0000` → `0020`: **PASS**;
- populated `0019` → `0020`: **PASS**;
- membership count drift: **NONE**;
- membership pin drift: **NONE**;
- route-assignment drift: **NONE**;
- option-selection drift: **NONE**;
- grants created by migration: **0**.

The older pre-route strict-assignment and future-revision proof invocations were removed from the post-0019 harness sequence: they construct memberships before a published route contract exists and then mutate catalogue versions, which is incompatible with migration 0017's published-reference immutability. Their current behaviours are covered by the authoritative assessment-route integration suite and the staged visibility suite. Source files were otherwise left unchanged.

## Files changed

### Product and schema

- `lib/db/migrations/0020_subject_visibility_grants.sql`
- `lib/db/migrations/meta/_journal.json`
- `lib/db/src/schema/subjectVisibilityGrants.ts`
- `lib/db/src/schema/index.ts`
- `artifacts/api-server/src/lib/subject-visibility.ts`
- `artifacts/api-server/src/middlewares/global-auth-policy.ts`
- `artifacts/api-server/src/routes/subjects.ts`

### Tests and disposable harness

- `artifacts/api-server/src/routes/subject-visibility.integration.test.ts`
- `artifacts/revision-platform/src/pages/controlled-subject-visibility.test.ts`
- `artifacts/revision-platform/src/pages/onboarding.sessions.test.tsx`
- `artifacts/revision-platform/src/pages/settings.read-states.test.tsx`
- `scripts/src/db-harness/subject-visibility-migration-proof.ts`
- `scripts/src/db-harness/migrate.ts`
- `scripts/src/db-harness/index.ts`
- `scripts/src/db-harness/http-catalogue-seed.ts`
- `scripts/src/db-harness/http-integration.ts`
- `scripts/src/db-harness/session-foundation-proof.ts`
- `scripts/src/db-harness/series-policy-proof.ts`
- `scripts/src/db-harness/applicability-population-proof.ts`
- `scripts/src/db-harness/verify.ts`

### Documentation

- `docs/cursor/reports/146-phase7-b5e-f1-controlled-visibility-implementation.md`

The OpenAPI response shape remains the existing `Subject` DTO, so no contract change was required. The normal code-generation consistency check passed and produced no semantic generated-client diff.

## Test record

| Command | Result |
|---|---|
| `pnpm run check:migrations` | PASS — 21 migrations, head `0020_subject_visibility_grants` |
| `pnpm --filter @workspace/api-server test -- --pool=forks --maxWorkers=1` | PASS — 37 files, 192 tests |
| targeted API visibility/route integration run | PASS — 3 files, 53 tests |
| `pnpm --filter @workspace/revision-platform test -- --pool=forks --maxWorkers=1` | PASS — 46 files, 303 tests |
| `pnpm --filter @workspace/revision-platform test -- src/pages/onboarding.sessions.test.tsx src/pages/settings.read-states.test.tsx src/pages/controlled-subject-visibility.test.ts --pool=forks --maxWorkers=1` | PASS — 3 files, 20 tests (post-cleanup rerun) |
| `pnpm --filter @workspace/scripts test:unit` | PASS — 7 files, 44 tests |
| `pnpm --filter @workspace/scripts test:route-manifest` | PASS — 10 files, 46 tests |
| `pnpm --filter @workspace/scripts test:harness` | PASS — 5 files, 44 passed, 1 skipped |
| `$env:LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB='1'; pnpm --filter @workspace/scripts db-harness` | PASS — fresh chain, staged upgrade, 29 database tests, 23 HTTP tests, cleanup verified |
| `pnpm run typecheck` | PASS — libraries, API, frontend, scripts, and mockup workspace |
| `pnpm run check:codegen` | PASS — Orval generation and generated-client consistency |
| `git diff --check` | PASS |

One pre-final harness replay exposed an incorrect column name in a test fixture. It was corrected to the repository's existing `selectable_for_new_memberships`; the complete authoritative harness was then rerun and passed. The established repository does not define a lint script, so no lint result is claimed.

## Explicitly not executed

- Production migration `0020`: **NOT EXECUTED**.
- Production SQL or data mutation: **NOT EXECUTED**.
- Production visibility grants: **0**.
- Production membership, pin, route, option, or progress mutations: **0**.
- New-seven global flag changes: **0**.
- Route or option backfills: **NOT EXECUTED**.
- B5D-006 work: **NOT EXECUTED**.
- Deployment: **NONE**.
- Production browser enrolment: **NOT EXECUTED**.
- Real beta invitations: **NONE**.
- B5E-F2: **NOT STARTED**.

## Verdict

**PASS.** B5E-F1 is ready for owner review. Production remains unchanged; B5E-F2 must be a separate reviewed cutover slice.
