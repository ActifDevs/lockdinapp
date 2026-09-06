-- Phase 7 B5E-F1: controlled per-user/per-subject visibility grants.
-- Additive schema plus grant-aware replacement of existing atomic membership
-- functions. Does not change subject global flags or mutate memberships.

CREATE TABLE "subject_visibility_grants" (
  "user_id" uuid NOT NULL,
  "subject_id" integer NOT NULL,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "granted_by" uuid,
  CONSTRAINT "subject_visibility_grants_user_id_subject_id_pk"
    PRIMARY KEY("user_id", "subject_id")
);
--> statement-breakpoint

ALTER TABLE "subject_visibility_grants"
  ADD CONSTRAINT "subject_visibility_grants_user_id_auth_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "subject_visibility_grants"
  ADD CONSTRAINT "subject_visibility_grants_subject_id_subjects_id_fk"
  FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "subject_visibility_grants"
  ADD CONSTRAINT "subject_visibility_grants_granted_by_auth_users_id_fk"
  FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "subject_visibility_grants_subject_id_idx"
  ON "subject_visibility_grants" USING btree ("subject_id");
--> statement-breakpoint

CREATE INDEX "subject_visibility_grants_granted_by_idx"
  ON "subject_visibility_grants" USING btree ("granted_by");
--> statement-breakpoint

ALTER TABLE public.subject_visibility_grants ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- No ordinary-client policy exists. Explicit privileges make the table private
-- even on projects whose legacy default privileges expose new public tables.
REVOKE ALL PRIVILEGES ON TABLE public.subject_visibility_grants
  FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.subject_visibility_grants TO service_role;
--> statement-breakpoint

-- One authoritative rule for catalogue listing and new-membership writes.
-- SECURITY DEFINER is required because the grant table is deliberately private;
-- callers cannot execute this helper directly.
CREATE FUNCTION public.lockdin_can_select_subject(
  p_user_id uuid,
  p_subject_id integer
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subjects AS subject
    WHERE subject.id = p_subject_id
      AND (
        subject.selectable_for_new_memberships = true
        OR (
          p_user_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.subject_visibility_grants AS visibility_grant
            WHERE visibility_grant.user_id = p_user_id
              AND visibility_grant.subject_id = subject.id
          )
        )
      )
  );
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.lockdin_can_select_subject(uuid, integer)
  FROM PUBLIC, anon, authenticated;
--> statement-breakpoint

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
  WHERE public.lockdin_can_select_subject(v_uid, subject.id);

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

CREATE OR REPLACE FUNCTION public.lockdin_replace_user_subjects_apply(
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
         NOT public.lockdin_can_select_subject(v_uid, selected.subject_id)
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
