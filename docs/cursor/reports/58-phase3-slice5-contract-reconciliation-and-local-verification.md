# Phase 3 Slice 5 Contract Reconciliation and Local Verification

## Git

- Branch: `phase3-s5-contract-reconciliation`
- Base: `b9b3ed2c93a41e4318f6ddd6c29295183e64e0d2`
- Backend/OpenAPI/generated commit: `2a832e005075e23e8312c6246882a0f3f9814971`
- Frontend/storage/cache commit: `b1b1dee1fcbcd2284b6916f16c5c79e54974941e`

## Database and remote safety

- Database migration created: no
- Migration chain: exactly `0000–0009`; no Migration 0010
- Schema, RLS, grants, and migration journal changed: no
- Hosted Supabase used or changed: no
- Local Supabase: started only for guarded loopback integration tests, then stopped
- Vercel changed: no
- Production changed: no
- `main` changed: no
- `phase3-multitenancy` changed: no
- Merge performed: no

## Backend reconciliation

- Extracted the existing membership/topic aggregation into `user-subject-progress.ts` and reused it from Progress and Dashboard without changing the percentage formula.
- Dashboard now returns only current memberships in `subjectProgressSummary`, uses caller-owned topic progress, and reads `profiles.full_name` with the approved null fallback.
- Membership subjects now contain only `id`, `name`, `code`, `color`, and `topicsTotal` shared metadata.
- Task POST and PATCH reject `userId`, `user_id`, `ownerId`, and `owner_id` before payload parsing.
- Supabase errors now provide route-specific nondisclosing not-found messages; `22P02` maps to `400 Invalid request`; unexpected errors remain generic 500s.
- Removed `feature-quarantine.ts` after repository search confirmed no live import.

## OpenAPI and generated contracts

- Corrected stale syllabus/progress, shared catalogue, bearer-auth, and Dashboard wording.
- Added `SubjectReference` and assigned it to `UserSubjectMembership.subject`.
- Documented runtime 400 responses and all ownership aliases.
- Annotated calendar dates as `date` and timestamps as `date-time` only where runtime values match.
- Pinned generated Zod output to the installed Zod 3 runtime and retained API dates as validated ISO strings rather than transforming payloads into `Date` objects.
- `@workspace/api-spec` codegen: pass.
- Deterministic second run: pass.
- Generated diff hash on both final runs: `7cca8c4314b2e20c4507a31b429dfd470a0018bc`.
- Generated `SubjectReference` hash on both final runs: `5b42bbaaeb72f642c1eb94866eef1985a2de3812`.
- Generated changes are fully explained by the OpenAPI and generator compatibility changes; unexpected churn: none.

## Frontend reconciliation

- Dashboard composes current memberships with Dashboard progress and caller-owned recent performance; global catalogue placeholders are no longer used as personal metrics.
- Dashboard labels topic completion as `Syllabus progress`, shows no fake completed-topic count, and uses a neutral workspace CTA when no real attention item exists.
- My Subjects composes memberships, Progress overview, open tasks, caller-owned attempts, and caller-aware syllabus queries for completed/total topics.
- Subject Detail header uses `pendingTasks.length` and `performance.latestScore`.
- Past Papers selectors use current memberships only, preserve `All` caller history, handle loading/no-membership/removal states, and submit raw `YYYY-MM-DD` dates.
- Removed `selected-subjects.ts` after repository search confirmed no remaining live consumer.

## Storage and invalidation

- Added deterministic `<base-key>:<user-id>` storage keys for streak, achievements, and reminder suppression.
- Gamification A → B → A isolation is covered without changing formulas or thresholds.
- Reminder Runner performs a fresh initial evaluation after an account switch and preserves the 15-minute interval.
- AuthProvider removes all six ambiguous unscoped legacy keys and preserves user-qualified keys while retaining `queryClient.clear()` on identity change/sign-out.
- Task create/update/delete invalidate the Task prefix, Dashboard summary, and Progress overview.
- Membership replacement writes the authoritative membership response, then invalidates Dashboard and Progress.

## Tests and validation

- Workspace typecheck: pass
- API unit: 62/62 pass across 15 files
- Frontend unit: 88/88 pass across 19 files
- Integration safety guard: 11/11 pass; hosted URLs rejected
- API integration: 41/41 pass across 5 files
- API production build: pass
- Frontend production build: pass
- `git diff --check`: pass
- Migration audit: pass (`0000–0009`, no 0010)
- Secret/env/temp artifact audit: pass
- Scope audit against the exact base: pass

The frontend build emitted non-fatal existing Vite base/sourcemap warnings; it completed successfully after transforming 3,272 modules.

## Next gate

Owner QA review. No Preview deployment, QA users, hosted E2E, human QA, merge, Production deployment, or Phase 3 closeout has been started.
