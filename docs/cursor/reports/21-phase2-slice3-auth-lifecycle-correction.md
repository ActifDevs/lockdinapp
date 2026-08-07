# Phase 2 Slice 3 — Final Auth Lifecycle Correction

**Status:** Auth lifecycle corrections implemented, validated against **local Supabase only**, committed and pushed to `auth-and-tasks` for remote review.
**Review commit:** `93215a02c49fe34d0b27b47ac849e049799228a6` — `fix(auth): harden profile loading lifecycle`
**Hosted Supabase untouched. `main` unchanged. Not merged. Not deployed.**

---

## 1. Starting commit

```
branch: auth-and-tasks
required Slice 3 review commit: c4c036d399200eb9aa4b8fa42b8406dc646bbc79
actual HEAD at start of this patch:
  823a2ae037269fed4e6414825a981509bc0587ae
  (docs-only follow-up: "docs: correct Slice 3 report commit status")
origin/auth-and-tasks at start = 823a2ae… (same)
lifecycle review HEAD = origin/auth-and-tasks =
  93215a02c49fe34d0b27b47ac849e049799228a6
origin/main = 5f1fbf43cda2cf055c67ce123b1add04bacbb0b4 (unchanged)
working tree: clean at start
```

No reset/rebase/stash. Patch applied on top of `823a2ae` because that docs commit already existed on the branch after the approved Slice 3 feature commit.

---

## 2. Files changed

- `artifacts/revision-platform/src/components/auth-provider.tsx`
- `artifacts/revision-platform/src/components/auth-provider.test.tsx`
- `artifacts/revision-platform/src/components/require-auth.test.tsx`
- `artifacts/revision-platform/src/pages/update-password.tsx`
- `artifacts/revision-platform/src/pages/login.tsx`
- `artifacts/revision-platform/src/pages/auth-pages.test.ts`
- `artifacts/revision-platform/src/pages/update-password.test.tsx` (rendered interaction tests)
- `docs/cursor/reports/21-phase2-slice3-auth-lifecycle-correction.md`

No migrations, API routes, OpenAPI, generated clients, dependencies, lockfile, or env files changed.

---

## 3. Sign-in loading-state correction

For `INITIAL_SESSION`, `SIGNED_IN`, `USER_UPDATED`, and `PASSWORD_RECOVERY` when a session user exists:

1. `isLoading` is set `true` before profile resolution.
2. On user-id change: protected React Query cache is cleared and previous `AuthUser` is cleared.
3. New session-user id is recorded.
4. Profile resolution is scheduled outside the auth callback.
5. `isLoading` becomes `false` only after a matching profile is applied, or after safe failure disposition.
6. Stale request/user checks are preserved.

During a pending sign-in profile request:

- `isAuthenticated === true`
- `isLoading === true`
- `user` not yet applied → `isOnboarded === false`

Route guards therefore render `PageLoader`, not onboarding or dashboard.

`TOKEN_REFRESHED` still preserves the already-resolved profile without refetching.

---

## 4. Profile retry behaviour

Initial profile resolution uses:

```ts
PROFILE_RETRY_DELAYS_MS = [0, 150, 400]
```

Each attempt waits, calls `getCurrentProfile()`, and stops on first success while preserving stale-user/request guards.

---

## 5. Profile-failure disposition

Removed `applyProfile(sessionUser, null)`.

After all retries fail:

1. No metadata-only / null-profile `AuthUser` is applied.
2. `isOnboarded` is not set from a synthetic null profile.
3. Protected application state is cleared (`clearProtectedState`, including `isLoading = false`).
4. Local `signOut()` runs.
5. Navigation goes to `/login?reason=profile-load`.
6. No raw API/Supabase/profile/token details are shown.

Login shows the generic message:

“We couldn't load your account. Please sign in again.”

Duplicate logout from the global 401 handler remains harmless via the existing `loggingOut` guard.

---

## 6. Auth-callback scheduling change

`onAuthStateChange` remains synchronous. Profile/API work is scheduled with `queueMicrotask(() => { void fetchProfileForUser(...) })`. No manual token parsing or storage.

---

## 7. Password-update sign-out behaviour

`update-password.tsx` now:

```ts
await updatePassword(password);
await logout();
```

Removed `setTimeout(... /login)` and `useLocation`. Success signs out the recovery session, clears protected query state, and lands on `/login` without bouncing to dashboard. Duplicate submit is blocked while the sequence runs.

---

## 8. New provider tests

Added/kept in `auth-provider.test.tsx`:

- deferred SIGNED_IN profile: authenticated + loading, user not applied, then onboarded after resolve;
- profile failure across retries: no null user, cache cleared, `signOut`, `/login?reason=profile-load`, raw error not rendered;
- existing stale User A / User B protection retained.

---

## 9. New route-guard test

`require-auth.test.tsx` proves authenticated + loading shows `PageLoader` and never onboarding/dashboard/login children; after onboarded resolve, dashboard children render without visiting onboarding. `RedirectIfAuthenticated` also stays on loader while authenticated profile is resolving.

---

## 10. Password-reset test

`update-password.test.tsx` (rendered) proves:

- short / mismatched passwords rejected without `updatePassword` / `logout`;
- valid recovery session path calls `updatePassword` once then `logout` after success;
- no 1200ms `setTimeout` navigation;
- failed update does not call `logout`.

Source wiring assertions in `auth-pages.test.ts` updated accordingly.

---

## 11. Targeted browser-smoke result

**Interactive browser smoke test: passed** (local Supabase + local API `:3001` + local Vite `:5173` only).

| Check | Result |
| --- | --- |
| Sign in already-onboarded disposable user with delayed GET `/api/profile` | Pass |
| Onboarding never appears while profile delayed | Pass |
| Dashboard after profile resolves | Pass |
| Local recovery link → update password | Pass |
| Recovery session signs out to `/login` | Pass |
| Remains on `/login` (no dashboard bounce) | Pass |
| Sign in with new password → dashboard | Pass |

Google live OAuth remains unverified.

---

## 12. Unit/integration/typecheck/build results

- `pnpm install --frozen-lockfile` — pass
- `pnpm --filter @workspace/db generate` — “No schema changes, nothing to migrate”
- `pnpm typecheck` — pass
- `pnpm --filter @workspace/api-server test` — 24/24 pass
- `pnpm --filter @workspace/revision-platform test` — 59/59 pass
- `pnpm --filter @workspace/api-server test:integration` — 13/13 pass, **0 skipped**, loopback only
- `PORT=5173 BASE_PATH=/ pnpm build` — pass
- `git diff --check` — clean

---

## 13. Confirmation no migration changed

`git diff` against migrations is empty. `0001` and `0002` untouched. No new migration generated.

---

## 14. Confirmation hosted Supabase was untouched

No hosted Dashboard access, SQL, Auth changes, or env writes to hosted project during this correction.

---

## 15. Confirmation nine hosted tasks were untouched

No hosted task delete/update/select performed.

---

## 16. Confirmation main was unchanged

`origin/main` remains `5f1fbf43cda2cf055c67ce123b1add04bacbb0b4`. No merge into `main`. Lifecycle correction was pushed only to `auth-and-tasks`.

---

## 17. Remaining blockers

- Hosted migrations **0001** and **0002** are not yet applied.
- Nine hosted prototype tasks remain.
- Google OAuth provider still needs hosted configuration and live verification.
- `user_subjects` remains deferred.
- Subject component selection remains deferred.
- Hosted cutover remains separately gated.

---

## 18. Review commit

Review commit on `auth-and-tasks`:

```
93215a02c49fe34d0b27b47ac849e049799228a6
fix(auth): harden profile loading lifecycle
```

Branch URL: https://github.com/ActifDevs/lockdinapp/tree/auth-and-tasks

This report header was later corrected to reflect the pushed review commit.

---

## Stop

Committed and pushed to `auth-and-tasks` for remote code inspection only.
**Do not merge / apply hosted SQL / delete hosted tasks / deploy / begin hosted cutover** until separately approved.