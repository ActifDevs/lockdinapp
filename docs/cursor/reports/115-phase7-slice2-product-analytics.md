# Phase 7 Slice 2 — Product Analytics

## Baseline

- Repository: `https://github.com/ActifDevs/lockdinapp.git`
- Branch: `phase7-slice2-product-analytics`
- Base / `origin/main` at branch creation: `897427501595ae6c6582ea99851c9832c17f76ec`
- Phase 7 Slice 7.1: **CLOSED** (Reports 113 and 114 on main)
- This slice: **7.2A local implementation + hosted-config gate**. No PostHog projects created, no Vercel env changes, no Supabase changes, no migration 0016, no merge to main.
- Migration head: **0015_silent_sentinel**. **0016 ABSENT**.
- SDKs (current at implementation): `posthog-js` 1.422.x (browser), `posthog-node` 5.51.x (API). Privacy option names were taken from those SDK types, not from memory.

## Approved contract

Owner-approved (Report 114, 2026-08-30):

- Provider: **PostHog Cloud EU**
- Custom events only: `account_created`, `onboarding_completed`, `task_created`, `past_paper_attempt_created`
- Not implemented: `first_task_created`, `first_past_paper_attempt`, `streak_achieved`, `subject_completed`
- No autocapture, Session Replay, heatmaps, surveys, advertising integrations, or automatic exception capture
- Allow-list properties only; Preview and Production separated by **separate projects** plus an `environment` property
- Analytics failure must not fail product writes
- Missing configuration = safe no-op

## Implementation

Internal modules (no PostHog calls from pages/routes except typed wrappers):

- Frontend: `artifacts/revision-platform/src/lib/analytics/`
- API: `artifacts/api-server/src/lib/analytics/`

Product call sites:

- `trackAccountCreated` / `noteLocalSignup` / `emitAccountCreatedIfPending` / `resetAnalyticsIdentity` from `auth-provider.tsx`
- `trackOnboardingCompleted` after successful `POST /api/profile/complete-onboarding`
- `trackTaskCreated` after successful `POST /api/tasks` (201)
- `trackPastPaperAttemptCreated` after successful `POST /api/past-paper-attempts` (201)

Unknown event names cannot pass `sanitizeApprovedEvent`. Unknown/forbidden properties are dropped. `posthog-js` is loaded only when client project token **and** host are present (dynamic import).

## Event contracts

| Event | Owner | Trigger | Properties |
| --- | --- | --- | --- |
| `account_created` | Frontend | Local signup pending + first authenticated session for that signup | `environment` |
| `onboarding_completed` | API | Successful onboarding RPC (already-completed returns 409, so success is the transition) | `environment`, `subject_count` (integer count only) |
| `task_created` | API | Each successful task insert | `environment` |
| `past_paper_attempt_created` | API | Each successful attempt insert | `environment` |

API events also set PostHog’s `$process_person_profile: false` as a **delivery flag**, not a product property. `before_send` on the browser strips every property except the allow-list, which drops `$pageview`, `$autocapture`, `$exception`, `$current_url`, email, and study content.

## Identity model

- **Never sent:** email, name, username, raw Supabase UUID.
- **Frontend:** PostHog anonymous distinct id only. `identify()` is not called. `person_profiles: 'never'`.
- **API:** HMAC-SHA256 of the authenticated user UUID with `LOCKDIN_ANALYTICS_ALIAS_SECRET`, prefixed `lockdin_ph_`. Distinct id is required by `posthog-node` capture; fully anonymous capture without a distinct id is not offered by the current Node SDK. No analytics identity table/column.
- Alias secret: server-only, never `VITE_*`, never logged, never committed. If missing or shorter than 16 characters, API analytics is a no-op even if a project token is present.

## Account-boundary handling

- Successful `signUp` stores a **local** pending marker (user id in `localStorage` when Supabase returns `data.user.id`; otherwise a `sessionStorage` flag). Ordinary `login` does not set that marker.
- `account_created` fires once when a matching session appears, then a local emitted flag prevents repeats. Later logins do not fire.
- Logout (`clearProtectedState`) and `SIGNED_OUT` call `posthog.reset()`.
- Authoritative account switch (`previousUserId !== nextUserId`) clears React Query **and** resets PostHog before the next user’s pending check.

## Privacy controls

Browser init (`LOCKDIN_POSTHOG_INIT_OPTIONS`) explicitly sets:

- `autocapture: false`
- `disable_session_recording: true`
- `capture_pageview: false`
- `capture_pageleave: false`
- `disable_surveys: true`
- `capture_heatmaps: false` / `enable_heatmaps: false`
- `capture_exceptions: false`
- `capture_dead_clicks: false`
- `person_profiles: 'never'`
- `ip: false`
- `advanced_disable_feature_flags: true`
- `disable_external_dependency_loading: true`
- `before_send` allow-list filter

API client: `disableGeoip: true`, `enableExceptionAutocapture: false`, `captureImmediate` with an 800ms budget so serverless freeze is less likely without blocking forever. Failures are swallowed; logs mention only `{ context: "analytics", event }` — no payloads, no alias, no UUID.

## Environment model

Logical values: `development` | `preview` | `production`.

- Frontend: `VITE_LOCKDIN_ANALYTICS_ENV`. `build:vercel` fills this from `VERCEL_ENV` when unset.
- API: `LOCKDIN_ANALYTICS_ENV`, else `VERCEL_ENV`, else `NODE_ENV === production` → `production`, else `development`.

Project tokens are **not** hardcoded. Preview vs Production must use **different** PostHog projects (different tokens) in Vercel env. This slice does not set those values.

## Privacy disclosure

`artifacts/revision-platform/src/pages/privacy.tsx` now states that configured PostHog EU usage is limited custom events, with no Session Replay, autocapture, heatmaps, or advertising integrations, and without email/name/username/study scores in analytics. It does **not** claim lawful basis, consent UI completeness, or under-18 conclusions. Formal review remains flagged.

## Tests

Focused unit tests (mocks only; no PostHog Cloud traffic):

- Missing config = no-op
- Unknown event names rejected
- Forbidden properties stripped
- Approved shapes accepted
- PostHog throw does not fail onboarding / task create / past-paper create
- `task_created` and `past_paper_attempt_created` fire on every successful create (not 0→1)
- `account_created` not on ordinary login; pending signup → session emits once
- Logout / account switch reset frontend analytics
- HMAC alias deterministic, differs by user, not equal to raw UUID
- Init options keep automatic collection off

## Regression verification

- `pnpm run typecheck`: PASS
- `pnpm --filter @workspace/api-server test`: PASS (163)
- Frontend `vitest run --pool=forks --maxWorkers=1`: PASS (239)
- `pnpm --filter @workspace/scripts test:unit`: PASS
- `pnpm --filter @workspace/scripts test:harness`: PASS
- `pnpm run check:migrations`: PASS `count=16 head=0015_silent_sentinel`
- `pnpm run check:codegen`: PASS
- `git diff --check`: PASS
- API esbuild + Vite production build: PASS

## Security/privacy review

| Severity | Finding |
| --- | --- |
| **BLOCKER** | None found in this diff. |
| **HIGH** | None remaining in slice scope. Local pending-signup storage may hold a Supabase user id **in the browser only**; it is not sent to PostHog. |
| **MEDIUM** | PostHog project dashboards can still offer Replay/autocapture; code disables them and `before_send` drops non-allow-listed events, but the owner must also turn those project settings off. Frontend anonymous persistence lives in PostHog storage until `reset()`. If Preview Vercel env accidentally uses the Production project token, events mix — operational, not code. |
| **LOW** | API capture is best-effort; a frozen isolate could still drop a rare event. `$process_person_profile` is sent on API events as a PostHog control flag. `core-js` postinstall is explicitly disallowed (`allowBuilds.core-js: false`) because PostHog pulled it in. |

## Hosted-config requirements

Do **not** create these in this slice. Exact owner checklist:

### POSTHOG PREVIEW PROJECT

- Region: **EU** (PostHog Cloud EU)
- Suggested name: `Lockdin Preview`
- Token needed: **Project API key** (`phc_…`), not a personal/admin key
- Host: `https://eu.i.posthog.com`
- Approved settings: autocapture off; session replay off; heatmaps off; surveys off; exception/error capture off; no advertising integrations; person profiles unused / anonymous events; retention prefer ≤90 days if the plan allows

### POSTHOG PRODUCTION PROJECT

- Region: **EU**
- Suggested name: `Lockdin Production`
- Token needed: separate **Project API key**
- Host: `https://eu.i.posthog.com`
- Same approved settings as Preview
- Never reuse the Preview token

### VERCEL PREVIEW ENV

| Name | Client-safe? |
| --- | --- |
| `VITE_POSTHOG_PROJECT_TOKEN` | Yes (Preview project token) |
| `VITE_POSTHOG_HOST` | Yes (`https://eu.i.posthog.com`) |
| `VITE_LOCKDIN_ANALYTICS_ENV` | Yes (`preview`; optional if `build:vercel` maps `VERCEL_ENV`) |
| `POSTHOG_PROJECT_TOKEN` | **Server-only** (same Preview project) |
| `POSTHOG_HOST` | **Server-only** |
| `LOCKDIN_ANALYTICS_ENV` | **Server-only** (`preview`; optional if `VERCEL_ENV` is preview) |
| `LOCKDIN_ANALYTICS_ALIAS_SECRET` | **Server-only** |

### VERCEL PRODUCTION ENV

Same names. Tokens must be the **Production** project. `VITE_LOCKDIN_ANALYTICS_ENV` / `LOCKDIN_ANALYTICS_ENV` = `production`.

### HMAC SECRET

- Required for API events (`LOCKDIN_ANALYTICS_ALIAS_SECRET`, ≥16 characters)
- Generate on a trusted machine, e.g. `openssl rand -hex 32`
- Store only in Vercel (and local `.env.local` if testing API capture)
- Use the **same** secret within an environment so aliases stay stable; **do not** share Production secret into Preview unless deliberately joining identities (not recommended)
- **Never print the final value in reports, commits, or chat logs**

### Dashboard verify/disable

In both projects: Session replay, autocapture, heatmaps, surveys, error tracking, toolbar/session recording scripts, and any “capture exceptions” default.

## Remaining owner gate

1. Create Preview + Production PostHog EU projects with the settings above.
2. Set Vercel Preview and Production env vars (no Git commit).
3. Generate and store the alias secret.
4. Confirm privacy-page copy is acceptable before live capture.
5. Authorize a follow-up **7.2B** Preview proof (one controlled event each) — not this branch merge by itself.

This slice does **not** authorize Production go-live of analytics, Sentry (7.3), Auth (7.4), beta invites, or restore.

## Merge readiness

Local implementation is **ready for the owner hosted-config gate**.

**MERGE: HOLD** until the owner creates/approves PostHog projects and Vercel env, then a separately authorized merge/proof slice.
