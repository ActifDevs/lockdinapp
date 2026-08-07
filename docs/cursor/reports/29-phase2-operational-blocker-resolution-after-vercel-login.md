# Phase 2 Operational Blocker Resolution After Vercel Login — Report 29

**Final verdict: BLOCKED**

**Branch:** `auth-and-tasks`  
**Starting commit (this continuation):** `c43732d30c3a8af76aed078034d4a1cd90532436`  
**GOOGLE_GATE_COMMIT:** `de642b3c12d97b7cbef0140e6690f27049554701`  
**PREVIEW_COMMIT:** `c43732d30c3a8af76aed078034d4a1cd90532436`  
**Preview deployment id:** `dpl_2cJsEBdkyM7Dn2mv499W4PhUSzfW`  
**Inspection completed (UTC):** `2026-08-07T00:05:00Z` (approx.; executed in this session)

**Hosted database writes:** **None**  
**Drizzle journal / migrations:** **Untouched**  
**Nine hosted task rows:** **Untouched**  
**Production deployment:** **None**  
**Production alias:** **Unchanged** (`lockedin-study.vercel.app` still on `dpl_5DApYrmuKy8iTe7nc9MHx9mfkrYk`)  
**`main`:** unchanged at `5f1fbf43cda2cf055c67ce123b1add04bacbb0b4`

Schema gate from Report 25 (classification A) remains accepted and was not re-audited. Report 28 remains the pre-login blocker record; this report records what changed after `vercel login`.

---

## 1. What changed after Vercel re-login

| Item | Result |
| --- | --- |
| `vercel whoami` | **Pass** — `gidiprogrammer` |
| Vercel REST API | **Usable** |
| Vercel CLI `env pull` / `deploy` | Still crashes (`Cannot read properties of undefined (reading 'startsWith')`) — worked around via REST |
| `VITE_GOOGLE_AUTH_ENABLED=false` | **Set** on Preview + Production (plain) |
| Five required env **names** | **Present** on Preview + Production |
| Sensitive env **value decrypt via API** | Still empty (sensitive type) — alignment inferred from Preview runtime |
| Preview deploy | **Created and READY** (not Production) |
| Preview validation | **Pass** (see §6) |
| Supabase Auth Site URL / redirects | **Still blocked** — Management API write previously denied; no Dashboard owner change observed this session |

---

## 2. Backup

Replacement private logical backup from Report 28 (`20260806T234603Z`, non-empty custom-format `pg_dump` outside the repo) was not recreated this session. **No hosted writes** occurred; backup gate from Report 28 still applies for cutover planning.

---

## 3. Google path

Path B remains in force:

- Code gate on `de642b3` (hide unless `VITE_GOOGLE_AUTH_ENABLED === "true"`)
- Vercel `VITE_GOOGLE_AUTH_ENABLED=false` on Preview + Production
- Preview bundle: **no** `Continue with Google` string
- Hosted Google provider previously read as **disabled** (Report 28)

---

## 4. Vercel environment-variable matrices

### Names (Preview + Production)

| Variable | Preview | Production |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | **Present** | **Present** |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Present** | **Present** |
| `DATABASE_URL` | **Present** | **Present** |
| `SUPABASE_URL` | **Present** | **Present** |
| `SUPABASE_PUBLISHABLE_KEY` | **Present** | **Present** |
| `VITE_GOOGLE_AUTH_ENABLED` | **Present** (`false`) | **Present** (`false`) |

### Alignment / safety (this session)

| Check | Result |
| --- | --- |
| Same hosted project in browser bundle | **Pass** — Preview JS contains project ref `hazvcdrcvsxmuwdfiucx` |
| No localhost / `127.0.0.1:54321` in Preview bundle | **Pass** |
| `DATABASE_URL` server-only & reachable | **Pass** — Preview `/api/healthz/db` → `{"status":"ok","database":"ok"}` |
| No `service_role` in Preview browser bundle | **Pass** |
| Publishable form in Preview browser bundle | **Pass** — `sb_publishable` / `sb-publishable` present; no classic `eyJ` JWT in bundle |
| API decrypt of sensitive values | **Fail** — list API returns empty values for sensitive vars; cannot print host/key classification from decrypt |
| `DIRECT_DATABASE_URL` not in browser | **Pass** (not observed in Preview bundle) |

---

## 5. Supabase Auth matrix

No successful Auth setting write this session. Last verified read (Report 28) still governs:

| Auth item | Status |
| --- | --- |
| Site URL | **No** — was `http://localhost:3000` (must be `https://lockedin-study.vercel.app`) |
| Production `/auth/callback` | **No** (must add) |
| Production `/update-password` | **No** (must add) |
| Exact Preview `/auth/callback` | **No** — Preview URL now known; redirects not added |
| Exact Preview `/update-password` | **No** |
| Email/password enabled | **Yes** (Report 28) |
| Email confirmation required | **Yes** (Report 28) |
| Google provider | **Disabled for Phase 2** (Path B) |

**Preview URLs to allow once an owner can edit Auth:**

- `https://lockedinapp-4833v113c-gidiprogrammers-projects.vercel.app/auth/callback`
- `https://lockedinapp-4833v113c-gidiprogrammers-projects.vercel.app/update-password`
- Stable branch alias (recommended while iterating):
  - `https://lockedinapp-git-auth-and-tasks-gidiprogrammers-projects.vercel.app/auth/callback`
  - `https://lockedinapp-git-auth-and-tasks-gidiprogrammers-projects.vercel.app/update-password`

---

## 6. Preview deployment

| Field | Result |
| --- | --- |
| Preview deployment created | **Yes** via Vercel REST (CLI deploy crashed) |
| Branch / commit deployed | `auth-and-tasks` @ `c43732d30c3a8af76aed078034d4a1cd90532436` |
| Deployment id | `dpl_2cJsEBdkyM7Dn2mv499W4PhUSzfW` |
| Preview base URL | `https://lockedinapp-4833v113c-gidiprogrammers-projects.vercel.app` |
| Branch alias | `https://lockedinapp-git-auth-and-tasks-gidiprogrammers-projects.vercel.app` |
| `target` | `null` (Preview, not Production) |
| Ready state | **READY** |
| Production alias unchanged | **Yes** — Preview aliases do **not** include `lockedin-study.vercel.app` |

---

## 7. Preview validation

| Check | Result |
| --- | --- |
| `/` `/login` `/signup` `/auth/callback` `/forgot-password` `/update-password` `/onboarding` | **200** |
| `/api/healthz` | **200** `{"status":"ok"}` |
| `/api/healthz/db` | **200** `{"status":"ok","database":"ok"}` |
| Unauthenticated `/api/tasks` | **401** `{"error":"Unauthorized"}` |
| Bundle Supabase URL = hosted Lockdin ref | **Pass** |
| Bundle publishable-only (no service_role) | **Pass** |
| Google UI absent (Path B) | **Pass** (no `Continue with Google` in Preview HTML shell or main JS bundle) |
| Production `https://lockedin-study.vercel.app` still 200 | **Pass** |

---

## 8. Exact remaining blockers

1. **Owner Dashboard Auth write** on hosted Lockdin-app (`hazvcdrcvsxmuwdfiucx`):
   - Site URL → `https://lockedin-study.vercel.app`
   - Allow Production `/auth/callback` and `/update-password`
   - Allow exact Preview (and optionally branch-alias) `/auth/callback` and `/update-password` listed in §5
2. Optional: privately confirm sensitive Vercel values in Dashboard (API decrypt still empty) — runtime evidence already supports hosted alignment for Preview.
3. After Auth URLs are fixed: smoke email confirm / recovery redirect on Preview (no Production promote).

Still **not** authorised by this report: journal stamp, apply 0003, delete nine tasks, Production deploy, merge to `main`.

---

## 9. Final verdict

**BLOCKED**

Not **READY FOR SUPERVISED PHASE 2 CUTOVER**.

Unblocked since Report 28: Vercel login, required env **names**, Google flag, Preview deploy, Preview validation.

Still blocked: Supabase Auth Site URL + redirect allow-list (owner/dashboard write).

---

## 10. Exact next action

1. In Supabase Dashboard → Authentication → URL configuration (Lockdin-app owner):
   - Site URL: `https://lockedin-study.vercel.app`
   - Redirect URLs: Production + Preview paths from §5
2. Re-check Auth read (or ask owner to screenshot Site URL + allow list).
3. Optional Preview email/recovery smoke test.
4. Then supervised cutover planning can proceed under a separate explicit approval (journal stamp / 0003 / task cleanup / Production) — not this report.

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

Operational Preview gate is green. Cutover remains blocked solely on Supabase Auth URL configuration that requires a project owner in the Dashboard.
