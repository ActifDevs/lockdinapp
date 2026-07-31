# Step 5: API Error Handling And UX Copy

## Objective
Make server failures production-safe and diagnosable:
- return consistent JSON error envelopes from the API
- log underlying errors for operators
- stop showing misleading local-dev guidance for production HTTP 5xx responses

## Why This Step Exists
- Unhandled route exceptions previously bubbled to Vercel as HTML `Internal Server Error`.
- Frontend pages share `getQueryErrorMessage`, which was still partly dashboard-specific and previously blamed a stopped local server for every 500.
- Production readiness requires predictable failure behavior across hot routes.

## Scope
- global Express error middleware
- production-safe frontend 5xx messaging used by dashboard/progress/calendar/subject-detail
- focused tests for the new failure behavior

## Success Criteria
- [x] unhandled route errors return JSON `{ error: "..." }` with HTTP 500
- [x] the error middleware logs the underlying exception (including `cause` when present)
- [x] frontend 5xx copy is generic and production-safe
- [x] connection failures can still surface local-dev guidance

## Changes
### API
- Added `artifacts/api-server/src/lib/error-handler.ts`
  - Express error middleware logs `err.message`, `stack`, and `cause`
  - responds with `500` + `{ error: "Internal server error" }`
  - does not leak internal exception text to clients
- Wired `errorHandler` after the `/api` router in `express-app.ts`

### Frontend
- Updated `getQueryErrorMessage` to treat any HTTP 5xx as:
  - `The API returned a server error. Please retry while we investigate.`
- Kept connection-failure guidance pointing at `pnpm dev` for local reachability issues

### Tests
- `artifacts/api-server/src/lib/error-handler.test.ts` — JSON 500 + logger payload
- Expanded `query-error-message.test.ts` for structured 5xx, other 5xx, network, and non-Error cases

## Verification
- `pnpm --filter @workspace/api-server run typecheck` — pass
- `pnpm --filter @workspace/api-server run test` — pass (4 tests)
- `pnpm --filter @workspace/revision-platform run typecheck` — pass
- `pnpm --filter @workspace/revision-platform run test -- src/lib/query-error-message.test.ts` — pass (6 tests)

## Notes / Follow-ups
- Production smoke of a forced 500 (and log inspection) belongs in Step 6.
- Route-level try/catch is still optional; Express 5 + this middleware covers unhandled async/sync failures on registered routes.
