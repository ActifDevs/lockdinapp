-- B5D-F3R: make route option-group applicability authoritative.
-- Additive function replacement only; no route data or membership backfill.

CREATE OR REPLACE FUNCTION public.lockdin_resolve_route_assignment(
  p_subject_id integer,
  p_syllabus_version_id integer,
  p_assessment_route_id integer,
  p_option_ids integer[]
)
RETURNS TABLE (
  assessment_route_id integer,
  option_ids integer[]
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_route_set_id integer;
  v_route_count integer;
  v_route_id integer;
  v_route_qualification_target public.assessment_qualification_target;
  v_option_ids integer[] := COALESCE(p_option_ids, ARRAY[]::integer[]);
  v_group record;
  v_selected_count integer;
BEGIN
  IF p_subject_id IS NULL OR p_syllabus_version_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_route_assignment';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.syllabus_versions AS v
    WHERE v.id = p_syllabus_version_id
      AND v.subject_id = p_subject_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'subject_version_mismatch';
  END IF;

  v_route_set_id := public.lockdin_published_route_set_id(p_syllabus_version_id);

  IF v_route_set_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'assessment_route_unavailable';
  END IF;

  SELECT COUNT(*)::integer
  INTO v_route_count
  FROM public.assessment_routes AS r
  WHERE r.route_set_id = v_route_set_id
    AND r.syllabus_version_id = p_syllabus_version_id;

  IF v_route_count = 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'assessment_route_unavailable';
  END IF;

  IF p_assessment_route_id IS NULL THEN
    IF v_route_count = 1 THEN
      SELECT r.id, r.qualification_target
      INTO v_route_id, v_route_qualification_target
      FROM public.assessment_routes AS r
      WHERE r.route_set_id = v_route_set_id
        AND r.syllabus_version_id = p_syllabus_version_id;
    ELSE
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'assessment_route_required';
    END IF;
  ELSE
    SELECT r.id, r.qualification_target
    INTO v_route_id, v_route_qualification_target
    FROM public.assessment_routes AS r
    WHERE r.id = p_assessment_route_id
      AND r.route_set_id = v_route_set_id
      AND r.syllabus_version_id = p_syllabus_version_id;

    IF v_route_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_assessment_route';
    END IF;
  END IF;

  SELECT COALESCE(ARRAY_AGG(DISTINCT oid ORDER BY oid), ARRAY[]::integer[])
  INTO v_option_ids
  FROM UNNEST(v_option_ids) AS t(oid);

  -- Every option must belong to an applicable group on this route set/version.
  -- Inapplicable options are rejected rather than silently discarded.
  IF EXISTS (
    SELECT 1
    FROM UNNEST(v_option_ids) AS selected(option_id)
    LEFT JOIN public.assessment_study_options AS o
      ON o.id = selected.option_id
     AND o.syllabus_version_id = p_syllabus_version_id
    LEFT JOIN public.assessment_study_option_groups AS g
      ON g.id = o.group_id
     AND g.route_set_id = v_route_set_id
     AND g.syllabus_version_id = p_syllabus_version_id
    WHERE o.id IS NULL
       OR g.id IS NULL
       OR (
         g.applicable_qualification_target <> 'both'
         AND g.applicable_qualification_target::text <>
           v_route_qualification_target::text
       )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_study_option';
  END IF;

  -- Cardinality applies only to groups applicable to the selected route target.
  FOR v_group IN
    SELECT g.id AS group_id, g.min_selections, g.max_selections
    FROM public.assessment_study_option_groups AS g
    WHERE g.route_set_id = v_route_set_id
      AND g.syllabus_version_id = p_syllabus_version_id
      AND (
        g.applicable_qualification_target = 'both'
        OR g.applicable_qualification_target::text =
          v_route_qualification_target::text
      )
  LOOP
    SELECT COUNT(*)::integer
    INTO v_selected_count
    FROM UNNEST(v_option_ids) AS selected(option_id)
    JOIN public.assessment_study_options AS o
      ON o.id = selected.option_id
    WHERE o.group_id = v_group.group_id;

    IF v_selected_count < v_group.min_selections
       OR v_selected_count > v_group.max_selections THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_option_cardinality';
    END IF;
  END LOOP;

  assessment_route_id := v_route_id;
  option_ids := v_option_ids;
  RETURN NEXT;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.lockdin_resolve_route_assignment(
  integer, integer, integer, integer[]
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lockdin_resolve_route_assignment(
  integer, integer, integer, integer[]
) FROM anon;
GRANT EXECUTE ON FUNCTION public.lockdin_resolve_route_assignment(
  integer, integer, integer, integer[]
) TO authenticated;
