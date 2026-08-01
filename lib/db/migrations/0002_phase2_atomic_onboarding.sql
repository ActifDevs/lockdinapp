-- Phase 2 Slice 3: atomic onboarding RPC.
-- Derives the caller exclusively from auth.uid(). No user-id parameter.
-- Creates starter tasks and sets username/onboarded_at in one transaction.

CREATE FUNCTION public.lockdin_complete_onboarding(
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
DECLARE
  v_uid uuid := auth.uid();
  v_full_name text := NULLIF(BTRIM(p_full_name), '');
  v_username text := LOWER(NULLIF(BTRIM(p_username), ''));
  v_level text := NULLIF(BTRIM(p_level), '');
  v_exam_session text := NULLIF(BTRIM(p_exam_session), '');
  v_subject_ids integer[];
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'authentication_required';
  END IF;

  IF v_full_name IS NULL OR CHAR_LENGTH(v_full_name) < 2
     OR CHAR_LENGTH(v_full_name) > 100 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_full_name';
  END IF;

  IF v_username IS NULL
     OR v_username !~ '^[a-z0-9_]{3,24}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_username';
  END IF;

  IF v_level IS NULL OR CHAR_LENGTH(v_level) > 80 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_level';
  END IF;

  IF v_exam_session IS NULL OR CHAR_LENGTH(v_exam_session) > 80 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_exam_session';
  END IF;

  SELECT COALESCE(
    ARRAY_AGG(DISTINCT selected_id ORDER BY selected_id),
    ARRAY[]::integer[]
  )
  INTO v_subject_ids
  FROM UNNEST(
    COALESCE(p_subject_ids, ARRAY[]::integer[])
  ) AS selected(selected_id);

  IF CARDINALITY(v_subject_ids) < 1
     OR CARDINALITY(v_subject_ids) > 3 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_subject_selection';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.subjects
    WHERE id = ANY(v_subject_ids)
  ) <> CARDINALITY(v_subject_ids) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_subject_selection';
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'profile_missing';
  END IF;

  IF v_profile.onboarded_at IS NOT NULL THEN
    IF v_profile.username IS NOT DISTINCT FROM v_username THEN
      RETURN v_profile;
    END IF;

    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'onboarding_already_completed';
  END IF;

  UPDATE public.profiles
  SET
    full_name = v_full_name,
    username = v_username,
    level = v_level,
    exam_session = v_exam_session,
    onboarded_at = statement_timestamp()
  WHERE id = v_uid
  RETURNING *
  INTO v_profile;

  INSERT INTO public.tasks (
    user_id,
    title,
    subject_id,
    deadline,
    priority,
    estimated_minutes
  )
  SELECT
    v_uid,
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
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'username_unavailable';
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding(
  text,
  text,
  text,
  text,
  integer[]
) FROM PUBLIC;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding(
  text,
  text,
  text,
  text,
  integer[]
) FROM anon;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding(
  text,
  text,
  text,
  text,
  integer[]
) FROM authenticated;
--> statement-breakpoint

GRANT EXECUTE ON FUNCTION public.lockdin_complete_onboarding(
  text,
  text,
  text,
  text,
  integer[]
) TO authenticated;
