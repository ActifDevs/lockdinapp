-- Phase 2 FINAL CUTOVER PREFLIGHT — STRICTLY READ-ONLY.
--
-- Run ONLY inside BEGIN TRANSACTION READ ONLY; ...; ROLLBACK;
-- This script performs NO writes, NO DDL, NO GRANT/REVOKE, NO COPY,
-- NO DO blocks, NO CALLs. All queries are aggregate SELECTs over the
-- system catalogue or count aggregates over user tables.
--
-- PRIVACY / SANITISATION:
--   * Never selects: emails, UUIDs, task titles, names, usernames,
--     notes, metadata, credentials, tokens, or connection strings.
--   * Only returns: existence booleans, counts, policy/function/trigger
--     NAMES (names of lockdin_* identifiers are non-sensitive catalog
--     names), and aggregate counts.
--
-- Resilience: runs cleanly even when public.profiles is absent OR
-- tasks.user_id is absent (the pre-cutover state). No query assumes
-- either object exists; we use information_schema / to_regclass /
-- EXISTS / CASE / LEFT JOIN guards throughout.

-- ------------------------------------------------------------------
-- 1. Auth-user count.
-- ------------------------------------------------------------------
SELECT count(*) AS auth_user_count
FROM auth.users;

-- ------------------------------------------------------------------
-- 2. Task count (public.tasks assumed present by Phase 2 scope; safe
--    count guard via CASE if missing).
-- ------------------------------------------------------------------
SELECT CASE
         WHEN to_regclass('public.tasks') IS NOT NULL
         THEN (SELECT count(*) FROM public.tasks)
         ELSE 0
       END AS task_count;

-- ------------------------------------------------------------------
-- 3. public.profiles existence.
-- ------------------------------------------------------------------
SELECT to_regclass('public.profiles') IS NOT NULL AS profiles_table_exists;

-- ------------------------------------------------------------------
-- 4. tasks.user_id existence.
-- 5. When present: is_nullable.
-- 6. When present: unowned-task count.
-- ------------------------------------------------------------------
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'tasks'
    AND column_name = 'user_id'
) AS tasks_user_id_exists;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tasks'
  AND column_name = 'user_id';

SELECT CASE
  WHEN EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'user_id'
  )
  THEN (
    SELECT count(*)
    FROM public.tasks AS task_row
    WHERE to_jsonb(task_row)->>'user_id' IS NULL
  )
  ELSE NULL::bigint
END AS unowned_task_count;

-- ------------------------------------------------------------------
-- 7. Tasks RLS enabled.
-- 8. Tasks FORCE RLS enabled.
-- ------------------------------------------------------------------
SELECT
  c.relrowsecurity AS tasks_rls_enabled,
  c.relforcerowsecurity AS tasks_rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'tasks';

-- ------------------------------------------------------------------
-- 9. Task policy names (distinct, sorted) AND policy count.
-- ------------------------------------------------------------------
SELECT
  count(*)       AS task_policy_count,
  array_agg(pol.polname ORDER BY pol.polname) AS task_policy_names
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'tasks';

-- ------------------------------------------------------------------
-- 10. Profile policy names AND policy count (graceful if no policies
--     because profiles does not exist — returns count=0 / NULL names).
-- ------------------------------------------------------------------
SELECT
  count(*)       AS profile_policy_count,
  array_agg(pol.polname ORDER BY pol.polname) AS profile_policy_names
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'profiles';

-- ------------------------------------------------------------------
-- 11. Presence of lockdin_* functions:
--     - lockdin_handle_new_user
--     - lockdin_set_profiles_updated_at
--     - lockdin_complete_onboarding
-- ------------------------------------------------------------------
SELECT p.proname AS existing_function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'lockdin_handle_new_user',
    'lockdin_set_profiles_updated_at',
    'lockdin_complete_onboarding'
  )
ORDER BY p.proname;

SELECT
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'lockdin_handle_new_user')
    AS fn_lockdin_handle_new_user_present,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'lockdin_set_profiles_updated_at')
    AS fn_lockdin_set_profiles_updated_at_present,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'lockdin_complete_onboarding')
    AS fn_lockdin_complete_onboarding_present;

-- ------------------------------------------------------------------
-- 12. Presence of triggers:
--     - lockdin_on_auth_user_created  (on auth.users)
--     - lockdin_profiles_set_updated_at  (on public.profiles)
-- ------------------------------------------------------------------
SELECT t.tgname AS existing_trigger_name, c.relname AS on_table
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal
  AND t.tgname IN ('lockdin_on_auth_user_created',
                   'lockdin_profiles_set_updated_at')
ORDER BY t.tgname;

SELECT
  EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND n.nspname = 'auth'
      AND c.relname = 'users'
      AND t.tgname = 'lockdin_on_auth_user_created'
  ) AS trg_lockdin_on_auth_user_created_present,
  EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND c.relname = 'profiles'
      AND t.tgname = 'lockdin_profiles_set_updated_at'
  ) AS trg_lockdin_profiles_set_updated_at_present;

-- ------------------------------------------------------------------
-- 13. Drizzle migration-record count.
--     Drizzle-kit writes to its own journal table at drizzle.__drizzle_migrations.
--     The estimate below uses pg_stat_user_tables to avoid direct query
--     before table existence is confirmed. An exact count may be queried
--     separately only after table existence has been verified:
--       SELECT count(*) AS drizzle_migration_record_count
--       FROM drizzle.__drizzle_migrations;
-- ------------------------------------------------------------------
SELECT
  to_regclass('drizzle.__drizzle_migrations') IS NOT NULL
    AS drizzle_migration_table_exists,
  COALESCE(
    (
      SELECT n_live_tup::bigint
      FROM pg_stat_user_tables
      WHERE schemaname = 'drizzle'
        AND relname = '__drizzle_migrations'
    ),
    0
  ) AS drizzle_migration_record_estimate;

-- ------------------------------------------------------------------
-- 14. Subject count.
-- 15. Syllabus-topic count.
-- 16. Assessment-component count.
-- 17. Past-paper-attempt count.
-- 18. Exam-date count.
-- ------------------------------------------------------------------
SELECT CASE WHEN to_regclass('public.subjects') IS NOT NULL
            THEN (SELECT count(*) FROM public.subjects) ELSE 0
       END AS subject_count;

SELECT CASE WHEN to_regclass('public.syllabus_topics') IS NOT NULL
            THEN (SELECT count(*) FROM public.syllabus_topics) ELSE 0
       END AS syllabus_topic_count;

SELECT CASE WHEN to_regclass('public.assessment_components') IS NOT NULL
            THEN (SELECT count(*) FROM public.assessment_components) ELSE 0
       END AS assessment_component_count;

SELECT CASE WHEN to_regclass('public.past_paper_attempts') IS NOT NULL
            THEN (SELECT count(*) FROM public.past_paper_attempts) ELSE 0
       END AS past_paper_attempt_count;

SELECT CASE WHEN to_regclass('public.exam_dates') IS NOT NULL
            THEN (SELECT count(*) FROM public.exam_dates) ELSE 0
       END AS exam_date_count;
