# Phase 5 — Frontend cutover

**Precedes:** Phase 6. **Depends on:** Phases 2-4 complete — real auth,
every table multi-tenant, API hardened.

## What's actually left by this point

If Phase 2 was done right, the *implementation* inside `use-auth.ts` is
already Supabase-backed, and `custom-fetch.ts`'s `setAuthTokenGetter` is
already wired. Phase 5 is about removing the remaining localStorage-as-
source-of-truth assumptions that exist elsewhere in the frontend, and making
sure the flows that create data during signup (onboarding) write against
real, per-user tables instead of whatever local/mock model they used before
real accounts existed.

## Step-by-step

### 1. `require-auth.tsx` — verify, don't trust storage

`RequireAuth` and `RedirectIfAuthenticated` (in `components/require-auth.tsx`)
currently gate purely on `useAuth()`'s `isAuthenticated`/`isOnboarded`
booleans, which by Phase 5 should already be backed by a real Supabase
session if Phase 2 was implemented correctly. The thing worth double-checking
here specifically: does `useAuth()`'s `isAuthenticated` re-verify on mount
(e.g. via `supabase.auth.getSession()` resolving, or a subscribed
`onAuthStateChange` listener), or could a stale in-memory `true` survive
after a token has actually expired server-side? A route guard that trusts a
client-side boolean without re-checking against Supabase periodically (or at
least on every navigation) can let a user sit on a protected page with an
expired session until their next API call 401s — acceptable, but confirm
that 401 is actually caught and redirects to `/login` (see Phase 2's "common
failure modes" — same issue, different phase).

### 2. Kill localStorage as a source of truth, keep it as cache if you want

`lockdin_user`, `lockdin_auth`, `onboarded`, and `lockdin_subject_codes` are
all currently read as truth. Post Phase 2, the real Supabase session is
truth. It's fine to keep a localStorage cache for perceived-instant UI on
page reload (avoid a loading flicker while the session resolves), but every
one of those cached values must be treated as provisional and overwritten by
whatever the real session/DB says as soon as that resolves — never the
reverse.

### 3. `onboarding.tsx` — the flow that actually creates data

This is the one screen in the app that writes meaningful data on behalf of a
brand-new account (starter tasks per subject, initial subject selection).
Before Phase 5, it almost certainly wrote against a global/mock model since
there was no real per-user table to write into. Now that `user_subjects` and
`tasks.user_id` exist (Phase 3), this flow needs to:

1. Only run after a real `auth.users` row (and corresponding `profiles`
   row) exists for the new account.
2. Write subject selections into `user_subjects` scoped to the new
   `user_id`, not a global table.
3. Write any starter tasks into `tasks` with `user_id` set, going through
   the now-hardened API (Phase 4), not a direct client-side mock.

Check for a race condition here specifically: does the profile row exist
*before* onboarding tries to write subject selections that might FK against
it, or could a fast client beat the Phase-2 signup trigger/hook? If profile
creation is a DB trigger (Phase 2's option), this is less likely to race; if
it's app-code that fires after `signUp` resolves, confirm onboarding
actually waits for that to complete before proceeding.

### 4. `use-notification-prefs.ts` — a deliberately deferred decision, not forgotten

This hook manages notification preferences and, per earlier audit work, was
flagged as "worth persisting server-side once real accounts exist" — which
is now. This is a genuinely low-stakes call either way (nothing else depends
on it), so don't let indecision here block the rest of the cutover. Options:
add a `notification_prefs jsonb` column to `profiles` and migrate the hook
to read/write it via the API, or leave it client-only for one more release
cycle. Make the call, write it down, move on.

## What NOT to do

- Don't touch the frontend's hardcoded `SUBJECT_CATALOG` fallback here
  unless it's specifically in the way of a change you're making — Phase 1
  intentionally left this in place as an offline/loading fallback, and it's
  fine for it to keep existing alongside the real DB-backed data as a
  degrade-gracefully path, not something that needs to be surgically
  removed.
- Don't rewrite `use-auth.ts`'s public interface again in this phase — that
  was Phase 2's job, and if it's stable, downstream components shouldn't
  need touching just because Phase 5 exists.

## Cursor prompt

```
Read docs/lockdin-architecture-plan.md section 8 and this entire file
(docs/cursor/05-frontend-cutover.md) before starting. Assume Phases 2-4 are
complete: real Supabase auth, all tables multi-tenant with RLS, API
hardened with global auth middleware.

1. Read hooks/use-auth.ts as it currently stands (post-Phase-2) and tell me
   whether isAuthenticated re-verifies against a live Supabase session on
   mount/navigation, or could serve a stale true after server-side token
   expiry. If it's the latter, propose a fix (e.g. subscribing to
   supabase.auth.onAuthStateChange) before implementing anything else.
2. Grep the whole frontend for direct reads of lockdin_user, lockdin_auth,
   onboarded, and lockdin_subject_codes outside of use-auth.ts itself. For
   each match, tell me whether it's fine as an optimistic-UI cache (real
   session/DB value always wins once resolved) or is actually still being
   trusted as a source of truth, and fix the latter.
3. Update onboarding.tsx so subject selection writes to user_subjects and
   starter tasks write to tasks, both scoped to the new user's real
   user_id, going through the hardened API — not any leftover mock/local
   write path. Before doing this, check whether profile creation
   (Phase 2) is a DB trigger or app-code, and tell me whether onboarding
   could race ahead of it; propose a fix if so (e.g. awaiting profile
   creation explicitly before proceeding).
4. For use-notification-prefs.ts: give me your recommendation — server-side
   now via a profiles.notification_prefs jsonb column, or stay client-only
   for now — with brief reasoning, and wait for my one-line decision before
   implementing either path.

Do not remove or modify the SUBJECT_CATALOG frontend fallback unless it's
directly blocking a change you're making in this phase.
```

## Definition of done

- [ ] Session re-verification behavior on `isAuthenticated` confirmed (not
      assumed) and fixed if it was relying on a stale client-side boolean
- [ ] No remaining code path treats localStorage auth/onboarding keys as a
      source of truth (cache use is fine, trust use is not)
- [ ] Onboarding writes real per-user `user_subjects`/`tasks` rows through
      the hardened API, with the profile-creation race explicitly checked
- [ ] Notification-prefs persistence decision made and implemented (or
      explicitly deferred with a reason written down)
- [ ] A brand-new signup, end to end (signup → onboarding → dashboard),
      manually tested and confirmed to only ever see its own data

## Rollback

This phase is mostly frontend logic changes with no destructive migrations,
so rollback is a normal revert. The one thing to watch during rollout: if
onboarding's write path breaks mid-migration, new signups could end up
authenticated but with no `user_subjects`/starter `tasks` — not data
corruption, just an awkward empty state. Worth a quick manual signup test
immediately after deploying this phase, not just in CI.
