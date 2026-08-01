-- Phase 2 Slice 1 — POST-MIGRATION VERIFICATION (read-only).
--
-- Run ONLY after migration 0001_chilly_randall_flagg.sql has actually been
-- applied. It references public.profiles, tasks.user_id, the new policies,
-- grants, triggers, and functions that migration 0001 creates — all of
-- which are expected to exist by the time this script is run.
--
-- LOCATION: lives in docs/sql/phase2/, not lib/db/migrations/. It is
-- operational tooling, not a Drizzle migration, and must never be added to
-- the Drizzle journal (meta/_journal.json) or picked up by
-- `drizzle-kit migrate`.
--
-- PRIVACY: never select or report raw user_id / auth.users values. Task
-- ownership below is reported as aggregate counts only, consistent with the
-- pre-migration audit's privacy rules.
--
-- IMPORTANT — do not assume an "empty ACL" proves no access. The function
-- OWNER (the role that ran the migration, e.g. postgres/supabase_admin)
-- retains implicit EXECUTE privilege regardless of any REVOKE statement,
-- and is not what we care about here. What matters is the EFFECTIVE
-- privilege of anon and authenticated specifically, which is why the
-- checks below use has_function_privilege() / has_table_privilege() /
-- has_column_privilege() / has_sequence_privilege() for those exact roles,
-- not just "is the ACL list empty".
--
-- This script performs no writes.

-- 1. profiles table exists
SELECT to_regclass('public.profiles') IS NOT NULL AS profiles_table_exists;

-- 2. tasks.user_id column present and nullable (NOT NULL cutover is a
--    separate, later step gated on the pre-migration audit's decision)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'user_id';

-- 3. Aggregated task ownership — no raw user_id values.
--    Cross-check total_task_count against the pre-migration audit's
--    task_count: it must be identical (migration 0001 only adds a nullable
--    column; it must not add, remove, or duplicate rows).
SELECT
  count(*) AS total_task_count,
  count(*) FILTER (WHERE user_id IS NULL) AS null_user_id_count,
  count(*) FILTER (WHERE user_id IS NOT NULL) AS non_null_user_id_count,
  count(DISTINCT user_id) AS distinct_owner_count
FROM public.tasks;

-- 3a. Aggregated Auth/profile integrity — no UUIDs, emails, or metadata.
--     Expected after migration: missing_profile_count = 0 and
--     orphan_profile_count = 0 (the trigger + backfill together should
--     leave every auth.users row with exactly one public.profiles row,
--     and no public.profiles row without a backing auth.users row — the
--     profiles.id FK to auth.users(id) ON DELETE CASCADE should make an
--     orphan structurally impossible, but this checks it directly rather
--     than assuming the FK is doing its job).
SELECT
  (SELECT count(*) FROM auth.users) AS auth_user_count,
  (SELECT count(*) FROM public.profiles) AS profile_count,
  (SELECT count(*)
     FROM auth.users u
     LEFT JOIN public.profiles p ON p.id = u.id
     WHERE p.id IS NULL) AS missing_profile_count,
  (SELECT count(*)
     FROM public.profiles p
     LEFT JOIN auth.users u ON u.id = p.id
     WHERE u.id IS NULL) AS orphan_profile_count;

-- 4. profiles constraints (username format check + auth.users FK)
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
ORDER BY conname;

-- 5. tasks constraints (including the new auth.users FK on user_id)
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.tasks'::regclass
ORDER BY conname;

-- 6. profiles indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY indexname;

-- 7. tasks indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'tasks'
ORDER BY indexname;

-- 8. RLS / FORCE RLS state on both tables
SELECT n.nspname, c.relname, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('profiles', 'tasks')
ORDER BY c.relname;

-- 9. Policies on profiles and tasks — expect (select auth.uid()) = id / = user_id
SELECT c.relname AS table_name, pol.polname, pol.polcmd,
       pol.polroles::regrole[] AS roles,
       pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
       pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expr
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('profiles', 'tasks')
ORDER BY table_name, pol.polname;

-- ============================================================================
-- 10. TABLE / SEQUENCE PRIVILEGE MATRIX — has_*_privilege() checks
--
-- These use the actual role being tested as the argument, so they report
-- the EFFECTIVE privilege for that role (inherited PUBLIC grants included),
-- not just "is there a matching ACL row". A single query returns the full
-- pass/fail matrix requested by the Stop 2 hardening pass.
-- ============================================================================
SELECT
  -- profiles: authenticated should have table-level SELECT only — no
  -- table-level INSERT/UPDATE/DELETE (profile creation is trigger-only via
  -- lockdin_handle_new_user; updates are column-level only, see below).
  -- anon: none of any kind.
  has_table_privilege('authenticated', 'public.profiles', 'SELECT')  AS authenticated_can_select_profiles,
  has_table_privilege('authenticated', 'public.profiles', 'INSERT')  AS authenticated_can_insert_profiles_expect_false,
  has_table_privilege('authenticated', 'public.profiles', 'UPDATE')  AS authenticated_can_table_update_profiles_expect_false,
  has_table_privilege('authenticated', 'public.profiles', 'DELETE')  AS authenticated_can_delete_profiles_expect_false,
  has_table_privilege('anon', 'public.profiles', 'SELECT')           AS anon_can_select_profiles_expect_false,
  has_table_privilege('anon', 'public.profiles', 'INSERT')           AS anon_can_insert_profiles_expect_false,
  has_table_privilege('anon', 'public.profiles', 'UPDATE')           AS anon_can_update_profiles_expect_false,
  has_table_privilege('anon', 'public.profiles', 'DELETE')           AS anon_can_delete_profiles_expect_false,

  -- profiles column-level UPDATE: exactly full_name, level, exam_session
  -- for authenticated; every other column must be false. Note this is
  -- deliberately independent of authenticated_can_table_update_profiles_
  -- expect_false above — GRANT UPDATE (col1, col2) grants column-level
  -- privilege without granting table-level UPDATE, so both must be
  -- checked to confirm the migration's intended shape.
  has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE')    AS authenticated_can_update_full_name,
  has_column_privilege('authenticated', 'public.profiles', 'level', 'UPDATE')        AS authenticated_can_update_level,
  has_column_privilege('authenticated', 'public.profiles', 'exam_session', 'UPDATE') AS authenticated_can_update_exam_session,
  has_column_privilege('authenticated', 'public.profiles', 'username', 'UPDATE')     AS authenticated_can_update_username_expect_false,
  has_column_privilege('authenticated', 'public.profiles', 'onboarded_at', 'UPDATE') AS authenticated_can_update_onboarded_at_expect_false,
  has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE')           AS authenticated_can_update_id_expect_false,
  has_column_privilege('authenticated', 'public.profiles', 'created_at', 'UPDATE')   AS authenticated_can_update_created_at_expect_false,
  has_column_privilege('authenticated', 'public.profiles', 'updated_at', 'UPDATE')   AS authenticated_can_update_updated_at_expect_false,

  -- tasks: authenticated should have full CRUD; anon: none.
  has_table_privilege('authenticated', 'public.tasks', 'SELECT') AS authenticated_can_select_tasks,
  has_table_privilege('authenticated', 'public.tasks', 'INSERT') AS authenticated_can_insert_tasks,
  has_table_privilege('authenticated', 'public.tasks', 'UPDATE') AS authenticated_can_update_tasks,
  has_table_privilege('authenticated', 'public.tasks', 'DELETE') AS authenticated_can_delete_tasks,
  has_table_privilege('anon', 'public.tasks', 'SELECT')          AS anon_can_select_tasks_expect_false,
  has_table_privilege('anon', 'public.tasks', 'INSERT')          AS anon_can_insert_tasks_expect_false,
  has_table_privilege('anon', 'public.tasks', 'UPDATE')          AS anon_can_update_tasks_expect_false,
  has_table_privilege('anon', 'public.tasks', 'DELETE')          AS anon_can_delete_tasks_expect_false,

  -- tasks_id_seq: authenticated should have USAGE + SELECT; anon: none.
  has_sequence_privilege('authenticated', 'public.tasks_id_seq', 'USAGE')  AS authenticated_can_use_tasks_id_seq,
  has_sequence_privilege('authenticated', 'public.tasks_id_seq', 'SELECT') AS authenticated_can_select_tasks_id_seq,
  has_sequence_privilege('anon', 'public.tasks_id_seq', 'USAGE')          AS anon_can_use_tasks_id_seq_expect_false,
  has_sequence_privilege('anon', 'public.tasks_id_seq', 'SELECT')         AS anon_can_select_tasks_id_seq_expect_false;

-- 11. Raw ACL dump for cross-reference with the matrix above (grantee OID 0
--     is PUBLIC and does not cast cleanly to regrole, so it is labelled
--     explicitly). Expect PUBLIC to hold zero rows on either table/sequence
--     — this is what the Stop 2 hardening pass's explicit
--     "REVOKE ... FROM PUBLIC" statements are verified against.
SELECT c.relname AS table_name,
       CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END AS grantee,
       a.privilege_type, a.is_grantable
FROM pg_class c
CROSS JOIN LATERAL aclexplode(c.relacl) a
WHERE c.relnamespace = 'public'::regnamespace AND c.relname IN ('profiles', 'tasks', 'tasks_id_seq')
ORDER BY table_name, grantee, privilege_type;

-- ============================================================================
-- 12. FUNCTION EXECUTE PRIVILEGE — do not assume an empty ACL means "no
-- access". The function OWNER always retains implicit EXECUTE regardless of
-- REVOKE statements; that is expected and is not a finding. What must be
-- verified is that anon and authenticated specifically cannot execute, and
-- that PUBLIC holds no grant that either role could inherit.
-- ============================================================================
SELECT
  has_function_privilege('anon', 'public.lockdin_handle_new_user()', 'EXECUTE')
    AS anon_can_execute_handle_new_user_expect_false,
  has_function_privilege('authenticated', 'public.lockdin_handle_new_user()', 'EXECUTE')
    AS authenticated_can_execute_handle_new_user_expect_false,
  has_function_privilege('anon', 'public.lockdin_set_profiles_updated_at()', 'EXECUTE')
    AS anon_can_execute_set_updated_at_expect_false,
  has_function_privilege('authenticated', 'public.lockdin_set_profiles_updated_at()', 'EXECUTE')
    AS authenticated_can_execute_set_updated_at_expect_false;

-- 12b. Explicit PUBLIC-grant check on both functions (expect ZERO rows —
--      confirms no inherited execute access via PUBLIC for any role,
--      including future roles not yet created).
SELECT p.proname,
       CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END AS grantee,
       a.privilege_type
FROM pg_proc p
CROSS JOIN LATERAL aclexplode(p.proacl) a
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('lockdin_handle_new_user', 'lockdin_set_profiles_updated_at')
  AND a.grantee = 0;

-- 13. Function existence, SECURITY DEFINER flag, and search_path setting
SELECT p.proname, p.prosecdef AS security_definer, p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('lockdin_handle_new_user', 'lockdin_set_profiles_updated_at');

-- 14. Triggers on auth.users. Must be a SUPERSET of whatever the
--     pre-migration audit found — lockdin_on_auth_user_created added,
--     nothing pre-existing removed.
SELECT tgname, tgenabled, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'auth' AND c.relname = 'users' AND NOT t.tgisinternal
ORDER BY tgname;

-- 15. Trigger on profiles (updated_at maintenance)
SELECT tgname, tgenabled, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'profiles' AND NOT t.tgisinternal
ORDER BY tgname;

-- ============================================================================
-- NOT COVERED BY STATIC PRIVILEGE CHECKS — requires runtime session testing,
-- deferred to a later, explicitly authorised step (not performed here):
--   - "authenticated can SELECT its own profile" in the RLS sense (i.e. a
--     real authenticated session, via auth.uid(), only sees its own row)
--     cannot be proven by has_table_privilege() alone — that only proves
--     the table-level grant exists. It must be proven by an actual
--     authenticated request (e.g. two test users, cross-check row
--     visibility) once real Auth sessions exist. Table/column/sequence
--     privilege checks above are a necessary precondition for that test,
--     not a replacement for it.
-- ============================================================================

-- Decision checklist (human):
--   [ ] profiles_table_exists = true
--   [ ] tasks.user_id present, nullable
--   [ ] total_task_count (#3) matches the pre-migration audit's task_count
--   [ ] missing_profile_count = 0 and orphan_profile_count = 0 (#3a)
--   [ ] policies (#9) use (select auth.uid()) = id / = user_id
--   [ ] privilege matrix (#10) matches every "_expect_..." column exactly,
--       including authenticated_can_table_update_profiles_expect_false =
--       false while authenticated_can_update_full_name/level/exam_session
--       = true (table-level UPDATE denied, column-level UPDATE allowed)
--   [ ] PUBLIC ACL rows (#11, #12b) are empty for profiles/tasks/sequence/functions
--   [ ] function EXECUTE checks (#12) are all false for anon/authenticated
--   [ ] auth.users trigger list (#14) is a superset of the pre-migration list
