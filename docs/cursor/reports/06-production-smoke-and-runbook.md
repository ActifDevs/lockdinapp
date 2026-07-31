# Step 6: Production Smoke And Runbook

## Objective
Verify the production-readiness hardening on a live deployment and leave operators a short runbook for the next pooler/5xx incident.

## Why This Step Exists
- Steps 1–5 landed on `hardening/production-readiness-batch-1` but need live confirmation after deploy.
- The original incident failed diagnosis because liveness looked healthy while DB-backed routes were 500ing.
- Batch 1 closes with operator guidance, not more route rewrites.

## Scope
- smoke-check live health + hot API endpoints
- document expected healthy / degraded / 5xx behavior
- write a short operator runbook
- record deploy/smoke evidence in this report

## Success Criteria
- [x] live endpoints checked and results recorded
- [x] `/api/healthz` vs `/api/healthz/db` behavior documented from production (gap noted where not yet deployed)
- [x] runbook covers triage for pooler exhaustion and API 5xx
- [x] batch overview updated

## Production smoke — 2026-07-31

**Target:** `https://lockedin-study.vercel.app`  
**Branch tip smoked against production:** `8305127` (hardening branch pushed; production has **not** fully caught up)

### Results

| Endpoint | Status | Notes |
|---|---|---|
| `GET /api/healthz` | **200** | `{"status":"ok"}` JSON |
| `GET /api/healthz/db` | **404** | Express `Cannot GET /api/healthz/db` — Step 2 route **not deployed** to this host yet |
| `GET /api/subjects` | **200** | JSON subject list returned |
| `GET /api/dashboard/summary` | **200** | JSON dashboard payload returned |
| `GET /api/progress/overview` | **200** | JSON progress payload returned |

### Concurrent burst
Five parallel `GET /api/dashboard/summary` requests → **all 200** (~2.3–2.9s each).

### Deploy gap
- `origin/main` still has the default `pg.Pool` (no `max: 1`) and does **not** include Steps 2–5.
- Production currently serves hot routes successfully, but `/api/healthz/db` proves the Batch 1 branch tip is **not** what production is running for newer routes.
- There is **no open PR** for `hardening/production-readiness-batch-1` yet.
- Forced-500 / JSON error-handler verification is deferred until the branch is deployed (do not inject production faults without a preview first).

### Post-deploy re-smoke checklist
After merging/deploying `hardening/production-readiness-batch-1`:

1. `GET /api/healthz` → 200 `{ "status": "ok" }`
2. `GET /api/healthz/db` → 200 `{ "status": "ok", "database": "ok" }` (not 404)
3. `GET /api/subjects`, `/api/dashboard/summary`, `/api/progress/overview` → 200
4. Concurrent burst of 5 dashboard requests → all 200
5. Optional preview-only: force an unhandled route error → JSON `{ "error": "Internal server error" }` (not HTML), confirm Vercel logs show `Unhandled API error`

---

## Operator runbook

### Production base URL
`https://lockedin-study.vercel.app`

### Quick triage (2 minutes)

```bash
BASE=https://lockedin-study.vercel.app

curl -sS -w "\nHTTP %{http_code}\n" "$BASE/api/healthz"
curl -sS -w "\nHTTP %{http_code}\n" "$BASE/api/healthz/db"
curl -sS -o /dev/null -w "subjects=%{http_code}\n" "$BASE/api/subjects"
curl -sS -o /dev/null -w "dashboard=%{http_code}\n" "$BASE/api/dashboard/summary"
curl -sS -o /dev/null -w "progress=%{http_code}\n" "$BASE/api/progress/overview"
```

### How to read the signals

| Observation | Likely meaning | Next action |
|---|---|---|
| `healthz` 200, `healthz/db` 200, hot routes 200 | Healthy | Done |
| `healthz` 200, `healthz/db` 503 | Function up, Postgres/pooler down or unreachable | Check Supabase status, `DATABASE_URL`, pooler mode/limits, Vercel env for Production |
| `healthz` 200, `healthz/db` 404 | Old deploy without Step 2 | Deploy/merge hardening branch; re-smoke |
| `healthz` fails / function error | Vercel function boot/runtime failure | Check Vercel deployment + function logs; confirm `DATABASE_URL` exists in Production (missing env crashes cold start) |
| `healthz`/`healthz/db` 200 but hot routes 500 | App+DB ping OK but route query pressure or logic failure | Check Vercel logs for `Failed query` / `EMAXCONNSESSION` / `Unhandled API error` |
| HTML `Internal Server Error` on API routes | Pre–Step 5 behavior or middleware not deployed | Deploy error-handler commit; expect JSON `{ "error": "Internal server error" }` afterward |
| Frontend says “run pnpm dev” | Client saw a **network** failure, not HTTP 5xx | Local API down, CORS/proxy, or browser offline — not pooler |

### Pooler exhaustion pattern (known incident)
**Symptom:** hot DB routes 500 while `/api/healthz` stays 200.  
**Underlying error:** `(EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15`  
**Mitigations already in branch:**
1. `pg.Pool` capped at `max: 1` per serverless isolate
2. Dashboard / subjects list / progress overview bulk-query hardening (less concurrent client demand)
3. `/api/healthz/db` for dependency checks
4. JSON 500 envelope + production-safe frontend 5xx copy

**Immediate operator steps if it returns:**
1. Confirm Supabase session pooler status and active connections.
2. Avoid restarting many Vercel isolates unnecessarily during investigation (each warm isolate holds a client).
3. Smoke `healthz` vs `healthz/db` vs dashboard to classify the failure.
4. Inspect Vercel logs for `EMAXCONNSESSION` or `Unhandled API error`.
5. If connections remain saturated, wait for idle drain / reduce concurrent traffic, then re-smoke.

### Env checklist
- Vercel **Production** and **Preview** both need `DATABASE_URL` (session pooler URL for the app).
- Missing Production `DATABASE_URL` previously caused `FUNCTION_INVOCATION_FAILED` on cold start.

### What “good” looks like after full Batch 1 deploy

```text
GET /api/healthz        → 200  {"status":"ok"}
GET /api/healthz/db     → 200  {"status":"ok","database":"ok"}
GET /api/subjects       → 200  JSON array
GET /api/dashboard/summary → 200  JSON object
GET /api/progress/overview → 200  JSON object
Unhandled API error     → 500  {"error":"Internal server error"} + structured log
Frontend HTTP 5xx       → "The API returned a server error. Please retry while we investigate."
```

## Outcome
- **Status:** complete (baseline smoke + runbook)
- **Production today:** hot routes healthy; `/api/healthz/db` not live yet
- **Blocked follow-up:** open PR / deploy `hardening/production-readiness-batch-1`, then run the post-deploy re-smoke checklist above
- **Operator artifact:** this report is the Batch 1 runbook
