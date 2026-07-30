# Production Readiness Hardening Batch 1

## Status
- Branch: `hardening/production-readiness-batch-1`
- Scope: production-readiness hardening for API availability, dashboard resilience, route efficiency, health checks, and operator visibility
- Working mode: step-by-step implementation with one report per step

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
