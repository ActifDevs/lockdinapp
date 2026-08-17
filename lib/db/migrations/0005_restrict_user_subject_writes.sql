-- Membership changes must go through the transactional onboarding and
-- replacement functions. Authenticated Data API access is intentionally
-- read-only; the owner-scoped SELECT policy remains in place.
DROP POLICY IF EXISTS "user_subjects_insert_own" ON public.user_subjects;
--> statement-breakpoint
DROP POLICY IF EXISTS "user_subjects_update_own" ON public.user_subjects;
--> statement-breakpoint
DROP POLICY IF EXISTS "user_subjects_delete_own" ON public.user_subjects;
--> statement-breakpoint

REVOKE ALL PRIVILEGES ON TABLE public.user_subjects FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.user_subjects TO authenticated;
