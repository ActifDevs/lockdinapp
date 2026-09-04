-- Phase 7 B5B/B5BR: subject catalogue visibility + membership route/option assignment.
-- Additive. Does not edit 0016/0017. Does not backfill assessment_route_id.
-- Visibility fail-safe: column DEFAULT false; existing catalogue rows backfilled true.

ALTER TABLE "subjects"
  ADD COLUMN "selectable_for_new_memberships" boolean DEFAULT false NOT NULL;
--> statement-breakpoint

COMMENT ON COLUMN "subjects"."selectable_for_new_memberships" IS
  'When false, subject is omitted from new-membership catalogue selection but remains accessible to existing memberships. DEFAULT false so future inserts stay hidden until explicitly enabled.';
--> statement-breakpoint

-- Deterministic one-time backfill for the pre-0018 catalogue (current nine).
-- Bounded to existing rows at migration time; future inserts inherit DEFAULT false.
UPDATE "subjects"
SET "selectable_for_new_memberships" = true
WHERE "code" IN (
  '9231',
  '9489',
  '9609',
  '9618',
  '9700',
  '9701',
  '9702',
  '9708',
  '9709'
);
--> statement-breakpoint

-- Resolve published route set for a syllabus version (0 or 1 published set).
CREATE OR REPLACE FUNCTION public.lockdin_published_route_set_id(
  p_syllabus_version_id integer
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_ids integer[];
BEGIN
  IF p_syllabus_version_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_syllabus_version';
  END IF;

  SELECT COALESCE(ARRAY_AGG(rs.id ORDER BY rs.id), ARRAY[]::integer[])
  INTO v_ids
  FROM public.assessment_route_sets AS rs
  WHERE rs.syllabus_version_id = p_syllabus_version_id
    AND rs.lifecycle = 'published';

  IF CARDINALITY(v_ids) = 0 THEN
    RETURN NULL;
  END IF;

  IF CARDINALITY(v_ids) > 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ambiguous_published_route_set';
  END IF;

  RETURN v_ids[1];
END;
$$;
--> statement-breakpoint

-- Validate route + option selections for a version-scoped membership.
-- NEW memberships: fail closed when no published route set (assessment_route_unavailable).
-- Legacy null-route memberships are left alone by callers that do not invoke this path.
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

  -- No published route set: fail closed for new assignment / membership creation.
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
      SELECT r.id
      INTO v_route_id
      FROM public.assessment_routes AS r
      WHERE r.route_set_id = v_route_set_id
        AND r.syllabus_version_id = p_syllabus_version_id;
    ELSE
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'assessment_route_required';
    END IF;
  ELSE
    SELECT r.id
    INTO v_route_id
    FROM public.assessment_routes AS r
    WHERE r.id = p_assessment_route_id
      AND r.route_set_id = v_route_set_id
      AND r.syllabus_version_id = p_syllabus_version_id;

    IF v_route_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_assessment_route';
    END IF;
  END IF;

  -- Deduplicate option ids
  SELECT COALESCE(ARRAY_AGG(DISTINCT oid ORDER BY oid), ARRAY[]::integer[])
  INTO v_option_ids
  FROM UNNEST(v_option_ids) AS t(oid);

  -- Every option must belong to a group on this route set / version
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
    WHERE o.id IS NULL OR g.id IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_study_option';
  END IF;

  -- Cardinality per group on this route set
  FOR v_group IN
    SELECT g.id AS group_id, g.min_selections, g.max_selections
    FROM public.assessment_study_option_groups AS g
    WHERE g.route_set_id = v_route_set_id
      AND g.syllabus_version_id = p_syllabus_version_id
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

-- Intentional authenticated mutation: set/replace route + options for one membership.
-- Never changes syllabus_version_id. Does not run on mere page view.
CREATE OR REPLACE FUNCTION public.lockdin_assign_membership_route(
  p_subject_id integer,
  p_assessment_route_id integer,
  p_option_ids integer[]
)
RETURNS public.user_subjects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_membership public.user_subjects%ROWTYPE;
  v_resolved record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'authentication_required';
  END IF;

  SELECT *
  INTO v_membership
  FROM public.user_subjects
  WHERE user_id = v_uid
    AND subject_id = p_subject_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'membership_not_found';
  END IF;

  SELECT *
  INTO v_resolved
  FROM public.lockdin_resolve_route_assignment(
    v_membership.subject_id,
    v_membership.syllabus_version_id,
    p_assessment_route_id,
    p_option_ids
  );

  IF v_resolved.assessment_route_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'no_selectable_route';
  END IF;

  UPDATE public.user_subjects
  SET assessment_route_id = v_resolved.assessment_route_id,
      updated_at = statement_timestamp()
  WHERE user_id = v_uid
    AND subject_id = p_subject_id
  RETURNING * INTO v_membership;

  DELETE FROM public.user_subject_option_selections
  WHERE user_id = v_uid
    AND subject_id = p_subject_id;

  INSERT INTO public.user_subject_option_selections (
    user_id, subject_id, option_group_id, option_id, syllabus_version_id
  )
  SELECT
    v_uid,
    p_subject_id,
    o.group_id,
    o.id,
    v_membership.syllabus_version_id
  FROM public.assessment_study_options AS o
  WHERE o.id = ANY(v_resolved.option_ids)
  ORDER BY o.id;

  RETURN v_membership;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.lockdin_published_route_set_id(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lockdin_resolve_route_assignment(integer, integer, integer, integer[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lockdin_assign_membership_route(integer, integer, integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lockdin_published_route_set_id(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lockdin_resolve_route_assignment(integer, integer, integer, integer[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lockdin_assign_membership_route(integer, integer, integer[]) TO authenticated;
--> statement-breakpoint

-- Replace apply bodies with visibility + route assignment support.
-- DROP first: CREATE OR REPLACE cannot change argument lists (would leave stale overloads).
DROP FUNCTION IF EXISTS public.lockdin_complete_onboarding_apply(
  text, text, text, text, integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[]
);
--> statement-breakpoint

DROP FUNCTION IF EXISTS public.lockdin_replace_user_subjects_apply(
  integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[]
);
--> statement-breakpoint

-- Patch onboarding apply: reject non-selectable subjects; optionally apply routes.
CREATE FUNCTION public.lockdin_complete_onboarding_apply(
  p_full_name text,
  p_username text,
  p_level text,
  p_exam_session text,
  p_subject_ids integer[],
  p_intended_exam_year integer,
  p_intended_exam_series public.exam_sitting_series,
  p_override_subject_ids integer[],
  p_override_years integer[],
  p_override_series public.exam_sitting_series[],
  p_route_assignments jsonb DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_full_name text := NULLIF(BTRIM(p_full_name), '');
  v_username text := LOWER(NULLIF(BTRIM(p_username), ''));
  v_level text := NULLIF(BTRIM(p_level), '');
  v_exam_session text := NULLIF(BTRIM(p_exam_session), '');
  v_input_count integer := CARDINALITY(COALESCE(p_subject_ids, ARRAY[]::integer[]));
  v_subject_ids integer[];
  v_subject_count integer;
  v_over_ids integer[] := COALESCE(p_override_subject_ids, ARRAY[]::integer[]);
  v_profile public.profiles%ROWTYPE;
  v_incomplete integer;
  v_assignment jsonb;
  v_subject_id integer;
  v_version_id integer;
  v_resolved record;
  v_route_id integer;
  v_option_ids integer[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'authentication_required';
  END IF;

  IF v_full_name IS NULL OR CHAR_LENGTH(v_full_name) < 2
     OR CHAR_LENGTH(v_full_name) > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_full_name';
  END IF;

  IF v_username IS NULL OR v_username !~ '^[a-z0-9_]{3,24}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_username';
  END IF;

  IF v_level IS NULL OR CHAR_LENGTH(v_level) > 80 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_level';
  END IF;

  IF v_exam_session IS NULL OR CHAR_LENGTH(v_exam_session) > 80 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_exam_session';
  END IF;

  SELECT COALESCE(
    ARRAY_AGG(DISTINCT selected_id ORDER BY selected_id),
    ARRAY[]::integer[]
  )
  INTO v_subject_ids
  FROM UNNEST(COALESCE(p_subject_ids, ARRAY[]::integer[])) AS selected(selected_id);

  IF v_input_count < 1 OR v_input_count > 5
     OR CARDINALITY(v_subject_ids) <> v_input_count THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_subject_selection';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM UNNEST(v_over_ids) AS override(subject_id)
    WHERE override.subject_id IS NULL
       OR NOT (override.subject_id = ANY(v_subject_ids))
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_subject_session_overrides';
  END IF;

  SELECT COUNT(DISTINCT subject.id)
  INTO v_subject_count
  FROM UNNEST(v_subject_ids) AS selected(subject_id)
  LEFT JOIN public.subjects AS subject
    ON subject.id = selected.subject_id
   AND subject.selectable_for_new_memberships = true;

  IF v_subject_count <> CARDINALITY(v_subject_ids) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_subject_selection';
  END IF;

  SELECT COUNT(*)
  INTO v_incomplete
  FROM UNNEST(v_subject_ids) AS selected(subject_id)
  CROSS JOIN LATERAL public.lockdin_membership_session_from_request(
    selected.subject_id,
    p_intended_exam_year,
    p_intended_exam_series,
    p_override_subject_ids,
    p_override_years,
    p_override_series
  ) AS session
  WHERE session.intended_exam_year IS NULL
     OR session.intended_exam_series IS NULL;

  IF v_incomplete > 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'intended_exam_session_required';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'profile_missing';
  END IF;

  IF v_profile.onboarded_at IS NOT NULL THEN
    IF v_profile.username IS NOT DISTINCT FROM v_username THEN
      RETURN v_profile;
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'onboarding_already_completed';
  END IF;

  UPDATE public.profiles
  SET full_name = v_full_name,
      username = v_username,
      level = v_level,
      exam_session = v_exam_session,
      onboarded_at = statement_timestamp()
  WHERE id = v_uid
  RETURNING * INTO v_profile;

  INSERT INTO public.user_subjects (
    user_id,
    subject_id,
    syllabus_version_id,
    intended_exam_year,
    intended_exam_series
  )
  SELECT
    v_uid,
    subject.id,
    public.lockdin_resolve_applicable_syllabus_version(
      subject.id,
      session.intended_exam_year,
      session.intended_exam_series
    ),
    session.intended_exam_year,
    session.intended_exam_series
  FROM public.subjects AS subject
  CROSS JOIN LATERAL public.lockdin_membership_session_from_request(
    subject.id,
    p_intended_exam_year,
    p_intended_exam_series,
    p_override_subject_ids,
    p_override_years,
    p_override_series
  ) AS session
  WHERE subject.id = ANY(v_subject_ids)
  ORDER BY subject.id;

  -- Optional explicit route assignments after pins exist (same transaction).
  IF p_route_assignments IS NOT NULL THEN
    IF jsonb_typeof(p_route_assignments) <> 'array' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_route_assignments';
    END IF;

    FOR v_assignment IN
      SELECT value FROM jsonb_array_elements(p_route_assignments)
    LOOP
      v_subject_id := NULLIF(v_assignment->>'subjectId', '')::integer;
      IF v_subject_id IS NULL OR NOT (v_subject_id = ANY(v_subject_ids)) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_route_assignments';
      END IF;

      SELECT syllabus_version_id
      INTO v_version_id
      FROM public.user_subjects
      WHERE user_id = v_uid AND subject_id = v_subject_id;

      v_route_id := NULLIF(v_assignment->>'routeId', '')::integer;
      SELECT COALESCE(ARRAY_AGG(DISTINCT (opt)::integer ORDER BY (opt)::integer), ARRAY[]::integer[])
      INTO v_option_ids
      FROM jsonb_array_elements_text(COALESCE(v_assignment->'optionIds', '[]'::jsonb)) AS t(opt);

      SELECT * INTO v_resolved
      FROM public.lockdin_resolve_route_assignment(
        v_subject_id, v_version_id, v_route_id, v_option_ids
      );

      UPDATE public.user_subjects
      SET assessment_route_id = v_resolved.assessment_route_id,
          updated_at = statement_timestamp()
      WHERE user_id = v_uid AND subject_id = v_subject_id;

      DELETE FROM public.user_subject_option_selections
      WHERE user_id = v_uid AND subject_id = v_subject_id;

      INSERT INTO public.user_subject_option_selections (
        user_id, subject_id, option_group_id, option_id, syllabus_version_id
      )
      SELECT v_uid, v_subject_id, o.group_id, o.id, v_version_id
      FROM public.assessment_study_options AS o
      WHERE o.id = ANY(v_resolved.option_ids);
    END LOOP;
  END IF;

  -- Fail closed: every NEW onboarding membership must resolve a published route
  -- (covers omitted/empty assignments and auto single-route subjects).
  FOR v_subject_id, v_version_id IN
    SELECT subject_id, syllabus_version_id
    FROM public.user_subjects
    WHERE user_id = v_uid
      AND subject_id = ANY(v_subject_ids)
      AND assessment_route_id IS NULL
  LOOP
    SELECT * INTO v_resolved
    FROM public.lockdin_resolve_route_assignment(
      v_subject_id, v_version_id, NULL, ARRAY[]::integer[]
    );

    UPDATE public.user_subjects
    SET assessment_route_id = v_resolved.assessment_route_id,
        updated_at = statement_timestamp()
    WHERE user_id = v_uid AND subject_id = v_subject_id;
  END LOOP;

  INSERT INTO public.tasks (
    user_id, title, subject_id, deadline, priority, estimated_minutes
  )
  SELECT v_uid,
         'Review ' || subject.name || ' syllabus overview',
         subject.id,
         CURRENT_DATE,
         'medium',
         30
  FROM public.subjects AS subject
  WHERE subject.id = ANY(v_subject_ids)
  ORDER BY subject.id;

  RETURN v_profile;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'username_unavailable';
END;
$$;
--> statement-breakpoint

CREATE FUNCTION public.lockdin_replace_user_subjects_apply(
  p_subject_ids integer[],
  p_intended_exam_year integer,
  p_intended_exam_series public.exam_sitting_series,
  p_override_subject_ids integer[],
  p_override_years integer[],
  p_override_series public.exam_sitting_series[],
  p_route_assignments jsonb DEFAULT NULL
)
RETURNS SETOF public.user_subjects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_input_count integer := CARDINALITY(COALESCE(p_subject_ids, ARRAY[]::integer[]));
  v_subject_ids integer[];
  v_subject_count integer;
  v_over_ids integer[] := COALESCE(p_override_subject_ids, ARRAY[]::integer[]);
  v_new_incomplete integer;
  v_assignment jsonb;
  v_subject_id integer;
  v_version_id integer;
  v_resolved record;
  v_route_id integer;
  v_option_ids integer[];
  v_previously_owned integer[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'authentication_required';
  END IF;

  SELECT COALESCE(
    ARRAY_AGG(DISTINCT selected_id ORDER BY selected_id),
    ARRAY[]::integer[]
  )
  INTO v_subject_ids
  FROM UNNEST(COALESCE(p_subject_ids, ARRAY[]::integer[])) AS selected(selected_id);

  IF v_input_count < 1 OR v_input_count > 5
     OR CARDINALITY(v_subject_ids) <> v_input_count THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_subject_selection';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM UNNEST(v_over_ids) AS override(subject_id)
    WHERE override.subject_id IS NULL
       OR NOT (override.subject_id = ANY(v_subject_ids))
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_subject_session_overrides';
  END IF;

  -- Existing memberships may keep non-selectable subjects; new adds must be selectable.
  IF EXISTS (
    SELECT 1
    FROM UNNEST(v_subject_ids) AS selected(subject_id)
    LEFT JOIN public.subjects AS subject ON subject.id = selected.subject_id
    WHERE subject.id IS NULL
       OR (
         subject.selectable_for_new_memberships = false
         AND NOT EXISTS (
           SELECT 1 FROM public.user_subjects AS existing
           WHERE existing.user_id = v_uid
             AND existing.subject_id = selected.subject_id
         )
       )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_subject_selection';
  END IF;

  SELECT COUNT(DISTINCT subject.id)
  INTO v_subject_count
  FROM UNNEST(v_subject_ids) AS selected(subject_id)
  LEFT JOIN public.subjects AS subject ON subject.id = selected.subject_id;

  IF v_subject_count <> CARDINALITY(v_subject_ids) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_subject_selection';
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'profile_missing';
  END IF;

  SELECT COALESCE(ARRAY_AGG(existing.subject_id ORDER BY existing.subject_id), ARRAY[]::integer[])
  INTO v_previously_owned
  FROM public.user_subjects AS existing
  WHERE existing.user_id = v_uid;

  SELECT COUNT(*)
  INTO v_new_incomplete
  FROM UNNEST(v_subject_ids) AS selected(subject_id)
  CROSS JOIN LATERAL public.lockdin_membership_session_from_request(
    selected.subject_id,
    p_intended_exam_year,
    p_intended_exam_series,
    p_override_subject_ids,
    p_override_years,
    p_override_series
  ) AS session
  WHERE NOT (selected.subject_id = ANY(v_previously_owned))
    AND (
      session.intended_exam_year IS NULL
      OR session.intended_exam_series IS NULL
    );

  IF v_new_incomplete > 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'intended_exam_session_required';
  END IF;

  DELETE FROM public.user_subjects
  WHERE user_id = v_uid
    AND NOT (subject_id = ANY(v_subject_ids));

  INSERT INTO public.user_subjects (
    user_id,
    subject_id,
    syllabus_version_id,
    intended_exam_year,
    intended_exam_series
  )
  SELECT
    v_uid,
    subject.id,
    public.lockdin_resolve_applicable_syllabus_version(
      subject.id,
      session.intended_exam_year,
      session.intended_exam_series
    ),
    session.intended_exam_year,
    session.intended_exam_series
  FROM public.subjects AS subject
  CROSS JOIN LATERAL public.lockdin_membership_session_from_request(
    subject.id,
    p_intended_exam_year,
    p_intended_exam_series,
    p_override_subject_ids,
    p_override_years,
    p_override_series
  ) AS session
  WHERE subject.id = ANY(v_subject_ids)
    AND NOT EXISTS (
      SELECT 1 FROM public.user_subjects AS existing
      WHERE existing.user_id = v_uid AND existing.subject_id = subject.id
    )
  ORDER BY subject.id;

  IF p_route_assignments IS NOT NULL THEN
    IF jsonb_typeof(p_route_assignments) <> 'array' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_route_assignments';
    END IF;

    FOR v_assignment IN
      SELECT value FROM jsonb_array_elements(p_route_assignments)
    LOOP
      v_subject_id := NULLIF(v_assignment->>'subjectId', '')::integer;
      IF v_subject_id IS NULL OR NOT (v_subject_id = ANY(v_subject_ids)) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_route_assignments';
      END IF;

      -- Only apply to rows that currently lack a route (new memberships / remediation).
      SELECT syllabus_version_id
      INTO v_version_id
      FROM public.user_subjects
      WHERE user_id = v_uid
        AND subject_id = v_subject_id
        AND assessment_route_id IS NULL;

      IF v_version_id IS NULL THEN
        CONTINUE;
      END IF;

      v_route_id := NULLIF(v_assignment->>'routeId', '')::integer;
      SELECT COALESCE(ARRAY_AGG(DISTINCT (opt)::integer ORDER BY (opt)::integer), ARRAY[]::integer[])
      INTO v_option_ids
      FROM jsonb_array_elements_text(COALESCE(v_assignment->'optionIds', '[]'::jsonb)) AS t(opt);

      SELECT * INTO v_resolved
      FROM public.lockdin_resolve_route_assignment(
        v_subject_id, v_version_id, v_route_id, v_option_ids
      );

      UPDATE public.user_subjects
      SET assessment_route_id = v_resolved.assessment_route_id,
          updated_at = statement_timestamp()
      WHERE user_id = v_uid AND subject_id = v_subject_id;

      DELETE FROM public.user_subject_option_selections
      WHERE user_id = v_uid AND subject_id = v_subject_id;

      INSERT INTO public.user_subject_option_selections (
        user_id, subject_id, option_group_id, option_id, syllabus_version_id
      )
      SELECT v_uid, v_subject_id, o.group_id, o.id, v_version_id
      FROM public.assessment_study_options AS o
      WHERE o.id = ANY(v_resolved.option_ids);
    END LOOP;
  END IF;

  -- Fail closed for NEW memberships only. Retained legacy null routes stay null.
  FOR v_subject_id, v_version_id IN
    SELECT subject_id, syllabus_version_id
    FROM public.user_subjects
    WHERE user_id = v_uid
      AND subject_id = ANY(v_subject_ids)
      AND NOT (subject_id = ANY(v_previously_owned))
      AND assessment_route_id IS NULL
  LOOP
    SELECT * INTO v_resolved
    FROM public.lockdin_resolve_route_assignment(
      v_subject_id, v_version_id, NULL, ARRAY[]::integer[]
    );

    UPDATE public.user_subjects
    SET assessment_route_id = v_resolved.assessment_route_id,
        updated_at = statement_timestamp()
    WHERE user_id = v_uid AND subject_id = v_subject_id;
  END LOOP;

  RETURN QUERY
  SELECT *
  FROM public.user_subjects
  WHERE user_id = v_uid
  ORDER BY subject_id;
END;
$$;
--> statement-breakpoint

-- Single PostgREST-safe wrappers (drop all prior overloads to avoid PGRST203).
DROP FUNCTION IF EXISTS public.lockdin_complete_onboarding(
  text, text, text, text, integer[]
);
DROP FUNCTION IF EXISTS public.lockdin_complete_onboarding(
  text, text, text, text, integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[]
);
DROP FUNCTION IF EXISTS public.lockdin_complete_onboarding(
  text, text, text, text, integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[], jsonb
);
DROP FUNCTION IF EXISTS public.lockdin_replace_user_subjects(integer[]);
DROP FUNCTION IF EXISTS public.lockdin_replace_user_subjects(
  integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[]
);
DROP FUNCTION IF EXISTS public.lockdin_replace_user_subjects(
  integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[], jsonb
);
--> statement-breakpoint

CREATE FUNCTION public.lockdin_complete_onboarding(
  p_full_name text,
  p_username text,
  p_level text,
  p_exam_session text,
  p_subject_ids integer[],
  p_intended_exam_year integer DEFAULT NULL,
  p_intended_exam_series public.exam_sitting_series DEFAULT NULL,
  p_override_subject_ids integer[] DEFAULT NULL,
  p_override_years integer[] DEFAULT NULL,
  p_override_series public.exam_sitting_series[] DEFAULT NULL,
  p_route_assignments jsonb DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.lockdin_complete_onboarding_apply(
    p_full_name,
    p_username,
    p_level,
    p_exam_session,
    p_subject_ids,
    p_intended_exam_year,
    p_intended_exam_series,
    p_override_subject_ids,
    p_override_years,
    p_override_series,
    p_route_assignments
  );
END;
$$;
--> statement-breakpoint

CREATE FUNCTION public.lockdin_replace_user_subjects(
  p_subject_ids integer[],
  p_intended_exam_year integer DEFAULT NULL,
  p_intended_exam_series public.exam_sitting_series DEFAULT NULL,
  p_override_subject_ids integer[] DEFAULT NULL,
  p_override_years integer[] DEFAULT NULL,
  p_override_series public.exam_sitting_series[] DEFAULT NULL,
  p_route_assignments jsonb DEFAULT NULL
)
RETURNS SETOF public.user_subjects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.lockdin_replace_user_subjects_apply(
    p_subject_ids,
    p_intended_exam_year,
    p_intended_exam_series,
    p_override_subject_ids,
    p_override_years,
    p_override_series,
    p_route_assignments
  );
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding_apply(
  text, text, text, text, integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[], jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding_apply(
  text, text, text, text, integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[], jsonb
) FROM anon;
REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding_apply(
  text, text, text, text, integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[], jsonb
) FROM authenticated;

REVOKE ALL ON FUNCTION public.lockdin_replace_user_subjects_apply(
  integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[], jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lockdin_replace_user_subjects_apply(
  integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[], jsonb
) FROM anon;
REVOKE ALL ON FUNCTION public.lockdin_replace_user_subjects_apply(
  integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[], jsonb
) FROM authenticated;

REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding(
  text, text, text, text, integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[], jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding(
  text, text, text, text, integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[], jsonb
) FROM anon;
GRANT EXECUTE ON FUNCTION public.lockdin_complete_onboarding(
  text, text, text, text, integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[], jsonb
) TO authenticated;

REVOKE ALL ON FUNCTION public.lockdin_replace_user_subjects(
  integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[], jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lockdin_replace_user_subjects(
  integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[], jsonb
) FROM anon;
GRANT EXECUTE ON FUNCTION public.lockdin_replace_user_subjects(
  integer[], integer, public.exam_sitting_series,
  integer[], integer[], public.exam_sitting_series[], jsonb
) TO authenticated;
