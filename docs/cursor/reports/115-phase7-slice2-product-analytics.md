# Phase 7 Slice 2 — Product Analytics

## Baseline

- Repository: `https://github.com/ActifDevs/lockdinapp.git`
- Branch: `phase7-slice2-product-analytics`
- Base / `origin/main` at branch creation: `897427501595ae6c6582ea99851c9832c17f76ec`
- Phase 7 Slice 7.1: **CLOSED** (Reports 113 and 114 on main)
- This slice: **7.2A local implementation + 7.2B hosted Preview proof**, including identity remediation and documentation of the owner-approved hosted topology modification. Preview analytics is configured; Production analytics is not configured. No Supabase changes, no migration 0016, and no merge to main.
- Migration head: **0015_silent_sentinel**. **0016 ABSENT**.
- SDK: `posthog-node` only (API). **`posthog-js` was removed** after owner review: a browser anonymous distinct id cannot join to API HMAC aliases, so a connected activation funnel was not possible.

## Approved contract

Owner-approved in Report 114 (2026-08-30), with the later identity and hosted-topology modifications documented in this report:

- Provider: **PostHog Cloud EU**
- Custom events only: `account_created`, `onboarding_completed`, `task_created`, `past_paper_attempt_created`
- Not implemented: `first_task_created`, `first_past_paper_attempt`, `streak_achieved`, `subject_completed`
- No autocapture, Session Replay, heatmaps, surveys, advertising integrations, or automatic exception capture
- Allow-list properties only; Preview and Production separated within **one PostHog Cloud EU project** by the mandatory `environment` property. This owner-approved topology modification supersedes the earlier separate-project design.
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
- Remaining risk: a retried first-party call before the local emitted flag is set could still produce a duplicate ingest; PostHog may eventually collapse matching uuids. Treat `account_created` funnel counts as best-effort; that event was not tested in the hosted Preview proof.

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
| **MEDIUM** | PostHog `uuid` dedup is eventual/best-effort. Because Preview and Production share one project, queries that omit the mandatory environment filter could mix their data. |
| **LOW** | Serverless freeze can still drop an event. `$process_person_profile` is a control flag. |

## Owner-approved hosted topology modification

The earlier design used separate `Lockdin Preview` and `Lockdin Production` PostHog projects. During hosted setup, the current PostHog free account allowed only one project without billing details. The owner decided not to add billing solely to unlock a second project at this stage.

That two-project requirement is therefore **SUPERSEDED** by the owner-approved use of one PostHog Cloud EU project:

- Project: **Lockdin Analytics**
- Cloud: **EU**
- Host: `https://eu.i.posthog.com`
- Projects used: **ONE**
- Environment separation: **MANDATORY** through the existing allow-listed `environment=preview` or `environment=production` event property

This is a deliberate cost/operational trade-off, not equivalent isolation to separate projects.

Advantages:

- Remains within the current free account setup.
- Requires no billing method.
- Uses the `environment` property already carried by the implementation.
- Keeps the analytics architecture minimal.

Risk:

- Preview and Production events share one PostHog project, so a dashboard, funnel, or query that is not filtered correctly could mix environment data.

Mitigations:

- The allow-listed `environment` property is mandatory.
- Preview Vercel variables remain Preview-scoped.
- Production will use `environment=production`.
- Preview and Production use different HMAC alias secrets.
- Production wiring remains separately gated.

## Hosted Preview configuration

Preview analytics is **CONFIGURED** on `lockdinapp-web`, restricted to the `phase7-slice2-product-analytics` branch. Only these server-side variable names and scopes are recorded; no values are recorded:

- `POSTHOG_PROJECT_TOKEN` — Preview, feature-branch restricted
- `POSTHOG_HOST` — Preview, feature-branch restricted
- `LOCKDIN_ANALYTICS_ENV` — Preview, feature-branch restricted; logical value `preview`
- `LOCKDIN_ANALYTICS_ALIAS_SECRET` — Preview, feature-branch restricted; separate from the future Production secret

There are no `VITE_POSTHOG_*` variables and no browser PostHog SDK. Production analytics wiring is **NONE**.

### Preview backend classification

PREVIEW DATABASE: **PRODUCTION-BACKED**

The owner therefore performed only the minimal synthetic successful mutations needed for proof. No failure injection or additional hosted mutation was performed for this reconciliation.

## Hosted Preview proof

Status: **PASS** (2026-08-30). The owner manually verified PostHog Activity after using the hosted Preview deployment.

| Evidence | Result |
| --- | --- |
| `task_created` | **PASS** |
| `past_paper_attempt_created` | **PASS** |
| `account_created` | **NOT TESTED HOSTED** — no account was created solely for telemetry proof |
| `onboarding_completed` | **NOT TESTED HOSTED** — no onboarding mutation was performed solely for telemetry proof |
| `environment=preview` | **PASS** |
| Unified HMAC identity | **PASS** — both observed events used the same **REDACTED PSEUDONYMOUS HMAC ID** for the controlled account |
| Approved event names only | **PASS** for observed events |
| Person profile processing | **FALSE** |
| GeoIP | **DISABLED** |
| Raw Supabase UUID | **NOT OBSERVED** |
| Email, name, or username | **NOT OBSERVED** |
| Study content | **NOT OBSERVED** |
| Scores or marks | **NOT OBSERVED** |
| Browser SDK | **NONE** |

Both observed events reported `library=posthog-node`. No visible task title, task notes, subject/topic content, syllabus content, paper score, marks, percentage, or other study-content leakage was observed. The full pseudonymous identifier is intentionally not recorded.

The two untested hosted events are acceptable for this Preview gate because focused automated tests cover both, the hosted delivery path has been proven through the same server analytics client, Preview is Production-database-backed, and unnecessary hosted mutations were deliberately avoided. This does not manufacture hosted evidence for those events.

Occurrence semantics:

- `task_created`: **AUTOMATED TEST PASS + HOSTED SINGLE-EVENT DELIVERY PASS**
- `past_paper_attempt_created`: **AUTOMATED TEST PASS + HOSTED SINGLE-EVENT DELIVERY PASS**

Repeated hosted occurrence proof is not claimed.

### Hosted state and safety

- Preview PostHog: **CONFIGURED**
- Production PostHog: **NOT WIRED / OFF**
- Supabase changes: **NONE**
- Production DB schema changes: **NONE**
- Migration: **NONE**
- 0016: **ABSENT**

## Remaining Production gate

Production analytics remains **NOT CONFIGURED**. Before any Production wiring:

1. Use the same `Lockdin Analytics` PostHog project token.
2. Set `LOCKDIN_ANALYTICS_ENV=production`.
3. Generate a new Production-only `LOCKDIN_ANALYTICS_ALIAS_SECRET`; do not reuse the Preview alias secret.
4. Scope Production Vercel values to Production only.
5. Perform a separate owner-authorized Production rollout after merge review.

Because Preview and Production share one project, all Production analytics views, dashboards, funnels, and queries must explicitly separate or filter `environment` wherever relevant.

## Verdict

- Slice 7.2 local implementation: **PASS**
- Slice 7.2 hosted Preview proof: **PASS**
- PostHog topology: **ONE EU PROJECT — OWNER APPROVED**
- Production analytics: **NOT CONFIGURED**
- Slice 7.2: **NOT CLOSED YET / IN PROGRESS**
- Merge: **HOLD**
- Next: **OWNER REVIEW → PRODUCTION ANALYTICS WIRING + MERGE/PRODUCTION PROOF**
