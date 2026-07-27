-- Hand-edited: drizzle-kit generate produced a from-scratch schema because this is the
-- first committed migration in a repo that previously only used `drizzle-kit push`
-- (no prior migration history to diff against). The statements below are the actual
-- minimal, safe changes needed to evolve the EXISTING live schema (subjects,
-- syllabus_units, syllabus_topics, tasks, past_papers, exam_dates already exist) into
-- the target shape, rather than recreating every table from zero.
--
-- Ordering assumption (see docs in the implementation report): this migration must be
-- applied AFTER the one-off placeholder-syllabus cleanup script has removed the 3
-- test-only "foundations" units/topics, so that ALTER ... SET NOT NULL below succeeds.

-- ============ subjects: enforce the code uniqueness the app already assumes ============
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_code_unique" UNIQUE("code");
--> statement-breakpoint

-- ============ new shared reference tables ============
CREATE TABLE "syllabus_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_id" integer NOT NULL,
	"exam_board" text NOT NULL,
	"qualification" text NOT NULL,
	"label" text NOT NULL,
	"valid_from" text,
	"valid_to" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"source_file" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "syllabus_versions_subject_source_unique" UNIQUE("subject_id","source_file")
);
--> statement-breakpoint
ALTER TABLE "syllabus_versions" ADD CONSTRAINT "syllabus_versions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE TABLE "assessment_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"syllabus_version_id" integer NOT NULL,
	"paper_code" text NOT NULL,
	"level" text NOT NULL,
	"component_name" text NOT NULL,
	"duration_minutes" integer,
	"total_marks" integer,
	"weighting_percent" real,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_components_version_paper_level_unique" UNIQUE("syllabus_version_id","paper_code","level")
);
--> statement-breakpoint
ALTER TABLE "assessment_components" ADD CONSTRAINT "assessment_components_syllabus_version_id_syllabus_versions_id_fk" FOREIGN KEY ("syllabus_version_id") REFERENCES "public"."syllabus_versions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE TABLE "syllabus_learning_outcomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"outcome" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "syllabus_learning_outcomes_topic_outcome_unique" UNIQUE("topic_id","outcome")
);
--> statement-breakpoint
ALTER TABLE "syllabus_learning_outcomes" ADD CONSTRAINT "syllabus_learning_outcomes_topic_id_syllabus_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."syllabus_topics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE TABLE "learning_outcome_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"learning_outcome_id" integer NOT NULL,
	"component_id" integer,
	"level" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_outcome_components_outcome_component_level_unique" UNIQUE("learning_outcome_id","component_id","level")
);
--> statement-breakpoint
ALTER TABLE "learning_outcome_components" ADD CONSTRAINT "learning_outcome_components_learning_outcome_id_syllabus_learning_outcomes_id_fk" FOREIGN KEY ("learning_outcome_id") REFERENCES "public"."syllabus_learning_outcomes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "learning_outcome_components" ADD CONSTRAINT "learning_outcome_components_component_id_assessment_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."assessment_components"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- ============ syllabus_units: add the version layer ============
-- Safe only once the placeholder "foundations" units have been deleted (see cleanup
-- script) — otherwise this NOT NULL column would have no value to backfill to.
ALTER TABLE "syllabus_units" ADD COLUMN "syllabus_version_id" integer NOT NULL;
--> statement-breakpoint
ALTER TABLE "syllabus_units" ADD CONSTRAINT "syllabus_units_syllabus_version_id_syllabus_versions_id_fk" FOREIGN KEY ("syllabus_version_id") REFERENCES "public"."syllabus_versions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "syllabus_units" ADD CONSTRAINT "syllabus_units_version_title_unique" UNIQUE("syllabus_version_id","title");
--> statement-breakpoint

-- ============ syllabus_topics: dedupe key for idempotent subtopic upserts ============
ALTER TABLE "syllabus_topics" ADD CONSTRAINT "syllabus_topics_unit_title_unique" UNIQUE("unit_id","title");
--> statement-breakpoint

-- ============ past_papers -> past_paper_attempts ============
-- Renamed in place (0 rows in every known environment at the time of this migration,
-- but a RENAME preserves any row that might exist rather than dropping/recreating).
ALTER TABLE "past_papers" RENAME TO "past_paper_attempts";
--> statement-breakpoint
ALTER TABLE "past_paper_attempts" RENAME CONSTRAINT "past_papers_subject_id_subjects_id_fk" TO "past_paper_attempts_subject_id_subjects_id_fk";
--> statement-breakpoint
ALTER TABLE "past_paper_attempts" DROP COLUMN "paper_code";
--> statement-breakpoint
ALTER TABLE "past_paper_attempts" ADD COLUMN "component_id" integer;
--> statement-breakpoint
ALTER TABLE "past_paper_attempts" ADD COLUMN "variant" integer;
--> statement-breakpoint
ALTER TABLE "past_paper_attempts" ADD CONSTRAINT "past_paper_attempts_component_id_assessment_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."assessment_components"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "past_paper_attempts" ADD CONSTRAINT "past_paper_attempts_variant_range" CHECK ("past_paper_attempts"."variant" is null or "past_paper_attempts"."variant" between 1 and 5);
--> statement-breakpoint
ALTER TABLE "past_paper_attempts" ADD CONSTRAINT "past_paper_attempts_session_allowed_values" CHECK ("past_paper_attempts"."session" in ('May/June','Oct/Nov','Feb/Mar','Specimen'));
--> statement-breakpoint
ALTER TABLE "past_paper_attempts" ADD CONSTRAINT "past_paper_attempts_score_nonnegative" CHECK ("past_paper_attempts"."score" >= 0);
--> statement-breakpoint
ALTER TABLE "past_paper_attempts" ADD CONSTRAINT "past_paper_attempts_total_marks_positive" CHECK ("past_paper_attempts"."total_marks" > 0);
--> statement-breakpoint
ALTER TABLE "past_paper_attempts" ADD CONSTRAINT "past_paper_attempts_score_le_total" CHECK ("past_paper_attempts"."score" <= "past_paper_attempts"."total_marks");
