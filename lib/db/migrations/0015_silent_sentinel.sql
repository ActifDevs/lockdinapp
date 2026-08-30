-- Phase 6 Slice 3C2B2: new-membership assignment uses the strict resolver.
-- Does not seed or rewrite applicability/policy. Existing pins unchanged.
-- Legacy signatures remain; creating memberships without a structured session
-- fails closed. Retained-only Settings replacement may omit session.

CREATE OR REPLACE FUNCTION public.lockdin_complete_onboarding_apply(
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
  v_over_ids integer[] := COALESCE(p_override_subject_ids, ARRAY[]::integer[]);
  v_profile public.profiles%ROWTYPE;
  v_incomplete integer;
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
  LEFT JOIN public.subjects AS subject ON subject.id = selected.subject_id;

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

CREATE OR REPLACE FUNCTION public.lockdin_replace_user_subjects_apply(
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
  v_over_ids integer[] := COALESCE(p_override_subject_ids, ARRAY[]::integer[]);
  v_new_incomplete integer;
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
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_subjects AS existing
    WHERE existing.user_id = v_uid
      AND existing.subject_id = selected.subject_id
  )
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
      SELECT 1
      FROM public.user_subjects AS existing
      WHERE existing.user_id = v_uid
        AND existing.subject_id = subject.id
    )
  ORDER BY subject.id;

  RETURN QUERY
  SELECT membership.*
  FROM public.user_subjects AS membership
  WHERE membership.user_id = v_uid
  ORDER BY membership.subject_id;
END;
$$;
