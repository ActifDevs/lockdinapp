# Production DATABASE_URL Incident

**Date:** 2026-08-18  
**Repository:** `ActifDevs/lockdinapp`  
**Production release commit:** `109b8e2a28d2dde0176f8818c26cad2140d30633`  
**Last application-code commit:** `810045afe58f6b1fbaa0e85c8020e095a4112e5c`  
**Vercel project (incident):** `actif-devs/lockdinapp-web`  
**Broken Production deployment (pre-fix):** `dpl_6BX2jvHDVUC2vzCEgW4aXGRnhiU1` (`lockdinapp-689kb0cy3-actif-devs.vercel.app`)  
**Post-fix Production deployment (owner redeploy, same SHA):** `dpl_CsruDFt2rrW5zvxAqN5tcnRpZN7m` (`lockdinapp-jm7g6gdnn-actif-devs.vercel.app`)  
**Current shared full-stack Production domain:** `https://lockdinapp-web.vercel.app`  
**Legacy domain used in the initial smoke:** `https://lockedin-study.vercel.app` (not current shared Production)  
**DATABASE_URL incident status:** **RESOLVED** (2026-08-18)  
**Phase 3 closeout status:** **CLOSED** — corrected shared-Production smoke passed (2026-08-18)

**Not done in the original investigation or this resolution pass:** source edits, commits, PRs, migrations, hosted schema/RLS changes, secret printing, force-push, dummy commits, Vercel env changes by the agent.

---

## Current classification (post-remediation)

| Field | Result |
| --- | --- |
| Root cause | Missing `DATABASE_URL` in `lockdinapp-web` Production environment |
| Incident type | Production configuration error |
| Code regression | **NO** |
| Database/schema regression | **NO** |
| Fix applied | Correct Lockdin Session Pooler `DATABASE_URL` added to Production |
| Redeployment | **COMPLETED** (`109b8e2`, no source change) |
| API health | **RESTORED** |
| Database health | **RESTORED** |
| Rollback required | **NO** |

The original investigation verdict is preserved below. It is historical.

---

## Verdict

**(Original investigation, 2026-08-18, before owner remediation.)**

**OWNER CONFIGURATION ACTION REQUIRED**

The observed runtime error is the intended missing-env guard, not a Phase 3 code regression. Production API cold-start throws if `DATABASE_URL` is unset. Fix is Vercel configuration on `lockdinapp-web` (session-pooler URL for hosted Lockdin project `hazvcdrcvsxmuwdfiucx`) plus a new Production redeploy of `109b8e2`.

Classification:

| Option | Result |
| --- | --- |
| A. Missing Vercel Production environment variable | **Primary** — matches the exact throw and historical runbook incident |
| B. Wrong variable name | Unlikely — app only reads `DATABASE_URL` at runtime |
| C. Scoped only to Preview/Development | Possible on `lockdinapp-web`; not verified (no `actif-devs` access) |
| D. Incorrect Vercel project/root configuration | **Possible** — env may exist on sibling project `lockdinapp` / personal `lockedinapp`, not on `lockdinapp-web` |
| E. Source-code regression | **No** — same throw at `109b8e2` and original DB bootstrap `b80efd3` |
| F. Other | The initially tested legacy domain was API-healthy at inspection time; the named `dpl_*` URL is SSO-protected and was not re-verified |

---

## Observed incident

Phase 3 was merged to `main` and Vercel built/deployed the frontend successfully. Production API routes failed with:

```text
Error: DATABASE_URL must be set. Did you forget to provision a database?
```

`/api/healthz` → `FUNCTION_INVOCATION_FAILED`. Root HTML routes still loaded.

That combination is expected: static Vite assets do not import `@workspace/db`; the serverless Express function does, at module load.

---

## 1. Root cause

Eager module init in `lib/db/src/index.ts` throws if `process.env.DATABASE_URL` is falsy, then constructs `pg.Pool` from that URL (`max: 1` for serverless session-pooler).

Import chain at Vercel boot:

1. `artifacts/revision-platform/api/index.mjs` re-exports `artifacts/api-server/dist/index.mjs`
2. `artifacts/api-server/src/express-app.ts` mounts `/api`
3. `artifacts/api-server/src/routes/index.ts` loads `health` first
4. `artifacts/api-server/src/routes/health.ts` does `import { db } from "@workspace/db"`

Because `db` is imported at load time, `/api/healthz` cannot stay up when `DATABASE_URL` is missing. The isolate never reaches the handler.

This is documented in Report 06:

- Vercel Production and Preview both need `DATABASE_URL` (session pooler URL for the app)
- Missing Production `DATABASE_URL` previously caused `FUNCTION_INVOCATION_FAILED` on cold start

---

## 2. DATABASE_URL contract

### Files that expect it

| File | When | Role |
| --- | --- | --- |
| `lib/db/src/index.ts` | **Runtime (required)** | Throw + `pg.Pool` connection string |
| `lib/db/drizzle.config.ts` | CLI generate/migrate/push | `DIRECT_DATABASE_URL ?? DATABASE_URL` |
| `scripts/src/syllabus/cleanup-placeholder-syllabus.ts` | Importer CLI | Presence check |
| `.env.example` | Docs | App/pooler URL named `DATABASE_URL` |
| `docs/cursor/reports/06-production-smoke-and-runbook.md` | Ops | Production/Preview env checklist |
| `docs/lockdin-architecture-plan.md` | Plan | Pooled app URL vs direct migration URL |
| `docs/checkpoints/2026-07-30_2314/2026-07-30_2314_CURRENT_STATE.md` | Architecture | Session pooler + IPv4 for Node |

API routes that import `@workspace/db` (runtime consumers once the env is set): `health.ts`, `subjects.ts`, `dashboard.ts`, `progress.ts`, `examDates.ts`, `pastPaperAttempts.ts`, `user-subjects.ts`, plus helpers `exam-dates.ts`, `past-paper-attempts.ts`, `catalogue-subject.ts`.

### Runtime vs build

| Context | `DATABASE_URL` |
| --- | --- |
| Vite frontend build | Not required |
| API `esbuild` | Throw is not executed at bundle time |
| Vercel serverless `/api` | **Required at isolate boot** |
| Drizzle migrate | Prefer `DIRECT_DATABASE_URL`; else `DATABASE_URL` |

Frontend build succeeding while `/api/*` dies is consistent with this split (`artifacts/revision-platform/package.json` `build:vercel` builds API then Vite).

### Expected connection style

Vercel **runtime** should use the hosted Lockdin **Supabase Session Pooler** URL for project `hazvcdrcvsxmuwdfiucx`:

- Host: `*.pooler.supabase.com`
- Port **5432** (session mode)
- Driver: `pg` + `drizzle-orm/node-postgres`, pool `max: 1`

Do **not** treat these as the Production API contract:

- Direct `db.<ref>.supabase.co` — IPv6-only on this plan; Node on Vercel is expected to use the IPv4 session pooler
- Transaction pooler `:6543` — `.env.example` says it can work for the API; this app’s pooler-exhaustion design and runbook specify **session** mode
- `DIRECT_DATABASE_URL` — migrations/DDL only
- Vercel Marketplace `POSTGRES_URL` / `POSTGRES_PRISMA_URL` — a prior local Production env pull pointed those at a **different** Supabase project (`pviuoxdvakouigbfkxha`), not Lockdin

No credentials are recorded in this report.

---

## 3. Vercel environment state

### `actif-devs/lockdinapp-web` (incident project)

**NOT VERIFIED** — Vercel login `gidiprogrammer` can list team `gidiprogrammers-projects` only, not `actif-devs`.

Owner must inspect Settings → Environment Variables on **`lockdinapp-web`**.

### Personal project `lockedinapp` (`prj_gCcYlYsMHgsPjN9ahyLeFVsRFJVe`)

Names and scopes only (values not read/printed):

| Variable | Production | Preview | Development |
| --- | --- | --- | --- |
| `DATABASE_URL` | PRESENT | PRESENT | MISSING |
| `DIRECT_DATABASE_URL` | MISSING | MISSING | MISSING |
| `SUPABASE_URL` | PRESENT | PRESENT | MISSING |
| `SUPABASE_PUBLISHABLE_KEY` | PRESENT | PRESENT | MISSING |
| `VITE_SUPABASE_URL` | PRESENT | PRESENT | MISSING |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | PRESENT | PRESENT | MISSING |

No `POSTGRES_URL` / `SUPABASE_DB_URL` / `DATABASE_POOL_URL` on that project.

This **does not** prove `lockdinapp-web` Production has `DATABASE_URL`. Two Vercel projects deploy this repo (`lockdinapp` and `lockdinapp-web`).

### Historical live smoke (2026-08-18)

The initial smoke used `https://lockedin-study.vercel.app`. Later owner evidence established that this is a legacy teammate-owned deployment from before migration to the shared ActifDevs Vercel team; it is preserved here as incident chronology only and is not evidence about current shared Production.

| Path | Result |
| --- | --- |
| `/` | 200 HTML |
| `/login` | 200 HTML |
| `/signup` | 200 HTML |
| `/api/healthz` | 200 `{"status":"ok"}` |
| `/api/healthz/db` | 200 `{"status":"ok","database":"ok"}` |

Immutable `lockdinapp-web` Production URL `https://lockdinapp-689kb0cy3-actif-devs.vercel.app` (deployment `dpl_6BX2jvHDVUC2vzCEgW4aXGRnhiU1`): **401** Vercel Deployment Protection — not smoked.

So the **custom domain** was API-healthy at inspection; the named dpl URL was not independently confirmed.

---

## 4. Source code change required

**NO**

Do not hardcode a URL, add a fallback, or commit `.env`. The throw is the correct missing-env guard.

---

## 5. Exact remediation

Owner, on **Vercel → `actif-devs` → `lockdinapp-web` → Settings → Environment Variables**:

1. Check whether `DATABASE_URL` exists with target **Production** (and Preview). If it exists only on project `lockdinapp`, copy the **same Lockdin session-pooler** string onto `lockdinapp-web`.
2. If missing or empty: set `DATABASE_URL` to the hosted Lockdin **Session pooler** connection string (Supabase Dashboard → project `hazvcdrcvsxmuwdfiucx` → Database → Connection string → Session pooler / port 5432). Scope: Production (and Preview). Never `VITE_*`. Never commit.
3. Confirm the row is scoped to Production, not Development-only.
4. **Redeploy** `109b8e2a28d2dde0176f8818c26cad2140d30633` so the function boots with the new env. Do not make a dummy git commit. Do not assume the already-running isolate inherits new env vars.

This investigation could not apply the env (no `actif-devs` Vercel access).

---

## 6. Rollback recommendation

**FIX CONFIGURATION AND REDEPLOY**

Do not Vercel-rollback blindly:

- The same throw exists on older SHAs; rolling back code will not create `DATABASE_URL`
- The initially tested legacy domain was API-healthy at inspection
- If `lockdinapp-web` logs still show the throw, add/fix env on **that** project and redeploy `109b8e2`

---

## 7. Post-fix verification

No new deployment was performed in this investigation.

| Check | Result |
| --- | --- |
| Deployment build | NOT VERIFIED |
| Deployment READY | NOT VERIFIED |
| Legacy domain serving | PASS for `lockedin-study.vercel.app` (historical only; not current shared Production) |
| `/` | PASS (historical legacy-domain observation) |
| `/login` | PASS (historical legacy-domain observation) |
| `/signup` | PASS (historical legacy-domain observation) |
| `/api/healthz` | PASS (historical legacy-domain observation); NOT VERIFIED (`dpl_6BX2jvHDVUC2vzCEgW4aXGRnhiU1` URL) |
| No `DATABASE_URL` missing error | PASS (historical legacy-domain observation); NOT VERIFIED (that dpl URL) |
| No `FUNCTION_INVOCATION_FAILED` | PASS (historical legacy-domain observation); NOT VERIFIED (that dpl URL) |
| `/api/healthz/db` | PASS (historical legacy-domain observation) |

---

## Safety

| Action | Result |
| --- | --- |
| Source modified | NO |
| Commit / PR / merge | NO |
| Hosted migrations | NO |
| Hosted rows / RLS | NO |
| Secrets printed | NO |
| Production user data mutated | NO |

---

## Next gate

**(Original investigation next gate — completed by owner.)**

Owner confirms `DATABASE_URL` on **`actif-devs/lockdinapp-web` Production** (Lockdin session pooler) and redeploys `109b8e2`. Re-smoke `/api/healthz` and `/api/healthz/db` on the new Production deployment.

Do not start Phase 4 from this incident.

---

## Resolution

**Date:** 2026-08-18

Owner action:

- Confirmed Production environment configuration on `actif-devs/lockdinapp-web`
- Added the correct Lockdin `DATABASE_URL`
- Used hosted Supabase Session Pooler for project `hazvcdrcvsxmuwdfiucx`
- Port **5432** (session mode)
- Did not expose credentials
- Redeployed existing release commit `109b8e2` (no dummy git commit; no source change)

Agent did not set Vercel env vars, did not retrieve the connection string, and did not trigger the redeploy.

**No application source change was required.**

**The failure was caused by missing Production environment configuration, not a Phase 3 code regression.**

**Rollback was not required.**

---

## Redeployment Evidence

| Item | Evidence |
| --- | --- |
| Branch | `main` |
| Commit | `109b8e2a28d2dde0176f8818c26cad2140d30633` |
| Vercel build | **PASS** (owner: API server + Vite frontend; non-fatal Vite sourcemap warnings; `Build Completed`) |
| Vercel deployment | **PASS** (owner: `Deployment completed`) |
| GitHub Production deployment id | `5944717177` (same GitHub deployment object; new status after env-triggered redeploy) |
| GitHub status (pre-fix) | `2026-08-17T12:13:47Z` — `Deployment has completed` → `https://lockdinapp-689kb0cy3-actif-devs.vercel.app` (`dpl_6BX2jvHDVUC2vzCEgW4aXGRnhiU1`) |
| GitHub status (post-fix) | `2026-08-18T12:31:18Z` — `Deployment has completed` → `https://lockdinapp-jm7g6gdnn-actif-devs.vercel.app` (`dpl_CsruDFt2rrW5zvxAqN5tcnRpZN7m`) |
| Current shared Production domain | `https://lockdinapp-web.vercel.app` |
| Historical legacy domain | `https://lockedin-study.vercel.app` (not assigned to `lockdinapp-web`) |
| Source-code change | **NONE** |

Vercel CLI / `actif-devs` dashboard: **NOT VERIFIED** (no team access from this agent). Immutable deployment URLs are Vercel Deployment Protection gated:

`NOT VERIFIED DIRECTLY — initial legacy-domain smoke preserved as historical evidence only`

Deployment Protection is not classified as an application failure.

Historical logs on `dpl_6BX2jvHDVUC2vzCEgW4aXGRnhiU1` may still contain `DATABASE_URL must be set` / `FUNCTION_INVOCATION_FAILED`. Those are **pre-fix** and are not current failures.

Current shared-Production behaviour is recorded in the Production Target Correction below. The owner-confirmed `/api/healthz` and `/api/healthz/db` results show the **new** Production runtime has `DATABASE_URL` and PostgreSQL connectivity. The isolate boots; the previous missing-env throw is not occurring now.

---

## Historical Post-Fix Smoke on Legacy Domain

Independent agent re-smoke of `https://lockedin-study.vercel.app` on 2026-08-18 (GET only; no accounts created; no data mutated). This was later reclassified as a legacy teammate-owned deployment, not current shared Production:

| Path | Result | Evidence |
| --- | --- | --- |
| `/` | **PASS** | HTTP 200, `text/html`, Lockdin document |
| `/login` | **PASS** | HTTP 200, `text/html`, Lockdin document |
| `/signup` | **PASS** | HTTP 200, `text/html`, Lockdin document |
| `/api/healthz` | **PASS** | HTTP 200, `{"status":"ok"}` |
| `/api/healthz/db` | **PASS** | HTTP 200, `{"status":"ok","database":"ok"}` |

Owner-reported values for `/api/healthz` and `/api/healthz/db` matched this historical check, but the domain must not be used to judge the current shared Production release.

Additional safe catalogue read (not part of the original five-path gate): `GET /api/subjects` → HTTP 200, **9** catalogue subjects. Matches the Report 61 hosted baseline count.

---

## Incident Resolution

**RESOLVED**

- API server boot: **WORKING**
- `DATABASE_URL`: available to Production runtime
- PostgreSQL connectivity: **WORKING**
- Previous `FUNCTION_INVOCATION_FAILED`: **RESOLVED** on current shared Production
- Source-code hotfix: **NOT REQUIRED**
- Rollback: **NOT REQUIRED**

Secret exposure: **NONE**

---

## Production Target Correction

New project-owner Vercel evidence established the correct shared Production topology:

| Role | Project / domain | Classification |
| --- | --- | --- |
| Shared Vercel team | `ActifDevs` | Current shared team |
| Full-stack Production | `actif-devs/lockdinapp-web` → `https://lockdinapp-web.vercel.app` | **Current shared Production target** |
| API-only sibling | `actif-devs/lockdinapp` → `https://lockdinapp.vercel.app` | Current sibling service |
| `https://lockedin-study.vercel.app` | Older teammate-owned/personal deployment predating the shared-team migration | **LEGACY DEPLOYMENT — NOT CURRENT PRODUCTION** |

The current `109b8e2` Production deployment lists `lockdinapp-web` domains and does not list `lockedin-study.vercel.app`; the ActifDevs team-level Domains page has no assignment for the legacy domain.

## Membership Endpoint Reclassification

Historical observation preserved: `lockedin-study.vercel.app/api/user-subjects` returned Express 404 for GET and PUT.

Classification: **LEGACY DEPLOYMENT BEHAVIOUR — NOT CURRENT SHARED PRODUCTION**. It is not a Phase 3 source regression, `lockdinapp-web` route failure, `build:vercel` failure, or Express registration failure.

Safe unauthenticated smoke against the actual current shared Production target, `https://lockdinapp-web.vercel.app`, on 2026-08-18:

| Path | Expected | Actual | Result |
| --- | --- | --- | --- |
| `/` | 200 HTML | 200 HTML | **PASS** |
| `/login` | 200 HTML | 200 HTML | **PASS** |
| `/signup` | 200 HTML | 200 HTML | **PASS** |
| `GET /api/healthz` | 200 `{"status":"ok"}` | 200 `{"status":"ok"}` | **PASS** |
| `GET /api/healthz/db` | 200 database healthy | 200 `{"status":"ok","database":"ok"}` | **PASS** |
| `GET /api/subjects` | 200 public catalogue | 200 catalogue JSON | **PASS** |
| `GET /api/dashboard/summary` | 401 Unauthorized | 401 `{"error":"Unauthorized"}` | **PASS** |
| `GET /api/profile` | 401 Unauthorized | 401 `{"error":"Unauthorized"}` | **PASS** |
| `GET /api/progress/overview` | 401 Unauthorized | 401 `{"error":"Unauthorized"}` | **PASS** |
| `GET /api/exam-dates` | 401 Unauthorized | 401 `{"error":"Unauthorized"}` | **PASS** |
| `GET /api/tasks` | 401 Unauthorized | 401 `{"error":"Unauthorized"}` | **PASS** |
| `GET /api/past-paper-attempts` | 401 Unauthorized | 401 `{"error":"Unauthorized"}` | **PASS** |
| `GET /api/user-subjects` | 401 Unauthorized | 401 `{"error":"Unauthorized"}` | **PASS — EXPECTED AUTH BEHAVIOUR** |
| `PUT /api/user-subjects` (no token) | 401 before mutation | 401 `{"error":"Unauthorized"}` | **PASS — EXPECTED AUTH BEHAVIOUR** |

No account was created, no valid token was supplied, and no Production data was mutated.

---

## Phase 3 closeout assessment (correct shared Production target)

| Condition | Result |
| --- | --- |
| 1. Phase 3 release commit present on `origin/main` | **PASS** (`109b8e2`; last application-code commit `810045a` is an ancestor; `87cd739` and `109b8e2` are documentation-only) |
| 2. Production deployment builds successfully | **PASS** (owner + GitHub post-fix success status) |
| 3. Current shared Production target healthy | **PASS** (`lockdinapp-web.vercel.app`; HTML entry routes) |
| 4. `/api/healthz` | **PASS** |
| 5. `/api/healthz/db` | **PASS** |
| 6. No current `DATABASE_URL` startup failure | **PASS** (current shared Production) |
| 7. No current `FUNCTION_INVOCATION_FAILED` on the healthy target | **PASS** (current shared Production) |
| 8. Frontend public/auth entry routes load | **PASS** |
| 9. Current protected routes, including GET/PUT `/api/user-subjects`, meet their unauthenticated contracts | **PASS** |
| 10. Historical Phase 3 validation still applicable (app source unchanged after `810045a`) | **PASS** for unit/codegen/build evidence; integration not re-run |
| 11. Rollback not required | **PASS** for the DATABASE_URL incident |
| 12. Clean empty-database bootstrap gap is technical debt, not this incident | **PASS** |
| 13. Legacy `lockedin-study.vercel.app` behaviour excluded from current-release judgement | **PASS** |

**Phase 3 final gate:** `GO — PHASE 3 MAY BE CLOSED`

**Final verdict:** `PHASE 3 PRODUCTION RELEASE VERIFIED`

`DATABASE_URL incident: RESOLVED`. No source-code hotfix or rollback is required. The clean empty-database bootstrap gap remains technical debt only. The legacy teammate-owned deployment may be removed, deprecated, or redirected later by its owner; that housekeeping is not a Phase 3 release requirement.

No Git push, deployment, migration, route change, Vercel configuration change, or Supabase change was performed for this correction.
