# Step 2: DB-Aware Health Checks

## Objective
Add a database-aware operator check so production diagnostics can distinguish:

- app runtime is up
- database is reachable

without relying on a heavier application route like dashboard.

## Why This Step Exists
- `/api/healthz` currently proves only that the Vercel function booted.
- During the production incident, the route returned 200 while DB-backed routes were failing.
- Production readiness requires a fast way to separate runtime failure from dependency failure.

## Scope
- add a DB-aware health endpoint
- keep the existing lightweight liveness endpoint
- add focused route coverage for healthy and degraded DB states

## Success Criteria
- `GET /api/healthz` remains a cheap app liveness check
- `GET /api/healthz/db` returns 200 when Postgres is reachable
- `GET /api/healthz/db` returns 503 with a degraded payload when Postgres is unavailable

## Implementation
### Existing route kept
`GET /api/healthz`

This remains the lightweight liveness check used to confirm the function booted and Express is serving requests.

### New route added
`GET /api/healthz/db`

Behavior:
- executes a trivial SQL query (`select 1`)
- returns `200` with:

```json
{
  "status": "ok",
  "database": "ok"
}
```

- returns `503` with:

```json
{
  "status": "degraded",
  "database": "down",
  "message": "..."
}
```

## Tests Added
### `artifacts/api-server/src/routes/health.db.test.ts`
Covers both:
- healthy database case
- unavailable database case

## Verification
### Local / test verification
- `@workspace/api-server` test suite passed with the new health route coverage
- no linter issues in the health route or test file

### Deployment note
This step has been implemented and tested locally in the branch.
Production verification of `/api/healthz/db` will happen when this branch is deployed in a later batch checkpoint or deploy step.

## Outcome
- **Status:** complete
- **Operator benefit:** production diagnostics can now distinguish app-up from DB-up
- **Next dependency:** deploy and smoke-check the new DB-aware route as part of a later verification pass
