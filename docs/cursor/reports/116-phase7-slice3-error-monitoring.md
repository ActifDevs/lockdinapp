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

`beforeSend` rebuilds events on an allow-list:

- Keep: environment, release, sanitized exception/message, `request.method` + sanitized path, tags `request_id` and `runtime`.
- Drop: `user`, extra bags, cookies, headers, request/response bodies, query strings, fragments.
- Redact in strings: email, JWT, Bearer tokens, `postgres://` URLs.
- Paths: query/hash stripped; UUID and numeric segments become `:id`.

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

Coverage includes: missing config no-op; one boundary capture; one API central capture; Sentry failure does not change HTTP/UI; `request_id`; release/environment; Authorization/cookies/bodies/PII/study content/DB URLs/query strings removed; Replay + default PII off; PostHog exception capture not introduced.

## Regression verification

| Gate | Result |
| --- | --- |
| `pnpm run typecheck` | PASS |
| `pnpm --filter @workspace/api-server test` | PASS — 35 files, 183 tests |
| `vitest run --pool=forks --maxWorkers=1` (frontend) | PASS — 42 files, 249 tests (plus focused monitoring re-run 12/12) |
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
| **MEDIUM** | Exception **messages** can still include unexpected free text if a developer throws user content. Redaction covers common patterns, not every string. |
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
