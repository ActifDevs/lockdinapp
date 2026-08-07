# Phase 3 Stop 1 — Multi-Tenancy Architecture & Migration Preflight

Audit date: 2026-08-07
Branch: `phase3-multitenancy`
Audited starting SHA: `d25aa0a09ca390ea1f1e94f3538ae74a2f8df7f8`
Scope: architecture and migration preflight only; no Phase 3 implementation

## Executive Summary

The repository and hosted database are ready for Phase 3 Slice 1 (`user_subjects`). After a fresh `git fetch origin`, the dedicated branch, local `main`, `origin/main`, and `origin/phase3-multitenancy` all resolve to the expected Phase 2 checkpoint `d25aa0a09ca390ea1f1e94f3538ae74a2f8df7f8`. The working tree was clean at audit start. The Phase 2 merge commit `7d7cedb1f2faff2f78cf32231fa36aa51b996d4c` and final hosted E2E clearance are intact in ancestry.

Current code has a sound Phase 2 boundary for `profiles` and `tasks`: the Express server verifies a Bearer JWT, derives `req.userId`, uses a request-scoped Supabase client carrying that JWT, explicitly filters task mutations by owner, and relies on PostgreSQL RLS as the final boundary. Remaining student-specific features are deliberately quarantined rather than exposed globally.

The primary ownership findings are:

- No `user_subjects` table or durable subject-membership API exists. Onboarding subject IDs are used only inside `lockdin_complete_onboarding` to create starter tasks; they are not persisted as enrollment.
- `syllabus_topics.status` and `syllabus_topics.notes` are legacy per-student fields on shared canonical topic rows. Current APIs correctly return neutral progress and block writes. The hosted database has one legacy `in_progress` topic, no topic notes, and zero Auth users, so that row has no defensible owner and must not be backfilled arbitrarily.
- `past_paper_attempts` has normalized subject/component/variant/session identity but no `user_id`, no paper year, and no ownership policies. Its API is authenticated but quarantined. The hosted table is empty.
- The current `exam_dates` contract has authenticated create/delete operations and the frontend treats rows as a student's calendar/countdown entries. There is no official-timetable importer, source, administrative zone, exam-series year, or start-time model. The correct Phase 3 decision is **CONVERT TO USER-OWNED DATA** and document the table as personal exam entries. Any future official Cambridge timetable must be a separate shared model.
- Hosted `past_paper_attempts` and `exam_dates` already have RLS enabled but no policies. Their broad legacy grants therefore do not currently expose rows through the Data API, and the Express routes perform no table queries. Phase 3 must still replace the broad grant baseline with explicit least-privilege grants when ownership policies are added.

**Final Stop 1 verdict: READY FOR PHASE 3 IMPLEMENTATION.** A later, explicit decision is required before Topic Progress legacy cleanup, but it does not block Slice 1.

## Audited Git Baseline

The required baseline commands were run before repository changes and repeated after `git fetch origin`.

| Check | Audited result |
| --- | --- |
| `git status` | Clean; branch up to date with `origin/phase3-multitenancy` |
| `git branch --show-current` | `phase3-multitenancy` |
| `git rev-parse HEAD` | `d25aa0a09ca390ea1f1e94f3538ae74a2f8df7f8` |
| `git rev-parse origin/main` | `d25aa0a09ca390ea1f1e94f3538ae74a2f8df7f8` |
| `git merge-base origin/main HEAD` | `d25aa0a09ca390ea1f1e94f3538ae74a2f8df7f8` |
| `origin/main` ancestor of `HEAD` | Yes |
| Required checkpoint ancestor of `HEAD` | Yes |
| Report collision | `docs/cursor/reports/34-phase3-stop1-multitenancy-architecture-preflight.md` did not exist |

The audited ten-commit history began:

```text
d25aa0a Checkpoint of phase 2 @ 2026-08-07
7d7cedb Merge Phase 2 auth-and-tasks into main
c3aa440 docs(phase2): clear hosted e2e merge gate
e746893 docs(phase2): fix report numbering and cutover order
9c0e2cb docs(phase2): clear final cutover readiness
80ebbc6 merge(origin/auth-and-tasks): integrate report30 with report29 readiness stop
c05c38e docs(phase2): record final operational readiness
e4ee299 adding report30
e25a8ac docs(phase2): record Preview validation after Vercel login
c43732d docs(phase2): resolve operational cutover blockers
```

No unrelated local modification existed before this audit. The exact audited starting SHA is `d25aa0a09ca390ea1f1e94f3538ae74a2f8df7f8`.

## Phase 2 Baseline Confirmation

Repository history confirms the expected chain:

- `7d7cedb1f2faff2f78cf32231fa36aa51b996d4c` is the two-parent merge of the Phase 2 `auth-and-tasks` branch into main.
- `d25aa0a09ca390ea1f1e94f3538ae74a2f8df7f8` is its direct checkpoint child and is current `origin/main`.
- `docs/cursor/reports/33-phase2-hosted-e2e-merge-clearance.md` records the two-user task-isolation pass and hosted cleanup.
- The current hosted Drizzle journal contains four entries with timestamps matching repository `_journal.json`: `1785172719598`, `1785576300874`, `1785624652661`, and `1785690212772`.
- Hosted journal hashes match repository migration content after normalizing the Windows checkout's CRLF line endings to canonical LF:

| Migration | Canonical LF SHA-256 / hosted journal hash |
| --- | --- |
| `0000_syllabus_reference_and_paper_attempts.sql` | `9718f65706db89d53484093be10221f9483e8dfa627b2fd10ed432c59b95cb80` |
| `0001_chilly_randall_flagg.sql` | `350630e1eab9ce500132f0fa42895d6b71eab93d4995fc54e4b11ba85d233fd7` |
| `0002_phase2_atomic_onboarding.sql` | `a969f338daa89541eb1f2e658dca3aace0cf8915a234acec6016d7c820489bb8` |
| `0003_stormy_mongu.sql` | `53f9e908af10ea7a122767924a744efc630b9e8c8a767253ef5bd9055ad183f9` |

The Phase 2 baseline is intact. No applied migration was edited.

## Current Data Ownership Matrix

The application-owned Drizzle schema contains exactly eleven public tables. `auth.users` and the Drizzle journal are included below because they are operational dependencies, not because the application owns their schema.

RLS states in this matrix are **verified live**. API and frontend usage are **verified from current repository code**.

| Table | Current Purpose | Current Ownership Model | Current User FK | Current RLS State | Current API Usage | Current Frontend Usage | Phase 3 Action Required | Risk Level |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `auth.users` | Supabase identity records | SYSTEM / OPERATIONAL DATA | Primary identity | Supabase-managed | JWT verification and `auth.uid()` source | Supabase Auth session | No schema change; continue deriving identity from verified JWT | Low |
| `drizzle.__drizzle_migrations` | Applied migration journal | SYSTEM / OPERATIONAL DATA | None | Internal schema | Migration tooling only | None | Append new migrations only; never hand-stamp during normal Phase 3 | Medium |
| `subjects` | Cambridge subject catalogue | SHARED REFERENCE DATA | None | Enabled; no policies | Public read-only Express catalogue via owner DB connection | Every subject picker/list | Keep shared; add enrolled-subject API rather than cloning rows | Low |
| `syllabus_versions` | Versioned syllabus specifications | SHARED REFERENCE DATA | None | Enabled; no policies | Current-version lookup for assessment components; importer | Indirect | Keep shared; reference it from `user_subjects` to pin enrollment | Low |
| `syllabus_units` | Canonical main-topic hierarchy | SHARED REFERENCE DATA | None | Enabled; no policies | Public syllabus reads; importer | Subject detail | Keep shared | Low |
| `syllabus_topics` | Canonical subtopics, plus legacy `status`/`notes` | SHARED REFERENCE DATA | None | Enabled; no policies | Public reads neutralize progress; PATCH is quarantined | Subject detail renders neutral status but still offers a currently failing update action | Create user-owned progress table; deprecate shared progress columns; later remove them separately | High |
| `syllabus_learning_outcomes` | Canonical learning outcomes | SHARED REFERENCE DATA | None | Enabled; no policies | Public syllabus reads; importer | Subject detail | Keep shared | Low |
| `assessment_components` | Canonical paper/component definitions | SHARED REFERENCE DATA | None | Enabled; no policies | Component dropdown and importer | Past-paper form | Keep shared | Low |
| `learning_outcome_components` | Outcome-to-component reference junction | SHARED REFERENCE DATA | None | Enabled; no policies | Importer; not currently returned directly by API | None directly | Keep shared | Low |
| `profiles` | One application profile per Auth user | USER-OWNED DATA | `id -> auth.users(id) ON DELETE CASCADE` | Enabled; own SELECT/UPDATE policies | Authenticated profile GET/PATCH and onboarding RPC | Auth provider, onboarding, settings | No ownership redesign; onboarding RPC must also persist membership | Low |
| `tasks` | Student revision tasks | USER-OWNED DATA | `user_id -> auth.users(id) ON DELETE CASCADE`, NOT NULL | Enabled; own SELECT/INSERT/UPDATE/DELETE policies | Authenticated, request-scoped Supabase CRUD with explicit owner filters | Dashboard, plan, calendar, subject detail, progress | Keep as proven reference pattern | Low |
| `past_paper_attempts` | Student attempts and scores | USER-OWNED DATA | None | Enabled; no policies | Authenticated GET returns `[]`; POST/DELETE return 503; no table query | Full list/form/delete UI still calls quarantined API | Add owner/year, policies, least-privilege grants, safe CRUD and analytics | High |
| `exam_dates` | Personal exam calendar/countdown entries in current product behavior | USER-OWNED DATA | None | Enabled; no policies | Authenticated GET returns `[]`; POST/DELETE return 503; no table query | Calendar/dashboard read entries; no current create UI | Add owner and explicitly define as personal entries; keep official timetable separate | High |

There is no application-owned table that is currently LEGACY / OBSOLETE as a whole. The legacy/obsolete elements are specifically `syllabus_topics.status` and `syllabus_topics.notes`, not the canonical topic table.

## Current Authentication & Security Boundary

The Phase 2 model remains appropriate:

```text
Authenticated React frontend
  -> Supabase-issued Bearer JWT
  -> Express requireAuth verifies claims
  -> server derives req.userId from claims.sub
  -> request-scoped Supabase client carries the caller JWT
  -> PostgreSQL grants permit the operation
  -> PostgreSQL RLS enforces auth.uid() ownership
```

Evidence:

- `artifacts/api-server/src/middlewares/require-auth.ts` verifies the token with `auth.getClaims`, validates a UUID `sub`, and never accepts identity from a body or query.
- `artifacts/api-server/src/lib/supabase-user-client.ts` constructs a new client per request with the caller's Bearer token and the publishable key. No service-role key is used.
- `artifacts/api-server/src/routes/tasks.ts` rejects `userId`/`user_id`, sets `user_id` from `req.userId`, and adds explicit owner predicates for updates/deletes.
- Migration `0001` gives `tasks` four owner policies. UPDATE has both `USING` and `WITH CHECK`.
- `profiles` permits own SELECT/UPDATE only, with column-level grants for safe editable fields.

The direct Drizzle pool connects as the database owner and therefore bypasses RLS. Current uses of that pool in student-facing routes are limited to shared reference data (`subjects`, topic hierarchy, components) and health checks. Phase 3 must not use that owner connection for a user-owned query unless every query has an explicit, server-derived owner predicate and tests prove it. The preferred pattern is the request-scoped Supabase client so RLS remains active.

Live grants reveal broad legacy `anon`/`authenticated` privileges on reference, paper-attempt, and exam-date tables. RLS currently blocks Data API rows where no policy exists, but Phase 3 migrations must explicitly `REVOKE ALL` from `PUBLIC`, `anon`, and `authenticated`, then grant only the required table operations and sequence usage to `authenticated`.

The existing `SECURITY DEFINER` functions are narrowly justified:

- `lockdin_handle_new_user` must insert the profile from an `auth.users` trigger.
- `lockdin_complete_onboarding` must atomically update reserved profile fields and create starter tasks. Phase 3 should extend it to create `user_subjects` in the same transaction.

Both functions use `search_path = ''`, and their callable surface is revoked appropriately. Any replacement onboarding function must continue to take no user-ID argument, derive `auth.uid()`, validate every subject/version, and write `v_uid` explicitly. A general membership-replacement RPC can remain `SECURITY INVOKER`; SECURITY DEFINER is not needed merely to bypass a missing policy.

## User Subjects Findings

### Current flow

1. `AuthProvider.signUp` calls Supabase Auth with `full_name` user metadata.
2. `lockdin_on_auth_user_created` invokes `lockdin_handle_new_user`, creating `profiles.id = auth.users.id`.
3. The protected onboarding page fetches the shared `/subjects` catalogue and keeps selected IDs only in component state.
4. `AuthProvider.completeOnboarding` sends `subjectIds` to `POST /profile/complete-onboarding`.
5. Express validates 1–3 distinct positive IDs, then calls `lockdin_complete_onboarding` with the user's JWT.
6. The RPC derives `auth.uid()`, updates the profile, and creates one starter task for each selected subject.
7. The RPC does not insert any durable enrollment row. After completion, only the resulting tasks incidentally retain subject IDs.

### Direct answers

1. **Does `user_subjects` exist?** No. It is absent from Drizzle, migrations, the hosted catalogue, OpenAPI, generated clients, and API routes.
2. **Where are onboarding selections stored?** Nowhere as membership. They are transient RPC input and are consumed to create starter tasks.
3. **Are subject IDs durable preferences?** No. Starter tasks are durable, but they are activity records, not an authoritative enrollment set.
4. **Which views display/infer a student's subjects?** `Subjects` labels the full catalogue “My subjects”; Dashboard mastery uses the full catalogue; Progress returns all catalogue subjects at zero; Study Plan and Past Papers offer every catalogue subject; any subject detail is directly navigable. Settings accurately labels the list as a shared catalogue. Tasks incidentally show subjects used by that user's tasks.
5. **Which APIs provide selection state?** None. `/subjects` is explicitly global. The onboarding endpoint accepts selections but does not return/persist them. `/tasks` can only be used as an incomplete heuristic.
6. **What remains impossible?** Reliable retrieval/editing of enrollment; pinning a user to a syllabus version; correct “My subjects” filtering; enrollment-aware dashboard/progress; distinguishing “selected but no activity” from “not selected”; and migrating enrollment without heuristics.

### Recommended `user_subjects` model

| Element | Recommendation |
| --- | --- |
| Columns | `user_id uuid NOT NULL`, `subject_id integer NOT NULL`, `syllabus_version_id integer NOT NULL`, `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()` |
| Primary key | `(user_id, subject_id)` — one active version selection per user/subject |
| Auth FK | `user_id -> auth.users(id) ON DELETE CASCADE` |
| Reference FKs | `subject_id -> subjects(id) ON DELETE RESTRICT`; `syllabus_version_id -> syllabus_versions(id) ON DELETE RESTRICT` |
| Version consistency | Add a unique referenced key on `syllabus_versions(subject_id, id)` and a composite FK `(subject_id, syllabus_version_id)` so mismatched subject/version pairs cannot exist |
| Indexes | PK serves user listing/RLS; add `subject_id` and `syllabus_version_id` indexes for reference maintenance |
| Cardinality | Preserve current product rule of 1–3 selected subjects in onboarding/replacement RPC; do not rely on frontend-only enforcement |
| Semantics | Membership is a preference/domain fact, not authorization to read shared reference data and not a reason to delete historical tasks/attempts when unenrolling |

RLS must provide own SELECT, INSERT, UPDATE, and DELETE. Inputs must not contain `userId`. The onboarding RPC must resolve each subject's single current syllabus version, fail if it is missing or ambiguous, insert all memberships, create starter tasks, and update the profile atomically. A subsequent authenticated “replace my subjects” endpoint should operate transactionally so partial selection changes are impossible.

Live state currently has 9 subjects, 9 syllabus versions, 9 current versions, and no subject with multiple versions. The version consistency constraint is still required for the future state the schema was designed to support.

## Topic Progress Findings

`lib/db/src/schema/syllabusTopics.ts` places `status` and `notes` directly on the canonical shared topic. Current frontend-to-database tracing is:

```text
Subject detail controls
  -> generated PATCH /syllabus-topics/:topicId
  -> Express always returns 503
  -> no database write

Shared syllabus GET
  -> owner Drizzle query reads topics
  -> API overwrites status = not_started and notes = null
  -> frontend receives neutral placeholders
```

Current code does not write global topic progress. Repository-wide search found no active database update of `syllabus_topics.status` or `.notes`; the importer intentionally leaves them untouched, and the Express PATCH is quarantined. Dashboard and progress APIs also return zero placeholders rather than aggregating shared status.

Hosted evidence shows 520 topics: 519 `not_started`, one `in_progress`, zero with notes. There are zero Auth users. The one non-default row therefore cannot be attributed reliably and must not be copied to an arbitrary future user.

### Recommended `topic_progress` model

| Element | Recommendation |
| --- | --- |
| Columns | `user_id uuid NOT NULL`, `topic_id integer NOT NULL`, `status text NOT NULL DEFAULT 'not_started'`, `notes text NULL`, `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()` |
| Primary key | `(user_id, topic_id)`; this is also the uniqueness guarantee |
| FKs | `user_id -> auth.users(id) ON DELETE CASCADE`; `topic_id -> syllabus_topics(id) ON DELETE CASCADE` |
| Status constraint | Database CHECK limited to `not_started`, `in_progress`, `completed`; do not rely only on TypeScript/Zod enums |
| Indexes | PK for user reads/RLS; additional `topic_id` index for topic lifecycle and diagnostics |
| Null semantics | `notes = NULL` means no note; trim empty strings to NULL. Absence of a row means default `not_started` with no note |
| Write behavior | Authenticated PATCH/PUT upserts `(auth user, topic)`; ownership is server-derived. Reset to default status + NULL note deletes the row rather than storing a meaningless default |
| Read behavior | Left join/merge shared topics with the caller's progress, defaulting missing rows to neutral values |

Legacy recommendation: **DEPRECATE** shared `status`/`notes` immediately when Migration A lands; **KEEP TEMPORARILY** through cutover; perform no backfill while no owner exists; obtain explicit approval to clear the one legacy row; then **REMOVE LATER** in a separate Migration B only after all reads/writes and two-user tests use `topic_progress`.

## Past Paper Attempts Findings

### Current schema and behavior

- Columns: `id`, `subject_id`, nullable `component_id`, nullable `variant`, `session`, `score`, `total_marks`, stored `percentage`, `date_attempted`, optional time/notes, `created_at`.
- `component_id` points to shared `assessment_components` with `ON DELETE SET NULL`; `subject_id` points to `subjects` with `ON DELETE CASCADE`.
- Database checks cover variant 1–5, allowed sessions, nonnegative score, positive total marks, and score <= total marks.
- `user_id` does not exist. Paper year also does not exist, so current normalized identity is incomplete: `date_attempted` is the date the student attempted the paper and cannot identify the source paper year.
- RLS is enabled live, but there are no policies. Broad legacy role grants remain.
- GET requires authentication and returns `[]` without querying the table. POST and DELETE require authentication and return 503. There is no PATCH contract.
- The frontend still exposes filtering, a complete create form, charts, and delete controls. Create/delete fail at the quarantined API.
- OpenAPI and generated types preserve subject/component/variant/session and derive `paperLabel`; they have no `userId` and no paper year.
- There are no focused route or isolation tests for paper attempts.
- Hosted row count is zero, so there is no historical row to assign.

### Recommended ownership migration

Add `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, add `paper_year integer NOT NULL` with a reviewed reasonable range check, and index `(user_id, date_attempted DESC)` plus `(user_id, subject_id, date_attempted DESC)`. Preserve subject, component, variant, session, and year as structured columns. Do not replace them with a composite paper-code string. Repeated attempts at the same paper are valid, so do not add a uniqueness constraint across paper identity.

The API must:

- reject any ownership field;
- derive user UUID from `requireAuth`;
- validate that component belongs to the submitted subject/current relevant syllabus version;
- compute percentage server-side from score and total marks;
- perform list/create/update/delete through the request-scoped Supabase client;
- apply explicit `user_id = req.userId` predicates as defense in depth;
- return 404, not an ownership oracle, for cross-user row IDs;
- require authentication for `/subjects/:subjectId/performance` before it begins returning user data;
- feed only owned rows into dashboard/progress analytics.

Because the hosted table is empty, a direct NOT NULL addition is safe **only if the implementation preflight repeats the count immediately before applying the migration**. If any row appears, stop. Neither attempt date nor any other current field can reliably identify its owner or paper year. The acceptable choices would then be owner-supported attribution, temporary nullable columns with a reviewed backfill, or explicit deletion after approval—not arbitrary assignment.

## Exam Dates / Exam Entries Decision

**Architectural recommendation: CONVERT TO USER-OWNED DATA.**

The current table and contracts most closely represent a student's personal exam entries:

- OpenAPI defines authenticated create and delete operations.
- The frontend calendar treats rows as personal countdown/schedule items alongside the user's tasks.
- Notes are editable/user-oriented in the contract.
- The dashboard copy says to add session dates.

The current frontend is read-only in practice because the route is quarantined, but there is no evidence of an official-timetable ingestion path. Conversely, an official Cambridge timetable would require at least a series/year, variant/component identity, administrative zone or timetable scope, time/key-time data where relevant, provenance/source, and import lifecycle. None exists.

Therefore:

1. Current schema intent: prototype personal entries, insufficiently scoped.
2. Current frontend assumption: personal upcoming exams/countdowns.
3. Current model ambiguity: the name `exam_dates` is ambiguous, and old documentation correctly flags it; current code behavior resolves it toward personal entries.
4. Official dates: if introduced, they must be shared canonical reference data.
5. Personal entries: user-owned with RLS.
6. Need for both now: no. The repository proves a need for personal entries only. Official ingestion is a separate future product slice.
7. Adding `user_id` to the current table: correct if the model/API documentation is explicitly changed to “personal exam entries” and official rows are prohibited. It would be wrong to insert official rows into the same table later.

Recommended Phase 3 target retains the physical table/API path for a lower-risk cutover but changes its domain description to personal exam entries. Add `user_id`, `created_at`, `updated_at`, an index on `(user_id, date)`, own CRUD policies, and authenticated PATCH for corrections. A uniqueness rule on `(user_id, subject_id, paper_code, date)` may be added if product review confirms duplicate entries have no meaning. Hosted row count is zero, so there is no conversion/backfill ambiguity today.

If official timetable support is later approved, create a separate model such as `official_exam_events` with structured series/year/component/variant/time/zone/source fields. That future shared model is out of Phase 3.

## API Route Ownership Audit

| Route area | Authentication | Identity source | DB client / RLS | Explicit owner filter | Quarantine | Multi-user state | Phase 3 change |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/tasks` | Required | Verified `claims.sub` | Request-scoped Supabase; RLS active | Yes on list/update/delete; insert owner server-set | No | Safe | Reference implementation |
| `/profile` | Required | Verified `claims.sub` | Request-scoped Supabase; RLS active | `id = req.userId` | No | Safe | None beyond membership integration |
| `/profile/complete-onboarding` | Required | `auth.uid()` inside RPC | Caller JWT invokes narrowly granted SECURITY DEFINER RPC | No user-ID argument | No | Safe for current writes | Atomically insert `user_subjects` and version pin |
| `/progress/overview` | Required | Verified `claims.sub` | Request-scoped Supabase for tasks; owner Drizzle for shared subjects | Task helper filters owner | Paper/topic placeholders | Safe but incomplete | Use enrolled subjects, owned topic progress and attempts |
| `/dashboard/summary` | Required | Verified `claims.sub` | Request-scoped Supabase for tasks; owner Drizzle for shared subjects | Task helper filters owner | Paper/exam/topic placeholders | Safe but incomplete | Use memberships and owned feature rows only |
| `/past-paper-attempts` | Required | Verified `claims.sub` | No table query | N/A | GET empty; writes 503 | Safe quarantine | Implement owner-safe CRUD |
| `/exam-dates` | Required | Verified `claims.sub` | No table query | N/A | GET empty; writes 503 | Safe quarantine | Implement personal-entry CRUD |
| `/subjects` and detail/catalogue | Public | None | Owner Drizzle, RLS bypassed | N/A; shared only | Mutations return 403 | Safe for shared data | Keep catalogue shared; add authenticated enrolled-subject endpoint |
| `/subjects/:id/syllabus` | Public | None | Owner Drizzle, RLS bypassed | N/A; shared only | Progress neutralized | Safe for shared data | Keep a neutral shared read; add authenticated merged-progress read or progress map |
| `/subjects/:id/performance` | Public | None | Owner Drizzle only verifies shared subject | N/A | Empty placeholder | Safe only while empty | Require auth before returning owned attempts |
| `/syllabus-topics/:id` PATCH | Public middleware-wise | None | No DB query | N/A | Always 503 | Safe quarantine | Require auth and upsert caller's `topic_progress`; canonical row remains immutable |

No current route accepts a user UUID to establish ownership. No service-role client is used. The principal future hazard is accidentally querying new user-owned tables through the owner Drizzle connection without a caller predicate; the slice test gates must detect that.

## Frontend Ownership Audit

| Area | Current behavior | Ownership problem / placeholder | Required Phase 3 change |
| --- | --- | --- | --- |
| Onboarding | Selects 1–3 IDs in local React state and sends them once | Selection disappears after starter-task creation | Persist membership atomically; hydrate selection from API on later visits/settings |
| Subjects page | Fetches all shared subjects but labels them “My subjects” | Global catalogue presented as enrollment | Fetch enrolled subjects; offer separate catalogue/manage flow |
| Settings subjects tab | Shows all catalogue rows and accurately warns they are not account membership | Read-only placeholder | Add membership selection/replacement UI after Slice 1 |
| Dashboard mastery | Uses all catalogue subjects; progress is zero | Not enrollment-scoped; neutral metrics | Use `user_subjects`; merge owned progress/attempts/exams |
| Progress page | Consumes overview containing all subjects and zero syllabus progress/papers | Placeholder | Return only enrolled subject metrics from owned rows |
| Subject detail | Receives neutral topic status but renders clickable progress controls | PATCH always 503; failure is a quarantined UX path | Read merged owned progress and surface safe mutation/error/reset behavior |
| Past papers | Full list/create/delete UI against empty/503 API; all subjects offered | Feature appears active but is quarantined | Filter by enrollment, add paper year, wire owner-safe mutations and errors |
| Calendar | Combines owned tasks with empty exam list; no exam-entry creation UI | Exam rows unavailable | Add/manage personal exam entries and preserve task isolation |
| Study plan | Task CRUD is owned, but subject dropdown contains full catalogue | Tasks can be created for non-enrolled subjects | Prefer enrolled subjects while retaining a deliberate catalogue fallback if product wants it |
| Session change/logout | Query cache is cleared on logout/user change | Correct | Add all new query keys to the same invalidation/clear discipline |
| Local state/fallbacks | Obsolete auth/subject localStorage keys are removed; static subject catalogue remains styling/fallback support | Static catalogue is not membership truth | Never use fallback catalogue as enrollment; retire only in its separate planned cleanup |

There is no durable mock enrollment remaining in localStorage. The only durable user-specific frontend state outside server data is unrelated preferences such as notifications/theme/reminder markers.

## Generated Contract Impact

`lib/api-spec/openapi.yaml` is the source. `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/` are Orval outputs and must not be hand-edited.

Required contract changes by slice:

- User Subjects: enrollment schemas, authenticated list/replace endpoints, and onboarding response/behavior documentation. Subject catalogue contracts remain shared.
- Topic Progress: authenticated progress schema, status/note nullable semantics, reset behavior, merged syllabus/progress response or progress-map endpoint; remove `deprecated` after cutover.
- Past Papers: add `paperYear`, authenticated CRUD responses including PATCH if added, remove quarantine/deprecation descriptions, and update paper labels/analytics.
- Exam Entries: redefine `ExamDate` as personal entry, add PATCH and timestamps if adopted, remove quarantine/deprecation descriptions.
- Dashboard/Progress/Subject Performance: replace placeholder descriptions with caller-owned aggregation semantics and require Bearer auth on performance.

Required regeneration order for each implementation slice:

1. Edit and validate `lib/api-spec/openapi.yaml`.
2. Run `pnpm --filter @workspace/api-spec codegen` once; Orval regenerates both Zod and React Query outputs and then runs library typecheck.
3. Review generated Zod request/response parsers first because Express imports them.
4. Review generated TypeScript schemas and React Query hooks, including query keys and auth behavior.
5. Update API routes against the generated Zod contract.
6. Update frontend consumers against the generated React client.
7. Run full typecheck and both server/frontend tests.

Do not regenerate merely because generated files exist; regenerate only after the OpenAPI source intentionally changes.

## Hosted Database Preflight

### VERIFIED LIVE

The existing `DATABASE_URL` was used without printing it. All hosted queries ran inside `BEGIN READ ONLY`; `current_setting('transaction_read_only')` returned `on`; the transaction ended with `ROLLBACK`. No SQL DDL/DML was executed. PostgreSQL reported version 17.6.

| Object | Live rows |
| --- | ---: |
| `auth.users` | 0 |
| `public.profiles` | 0 |
| `public.tasks` | 0 |
| `public.past_paper_attempts` | 0 |
| `public.exam_dates` | 0 |
| `public.subjects` | 9 |
| `public.syllabus_topics` | 520 |

Additional live facts:

- `public.user_subjects` does not exist.
- `public.topic_progress` does not exist.
- Topic legacy distribution is 519 `not_started`, 1 `in_progress`, 0 notes.
- All eleven public application tables have RLS enabled, not forced.
- Only `profiles` and `tasks` have RLS policies.
- `tasks.user_id` is UUID NOT NULL and has the correct Auth FK and index.
- `past_paper_attempts` and `exam_dates` have no owner column or owner FK.
- The expected paper-attempt checks exist live, including the hand-authored allowed-session check.
- Neither `past_paper_attempts` nor `exam_dates` has an ownership/query index beyond its primary key.
- The hosted migration journal has exactly the expected 0000–0003 entries and hashes.
- Lockdin functions live as expected: onboarding and new-user trigger functions are SECURITY DEFINER; the updated-at trigger function is not.

### VERIFIED FROM REPOSITORY

- Drizzle schemas, migrations, OpenAPI, generated clients, Express routes, React consumers, tests, and Phase 2 reports described in this audit.
- The repository uses imperative Drizzle migrations (`lib/db/migrations`) as application schema authority. `supabase db push` is not the application migration workflow.

### NOT independently verifiable in this audit

- State changes after the read-only query timestamp.
- Supabase dashboard Data API exposure settings, Auth provider settings, backup retention, or external deployment configuration; none was needed for this architecture decision.
- Any historical row state before Phase 2 cleanup beyond committed reports.

## Legacy Data / Backfill Risks

| Area | Current live risk | Safe handling |
| --- | --- | --- |
| User subjects | No rows or users; no enrollment exists | No backfill today. Recheck immediately before migration. If users/tasks appear, derive only defensible candidates from owned activity and obtain review; tasks are not complete enrollment truth |
| Topic progress | One global `in_progress` row, zero possible owners | Do not backfill. Keep legacy fields temporarily, cut over to new table, obtain explicit approval to reset/clear the legacy value, then remove columns later |
| Past papers | Zero rows today; no owner/year columns | Direct NOT NULL is safe only after repeat zero-row precheck. If rows appear, block; attempt date cannot infer owner or paper year |
| Exam dates | Zero rows today; current model reclassified as personal | Direct owner addition safe after repeat zero-row precheck. If rows appear, require owner confirmation or approved cleanup |
| Migration journal | Exact through 0003 | Add only new migrations; never edit 0000–0003 |

The audit is a point-in-time preflight, not a lock. Every slice must repeat counts and column/policy/journal checks immediately before applying its migration. No legacy data may be silently assigned to the first or only Auth user.

## Proposed Phase 3 Data Model

### `user_subjects`

```text
user_id              uuid        not null  -> auth.users(id) on delete cascade
subject_id           integer     not null  -> subjects(id) on delete restrict
syllabus_version_id  integer     not null  -> syllabus_versions(id) on delete restrict
created_at           timestamptz not null  default now()
updated_at           timestamptz not null  default now()
primary key (user_id, subject_id)
composite FK (subject_id, syllabus_version_id) -> syllabus_versions(subject_id, id)
```

### `topic_progress`

```text
user_id     uuid        not null  -> auth.users(id) on delete cascade
topic_id    integer     not null  -> syllabus_topics(id) on delete cascade
status      text        not null  default 'not_started'
notes       text        null
created_at  timestamptz not null  default now()
updated_at  timestamptz not null  default now()
primary key (user_id, topic_id)
check status in ('not_started', 'in_progress', 'completed')
```

### `past_paper_attempts` additions

```text
user_id     uuid    not null -> auth.users(id) on delete cascade
paper_year  integer not null with reviewed range check
index (user_id, date_attempted desc)
index (user_id, subject_id, date_attempted desc)
```

Retain subject, component, variant, session, score, total marks, attempted date, timing, notes, and created timestamp. No unique paper-identity constraint: repeated attempts are legitimate.

### `exam_dates` as personal entries

```text
user_id     uuid        not null -> auth.users(id) on delete cascade
created_at  timestamptz not null default now()
updated_at  timestamptz not null default now()
index (user_id, date)
```

Retain current subject, paper code, date, and notes for the Phase 3 ownership cutover. Rename domain descriptions to “personal exam entries.” Never store official timetable rows here.

## Proposed RLS Model

For each user-owned table with a `user_id` column (`user_subjects`, `topic_progress`, `past_paper_attempts`, and personal `exam_dates`), use separate policies:

```sql
-- SELECT
TO authenticated
USING ((select auth.uid()) = user_id)

-- INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id)

-- UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id)

-- DELETE
TO authenticated
USING ((select auth.uid()) = user_id)
```

Policy and grant requirements:

- Enable RLS explicitly even if hosted tables currently have it enabled.
- Revoke all table and sequence privileges from `PUBLIC`, `anon`, and `authenticated` before granting back exact authenticated CRUD/sequence privileges.
- Grant no ordinary `anon` access to user-owned tables.
- Do not use `TO authenticated` without the ownership predicate.
- Ensure UPDATE also has SELECT policy visibility and both `USING`/`WITH CHECK`.
- Index `user_id` or lead composite keys with it.
- Never authorize from `raw_user_meta_data` or any client-supplied UUID.
- Service/owner connections, when unavoidable for administrative work, must have explicit owner predicates because they bypass RLS.

`profiles` and `tasks` retain their proven Phase 2 policies. Shared reference tables remain non-user-owned; their existing broad grant posture is a separate least-privilege hardening concern unless a Phase 3 slice must touch those grants for its own safe API path.

## Proposed Migration Sequence

All changes below must be new Drizzle migrations generated from current schema work. Applied migrations 0000–0003 are immutable.

### User Subjects

1. **PRE-MIGRATION CHECK:** journal exactly 0000–0003; `user_subjects` absent; count users/tasks/attempts; exactly one current version for every selected subject.
2. **SCHEMA CHANGE:** create table, composite/version constraints, indexes, timestamp trigger if used.
3. **BACKFILL / DATA HANDLING:** current live state requires none. If data changed, stop and present a user-by-subject candidate report; do not treat starter tasks as exhaustive enrollment without approval.
4. **CONSTRAINT HARDENING:** NOT NULL from creation; composite PK/FKs; validate version consistency.
5. **RLS ENABLEMENT:** four own-row policies.
6. **GRANTS:** explicit revoke baseline, then authenticated CRUD only.
7. **API CUTOVER:** replace onboarding function in a new migration so membership and starter tasks are atomic; add authenticated list/replace API.
8. **FRONTEND CUTOVER:** onboarding/settings/subjects/dashboard selectors use durable enrollment.
9. **LEGACY CLEANUP:** none.
10. **POST-MIGRATION VERIFICATION:** row/policy/grant/FK/index checks; retry/idempotency; two-user isolation.

### Topic Progress

1. **PRE-MIGRATION CHECK:** repeat legacy status/note aggregates and Auth-user count; record the one current unowned row if still present.
2. **SCHEMA CHANGE:** Migration A creates `topic_progress` only.
3. **BACKFILL / DATA HANDLING:** current recommendation is no backfill because no owner exists. Any cleanup requires explicit approval.
4. **CONSTRAINT HARDENING:** composite PK, FKs, status CHECK, NOT NULL/timestamps.
5. **RLS ENABLEMENT:** four own-row policies.
6. **GRANTS:** explicit least privilege.
7. **API CUTOVER:** merged reads; authenticated upsert/reset; canonical topics never updated.
8. **FRONTEND CUTOVER:** subject detail and aggregate progress use caller rows.
9. **LEGACY CLEANUP:** Migration B in a separate later slice removes shared fields only after verified cutover and approved handling of the legacy row.
10. **POST-MIGRATION VERIFICATION:** two users can hold different status/notes for one topic; reset deletes only caller row; canonical topic unchanged.

### Past Paper Attempts

1. **PRE-MIGRATION CHECK:** table count zero; schema/checks/journal unchanged; if nonzero, stop.
2. **SCHEMA CHANGE:** add `user_id`, paper year, Auth FK, checks, indexes.
3. **BACKFILL / DATA HANDLING:** none while empty. No arbitrary owner/year derivation if rows appear.
4. **CONSTRAINT HARDENING:** NOT NULL owner/year; preserve all existing identity and score checks.
5. **RLS ENABLEMENT:** four own-row policies.
6. **GRANTS:** replace broad legacy grants with exact authenticated CRUD/sequence access.
7. **API CUTOVER:** owner-safe CRUD and authenticated performance/aggregations.
8. **FRONTEND CUTOVER:** add year; filter enrolled subjects; expose actionable quarantine errors until cutover is live.
9. **LEGACY CLEANUP:** remove quarantine only after hosted policy verification.
10. **POST-MIGRATION VERIFICATION:** identity/label correctness, repeated-attempt support, A/B isolation, dashboard/progress isolation.

### Personal Exam Entries

1. **PRE-MIGRATION CHECK:** table count zero; confirm no official timetable data has been introduced.
2. **SCHEMA CHANGE:** add user/timestamps/index; update schema documentation to personal entries.
3. **BACKFILL / DATA HANDLING:** none while empty; block if unexplained rows appear.
4. **CONSTRAINT HARDENING:** NOT NULL owner; optional duplicate constraint only after product confirmation.
5. **RLS ENABLEMENT:** four own-row policies.
6. **GRANTS:** replace broad legacy grants with exact authenticated CRUD/sequence access.
7. **API CUTOVER:** owned list/create/update/delete; dashboard reads owned upcoming entries.
8. **FRONTEND CUTOVER:** add personal entry management and clear terminology.
9. **LEGACY CLEANUP:** remove quarantine only after isolation tests. Do not add an official timetable to this table.
10. **POST-MIGRATION VERIFICATION:** A/B calendar and dashboard isolation, date/order behavior, logout cache clearing.

## Proposed Phase 3 Implementation Slices

| Slice | Scope | Schema | Backend | Frontend | Tests | Migration risk / production impact | Stop / review gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 — Durable user subjects | Establish authoritative enrollment and version pin | New `user_subjects`; new migration replaces onboarding RPC | Authenticated list/replace; onboarding atomic insert | Onboarding, “My subjects,” settings and subject selectors | Unit validation, local integration, hosted A/B onboarding/membership | Low today because live user/activity counts are zero; changes onboarding transaction | Stop after schema/RLS/API/UI and two-user evidence; verify starter tasks + memberships agree |
| 2A — Topic progress additive + cutover | Separate caller progress from shared topics | New `topic_progress` only; legacy columns untouched | Merged read, upsert, reset; aggregate progress | Subject detail and progress/dashboard | Different progress for same topic; spoof/reset tests | Medium; one unowned legacy row; no backfill | Human approves no-backfill/cleanup plan before any legacy mutation |
| 2B — Topic legacy removal | Remove obsolete shared progress fields only after production proof | Separate new migration removes `status`/`notes` | Remove all fallback references | Remove legacy assumptions | Regression + hosted verification | Destructive and not reversible by simple code rollback | Separate PR and explicit approval; backup/verification required |
| 3 — Past-paper ownership and complete identity | Restore paper logging safely | Add owner, year, indexes/policies | Owned CRUD/performance/dashboard data | Add year and re-enable logging UX | CRUD/isolation/analytics/label checks | Low data risk while empty; medium contract surface | Repeat zero-row precheck; stop if any legacy row exists |
| 4 — Personal exam entries | Restore personal calendar data | Add owner/timestamps/index/policies | Owned CRUD and dashboard integration | Entry management and calendar | CRUD/isolation/calendar tests | Low data risk while empty; semantic decision now resolved | Confirm table still contains no official data; hosted A/B proof |
| 5 — Cross-feature contract/dashboard reconciliation | Remove remaining neutral/quarantine contract text and ensure enrollment-scoped aggregates | No bundled feature migration | Final dashboard/progress/subject-performance composition | Empty/loading/error/logout and selector consistency | Full integration/regression matrix | Medium application impact; no large DB migration | Generated diff review, full typecheck/tests, no owner-DB user query |
| Final — Hosted E2E and closeout | Prove production-equivalent isolation and document Phase 3 | Verification only | Production smoke and A/B API tests | Manual two-session UI | Hosted E2E + manual UI | Uses disposable users/data only under separate approval | Clean up approved test data, verify journal/counts, checkpoint and closeout |

Each schema-bearing slice is independently reviewable. No giant Phase 3 migration is recommended.

## Phase 3 Test Matrix

USER A and USER B must be independent real Supabase users for hosted E2E. Local integration tests should use an isolated local Supabase stack and must not mock away RLS.

| Feature / scenario | UNIT | INTEGRATION | HOSTED E2E | MANUAL UI |
| --- | :---: | :---: | :---: | :---: |
| Reject `userId`/`user_id` in all ownership inputs | ✓ | ✓ | ✓ |  |
| Unauthenticated user-subject/progress/paper/exam routes return 401 |  | ✓ | ✓ | ✓ |
| Onboarding persists exactly selected memberships and starter tasks atomically | ✓ | ✓ | ✓ | ✓ |
| Onboarding retry creates no duplicates | ✓ | ✓ | ✓ | ✓ |
| User A lists/creates/updates/deletes own memberships |  | ✓ | ✓ | ✓ |
| User A cannot read/update/delete User B memberships |  | ✓ | ✓ |  |
| Syllabus version must belong to selected subject | ✓ | ✓ | ✓ |  |
| A and B store different status/notes for the same topic |  | ✓ | ✓ | ✓ |
| A topic reset deletes only A's row; shared topic remains unchanged | ✓ | ✓ | ✓ | ✓ |
| Cross-user topic read/update/delete returns no row/404 |  | ✓ | ✓ |  |
| Past-paper own create/read/update/delete | ✓ | ✓ | ✓ | ✓ |
| Past-paper year/session/component/variant label is correct | ✓ | ✓ | ✓ | ✓ |
| Repeated attempts of one paper remain allowed | ✓ | ✓ | ✓ | ✓ |
| Cross-user paper read/update/delete is denied/404 |  | ✓ | ✓ |  |
| Paper subject/component mismatch is rejected | ✓ | ✓ | ✓ |  |
| Personal exam-entry own create/read/update/delete | ✓ | ✓ | ✓ | ✓ |
| Cross-user exam-entry read/update/delete is denied/404 |  | ✓ | ✓ |  |
| Dashboard returns only caller memberships/tasks/progress/papers/exams |  | ✓ | ✓ | ✓ |
| Progress/subject performance excludes the other user |  | ✓ | ✓ | ✓ |
| Spoofed foreign owner never changes stored ownership | ✓ | ✓ | ✓ |  |
| Logout clears protected queries and switching A -> B shows no cached A data | ✓ | ✓ | ✓ | ✓ |
| Empty new user sees no other user's data and no 500 |  | ✓ | ✓ | ✓ |
| Grants/policies/FKs/indexes/journal match expected state |  | ✓ | ✓ |  |

No destructive hosted E2E is authorized by this Stop 1 report. Hosted tests belong to the separately approved final verification gate and must use disposable users with reviewed cleanup.

## Out-of-Scope Items

Repository evidence supports keeping the following outside Phase 3:

- AI assistant, AI study planning, or focus-blocker features.
- New analytics/product telemetry integrations.
- Google/Outlook calendar integrations or official Cambridge timetable ingestion.
- UI redesign, new motion system, or unrelated accessibility/style refactors.
- New syllabus subjects or changes to the validated import dataset.
- Social/community features and new gamification mechanics.
- Notification-preference server persistence.
- Importer relationship-sync refactors and static catalogue retirement.
- Enabling Google OAuth or changing the Phase 2 Auth lifecycle.
- Broad Phase 4 API/ACL hardening unrelated to the user-owned objects touched by a Phase 3 slice.

## Blockers / Decisions Required

No issue blocks Slice 1.

Later gated decisions/actions:

1. Before Topic Progress legacy cleanup, explicitly approve clearing or otherwise preserving the single hosted `in_progress` shared topic. It has no possible Auth owner and must not be backfilled.
2. Immediately before Past Papers and Personal Exam Entries migrations, repeat row counts. Any nonzero row blocks direct NOT NULL owner migration and requires a reviewed attribution/cleanup plan.
3. Treat paper year as a required part of normalized paper identity. If product rejects that field, resolve the paper-identity requirement before Slice 3 rather than deriving it from attempt date.
4. Official Cambridge timetable support, if desired later, requires a separate shared model. It is not a blocker and must not be added to personal `exam_dates`.

## Final Stop 1 Verdict

**READY FOR PHASE 3 IMPLEMENTATION**

The baseline is correct; current ownership gaps and quarantines are identified; target tables, constraints, policies, API behavior, migration ordering, legacy-data risks, and the two-user verification strategy are defined. The exam-date ambiguity is resolved for the current product. No unresolved issue prevents Slice 1 from beginning.

Final safety verification:

- ✓ Current repository inspected
- ✓ Current database schema inspected
- ✓ Phase 2 baseline verified
- ✓ No implementation code modified
- ✓ No existing migrations modified
- ✓ No new migration created
- ✓ No database mutation performed
- ✓ No production data changed
- ✓ No users created or deleted
- ✓ No feature quarantine removed
- ✓ No secrets exposed
- ✓ Shared reference data distinguished from user data
- ✓ Legacy ownership risks documented
- ✓ Phase 3 migration order documented
- ✓ Two-user test strategy documented
- ✓ Only the Stop 1 report was created
