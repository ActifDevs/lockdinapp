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

## Implementation Notes
- In progress.
