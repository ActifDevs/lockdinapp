-- Slice 4: exam_dates ownership. Fail closed if any row exists — do not invent owners.
LOCK TABLE public.exam_dates IN ACCESS EXCLUSIVE MODE;--> statement-breakpoint
DO $guard$
BEGIN
	IF EXISTS (SELECT 1 FROM public.exam_dates LIMIT 1) THEN
		RAISE EXCEPTION USING
			ERRCODE = '55000',
			MESSAGE = 'exam_dates_not_empty';
	END IF;
END
$guard$;
--> statement-breakpoint
ALTER TABLE "exam_dates" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "exam_dates" ADD CONSTRAINT "exam_dates_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_dates_user_date_id_idx" ON "exam_dates" USING btree ("user_id","date","id");--> statement-breakpoint

ALTER TABLE public.exam_dates ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "exam_dates_select_own" ON public.exam_dates
	FOR SELECT
	TO authenticated
	USING ((select auth.uid()) = user_id);--> statement-breakpoint
CREATE POLICY "exam_dates_insert_own" ON public.exam_dates
	FOR INSERT
	TO authenticated
	WITH CHECK ((select auth.uid()) = user_id);--> statement-breakpoint
CREATE POLICY "exam_dates_delete_own" ON public.exam_dates
	FOR DELETE
	TO authenticated
	USING ((select auth.uid()) = user_id);--> statement-breakpoint

REVOKE ALL PRIVILEGES ON TABLE public.exam_dates FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON TABLE public.exam_dates TO authenticated;--> statement-breakpoint
DO $sequence_grant$
DECLARE
	sequence_schema name;
	sequence_name name;
BEGIN
	SELECT namespace.nspname, sequence.relname
	INTO sequence_schema, sequence_name
	FROM pg_class AS sequence
	INNER JOIN pg_namespace AS namespace ON namespace.oid = sequence.relnamespace
	WHERE sequence.oid = pg_get_serial_sequence('public.exam_dates', 'id')::regclass
		AND sequence.relkind = 'S';

	IF sequence_name IS NULL THEN
		RAISE EXCEPTION USING
			ERRCODE = '55000',
			MESSAGE = 'exam_dates_id_sequence_missing';
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
