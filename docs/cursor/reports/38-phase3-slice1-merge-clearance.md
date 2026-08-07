# Phase 3 Slice 1 — Merge Clearance

## Executive Summary

Phase 3 Slice 1 independently passes the final integration gate. The reviewed
branch is a clean, linear three-commit slice based on the current
`origin/phase3-multitenancy` head. Its implementation is confined to durable
user-subject membership, the approved 1–5 subject rule, trusted onboarding and
replacement writes, owner-scoped reads, the required API/contracts/UI, tests,
local-safety support, and reports.

The current security state is the corrected state from Migration 0005: direct
authenticated Data API writes are denied, only owner-scoped SELECT remains,
and both mutation paths are hardened `SECURITY DEFINER` functions that derive
the caller from `auth.uid()`. Core local checks and both production builds pass.
The immutable Preview and Production health checks pass. Local Supabase is
stopped, so database integration tests were not rerun; their prior passing
evidence in Reports 35 and 36 remains historical evidence. Fresh hosted SQL
access was not available from the current workspace because its only configured
database URLs are loopback; no hosted database connection or mutation was
attempted. Report 37's hosted database/E2E/cleanup evidence remains the latest
database evidence.

Manual browser session/cache observation remains explicitly not run and is a
non-blocking integration follow-up. Automated protected-cache clearing, hosted
API/session isolation, and bidirectional membership isolation are sufficient
for Slice 1 integration.

## Slice Branch

- Branch: `phase3-s1-user-subjects`
- Review-start HEAD: `22e970ca5704b442b68a25da3be2f620ec7e340a`
- Review-start remote head: `origin/phase3-s1-user-subjects` at the same SHA
- Initial working tree: clean
- Expected hosted-cutover report commit is present at HEAD.

## Integration Branch

- Branch: `origin/phase3-multitenancy`
- Refreshed head after `git fetch origin`:
  `0b7c41ddd799e11f2a494cfaf9d2d9adb75cd32f`
- Merge base with Slice 1:
  `0b7c41ddd799e11f2a494cfaf9d2d9adb75cd32f`
- `origin/phase3-multitenancy` has not advanced beyond the Slice 1 base.
- The integration head is an ancestor of Slice 1.

## Slice Commit Range

Pre-clearance implementation range:

`0b7c41ddd799e11f2a494cfaf9d2d9adb75cd32f..22e970ca5704b442b68a25da3be2f620ec7e340a`

Exact Slice 1-only commit set, oldest first:

1. `d7b4f673fdc821ac4f558d98b5e3e35f5d0b77fd` —
   `feat(phase3): add durable user subject membership`
2. `0e4c11f598a976c7518b4b9eb90c52c2835cedaf` —
   `fix(phase3): restrict user subject writes to trusted RPCs`
3. `22e970ca5704b442b68a25da3be2f620ec7e340a` —
   `docs(phase3): record slice1 hosted cutover`

All three commits are single-parent, linear descendants of the integration
head. No unrelated merge, main-only work, teammate work, or later Phase 3 slice
implementation is present. The commit identities match the supplied Slice 1
history; no evidence of a force-rewritten replacement was found.

## Complete Diff Summary

The complete pre-clearance diff contains 37 files, 4,572 insertions, and 109
deletions.

### DATABASE / MIGRATIONS

- Adds the Drizzle `user_subjects` model and schema export.
- Adds the `(subject_id, id)` syllabus-version unique key needed by the
  composite membership foreign key.
- Adds Migration 0004, Snapshot 0004, Migration 0005, Snapshot 0005, and the
  corresponding journal entries.

### BACKEND / API

- Adds authenticated `GET /api/user-subjects` and
  `PUT /api/user-subjects` routes and route registration.
- Extends atomic onboarding to persist durable membership.
- Extracts neutral shared-catalogue enrichment without changing the shared
  reference-data boundary.

### OPENAPI / GENERATED CONTRACTS

- Updates onboarding to 1–5 subjects.
- Adds membership list/replacement operations and request/response schemas.
- Updates generated React Query client, TypeScript schemas, Zod schemas, and
  generated type exports.

### FRONTEND

- Updates onboarding to 1–5 subjects.
- Makes My Subjects consume durable membership.
- Adds atomic membership replacement to Settings.
- Makes the Study Plan task subject selector consume enrolled subjects.

### TESTS

- Adds API authentication/validation coverage for membership endpoints.
- Extends local database integration coverage for onboarding, 1–5 boundaries,
  replacement, RLS/grants, direct-write denial, referential integrity, journal,
  function privileges, task regression, and two-user isolation.
- Updates frontend onboarding and page-wiring tests.

### LOCAL DEVELOPMENT SAFETY

- Updates `require-local-supabase.mjs` to invoke the repository-pinned CLI via
  `process.execPath`/`execFileSync`, while preserving exact loopback URL guards
  and never falling back to hosted Supabase.

### DOCUMENTATION

- Adds Reports 35, 36, and 37.

No changed file falls outside these categories. Some test and local-safety
files overlap the backend category by purpose; there is no unexplained file.

## Scope Verification

PASS. Slice 1 implements only durable subject-membership scope:

- `user_subjects` with 1–5 subject support;
- atomic onboarding membership persistence and starter tasks;
- authenticated membership listing and atomic replacement;
- RLS, grants, trusted functions, API validation, generated contracts;
- relevant Onboarding, My Subjects, Settings, and Study Plan integration;
- tests, local loopback safety, and reports.

It does not implement `topic_progress`, legacy syllabus-topic cleanup,
past-paper ownership, paper-year work, personal exam-entry ownership, official
timetable data, an AI assistant, calendar integration, new syllabus subjects, or
an unrelated UI redesign. Later-slice endpoints remain quarantined or neutral
where previously required; no later-slice data model is introduced.

## 1–5 Product Rule

PASS.

| Selection | Frontend | OpenAPI / generated Zod | Express | Trusted functions |
| --- | --- | --- | --- | --- |
| 0 | rejected | rejected | rejected | rejected |
| 1 | accepted | accepted | accepted | accepted |
| 2 | accepted | accepted | accepted | accepted |
| 3 | accepted | accepted | accepted | accepted |
| 4 | accepted | accepted | accepted | accepted |
| 5 | accepted | accepted | accepted | accepted |
| 6 | rejected/prevented | rejected | rejected | rejected |
| duplicates | rejected | OpenAPI declares unique items | rejected | rejected |

OpenAPI declares `minItems: 1`, `maxItems: 5`, and `uniqueItems: true` for both
onboarding and replacement. Orval's generated Zod covers the supported
cardinality and positive-number constraints but does not emit a uniqueness
refinement; Express and both trusted functions independently reject duplicates.
Historical 1–3 reports remain unchanged and historical.

## User Subjects Architecture

PASS. The active design contains:

- `user_id uuid NOT NULL`;
- `subject_id integer NOT NULL`;
- `syllabus_version_id integer NOT NULL`;
- `created_at timestamptz NOT NULL DEFAULT now()`;
- `updated_at timestamptz NOT NULL DEFAULT now()`.

Integrity and access paths are supported by:

- primary key `(user_id, subject_id)` for membership uniqueness and
  owner-prefix lookup;
- Auth FK `user_id -> auth.users(id) ON DELETE CASCADE`;
- subject FK with `ON DELETE RESTRICT`;
- composite FK `(subject_id, syllabus_version_id) ->
  syllabus_versions(subject_id, id) ON DELETE RESTRICT`;
- supporting unique key on `syllabus_versions(subject_id, id)`;
- reference-maintenance index `(subject_id, syllabus_version_id)`;
- reusable `updated_at` trigger;
- serialized maximum-five insert trigger.

Enrollment is authoritative in `user_subjects`; it is not inferred from task
rows. Membership replacement never deletes historical tasks.

## Migration Chain Verification

PASS.

- Migrations 0000–0003 have no diff against the integration branch.
- `0004_colossal_pixie.sql` creates durable membership, referential integrity,
  timestamp/max-five triggers, initial RLS/grants, atomic replacement, and the
  revised onboarding function.
- `0005_restrict_user_subject_writes.sql` removes direct mutation policies and
  grants, leaving authenticated SELECT only.
- The journal is ordered exactly 0000 through 0005 with unique numbering.
- Snapshot 0005 chains from Snapshot 0004.
- Canonical deep comparison shows Snapshots 0004 and 0005 describe the same
  Drizzle schema, as expected because 0005 changes only policies/grants that the
  snapshots do not model; their textual differences are serialization order and
  formatting.
- No migration was generated, edited, or applied during this clearance.

## Final RLS / Grant Model

PASS. The final migration state is:

- RLS enabled on `public.user_subjects`;
- exactly one policy: `user_subjects_select_own`;
- policy target: authenticated SELECT;
- owner predicate: `(select auth.uid()) = user_id`;
- authenticated table privilege: SELECT only;
- no table privilege for `PUBLIC` or `anon`;
- no INSERT, UPDATE, or DELETE policy or grant.

Grants and RLS therefore act as independent layers: grants deny the direct
mutation boundary, while RLS owner-scopes the remaining read boundary.

## Trusted RPC Review

PASS.

`lockdin_complete_onboarding(...)` and
`lockdin_replace_user_subjects(integer[])`:

- are `SECURITY DEFINER` only because trusted writes and shared reference-data
  resolution require the privileged boundary;
- use `SET search_path = ''` and schema-qualified references;
- revoke EXECUTE from `PUBLIC` and `anon`;
- grant EXECUTE only to `authenticated`;
- derive the caller exclusively from `auth.uid()`;
- accept no user UUID parameter;
- reject unauthenticated calls;
- reject 0, 6, duplicate, invalid, and missing/ambiguous-current-version
  selections;
- resolve current versions inside the trusted transaction;
- lock the caller's profile to serialize membership changes;
- roll back on every failure.

Replacement deletes only obsolete memberships, upserts the requested current
memberships, and returns exactly the caller's final set. It never deletes tasks.
PostgreSQL function execution is atomic, so no partial final membership is
visible or committed after failure.

## API Review

PASS.

- Both membership routes use `requireAuth`.
- `requireAuth` obtains `sub` only from verified Supabase JWT claims and checks
  it as a UUID.
- Request-scoped Supabase clients carry the verified caller token and use the
  publishable key; no service-role client bypass is used.
- GET owner-filters by the verified `req.userId` in addition to RLS, returns
  only caller membership, and omits ownership identifiers from the response.
- PUT accepts only subject selection, rejects known ownership-spoof fields,
  independently validates 1–5 distinct positive integer IDs, calls the trusted
  replacement RPC, and performs an owner-scoped readback.
- Onboarding accepts no client identity, validates 1–5 independently, and uses
  the trusted atomic onboarding RPC.
- Signup/profile behavior remains Phase 2-compatible.
- The completed-profile retry path cannot duplicate membership or starter
  tasks.

## Frontend Review

PASS.

- Onboarding presents and enforces 1–5, disables a sixth selection, exposes
  selected/max state, and persists through atomic onboarding.
- My Subjects reads durable membership instead of the shared catalogue.
- Settings separately reads the shared catalogue and protected membership,
  retains 1–5 locally, handles loading/error/retry/pending states, and saves by
  atomic replacement.
- Study Plan uses enrolled subjects where the task form semantically means one
  of the caller's subjects.
- Shared catalogue and subject detail remain separate readable reference data;
  membership is not treated as an ACL for canonical Cambridge content.
- No later-slice page was prematurely converted to owned progress/paper/exam
  data.

The scoped frontend detector reproduced only four incumbent `border-b-2` tab
warnings in Study Plan. They are outside the changed membership selector and
are non-blocking design polish, not a Slice 1 functional or security issue.

## Query Cache / Session Review

The membership query uses the protected `/api/user-subjects` key. The shared
catalogue remains on `/api/subjects`. Settings writes the successful final
membership response only to the protected membership key.

`AuthProvider` calls `queryClient.clear()` on explicit logout, signed-out auth
events, unresolved-profile sign-out, and authenticated user changes. It also
guards stale User A profile responses from replacing User B state. Automated
frontend tests cover protected cache clearing, user transitions, onboarding,
and membership page wiring; the full frontend suite passes. Report 37 adds
hosted API/session isolation and bidirectional two-user membership isolation.

Manual browser flash/cache observation:

**NOT RUN — NON-BLOCKING**

The automated behavior plus hosted isolation evidence is sufficient for Slice
1 integration. The manual observation remains a follow-up and is not recorded
as a pass.

## Report 35 Reconciliation

Report 35's durable schema, 1–5, API, frontend, atomicity, local testing, and
initial hosted-preflight claims reconcile with current code.

Its four direct owner-write policies and authenticated CRUD grant describe the
state at implementation commit `d7b4f673...`. Those claims are superseded by
Report 36, Migration 0005, and the active branch. Report 35's stated residual
risk that direct DELETE could leave zero membership is therefore also
superseded: direct authenticated writes are now denied.

Report 35 remains unchanged as a historical record.

## Report 36 Reconciliation

Report 36's correction is present in current code:

- Migration 0005 drops insert/update/delete policies;
- it revokes all table access from `PUBLIC`, `anon`, and `authenticated` before
  granting authenticated SELECT only;
- the select-own policy remains;
- both trusted functions and their restricted execution grants remain;
- local integration coverage asserts the final policy/grant set and denies
  direct writes.

Report 36 remains unchanged.

## Report 37 Reconciliation

Report 37 records the correct immutable Preview URL:

`https://lockedinapp-r5v5ttalu-gidiprogrammers-projects.vercel.app`

It records application commit `0e4c11f598a976c7518b4b9eb90c52c2835cedaf`,
states that migrations 0004/0005 were already applied and not repeated, and
documents hosted two-user onboarding, 1–5 validation, membership isolation,
atomic replacement, direct Data API denial, task regression, cleanup, and
post-cleanup zero user-owned rows. It also records healthy Production,
Production's expected pre-Slice-1 404, and that the Preview was not promoted.

The report honestly marks manual session/cache observation `NOT RUN`. This
clearance preserves that classification and does not reinterpret it as pass.

## Final Local Regression Results

| Check | Result |
| --- | --- |
| Workspace typecheck | PASS |
| API tests | PASS — 10 files, 37 tests |
| Frontend tests | PASS — 8 files, 61 tests |
| Scripts unit tests | PASS — 2 files, 16 tests |
| API integration tests | NOT RERUN — local Supabase unavailable; previously passed in Reports 35/36 |
| Scripts DB tests | NOT RERUN — local Supabase unavailable; database-independent unit suite passed |
| API production build | PASS |
| Frontend production build | PASS |
| `git diff --check` | PASS |

The frontend build emitted non-fatal existing Vite base/sourcemap warnings and
completed successfully. Initial sandboxed TypeScript/Vitest attempts were
blocked before startup by Windows IPC error 5; the same commands were rerun
with process permission and the results above are the completed results.

## Hosted Read-Only State

### Fresh SQL reconfirmation

**NOT RERUN — HOSTED DATABASE CREDENTIALS NOT AVAILABLE IN THE CURRENT
WORKSPACE**

The available `.env.local` database URLs resolve to loopback. A guard refused
them before connection because they cannot prove hosted state. No hosted SQL,
user creation, data write, migration, or schema change was performed.

### Latest hosted database evidence

Report 37 remains the latest hosted evidence and records an unchanged six-entry
0000–0005 journal, `auth.users = 0`, `profiles = 0`, `user_subjects = 0`,
`tasks = 0`, `subjects = 9`, `syllabus_versions = 9` (all 9 current), RLS
enabled, exactly the select-own policy, and authenticated SELECT as the only
relevant table grant after cleanup.

Fresh Preview database health returned 200, providing non-destructive current
connectivity evidence but not replacing the unavailable SQL-level recount.

## Preview State

Fresh read-only smoke checks against the immutable Report 37 Preview:

| Request | Result |
| --- | ---: |
| `GET /` | 200 |
| `GET /login` | 200 |
| `GET /signup` | 200 |
| `GET /api/healthz` | 200 |
| `GET /api/healthz/db` | 200 |
| `GET /api/user-subjects` unauthenticated | 401 |

PASS. The immutable Preview remains available and was not redeployed or
promoted.

## Production Health

Fresh read-only checks against `https://lockedin-study.vercel.app`:

| Request | Result |
| --- | ---: |
| `GET /api/healthz` | 200 |
| `GET /api/healthz/db` | 200 |
| `GET /login` | 200 |
| `GET /signup` | 200 |
| `GET /api/user-subjects` | 404 (expected before Slice 1 integration/deploy) |

PASS. Production was not modified.

## Secrets Review

PASS. A Slice 1 additions-only scan found no committed service-role key, JWT,
database password/URL, access token, refresh token, confirmation-token URL,
literal test password, secret environment assignment, or unexplained
high-entropy credential literal. Reports avoid disposable credentials and user
identifiers. The deployed client design uses a publishable key, not a service
role.

## Generated Contract Consistency

PASS. The current generated TypeScript, React Query, and Zod files correspond
to the OpenAPI source for:

- both authenticated membership operations;
- protected `/api/user-subjects` query key;
- 1–5 subject cardinality and positive IDs;
- membership/version response shapes;
- updated onboarding cardinality;
- exported generated membership types.

Duplicate rejection remains in OpenAPI plus Express/SQL because the current
Orval Zod output does not emit `uniqueItems`. Typecheck, tests, and both builds
validate the generated consumers. Code generation was not rerun because there
was no evidence of stale output, avoiding an unnecessary generated-file write.

## Merge Conflict Analysis

**CLEAN**

Non-mutating `git merge-tree` analysis against the refreshed integration head
completed successfully with zero conflict markers. The integration head is an
ancestor of Slice 1, so the reviewed implementation applies as a linear
fast-forward history with no conflicting integration-only commits.

## Remaining Non-Blocking Follow-Ups

- Perform the manual browser User A logout/User B login flash/cache observation
  during integration validation; current classification is NOT RUN.
- Rerun local database integration and scripts DB suites when the existing
  proven-local Supabase environment is intentionally available; do not point
  them at hosted Supabase.
- Retain the four incumbent Study Plan tab-border detector warnings for a later
  UI polish pass rather than expanding Slice 1 scope.
- Reconfirm hosted SQL counts at the next authorized operational gate with
  explicit read-only access and rollback.

None is a critical unresolved Slice 1 implementation, security, data-isolation,
or merge-conflict issue.

## Final Merge Verdict

**SLICE 1 MERGE CLEARANCE PASSED — APPROVE MERGE INTO PHASE3-MULTITENANCY**
