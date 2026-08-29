-- ============================================================================
-- HISTORICAL PRE-0000 BOOTSTRAP
-- ============================================================================
--
-- LOCAL / DISPOSABLE TEST USE ONLY
-- NOT A MIGRATION
-- NOT FOR HOSTED / PRODUCTION APPLICATION
--
-- This artifact reconstructs the exact schema state that existed immediately
-- BEFORE migration 0000_syllabus_reference_and_paper_attempts.sql was applied.
--
-- Provenance:
-- - Reconstructed from commit f271bef (Initial commit: A-Level Revision Platform)
-- - Verified against historical TypeScript schema definitions
-- - Cross-referenced with migration 0000 assumptions
-- - Consistent with Phase 2 pre-migration audit evidence
--
-- Purpose:
-- - Establishes only the prerequisite state expected by migration 0000
-- - Enables clean reconstruction of the full migration chain (0000–0009)
-- - Supports disposable local DB integration testing
--
-- Ongoing schema authority:
-- - Committed Drizzle migrations (lib/db/migrations/0000–0009.sql) remain
--   the authoritative application schema history
-- - This bootstrap is historical test infrastructure only
-- - Do NOT add to Drizzle journal (meta/_journal.json)
-- - Do NOT generate Drizzle snapshot for this file
--
-- ============================================================================
-- CRITICAL HISTORICAL DIFFERENCES FROM CURRENT SCHEMA
-- ============================================================================
--
-- syllabus_units:
--   - NO syllabus_version_id column (added by migration 0000)
--
-- syllabus_topics:
--   - HAS legacy status column (enum: not_started, in_progress, completed)
--   - HAS legacy notes column (text, nullable)
--   - These were removed by migration 0007_eager_squadron_supreme.sql
--
-- tasks:
--   - NO user_id column (added by migration 0001)
--   - No FK to auth.users
--
-- past_papers:
--   - Original table name (renamed to past_paper_attempts by migration 0000)
--   - HAS paper_code column (dropped by migration 0000)
--   - NO component_id, variant, year columns (added by migration 0000/0008)
--   - NO user_id column (added by migration 0008)
--
-- subjects:
--   - NO unique constraint on code (added by migration 0000)
--
-- ============================================================================

-- ============================================================================
-- subjects
-- ============================================================================
-- Provenance: lib/db/src/schema/subjects.ts at commit f271bef
-- Columns: id (serial PK), name (text not null), code (text not null), color (text not null)
-- Constraints: NO unique constraint on code (added by migration 0000)
-- ============================================================================
CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"color" text NOT NULL
);

-- ============================================================================
-- syllabus_units
-- ============================================================================
-- Provenance: lib/db/src/schema/syllabusUnits.ts at commit f271bef
-- Columns: id (serial PK), subject_id (integer FK to subjects), title (text not null),
--          order_index (integer not null default 0)
-- Differences: NO syllabus_version_id column (added by migration 0000)
-- ============================================================================
CREATE TABLE "syllabus_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_id" integer NOT NULL,
	"title" text NOT NULL,
	"order_index" integer NOT NULL DEFAULT 0,
	CONSTRAINT "syllabus_units_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action
);

-- ============================================================================
-- syllabus_topics
-- ============================================================================
-- Provenance: lib/db/src/schema/syllabusTopics.ts at commit f271bef
-- Columns: id (serial PK), unit_id (integer FK to syllabus_units),
--          subject_id (integer FK to subjects), title (text not null),
--          status (text enum not null default 'not_started'),
--          notes (text nullable),
--          order_index (integer not null default 0)
-- Legacy columns: status, notes (removed by migration 0007)
-- ============================================================================
CREATE TABLE "syllabus_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_id" integer NOT NULL,
	"subject_id" integer NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL DEFAULT 'not_started',
	"notes" text,
	"order_index" integer NOT NULL DEFAULT 0,
	CONSTRAINT "syllabus_topics_unit_id_syllabus_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."syllabus_units"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "syllabus_topics_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "syllabus_topics_status_check" CHECK ("status" in ('not_started', 'in_progress', 'completed'))
);

-- ============================================================================
-- tasks
-- ============================================================================
-- Provenance: lib/db/src/schema/tasks.ts at commit f271bef
-- Columns: id (serial PK), title (text not null), subject_id (integer FK to subjects),
--          topic_id (integer FK to syllabus_topics, nullable),
--          deadline (date), priority (text enum not null default 'medium'),
--          estimated_minutes (integer nullable),
--          completed (boolean not null default false),
--          completed_at (timestamptz nullable),
--          created_at (timestamptz not null default now())
-- Differences: NO user_id column (added by migration 0001)
-- ============================================================================
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subject_id" integer NOT NULL,
	"topic_id" integer,
	"deadline" date,
	"priority" text NOT NULL DEFAULT 'medium',
	"estimated_minutes" integer,
	"completed" boolean NOT NULL DEFAULT false,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "tasks_topic_id_syllabus_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."syllabus_topics"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "tasks_priority_check" CHECK ("priority" in ('low', 'medium', 'high'))
);

-- ============================================================================
-- past_papers (original name, renamed to past_paper_attempts by migration 0000)
-- ============================================================================
-- Provenance: lib/db/src/schema/pastPapers.ts at commit f271bef
-- Columns: id (serial PK), subject_id (integer FK to subjects),
--          paper_code (text not null), session (text not null),
--          score (real not null), total_marks (integer not null),
--          percentage (real not null), date_attempted (date not null),
--          time_taken_minutes (integer nullable), notes (text nullable),
--          created_at (timestamptz not null default now())
-- Differences: HAS paper_code (dropped by migration 0000)
--             NO component_id, variant, year (added by migration 0000/0008)
--             NO user_id (added by migration 0008)
-- Important: This table creates a serial-backed sequence that migration 0000
--             will rename to past_paper_attempts_id_seq
-- ============================================================================
CREATE TABLE "past_papers" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_id" integer NOT NULL,
	"paper_code" text NOT NULL,
	"session" text NOT NULL,
	"score" real NOT NULL,
	"total_marks" integer NOT NULL,
	"percentage" real NOT NULL,
	"date_attempted" date NOT NULL,
	"time_taken_minutes" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "past_papers_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action
);

-- ============================================================================
-- exam_dates
-- ============================================================================
-- Provenance: lib/db/src/schema/examDates.ts at commit f271bef
-- Columns: id (serial PK), subject_id (integer FK to subjects),
--          paper_code (text not null), date (date not null), notes (text nullable)
-- Differences: NO user_id column (added by migration 0009)
-- ============================================================================
CREATE TABLE "exam_dates" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_id" integer NOT NULL,
	"paper_code" text NOT NULL,
	"date" date NOT NULL,
	"notes" text,
	CONSTRAINT "exam_dates_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action
);
