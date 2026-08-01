-- Phase 2 Slice 1 — PRE-MIGRATION READ-ONLY AUDIT.
--
-- Run this BEFORE migration 0001_chilly_randall_flagg.sql is applied to the
-- hosted database. It intentionally does NOT reference public.profiles or
-- tasks.user_id as if they exist — this script must run cleanly, and mean
-- something, against the CURRENT (unmigrated) schema.
--
-- LOCATION: lives in docs/sql/phase2/, not lib/db/migrations/. It is
-- operational tooling, not a Drizzle migration, and must never be added to
-- the Drizzle journal (meta/_journal.json) or picked up by
-- `drizzle-kit migrate`.
--
-- PRIVACY:
--   - Task titles below are potentially sensitive product content. Treat
--     this output as private; do not paste raw output into shared
--     channels/tickets/tracking systems. The sample exists ONLY to help a
--     human classify existing task rows (disposable prototype data vs.
--     something worth preserving) before deciding wipe vs. backfill for
--     tasks.user_id. It is limited to 100 rows.
--   - Do NOT select, print, or report: auth.users UUIDs, emails,
--     raw_user_meta_data, tokens, provider identities, or connection
--     strings. Only aggregate counts are requested for Auth data below.
--
-- This script performs no writes. It is safe to run at any time before the
-- migration is applied.
--
-- ============================================================================
-- STOP CONDITIONS — do NOT apply migration 0001 if ANY of the following is
-- true. Each maps to a specific query below. If any condition is met, stop
-- and get a human decision before proceeding; do not "fix" it by editing the
-- migration to route around what is actually there.
-- ============================================================================
--   [Q11] public.profiles already exists.
--   [Q3 / Q3b] tasks.user_id column already exists.
--   [Q12] Any of lockdin_handle_new_user / lockdin_set_profiles_updated_at
--         already exists as a function, OR lockdin_on_auth_user_created /
--         lockdin_profiles_set_updated_at already exists as a trigger.
--   [Q7] tasks already has one or more RLS policies that this migration did
--        not create (i.e. any row returned before migration 0001 runs).
--   [Q6] tasks RLS is already enabled (tasks_rls_enabled = true) before
--        migration 0001 runs — Slice 1 assumes it starts disabled.
--   [Q7] Any existing task policy's using_expr/with_check_expr is broader
--        than "own row only" (e.g. references no column, or a column other
--        than a not-yet-existing user_id) — read each policy by hand.
--   [Q8 / Q9] anon or authenticated already hold ANY privilege on
--        public.tasks or public.tasks_id_seq (expected baseline: none for
--        either role, since Phase 2 has not shipped yet).
--   [Q4a] pg_get_serial_sequence('public.tasks', 'id') does not resolve to
--        exactly 'public.tasks_id_seq' — migration 0001's sequence grants
--        target that literal name and would silently miss the real one.
--   [Q13] Any non-internal auth.users trigger's definition suggests it
--        already inserts into public.profiles, or otherwise does something
--        that would conflict/double-fire with lockdin_handle_new_user —
--        read each trigger definition by hand.
--   [Q1 / Q2] Existing task ownership cannot be safely classified as either
--        "clearly disposable prototype data" or "has a known legitimate
--        owner" from the private sample — see Decision rules at the bottom.
-- ============================================================================

-- 1. Task count
SELECT count(*) AS task_count FROM public.tasks;

-- 2. Limited private sample for prototype-row classification.
--    No user_id column: it does not exist before migration 0001.
--    Keep this output private — see PRIVACY note above.
SELECT id, title, subject_id, completed, created_at
FROM public.tasks
ORDER BY id
LIMIT 100;

-- 3. Current tasks columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

-- 3b. Explicit stop-condition check: tasks.user_id must NOT already exist.
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'user_id'
) AS tasks_user_id_column_already_exists;

-- 4. Current tasks constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.tasks'::regclass
ORDER BY conname;

-- 4a. Explicit stop-condition check: the tasks.id serial sequence must
--     actually be named public.tasks_id_seq — migration 0001's sequence
--     REVOKE/GRANT statements target that literal name.
SELECT
  pg_get_serial_sequence('public.tasks', 'id') AS tasks_id_actual_sequence,
  pg_get_serial_sequence('public.tasks', 'id') = 'public.tasks_id_seq' AS matches_expected_sequence_name;

-- 5. Current indexes on tasks
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'tasks'
ORDER BY indexname;

-- 6. Current RLS / FORCE RLS state on tasks.
--    Stop-condition baseline: tasks_rls_enabled is expected to be FALSE
--    before migration 0001 runs.
SELECT c.relrowsecurity AS tasks_rls_enabled, c.relforcerowsecurity AS tasks_rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'tasks';

-- 7. Current policies on tasks.
--    Stop-condition baseline: this must return ZERO rows before migration
--    0001 runs. If it returns any row, read using_expr/with_check_expr by
--    hand — an existing policy could permit broader access than "own row
--    only" once user_id exists.
SELECT polname, polcmd, polroles::regrole[] AS roles,
       pg_get_expr(polqual, polrelid) AS using_expr,
       pg_get_expr(polwithcheck, polrelid) AS with_check_expr
FROM pg_policy
WHERE polrelid = 'public.tasks'::regclass
ORDER BY polname;

-- 8. Current table-level grants on tasks (authoritative ACL, not the
--    information_schema subset that only reflects the querying role).
--    Grantee OID 0 is PostgreSQL PUBLIC and does not cast cleanly to
--    regrole, so it is labelled explicitly below.
--    Stop-condition baseline: anon and authenticated should have ZERO rows
--    here before migration 0001 runs.
SELECT
  CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END AS grantee,
  a.privilege_type, a.is_grantable
FROM pg_class c
CROSS JOIN LATERAL aclexplode(c.relacl) a
WHERE c.oid = 'public.tasks'::regclass
ORDER BY grantee, privilege_type;

-- 9. Current sequence grants for tasks_id_seq (same PUBLIC-labelling note
--    as #8). Stop-condition baseline: anon and authenticated should have
--    ZERO rows here before migration 0001 runs.
SELECT
  CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END AS grantee,
  a.privilege_type, a.is_grantable
FROM pg_class c
CROSS JOIN LATERAL aclexplode(c.relacl) a
WHERE c.oid = 'public.tasks_id_seq'::regclass
ORDER BY grantee, privilege_type;

-- 10. Auth-user count only — no rows, no UUIDs, no emails, no metadata
SELECT count(*) AS auth_user_count FROM auth.users;

-- 11. Explicit stop-condition check: public.profiles must NOT already exist.
SELECT to_regclass('public.profiles') IS NOT NULL AS profiles_table_already_exists;

-- 12. Explicit stop-condition check: none of the proposed lockdin_-prefixed
--     function or trigger names may already exist. Migration 0001 uses
--     CREATE FUNCTION (not CREATE OR REPLACE) specifically so a function
--     collision fails loudly — but a pre-existing TRIGGER of the same name
--     would fail the CREATE TRIGGER statement too; check both explicitly.
SELECT p.proname AS existing_function_name, n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('lockdin_handle_new_user', 'lockdin_set_profiles_updated_at');

SELECT t.tgname AS existing_trigger_name, c.relname AS on_table
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal
  AND t.tgname IN ('lockdin_on_auth_user_created', 'lockdin_profiles_set_updated_at');

-- 13. All non-internal triggers currently attached to auth.users.
--     Migration 0001 must never drop anything in this list — it only adds
--     lockdin_on_auth_user_created alongside whatever is already here.
--     Stop-condition check (manual): read each definition — if one already
--     inserts into public.profiles or otherwise overlaps with what
--     lockdin_handle_new_user will do, that is a conflict requiring a human
--     decision before this migration runs.
SELECT tgname, tgenabled, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'auth' AND c.relname = 'users' AND NOT t.tgisinternal
ORDER BY tgname;

-- Decision rules (human, after reviewing the output above — private, do not
-- paste raw rows into shared reports):
-- 1) All tasks are disposable prototype rows -> delete before NOT NULL.
-- 2) A legitimate owner is known/decided in auth.users -> staged backfill,
--    then NOT NULL.
-- 3) Ownership is unproven -> do not invent UUIDs; quarantine/delete the
--    affected rows until a decision is made. Do not apply migration 0001
--    while this is unresolved if resolving it later would require undoing
--    already-applied schema changes.
