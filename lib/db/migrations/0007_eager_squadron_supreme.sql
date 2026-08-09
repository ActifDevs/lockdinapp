-- Phase 3 Slice 2B: drop deprecated shared progress columns from syllabus_topics.
-- Superseded by topic_progress (Slice 2A / Migration 0006). Does not touch
-- topic_progress, RLS, grants, RPCs, or any other table.
--
-- Document-then-discard (Implementation Owner decision): Reports 34/40 recorded
-- one hosted orphaned non-default row with no Auth owner —
--   id=1, status='in_progress', notes=NULL
-- — among otherwise all-default rows. This migration does not special-case that
-- row; DROP COLUMN removes those values along with every other row's legacy
-- status/notes as the ordinary consequence of the column drop.

ALTER TABLE "syllabus_topics" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "syllabus_topics" DROP COLUMN "notes";
