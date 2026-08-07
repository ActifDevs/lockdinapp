-- Phase 3 Slice 1: durable user-subject membership and the approved 1–5 rule.

CREATE TABLE "user_subjects" (
	"user_id" uuid NOT NULL,
	"subject_id" integer NOT NULL,
	"syllabus_version_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_subjects_user_id_subject_id_pk" PRIMARY KEY("user_id","subject_id")
);
--> statement-breakpoint

-- The referenced unique key must exist before the composite FK is created.
ALTER TABLE "syllabus_versions" ADD CONSTRAINT "syllabus_versions_subject_id_id_unique" UNIQUE("subject_id","id");
--> statement-breakpoint
ALTER TABLE "user_subjects" ADD CONSTRAINT "user_subjects_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_subjects" ADD CONSTRAINT "user_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_subjects" ADD CONSTRAINT "user_subjects_subject_version_fk" FOREIGN KEY ("subject_id","syllabus_version_id") REFERENCES "public"."syllabus_versions"("subject_id","id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "user_subjects_subject_version_idx" ON "user_subjects" USING btree ("subject_id","syllabus_version_id");
--> statement-breakpoint

-- Reuse the existing, safe updated_at trigger function. Its body only assigns
-- NEW.updated_at and does not depend on the profiles table.
CREATE TRIGGER lockdin_user_subjects_set_updated_at
  BEFORE UPDATE ON public.user_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.lockdin_set_profiles_updated_at();
--> statement-breakpoint

ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "user_subjects_select_own" ON public.user_subjects
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "user_subjects_insert_own" ON public.user_subjects
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "user_subjects_update_own" ON public.user_subjects
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
--> statement-breakpoint
CREATE POLICY "user_subjects_delete_own" ON public.user_subjects
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);
--> statement-breakpoint

REVOKE ALL PRIVILEGES ON TABLE public.user_subjects FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.user_subjects FROM anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_subjects TO authenticated;
--> statement-breakpoint

-- Serialize membership inserts per profile and enforce the table-level
-- invariant that a user can never have more than five active memberships.
CREATE FUNCTION public.lockdin_enforce_user_subject_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM 1
  FROM public.profiles
  WHERE id = NEW.user_id
  FOR UPDATE;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_subjects
    WHERE user_id = NEW.user_id
      AND subject_id = NEW.subject_id
  ) AND (
    SELECT COUNT(*)
    FROM public.user_subjects
    WHERE user_id = NEW.user_id
  ) >= 5 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'user_subject_limit_exceeded';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_enforce_user_subject_limit() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_enforce_user_subject_limit() FROM anon, authenticated;
--> statement-breakpoint
CREATE TRIGGER lockdin_user_subjects_enforce_limit
  BEFORE INSERT ON public.user_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.lockdin_enforce_user_subject_limit();
--> statement-breakpoint

-- Atomic account-level replacement. SECURITY DEFINER is required because the
-- current shared subjects/syllabus_versions tables intentionally expose no
-- Data API SELECT policies. The caller is still derived only from auth.uid().
CREATE FUNCTION public.lockdin_replace_user_subjects(p_subject_ids integer[])
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
  ON CONFLICT (user_id, subject_id) DO UPDATE
    SET syllabus_version_id = EXCLUDED.syllabus_version_id;

  RETURN QUERY
  SELECT membership.*
  FROM public.user_subjects AS membership
  WHERE membership.user_id = v_uid
  ORDER BY membership.subject_id;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_replace_user_subjects(integer[]) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_replace_user_subjects(integer[]) FROM anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_replace_user_subjects(integer[]) FROM authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.lockdin_replace_user_subjects(integer[]) TO authenticated;
--> statement-breakpoint

-- Replace the Phase 2 function without changing historical migration 0002.
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

  -- Preserve Phase 2's identical-username retry contract. No writes occur, so
  -- neither memberships nor starter tasks can be duplicated.
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

  INSERT INTO public.user_subjects (user_id, subject_id, syllabus_version_id)
  SELECT v_uid, subject.id, version.id
  FROM public.subjects AS subject
  JOIN public.syllabus_versions AS version
    ON version.subject_id = subject.id
   AND version.is_current = true
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
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding(text, text, text, text, integer[]) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding(text, text, text, text, integer[]) FROM anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_complete_onboarding(text, text, text, text, integer[]) FROM authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.lockdin_complete_onboarding(text, text, text, text, integer[]) TO authenticated;
