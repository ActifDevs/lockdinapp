# Phase 4 Slice 1 Global Authentication Implementation and Validation

- **Date:** 2026-08-20
- **Baseline:** `14215f2d2e5e61f6dcec75512ffadfe7f3c87e82`
- **Branch:** `phase4-slice1-global-auth`
- **Status:** Implementation locally validated; Preview and formal QA-owner ratification pending
- **Merge status:** **NOT MERGED TO MAIN**

## Git preflight

- Starting branch: `main`
- Starting HEAD: `14215f2d2e5e61f6dcec75512ffadfe7f3c87e82`
- Starting `origin/main`: `14215f2d2e5e61f6dcec75512ffadfe7f3c87e82`
- Fetched `origin/main`: `14215f2d2e5e61f6dcec75512ffadfe7f3c87e82`
- Working tree before implementation: clean
- Local `main` fast-forward status: already up to date
- Implementation isolation: new branch `phase4-slice1-global-auth` at the verified baseline
- Canonical application drift: none

## Gate 0 policy confirmation

The approved Gate 0 policy matched the repository at the implementation baseline:

- Public GETs: `/healthz`, `/healthz/db`, `/subjects`, `/subjects/:subjectId`, and `/subjects/:subjectId/assessment-components`.
- Optional-auth GET: `/subjects/:subjectId/syllabus`.
- Deliberate anonymous 403 operations: `POST /subjects` and `DELETE /subjects/:subjectId`.
- Every listed caller-owned route already had a local `requireAuth` guard and derived ownership from verified request identity.

The route audit found no material mismatch. A route-directory search found no live handler reading caller ownership from `req.body` or `req.query`; existing ownership-key occurrences are rejection logic and tests.

## Implementation

`global-auth-policy.ts` is mounted at `/api` before the application router. Its final handler calls `requireAuth` for every request unless an exact reviewed exception matched first.

The exception table uses Express route matching rather than string prefixes:

- Paths are exact and parameter-aware.
- Methods are checked explicitly. Express's implicit HEAD-for-GET behavior is not inherited; HEAD remains protected unless separately approved.
- `/subjects/:subjectId` cannot match `/subjects/:subjectId/performance` or other nested paths.
- `OPTIONS` is explicitly passed through, while the existing CORS middleware remains ahead of the policy.
- The syllabus exception invokes `optionalAuth`, so no header remains anonymous, a valid token establishes `req.userId` and `req.accessToken`, and an invalid token returns the existing JSON 401.
- The two read-only catalogue writes bypass authentication only so their existing non-mutating handlers return the approved structured 403.

Existing route-level `requireAuth` and `optionalAuth` guards were retained as defense in depth and to preserve isolated-router security/tests. Both middleware functions now recognize identity already established by the global policy, avoiding a second claims verification for valid authenticated requests. No guard was removed.

## Route exceptions

### Public

- `GET /api/healthz`
- `GET /api/healthz/db`
- `GET /api/subjects`
- `GET /api/subjects/:subjectId`
- `GET /api/subjects/:subjectId/assessment-components`

### Optional auth

- `GET /api/subjects/:subjectId/syllabus`

### Authentication-layer bypass for deliberate 403

- `POST /api/subjects`
- `DELETE /api/subjects/:subjectId`

There are no prefix or router-family exemptions.

## Unknown routes

Before Slice 1, anonymous `GET /api/definitely-not-a-real-route` returned Express HTML `404 Cannot GET ...`.

After Slice 1:

- Anonymous or invalid-auth unknown `/api/*` requests return JSON `401 {"error":"Unauthorized"}`.
- Authenticated unknown `/api/*` requests pass the policy and retain Express 404 behavior.

The anonymous 404-to-401 change is an intentional consequence of the approved fail-secure rule: an unclassified/new API path is protected before route dispatch. Preserving anonymous 404 for unknown paths would require distinguishing registered routes ahead of the default middleware and would weaken or complicate the guarantee that a newly registered non-exempt route automatically inherits authentication.

## Ownership and Supabase safety

- `req.userId` and `req.accessToken` assignment remains inside verified auth middleware.
- Token verification still uses the stateless publishable-key Supabase verifier.
- Caller-owned flows still use per-request bearer-scoped Supabase clients.
- Client ownership-field rejection is unchanged.
- Existing caller filters, RLS, and trusted RPC enforcement are unchanged.
- No service-role/admin client was added.
- No migration, schema, RLS policy, database data, Supabase project setting, or Auth setting changed.

The current Supabase changelog and official auth documentation were checked. No relevant breaking change requires altering this slice. Current guidance supports verified server-side token claims for authorization; the existing implementation already follows that model.

## Files changed

- `artifacts/api-server/src/express-app.ts` — mounts the global policy before registered API routes.
- `artifacts/api-server/src/middlewares/global-auth-policy.ts` — exact reviewed exception table plus fail-secure default.
- `artifacts/api-server/src/middlewares/global-auth-policy.test.ts` — 33 focused policy tests.
- `artifacts/api-server/src/middlewares/require-auth.ts` — avoids duplicate verification after global authentication.
- `artifacts/api-server/src/middlewares/optional-auth.ts` — avoids duplicate verification after global optional authentication.
- `docs/cursor/reports/64-phase4-slice1-global-auth-implementation-and-validation.md` — this report.

No API contract or OpenAPI source changed, so code generation was not run. Generated files remained unchanged.

## Tests added

The new table-driven policy suite covers:

- All five public GET paths anonymously.
- Syllabus optional auth with no token, invalid token, and valid token.
- Every approved authenticated-owned method/path family anonymously.
- Deliberate anonymous 403 catalogue operations.
- Method collisions, including unapproved PUT/PATCH/HEAD variants.
- Nested-path collision protection for subject performance.
- CORS preflight.
- An unclassified route inheriting authentication without a local guard.
- Retained route-level guards verifying a valid token only once.
- Anonymous unknown-route JSON 401 behavior.

## Current validation

| Command                                                                                   | Current result                                                                               |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm --filter @workspace/api-server test -- src/middlewares/global-auth-policy.test.ts`  | **PASS**, 1 file / 33 tests                                                                  |
| `pnpm --filter @workspace/api-server test`                                                | **PASS**, 17 files / 97 tests                                                                |
| `pnpm --filter @workspace/api-server typecheck`                                           | **PASS**                                                                                     |
| `pnpm run typecheck`                                                                      | **PASS**, libraries plus API, frontend, mockup sandbox, and scripts                          |
| `pnpm --filter @workspace/api-server build`                                               | **PASS**                                                                                     |
| `pnpm --filter @workspace/revision-platform test`                                         | **PASS**, 19 files / 88 tests                                                                |
| PowerShell `PORT=3000`, `BASE_PATH=/`; `pnpm --filter @workspace/revision-platform build` | **PASS**, 3,272 modules transformed                                                          |
| `node --test ./scripts/require-local-supabase.test.mjs`                                   | **PASS**, 11/11 safety-guard tests                                                           |
| Prettier check on all changed TypeScript files                                            | **PASS**                                                                                     |
| Built-app auth-boundary smoke with a non-routable dummy DB URL                            | **PASS**: health 200, protected 401, both forbidden operations 403, OPTIONS 204, unknown 401 |

The first direct `pnpm ... exec vitest` attempt did not run tests because the executable was not resolved by that invocation. Repository-defined `pnpm ... test -- <file>` was used instead and passed. Sandbox attempts that required Git Bash/Node worker signal pipes failed before tests and were rerun outside the sandbox. Frontend build attempts without required `PORT`, then without `BASE_PATH`, stopped at the repository config guards; the fully configured build passed. The successful frontend build emitted existing non-fatal base/sourcemap warnings.

Historical checkpoint results are not presented as current reruns. The checkpoint recorded 64 API unit tests, 88 frontend tests, typecheck PASS, and historical Phase 3 integration 41/41 PASS. Current Slice 1 results are the commands and counts above.

## Integration status

**INTEGRATION RERUN: ENVIRONMENT-BLOCKED**

Evidence from `pnpm supabase:status`:

```text
failed to inspect container health ... dockerDesktopLinuxEngine ...
The system cannot find the file specified.
```

The disposable local Supabase stack is not available. The loopback-only safety guard passed 11/11, and no hosted fallback is possible. No Docker start, database reset, bootstrap workaround, Production connection, or database mutation was attempted. Historical 41/41 Phase 3 integration evidence remains historical only.

## Security self-review

1. Protected-route bypass: none found; every non-exempt request reaches `requireAuth`.
2. Prefix collision: none; Express exact route patterns are used, not prefixes.
3. Method bypass: none; exceptions compare the actual HTTP method, including protecting implicit HEAD.
4. Optional auth: malformed/invalid supplied tokens still return generic 401.
5. OPTIONS: only OPTIONS bypasses auth; real methods remain classified independently.
6. Caller ownership: unchanged and still server-derived.
7. Privileged clients: no service-role/admin access added to caller routes.
8. Leakage: responses/log additions expose no tokens, headers, claims, secrets, or environment values.
9. New routes: a newly registered non-exempt `/api` route inherits global authentication.
10. Deliberate 403s: both catalogue operations remain anonymous 403 and non-mutating.
11. OpenAPI: registered protected routes retain bearer declarations; public/optional/forbidden declarations remain compatible. No contract mismatch was introduced.
12. Unknown routes: anonymous behavior changed from HTML 404 to JSON 401 and is explicitly documented above; authenticated behavior remains 404.

## Diff integrity

- Migration/schema/RLS changes: none
- Supabase/Vercel/Production configuration changes: none
- Frontend source/product changes: none
- OpenAPI/generated changes: none
- Syllabus data changes: none
- Environment/secret files: none
- Secret material found in the diff: none
- Phase 4 Slice 2/request-correlation work: not started

## Remaining QA and release work

- Owner-performed Gate 0 verification: **PASS**
- Formal QA-owner ratification: **PENDING / NOT CLAIMED**
- Branch push: pending at report creation
- Preview deployment and Preview auth-boundary smoke: pending
- Merge: **NOT MERGED TO MAIN**
- Production deployment/smoke: not performed

This slice must proceed through Preview and designated QA-owner sign-off before any later merge authorization.
