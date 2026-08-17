# Phase 3 Slice 1 — Durable User Subjects

## Executive Summary

Phase 3 Slice 1 now gives each authenticated student an authoritative, durable selection of 1–5 A-Level subjects. The new `user_subjects` table pins each membership to a consistent current syllabus version, applies owner-only RLS and explicit grants, and is populated in the same transaction as profile onboarding and starter tasks. Authenticated users can list or atomically replace their own selection through the API. Onboarding, My Subjects, Settings, and the study-plan subject selector now use the corrected product model.

All changes are confined to `phase3-s1-user-subjects`. Migration 0004 was applied and tested only against local loopback Supabase. No hosted migration, hosted data write, Vercel deployment, merge, or later Phase 3 slice was performed.

## Starting Git State

- Branch: `phase3-s1-user-subjects`
- Starting SHA: `0b7c41ddd799e11f2a494cfaf9d2d9adb75cd32f`
- `origin/phase3-multitenancy` SHA: `0b7c41ddd799e11f2a494cfaf9d2d9adb75cd32f`
- Merge-base: `0b7c41ddd799e11f2a494cfaf9d2d9adb75cd32f`
- Initial working tree: clean
- Report 35 initial state: absent

## Approved Product Correction — 1–5 Subjects

Human-approved product correction: Lockdin supports 1–5 selected A-Level subjects. The historical 1–3 implementation observed during Phase 2 and Phase 3 Stop 1 has been superseded.

Lockdin's approved subject-selection range is 1–5.
The previous 1–3 implementation has been replaced.
Historical reports remain preserved as records of the earlier implementation.

Active 1–3 assumptions were traced to migration 0002's onboarding RPC, Express onboarding validation, the OpenAPI `CompleteOnboardingInput`, generated clients/Zod, onboarding selection logic and tests, and onboarding copy/counters/disabled state. The new migration replaces—but does not edit—the historical function. All active contract, server, frontend, and test assumptions now enforce 1–5.

## Baseline Verification

The first sandboxed process launches were prevented by Windows IPC access denial before TypeScript/Vitest started. The exact commands were rerun with process permission and produced the code baseline below.

| Command | Result before modifications |
| --- | --- |
| `pnpm run typecheck` | PASS |
| `pnpm --filter @workspace/api-server test` | PASS — 9 files, 24 tests |
| `pnpm --filter @workspace/revision-platform test` | PASS — 8 files, 60 tests |
| `pnpm --filter @workspace/scripts test:unit` | PASS — 2 files, 16 tests |

## Previous Subject Selection Architecture

Before Slice 1 the path was `Auth signup -> profile trigger -> onboarding UI -> selected subject IDs -> profile onboarding API -> lockdin_complete_onboarding -> starter tasks`. There was no `user_subjects` table. Subject IDs existed only as transient RPC input; starter tasks were an onboarding side effect, not authoritative enrollment. Canonical `subjects`, syllabus versions, units, topics, outcomes, and components were and remain shared reference data.

This matched Report 34. The only architectural correction is the later human-approved 1–5 product range.

## User Subjects Schema

`public.user_subjects`:

| Column | Definition |
| --- | --- |
| `user_id` | `uuid NOT NULL` |
| `subject_id` | `integer NOT NULL` |
| `syllabus_version_id` | `integer NOT NULL` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` |

- Primary key: `(user_id, subject_id)`
- Auth FK: `user_id -> auth.users(id) ON DELETE CASCADE`
- Subject FK: `subject_id -> subjects(id) ON DELETE RESTRICT`
- Composite version FK: `(subject_id, syllabus_version_id) -> syllabus_versions(subject_id, id) ON DELETE RESTRICT`
- Reference-maintenance index: `(subject_id, syllabus_version_id)`
- Existing `lockdin_set_profiles_updated_at()` trigger function is safely reused; its generic body only assigns `NEW.updated_at`.
- The primary key supports owner listing/RLS lookup; no redundant user-only index was added.

## Referential Integrity

`syllabus_versions` now exposes a unique `(subject_id, id)` key. `user_subjects` references that pair as a composite FK, so a Physics membership cannot point to a Chemistry syllabus version. Local integration deliberately attempted a mismatched pair and PostgreSQL rejected it with `user_subjects_subject_version_fk` (`23503`). Independent subject and composite version constraints both use `RESTRICT` for shared reference deletion.

## Migration

- Number: `0004`
- Filename: `lib/db/migrations/0004_colossal_pixie.sql`
- Generated with: `pnpm --filter @workspace/db generate`
- Key changes: create `user_subjects`; add the supporting syllabus-version unique key; add Auth/reference/composite FKs and index; reuse the timestamp trigger; enable RLS; define four policies and explicit grants; add a serialized five-membership guard; add atomic replacement RPC; replace onboarding RPC with the 1–5 durable implementation.

Drizzle initially emitted the composite FK before its supporting unique constraint. The new migration was reviewed and reordered before application. Drizzle schema snapshots cover the declarative schema; Supabase-specific Auth FK, RLS, grants, triggers, and functions are intentionally hardened in the new SQL migration.

## RLS Policies

All policies target `authenticated` and derive ownership from `(select auth.uid())`:

- `user_subjects_select_own`: `USING auth.uid() = user_id`
- `user_subjects_insert_own`: `WITH CHECK auth.uid() = user_id`
- `user_subjects_update_own`: owner `USING` and owner `WITH CHECK`
- `user_subjects_delete_own`: owner `USING`

Email, username, metadata, route IDs, query IDs, and request-body owner IDs never authorize access.

## SQL Grants

All table privileges are revoked from `PUBLIC`, `anon`, and `authenticated`, then `SELECT`, `INSERT`, `UPDATE`, and `DELETE` are granted only to `authenticated`. The table has no sequence. RLS remains the independent row-ownership control. `PUBLIC` and `anon` receive no table access.

The onboarding and replacement RPCs revoke execution from `PUBLIC` and `anon`; only `authenticated` receives execute. Both functions are `SECURITY DEFINER`, use `SET search_path = ''`, accept no caller-controlled user UUID, and derive the caller from `auth.uid()`. Replacement requires definer rights because the shared subject/version tables intentionally have no authenticated Data API SELECT policies; this is an atomic/security requirement, not convenience.

## Updated Onboarding Architecture

The updated path is `Auth signup -> profile trigger -> onboarding UI -> authenticated profile API -> lockdin_complete_onboarding -> profile + user_subjects + starter tasks` in one transaction.

The function validates the existing profile fields, rejects unauthenticated calls, rejects duplicates rather than canonicalizing them, enforces 1–5, verifies every subject, requires exactly one current syllabus version for every selection, locks the profile, completes the profile, inserts version-pinned memberships, and creates one starter task per selection. Any failure rolls back every effect.

The Phase 2 retry contract is preserved: a completed profile with the same normalized username returns idempotently before any writes. Local tests proved membership and starter-task counts do not increase on retry.

## Subject Limit Enforcement

| Case | Frontend | API | Database/RPC |
| --- | --- | --- | --- |
| 0 | REJECT | REJECT | REJECT |
| 1 | ACCEPT | ACCEPT | ACCEPT |
| 2 | ACCEPT | ACCEPT | ACCEPT |
| 3 | ACCEPT | ACCEPT | ACCEPT |
| 4 | ACCEPT | ACCEPT | ACCEPT |
| 5 | ACCEPT; maximum feedback | ACCEPT | ACCEPT |
| 6 | selection prevented / validation rejects | REJECT | REJECT |
| Duplicate IDs | validation rejects | REJECT | REJECT |
| Invalid/nonexistent subject | UI only produces catalogue IDs | malformed rejects; nonexistent reaches trusted RPC and returns 400 | REJECT; no partial state |

Trusted onboarding/replacement paths enforce the lower bound transactionally. A serialized trigger prevents any direct authenticated insert from creating a sixth row. Direct owner DELETE remains allowed by the reviewed RLS contract; a later trusted replacement must still contain at least one selection.

## Membership API

- `GET /api/user-subjects`: Bearer-authenticated; returns only the caller's membership rows enriched with neutral shared `Subject` display data, current pinned version summary, and membership timestamps.
- `PUT /api/user-subjects`: Bearer-authenticated; accepts only `{ subjectIds }`, independently enforces 1–5 distinct positive integers, and calls `lockdin_replace_user_subjects`.
- Replacement locks the caller's profile, validates an unambiguous current version for every subject, removes only obsolete membership rows, upserts retained/new memberships, and returns the final set atomically.
- Replacement does not delete starter tasks or any existing/future owned activity.
- `userId`, `user_id`, `ownerId`, and `owner_id` inputs are rejected.
- Unauthenticated requests return 401.

## OpenAPI / Generated Contracts

`lib/api-spec/openapi.yaml` remains the source of truth. `CompleteOnboardingInput.subjectIds` and the new `UserSubjectSelectionInput.subjectIds` both specify `minItems: 1`, `maxItems: 5`, and `uniqueItems: true`. The source documents Bearer security, both membership operations, membership/version response schemas, and the absence of a user-owned ID input.

`pnpm --filter @workspace/api-spec codegen` completed successfully once. Generated Zod schemas, TypeScript schemas, React Query list/mutation hooks, and the protected `/api/user-subjects` query key were reviewed. Orval represents the 1/5 cardinality in generated validation; duplicate rejection remains independently enforced by Express and SQL because Orval's generated Zod array does not emit `uniqueItems` refinement.

## Frontend Changes

- Onboarding: copy, counter, selection ceiling, disabled sixth choice, max feedback, accessibility state, validation, and tests now support 1–5. Successful onboarding still invalidates query state before navigation.
- My Subjects: now reads `useListCurrentUserSubjects`; it no longer labels the entire shared catalogue as personal enrollment.
- Settings: retains the current visual system while adding loading/error/retry states, accessible selected controls, 1/5 counter, maximum feedback, save-in-progress protection, and atomic replacement. Failed saves preserve the previous server state.
- Relevant selector: Study Plan now offers enrolled subjects when the field means “choose one of my subjects.”
- Shared catalogue browsing and canonical subject detail remain accessible; membership is not an ACL for shared Cambridge content.
- Dashboard and past-paper catalogue reconciliation remain explicitly deferred to their later ownership/progress slices.

The Impeccable detector was run once over the four touched page targets. It reported only four incumbent `border-b-2` tab warnings in Study Plan, outside the changed selector lines; no unrelated visual rewrite was made.

## Query Cache / Session Isolation

Membership uses its own protected key (`/api/user-subjects`), separate from the shared catalogue (`/api/subjects`). Settings writes the final response into the membership key. The existing AuthProvider clears React Query state on logout/authenticated-user changes and invalidates queries after onboarding, preventing User A membership data from surviving into User B's session.

## Local Migration Verification

Target was resolved before mutation as PostgreSQL loopback `127.0.0.1:54322`; no credential values are recorded here. Docker/Supabase were started from the existing local backup without reset. Nonessential unhealthy Studio/Storage services were excluded; database, Auth, REST, and gateway were healthy.

The first Drizzle attempt used the local `postgres` role and rolled back because existing tables are owned by local `supabase_admin`. A diagnostic transaction always rolled back and exposed that owner mismatch. The supported Drizzle command was then rerun against the same proven loopback target as the table-owner role and passed.

Post-migration verification proved:

- migration journal rows: 5, with new migration hash `aad782a7d12b35ed32dd85f15c1670c7d39b9e25c9213d304079d371169b728f`;
- exact five columns and two expected indexes;
- composite PK, Auth FK, subject FK, and composite subject/version FK;
- RLS enabled with four owner policies;
- authenticated CRUD grants only;
- both RPCs are definer functions with empty search path;
- disposable test users/memberships cleaned back to zero.

The validated nine-file syllabus import was run only against loopback to provide the required six-subject boundary fixture. It produced nine current versions without modifying any CSV file.

## Local Two-User Isolation

PASS. Real local Supabase Auth users and JWTs were used.

- USER A and USER B listed only their own memberships through the API and direct Data API.
- USER A and USER B cross-user UPDATE/DELETE attempts returned no rows.
- USER A's attempt to insert a USER B-owned row was denied.
- Own direct INSERT, UPDATE, and DELETE were allowed under RLS.
- USER A's atomic replacement to five memberships did not change USER B's one membership and did not delete A's historical starter tasks.
- A direct sixth insert was rejected by `user_subject_limit_exceeded`.
- Spoofed ownership fields were rejected by the API.

## Phase 2 Regression Results

The existing auth/provider, protected-route, password-recovery, profile, task CRUD/ownership, quarantine, dashboard-empty, and two-user task integration suites remain green. No destructive hosted Phase 2 E2E was run.

## Typecheck / Tests / Build

| Check | Result |
| --- | --- |
| `pnpm run typecheck` | PASS |
| `pnpm --filter @workspace/api-server test` | PASS — 10 files, 37 tests |
| `pnpm --filter @workspace/revision-platform test` | PASS — 8 files, 61 tests |
| `pnpm --filter @workspace/scripts test` with loopback DB | PASS — 3 files, 19 tests |
| `pnpm --filter @workspace/api-server test:integration` | PASS — loopback guard 11/11; integration 23/23 |
| `pnpm --filter @workspace/api-server build` | PASS |
| `PORT=3000 BASE_PATH=/ pnpm --filter @workspace/revision-platform build` | PASS |
| `git diff --check` | PASS |

The final integration run explicitly accepted 1, 2, 3, 4, and 5 subjects on independent disposable users.

## Hosted Read-Only Preflight

### VERIFIED LIVE READ-ONLY

An explicitly `BEGIN READ ONLY` hosted transaction was rolled back. It verified:

- `auth.users = 0`
- `profiles = 0`
- `tasks = 0`
- `public.user_subjects` absent
- `syllabus_versions = 9`
- current syllabus versions `= 9`
- hosted Drizzle journal contains exactly migrations 0000–0003 with the previously recorded canonical hashes

### NOT independently verifiable

- Hosted post-migration shape/function behavior is not verifiable because migration 0004 was intentionally not applied.
- A hosted deployment/build runtime was not exercised because Vercel deployment is outside this slice.

## Hosted Cutover Status

NOT APPLIED TO HOSTED SUPABASE

NO VERCEL DEPLOYMENT PERFORMED

## Files Changed

- `artifacts/api-server/scripts/require-local-supabase.mjs`
- `artifacts/api-server/src/lib/catalogue-subject.ts`
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/api-server/src/routes/profile.integration.test.ts`
- `artifacts/api-server/src/routes/profile.ts`
- `artifacts/api-server/src/routes/subjects.ts`
- `artifacts/api-server/src/routes/tasks.integration.test.ts`
- `artifacts/api-server/src/routes/user-subjects.auth.test.ts`
- `artifacts/api-server/src/routes/user-subjects.ts`
- `artifacts/revision-platform/src/lib/onboarding-logic.test.ts`
- `artifacts/revision-platform/src/lib/onboarding-logic.ts`
- `artifacts/revision-platform/src/pages/auth-pages.test.ts`
- `artifacts/revision-platform/src/pages/onboarding.tsx`
- `artifacts/revision-platform/src/pages/settings.tsx`
- `artifacts/revision-platform/src/pages/study-plan.tsx`
- `artifacts/revision-platform/src/pages/subjects.tsx`
- `lib/api-client-react/src/generated/api.schemas.ts`
- `lib/api-client-react/src/generated/api.ts`
- `lib/api-client-react/src/index.ts`
- `lib/api-spec/openapi.yaml`
- `lib/api-zod/src/generated/api.ts`
- `lib/api-zod/src/generated/types/completeOnboardingInput.ts`
- `lib/api-zod/src/generated/types/index.ts`
- `lib/api-zod/src/generated/types/userSubjectMembership.ts`
- `lib/api-zod/src/generated/types/userSubjectSelectionInput.ts`
- `lib/api-zod/src/generated/types/userSubjectSyllabusVersion.ts`
- `lib/db/migrations/0004_colossal_pixie.sql`
- `lib/db/migrations/meta/0004_snapshot.json`
- `lib/db/migrations/meta/_journal.json`
- `lib/db/src/schema/index.ts`
- `lib/db/src/schema/syllabusVersions.ts`
- `lib/db/src/schema/userSubjects.ts`
- `docs/cursor/reports/35-phase3-slice1-durable-user-subjects.md`

## Deferred Phase 3 Work

- Per-user topic progress and dashboard/progress reconciliation
- Past-paper attempt ownership and per-user performance
- Personal exam-entry/date ownership
- Final dashboard analytics across those later owned datasets
- Hosted migration/cutover, hosted two-user E2E, and Vercel deployment under a separate reviewed prompt

## Remaining Risks

- Hosted migration execution remains deliberately untested until reviewed cutover.
- Shared-table current-version ambiguity is rejected safely; operational tooling must continue maintaining exactly one current version per enrollable subject.
- Direct authenticated owner DELETE can temporarily leave zero memberships, while all product write paths enforce 1–5. This is an intentional consequence of the required owner DELETE RLS semantics and should be reconsidered if raw Data API writes are later removed.
- Some later-slice pages still use the full shared catalogue and neutral metrics by design; they must not be mistaken for completed per-user analytics.

## Slice 1 Verdict

SLICE 1 LOCAL IMPLEMENTATION READY FOR REVIEW
