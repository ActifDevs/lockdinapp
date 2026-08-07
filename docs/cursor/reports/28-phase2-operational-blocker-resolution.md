# Phase 2 Operational Blocker Resolution — Report 28

**Final verdict: BLOCKED**

**Branch:** `auth-and-tasks`
**Starting commit:** `ed17e5f8239805da21e936853fe8e76ae6cc524f`
**GOOGLE_GATE_COMMIT:** `de642b3c12d97b7cbef0140e6690f27049554701` — `fix(auth): gate Google sign-in by configuration`
**Candidate commit for Preview (intended):** `de642b3c12d97b7cbef0140e6690f27049554701`
**Inspection completed (UTC):** `2026-08-06T23:55:00Z`

**Hosted database writes:** **None**
**Drizzle journal / migrations:** **Untouched**
**Nine hosted task rows:** **Untouched** (count still 9; Auth users still 0)
**Production deployment:** **None**
**Production alias:** **Unchanged** (not touched this session)
**`main`:** unchanged at `5f1fbf43cda2cf055c67ce123b1add04bacbb0b4`

Schema gate from Report 25 (classification A) remains accepted and was not re-audited.

---

## 1. Backup re-verification

The Report 26/27 `/tmp` logical backup file was **no longer present** (OS temp cleanup). A **replacement** private logical backup was created outside the repository using the same approved hosted connection and method:

| Field | Result |
| --- | --- |
| Backup exists | **Yes** |
| Backup non-empty | **Yes** (417,971 bytes) |
| Method | Private logical `pg_dump` (custom format) |
| Completion timestamp (UTC) | `20260806T234603Z` |
| Prior Report 26/27 timestamp | `20260803T003409Z` (file gone) |

**Backup gate:** **Pass** (replacement verified).

---

## 2. NEXT_* repository usage

Read-only search for `NEXT_PUBLIC_SUPABASE_*` / `NEXT_SUPABASE_*`:

| Result | Detail |
| --- | --- |
| Active application code | **Not referenced** |
| Documentation / audit notes only | `docs/scholr-database-architecture-audit.md`, historical reports |
| Required app names | `VITE_SUPABASE_*` (frontend) and `SUPABASE_*` (API) only |

No code changes were made to accommodate obsolete `NEXT_*` names. Legacy `NEXT_*` Vercel entries (if any) are not counted as satisfying the five required variables.

---

## 3. Google path

**Path B — HIDE GOOGLE FOR PHASE 2** (selected; Google credentials not available).

Repository changes committed and pushed:

- `.env.example` — documents `VITE_GOOGLE_AUTH_ENABLED=false`
- `artifacts/revision-platform/src/pages/login.tsx` — gate button + “or” divider
- `artifacts/revision-platform/src/pages/signup.tsx` — same gate
- `artifacts/revision-platform/src/pages/auth-pages.test.ts` — wiring assertions

Behaviour:

- missing / non-`true` flag → Google hidden (default)
- `true` → current Google UI preserved
- email/password remains visible
- `signInWithGoogle` retained on Auth provider

Validation:

- `pnpm install --frozen-lockfile` — pass
- `pnpm typecheck` — pass
- `pnpm --filter @workspace/revision-platform test` — **60/60** pass
- `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/revision-platform build` — pass

**GOOGLE_GATE_COMMIT:** `de642b3c12d97b7cbef0140e6690f27049554701`

**Vercel `VITE_GOOGLE_AUTH_ENABLED=false`:** **Not set** — Vercel CLI session expired / re-login failed this session (`Invalid Compact JWS`). Must be set on Preview + Production before Preview deploy.

Hosted Supabase Google provider (read-only Management API): **disabled**; no client credentials present → aligns with Path B.

---

## 4. Vercel environment-variable matrices

Vercel API/CLI authentication was **not available** after credential expiry and a failed device/OAuth re-login. Therefore values could not be privately re-verified or corrected in this session.

### Preview (`auth-and-tasks`)

| Variable | auth-and-tasks Preview |
| --- | --- |
| `VITE_SUPABASE_URL` | **Not verified** — Vercel auth unavailable |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Not verified** — Vercel auth unavailable |
| `DATABASE_URL` | **Not verified** — Vercel auth unavailable |
| `SUPABASE_URL` | **Not verified** — Vercel auth unavailable |
| `SUPABASE_PUBLISHABLE_KEY` | **Not verified** — Vercel auth unavailable |

### Production

| Variable | Production |
| --- | --- |
| `VITE_SUPABASE_URL` | **Not verified** — Vercel auth unavailable |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Not verified** — Vercel auth unavailable |
| `DATABASE_URL` | **Not verified** — Vercel auth unavailable |
| `SUPABASE_URL` | **Not verified** — Vercel auth unavailable |
| `SUPABASE_PUBLISHABLE_KEY` | **Not verified** — Vercel auth unavailable |

### Alignment / safety (this session)

| Check | Result |
| --- | --- |
| Same hosted project alignment | **Not verified** |
| No localhost / `127.0.0.1` in Vercel values | **Not verified** |
| `DATABASE_URL` server-only | **Not verified** |
| No service-role in `VITE_*` | **Not verified** |
| Publishable key not service-role | **Not verified** |
| `DIRECT_DATABASE_URL` not in browser | **Not verified** |

Report 27 previously observed live names for `VITE_*` + `DATABASE_URL` and **missing** `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`. Teammate reported naming corrections; **this session could not confirm them**.

---

## 5. Supabase Auth matrix (intended hosted project `Lockdin-app`)

Read via Supabase Management API (CLI credentials). **PATCH to update Site URL / redirects was denied** (account lacks write privilege on this endpoint). No Auth settings were successfully modified.

| Auth item | Status |
| --- | --- |
| Site URL | **No** — still `http://localhost:3000` (must be `https://lockedin-study.vercel.app`) |
| Production `/auth/callback` | **No** — not in allow list |
| Production `/update-password` | **No** — not in allow list |
| Email/password enabled | **Yes** |
| Email confirmation required | **Yes** (`mailer_autoconfirm = false`) |
| Confirmation behaviour understood | **Yes** — new users must confirm email before a usable session when confirmation is required |
| Recovery delivery configured | **Yes** — recovery templates present; uses Supabase default mailer (no custom SMTP host) |
| Sender path available | **Yes** — Supabase default mailer (no custom SMTP configured) |
| Google provider | **Disabled for Phase 2** (Path B; matches code gate) |

Preview Auth redirects: **Not added** — Preview URL not created this session.

---

## 6. Preview deployment

| Field | Result |
| --- | --- |
| Preview deployment created | **No** |
| Branch / commit deployed | N/A |
| Preview base URL | N/A |
| Production alias unchanged | **Yes** (no Production deploy attempted) |

Reason: Vercel CLI not authenticated; cannot create Preview or set Preview env vars from this session.

---

## 7. Preview validation

| Check | Result |
| --- | --- |
| Preview routes | **Not run** — no Preview |
| `/api/healthz` / `/api/healthz/db` on Preview | **Not run** |
| Unauthenticated protected API → 401 | **Not run** |
| Bundle Supabase URL / publishable-only | **Not run** |
| Google UI absent (Path B) | **Code ready** on `de642b3`; **not verified on a Preview deploy** |

---

## 8. Exact remaining blockers

1. **Re-authenticate Vercel CLI** (or provide a valid token) after session expiry / failed re-login.
2. **Verify or set all five required variables** on Preview and Production for the intended hosted project, including `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; set `VITE_GOOGLE_AUTH_ENABLED=false`.
3. **Owner/dashboard Auth write:** set Site URL to `https://lockedin-study.vercel.app` and allow Production `/auth/callback` + `/update-password` (Management API PATCH denied for this credential).
4. **Create Preview deployment** from `auth-and-tasks` @ `de642b3` (not Production).
5. **Add exact Preview** `/auth/callback` and `/update-password` redirects once Preview URL is known.
6. **Run Preview validation** (routes, healthz, 401, bundle, Google UI absent).

---

## 9. Final verdict

**BLOCKED**

Not **READY FOR SUPERVISED PHASE 2 CUTOVER**.

Completed this session: Google Path B code gate + tests; backup replacement; Auth **read** confirmation (email on, Google off, confirmation required); hosted DB still untouched.

Still blocked: Vercel access, five-variable verification/correction, Auth URL writes, Preview deploy and validation.

---

## 10. Exact next action

1. On the machine: `vercel login` (GitHub) until `vercel whoami` succeeds for the Lockdin team.
2. In Vercel project `lockedinapp`, confirm Preview + Production have exactly:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
   - `VITE_GOOGLE_AUTH_ENABLED=false`
   All pointing at the intended hosted Lockdin Supabase project (not localhost).
3. In Supabase Dashboard (Lockdin-app) as an owner: Site URL + Production callback/update-password redirects.
4. Deploy Preview from `auth-and-tasks` commit `de642b3`; add Preview redirects; validate.
5. Re-run this operational gate (Report 29) before supervised cutover.

Do **not** stamp the journal, apply 0003, delete tasks, or merge on the strength of this report.

---

## 11. Confirmations

| Confirmation | Status |
| --- | --- |
| No hosted database write | **Yes** |
| Journal and migrations untouched | **Yes** |
| Nine hosted tasks untouched | **Yes** |
| No Production deployment | **Yes** |
| Production alias unchanged | **Yes** |
| `main` unchanged | **Yes** |

---

## Stop

Operational resolution incomplete. Google Path B code is on `auth-and-tasks`. Remaining blockers are Vercel auth/env, Supabase Auth URL writes, and Preview validation.
