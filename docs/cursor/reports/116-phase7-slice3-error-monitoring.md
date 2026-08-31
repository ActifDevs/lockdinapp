# Phase 7 Slice 3 — Error Monitoring

## Baseline

- Repository: `https://github.com/ActifDevs/lockdinapp.git`
- Branch: `phase7-slice3-error-monitoring`
- Base / `origin/main`: `dbd15cc11b6ac8bdf3ca9fef99b304776bc62d8d`
- Phase 7 Slice 7.2: **CLOSED** (Report 115 on main)
- This slice: **7.3A local implementation + hosted Preview proof + 7.3B runtime-tag remediation + 7.3C debug_meta symbolication remediation**. Hosted frontend delivery, privacy, runtime tags, source-map upload, and stack symbolication passed. Production Sentry remains unconfigured. No Production error injection, no Supabase changes, no migration 0016, and no merge.
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

- `environment`, `release`, `platform` (`javascript` | `node` only; never synthesized)
- `debug_meta.images[]` for `@sentry/core` `SourceMapDebugImage` (`type=sourcemap`) only: `type`, `debug_id`, sanitized `code_file`
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

Vercel already provides `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA` to the API function. The Vite build now copies `VERCEL_GIT_COMMIT_SHA` → `VITE_VERCEL_GIT_COMMIT_SHA` (and `SENTRY_RELEASE` → `VITE_SENTRY_RELEASE` when set) so the browser SDK release matches the API runtime SHA. The auth token is never copied into `VITE_*`.

## Source maps

Implemented in Slice 7.3C. Upload is **conditional** and does not run without `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and a deployment SHA (`SENTRY_RELEASE` or `VERCEL_GIT_COMMIT_SHA`). Local/dev/test builds succeed without those values.

Hosted source-map upload and symbolication are **PROVEN** for Preview release `975b857b33b712b47a98d1d6809b9e07ffbc4d87`.

## Source-map implementation

**Frontend** (`@sentry/vite-plugin@5.4.0`, official Vite upload path):

- When upload is enabled: `build.sourcemap = "hidden"` (no `sourceMappingURL` in public JS).
- Plugin `release.name` is the same SHA resolver used by `initFrontendSentry`.
- `sourcemaps.assets` is limited to `./dist/public/**`.
- `sourcemaps.ignore` excludes `node_modules`, `.env` / `.env.*`, `*.pem`, `credentials.json`.
- Official `sourcemaps.filesToDeleteAfterUpload`: `./dist/public/**/*.map`.
- Plugin `telemetry` is off. Replay/tracing tree-shaking flags are on. `reactComponentAnnotation` is off. `setCommits` / `deploy` are off.
- When upload is disabled: Vite `sourcemap: false` and the plugin is not registered. No upload attempt.

**API** (`@sentry/esbuild-plugin@5.4.0` on the existing esbuild graph; no restructure):

- Linked maps remain (`sourcemap: "linked"`) for `node --enable-source-maps`. They are not the public SPA.
- Plugin is appended only when the same build-only credentials + SHA are present.
- Upload assets: `./dist/**` only, same ignore list. Maps are **not** deleted after upload (server artifact, not publicly served).
- Same `release.name` as the API SDK (`SENTRY_RELEASE` or `VERCEL_GIT_COMMIT_SHA`).

## Release linkage

One deployment → one release SHA. Authoritative hosted value: `VERCEL_GIT_COMMIT_SHA`. Optional override: `SENTRY_RELEASE` / `VITE_SENTRY_RELEASE`. No hardcoded evidence SHAs.

## Build-only credential model

| Item | Value |
| --- | --- |
| Purpose | Create/finalize the Git-SHA release and upload JS + source maps |
| Integration | Owner-created Sentry Internal Integration: `Lockdin Vercel Source Maps` |
| Permission | **Continuous Integration (CI) only**; no additional Sentry permissions enabled |
| Secret | The integration token is configured in Vercel Preview as `SENTRY_AUTH_TOKEN` |
| Hosted slugs | `SENTRY_ORG=actifdevs`; `SENTRY_PROJECT=lockdin-study` (non-secret) |
| Branch scope | Vercel Preview variable scoped to `phase7-slice3-error-monitoring` |
| Client | **Never** `VITE_SENTRY_AUTH_TOKEN`. The token is not defined into or exposed through the Vite client environment. |
| Runtime | Not required. DSN-only init still works without maps. |
| Storage | Vercel `lockdinapp-web` Preview build environment. The token value was never committed or printed in this report. |
| Hosted evidence | The token successfully authenticated both frontend and API source-map uploads. |
| Production | **NOT CONFIGURED** — no Production token or Sentry configuration yet |
| Rotation | Revoke or rotate the Internal Integration token in Sentry, retain **Continuous Integration (CI) only**, update the branch-scoped Vercel Preview secret, and redeploy. |

A real build-only Sentry authentication token **was created and used** for the successful hosted Preview uploads. Its value remains secret and is not recorded in the repository.

## Alerting plan

Do not create alerts in this local implementation (no hosted Sentry write access authorized).

**Preview**

- Issues visible in the project inbox.
- No paging, no team-wide Slack/email storms.

**Production** (configure only after Production DSN + source-map proof; `environment=production`)

- New unhandled issue.
- Regression of a resolved issue.
- Optional: repeated API errors above a meaningful count, filtered `runtime=api`, if the current free plan supports issue alerts cleanly.
- Do **not** alert on every event.

Filters: `environment` and `runtime` (`frontend` / `api`).

## Source-map security review

| Severity | Finding |
| --- | --- |
| **BLOCKER** | Auth token is build-only. No `VITE_SENTRY_AUTH_TOKEN`. Plugin options are not passed through Vite `define`. |
| **BLOCKER** | Public maps: hidden maps + official delete-after-upload when uploading; no public maps when not uploading. |
| **HIGH** | Release name is the deployment SHA used by both SDKs. Upload is refused if SHA is missing (avoids an unmatched release). |
| **HIGH** | Upload globs are `dist/public` (web) and `dist` (API). Env/credential files are ignored. No `uploadLegacySourcemaps` of `.`. |
| **MEDIUM** | Preview vs Production share one project; `environment` + SHA distinguish deploys. Auto `deploy` records are disabled. |
| **MEDIUM** | Maps include compiled application sources for symbolication only. Study content is still stripped from events by `beforeSend`. |
| **LOW** | Free-plan artifact/release limits may delay or drop uploads; events still ingest without maps. |

## Hosted source-map gate completion

1. Build-only Preview credentials were configured without exposing the auth token to `VITE_*`.
2. Frontend and API source-map uploads passed.
3. The feature branch was redeployed at release `975b857b33b712b47a98d1d6809b9e07ffbc4d87`.
4. The owner inspected the controlled Preview frontend event and confirmed symbolication passed.
5. Production Sentry remains unconfigured.

## Tests

Focused mocks only. No Sentry Cloud traffic.

Coverage includes the original no-op / single-capture / failure-isolation tests plus representative Sentry event fixtures proving: stack frames survive; locals do not; query/fragment stripped from frame and request URLs; arbitrary exception/event/breadcrumb/extra study text is dropped; frontend `runtime=frontend` survives; API `runtime=api` and `request_id` survive; frontend `request_id` and all unknown tags are dropped; Auth/cookies/bodies absent; Replay off; PostHog unchanged.

## Regression verification

| Gate | Result |
| --- | --- |
| `pnpm run typecheck` | PASS |
| `pnpm --filter @workspace/api-server test` | PASS — 36 files, 184 tests |
| `vitest run --pool=forks --maxWorkers=1` (frontend) | PASS — 43 files, 259 tests |
| `pnpm --filter @workspace/scripts test:unit` | PASS — 41 tests |
| `pnpm --filter @workspace/scripts test:harness` | PASS — 21 tests |
| `pnpm run check:migrations` | PASS — count=16, head=`0015_silent_sentinel` |
| `pnpm run check:codegen` | PASS — no OpenAPI drift |
| `git diff --check` | PASS |
| `pnpm --filter @workspace/revision-platform run build:vercel` (no Sentry auth token) | PASS — no source-map upload; public `dist/public` has no `.map` files; Sentry remains a separate async chunk (~483 kB); main entry ~613 kB |

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
- Source-map auth/upload: **HOSTED BUILD-ONLY CONFIG PRESENT**. Preview frontend and API artifact uploads passed. Owner inspection confirmed hosted frontend stack symbolication.

Preview remains **PRODUCTION-BACKED**. No Production failure injection was performed and no synthetic API 500 was invented.

## Hosted Preview proof

Frontend hosted delivery: **PASS** (owner verified after runtime-tag remediation, 2026-08-31).

| Evidence | Result |
| --- | --- |
| Frontend event delivery | **PASS** |
| `environment=preview` | **PASS** |
| `runtime=frontend` | **PASS** |
| `release=975b857b33b712b47a98d1d6809b9e07ffbc4d87` | **PASS** |
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
| SLICE 7.3C SOURCE-MAP IMPLEMENTATION | **PASS** |
| SLICE 7.3C HOSTED SYMBOLICATION | **PASS** |
| API HOSTED ERROR | **SAFE-TEST BLOCKED / ACCEPTED SAFETY BOUNDARY** |
| PRODUCTION SENTRY | **NOT CONFIGURED** |
| SLICE 7.3 | **IN PROGRESS** |
| MERGE | **HOLD** |
| NEXT | **PRODUCTION SENTRY CONFIG + MERGE/CLOSEOUT** |

## Pre-remediation Hosted Source-Map Proof

Date: 2026-08-31. Implementation SHA unchanged: `d9894fece6958084f154f60219ebf0f290658e7e`. Documentation-only follow-up.

**Preview source-map config present:** YES (inferred from successful Sentry bundler-plugin upload; values not printed). Build logs used org slug `actifdevs` and project slug `lockdin-study`. Required names: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`. **Not** `VITE_SENTRY_AUTH_TOKEN`. Runtime Preview DSN/environment names from Slice 7.3B were not rewritten in this session.

**Release SHA:** `d9894fece6958084f154f60219ebf0f290658e7e` (build log `Release:` + public `SENTRY_RELEASE` inject).

**Vercel Preview (after source-map vars; latest READY redeploy):**

- Deployment: `dpl_5m3nmuVTMWcR7nGGuAdS4dtKehK5`
- Immutable URL: `https://lockdinapp-chc39hzwp-actif-devs.vercel.app`
- Branch: `phase7-slice3-error-monitoring`
- Source: `d9894fece6958084f154f60219ebf0f290658e7e`
- State: **READY**
- Inspector: `https://vercel.com/actif-devs/lockdinapp-web/5m3nmuVTMWcR7nGGuAdS4dtKehK5`

**Frontend artifact upload:** **PASS** (`[sentry-vite-plugin] Successfully uploaded source maps`; same release SHA; no auth/org/project mismatch in logs; no token printed).

**API artifact upload:** **PASS** (`[sentry-esbuild-plugin] Successfully uploaded source maps`; `index.mjs` + worker maps; same org/project/release).

**Public frontend maps:** **NOT EXPOSED**. Entry JS has no `sourceMappingURL`. Known asset `.map` URLs are not downloadable application maps. Plugin delete-after-upload ran as configured.

**Frontend symbolication at this pre-remediation SHA:** **NOT PROVEN**. One controlled Preview `Error("SENTRY_SOURCEMAP_PREVIEW_TEST")` was thrown in a headless Chrome session against this deployment. This agent had **no Sentry Cloud session** (`actifdevs.sentry.io` → Sign In). The later owner inspection and remediation are recorded below.

**Privacy retest at this pre-remediation SHA:** **NOT RE-INSPECTED** in Sentry (same login gap). Prior 7.3B Preview event remained redacted. Public bundle contains no auth token.

**API hosted error:** **SAFE-TEST BLOCKED / ACCEPTED SAFETY BOUNDARY**. Maps uploaded; no manufactured API 500.

**Secrets:** none printed or committed.

## Hosted symbolication finding (Slice 7.3C)

Owner inspection of the Preview event for release `d9894fece6958084f154f60219ebf0f290658e7e`:

- Frontend and API source maps **uploaded successfully**.
- Release linkage **passed**.
- Stack remained minified (`/assets/index-*.js:<line>:<column>`).
- Exact event JSON contained **no `debug_meta`**.
- Event `platform` was observed as `other`.

**Root cause (local proof):** `beforeSend` rebuilds the Sentry event from an allow-list. `@sentry/core` `Event` includes `debug_meta` (`images: SourceMapDebugImage[]` with `type`, `code_file`, `debug_id`) and `platform`. The sanitizer omitted both. Sentry ingest then cannot Debug-ID-match uploaded maps, and missing `platform` surfaces as `other`.

This is **not** a source-map upload/release defect. The build pipeline was not redesigned.

**Remediation**

- Preserve `debug_meta.images` entries only when `type === "sourcemap"`, `debug_id` is a valid UUID, and `code_file` is a generated JS/script path.
- Sanitize `code_file` with the **same** `sanitizeFramePath` used for frame `abs_path` / `filename` (strip query and fragment; do not treat the two sides differently).
- Drop wasm/macho images, unknown `debug_meta` keys, and extra image fields (`debug_file`, nested objects).
- Preserve event `platform` only when it is `javascript` or `node`. Do not synthesize platform.

**Tests:** representative fixtures prove debug_meta survival, field allow-list, debug_id unchanged, query/fragment stripped from `code_file`, `abs_path === code_file`, unknown metadata dropped, `platform=javascript` preserved, unknown platforms dropped, existing privacy tags/user/extra/auth/bodies/study-text/Replay/PostHog/no-duplicate-capture contracts unchanged.

**Privacy review:** no PII/user content reintroduced; no auth token in the client bundle; arbitrary `debug_meta` is not copied.

## Final hosted symbolication proof

Owner inspection of the hosted Preview frontend event for release `975b857b33b712b47a98d1d6809b9e07ffbc4d87`:

| Evidence | Result |
| --- | --- |
| Release | `975b857b33b712b47a98d1d6809b9e07ffbc4d87` — **PASS** |
| `debug_meta` | **PRESENT — PASS** |
| `debug_meta` image | `type=sourcemap` — **PASS** |
| `debug_id` | **PRESENT — PASS** |
| `code_file` | generated frontend asset — **PASS** |
| `platform` | `javascript` — **PASS** |
| Frontend source-map upload | **PASS** |
| API source-map upload | **PASS** |
| Hosted stack symbolication | **PASS** |
| Privacy | **UNCHANGED** |
| Exception | `[redacted-message]` |
| PII | **NONE OBSERVED** |
| Study content | **NONE OBSERVED** |
| API hosted error | **NOT TESTED — ACCEPTED SAFETY BOUNDARY** |

The generated frontend asset frame was resolved by Sentry to original source information under the Sentry browser package rather than remaining only a minified `/assets/index-*.js:<line>:<column>` frame.

The top `<unknown> in eval` frame is expected because the controlled test was triggered from DevTools/eval and therefore has no original application source file to symbolicate.
