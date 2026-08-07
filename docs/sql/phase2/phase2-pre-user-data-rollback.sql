-- Phase 2 Slice 1 — PRE-USER-DATA ROLLBACK ONLY.
--
-- ============================================================================
-- READ THIS BEFORE RUNNING ANYTHING BELOW
-- ============================================================================
-- 1. DESTRUCTIVE. This script DROPs public.profiles (all rows), the
--    lockdin_-prefixed trigger functions, and reverts every Phase 2 Slice 1
--    grant/policy/index/constraint on public.tasks and public.profiles.
--
-- 2. VALID ONLY BEFORE REAL USER-OWNED DATA EXISTS. It is only safe to run
--    this before any genuine Supabase Auth registration has happened against
--    this project and been used to create or own profile/task rows. Do NOT
--    run it once a real user has signed up and used the app.
--
-- 3. PROVISIONAL. This script's final state (RLS disabled, no policies, no
--    authenticated grants on tasks, no profiles table) is an assumption
--    about the pre-Phase-2 baseline. It is provisional until
--    docs/sql/phase2/phase2-pre-migration-audit.sql has actually been run
--    against the hosted database and its output confirms that assumption
--    (original tasks RLS/FORCE RLS state, original tasks policies, original
--    tasks/tasks_id_seq grants). If the real pre-migration baseline differs,
--    derive this script's target end-state from that audit output instead
--    of from this comment.
--
-- 4. LOCATION. This file intentionally lives in docs/sql/phase2/, NOT in
--    lib/db/migrations/. It must never be added to the Drizzle journal
--    (meta/_journal.json) or picked up by `drizzle-kit migrate`.
--
-- 5. AFTER REAL USER DATA EXISTS: only forward migrations (new .sql files
--    under lib/db/migrations/) are permitted to change this state from that
--    point on — never a rollback like this one, and never disabling RLS as
--    a "fix" for anything.
--
-- 6. This script is NOT executed as part of any correction pass. It is
--    reviewed and stored only.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON SEQUENCE public.tasks_id_seq FROM PUBLIC;
REVOKE ALL PRIVILEGES ON SEQUENCE public.tasks_id_seq FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.tasks FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.tasks FROM anon, authenticated;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_user_id_auth_users_id_fkey;
DROP INDEX IF EXISTS public.tasks_user_id_idx;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS user_id;

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon, authenticated;

-- Project-specific (lockdin_-prefixed) trigger/function names ONLY. Never
-- drop any trigger or function on auth.users that this migration did not
-- create — this rollback must not remove a generic/hosted Auth object.
DROP TRIGGER IF EXISTS lockdin_on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.lockdin_handle_new_user();
DROP TRIGGER IF EXISTS lockdin_profiles_set_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.lockdin_set_profiles_updated_at();

DROP TABLE IF EXISTS public.profiles;

COMMIT;
