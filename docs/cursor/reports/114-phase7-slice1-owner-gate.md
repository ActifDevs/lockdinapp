# Phase 7 Slice 1 — Owner Gate

## SLICE 7.1 OWNER DECISIONS: APPROVED

- **Status:** APPROVED
- **Date:** 2026-08-30
- **Scope of this approval:** planning may proceed to Slice 7.2 after this documentation is merged.
- **This approval does not authorize:** arbitrary hosted changes; Production DB writes; migration creation; beta invitations; restore execution; Phase 7 closeout. Each later hosted/config operation retains its own owner gate.

Owner-approved Phase 7 posture (explicit modifications to the original recommendations are recorded in the sections below):

- **Validation:** small controlled real-user beta (8–12 active Cambridge International AS/A-Level students; 10–14 days). Validate the **current** product. P0–P3 triage remains approved. Do not invite participants yet.
- **Analytics:** PostHog Cloud EU. Product analytics only. Custom events only; **no** autocapture, Session Replay, heatmaps, surveys (unless separately approved later), advertising integrations, or automatic exception/error capture. Strict event/property allow-list. Preview and Production separated. Privacy disclosure required before live use. Sentry owns error monitoring.
- **Events:** `account_created`, `onboarding_completed`, `task_created`, `past_paper_attempt_created`. **Do not** implement `first_task_created` / `first_past_paper_attempt`. Keep `streak_achieved` and `subject_completed` out of Phase 7. No migration 0016.
- **Analytics privacy / identity:** allow-list only; anonymous or pseudonymous minimum necessary; never email/name/username; do not send raw Supabase UUID unless a later implementation review proves it necessary; if server-side identity is used, prefer a non-reversible keyed/HMAC alias with a server-held secret; **no** analytics identity column/table; logout/account switch must reset analytics identity/session; Preview ≠ Production; prefer ≤90 day retention unless later justified.
- **Monitoring:** Sentry on React frontend + Express API. No Session Replay; no PII; no raw request bodies; no Auth headers/cookies; no user study content; no database credentials; sanitized stack traces; release = Git SHA; environment tagging; existing request ID where useful; actionable alerting; Preview and Production separated; ≤90 day retention target where configurable.
- **Auth abuse:** real boundary is hosted Supabase Auth. Do **not** add an Express limiter. Inspect and record **actual hosted** settings (`supabase/config.toml` is not authoritative hosted evidence). No hosted setting change is authorized by Slice 7.1. Slice 7.4 must compare hosted settings against this posture before changing anything.
- **CAPTCHA:** conditional. Isolated closed Preview: rate limits alone are acceptable initially. Production with publicly accessible signup: CAPTCHA must be enabled before invites. Before unrestricted public signup: CAPTCHA must be reviewed/configured unless later evidence supports a different strategy. Evaluate Cloudflare Turnstile first. Do not create credentials in this slice.
- **Beta environment:** isolation of the backend matters more than the Preview label. See the approved isolation rule below.
- **Restore:** temporary isolated Supabase project; **never** restore over Production. Preferred proof: Production backup/logical backup → isolated project → verify restored state → verify Production remained healthy → delete/pause isolated project. Fallback if clone/PITR unavailable: official logical-backup restore into an isolated project. Expected head: `0015_silent_sentinel` unless a later separately authorized migration changes it. Do not execute now.
- **Beta privacy gate:** before invitations, review ages, possible under-18 participants, jurisdiction, vendors/processors, analytics and monitoring disclosure, deletion/removal expectations, and consent/parental expectations where applicable. Do not make legal guarantees. Formal/legal questions remain flagged.
- **Past-paper framing:** current repository framing **ACCEPTED**. Past Papers remains a Lockdin feature, not a standalone product. Before Phase 7 closes, owner should confirm off-repository/social/marketing material follows the same framing.
- **Post-Phase-7 boundary:** unchanged. Do not pull the listed product/growth work into Phase 7.

## Baseline

- Repository: `https://github.com/ActifDevs/lockdinapp.git`
- This slice: **DECISION / DESIGN ONLY**. No analytics SDK, monitoring SDK, hosted Auth change, CAPTCHA project, migration 0016, Vercel env change, restore, or beta start.
- Work branch: `phase7-slice1-owner-gate`
- Branch base / `origin/main` at branch creation: `bb8344461e8259c9e6ea138e33bf2fa4be36e43f`
- Report 113: merged to `main` before this owner-approval update (`docs/cursor/reports/113-phase7-preimplementation-reconciliation.md`). This report does not copy or replace it. Original Slice 7.1 branch was created from the pre-113 main baseline; `origin/main` was merged into this branch so both reports remain in logical order (113 → 114).
- Local difference vs the Slice 7.1 prompt: this machine’s `main` was behind at `707e9793506fe5707d1cd836f500b8d4bbc0c990` before a fast-forward to `origin/main`. After fast-forward, `HEAD` matches the expected main SHA.
- Phase 6: **CLOSED** (Report 112). Migration head: **0015_silent_sentinel**. **0016 ABSENT**. No schema change is required for Phase 7 as currently defined.
- Production closeout evidence (Report 112): healthy anonymous smoke; hosted project ref recorded there as `hazvcdrcvsxmuwdfiucx`. This slice did not query hosted Supabase or Vercel.
- Phase 7 title: **SHIP GATE**
- Confirmed Phase 7 requirements (roadmap + Report 113, cumulative):
  1. explicit validation / ship decision;
  2. small real-user beta;
  3. minimal approved product analytics;
  4. frontend + API error monitoring;
  5. Supabase Auth abuse protection;
  6. actual isolated backup restore proof;
  7. integrated past-paper framing confirmation.
- Auth boundary: **Supabase Auth from the browser** (`auth-provider.tsx` → `signInWithPassword` / `signUp` / `resetPasswordForEmail`). Express does not own signup, login, or password reset.
- Product telemetry today: **NONE**. Package manifests have no GA4, Plausible, PostHog, Mixpanel, or Sentry dependency. API “progress analytics” is in-product dashboard data, not product telemetry.
- Error observability today: React route error boundaries; Express Pino with request IDs (`X-Request-Id` is server-generated UUID; client header is not trusted) and header redaction for `authorization` / `cookie`. No remote error sink.
- Privacy page today: functional workspace statement only. It does **not** disclose third-party analytics or error monitoring. Any approved vendor requires a later privacy-copy update (implementation slice, not this one).
- This report contains **no secrets**.

## Validation decision

### Option A — Run validation / beta before treating the ship gate as satisfied

Treat Phase 6 closeout as **technical** completion, not product proof. Recruit a small real cohort, collect structured feedback, disposition glaring issues, then decide whether the ship-gate checkboxes can close.

**Fits current state because:**

- The deep-research report required interviews / demand testing *before* heavy build. That recorded conversation never happened in-repo.
- Authenticated QA to date used controlled technical accounts. Those accounts prove RLS, pins, assignment, and journeys. They do **not** prove that Cambridge A-Level students will keep using syllabus + tasks + past-paper logging in this shape.
- Gamification (XP, streaks, achievements) is client-derived motivation, not a validated retention loop.
- A public Vercel URL already exists. Shipping without any real-user pass increases the cost of discovering that daily plan, notifications, or paper logging matter more than the current mix.

**Cost / risk:** calendar time (about two weeks), coordinator load, privacy/consent work, possible finding that a core journey is confusing. Engineering already built is not wasted: multi-tenant RLS remains table stakes.

### Option B — Consciously ship on existing evidence

Accept reduced pre-launch validation. Use builder conviction, internal QA, and the existence of a working Production deployment as the launch argument.

**Fits only if** the owner explicitly records that they are the target user (or have equivalent conviction) and accept that Phase 7’s “small real-user beta” checkbox will be **waived**, which changes the repository contract and needs a written exception.

**Cost / risk:** first strangers are the first product testers; glaring UX issues become public; Phase 7 cannot honestly close under the current checklist.

### Recommendation

**OPTION A — RUN A SMALL CONTROLLED BETA.**

Default reason: Phase 7 explicitly requires real-user evidence, and current QA is technical, not product validation. Option B remains a legitimate *conscious* choice, but it is not the default and must be written as a contract exception if chosen.

**Owner decision (2026-08-30): APPROVED — Option A.** Run a small controlled real-user beta to validate the **current** Lockdin product, not as a feature-request exercise. Target **8–12** active Cambridge International AS/A-Level students for **10–14 days**. P0–P3 triage remains approved. Post-Phase-7 feature requests remain outside Phase 7. Do not invite participants yet.

## Beta design

Do **not** invite anyone in this slice.

| Parameter | Proposal |
| --- | --- |
| Participant type | Current or recent Cambridge International AS / A-Level students already doing syllabus revision and at least occasional past papers. Prefer 2–4 subjects. **Do not collect extra PII for recruitment in this design slice.** |
| Cohort size | **8–12 active** (invite up to 15; expect drop-off). Large enough to see repeated journeys; small enough to support by hand. |
| Duration | **10–14 days**, with a mid-point check at day 5–7. |
| Environment | **Isolation rule (owner-approved 2026-08-30), not “Preview preferred” as a label.** IF Vercel Preview uses a genuinely isolated **non-Production** Supabase backend, THEN Preview is preferred. IF Preview points at Production Supabase, THEN that Preview configuration must **not** be used for the real-user beta. IF no genuinely isolated Preview stack exists, THEN Production may be used only after analytics is ready, monitoring is ready, Auth abuse controls are verified, signup exposure is appropriately controlled, and the owner explicitly authorizes beta start. Environment isolation matters more than whether the URL is labelled Preview. Do not run an open public signup “beta.” |
| Onboarding | Written one-pager: create account → complete onboarding → pick real subjects/session → log one task → mark one topic → log one past-paper attempt → open dashboard. No live training required. |
| Supported surfaces | Current desktop Chrome or Firefox, plus one Safari check if a participant uses it. Phone browsers are **best-effort only**; mobile performance is post-Phase-7. |
| Core journey | Signup/login, onboarding/subject assignment, syllabus progress, create/complete a task, log a past-paper attempt, dashboard/progress, logout. Past papers must be used as **one Lockdin surface**, not a separate product. |
| Feedback method | Short structured form (or equivalent) after day 3 and at close: 8–10 questions, no free-text dump of syllabus content. Optional 20-minute call for 3–5 volunteers. Issues filed by the coordinator, not by asking students for stack traces. |
| Suggested questions | (1) What did you open Lockdin to do? (2) Did you know what to do next after onboarding? (3) Did syllabus % feel trustworthy? (4) Was logging a past paper obvious *inside* Lockdin? (5) Did the daily plan match how you revise? (6) What blocked you? (7) Would you use this for a real exam season? (8) What felt like a different product than Lockdin? |
| Analytics / monitoring prerequisites | Do **not** start the cohort until owner-approved analytics + monitoring are either live in Preview **or** the owner explicitly accepts a qualitative-only first week. Recommended: instrumentation live in Preview first. |
| Privacy expectations | Invitees are told: this is a private product test; do not put real exam-board login secrets into the app; notes may be stored as study data; Phase 7 telemetry if approved will be allow-listed and will not include email, name, scores, or note text; they may delete the account / ask for removal at the end. Formal legal review is flagged below, not claimed here. |
| Stop / extend | Stop early if a **P0** appears (data leak, auth lockout, data loss, Production restore risk). Extend up to 7 days if engagement is real but feedback is incomplete. Do not extend to absorb feature-request backlogs. |

### Glowing vs glaring

Beta is for **product validation**, not a feature-request inbox.

**Glaring issue (in-scope for Phase 7 disposition):**

- cannot complete signup, login, reset, or onboarding;
- wrong or empty account-scoped data after login / account switch;
- cannot log a task or past-paper attempt that should succeed;
- pin / session / assignment error that blocks a real subject;
- copy or navigation that presents Past Papers as a separate product;
- crash / blank route that blocks the core journey.

**Not a glaring issue (park as post-Phase-7):**

- onboarding redesign, Google OAuth, username/community, syllabus UX polish, deadline redesign, planner/calendar integration, email reminders, support inbox, mobile performance, PWA, SEO/OG, domain, marketing, broader task editing, exam-date mutation UI, external calendar sync.

### Severity and disposition

| Severity | Meaning | Disposition |
| --- | --- | --- |
| P0 | Safety, data isolation, auth lockout, data loss | Stop beta; fix before any further invites |
| P1 | Core journey blocked for multiple people | Fix in a named follow-up slice before Phase 7 close |
| P2 | Painful but workaround exists | Fix or explicitly accept with rationale |
| P3 | Preference / feature request | Record and **keep out of Phase 7** |

Owner (or named coordinator) triages within 2 business days. Substantial fixes are their own slices. Silent closeout edits are not allowed.

### Stop / go after beta

**Go toward Phase 7 close (other gates still required):** ≥8 people completed the core journey; no open P0; P1s fixed or accepted in writing; past-paper framing not contradicted; no new schema demand.

**No-go / re-scope:** majority would not use it for a real season; core journey fails; participants treat papers as a separate app; findings imply a different product.

## Analytics provider comparison

Prior team mention of Google Analytics is **not** authorization.

| | Google Analytics 4 | Privacy-oriented alternative: **PostHog Cloud (EU), custom events only** | Control: **no analytics / defer** |
| --- | --- | --- | --- |
| Implementation complexity | Medium–high (gtag/GTM, consent mode, data streams, easy over-collection) | Medium (JS + optional server capture; must **disable** autocapture, session replay, heatmaps) | None now; Phase 7 cannot close |
| Privacy | Advertising-adjacent Google profile; cookies / Consent Mode complexity | EU hosting option; can run without replay or identify-by-email | Best privacy, zero launch signal |
| Students / minors | Poor default fit. Google’s ad/measurement stack is the wrong gravity well for school-age users | Better if identity is minimized and replay is off. Still a processor — needs disclosure | Best, but blind |
| Event control | Easy to accumulate 50 vanity events | Strong allow-list if we wrap a single internal emitter | N/A |
| Environment separation | Separate measurement IDs | Separate projects or `environment` property + filters | N/A |
| Cost | Free (data-quality / ToS cost) | Free tier is enough for beta + early launch if replay is off | £0 |
| Vendor dependency | Google | PostHog | None |
| Usefulness for beta / launch | Pageviews yes; milestone events possible but culturally noisy | Matches 3–5 milestone events and server-side occurrence emission | Qualitative only |
| Tiny taxonomy | Possible, fights the product | Designed for this | N/A |

**Plausible** is a credible second privacy option: cookieless pageviews, simple custom events, weaker user-level funnel and weaker first-class server emission than PostHog. Prefer Plausible only if the owner wants **strictly no distinct user id** and will accept counts without per-user funnels.

**Recommendation:** **PostHog Cloud (EU), product analytics only** — no session replay, no autocapture, no heatmaps, no surveys, no exception autocapture (Sentry owns errors). Use a single internal `track(event, props)` wrapper with an allow-list. Separate Preview and Production projects.

**Owner decision (2026-08-30): APPROVED — PostHog Cloud EU.** Phase 7 configuration constraints: custom events only; **NO** autocapture; **NO** Session Replay; **NO** heatmaps; **NO** surveys unless separately approved later; **NO** advertising integrations; **NO** automatic exception/error capture; strict event/property allow-list; Preview and Production separated; privacy disclosure required before live use. PostHog is for product analytics. Sentry will own error monitoring.

Do **not** install in this slice.

## Event taxonomy

Ship-gate examples were candidates, not an authorization.

Critical review:

| Candidate | Verdict |
| --- | --- |
| `account_created` | **KEEP.** Durable Auth signup. Frontend is the only place that sees `signUp` success. |
| `first_task_created` | **REJECTED by owner (2026-08-30).** 0→1 semantics are not guaranteed to mean lifetime-first if a user deletes their only task and later creates another. Do **not** create persistent database telemetry state just to support this name. Replace with occurrence event `task_created`. |
| `first_past_paper_attempt` | **REJECTED by owner (2026-08-30).** Same 0→1 lifetime-first problem after delete-and-recreate. Do **not** add DB telemetry state. Replace with occurrence event `past_paper_attempt_created`. |
| `streak_achieved` | **DROP for Phase 7.** Streak is derived on dashboard read from consecutive UTC days with a completed task (`dashboard.ts`). Longest streak is also mirrored in `localStorage`. No durable “achieved” write. Threshold is undefined (1 vs 7 vs 30). Would spam or lie. |
| `subject_completed` | **DROP for Phase 7.** No first-class completion event. “100% syllabus” is an aggregate over topic progress and is unlikely in a 10–14 day beta. Definition (topics vs units vs papers) is product-ambiguous. |

**Add one event the examples omitted but the product actually has:**

| `onboarding_completed` | **KEEP.** Account creation is not a workspace. The API already owns `lockdin_complete_onboarding`. This is the first real product milestone. |

### Approved proposal (4 events) — owner-modified 2026-08-30

Allow-list only. Properties not listed are forbidden. These are **normal occurrence events**. PostHog may calculate first occurrence, funnels, frequency, and conversion from event history. Do **not** implement 0→1 “first_*” names or persistent database telemetry state to fake lifetime-first semantics. **No migration 0016.**

Minimal event properties must be documented before Slice 7.2 implementation. The names below are approved; property lists remain the working minimum and must stay allow-listed.

#### `account_created`

- **Trigger:** Supabase `signUp` returns without error.
- **Owner of emission:** **frontend** (Auth never hits Express).
- **Allowed properties:** `environment` (`preview` \| `production` \| `development`).
- **Forbidden properties:** default forbid list (below) plus `full_name` from signup metadata.
- **Deduplication:** once per browser `user.id` in session memory **and** `user-scoped` storage flag `lockdin_analytics_account_created`. If `user.id` is not yet available (confirmation-required signup), emit once with no user key and accept a possible later authenticated duplicate **or** skip until session exists — **prefer skip until `session.user.id` exists**, then emit once.
- **Why:** top of funnel; distinguishes “Auth accepted an email” from silence.

#### `onboarding_completed`

- **Trigger:** successful `lockdin_complete_onboarding` / `completeCurrentUserOnboarding`.
- **Owner of emission:** **API** (authoritative). Frontend must not also emit.
- **Allowed properties:** `environment`; `subject_count` (integer count of selected subjects only).
- **Forbidden properties:** subject IDs, names, session labels, username, full name, level string if it can identify a school cohort unnecessarily — **omit `level` and exam session**.
- **Deduplication:** emit only when this call transitions `onboarded_at` from null to set (or RPC reports first completion). Never on profile updates.
- **Why:** measures “got a real workspace,” which signup alone does not.

#### `task_created`

- **Trigger:** successful task create (each successful create is an occurrence).
- **Owner of emission:** **API**.
- **Allowed properties:** `environment`.
- **Forbidden properties:** title, notes, topic text, due dates, subject/topic IDs.
- **Deduplication:** none as a lifetime-first gate. Do not count remaining tasks to emit only on 0→1. Ignore true client retries that would double-POST the same create if that is already handled as a failed duplicate request; do not invent DB telemetry for “first.”
- **Why:** planning action frequency and conversion from onboarding, without claiming lifetime-first.

#### `past_paper_attempt_created`

- **Trigger:** successful attempt create (each successful create is an occurrence).
- **Owner of emission:** **API**.
- **Allowed properties:** `environment`.
- **Forbidden properties:** score, marks, percentage, year, paper code, notes, component/subject IDs, syllabus text.
- **Deduplication:** none as a lifetime-first gate (same rationale as `task_created`).
- **Why:** proves integrated past-paper use, not a standalone tracker; frequency is useful; PostHog can derive first occurrence.

### Default forbid list (all events)

Never send: email; full name; username; passwords; access tokens; refresh tokens; JWTs; cookies; Authorization headers; task title; task notes; syllabus text; learning-outcome text; raw study content; paper scores; marks; percentages; paper codes; raw database IDs unless separately proven necessary; database URLs; raw SQL; raw request bodies; raw response bodies; raw Auth payloads.

Prefer **allow-list**. If a property is not named above, it does not ship. Do not build an advertising profile.

## Analytics privacy / identity

### Identity model

**Recommendation:** **pseudonymous, non-display identifier only where required for funnel joining — not a Google-style user profile.**

**Owner decision (2026-08-30): APPROVED PRINCIPLE — anonymous or pseudonymous minimum necessary.**

- **Do not** identify with email, name, or username.
- **Do not** send the raw Supabase user UUID to the vendor unless a later implementation review proves it is necessary. Preferred distinct id if server-side identity is used: HMAC-SHA256 (or equivalent keyed alias) of the user UUID with a **server-held secret**, emitted **only from the API** for API-owned events. **Do not** add a database column or table for analytics identity.
- Frontend `account_created`: use the vendor’s **anonymous distinct id** *or* the same HMAC if the API exposes a dedicated non-PII analytics alias later. Until that alias exists, frontend may use a **first-party cookie/local flag only for dedupe** and send the event **without** a stable user id (counts still work; cross-device funnel will not).
- Fully anonymous (no distinct id) is acceptable if the owner chooses **Plausible** instead; then drop per-user funnel expectations. PostHog Cloud EU is the approved provider; identity remains minimized.

Minimum identity needed to answer real questions:

- How many signups became onboarded workspaces? (counts; optional same-user link)
- How many workspaces created a task / paper attempt? (occurrence events; PostHog can derive first occurrence)

We do **not** need identity to answer “average score” or “which syllabus topic is weak” — those are in-product, and sending them would be a privacy failure.

Do not build an advertising profile.

### Login / logout / account switch

- Logout: reset vendor session / distinct id; clear in-memory queue; do not flush pending events that might still hold the previous alias. Logout/account switching **must** reset analytics identity/session state.
- Account switch: treat as logout then login. Existing React Query `previousUserId !== nextUserId` → `queryClient.clear()` is the pattern to mirror for analytics state.
- Login of an already-onboarded user: **no** `account_created` / `onboarding_completed` re-fire.

### Preview vs Production

- Separate vendor projects (recommended) or a required `environment` property with dashboard filters.
- Preview events must not appear in the Production board used for launch decisions.

### Retention principle

Keep event payloads **≤ 90 days** unless provider capability or later formal review determines a different justified setting. Do not export event streams into ad platforms.

### Consent / disclosure

Wiring a vendor is a **material privacy-page change**. UK/EU student use may implicate UK GDPR / age-appropriate design. This report does **not** give legal advice. Do not make legal guarantees.

**Owner decision (2026-08-30): APPROVED — beta privacy gate before invitations.** Review the privacy/consent posture for the actual beta cohort. In particular:

- participant ages;
- possibility of under-18 participants;
- jurisdiction;
- vendor/processors;
- analytics disclosure;
- monitoring disclosure;
- data deletion/removal expectations;
- appropriate consent/parental expectations where applicable.

Formal/legal review questions must remain clearly flagged.

**Flag for formal review (not resolved here):**

- Is any expected beta participant under 18, and what lawful basis / parental expectation applies?
- Is PostHog (or GA4, if chosen) a processor that must appear in the privacy policy and, if needed, a DPA?
- Is cookie/consent UI required for the chosen tool, or is a cookieless / strictly necessary posture intended?
- Account deletion: does vendor deletion get invoked when a Supabase user is deleted? Phase 7 should require a written “delete alias / wipe events” step if identity is used.

## Monitoring provider comparison

| | **Sentry** | Reasonable equivalent: **GlitchTip** (Sentry-compatible, self-host or hosted) | **Defer / logs only** |
| --- | --- | --- | --- |
| React | First-class `@sentry/react`, error boundary hook-in | Compatible SDK subset; fewer docs | Existing route boundaries only |
| Express / Vercel | Official Express + serverless guidance | Works; more DIY on Vercel | Pino stays local to the instance |
| Source maps | Release upload; must keep auth token **off** `VITE_*` | Possible, rougher | N/A |
| Release / environment | Release = git SHA; `preview` / `production` | Similar if configured | Missing |
| Request correlation | Tag `request_id` from existing Express UUID | Same if we set it | Logs only, not alerted |
| Redaction | `beforeSend` allow-list + `sendDefaultPii: false` | Similar, fewer built-ins | Current Pino redact is headers only |
| Alerting | Email/Slack on new issues | Email; fewer routing options | None |
| Cost | Free/team developer tier is enough at beta scale if replay is **off** | Lower $; higher ops if self-host | £0 |
| Privacy | Must disable Session Replay and strip PII | Better control if self-host; still stores stacks | Best |
| Operational complexity | Low–medium | Medium (hosting) or low (their cloud) | None |

**Recommendation:** **Sentry** for both React and Express. Disable Session Replay and user IP if the plan allows. One org, two environments, release = git SHA. Do not install in this slice.

**Owner decision (2026-08-30): APPROVED — Sentry.** Scope: React frontend + Express API. Configuration principles: **NO** Session Replay; **NO** PII; **NO** raw request bodies; **NO** Auth headers/cookies; **NO** user study content; **NO** database credentials/details; sanitized stack traces; release = Git SHA; environment tagging; existing request ID attached where useful; actionable alerting; Preview and Production separated; ≤90 day retention target where configurable. Sentry is for errors/reliability. PostHog is for product behaviour.

Do not use PostHog exception capture as a substitute. One error product.

## Monitoring privacy / redaction

### Allowed (after sanitization)

- error class / sanitized message (strip emails, JWTs, connection strings);
- sanitized stack;
- release SHA;
- environment;
- application route where the path has **no** user-owned ids (prefer route pattern `/past-papers`, not query strings);
- request ID (existing server UUID);
- HTTP status;
- controlled tags: `runtime=frontend|api`, `component` name if already non-sensitive.

### Forbidden by default

Authorization header; cookies; Supabase JWT; database URL; service-role key; email; full name; username; free-text notes; raw SQL; raw request body; raw database / RPC details; complete user-owned study data; paper scores; syllabus text.

### Frontend / API deduplication

- Frontend: one `ErrorBoundary` + `window.onerror` / `unhandledrejection` pipeline; do not double-capture the same boundary error.
- API: capture in the existing Express error handler only; do not also capture at every route.
- Do not send the same exception from frontend *and* API unless they are distinct failures (e.g. API 500 plus a separate UI crash).
- Sample rate: 100% in Preview; Production 100% at beta scale is fine; revisit if noise appears.

### Retention

Default Sentry retention on the chosen plan; prefer **≤ 90 days**. No raw body storage.

## Auth abuse controls

Real boundary: **hosted Supabase Auth**, not Express. An in-process Express limiter would never see signup/login/reset and would create false confidence (Report 113; current `auth-provider.tsx`).

**Owner decision (2026-08-30): APPROVED.** Do **not** add an Express limiter for these flows. First inspect and record **actual hosted** Supabase Auth settings. Local `supabase/config.toml` is **not** authoritative hosted evidence. No hosted setting change is authorized by this slice. Future Slice 7.4 must compare hosted settings against the approved posture before changing anything.

### Local config is not hosted config

`supabase/config.toml` (local / CLI) currently includes, among other values:

- `[auth] enable_signup = true`, `enable_anonymous_sign_ins = false`
- `minimum_password_length = 6`, empty `password_requirements`
- `[auth.rate_limit] email_sent = 2`, `sign_in_sign_ups = 30`, `token_refresh = 150`, `token_verifications = 30`
- `[auth.captcha]` **commented / disabled**
- `[auth.email] enable_confirmations = false`, `max_frequency = "1s"` (local-dev loose)
- Google-capable client code exists (`signInWithGoogle`); **Google OAuth enablement is out of Phase 7**

**Do not assume Production matches this file.** Hosted settings live in the dashboard and may have drifted.

### Owner dashboard checklist (inspect only — do not change in this slice)

Project: Authentication settings for the **Production** project and any **Preview** Auth project.

1. **Authentication → Rate Limits** (see [Supabase rate limits](https://supabase.com/docs/guides/auth/rate-limits)):
   - Sign-ups / sign-ins per IP per 5 minutes
   - Token refresh
   - OTP / magic-link verify
   - Email-send combined limit (`/signup`, `/recover`, email change)
   - Whether custom SMTP is in use (built-in mail is typically **2 emails/hour project-wide**)
2. Record the **burst** behavior: IP buckets may allow a short burst (~30) before the configured refill applies. Do not treat a dashboard number as “exactly N attempts then 429.”
3. **Bot and Abuse Protection / CAPTCHA:** on or off; provider if any (hCaptcha / Turnstile). Expected today: **off**, but verify.
4. **Signups:** email signup enabled? confirmations required? anonymous disabled?
5. **Password policy** vs local `minimum_password_length = 6`
6. **Redirect URLs / site URL** match the intended beta host (Preview vs Production)
7. **Leaked-password / bot protection** extras if the dashboard shows them
8. **Email templates** do not enumerate “this email is not registered” in a way the UI then contradicts
9. **Do not** enable Google (or other) OAuth as part of this checklist

### Account-enumeration-safe UX

Current reset uses `resetPasswordForEmail` and should keep a **generic** success message (“if an account exists, we sent mail”) regardless of whether the email is registered. Login should not distinguish “unknown email” vs “wrong password” in user-visible copy. Implementation slice should audit existing login/reset strings against that rule — **no copy rewrite in this slice unless a contradiction is found during that later audit**.

### 429 / challenge UX (later implementation)

Map provider 429 and CAPTCHA-required errors to a calm, accessible message: wait / complete challenge / try again. Never show raw Auth JSON. Never add an Express limiter as a substitute.

### Recommended Auth posture

**Verify hosted limits first. Tighten only if the dashboard is weaker than a closed-beta need. Do not load-test Production.**

## CAPTCHA

| Option | Meaning | When it fits |
| --- | --- | --- |
| A. Rate limits only | Hosted limits; no widget | Closed invite beta on Preview; signup not publicly useful |
| B. Limits + CAPTCHA immediately | hCaptcha or Turnstile on signup/login/reset | Open Production signup, or already seeing bots |
| C. CAPTCHA after abuse signal | Add when 429s / junk signups appear | Owner can watch Auth logs during beta |

**Recommendation:** **A for a closed Preview (or invite-only) beta; prepare B before any public/uninvited signup.**

**Owner decision (2026-08-30): APPROVED CONDITIONALLY.**

- If beta runs on a genuinely isolated closed Preview environment: rate limits alone are acceptable initially.
- If beta uses Production **and** signup is publicly accessible: CAPTCHA must be enabled before invites.
- Before unrestricted public signup: CAPTCHA must be reviewed/configured unless later evidence supports a different abuse-control strategy.
- Preferred CAPTCHA provider to evaluate first: **Cloudflare Turnstile**.
- Do **not** create credentials/configuration in this slice.

Reasons: cohort is tiny; CAPTCHA adds friction and accessibility work (widget, site keys, `captchaToken` on `signUp` / `signInWithPassword` / `resetPasswordForEmail`); Production URL is already reachable, so **if beta is Production with open signup, choose B before invites**.

## Recovery / restore design

A backup that exists is **not** Phase 7 done. Report 31-era evidence was `pg_dump` + `pg_restore --list`, not a restore execution. Do not treat TOC listing as recovery proof.

### Never restore over Production

**Owner decision (2026-08-30): APPROVED — temporary isolated Supabase project. NEVER restore over Production.**

Preferred proof: Production backup/logical backup → temporary isolated Supabase project → verify restored state → verify Production remained healthy → delete/pause isolated restore project.

If plan-level clone/PITR is unavailable: the approved fallback is an **official logical-backup restore into an isolated Supabase project**.

Not the local laptop as the sole proof (does not exercise hosted backup product). Not the Preview project if Preview is the beta database.

Do not execute this now.

### Human restore proof must verify

1. Isolated project created; Production URL and ref unchanged.
2. Restore/PITR (or official dashboard backup restore) **into that isolated project** completes.
3. Database accepts a connection with a **non-Production** URL only.
4. `supabase_migrations.schema_migrations` (or current journal table) is present.
5. Head is the expected tag (**0015_silent_sentinel**, count 16) unless a later **separately authorized** migration legitimately changes it — **none should** as of this approval.
6. Representative reference tables present: subjects, syllabus versions/topics, assessment components, applicability / series policy as expected.
7. Representative user-owned structure present: profiles, memberships/pins, tasks, past_paper_attempts (row presence/shape — **do not export PII into the report**).
8. RLS enabled on user-owned tables; policies/grants sampled (authenticated cannot read another user’s rows — use **synthetic** users in the restore copy, or a documented read-only policy inspect).
9. Strict assignment functions present (`lockdin_complete_onboarding_apply`, `lockdin_replace_user_subjects_apply`, `lockdin_resolve_applicable_syllabus_version`). Applicability/policy structure present.
10. Production health unchanged (`/api/healthz`, `/api/healthz/db`) after the exercise.
11. Isolated project **paused or deleted** after evidence is captured.

### Dashboard / plan capability the owner must check

- Current Supabase **plan** for Production: daily backups vs **point-in-time recovery**.
- Backup retention window.
- Whether dashboard **restore to a new project** (or PITR clone) is available on that plan.
- If PITR is **not** on the plan: use an official logical backup restore into a new isolated project — still not Production overwrite.
- Who has billing + dashboard permission to run it.

Do **not** execute the restore in this slice.

## Past-paper framing

Repository-facing product already presents Past Papers as **part of Lockdin**, not a standalone product.

| Surface | Evidence | Framing |
| --- | --- | --- |
| App nav | `app-shell.tsx`: “Past papers” → `/past-papers` beside Dashboard, Study plan, Subjects | Integrated item |
| Landing | `index.tsx`: feature “Past papers with a trail”; hero mock includes “Past papers”; intro copy “Syllabus units, past-paper logs, and a daily plan” under the Lockdin brand | Integrated capability |
| Dashboard | CTA to `/past-papers`; empty copy about logging papers **in this workspace** | Integrated |
| Past Papers page | Title `Past papers` / `Past papers · {APP_NAME}`; log-attempt dialog is in-app | Feature page, not a product name |
| Document title | `Past papers ·` app name | Integrated |
| Docs | Architecture plan §10 and ship-gate: confirm fold-in; no second brand | Consistent |

No repository copy contradiction found that requires a rewrite in this slice.

**External marketing materials were not supplied.** Owner should confirm any untracked landing, social, or pitch docs use “Lockdin” + papers as a feature. If a leftover “PaperTrack / PastPaperTracker” standalone pitch exists outside the repo, that is an owner fix, not an engineering rewrite.

**Recommendation:** **ACCEPT** current integrated framing.

**Owner decision (2026-08-30): APPROVED.** Current repository framing is accepted. Past Papers remains a Lockdin feature, **not** a standalone product. Before Phase 7 closes, owner should confirm any off-repository/social/marketing material follows the same framing.

## Owner decision matrix

| # | Decision | Options | Recommendation | Owner decision (2026-08-30) | Cost / risk | Owner approval required |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Validation | RUN SMALL BETA / SKIP (conscious) | **RUN SMALL BETA** | **APPROVED** — 8–12 / 10–14 days; current product; P0–P3; no invites yet | Time vs shipping blind | Recorded |
| 2 | Analytics provider | PostHog EU (custom only) / Plausible / GA4 / Defer | **PostHog EU, custom events only** | **APPROVED** — PostHog Cloud EU; constraints in approval banner | Processor + privacy-page work; GA4 worse for minors | Recorded |
| 3 | Analytics events | 4 proposed first_* / occurrence events / keep streak+subject / fewer / none | Original rec: `first_task_created` / `first_past_paper_attempt` | **APPROVED WITH MODIFICATION** — `account_created`, `onboarding_completed`, `task_created`, `past_paper_attempt_created`; no 0016 | Wrong events create junk or PII | Recorded |
| 4 | Analytics identity | Anonymous counts / HMAC alias / raw user UUID / email identify | **HMAC or anonymous; never email/name** | **APPROVED** — min necessary; no raw UUID unless later proven; no analytics DB identity; reset on logout/switch | Under-18 / deletion questions | Recorded |
| 5 | Monitoring provider | Sentry / GlitchTip / Defer | **Sentry** (no replay) | **APPROVED** — React + Express; no replay | Stack + route leakage if redaction is weak | Recorded |
| 6 | Monitoring retention / privacy | ≤90d, allow-list, no bodies / looser | **≤90d, allow-list, no replay, no PII** | **APPROVED** | Legal review still open | Recorded |
| 7 | Auth rate-limit posture | Verify hosted first / change now / Express limiter | **Verify hosted first; no Express limiter** | **APPROVED** — hosted inspect later; no Express limiter; no hosted change now | False confidence if Express is used | Recorded (any hosted edit still gated) |
| 8 | CAPTCHA | A limits-only / B now / C after signal | **A if closed Preview; B if open Production signup** | **APPROVED CONDITIONALLY** — isolation-based; Turnstile first to evaluate | UX/a11y vs bots | Recorded |
| 9 | Restore target | New isolated Supabase project / other disposable / restore over Prod | **New isolated project; never Prod** | **APPROVED** — isolated project; logical-backup fallback; expected head 0015 | Plan may lack PITR; billing | Recorded |
| 10 | Beta cohort / environment | 8–12 / 10–14 days / Preview preferred | Original rec: Preview preferred | **APPROVED WITH MODIFICATION** — isolation rule (see Environment row); 8–12 / 10–14 | Support load; public URL risk | Recorded |
| 11 | Past-paper framing | ACCEPT / CHANGE | **ACCEPT** | **APPROVED** — in-repo accepted; owner to confirm off-repo materials before Phase 7 close | External materials unknown | Recorded |

## Recommended defaults

Historical recommendations (evidence-based, pre-approval). **Owner decisions in the banner and matrix supersede these where they differ** (notably occurrence events vs `first_*`, and the beta isolation rule vs “Preview preferred”):

1. **Validation:** RUN SMALL BETA.
2. **Analytics:** PostHog Cloud (EU), custom events only; no replay, no autocapture. Not GA4 unless the owner overrules the minor/privacy fit.
3. **Events:** the four listed; drop `streak_achieved` and `subject_completed`.
4. **Identity:** no email/name; API HMAC alias or anonymous counts; reset on logout/switch; Preview ≠ Production.
5. **Monitoring:** Sentry on React + Express; release SHA; `request_id`; `beforeSend` allow-list; no replay.
6. **Monitoring privacy:** forbidden list above; ≤90 day retention principle.
7. **Auth:** inspect hosted Rate Limits and email/CAPTCHA toggles; keep abuse control on Supabase Auth.
8. **CAPTCHA:** not for a closed Preview beta; required before uninvited public signup.
9. **Restore:** temporary isolated Supabase project; full proof list; then delete/pause.
10. **Beta:** 8–12 Cambridge AS/A-Level students, 10–14 days, isolated-backend rule, structured form, P0–P3 rubric.
11. **Past Papers:** retain integrated Lockdin framing.

## Hosted / config gates

Manual owner work before implementation slices change anything live:

- [x] Read and approve or amend this decision matrix in writing. **Done 2026-08-30 (this report).** Remaining hosted/config boxes stay unchecked until their own slices.
- [ ] Supabase Production (and Preview, if any): screenshot or write down Rate Limits, signup, confirmations, CAPTCHA, password policy, site URL. **Do not change yet unless a later approved slice says so.**
- [ ] Confirm whether Production signup is currently open to the internet (affects CAPTCHA and beta environment).
- [ ] Confirm backup / PITR capability on the current plan.
- [ ] Approve isolated restore project creation (name, region, who runs it, cleanup).
- [ ] Approve or reject PostHog + Sentry as processors; plan privacy-page update.
- [ ] Confirm no external “standalone past-paper product” marketing is in circulation.
- [ ] Name a beta coordinator and a triage owner.
- [ ] Legal/privacy review flags (minors, DPA, deletion) assigned or explicitly deferred with risk accepted.

**Performed by this slice:** Supabase **NONE**. Vercel **NONE**. Analytics **NONE**. Monitoring **NONE**. Restore **NONE**.

## Post-Phase-7 boundary

Keep **out** of Phase 7, including as “quick beta follow-ups”:

- onboarding redesign
- Google OAuth enablement
- username / community work
- detailed syllabus UX redesign
- syllabus completion / deadline redesign
- planner / calendar deadline integration
- email reminders
- support email
- mobile performance optimization
- PWA / Add to Desktop
- Google Analytics **unless the owner explicitly chooses GA4 in this matrix**
- SEO / Open Graph
- domain acquisition / cutover
- marketing / growth work
- broader task editing
- exam-date mutation UI
- external calendar sync
- real r002
- Feb/Mar series work
- automatic repin
- DEFAULT promotion tooling
- AI assistant, standalone focus blocker, server-side XP/achievement tables (architecture plan §11)

Beta feedback that maps to this list is **P3 / backlog**, not ship-gate scope.

## Next-slice prerequisites

Slice 7.1 owner decisions are **APPROVED** (2026-08-30). This authorizes **planning** to proceed to Slice 7.2 after this documentation is merged. It does **not** authorize SDK install, hosted changes, Production DB writes, migration creation, beta invitations, restore execution, or Phase 7 closeout.

Suggested later slices (from Report 113, still valid; 7.2 not started in this run):

- **7.2** — Analytics wrapper + approved occurrence events + privacy disclosure + Preview proof (PostHog Cloud EU; allow-list; no first_* DB state).
- **7.3** — Sentry on frontend + API, redaction, release tags (after provider approval — provider now approved; implementation still gated).
- **7.4** — Hosted Auth verification record, optional CAPTCHA **if** the isolation/signup rule requires it, 429/challenge UX.
- **7.5** — Beta run, isolated restore proof, framing confirmation on any new owner-supplied materials, closeout.

Until those slices run: no SDKs, no 0016, no hosted writes, no Vercel env, no restore, no invites.
