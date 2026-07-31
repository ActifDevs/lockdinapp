# Production Readiness Hardening Batch 1

## Status
- Branch: `hardening/production-readiness-batch-1`
- Scope: production-readiness hardening for API availability, dashboard resilience, route efficiency, health checks, and operator visibility
- Working mode: step-by-step implementation with one report per step
- Step 1 status: complete
- Step 2 status: complete
- Step 3 status: complete
- Step 4 status: complete
- Step 5 status: complete
- Step 6 status: complete (baseline smoke + runbook; post-deploy re-smoke still needed for new routes)
- Batch 1 status: code complete on branch; production deploy of Steps 2–5 pending

## Batch Goals
1. Stabilize serverless API/database behavior under real production traffic.
2. Add production-grade health/diagnostic checks.
3. Reduce high-risk route query fan-out on hot endpoints.
4. Improve error handling and observability.
5. Add focused regression coverage for empty-state and failure-state behavior.

## Planned Step Reports
1. `01-db-pool-and-runtime-hardening.md`
2. `02-db-aware-health-checks.md`
3. `03-dashboard-query-hardening.md`
4. `04-subjects-and-progress-query-audit.md`
5. `05-api-error-handling-and-ux-copy.md`
6. `06-production-smoke-and-runbook.md`

## Current Starting Point
- The session-pooler incident was traced to `EMAXCONNSESSION` under Vercel serverless concurrency.
- A narrow pool-cap mitigation has already been investigated and applied in working changes.
- The next work should treat that incident as a production-readiness signal, not a one-off bug.

## Completed Steps
### Step 1
- Stabilized serverless Postgres usage for the Supabase session pooler.
- Corrected misleading frontend HTTP 500 copy.
- Added focused regression tests for dashboard empty-state and error messaging.
- Verified the affected production endpoints returned to 200 after deployment.

### Step 2
- Added a DB-aware operator endpoint separate from the lightweight liveness check.
- Added route coverage for both healthy and degraded database states.
- Established a production-readiness diagnostic split between function boot and DB reachability.

### Step 3
- Reduced dashboard route query fan-out by replacing repeated per-subject, per-task, per-paper, and per-exam enrichment queries with bulk reads and in-memory joins.
- Preserved the existing dashboard response contract while lowering connection pressure.

### Step 4
- Reduced query fan-out in `/api/subjects` and `/api/progress/overview`.
- Replaced repeated per-subject reads with bulk loads and in-memory grouping.
- Preserved response contracts while lowering connection pressure on overview routes.

### Step 5
- Added a global Express error middleware that returns JSON `{ error: "Internal server error" }` and logs underlying exceptions.
- Generalized frontend 5xx UX copy so all shared query-error surfaces stay production-safe.
- Added focused tests for API error handling and frontend failure messaging.

### Step 6
- Smoked production (`https://lockedin-study.vercel.app`): hot routes 200; concurrent dashboard burst 200.
- Confirmed `/api/healthz/db` is still 404 on production (Steps 2–5 not fully deployed).
- Wrote operator runbook for pooler/5xx triage and a post-deploy re-smoke checklist.
