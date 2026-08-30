# Phase 7 Slice 3 — Error Monitoring

## Baseline

- Repository: `https://github.com/ActifDevs/lockdinapp.git`
- Branch: `phase7-slice3-error-monitoring`
- Base / `origin/main`: `dbd15cc11b6ac8bdf3ca9fef99b304776bc62d8d`
- Phase 7 Slice 7.2: **CLOSED** (Report 115 on main)
- This slice: **7.3A local implementation + hosted-config gate**. No Sentry Cloud projects, no Vercel Sentry env changes, no Production error injection, no Supabase changes, no migration 0016, no merge.
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
- tags `request_id`, `runtime`
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

API events tag `request_id` with the existing Pino/server UUID (`req.id`). Client-supplied request IDs are not used. No user identity is attached.

## Release/environment model

| Runtime | Environment | Release |
| --- | --- | --- |
| Frontend | `VITE_SENTRY_ENVIRONMENT`, else `VITE_VERCEL_ENV`, else Vite `MODE` | `VITE_SENTRY_RELEASE` or `VITE_VERCEL_GIT_COMMIT_SHA` |
| API | `SENTRY_ENVIRONMENT`, else `VERCEL_ENV`, else `NODE_ENV` | `SENTRY_RELEASE` or `VERCEL_GIT_COMMIT_SHA` |

Vercel already provides `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA` to the API function. The browser needs explicit `VITE_*` copies for environment/release unless those are injected at build time in a later hosted slice.

## Source maps

**Not configured in this slice.** Public Vite source maps stay off so the browser bundle does not publish application source.

Recommended later (7.3B), server/build-only:

- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` — never `VITE_*`.
- `@sentry/vite-plugin` for the web build: generate hidden maps, upload to the matching **release SHA**, delete maps from the public `dist` output.
- API already emits linked esbuild maps in `artifacts/api-server/dist` (server-side, not the public SPA). Upload those with the same release SHA via Sentry CLI if readable API stacks are wanted.
- Release SHA must match `VERCEL_GIT_COMMIT_SHA` of the deployed Preview/Production.

## Tests

Focused mocks only. No Sentry Cloud traffic.

Coverage includes the original no-op / single-capture / failure-isolation tests plus representative Sentry event fixtures proving: stack frames survive; locals do not; query/fragment stripped from frame and request URLs; arbitrary exception/event/breadcrumb/extra study text is dropped; exception type, `runtime`, and API `request_id` survive; Auth/cookies/bodies absent; Replay off; PostHog unchanged.

## Regression verification

| Gate | Result |
| --- | --- |
| `pnpm run typecheck` | PASS |
| `pnpm --filter @workspace/api-server test` | PASS — 35 files, 182 tests |
| `vitest run --pool=forks --maxWorkers=1` (frontend) | PASS — 42 files, 251 tests |
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
| **MEDIUM** | Preview is historically Production-backed. Hosted 7.3B must not inject Production errors. |
| **LOW** | React development mode can rethrow boundary errors to the console; production builds are the duplicate-capture check. |
| **LOW** | One shared Sentry project (recommended) mixes frontend/API issues; `runtime` tag is required for filtering. |

## Hosted configuration plan

**Do not create Sentry projects or Vercel Sentry variables in this slice.**

### Recommended topology

**A — one Sentry organization, one project, Preview + Production environments, `runtime` tag (`frontend` / `api`).**

Reasons:

- Privacy controls and `beforeSend` are identical for both runtimes.
- Hobby/free event quotas are not doubled.
- One release SHA covers both artifacts.
- Alerting can still split on `runtime` and `environment`.

**B (separate frontend/API projects)** is clearer for source-map auth and alert routing, but costs two DSNs and two quotas. Use B only if the owner wants isolated billing/alerts after the free-plan limit is understood.

Suggested names (hosted later): org `Lockdin`; project `Lockdin` (or `Lockdin App`).

### Preview (7.3B)

On **`lockdinapp-web`** only, Preview scope:

- `VITE_SENTRY_DSN` = project DSN
- `VITE_SENTRY_ENVIRONMENT=preview`
- `VITE_SENTRY_RELEASE` optional if `VITE_VERCEL_GIT_COMMIT_SHA` is set at build
- `SENTRY_DSN` = same DSN if topology A
- `SENTRY_ENVIRONMENT=preview` (or rely on `VERCEL_ENV`)

Do not set `SENTRY_AUTH_TOKEN` as a runtime `VITE_*` value. If maps are uploaded, use a build-only token.

### Production (later, after Preview proof)

Same names; `environment=production`. Do not configure in 7.3A.

### Source-map auth

Build-only: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`. Never commit. Never `VITE_*`.

### Alerting (configure in 7.3B, not now)

- Preview: issues visible in the project; no paging.
- Production: new unhandled issue / regression; optional repeated API 5xx if the plan supports it.
- Avoid “any event” alerts.

### Retention / privacy toggles (hosted)

- Prefer ≤90 days.
- Session Replay off.
- Default PII / IP off if the project UI offers it.
- No user identification.

## Owner gate

1. Approve topology A (or reject in favour of B).
2. Create the Sentry org/project in the chosen region.
3. Set Preview-only Vercel variables on `lockdinapp-web`.
4. Redeploy the feature-branch Preview.
5. Prove one synthetic frontend and one API error in Preview (not Production).
6. Confirm redaction on received events.
7. Then consider Production env + merge.

## Merge readiness

**MERGE: HOLD.** Local implementation only. Hosted Sentry and Vercel Sentry env are out of scope until owner-authorized 7.3B.
