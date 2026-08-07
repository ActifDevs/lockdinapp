# Phase 2 Slice 3 — Real Frontend Auth, Atomic Onboarding and Session Wiring

**Status:** Slice 3 implemented, validated against **local Supabase only**, committed and pushed to `auth-and-tasks` for remote review.
**Review commit:** `c4c036d399200eb9aa4b8fa42b8406dc646bbc79` — `feat(auth): add frontend sessions and atomic onboarding`
**Hosted Supabase untouched. `main` unchanged. Not merged. Not deployed.**

---

## 1. Starting branch and commit

```
branch: auth-and-tasks
starting HEAD (pre-Slice 3): 82f4b1cb10d7e2fb94f5b484e3ea63961c2fd356
review HEAD = origin/auth-and-tasks = c4c036d399200eb9aa4b8fa42b8406dc646bbc79
origin/main = 5f1fbf43cda2cf055c67ce123b1add04bacbb0b4 (unchanged)
```

Baseline before edits: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `@workspace/api-server` unit + integration, `@workspace/revision-platform` unit — all passed on the starting commit.

---

## 2. Exact files changed

### New

- `lib/db/migrations/0002_phase2_atomic_onboarding.sql`
- `lib/db/migrations/meta/0002_snapshot.json`
- `artifacts/api-server/src/routes/profile.ts`
- `artifacts/api-server/src/routes/profile.integration.test.ts`
- `artifacts/revision-platform/src/lib/supabase-browser.ts`
- `artifacts/revision-platform/src/lib/app-url.ts`
- `artifacts/revision-platform/src/lib/exam-sessions.ts`
- `artifacts/revision-platform/src/lib/onboarding-logic.ts`
- `artifacts/revision-platform/src/components/auth-provider.tsx`
- `artifacts/revision-platform/src/pages/auth-callback.tsx`
- `artifacts/revision-platform/src/pages/update-password.tsx`
- `artifacts/revision-platform/src/test/setup.ts`
- Frontend unit tests:
  - `auth-provider.test.tsx`
  - `require-auth.test.tsx`
  - `auth-utils.test.ts`
  - `onboarding-logic.test.ts`
  - `custom-fetch.unauthorized.test.ts`
  - `auth-pages.test.ts`
- Generated OpenAPI clients:
  - `lib/api-zod/src/generated/types/profile.ts`
  - `lib/api-zod/src/generated/types/profileUpdate.ts`
  - `lib/api-zod/src/generated/types/completeOnboardingInput.ts`
- This report: `docs/cursor/reports/20-phase2-slice3-frontend-auth-and-onboarding.md`

### Modified

- `lib/db/migrations/meta/_journal.json` (0002 journal entry only; 0001 untouched)
- `artifacts/api-server/src/routes/index.ts` (mount profile router)
- `artifacts/api-server/src/lib/enrich-task.ts` (lazy DB import for unit-test isolation)
- `lib/api-spec/openapi.yaml` (Profile schemas + operations)
- `lib/api-client-react/src/custom-fetch.ts` (`setUnauthorizedHandler`)
- `lib/api-client-react/src/index.ts` (exports; deduped generated re-exports)
- `lib/api-client-react/src/generated/api.ts` / `api.schemas.ts` (Orval)
- `lib/api-zod/src/generated/api.ts` / `types/index.ts` (Orval)
- `artifacts/revision-platform/package.json` (+ `@supabase/supabase-js`, test deps)
- `artifacts/revision-platform/vitest.config.ts` (jsdom + React plugin)
- `artifacts/revision-platform/src/App.tsx`
- `artifacts/revision-platform/src/hooks/use-auth.ts`
- `artifacts/revision-platform/src/components/require-auth.tsx`
- `artifacts/revision-platform/src/components/app-shell.tsx`
- `artifacts/revision-platform/src/pages/login.tsx`
- `artifacts/revision-platform/src/pages/signup.tsx`
- `artifacts/revision-platform/src/pages/forgot-password.tsx`
- `artifacts/revision-platform/src/pages/onboarding.tsx`
- `artifacts/revision-platform/src/pages/settings.tsx`
- `pnpm-lock.yaml`

---

## 3. Dependency and lockfile changes

- Frontend: `@supabase/supabase-js@^2.111.0` (same major as API server).
- Frontend test tooling: `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@testing-library/dom`.
- Lockfile updated via pnpm workspace add workflow.
- **Not added:** `@supabase/ssr`, Axios, alternate Auth libraries, extra client state libraries, service-role packages in the frontend.

---

## 4. Browser Supabase client design

`artifacts/revision-platform/src/lib/supabase-browser.ts`:

- Reads only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (documented in `.env.example`).
- Throws a clear configuration error when either is missing.
- Never prints the real values.
- Never references `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL`.
- Exports one singleton client via `getSupabaseBrowserClient()` with:

```ts
auth: {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
}
```

`getAppUrl(path)` in `app-url.ts` respects `import.meta.env.BASE_URL` and `window.location.origin`.

---

## 5. AuthProvider state model

`AuthProvider` owns a single shared Auth context:

| Field | Meaning |
| --- | --- |
| `isLoading` | Initial session/profile resolution in flight |
| `isAuthenticated` | Supabase session user present |
| `isOnboarded` | `profile.onboardedAt !== null` |
| `user` | `AuthUser` combining session id/email + profile fields |
| `firstName` | Derived from profile/full name |

Actions (all Promise-based): `login`, `signUp`, `signInWithGoogle`, `logout`, `refreshProfile`, `completeOnboarding`, `updateUser`, `requestPasswordReset`, `updatePassword`.

Obsolete fake keys cleared once on mount: `lockdin_auth`, `lockdin_user`, `onboarded`, `lockdin_subject_codes`. Supabase session storage keys are left alone.

---

## 6. Session restoration and refresh behaviour

- Mount registers `onAuthStateChange` once and resolves `getSession()`.
- Handles `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`, `PASSWORD_RECOVERY`.
- Callback itself is not async; profile fetches are kicked off with `void`.
- `TOKEN_REFRESHED` keeps existing profile state (no unnecessary refetch).
- Stale profile responses are discarded when request id / session user id no longer match.
- User-id change clears React Query cache before applying the new profile.
- Unmount unsubscribes and clears token/unauthorized handlers.

---

## 7. Bearer-token wiring

`setAuthTokenGetter(async () => session?.access_token ?? null)` using `supabase.auth.getSession()`.
API requests continue through existing `customFetch` bearer plumbing. No manual token persistence in app code.

---

## 8. Global 401 handling

`lib/api-client-react/src/custom-fetch.ts`:

- `setUnauthorizedHandler` / `UnauthorizedHandler` exported.
- On non-OK responses: parse error → build `ApiError` → if status is 401, schedule handler via `queueMicrotask` + `Promise.resolve().then(() => handler())` (sync throws swallowed) → throw original `ApiError`.
- AuthProvider registers handler to `logout()` (clear cache, local sign-out, `/login`) without redirect loops.

---

## 9. Email/password login result

Login page calls `await login(email, password)` → `supabase.auth.signInWithPassword`.
Safe errors only:

- invalid credentials → “Email or password is incorrect.”
- other failures → “We couldn't sign you in. Please try again.”

No `setTimeout` simulation. No name accepted at login. Safe `next` query honored only for same-origin app paths after Auth resolves.

---

## 10. Signup and email-confirmation behaviour

`signUp` calls `supabase.auth.signUp` with `options.data.full_name` and `emailRedirectTo: getAppUrl("/auth/callback")`.
Returns `{ sessionAvailable, emailConfirmationRequired }`.

- Immediate session → Auth guards route toward onboarding.
- Confirmation required → signup shows confirmation panel + “Back to login”; user is not pretended authenticated.
- Username is **not** collected at signup.

---

## 11. Google OAuth implementation and unverified manual prerequisites

Frontend calls:

```ts
supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: getAppUrl("/auth/callback") },
});
```

Unit-tested for provider `google` + callback URL.
**Live Google OAuth is not verified** in this slice (no Google client credentials invented; hosted Dashboard not accessed).

Later manual hosted prerequisites:

- Google provider enabled in Supabase Auth
- Authorised Google OAuth redirect URI
- Supabase Site URL
- Allowed application callback URL (`/auth/callback`)

---

## 12. Password-reset implementation

- Forgot-password → `resetPasswordForEmail` with `redirectTo: getAppUrl("/update-password")`.
- Always shows: “If an account exists for that email, a password-reset link has been sent.”
- `/update-password` requires ≥8 chars + matching confirmation; calls `updateUser({ password })`; safe expired-session messaging; redirects to `/login` after success.

---

## 13. Profile API routes

`artifacts/api-server/src/routes/profile.ts` (mounted under `/api`):

| Method | Path | Behaviour |
| --- | --- | --- |
| GET | `/api/profile` | Authenticated caller’s profile only |
| PATCH | `/api/profile` | `fullName` / `level` / `examSession` only |
| POST | `/api/profile/complete-onboarding` | RPC only — no Express task loop |

All use `requireAuth` + `createUserScopedSupabaseClient(req.accessToken)` + `id = req.userId`.
No service-role client. Forbidden body keys (`id`, `userId`, `username`, `onboardedAt`, …) rejected.
Errors mapped to safe 400 / 401 / 409 / 500 (no SQL/PostgREST leakage).

Generated client names:

- `getCurrentProfile`
- `updateCurrentProfile`
- `completeCurrentUserOnboarding`

---

## 14. Migration 0002 filename and complete function summary

**File:** `lib/db/migrations/0002_phase2_atomic_onboarding.sql`
**Name:** `phase2_atomic_onboarding` (Drizzle custom migration; journal updated).

Creates `public.lockdin_complete_onboarding(p_full_name, p_username, p_level, p_exam_session, p_subject_ids integer[])`:

- `RETURNS public.profiles`
- `SECURITY DEFINER` + `SET search_path = ''`
- Caller identity exclusively from `auth.uid()` (no user-id argument)
- Locks profile row; validates inputs; lowercases username
- Sets `username` + `onboarded_at` + study fields
- Inserts one starter task per selected subject (1–3)
- Idempotent when already onboarded with the same username
- Unique username conflicts → `username_unavailable`

---

## 15. Function privileges

Verified on local Supabase after migrate:

| Role | EXECUTE |
| --- | --- |
| PUBLIC | no |
| anon | no |
| authenticated | yes |

Also verified: `prosecdef = true`, `search_path=""`, args contain no user-id parameter.

---

## 16. Atomic onboarding behaviour

Express calls only `supabase.rpc("lockdin_complete_onboarding", …)`.
Profile update + starter-task inserts occur inside the SQL function transaction.
Retry with the same username returns the current profile without duplicating starter tasks.

---

## 17. Username validation and conflict handling

- Format: `^[a-z0-9_]{3,24}$` (normalised lowercase client + server).
- Uniqueness conflict → HTTP 409 `{ error: "Username is unavailable." }` (no peer identity).
- Onboarding UI maps username 409 to “That username is already taken.” and returns to the username step.
- Already-completed onboarding with a different username → 409 generic already-completed.

---

## 18. Starter-task creation behaviour

Per selected subject (max 3):

- title: `Review <subject> syllabus overview`
- `user_id` = caller
- `deadline` = `CURRENT_DATE`
- `priority` = `medium`
- `estimated_minutes` = 30

No `user_subjects` rows. No subject catalogue mutation.

---

## 19. Subject-picker behaviour

Onboarding fetches shared catalogue via generated `GET /api/subjects` (`useListSubjects`).
Search by name/code; select 1–3 real subject IDs; UI copy states selections create first revision tasks (not permanent membership).
Does **not** call `POST/DELETE /api/subjects`, `createSubject`, or `createTask`.

---

## 20. Settings rewiring

- Profile fields from AuthProvider/API: full name editable; level/exam session editable; email + username read-only.
- Saves via `PATCH /api/profile` then updates Auth state.
- Subject create/delete UI removed; read-only Cambridge catalogue explanation retained.
- Notification preferences remain browser-local.

---

## 21. Removed fake localStorage assumptions

Obsolete keys remain only in AuthProvider’s one-time cleanup list.
Route guards and pages no longer trust `lockdin_auth` / `lockdin_user` / `"onboarded"` / `lockdin_subject_codes`.
No fake login `setTimeout`. Onboarding/settings no longer create/delete subjects.
`SUBJECT_CATALOG` remains only for accent/display helpers — not onboarding’s source of truth.

---

## 22. Unit-test results

`pnpm --filter @workspace/revision-platform test`

```
Test Files  7 passed (7)
Tests       49 passed (49)
```

Coverage includes: Supabase browser config, `getAppUrl`, exam-session utility, AuthProvider session/onboarding/login/signup/Google/logout/SIGNED_OUT/TOKEN_REFRESHED/stale-profile/401 registration, route guards, auth-page wiring, onboarding logic, unauthorized handler (401 vs 403, handler failure isolation).

`pnpm --filter @workspace/api-server test`

```
Test Files  9 passed (9)
Tests       24 passed (24)
```

---

## 23. Local integration-test results (zero skipped)

`pnpm --filter @workspace/api-server test:integration`

- Loopback guard: 11/11 pass, 0 skipped.
- Vitest integration: **2 files, 13 tests, 0 skipped**, all passed (existing task isolation + new profile/onboarding suite).

Local URLs used: `http://127.0.0.1:54321` (API) and `postgresql://…@127.0.0.1:54322/postgres` (DB). Hosted project not used.

---

## 24. Manual smoke-test results

**Interactive browser smoke test: passed**

Ran against **local Supabase + local API (`127.0.0.1:3001`) + local Vite (`127.0.0.1:5173`) only**.
Servers were started with explicit loopback env overrides (not the hosted `.env.local` `DATABASE_URL`).
Driver: Playwright Chromium against the live UI (27/27 checklist assertions).

| Step | Result |
| --- | --- |
| A. Signed-out `/dashboard` → `/login?next=…`; no dashboard content leak | Pass |
| B. Disposable email/password signup; no username on signup; session → `/onboarding` | Pass |
| C. Mixed-case username lowercased; catalogue search by name/code; max 3 subjects; fourth disabled; Finish setup → `/dashboard`; 3 starter tasks; catalogue size unchanged | Pass |
| D. Browser refresh on `/dashboard` restores session (not login/onboarding) | Pass |
| E. Settings: email/username read-only; update name/level/session; Saved; values persist in DB + UI re-entry; no subject create/delete; Alerts switch toggles | Pass |
| F. Sign out → login; `/dashboard` redirects to login; re-login → own dashboard | Pass |
| G. Forgot-password shows enumeration-safe message only | Pass |
| H. `/auth/callback` with fake hash tokens shows safe error/login path; tokens not rendered | Pass |
| Cleanup | Disposable Auth user deleted (profile cascaded) |
| Google live OAuth | **Not verified** (no provider credentials) |

---

## 25. Typecheck/build results

- `pnpm install --frozen-lockfile` — pass
- `DATABASE_URL`/`DIRECT_DATABASE_URL` local-only: `pnpm --filter @workspace/db generate` → **“No schema changes, nothing to migrate”** (0002 custom migration retained; no accidental table migration)
- `pnpm typecheck` — pass
- `PORT=5173 BASE_PATH=/ pnpm build` — pass
- `git diff --check` — clean

---

## 26. Confirmation migration 0001 was unchanged

`git diff HEAD -- lib/db/migrations/0001_chilly_randall_flagg.sql` and `meta/0001_snapshot.json` are empty (0 bytes). Only journal gained the 0002 entry; 0001 SQL/snapshot untouched.

---

## 27. Confirmation no migration was applied to hosted Supabase

Migration `0002` was applied with `pnpm --filter @workspace/db migrate` using **local** `DATABASE_URL` / `DIRECT_DATABASE_URL` pointing at `127.0.0.1:54322` only. No hosted migrate command was run.

---

## 28. Confirmation hosted Supabase was untouched

No hosted Dashboard access, no hosted SQL, no hosted Auth/user changes, no hosted env writes during this slice.

---

## 29. Confirmation the nine hosted prototype tasks were untouched

No hosted task delete/update/select performed. Hosted prototype rows remain out of scope for this slice.

---

## 30. Confirmation main was unchanged

`origin/main` remains `5f1fbf43cda2cf055c67ce123b1add04bacbb0b4`. No merge into `main`. Slice 3 was pushed only to `auth-and-tasks`.

---

## 31. Remaining blockers

- Hosted migrations **0001** and **0002** are not yet applied.
- Nine hosted prototype tasks remain.
- Google OAuth provider still needs hosted configuration and live verification.
- `user_subjects` remains deferred.
- Subject component selection remains deferred.
- Hosted cutover remains separately gated.

---

## Privacy confirmation

Working-tree scan of Slice 3 sources/diff found no service-role keys, JWTs, Google client secrets, database URLs with credentials, or absolute local machine paths written into application code or this report. Disposable Auth UUIDs/credentials from tests and the interactive smoke run are not reproduced here.

---

## Branch review commit note

Review commit on `auth-and-tasks`:

- `c4c036d399200eb9aa4b8fa42b8406dc646bbc79`
- `feat(auth): add frontend sessions and atomic onboarding`
- Branch: https://github.com/ActifDevs/lockdinapp/tree/auth-and-tasks

That commit does **not** authorise hosted migration, hosted task deletion, `main` merge, deployment, production signup, or live Google OAuth.

This report header was later corrected locally to reflect the pushed review commit; that header-only fix may sit as a follow-up commit if/when re-pushed.
