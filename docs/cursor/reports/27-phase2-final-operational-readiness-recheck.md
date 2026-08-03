# Phase 2 Final Operational Readiness — Recheck (Report 27)

**Final verdict: BLOCKED**

**Branch:** `auth-and-tasks`
**Starting commit (this recheck):** `7a3e2a3ab985cf212352969fa0c889789b1bb603`
**Inspection completed (UTC):** `2026-08-03T01:32:00Z`
**Prior report:** [`26-phase2-final-operational-readiness.md`](./26-phase2-final-operational-readiness.md)
**Schema gate:** Report 25 classification **A** still accepted
**Hosted writes:** **None**
**Vercel / Supabase Auth settings modified by this task:** **None**
**Nine hosted task rows:** **Untouched**
**`main`:** unchanged at `5f1fbf43cda2cf055c67ce123b1add04bacbb0b4`

This is a **recheck** of the operational gates after Report 26. Schema reconciliation is not repeated.

---

## 1. Delta since Report 26

| Item | Report 26 | This recheck |
| --- | --- | --- |
| Live Vercel `VITE_SUPABASE_URL` | Missing | **Present** (Preview + Production) |
| Live Vercel `VITE_SUPABASE_PUBLISHABLE_KEY` | Missing | **Present** (Preview + Production) |
| Live Vercel `DATABASE_URL` | Present (name) | Present (name) |
| Live Vercel `SUPABASE_URL` | Missing | **Still missing** |
| Live Vercel `SUPABASE_PUBLISHABLE_KEY` | Missing | **Still missing** |
| Production JS embeds Supabase config | No | **Still No** (no redeploy after `VITE_*` add) |
| Backup | Private logical verified | Same backup still verified |
| Auth URL / email / Google | Not verified / unresolved | Unchanged |

Someone added frontend Supabase env **names** to Vercel since Report 26. That is progress, but not enough for READY.

---

## 2. Backup readiness

| Field | Result |
| --- | --- |
| Correct hosted project (approved connection) | **Yes** |
| Managed Supabase backup | **Not verified** — manual dashboard check required |
| Private logical backup | **Yes** — `pg_dump` custom format, outside repo |
| Non-empty | **Yes** (417,971 bytes) |
| Completion timestamp (UTC) | `20260803T003409Z` |

**Backup gate:** **Pass** (private logical backup).

---

## 3. Vercel project / linkage

| Check | Result |
| --- | --- |
| Frontend project | **Yes** — `lockedinapp` |
| API/server project | **Same project** (also aliased as `lockedinapp-api-server.vercel.app` → redirects to Production) |
| Production domain | **Yes** — `https://lockedin-study.vercel.app` |
| Preview platform support | **Yes** |
| Preview deployments observed | **No** |
| `auth-and-tasks` deployed | **No** — recent Production deploys from `hardening/production-readiness-batch-1` / `main` |
| Root / build / output | **Yes** — `artifacts/revision-platform`, `pnpm run build:vercel`, `dist/public` |
| SPA + `/api` rewrites | **Yes** — live `/api/healthz` and `/api/healthz/db` return 200 |

---

## 4. Environment-variable matrix (live Vercel)

Inspected via Vercel REST API. Values could **not** be decrypted in this session (`env pull` still errors; sensitive values return empty). Names/scopes only:

| Variable | Preview | Production | Correct project/value type |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | **Yes** | **Yes** | Frontend publishable URL — **name present; value alignment Not verified** |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Yes** | **Yes** | Frontend publishable key — **name present; value alignment Not verified** |
| `DATABASE_URL` | **Yes** | **Yes** | Server DB — **name present; value alignment Not verified** |
| `SUPABASE_URL` | **No** | **No** | Server JWT verifier URL — **missing** |
| `SUPABASE_PUBLISHABLE_KEY` | **No** | **No** | Server JWT verifier key — **missing** |

### Alignment / safety checks

| Check | Result |
| --- | --- |
| Frontend values identify intended hosted project | **Not verified** — decrypt unavailable |
| Server Supabase values identify intended project | **No** — variables absent |
| `DATABASE_URL` → intended hosted project | **Not verified** |
| `DATABASE_URL` server-only | **Yes** — not under `VITE_*` |
| No service-role in `VITE_*` | **Yes** (by key name) |
| Preview and Production inspected separately | **Yes** |
| Local `.env.local` usable for intended Auth checks | **No** — points at **loopback** local Supabase, not hosted |

API server code requires `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (`supabase-config.ts`) for Auth JWT verification. Those must exist before Phase 2 Auth can work in Production.

---

## 5. Route readiness

### Production (`https://lockedin-study.vercel.app`)

All required SPA routes and `/api/healthz` / `/api/healthz/db` return **200**.

Production JS bundle **still** contains no `supabase.co` URL and no publishable key — consistent with env vars being added **after** the last build, without a redeploy that would bake `VITE_*` into the client.

### Preview

No Preview-target deployment to test. **Not applicable — Preview Auth testing deliberately excluded** (same rationale as Report 26): supervised cutover will use Production URLs unless a Preview deploy from `auth-and-tasks` is added.

---

## 6. Supabase Auth URL matrix (intended hosted project)

| Auth URL item | Status |
| --- | --- |
| Site URL matches Production base URL | **Not verified** — manual dashboard check required |
| Production `/auth/callback` allowed | **Not verified** |
| Production `/update-password` allowed | **Not verified** |
| Preview `/auth/callback` | **Not applicable — Preview Auth testing deliberately excluded** |
| Preview `/update-password` | **Not applicable — Preview Auth testing deliberately excluded** |

---

## 7. Email/password and recovery

| Auth capability | Status |
| --- | --- |
| Email/password enabled | **Not verified** |
| Confirmation behaviour understood | **Not verified** |
| Password-reset delivery available | **Not verified** |
| Recovery redirect → `/update-password` | **Not verified** |
| SMTP/sender suitable | **Not verified** |

---

## 8. Google release gate

**C. GOOGLE BLOCKER UNRESOLVED**

- Visible **Continue with Google** still on `login.tsx` and `signup.tsx`.
- Intended hosted Google provider: **Not verified**.
- No approved button-hiding decision recorded.

---

## 9. Remaining blockers

1. **`SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` missing** on Vercel Preview and Production — required by API Auth verification.
2. **Value alignment Not verified** for `VITE_*` and `DATABASE_URL` against the intended hosted cutover project (decrypt/pull unavailable).
3. **Production not rebuilt** after adding `VITE_*` — live bundle still has no Supabase client config.
4. **`auth-and-tasks` not deployed** — cannot operationally validate the Phase 2 candidate build.
5. **Auth Site URL + redirects Not verified** on intended hosted project.
6. **Email/password + recovery Not verified**.
7. **Google gate unresolved**.
8. **Managed backup Not verified** (private logical backup alone is acceptable for the backup gate, but Dashboard confirmation remains recommended).

---

## 10. Final verdict

**BLOCKED**

Not **OPERATIONALLY READY FOR FINAL CUTOVER**.

Partial progress: frontend Supabase env **names** now exist on Vercel. Still blocked on server Auth env, value alignment, redeploy, Auth dashboard checks, and Google.

---

## 11. Exact next action

1. Add Vercel Production (and Preview if used) **`SUPABASE_URL`** and **`SUPABASE_PUBLISHABLE_KEY`** for the **intended hosted** project (same project as `DATABASE_URL` / `VITE_*`).
2. Privately confirm all five required values point at the intended hosted project (Dashboard or successful `vercel env pull`).
3. Redeploy from **`auth-and-tasks`** so the client bundle embeds `VITE_*`.
4. Confirm Production JS contains the intended Supabase URL (publishable key only).
5. In Supabase Dashboard: Site URL + Production `/auth/callback` and `/update-password`.
6. Verify email/password, confirmation behaviour, and recovery delivery.
7. Close Google: configure OAuth **or** approve/hide buttons on login/signup before deploy.
8. Re-run this operational gate; only then start the supervised cutover from Report 25.

---

## 12. Confirmations

| Confirmation | Status |
| --- | --- |
| No Vercel/Auth settings modified by this task | **Yes** |
| No hosted migration or DB write | **Yes** |
| Nine hosted tasks untouched | **Yes** |
| `main` unchanged | **Yes** |

---

## Stop

Recheck complete. No cutover write performed.
