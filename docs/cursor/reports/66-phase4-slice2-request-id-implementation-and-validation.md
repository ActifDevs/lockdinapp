# Phase 4 Slice 2 Request-ID Implementation and Validation

- **Date:** 2026-08-23
- **Baseline:** `15721417b533a2d871a6d91dba7a465953505d40`
- **Branch:** `phase4-slice2-request-id`
- **Status:** Implementation and Preview verified; QA-owner sign-off pending
- **Merge status:** **NOT MERGED TO MAIN**

## Git preflight

- Starting branch: `main`
- Starting `HEAD`: `15721417b533a2d871a6d91dba7a465953505d40`
- Starting `origin/main`: `15721417b533a2d871a6d91dba7a465953505d40`
- Working tree: clean
- Canonical drift: none
- Feature branch created from the verified baseline: `phase4-slice2-request-id`

## Request-ID audit finding

`pino-http@10.5.0` was mounted first in `express-app.ts` without a custom `genReqId`. Its installed default factory used a process-local integer counter. The actual request ID was therefore a number that restarted independently in each serverless process and could repeat across instances. That behavior was unsuitable for the approved cross-instance correlation requirement.

The existing logger serializer already read `req.id`, and `pino-http` attached its request logger to that same request. No middleware mapped an incoming `X-Request-Id` header onto `req.id`; client-supplied values did not influence the application request ID. No response correlation header was previously implemented.

The initial Slice 2 audit stopped at the required design gate before changing code.

## Owner decision

The owner explicitly approved replacing only the unsuitable default generator with Node's built-in `crypto.randomUUID()`.

- **REQUEST-ID GENERATION: SERVER-GENERATED UUID**
- **CLIENT X-REQUEST-ID TRUST: DISABLED**
- No external UUID dependency was added.
- Incoming `X-Request-Id` is ignored and is not echoed as authoritative.
- Vercel's platform `X-Vercel-Id` is not used as the application request ID.

## Final contract and implementation

The request ID has one authoritative generation path:

```text
crypto.randomUUID()
  -> pino-http genReqId
  -> req.id
  -> existing Pino structured request log
  -> response X-Request-Id
```

`generateRequestId` returns one UUID string for `pino-http`. The immediately following centralized `requestIdHeader` middleware safely converts the already-assigned `req.id` to a header string. It does not generate another value.

### Middleware ordering

1. `pino-http` generates the UUID, assigns `req.id`, and attaches the request logger.
2. `requestIdHeader` sets `X-Request-Id` from that same `req.id`.
3. CORS middleware.
4. JSON and URL-encoded body parsing.
5. Slice 1 global authentication policy.
6. API router.
7. Global structured error handler.

This ordering makes the header available before CORS preflight, auth rejection, route responses, unknown-route handling, or the global error handler can terminate an Express response.

## CORS decision

No CORS setting changed. Lockdin's managed frontend and API share the same origin, so browser JavaScript can read `X-Request-Id` without `Access-Control-Expose-Headers`. Allowed origins, methods, headers, and authentication behavior remain unchanged.

## Files changed

- `artifacts/api-server/src/express-app.ts` — configures the approved UUID generator and mounts the centralized response-header middleware immediately after `pino-http`.
- `artifacts/api-server/src/middlewares/request-id.ts` — contains the built-in UUID generator and response-header middleware.
- `artifacts/api-server/src/middlewares/request-id.test.ts` — focused header, UUID, correlation, uniqueness, error-path, and spoofing-resistance tests.
- `docs/cursor/reports/66-phase4-slice2-request-id-implementation-and-validation.md` — this report.

## Focused test coverage

The focused suite contains 10 tests and verifies:

- UUID `X-Request-Id` on public 200.
- UUID `X-Request-Id` on optional-auth 200.
- UUID `X-Request-Id` on protected anonymous 401.
- UUID `X-Request-Id` on deliberate 403.
- UUID `X-Request-Id` on fail-secure unknown 401.
- UUID `X-Request-Id` on genuine CORS preflight 204.
- UUID `X-Request-Id` on a handled 500 response.
- Response header, request object, and captured Pino structured-log `req.id` identity.
- Twenty independent requests produce 20 distinct UUIDs.
- `X-Request-Id: attacker-controlled-id` is ignored; the response and request object retain a different valid server-generated UUID.

## Current automated validation

| Command                                                                                   | Current result                                                       |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm --filter @workspace/api-server test -- src/middlewares/request-id.test.ts`          | **PASS** — 1 file / 10 tests                                         |
| `pnpm --filter @workspace/api-server test -- src/middlewares/global-auth-policy.test.ts`  | **PASS** — 1 file / 33 tests                                         |
| `pnpm --filter @workspace/api-server test`                                                | **PASS** — 18 files / 107 tests                                      |
| `pnpm --filter @workspace/api-server typecheck`                                           | **PASS**                                                             |
| `pnpm run typecheck`                                                                      | **PASS** — libraries plus API, frontend, mockup sandbox, and scripts |
| `pnpm --filter @workspace/api-server build`                                               | **PASS**                                                             |
| `pnpm --filter @workspace/revision-platform test`                                         | **PASS** — 19 files / 88 tests                                       |
| PowerShell `PORT=3000`, `BASE_PATH=/`; `pnpm --filter @workspace/revision-platform build` | **PASS** — 3,272 modules transformed                                 |
| `node --test ./artifacts/api-server/scripts/require-local-supabase.test.mjs`              | **PASS** — 11/11 safety-guard tests                                  |
| Prettier check on all changed TypeScript files                                            | **PASS**                                                             |
| `git diff --check`                                                                        | **PASS**                                                             |

The first full API run was intentionally parallelized with three other resource-heavy validation jobs. One `health.db.test.ts` `beforeAll` import exceeded its 10-second hook timeout while all other 105 tests passed. The full API suite was immediately rerun alone and passed 18 files / 107 tests. This was validation-run resource contention, not a code regression.

The successful frontend build emitted the existing non-fatal base/sourcemap warnings. Historical Slice 1 and Phase 3 results are not presented as current Slice 2 reruns.

## Correlation and uniqueness proof

- **REQUEST-ID RESPONSE/LOG CORRELATION: PASS** in the focused harness. The test captured the Pino completion log and proved its serialized `req.id` exactly equaled both the response `X-Request-Id` and the same request object's `req.id`.
- **REQUEST-ID UNIQUENESS CHECK: PASS**. Twenty independent requests produced 20 distinct UUIDv4-formatted values.
- The regression test provides finite-sample protection; the underlying uniqueness mechanism is Node's `crypto.randomUUID()` rather than a statistical claim based on the sample.

Preview response/log correlation is recorded below.

## Integration status

**INTEGRATION RERUN: ENVIRONMENT-BLOCKED**

`pnpm supabase:status` could not inspect the local stack because the Docker Desktop Linux engine pipe was unavailable:

```text
failed to inspect container health ... dockerDesktopLinuxEngine ...
The system cannot find the file specified.
```

No reset, bootstrap, hosted Supabase fallback, Production database connection, or database mutation was attempted. The exact-loopback safety guard passed 11/11. Historical Phase 3 integration evidence remains historical only.

## Security and scope self-review

1. Authentication behavior and Slice 1 route classification are unchanged.
2. No public route was added and no protected-route bypass was introduced.
3. The ID contains no token, cookie, claim, user ID, database information, or other sensitive input.
4. Incoming `X-Request-Id` remains untrusted and cannot control `req.id`.
5. The response uses the same ID generated for Pino; there is no duplicate response-only ID.
6. UUID headers are present before 200, 401, 403, unknown-route, OPTIONS, and handled-error outcomes.
7. CORS origins and policy are unchanged; no expose-header broadening was added.
8. No database, schema, migration, RLS, RPC, Supabase, Auth, Vercel, environment, frontend, or syllabus-data change exists.
9. No dependency or package file changed.
10. No secret was added or exposed.

## Diff integrity

The implementation is limited to the Express application wiring, one focused request-ID middleware module, its tests, and this report. Phase 4 Slice 1 behavior is retained, and no later Phase 4 work was started.

## Preview status

- Vercel project: `actif-devs/lockdinapp-web`
- Deployment ID: `dpl_5Uw6V1WhNPawt8F3T52v7GRk8MhP`
- Immutable URL: `https://lockdinapp-8ouumxzft-actif-devs.vercel.app`
- Branch alias: `https://lockdinapp-web-git-phase4-slice2-request-id-actif-devs.vercel.app`
- Target/state: `preview` / `READY`
- Source branch: `phase4-slice2-request-id`
- Source SHA: `4caa6d19be4bd8e3f5f1d73e7031bcf67d37b770`
- Git branch/SHA match: **PASS**

## Preview request-ID smoke

All checks targeted the immutable Preview URL. `X-Request-Id` values were valid server-generated UUIDv4 strings.

| Request                                          | Status  | `X-Request-Id`       |
| ------------------------------------------------ | ------- | -------------------- |
| `GET /api/healthz`                               | **200** | present / valid UUID |
| `GET /api/healthz/db`                            | **200** | present / valid UUID |
| `GET /api/subjects`                              | **200** | present / valid UUID |
| Anonymous `GET /api/subjects/1/syllabus`         | **200** | present / valid UUID |
| Invalid-bearer `GET /api/subjects/1/syllabus`    | **401** | present / valid UUID |
| Anonymous `POST /api/subjects`                   | **403** | present / valid UUID |
| Anonymous `GET /api/tasks`                       | **401** | present / valid UUID |
| Anonymous `GET /api/definitely-not-a-real-route` | **401** | present / valid UUID |
| Genuine `OPTIONS /api/tasks` preflight           | **204** | present / valid UUID |

The response statuses and existing bodies remained compatible with the approved Slice 1 boundary.

### Preview uniqueness and spoofing resistance

- Twelve additional independent `GET /api/healthz` requests returned 12 distinct UUIDs: **PASS**.
- A request supplied `X-Request-Id: attacker-controlled-id`.
- The response returned a different valid application UUID, `1a28cbd4-d408-4f65-9553-66ea14145dd4`: **CLIENT HEADER IGNORED — PASS**.

### Preview response/log correlation

For one Preview `GET /api/healthz` request:

- Response `X-Request-Id`: `91a3573e-8fdd-4ec7-8a0d-dbf9e16f7304`
- Pino structured-log `req.id`: `91a3573e-8fdd-4ec7-8a0d-dbf9e16f7304`
- Vercel deployment in the log: `dpl_5Uw6V1WhNPawt8F3T52v7GRk8MhP`
- Log method/path/status: `GET` / `/api/healthz` / `200`

The application ID matched exactly. Vercel's platform request/log identifier was separate and was not used for this comparison.

**REQUEST-ID RESPONSE/LOG CORRELATION: PASS**

- QA-owner sign-off: pending

**NOT MERGED TO MAIN**
