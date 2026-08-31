# Phase 7 Slice 3 — Error Monitoring

## Baseline

- Repository: `https://github.com/ActifDevs/lockdinapp.git`
- Branch: `phase7-slice3-error-monitoring`
- Base / `origin/main`: `dbd15cc11b6ac8bdf3ca9fef99b304776bc62d8d`
- Phase 7 Slice 7.2: **CLOSED** (Report 115 on main)
- This slice: **7.3A local implementation + hosted Preview proof + 7.3B runtime-tag remediation and final Preview reconciliation**. Hosted frontend delivery, privacy, and remediated runtime-tag proof passed. Production Sentry remains unconfigured. No Production error injection, no Supabase changes, no migration 0016, and no merge.
- Migration head: **0015_silent_sentinel**. **0016 ABSENT**.
- SDKs: `@sentry/react@10.71.0` (frontend), `@sentry/node@10.71.0` (API). Same major. Official current v10 APIs (`init`, `beforeSend`, `captureReactException`, `reactErrorHandler`). `setupExpressErrorHandler` is **not** used, to keep a single capture at the existing API error middleware.

## Approved contract

Owner-approved (Report 114, 2026-08-30):

- Sentry for React + Express
- No Session Replay
- No PII
- No raw request bodies
- No Authorization headers / cookies
- No user study content
- No database credentials
- Sanitized stack traces / messages
- Release = Git SHA when available (never hardcoded)
- Environment: `development` | `preview` | `production`
- Existing server request ID attached where useful
- Preview and Production distinguishable
- Actionable alerting later (not configured here)
- Prefer ≤90 day retention where configurable (hosted)
- PostHog remains product analytics only; no PostHog exception capture

## Current error architecture

**Frontend**

- `main.tsx` mounted `App` with no monitoring.
- `RouteErrorBoundary` in `App.tsx` rendered fallback UI only (no reporting).
- Wouter routes; no React Router `errorElement`.
- Vite production build; source maps were not generated for the public web bundle.

**API**

- `express-app.ts`: Pino + server-generated request ID (`crypto.randomUUID` via `generateRequestId`; incoming client IDs are not trusted).
- Central `errorHandler` logs JSON and returns `{ error: "Internal server error" }`.
- Pino request serializer already strips query strings.
- Serverless entry: `artifacts/revision-platform/api/index.mjs` → prebuilt `api-server/dist/index.mjs`.
- PostHog `posthog-node` remains the only product-analytics SDK; it does not capture exceptions.

## Implementation

Internal modules only (no page-level Sentry calls):

- Frontend: `artifacts/revision-platform/src/lib/monitoring/`
- API: `artifacts/api-server/src/lib/monitoring/`

Missing DSN = safe no-op. Sentry exceptions are swallowed so product/API behaviour does not change.

## Frontend capture

- `initFrontendSentry()` in `main.tsx` when `VITE_SENTRY_DSN` is set.
- Unhandled root errors: `createRoot(..., { onUncaughtError })` via official `reactErrorHandler` **only when initialized**.
- Boundary errors: `RouteErrorBoundary.componentDidCatch` → `reportBoundaryError` → `captureReactException` once.
- `onCaughtError` is **not** wired, so the same boundary exception is not also captured by the React 19 root hook.
- Unhandled rejections: default browser SDK integration when initialized (no extra manual listener).
- Replay / tracing / feedback / profiling integrations are filtered out if present. Sample rates for replay and traces are `0`.

## API capture

- `initApiSentry()` at Express app module load when `SENTRY_DSN` is set.
- Single `reportApiException` from `errorHandler`.
- No per-route capture. Official `setupExpressErrorHandler` omitted to avoid a second capture.
- OpenTelemetry auto-setup and ESM loader hooks are off (`skipOpenTelemetrySetup`, `registerEsmLoaderHooks: false`) so HTTP bodies/headers are not collected by default instrumentation. `@opentelemetry/api` is still a workspace dependency so Drizzle keeps a single type identity after Sentry is installed.
- User-facing JSON 500, Pino logging, and request IDs are unchanged.

## Privacy/redaction

### Owner-review findings (fixed before hosted config)

1. **Stacktrace loss.** The first sanitizer rebuilt `exception.values[]` with only `type` and `value`, dropping the official `stacktrace.frames` object (`@sentry/core` `Exception` / `Stacktrace` / `StackFrame`). Hosted issues would not have been symbolication-ready.
2. **Arbitrary free-text leakage.** Pattern matching (email/JWT/Bearer/Postgres/`title:` labels) could not cover study text such as “Revise photosynthesis chapter 4”. Frontend `extra` also kept unknown string keys.

### Remediation

`beforeSend` still **rebuilds** the event. It does not clone the original payload.

**Retained**

- `environment`, `release`
- exception `type`
- exception `value` only if it is on an explicit allow-list (currently empty; otherwise `[redacted-message]`)
- stack frames, using official field names only: `function`, `module`, `filename`, `abs_path`, `lineno`, `colno`, `in_app`, `platform`
- `request.method` + sanitized path
- frontend tag: `runtime` only
- API tags: `runtime`, `request_id` only
- diagnostic breadcrumbs only (`navigation`, `fetch`, `xhr`, `http`) with sanitized `url` / `from` / `to` / `method` / `status_code`

**Dropped**

- `event.message` (Lockdin does not use `captureMessage`)
- arbitrary exception values / study content
- frame `vars`, `context_line`, `pre_context`, `post_context`, `module_metadata`
- `user`, `extra`, unapproved `contexts`
- cookies, headers, Authorization, bodies, query strings, fragments
- console / `ui.*` breadcrumbs and all breadcrumb `message` text

`sendDefaultPii` is `false`. Session Replay sample rates are `0` and Replay is not installed.

## Request correlation

API events tag `request_id` with the existing Pino/server UUID (`req.id`) through Sentry's public capture-context `{ tags }` shape. Client-supplied request IDs are not used. No user identity is attached.

## Release/environment model

| Runtime | Environment | Release |
| --- | --- | --- |
| Frontend | `VITE_SENTRY_ENVIRONMENT`, else `VITE_VERCEL_ENV`, else Vite `MODE` | `VITE_SENTRY_RELEASE` or `VITE_VERCEL_GIT_COMMIT_SHA` |
| API | `SENTRY_ENVIRONMENT`, else `VERCEL_ENV`, else `NODE_ENV` | `SENTRY_RELEASE` or `VERCEL_GIT_COMMIT_SHA` |

Vercel already provides `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA` to the API function. The browser needs explicit `VITE_*` copies for environment/release unless those are injected at build time in a later hosted slice.

## Source maps

**Not configured in this slice.** Public Vite source maps stay off so the browser bundle does not publish application source.

Deferred to a later owner-authorized source-map step, server/build-only:

- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` — never `VITE_*`.
- `@sentry/vite-plugin` for the web build: generate hidden maps, upload to the matching **release SHA**, delete maps from the public `dist` output.
- API already emits linked esbuild maps in `artifacts/api-server/dist` (server-side, not the public SPA). Upload those with the same release SHA via Sentry CLI if readable API stacks are wanted.
- Release SHA must match `VERCEL_GIT_COMMIT_SHA` of the deployed Preview/Production.

## Tests

Focused mocks only. No Sentry Cloud traffic.

Coverage includes the original no-op / single-capture / failure-isolation tests plus representative Sentry event fixtures proving: stack frames survive; locals do not; query/fragment stripped from frame and request URLs; arbitrary exception/event/breadcrumb/extra study text is dropped; frontend `runtime=frontend` survives; API `runtime=api` and `request_id` survive; frontend `request_id` and all unknown tags are dropped; Auth/cookies/bodies absent; Replay off; PostHog unchanged.

## Regression verification

| Gate | Result |
| --- | --- |
| `pnpm run typecheck` | PASS |
| `pnpm --filter @workspace/api-server test` | PASS — 35 files, 182 tests |
| `vitest run --pool=forks --maxWorkers=1` (frontend) | PASS — 42 files, 252 tests |
| `pnpm --filter @workspace/scripts test:unit` | PASS — 41 tests |
| `pnpm --filter @workspace/scripts test:harness` | PASS — 21 tests |
| `pnpm run check:migrations` | PASS — count=16, head=`0015_silent_sentinel` |
| `pnpm run check:codegen` | PASS — no OpenAPI drift |
| `git diff --check` | PASS |
| `pnpm --filter @workspace/revision-platform run build:vercel` | PASS — Sentry is a separate async chunk (~483 kB) loaded only after a DSN init; main entry ~613 kB |

`@opentelemetry/api@1.9.1` was added to `@workspace/db`, `@workspace/api-server`, and `@workspace/scripts` so Drizzle keeps a single type identity after `@sentry/node` is installed.

## Security/privacy review

| Severity | Finding |
| --- | --- |
| **BLOCKER** | None in this implementation. |
| **HIGH** | Browser DSN is public by design. Treat it as a project identifier, not an admin token. Auth token must never be `VITE_*`. |
| **MEDIUM** | *(Fixed before hosted config.)* Arbitrary exception/event text is no longer pattern-matched; values fail closed to `[redacted-message]`. |
| **MEDIUM** | *(Fixed before hosted config.)* Stack frames are now rebuilt from official `StackFrame` fields instead of being dropped. |
| **MEDIUM** | Preview is historically Production-backed. Hosted proof must not inject Production errors. |
| **LOW** | React development mode can rethrow boundary errors to the console; production builds are the duplicate-capture check. |
| **LOW** | One shared Sentry project (recommended) mixes frontend/API issues; `runtime` tag is required for filtering. |

## Hosted topology and configuration

- Topology: approved **ONE organization / ONE project**, separated by `environment` and `runtime`.
- Preview frontend Sentry: **CONFIGURED** and delivery proven.
- Production Sentry: **NOT CONFIGURED**.
- Session Replay: **OFF**.
- Default PII: **OFF**.
- PostHog: **UNCHANGED**; it remains product analytics only and does not capture exceptions.
- Source-map auth/upload: **NOT CONFIGURED**. Stacktrace presence was proven without changing this gate.

Preview remains **PRODUCTION-BACKED**. No Production failure injection was performed and no synthetic API 500 was invented.

## Hosted Preview proof

Frontend hosted delivery: **PASS** (owner verified after runtime-tag remediation, 2026-08-31).

| Evidence | Result |
| --- | --- |
| Frontend event delivery | **PASS** |
| `environment=preview` | **PASS** |
| `runtime=frontend` | **PASS** |
| `release=d27f686c5204f57993a906a81b96094e2e161f2d` | **PASS** |
| Exception message `[redacted-message]` | **PASS** |
| Stacktrace | **PRESENT — PASS** |
| IP/geography | **FILTERED — PASS** |
| PII | **NONE OBSERVED** |
| Study content | **NONE OBSERVED** |
| Session Replay | **NONE** |
| Duplicate capture | **NONE** |

API hosted error proof: **SAFE-TEST BLOCKED**. Preview remains Production-backed and no safe non-destructive genuine API 500 path exists. No API error was manufactured solely for telemetry proof. Automated API monitoring tests remain **PASS**; this is the accepted safety boundary for hosted API proof.

## Runtime-tag root cause

The sanitizer was not the sole cause.

Frontend event path before remediation:

1. `initFrontendSentry` configured environment, release, and privacy hooks but did not set a runtime tag on the Sentry scope.
2. `captureReactException` and the React root `reactErrorHandler` capture paths did not add event tags.
3. Sentry therefore prepared the event without `tags.runtime`.
4. `beforeSend` rebuilt the event and correctly preserved allow-listed tags only when they already existed; it did not synthesize a missing runtime tag.
5. The final hosted frontend event had no `runtime` tag.

The earlier frontend sanitizer test injected `runtime=frontend` directly into its fixture, so it proved preservation but did not prove the real initialization/capture path supplied the tag.

API inspection found a second capture-path issue: `reportApiException` hid the SDK signature behind a custom type and passed tags under nested `captureContext.tags`. Sentry v10's public `captureException` capture context accepts `{ tags }` directly. The old mock asserted the custom nested shape rather than the SDK contract.

## Runtime-tag remediation

- Frontend initialization now calls Sentry `setTag("runtime", "frontend")` after successful `init`, so boundary, root, and SDK-managed frontend error paths inherit the tag before `beforeSend`.
- API initialization now calls Sentry `setTag("runtime", "api")`, covering every API event emitted through the configured SDK scope.
- `reportApiException` now uses the public capture context `{ tags: { runtime, request_id } }`.
- Frontend allowed custom tags are tightened to `runtime` only.
- API allowed custom tags remain limited to `runtime` and `request_id`.
- Unknown tags are still dropped. The sanitizer still rebuilds the event and none of the privacy/redaction protections were weakened.

## Remediation verification

| Gate | Result |
| --- | --- |
| Focused frontend + API monitoring tests | PASS — 4 files, 16 tests |
| `pnpm run typecheck` | PASS |
| `pnpm --filter @workspace/api-server test` | PASS — 35 files, 182 tests |
| frontend `vitest run --pool=forks --maxWorkers=1` | PASS — 42 files, 252 tests |
| `pnpm run check:migrations` | PASS — count=16, head=`0015_silent_sentinel` |
| `pnpm run check:codegen` | PASS — no OpenAPI drift |
| `pnpm --filter @workspace/revision-platform run build:vercel` | PASS |
| `git diff --check` | PASS |

Privacy/redaction regression: **PASS**. Duplicate capture remains **NONE** by design and tests. Monitoring failures remain isolated from product/API behaviour. Migration: **NONE**. 0016: **ABSENT**. PostHog: **UNCHANGED**.

## Merge readiness

| Gate | Verdict |
| --- | --- |
| SLICE 7.3A LOCAL | **PASS** |
| SLICE 7.3B FRONTEND PREVIEW | **PASS** |
| API HOSTED PROOF | **SAFE-TEST BLOCKED / ACCEPTED SAFETY BOUNDARY** |
| PRODUCTION SENTRY | **NOT CONFIGURED** |
| SLICE 7.3 | **IN PROGRESS** |
| MERGE | **HOLD** |
| NEXT | **OWNER REVIEW → PRODUCTION SENTRY CONFIG + MERGE** |
