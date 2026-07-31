# Step 1: DB Pool And Runtime Hardening

## Objective
Harden the API runtime so Supabase session-pooler limits do not take down hot routes under production concurrency.

## Why This Step Exists
- The production dashboard failure was caused by session-pool exhaustion, not schema drift.
- This is the first availability hardening step because other route improvements depend on the API staying up reliably.

## Scope
- Serverless database pool settings
- Runtime connection behavior
- Verification against deployed endpoints
- Focused regression coverage for the affected route behavior

## Success Criteria
- Hot routes stay responsive under light concurrent access.
- `GET /api/healthz`, `GET /api/subjects`, `GET /api/dashboard/summary`, and `GET /api/progress/overview` all return 200 after deployment.
- Regression tests cover the empty/new-user dashboard case and frontend 5xx copy behavior.

## Incident Summary
### User-facing symptom
- The onboarding flow and dashboard intermittently failed with HTTP 500.
- Frontend copy incorrectly suggested the API server was not running locally.

### Initial false lead eliminated
- This was not a hosted-schema mismatch.
- This was not a `GetDashboardSummaryResponse.parse(...)` validation failure.
- This was not a missing `DATABASE_URL` issue by the time Step 1 began.

### Exact runtime exception
Vercel runtime logs showed Drizzle query failures such as:

```text
Error: Failed query: select "id", "unit_id", "subject_id", "title", "status", "notes", "order_index"
from "syllabus_topics" where "syllabus_topics"."subject_id" = $1
```

And direct reproduction against the same Supabase session pooler surfaced the underlying cause:

```text
(EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15
```

## Root Cause
The API runs on Vercel serverless functions against a Supabase **session-mode** pooler.

- `pg.Pool` defaults to `max: 10` clients per process.
- Hot routes like dashboard, subjects, and progress fan out multiple concurrent queries.
- Multiple warm/cold Vercel isolates multiplied that concurrency.
- The session pooler's effective client cap (`pool_size: 15`) was exhausted.

This produced query-level failures in normal route execution, especially on:
- `GET /api/subjects`
- `GET /api/dashboard/summary`
- `GET /api/progress/overview`

## Code Changes
### `lib/db/src/index.ts`
Changed the shared Postgres pool configuration from the implicit default to an explicit serverless-safe profile:

- `max: 1`
- `idleTimeoutMillis: 5_000`
- `connectionTimeoutMillis: 10_000`
- `allowExitOnIdle: true`

Why:
- one client per serverless isolate is safer for session pooling
- parallel awaits queue instead of opening many concurrent sessions
- idle clients are released more aggressively after traffic spikes

### `artifacts/revision-platform/src/lib/query-error-message.ts`
Updated the generic HTTP 500 copy from misleading local-dev guidance to:

```text
The dashboard API returned a server error. Please retry while we investigate.
```

This keeps production users from being told to run `pnpm dev`.

## Tests Added
### API route test
`artifacts/api-server/src/routes/dashboard.empty.test.ts`

Covers:
- empty/new-user database shape
- dashboard route returns 200
- response contains empty arrays and zero counts instead of crashing

### Frontend message test
`artifacts/revision-platform/src/lib/query-error-message.test.ts`

Covers:
- HTTP 500 now shows the production-safe message
- connection-refused style failures still show local dev guidance

## Verification
### Before fix
Observed failing statuses:

| Endpoint | Status |
|---|---|
| `GET /api/healthz` | 200 |
| `GET /api/subjects` | 500 |
| `GET /api/dashboard/summary` | 500 |
| `GET /api/progress/overview` | 500 |

### After deploy + pool drain
Verified live on `https://lockedin-study.vercel.app`:

| Endpoint | Status |
|---|---|
| `GET /api/healthz` | 200 |
| `GET /api/subjects` | 200 |
| `GET /api/dashboard/summary` | 200 |
| `GET /api/progress/overview` | 200 |

Additional verification:
- concurrent burst of 5 `GET /api/dashboard/summary` requests returned all 200
- route tests passed
- frontend test passed

## Remaining Limitations
This step stabilized the runtime, but did not remove the deeper causes of high query pressure:

- dashboard still does multi-query fan-out work
- subjects/progress still need efficiency review
- health checks still do not distinguish app-up from DB-up

Those are deferred to later hardening steps in this batch.

## Outcome
- **Status:** complete
- **Production impact:** API availability restored for the affected routes
- **Risk reduced:** session-pool exhaustion under normal burst traffic
