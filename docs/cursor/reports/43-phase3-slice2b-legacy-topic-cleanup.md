# Phase 3 Slice 2B — Legacy Topic-Progress Column Removal

## Executive Summary

Slice 2B drops the deprecated shared progress columns
`syllabus_topics.status` and `syllabus_topics.notes`, completing the Topic
Progress legacy-cleanup item from Report 34 after Slice 2A's `topic_progress`
cutover.

A fresh repository scan confirmed no live application path still reads or
writes those columns. Migration `0007_eager_squadron_supreme` is additive in
scope only by removal of those two columns — nothing else. It was generated
from the updated Drizzle schema, applied and tested only against local
loopback Supabase. No hosted connection, merge, or Production change was
performed.

The Implementation Owner's document-then-discard decision for the hosted
orphaned row (`id=1`, `status='in_progress'`, `notes=NULL` per Reports 34/40)
is recorded in the migration header. The migration does not special-case that
row; `DROP COLUMN` removes those values as the ordinary consequence of the
column drop.

## Starting Git State

- Working branch: `phase3-s2b-legacy-topic-cleanup`
- Branched from `origin/phase3-multitenancy` at
  `9a4df7ddb38785c660214d4f116efdf17728d87a`
- Journal at start: exactly `0000`–`0006`, last tag
  `0006_slippery_squirrel_girl`
- An empty remote pointer `origin/phase3-s2b-topic-legacy-removal` already
  existed at the same SHA with zero commits/diff; per Owner direction this
  task proceeded on the requested branch name and left that empty remote
  alone
- Report 43 was absent (next free number after 42)

## Section 7 Re-verification

PASS — clean for live read/write dependencies.

| Area | Finding |
| --- | --- |
| `syllabusTopicsTable.status` / `.notes` field refs in `artifacts/`, `lib/`, `scripts/` | None (except schema definition before this change) |
| API selects | `progress.ts`, `enrich-task.ts`, `user-subjects.ts`, and topic-progress tests select only `id` / `title` / `subjectId` (or reconstruct response fields) |
| `subjects.ts` syllabus GET | Reconstructs topic objects field-by-field; does **not** spread the raw DB row — cannot leak legacy columns even before drop |
| Catalogue list/detail | `select()` used only for topic counts via `catalogueEnrichment`; no status/notes exposure |
| OpenAPI `SyllabusTopic.status` / `.notes` | Correct Slice 2A merged `topic_progress` response shape — retained |
| Importer `db-upsert.ts` | Never wrote status/notes; comments updated |
| One-off `cleanup-placeholder-syllabus.ts` | Still selected status/notes for a historical safety check — updated to `id`/`title` only |
| Integration tests | One Slice 2A assertion still keyed on shared status/notes existence — updated to assert columns absent |

No stop condition was triggered by a live dependency on the legacy columns.

## Orphaned Hosted Row (Historical Record)

From Reports 34 and 40 (no new hosted SQL session in this task):

| Field | Last known value |
| --- | --- |
| `id` | `1` |
| `status` | `in_progress` |
| `notes` | `NULL` |

Decision: document-then-discard. This migration records those values in its
header comment and removes them only via ordinary `DROP COLUMN`, with no
`WHERE id = 1` branch and no separate cleanup statement.

Local pre-migrate aggregate (loopback): 520 topics, all `not_started`, zero
notes — no local orphaned non-default row.

## What Was Removed

- Columns: `public.syllabus_topics.status`, `public.syllabus_topics.notes`
- Drizzle fields and obsolete schema doc comment in `syllabusTopics.ts`
- Dead references in the one-off placeholder cleanup script
- Obsolete comments in `db-upsert.ts`, `subjects.ts`, `dashboard.ts`, and
  OpenAPI descriptions (regenerated Zod/React Query description text only)

## What Was Explicitly Untouched

- `topic_progress` table, RLS, grants, and both SECURITY DEFINER RPCs
- `user_subjects` and all other tables
- Migrations `0000`–`0006`
- Frontend pages (no functional dependency remained)
- No new endpoint or write path

## Migration

- Number: `0007`
- Filename: `lib/db/migrations/0007_eager_squadron_supreme.sql`
- Generated via `pnpm --filter @workspace/db generate` after schema change
- Body (only):

```sql
ALTER TABLE "syllabus_topics" DROP COLUMN "status";
ALTER TABLE "syllabus_topics" DROP COLUMN "notes";
```

- Journal: exactly `0000`–`0007` after apply
- Snapshot 0007 chains from Snapshot 0006; `syllabus_topics` columns are
  `id`, `unit_id`, `subject_id`, `title`, `order_index`
- Applied only to proven loopback PostgreSQL at `127.0.0.1:54322`

## Test Evidence

| Check | Result |
| --- | --- |
| `pnpm exec tsc -b` | PASS |
| `pnpm --filter @workspace/api-server test` | PASS — 12 files, 49 tests |
| `pnpm --filter @workspace/revision-platform test` | PASS — 8 files, 61 tests |
| `pnpm --filter @workspace/scripts test` | PASS — 3 files, 19 tests |
| `pnpm --filter @workspace/api-server test:integration` | PASS — loopback guard 11/11; integration 28/28 |
| API production build | PASS |
| Frontend production build | PASS |
| `git diff --check` | PASS |

Integration coverage now asserts `information_schema` has no
`syllabus_topics.status` / `.notes` columns, and Slice 1/2A suites still pass
with the columns removed (including journal count expectation updated to 8).

## Remaining Work (Not This Slice)

1. **Hosted cutover** for Migration `0007` — separate gated sequence
   (authorized hosted pre-read → migrate → Preview verification → cleanup /
   merge clearance). A fresh hosted read of the orphaned row before apply is
   warranted at that gate if the Owner wants current-state confirmation beyond
   Reports 34/40.
2. Merge into `phase3-multitenancy` / `main` remains a separate clearance step.
3. Slice 3/4 work is out of scope.

This closes out Report 34's Topic Progress legacy-cleanup item at the
implementation layer. Hosted application of `0007` is the remaining
operational gate.

## Safety Verification Checklist

- [x] Repository re-scanned; no live dependency on legacy columns
- [x] Git baseline: branched from current `origin/phase3-multitenancy`
- [x] Journal started at `0006_slippery_squirrel_girl`
- [x] Only migration `0007` added; `0000`–`0006` not edited
- [x] Migration drops only `status` and `notes` on `syllabus_topics`
- [x] No special-case SQL for orphaned row `id=1`
- [x] Orphaned-row values recorded from Reports 34/40 historical evidence
- [x] No hosted Supabase connection, query, or mutation
- [x] Local migrate confirmed loopback (`127.0.0.1`)
- [x] `topic_progress` RLS/grants/RPCs unchanged after migrate
- [x] Existing Slice 1/2A tests still pass
- [x] No merge into `phase3-multitenancy` or `main`
- [x] No Slice 3/4 work begun
