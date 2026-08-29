-- Existing memberships must keep their syllabus_version_id when the caller
-- re-saves a subject list that still includes that subject. New memberships
-- still pin to the version that is current at call time.
CREATE OR REPLACE FUNCTION public.lockdin_replace_user_subjects(p_subject_ids integer[])
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

  INSERT INTO public.user_subjects (user_id, subject_id, syllabus_version_id)
  SELECT v_uid, subject.id, version.id
  FROM public.subjects AS subject
  JOIN public.syllabus_versions AS version
    ON version.subject_id = subject.id
   AND version.is_current = true
  WHERE subject.id = ANY(v_subject_ids)
  ORDER BY subject.id
  ON CONFLICT (user_id, subject_id) DO NOTHING;

  RETURN QUERY
  SELECT membership.*
  FROM public.user_subjects AS membership
  WHERE membership.user_id = v_uid
  ORDER BY membership.subject_id;
END;
$$;
