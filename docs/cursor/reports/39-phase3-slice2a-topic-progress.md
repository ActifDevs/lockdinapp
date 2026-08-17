# Phase 3 Slice 2A — Topic Progress (Additive + Cutover)

## Executive Summary

Slice 2A introduces user-owned `topic_progress`, cuts authenticated syllabus
progress reads/writes over to that table, and leaves shared
`syllabus_topics.status` / `.notes` physically untouched for later Slice 2B.
Writes use trusted `SECURITY DEFINER` RPCs (Option B). All work is confined to
`phase3-s2-topic-progress`. Migration 0006 was applied and tested only against
local loopback Supabase. No hosted migration, hosted query, merge, or Slice 2B
cleanup was performed.

## Starting Git State

- Branch: `phase3-s2-topic-progress`
- Starting SHA (also `origin/phase3-multitenancy` and
  `origin/phase3-s2-topic-progress`):
  `206279a10b98be96507267418f29612e40f18749`
- Confirmed both remotes were at the same commit before work began
- Repository migration journal at start: `0000`–`0005`, last tag
  `0005_restrict_user_subject_writes`
- Report 39 initial state: absent (next free number after 38)

## Baseline Inspection

Re-verified against current repository state before implementation:

| Area | Finding |
| --- | --- |
| `syllabusTopics.ts` | Shared topics still carry legacy `status`/`notes` |
| `userSubjects.ts` + `0004`/`0005` | Pattern reference for ownership PK, Auth FK in SQL, revoke/grant, Option B write hardening |
| `syllabus.ts` | Hard-quarantined PATCH → 503 |
| `subjects.ts` syllabus GET | Neutralised `not_started` / `notes: null` |
| `progress.ts` | `syllabusProgress: 0` / `overallSyllabusProgress = 0` |
| `enrich-task.ts` / `dashboard.ts` | Task enrichment uses topic titles only; dashboard still uses neutral syllabus placeholders (left untouched; flagged below) |
| Frontend subject-detail / progress | Status controls called quarantined PATCH; progress page rendered overview zeros |
| OpenAPI | PATCH marked deprecated 503; no reset DELETE |

No prompt/repository discrepancy required stopping. Reset-to-default behavior was
confirmed in Report 34: default status + empty note **deletes** the caller row.

## Write-Path Decision — Option B

**Chosen: Option B** — authenticated table access is `SELECT` only; writes go
through `lockdin_upsert_topic_progress` and `lockdin_reset_topic_progress`.

Why:

- Slice 1 initially shipped open owner INSERT/UPDATE/DELETE policies, then
  Migration 0005 had to remove them after security review found direct Data API
  writes could bypass validated application paths.
- Topic progress has the same exposure pattern (authenticated Supabase client +
  Data API). Keeping direct writes open would recreate that second mutation
  boundary.
- RPCs derive `v_uid := auth.uid()`, validate topic existence and status/notes,
  and never accept a caller-supplied user id.

Option A (open owner CRUD policies with API-only validation) was rejected as
the default because it is strictly weaker than the corrected Slice 1 posture
without a compensating product requirement for direct client writes.

## Schema

`public.topic_progress`:

| Column | Definition |
| --- | --- |
| `user_id` | `uuid NOT NULL` → `auth.users(id) ON DELETE CASCADE` |
| `topic_id` | `integer NOT NULL` → `syllabus_topics(id) ON DELETE CASCADE` |
| `status` | `text NOT NULL DEFAULT 'not_started'` with CHECK enum |
| `notes` | `text NULL` with CHECK `char_length <= 2000` |
| `created_at` / `updated_at` | `timestamptz NOT NULL DEFAULT now()` |

- Primary key: `(user_id, topic_id)`
- Index: `topic_progress_topic_id_idx`
- Trigger: reuses `lockdin_set_profiles_updated_at()`
- RLS: `topic_progress_select_own` only
- Grants: revoke all from `PUBLIC`/`anon`/`authenticated`, then `SELECT` to
  `authenticated` only
- Absence of a row = default `not_started` / no note (no pre-population)
- Upsert of `not_started` + empty/null note deletes the row
- Explicit DELETE RPC also deletes only the caller's row

## Migration

- Number: `0006`
- Filename: `lib/db/migrations/0006_slippery_squirrel_girl.sql`
- Generated from Drizzle schema, then hardened with Auth FK, RLS, grants,
  trigger, notes-length check, and SECURITY DEFINER RPCs
- **Does not alter `syllabus_topics` in any way** (no ALTER, no backfill, no
  legacy column touch)
- Applied only to proven loopback PostgreSQL at `127.0.0.1:54322`

Local pre-apply note: the working local DB journal was behind the branch
(`0000`–`0002` only) and contained two orphan `tasks` rows with null `user_id`
blocking `0003`. Those local-only orphans were deleted, then migrations
`0003`–`0006` were applied on loopback. Syllabus CSVs were imported to restore
catalogue fixtures. No hosted connection was used.

## API Cutover

- `PATCH /api/syllabus-topics/:topicId` — authenticated upsert via RPC; rejects
  ownership fields; maps missing topic to 404; reset-to-default returns
  `{ status: not_started, notes: null }`
- `DELETE /api/syllabus-topics/:topicId` — authenticated explicit reset via RPC
- `GET /api/subjects/:subjectId/syllabus` — optional auth; merges caller
  `topic_progress` when Bearer is valid; unauthenticated callers still get
  structure with defaults; invalid Bearer → 401
- `GET /api/progress/overview` — enrolled subjects only; real completion % from
  caller progress vs topic counts

OpenAPI updated first; Zod and React Query client regenerated. Generated diff
was confined to syllabus/topic-progress/progress description surfaces.

## Frontend Cutover

- `subject-detail.tsx`: existing status controls now hit the real PATCH path;
  syllabus % is derived from merged syllabus topic statuses; invalidates
  syllabus, subject, and progress-overview queries after mutation
- `progress.tsx`: unchanged UI; consumes real overview aggregates end to end

No redesign. Notes remain display-only where the existing UI already showed
them; status cycling is the write surface already present.

## Explicitly Untouched

- Shared `syllabus_topics.status` / `.notes` columns (schema and data)
- The hosted orphaned `in_progress` legacy row decision (out of scope; no hosted
  query performed)
- `past_paper_attempts` / `exam_dates` quarantine (Slices 3/4)
- `user_subjects` RLS/RPC contracts from Slice 1 (read-only use for enrollment
  scoping in progress overview)
- Migrations `0000`–`0005`
- Dashboard `subjectProgressSummary` still returns syllabus placeholders of `0`
  — flagged for a follow-up if product wants dashboard rings to match progress
  overview in the same slice family

## Test Evidence

| Check | Result |
| --- | --- |
| `pnpm run typecheck` | PASS |
| `pnpm --filter @workspace/api-server test` | PASS — 12 files, 49 tests |
| `pnpm --filter @workspace/revision-platform test` | PASS — 8 files, 61 tests |
| `pnpm --filter @workspace/api-server test:integration` | PASS — loopback guard 11/11; integration 28/28 |
| Two-user topic progress isolation | PASS |
| `pnpm --filter @workspace/api-server build` | PASS |
| `PORT=3000 BASE_PATH=/ pnpm --filter @workspace/revision-platform build` | PASS |
| `pnpm --filter @workspace/db generate` | No schema changes |
| `git diff --check` | PASS |

Two-user isolation covered:

- A and B store different status/notes for the same `topic_id`
- A reset deletes only A's row; shared topic row unchanged; B unchanged
- Direct Data API write as A attempting B's `user_id` denied
- Merged syllabus GET defaults missing rows correctly
- Spoofed nonexistent `topic_id` → 404
- Progress overview reflects caller completion differences

## Remaining Work (Not This Slice)

1. **Slice 2B** — remove legacy `syllabus_topics.status` / `.notes` after
   verified cutover and explicit approval for the orphaned legacy row.
2. **Orphaned legacy row decision** — human approval only; no backfill.
3. **Hosted cutover** — separate gated sequence (hosted migrate → Preview E2E →
   cleanup → merge clearance).
4. Optional follow-up: dashboard syllabus placeholders still zero.

## Safety Verification Checklist

- [x] Repository inspected against authoritative reports before coding
- [x] Git baseline: `phase3-s2-topic-progress` matched `phase3-multitenancy`
- [x] Journal file started at `0005_restrict_user_subject_writes`
- [x] Only migration `0006` added; `0000`–`0005` not edited
- [x] Migration does not touch `syllabus_topics` schema or data
- [x] No backfill performed
- [x] No hosted Supabase connection, query, or mutation
- [x] Local migrate/import targets confirmed loopback (`127.0.0.1`)
- [x] Option B write path documented and enforced
- [x] Two-user isolation verified with real local Auth JWTs
- [x] No merge into `phase3-multitenancy` or `main`
- [x] No Slice 2B cleanup begun
