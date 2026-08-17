-- Ownership/year cannot be inferred safely. Every reviewed environment was empty;
-- stop rather than fabricate either value if that precondition has changed.
DO $guard$
BEGIN
	IF EXISTS (SELECT 1 FROM public.past_paper_attempts LIMIT 1) THEN
		RAISE EXCEPTION USING
			ERRCODE = '55000',
			MESSAGE = 'past_paper_attempts_not_empty';
	END IF;
END
$guard$;
--> statement-breakpoint
ALTER TABLE "past_paper_attempts" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "past_paper_attempts" ADD COLUMN "year" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "past_paper_attempts" ADD CONSTRAINT "past_paper_attempts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "past_paper_attempts_user_date_id_idx" ON "past_paper_attempts" USING btree ("user_id","date_attempted" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "past_paper_attempts_user_subject_date_id_idx" ON "past_paper_attempts" USING btree ("user_id","subject_id","date_attempted" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "past_paper_attempts" ADD CONSTRAINT "past_paper_attempts_year_four_digit" CHECK ("past_paper_attempts"."year" between 1000 and 9999);--> statement-breakpoint

ALTER TABLE public.past_paper_attempts ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "past_paper_attempts_select_own" ON public.past_paper_attempts
	FOR SELECT
	TO authenticated
	USING ((select auth.uid()) = user_id);--> statement-breakpoint
CREATE POLICY "past_paper_attempts_insert_own" ON public.past_paper_attempts
	FOR INSERT
	TO authenticated
	WITH CHECK ((select auth.uid()) = user_id);--> statement-breakpoint
CREATE POLICY "past_paper_attempts_delete_own" ON public.past_paper_attempts
	FOR DELETE
	TO authenticated
	USING ((select auth.uid()) = user_id);--> statement-breakpoint

REVOKE ALL PRIVILEGES ON TABLE public.past_paper_attempts FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON TABLE public.past_paper_attempts TO authenticated;--> statement-breakpoint
DO $sequence_grant$
DECLARE
	sequence_schema name;
	sequence_name name;
BEGIN
	SELECT namespace.nspname, sequence.relname
	INTO sequence_schema, sequence_name
	FROM pg_class AS sequence
	INNER JOIN pg_namespace AS namespace ON namespace.oid = sequence.relnamespace
	WHERE sequence.oid = pg_get_serial_sequence('public.past_paper_attempts', 'id')::regclass
		AND sequence.relkind = 'S';

	IF sequence_name IS NULL THEN
		RAISE EXCEPTION USING
			ERRCODE = '55000',
			MESSAGE = 'past_paper_attempts_id_sequence_missing';
	END IF;

	EXECUTE format(
		'REVOKE ALL PRIVILEGES ON SEQUENCE %I.%I FROM PUBLIC, anon, authenticated',
		sequence_schema,
		sequence_name
	);
	EXECUTE format(
		'GRANT USAGE, SELECT ON SEQUENCE %I.%I TO authenticated',
		sequence_schema,
		sequence_name
	);
END
$sequence_grant$;
