# Phase 7 Slice 2 — Product Analytics

## Baseline

- Repository: `https://github.com/ActifDevs/lockdinapp.git`
- Branch: `phase7-slice2-product-analytics`
- Base / `origin/main` at branch creation: `897427501595ae6c6582ea99851c9832c17f76ec`
- Phase 7 Slice 7.1: **CLOSED** (Reports 113 and 114 on main)
- This slice: **7.2A local implementation + hosted-config gate**, including identity remediation. No PostHog projects created, no Vercel env changes, no Supabase changes, no migration 0016, no merge to main.
- Migration head: **0015_silent_sentinel**. **0016 ABSENT**.
- SDK: `posthog-node` only (API). **`posthog-js` was removed** after owner review: a browser anonymous distinct id cannot join to API HMAC aliases, so a connected activation funnel was not possible.

## Approved contract

Owner-approved (Report 114, 2026-08-30), unchanged except identity delivery:

- Provider: **PostHog Cloud EU**
- Custom events only: `account_created`, `onboarding_completed`, `task_created`, `past_paper_attempt_created`
- Not implemented: `first_task_created`, `first_past_paper_attempt`, `streak_achieved`, `subject_completed`
- No autocapture, Session Replay, heatmaps, surveys, advertising integrations, or automatic exception capture
- Allow-list properties only; Preview and Production separated by **separate projects** plus an `environment` property
- Analytics failure must not fail product writes or session establishment
- Missing configuration = safe no-op

## Implementation

**All PostHog capture is server-side.** The frontend does not initialize PostHog and does not send events to PostHog.

- API module: `artifacts/api-server/src/lib/analytics/`
- First-party endpoint: `POST /api/analytics/account-created` (OpenAPI `reportAccountCreated`)
- Frontend: local pending-signup marker + best-effort call to that endpoint (`artifacts/revision-platform/src/lib/analytics/`)

Product call sites:

- Signup lifecycle: `auth-provider.tsx` `noteLocalSignup` then `emitAccountCreatedIfPending` → `POST /api/analytics/account-created` (empty body; `skipUnauthorizedHandler` so a 401 cannot log the user out)
- `trackOnboardingCompleted` after successful `POST /api/profile/complete-onboarding`
- `trackTaskCreated` after successful `POST /api/tasks` (201)
- `trackPastPaperAttemptCreated` after successful `POST /api/past-paper-attempts` (201)

Unknown event names cannot pass `sanitizeApprovedEvent`. Unknown/forbidden properties are dropped.

A **browser anonymous PostHog id plus API HMAC id is not a connected funnel.** That earlier design is withdrawn.

## Event contracts

| Event | Capture owner | Trigger | Properties |
| --- | --- | --- | --- |
| `account_created` | API (after first-party POST) | Local signup pending + authenticated session | `environment` |
| `onboarding_completed` | API | Successful onboarding RPC (already-completed returns 409) | `environment`, `subject_count` |
| `task_created` | API | Each successful task insert | `environment` |
| `past_paper_attempt_created` | API | Each successful attempt insert | `environment` |

API events also set `$process_person_profile: false` as a PostHog delivery flag, not a product property.

## Identity model

**Unified:** every approved event uses HMAC-SHA256 of the authenticated Supabase UUID with `LOCKDIN_ANALYTICS_ALIAS_SECRET`, prefixed `lockdin_ph_`.

- Never sent: email, name, username, raw Supabase UUID.
- No `identify()` and no browser distinct id.
- No analytics identity table/column. No migration.
- Alias secret: server-only, never `VITE_*`, never logged, never committed. Missing/short secret ⇒ API analytics no-op.

## Account-boundary handling

- Successful `signUp` stores a **local** pending marker. Ordinary `login` does not.
- When a matching session appears, the frontend calls `POST /api/analytics/account-created` once (in-flight + emitted flags). The API uses `req.userId` from the verified JWT. Bodies with any keys (including `userId` / email) are rejected with 400.
- The endpoint always returns **204** after auth so PostHog failures do not break session, navigation, or onboarding. 401 on this call does not invoke the global logout handler.

## account_created retry / deduplication

Current PostHog Node `capture` / `captureImmediate` accepts an optional **`uuid`**. Official docs: a unique UUID can help storage de-duplicate retries; **capture itself does not deduplicate**, and **strict immediate dedup is not guaranteed**. CDP troubleshooting also mentions matching uuid + event name + timestamp + distinct_id.

This implementation:

- Sends a **deterministic UUID v5-shaped id** derived from HMAC(alias + `account_created`), not the raw user UUID, on `account_created` only (occurrence events keep auto UUIDs).
- Relies on local pending/emitted flags as the primary once-per-signup guard.
- Does **not** invent database telemetry state.
- Remaining risk: a retried first-party call before the local emitted flag is set could still produce a duplicate ingest; PostHog may eventually collapse matching uuids. Treat funnel counts as best-effort until Preview proof.

## Privacy controls

There is no browser PostHog init. Server client: `disableGeoip: true`, `enableExceptionAutocapture: false`, `captureImmediate` with an 800ms budget. Failures swallowed. Logs: `{ context: "analytics", event }` only.

Owner must still disable Replay/autocapture/heatmaps/surveys/exception capture **in the PostHog project UI** (server SDK does not autocapture those, but dashboard defaults can still be confusing).

## Environment model

Logical values: `development` | `preview` | `production` via **server** `LOCKDIN_ANALYTICS_ENV`, else `VERCEL_ENV`, else `NODE_ENV`.

**No `VITE_POSTHOG_*` variables.** No client PostHog project token.

## Privacy disclosure

`privacy.tsx` states PostHog EU is used from the **server** for limited custom events, with no browser SDK, no Session Replay, autocapture, heatmaps, or advertising integrations, and without email/name/username/study scores. It does **not** claim lawful basis. Formal review remains flagged.

## Tests

- Missing server config = no-op
- Unknown events / forbidden properties rejected
- All four events share one HMAC distinct id; raw UUID not in the capture payload
- `account_created` uses deterministic `uuid`; occurrence events do not
- Ordinary login does not call the first-party endpoint
- Pending signup + session calls the endpoint once with an empty body
- Endpoint requires auth; cannot choose another user via body
- PostHog throw does not fail 204 / onboarding / task / past-paper
- `skipUnauthorizedHandler` does not log the user out on 401
- No browser PostHog identity tests (SDK removed)

## Regression verification

Recorded after identity remediation:

- `pnpm run typecheck`: PASS
- `pnpm --filter @workspace/api-server test`: PASS (170)
- Frontend `vitest run --pool=forks --maxWorkers=1`: PASS (237)
- `pnpm --filter @workspace/scripts test:unit`: PASS
- `pnpm --filter @workspace/scripts test:harness`: PASS
- `pnpm run check:migrations`: PASS `count=16 head=0015_silent_sentinel`
- OpenAPI codegen regenerated and committed with this change
- API esbuild + Vite production build: PASS
- `git diff --check`: PASS

## Security/privacy review

| Severity | Finding |
| --- | --- |
| **BLOCKER** | The previous mixed identity is **fixed**. |
| **HIGH** | Local pending-signup storage may hold a Supabase user id **in the browser only**; it is not sent to PostHog. |
| **MEDIUM** | PostHog `uuid` dedup is eventual/best-effort. Preview/Production token mix remains an operational risk. |
| **LOW** | Serverless freeze can still drop an event. `$process_person_profile` is a control flag. |

## Hosted-config requirements

Do **not** create these in this slice.

### POSTHOG PREVIEW PROJECT

- Region: **EU**
- Suggested name: `Lockdin Preview`
- Token: Project API key (`phc_…`)
- Host: `https://eu.i.posthog.com`
- Settings: autocapture/replay/heatmaps/surveys/exception capture off; retention prefer ≤90 days

### POSTHOG PRODUCTION PROJECT

- Separate EU project, separate token, same host and settings.

### VERCEL PREVIEW ENV (all server-only)

- `POSTHOG_PROJECT_TOKEN`
- `POSTHOG_HOST` (`https://eu.i.posthog.com`)
- `LOCKDIN_ANALYTICS_ENV=preview` (optional if `VERCEL_ENV` is preview)
- `LOCKDIN_ANALYTICS_ALIAS_SECRET`

### VERCEL PRODUCTION ENV (all server-only)

Same names; Production project token; `LOCKDIN_ANALYTICS_ENV=production`.

### HMAC SECRET

Generate with `openssl rand -hex 32`. Store in Vercel only. Never print the value. Same secret within an environment; do not share Production into Preview.

### Dashboard verify/disable

Session replay, autocapture, heatmaps, surveys, error tracking.

## Remaining owner gate

1. Create Preview + Production PostHog EU projects.
2. Set **server-only** Vercel env vars.
3. Store the alias secret.
4. Confirm privacy copy.
5. Authorize 7.2B Preview proof.

**MERGE: HOLD.**
