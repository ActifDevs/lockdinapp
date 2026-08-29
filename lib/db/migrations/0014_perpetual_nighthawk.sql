-- Phase 6 Slice 3C2B1: version-level product series policy + resolver correction.
-- Does not seed Production versions. Does not change assignment RPCs.
-- ON DELETE CASCADE: series rows are version-owned metadata. Version rows are
-- not pruned by live assignment; CASCADE avoids orphan policy if an unused
-- synthetic/draft version is deleted. user_subjects still RESTRICT versions.
CREATE TABLE "syllabus_version_exam_series" (
	"syllabus_version_id" integer NOT NULL,
	"series" "exam_sitting_series" NOT NULL,
	"product_auto_assign" boolean DEFAULT false NOT NULL,
	CONSTRAINT "syllabus_version_exam_series_pk" PRIMARY KEY("syllabus_version_id","series")
);
--> statement-breakpoint
ALTER TABLE "syllabus_version_exam_series" ADD CONSTRAINT "syllabus_version_exam_series_syllabus_version_id_syllabus_versions_id_fk" FOREIGN KEY ("syllabus_version_id") REFERENCES "public"."syllabus_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "syllabus_version_exam_series" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE public.syllabus_version_exam_series FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON TABLE public.syllabus_version_exam_series FROM anon;--> statement-breakpoint
REVOKE ALL ON TABLE public.syllabus_version_exam_series FROM authenticated;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.lockdin_resolve_applicable_syllabus_version(
  p_subject_id integer,
  p_exam_year integer,
  p_exam_series public.exam_sitting_series
)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_ids integer[];
BEGIN
  IF p_subject_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_subject';
  END IF;

  IF p_exam_year IS NULL OR p_exam_year < 1000 OR p_exam_year > 9999 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_exam_year';
  END IF;

  IF p_exam_series IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_exam_series';
  END IF;

  SELECT COALESCE(array_agg(locked.id), ARRAY[]::integer[])
  INTO v_ids
  FROM (
    SELECT version.id
    FROM public.syllabus_versions AS version
    WHERE version.subject_id = p_subject_id
      AND version.lifecycle = 'published'
      AND version.applicable_session_range IS NOT NULL
      AND version.applicable_session_range @>
        public.lockdin_exam_session_ordinal(p_exam_year, p_exam_series)
      AND EXISTS (
        SELECT 1
        FROM public.syllabus_version_exam_series AS policy
        WHERE policy.syllabus_version_id = version.id
          AND policy.series = p_exam_series
          AND policy.product_auto_assign = true
      )
    ORDER BY version.id
    FOR SHARE
  ) AS locked;

  IF CARDINALITY(v_ids) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'no_applicable_syllabus_version';
  END IF;

  IF CARDINALITY(v_ids) > 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ambiguous_applicable_syllabus_version';
  END IF;

  RETURN v_ids[1];
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_resolve_applicable_syllabus_version(integer, integer, public.exam_sitting_series) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_resolve_applicable_syllabus_version(integer, integer, public.exam_sitting_series) FROM anon;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_resolve_applicable_syllabus_version(integer, integer, public.exam_sitting_series) FROM authenticated;