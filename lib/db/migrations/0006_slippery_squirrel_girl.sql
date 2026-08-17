-- Phase 3 Slice 2A: per-user topic progress (additive). Does not alter syllabus_topics.

CREATE TABLE "topic_progress" (
	"user_id" uuid NOT NULL,
	"topic_id" integer NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_progress_user_id_topic_id_pk" PRIMARY KEY("user_id","topic_id"),
	CONSTRAINT "topic_progress_status_check" CHECK ("status" in ('not_started', 'in_progress', 'completed')),
	CONSTRAINT "topic_progress_notes_length_check" CHECK ("notes" is null or char_length("notes") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_topic_id_syllabus_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."syllabus_topics"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "topic_progress_topic_id_idx" ON "topic_progress" USING btree ("topic_id");
--> statement-breakpoint

-- Reuse the existing, safe updated_at trigger function.
CREATE TRIGGER lockdin_topic_progress_set_updated_at
  BEFORE UPDATE ON public.topic_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.lockdin_set_profiles_updated_at();
--> statement-breakpoint

ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "topic_progress_select_own" ON public.topic_progress
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
--> statement-breakpoint

-- Option B: authenticated Data API is read-only. Writes go through trusted RPCs.
REVOKE ALL PRIVILEGES ON TABLE public.topic_progress FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.topic_progress FROM anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.topic_progress TO authenticated;
--> statement-breakpoint

-- Upsert caller progress. Default status + empty note deletes the row instead
-- of storing a meaningless default. Caller identity comes only from auth.uid().
CREATE FUNCTION public.lockdin_upsert_topic_progress(
  p_topic_id integer,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS SETOF public.topic_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_status text;
  v_notes text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'authentication_required';
  END IF;

  IF p_topic_id IS NULL OR p_topic_id < 1 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_topic_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.syllabus_topics AS topic
    WHERE topic.id = p_topic_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'topic_not_found';
  END IF;

  v_status := p_status;
  IF v_status IS NULL OR v_status NOT IN ('not_started', 'in_progress', 'completed') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_topic_status';
  END IF;

  v_notes := NULLIF(btrim(COALESCE(p_notes, '')), '');
  IF v_notes IS NOT NULL AND char_length(v_notes) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_topic_notes';
  END IF;

  IF v_status = 'not_started' AND v_notes IS NULL THEN
    DELETE FROM public.topic_progress AS progress
    WHERE progress.user_id = v_uid
      AND progress.topic_id = p_topic_id;

    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO public.topic_progress AS progress (user_id, topic_id, status, notes)
  VALUES (v_uid, p_topic_id, v_status, v_notes)
  ON CONFLICT (user_id, topic_id) DO UPDATE
    SET status = EXCLUDED.status,
        notes = EXCLUDED.notes
  RETURNING progress.*;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_upsert_topic_progress(integer, text, text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_upsert_topic_progress(integer, text, text) FROM anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_upsert_topic_progress(integer, text, text) FROM authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.lockdin_upsert_topic_progress(integer, text, text) TO authenticated;
--> statement-breakpoint

-- Explicit reset: delete only the caller's progress row for the topic.
CREATE FUNCTION public.lockdin_reset_topic_progress(p_topic_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'authentication_required';
  END IF;

  IF p_topic_id IS NULL OR p_topic_id < 1 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_topic_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.syllabus_topics AS topic
    WHERE topic.id = p_topic_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'topic_not_found';
  END IF;

  DELETE FROM public.topic_progress AS progress
  WHERE progress.user_id = v_uid
    AND progress.topic_id = p_topic_id;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_reset_topic_progress(integer) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_reset_topic_progress(integer) FROM anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.lockdin_reset_topic_progress(integer) FROM authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.lockdin_reset_topic_progress(integer) TO authenticated;
