-- Phase 6 Slice 3A: syllabus version lifecycle + applicability foundation.
-- Does not rewrite importer, RPCs, or user_subjects. Does not guess Cambridge windows.
CREATE TYPE "public"."exam_sitting_series" AS ENUM('Feb/Mar', 'May/June', 'Oct/Nov');--> statement-breakpoint
CREATE TYPE "public"."syllabus_version_lifecycle" AS ENUM('draft', 'published', 'retired', 'archived');--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint

CREATE FUNCTION public.lockdin_exam_session_ordinal(
  p_year integer,
  p_series public.exam_sitting_series
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = pg_catalog
AS $$
  SELECT p_year * 3 + CASE p_series::text
    WHEN 'Feb/Mar' THEN 0
    WHEN 'May/June' THEN 1
    WHEN 'Oct/Nov' THEN 2
  END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_exam_session_ordinal(integer, public.exam_sitting_series) FROM PUBLIC;--> statement-breakpoint

ALTER TABLE "syllabus_versions" ADD COLUMN "lifecycle" "syllabus_version_lifecycle" DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "syllabus_versions" ADD COLUMN "logical_revision_key" text;--> statement-breakpoint
ALTER TABLE "syllabus_versions" ADD COLUMN "content_sha256" text;--> statement-breakpoint
ALTER TABLE "syllabus_versions" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "syllabus_versions" ADD COLUMN "retired_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "syllabus_versions" ADD COLUMN "applicable_from_year" integer;--> statement-breakpoint
ALTER TABLE "syllabus_versions" ADD COLUMN "applicable_from_series" "exam_sitting_series";--> statement-breakpoint
ALTER TABLE "syllabus_versions" ADD COLUMN "applicable_to_year" integer;--> statement-breakpoint
ALTER TABLE "syllabus_versions" ADD COLUMN "applicable_to_series" "exam_sitting_series";--> statement-breakpoint
ALTER TABLE "syllabus_versions" ADD COLUMN "applicable_session_range" int4range GENERATED ALWAYS AS (
  CASE
    WHEN "applicable_from_year" IS NULL THEN NULL::int4range
    ELSE int4range(
      public.lockdin_exam_session_ordinal("applicable_from_year", "applicable_from_series"),
      public.lockdin_exam_session_ordinal("applicable_to_year", "applicable_to_series"),
      '[]'
    )
  END
) STORED;--> statement-breakpoint

CREATE UNIQUE INDEX "syllabus_versions_one_default_per_subject" ON "syllabus_versions" USING btree ("subject_id") WHERE "syllabus_versions"."is_current" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "syllabus_versions_logical_revision_per_subject" ON "syllabus_versions" USING btree ("subject_id","logical_revision_key") WHERE "syllabus_versions"."logical_revision_key" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "syllabus_versions_content_sha256_per_subject" ON "syllabus_versions" USING btree ("subject_id","content_sha256") WHERE "syllabus_versions"."content_sha256" is not null;--> statement-breakpoint

ALTER TABLE "syllabus_versions" ADD CONSTRAINT "syllabus_versions_applicability_complete" CHECK ((
        "syllabus_versions"."applicable_from_year" is null
        and "syllabus_versions"."applicable_from_series" is null
        and "syllabus_versions"."applicable_to_year" is null
        and "syllabus_versions"."applicable_to_series" is null
      ) or (
        "syllabus_versions"."applicable_from_year" is not null
        and "syllabus_versions"."applicable_from_series" is not null
        and "syllabus_versions"."applicable_to_year" is not null
        and "syllabus_versions"."applicable_to_series" is not null
      ));--> statement-breakpoint
ALTER TABLE "syllabus_versions" ADD CONSTRAINT "syllabus_versions_applicability_order" CHECK (
  (
    "applicable_from_year" IS NULL
  ) OR (
    public.lockdin_exam_session_ordinal("applicable_from_year", "applicable_from_series")
    <= public.lockdin_exam_session_ordinal("applicable_to_year", "applicable_to_series")
  )
);--> statement-breakpoint
ALTER TABLE "syllabus_versions" ADD CONSTRAINT "syllabus_versions_applicable_windows_no_overlap"
EXCLUDE USING gist (
  "subject_id" WITH =,
  "applicable_session_range" WITH &&
) WHERE ("applicable_session_range" IS NOT NULL);--> statement-breakpoint

UPDATE "syllabus_versions"
SET "published_at" = "imported_at"
WHERE "lifecycle" = 'published' AND "published_at" IS NULL;
