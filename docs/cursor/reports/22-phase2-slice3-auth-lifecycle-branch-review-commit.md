# Phase 2 Slice 3 — Auth Lifecycle Branch Review Commit & Push Report

**Status:** Auth lifecycle correction committed and pushed to `auth-and-tasks` for remote code inspection — **not merged, not applied to hosted Supabase, not approved for production**
**Branch:** `auth-and-tasks`
**Previous HEAD (pre-lifecycle commit):** `823a2ae037269fed4e6414825a981509bc0587ae` (`docs: correct Slice 3 report commit status`)
**Lifecycle review commit:** `93215a02c49fe34d0b27b47ac849e049799228a6`
**Commit message:** `fix(auth): harden profile loading lifecycle`
**Docs follow-up commit:** `4051162c2339b30e1adf9350b2199329950adb93` (`docs: correct auth lifecycle report commit status`)
**Current HEAD = origin/auth-and-tasks:** `4051162c2339b30e1adf9350b2199329950adb93`
**Remote:** Pushed to `origin/auth-and-tasks` (non-force)
**Migration applied to hosted:** **No**
**Hosted Supabase modified:** **No**
**Nine hosted prototype tasks:** **Untouched**
**`main` modified:** **No** (`origin/main` remains `5f1fbf43cda2cf055c67ce123b1add04bacbb0b4`)

This packages the Final Auth Lifecycle Correction documented in [`21-phase2-slice3-auth-lifecycle-correction.md`](./21-phase2-slice3-auth-lifecycle-correction.md) for remote review only. It does **not** authorise hosted migration application, prototype-task deletion, merge into `main`, deployment, or Phase 2 hosted cutover.

Related Slice 3 feature work remains on the same branch at `c4c036d` — see [`20-phase2-slice3-frontend-auth-and-onboarding.md`](./20-phase2-slice3-frontend-auth-and-onboarding.md).

---

## 1. What this commit fixed

Three lifecycle defects in frontend auth (no API/migration redesign):

1. **Profile loading race** — session events (`INITIAL_SESSION`, `SIGNED_IN`, `USER_UPDATED`, `PASSWORD_RECOVERY`) now set `isLoading = true` before profile resolution and schedule profile work outside the synchronous `onAuthStateChange` callback. Pending state is `isAuthenticated + isLoading + user = null`, so route guards show `PageLoader` instead of onboarding/dashboard.
2. **Null-profile fallback removed** — retries use `PROFILE_RETRY_DELAYS_MS = [0, 150, 400]`. After all failures: no metadata-only `AuthUser`, clear protected query state, `signOut()`, navigate to `/login?reason=profile-load` with a safe login message.
3. **Password-reset completion** — `await updatePassword(password); await logout();` with no delayed `setTimeout` navigation and no direct `setLocation("/login")`.

`TOKEN_REFRESHED` still preserves an already-resolved profile without refetching.

---

## 2. Safety check (before commit)

```
git fetch origin
git branch --show-current          → auth-and-tasks
git rev-parse HEAD                 → 823a2ae037269fed4e6414825a981509bc0587ae
git rev-parse origin/auth-and-tasks → 823a2ae037269fed4e6414825a981509bc0587ae
git rev-parse origin/main          → 5f1fbf43cda2cf055c67ce123b1add04bacbb0b4
```

- Branch was `auth-and-tasks`; local HEAD matched `origin/auth-and-tasks`.
- No unexpected teammate commits on the remote branch.
- No `reset` / `clean` / `restore` / rebase / automatic stash / force-push.
- Working-tree changes belonged only to the lifecycle patch (eight files).

---

## 3. Exact committed file scope

Eight files in the lifecycle review commit (`93215a0`):

| Status | Path |
| --- | --- |
| M | `artifacts/revision-platform/src/components/auth-provider.tsx` |
| M | `artifacts/revision-platform/src/components/auth-provider.test.tsx` |
| M | `artifacts/revision-platform/src/components/require-auth.test.tsx` |
| M | `artifacts/revision-platform/src/pages/update-password.tsx` |
| M | `artifacts/revision-platform/src/pages/login.tsx` |
| M | `artifacts/revision-platform/src/pages/auth-pages.test.ts` |
| A | `artifacts/revision-platform/src/pages/update-password.test.tsx` |
| A | `docs/cursor/reports/21-phase2-slice3-auth-lifecycle-correction.md` |

**Not included:** migrations (`0001` / `0002` unchanged), API routes, OpenAPI/codegen, package/lockfile changes, environment files.

Staged with **explicit paths only** (`git add .` / `-A` not used).

Docs follow-up (`4051162`) updated only report 21 header/status to record the pushed review commit.

---

## 4. Validation (pre-commit)

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm --filter @workspace/db generate` | **No schema changes, nothing to migrate** |
| `pnpm typecheck` | Pass |
| `pnpm --filter @workspace/api-server test` | **24/24** pass |
| `pnpm --filter @workspace/revision-platform test` | **59/59** pass |
| `pnpm --filter @workspace/api-server test:integration` | **13/13** pass, **0 skipped**, loopback Supabase only |
| `PORT=5173 BASE_PATH=/ pnpm build` | Pass |
| `git diff --check` | Clean |

Targeted local browser smoke (API `:3001`, Vite `:5173`, local Supabase only): delayed profile → loader (no onboarding) → dashboard; recovery update → logout → `/login`; sign-in with new password → dashboard. Google live OAuth still unverified.

---

## 5. Privacy / secret check

Searched the eight lifecycle files for database URLs, Supabase keys, passwords, JWTs, access/refresh tokens, disposable credentials, Auth UUIDs, Google credentials, absolute machine paths, and hosted private task titles.

**Result:** clean for commit. Only generic test fixture token string (`access_token: "token"`) in unit tests — acceptable. No real credentials or private hosted values staged.

---

## 6. Commit and push

```
git commit -m "fix(auth): harden profile loading lifecycle"
[auth-and-tasks 93215a0] fix(auth): harden profile loading lifecycle
 8 files changed, 680 insertions(+), 154 deletions(-)
```

Pre-push remote still at `823a2ae` (no unexpected commits).

```
git push origin auth-and-tasks
To https://github.com/ActifDevs/lockdinapp.git
   823a2ae..93215a0  auth-and-tasks -> auth-and-tasks
```

Non-force; `auth-and-tasks` only. No push to `main`, no merge, no hosted SQL.

Docs status correction:

```
git commit -m "docs: correct auth lifecycle report commit status"
[auth-and-tasks 4051162] docs: correct auth lifecycle report commit status
 1 file changed, 24 insertions(+), 6 deletions(-)

git push origin auth-and-tasks
   93215a0..4051162  auth-and-tasks -> auth-and-tasks
```

---

## 7. Post-push verification

```
HEAD                         → 4051162c2339b30e1adf9350b2199329950adb93
origin/auth-and-tasks        → 4051162c2339b30e1adf9350b2199329950adb93
origin/main                  → 5f1fbf43cda2cf055c67ce123b1add04bacbb0b4 (unchanged)
git status -sb               → auth-and-tasks...origin/auth-and-tasks (clean)
```

Branch history (newest first):

```
4051162 docs: correct auth lifecycle report commit status
93215a0 fix(auth): harden profile loading lifecycle
823a2ae docs: correct Slice 3 report commit status
c4c036d feat(auth): add frontend sessions and atomic onboarding
```

---

## 8. Confirmations

| Check | Result |
| --- | --- |
| Migrations `0001` and `0002` | Unchanged |
| Hosted Supabase | Untouched |
| Nine hosted prototype tasks | Untouched |
| `main` | Unchanged |
| Force-push | Not used |
| Hosted cutover / deploy / merge | Not started |

---

## 9. Remaining blockers (unchanged)

- Hosted migrations **0001** and **0002** not yet applied.
- Nine hosted prototype tasks remain.
- Google OAuth provider still needs hosted configuration and live verification.
- `user_subjects` and subject component selection remain deferred.
- Phase 2 hosted cutover remains separately gated.

---

## 10. Links

- Branch: https://github.com/ActifDevs/lockdinapp/tree/auth-and-tasks
- Lifecycle review commit: https://github.com/ActifDevs/lockdinapp/commit/93215a02c49fe34d0b27b47ac849e049799228a6
- Docs follow-up: https://github.com/ActifDevs/lockdinapp/commit/4051162c2339b30e1adf9350b2199329950adb93
- Technical report: [`21-phase2-slice3-auth-lifecycle-correction.md`](./21-phase2-slice3-auth-lifecycle-correction.md)
- Slice 3 feature report: [`20-phase2-slice3-frontend-auth-and-onboarding.md`](./20-phase2-slice3-frontend-auth-and-onboarding.md)

---

## Stop

Remote inspection only on `auth-and-tasks`.
**Do not merge / apply hosted SQL / delete hosted tasks / deploy / begin Phase 2 hosted cutover** until separately approved.
