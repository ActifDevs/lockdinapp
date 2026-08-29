ALTER TABLE "user_subjects" ADD COLUMN "intended_exam_year" integer;--> statement-breakpoint
ALTER TABLE "user_subjects" ADD COLUMN "intended_exam_series" "exam_sitting_series";--> statement-breakpoint
ALTER TABLE "user_subjects" ADD CONSTRAINT "user_subjects_intended_session_complete" CHECK ((
        "user_subjects"."intended_exam_year" is null
        and "user_subjects"."intended_exam_series" is null
      ) or (
        "user_subjects"."intended_exam_year" is not null
        and "user_subjects"."intended_exam_series" is not null
      ));--> statement-breakpoint
ALTER TABLE "user_subjects" ADD CONSTRAINT "user_subjects_intended_exam_year_four_digit" CHECK ("user_subjects"."intended_exam_year" is null or "user_subjects"."intended_exam_year" between 1000 and 9999);--> statement-breakpoint

-- Phase 6 Slice 3C2A: intended-session metadata + strict resolver (unused for
-- new-membership assignment). Existing pins and NULL sessions are unchanged.
-- Old Production callers keep lockdin_complete_onboarding(text,text,text,text,integer[])
-- and lockdin_replace_user_subjects(integer[]).

CREATE FUNCTION public.lockdin_resolve_applicable_syllabus_version(
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
REVOKE ALL ON FUNCTION public.lockdin_resolve_applicable_syllabus_version(integer, integer, public.exam_sitting_series) FROM authenticated;--> statement-breakpoint

CREATE FUNCTION public.lockdin_membership_session_from_request(
  p_subject_id integer,
  p_default_year integer,
  p_default_series public.exam_sitting_series,
  p_override_subject_ids integer[],
  p_override_years integer[],
  p_override_series public.exam_sitting_series[]
)
RETURNS TABLE (
  intended_exam_year integer,
  intended_exam_series public.exam_sitting_series
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_idx integer;
  v_over_ids integer[] := COALESCE(p_override_subject_ids, ARRAY[]::integer[]);
  v_over_years integer[] := COALESCE(p_override_years, ARRAY[]::integer[]);
  v_over_series public.exam_sitting_series[] := COALESCE(
    p_override_series,
    ARRAY[]::public.exam_sitting_series[]
  );
BEGIN
  IF (p_default_year IS NULL) <> (p_default_series IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_intended_exam_session';
  END IF;

  IF p_default_year IS NOT NULL
     AND (p_default_year < 1000 OR p_default_year > 9999) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_exam_year';
  END IF;

  IF CARDINALITY(v_over_ids) <> CARDINALITY(v_over_years)
     OR CARDINALITY(v_over_ids) <> CARDINALITY(v_over_series) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_subject_session_overrides';
  END IF;

  IF CARDINALITY(v_over_ids)
     <> CARDINALITY(ARRAY(SELECT DISTINCT selected_id FROM UNNEST(v_over_ids) AS selected(selected_id))) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_subject_session_overrides';
  END IF;

  IF CARDINALITY(v_over_ids) > 0 THEN
    FOR v_idx IN 1..CARDINALITY(v_over_ids) LOOP
      IF v_over_ids[v_idx] IS NULL
         OR v_over_years[v_idx] IS NULL
         OR v_over_series[v_idx] IS NULL
         OR v_over_years[v_idx] < 1000
         OR v_over_years[v_idx] > 9999 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_subject_session_overrides';
      END IF;
    END LOOP;
  END IF;

  v_idx := array_position(v_over_ids, p_subject_id);
  IF v_idx IS NOT NULL THEN
    intended_exam_year := v_over_years[v_idx];
    intended_exam_series := v_over_series[v_idx];
    RETURN NEXT;
    RETURN;
  END IF;

  intended_exam_year := p_default_year;
  intended_exam_series := p_default_series;
  RETURN NEXT;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_membership_session_from_request(integer, integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_membership_session_from_request(integer, integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) FROM anon;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_membership_session_from_request(integer, integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) FROM authenticated;--> statement-breakpoint

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
  p_override_series public.exam_sitting_series[]
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
  v_version_count integer;
  v_over_ids integer[] := COALESCE(p_override_subject_ids, ARRAY[]::integer[]);
  v_profile public.profiles%ROWTYPE;
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

  SELECT COUNT(DISTINCT subject.id), COUNT(version.id)
  INTO v_subject_count, v_version_count
  FROM UNNEST(v_subject_ids) AS selected(subject_id)
  LEFT JOIN public.subjects AS subject ON subject.id = selected.subject_id
  LEFT JOIN public.syllabus_versions AS version
    ON version.subject_id = subject.id
   AND version.is_current = true;

  IF v_subject_count <> CARDINALITY(v_subject_ids)
     OR v_version_count <> CARDINALITY(v_subject_ids) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_subject_selection';
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
    version.id,
    session.intended_exam_year,
    session.intended_exam_series
  FROM public.subjects AS subject
  JOIN public.syllabus_versions AS version
    ON version.subject_id = subject.id
   AND version.is_current = true
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
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding_apply(text, text, text, text, integer[], integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding_apply(text, text, text, text, integer[], integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) FROM anon;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding_apply(text, text, text, text, integer[], integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) FROM authenticated;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.lockdin_complete_onboarding(
  p_full_name text,
  p_username text,
  p_level text,
  p_exam_session text,
  p_subject_ids integer[]
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
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  );
END;
$$;--> statement-breakpoint

CREATE FUNCTION public.lockdin_complete_onboarding(
  p_full_name text,
  p_username text,
  p_level text,
  p_exam_session text,
  p_subject_ids integer[],
  p_intended_exam_year integer,
  p_intended_exam_series public.exam_sitting_series,
  p_override_subject_ids integer[],
  p_override_years integer[],
  p_override_series public.exam_sitting_series[]
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
    p_override_series
  );
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding(text, text, text, text, integer[], integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding(text, text, text, text, integer[], integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) FROM anon;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding(text, text, text, text, integer[], integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) FROM authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.lockdin_complete_onboarding(text, text, text, text, integer[], integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) TO authenticated;--> statement-breakpoint

CREATE FUNCTION public.lockdin_replace_user_subjects_apply(
  p_subject_ids integer[],
  p_intended_exam_year integer,
  p_intended_exam_series public.exam_sitting_series,
  p_override_subject_ids integer[],
  p_override_years integer[],
  p_override_series public.exam_sitting_series[]
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
  v_version_count integer;
  v_over_ids integer[] := COALESCE(p_override_subject_ids, ARRAY[]::integer[]);
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

  SELECT COUNT(DISTINCT subject.id), COUNT(version.id)
  INTO v_subject_count, v_version_count
  FROM UNNEST(v_subject_ids) AS selected(subject_id)
  LEFT JOIN public.subjects AS subject ON subject.id = selected.subject_id
  LEFT JOIN public.syllabus_versions AS version
    ON version.subject_id = subject.id
   AND version.is_current = true;

  IF v_subject_count <> CARDINALITY(v_subject_ids)
     OR v_version_count <> CARDINALITY(v_subject_ids) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_subject_selection';
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'profile_missing';
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
    version.id,
    session.intended_exam_year,
    session.intended_exam_series
  FROM public.subjects AS subject
  JOIN public.syllabus_versions AS version
    ON version.subject_id = subject.id
   AND version.is_current = true
  CROSS JOIN LATERAL public.lockdin_membership_session_from_request(
    subject.id,
    p_intended_exam_year,
    p_intended_exam_series,
    p_override_subject_ids,
    p_override_years,
    p_override_series
  ) AS session
  WHERE subject.id = ANY(v_subject_ids)
  ORDER BY subject.id
  ON CONFLICT (user_id, subject_id) DO NOTHING;

  RETURN QUERY
  SELECT membership.*
  FROM public.user_subjects AS membership
  WHERE membership.user_id = v_uid
  ORDER BY membership.subject_id;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_replace_user_subjects_apply(integer[], integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_replace_user_subjects_apply(integer[], integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) FROM anon;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_replace_user_subjects_apply(integer[], integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) FROM authenticated;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.lockdin_replace_user_subjects(p_subject_ids integer[])
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
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  );
END;
$$;--> statement-breakpoint

CREATE FUNCTION public.lockdin_replace_user_subjects(
  p_subject_ids integer[],
  p_intended_exam_year integer,
  p_intended_exam_series public.exam_sitting_series,
  p_override_subject_ids integer[],
  p_override_years integer[],
  p_override_series public.exam_sitting_series[]
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
    p_override_series
  );
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_replace_user_subjects(integer[], integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_replace_user_subjects(integer[], integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) FROM anon;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_replace_user_subjects(integer[], integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) FROM authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.lockdin_replace_user_subjects(integer[], integer, public.exam_sitting_series, integer[], integer[], public.exam_sitting_series[]) TO authenticated;