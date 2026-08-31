# Phase 7 Slice 4 — Auth Abuse Protection

## Baseline and scope

- Repository: `https://github.com/ActifDevs/lockdinapp.git`
- Branch: `main`
- Starting `HEAD` / `origin/main`: `e181cc7a0c3000320d0a011e3db9eaba909456b5`
- Production Supabase project: `hazvcdrcvsxmuwdfiucx`
- This report reconciles Slice 7.4A audit/design, 7.4B authenticated hosted inspection, 7.4C owner-approved hosted hardening, and 7.4D owner-assisted legitimate-flow verification.
- No application code, test, schema, migration, Production data, Vercel, Sentry, or PostHog change was made in Slice 7.4D.

## Slice 7.4A — audit and threat model

The repository audit found conventional Supabase email/password authentication:

- signup and login call Supabase Auth from the frontend;
- password recovery uses the configured Auth redirect flow and `/update-password` destination;
- logout uses the normal Supabase sign-out path;
- session bootstrap and Auth state changes are centralized in the frontend Auth provider;
- protected routes require an authenticated, resolved profile;
- authenticated API routes validate the Supabase bearer JWT server-side;
- Google/OAuth UI was dormant because the hosted providers were disabled;
- there was no application CAPTCHA implementation and no second application-level rate limiter duplicating Supabase Auth controls.

The realistic controlled-beta risks were automated signup, credential stuffing/password spraying, brute-force login, and recovery-email abuse. Provider-native rate limits, email confirmation, disabled anonymous/OAuth access, generic recovery behaviour, and Auth audit visibility were preferred over an unrelated Auth redesign. CAPTCHA friction and operational complexity were not justified without evidence of automated abuse.

Audit outcome: **HOSTED CONFIGURATION ONLY**. No repository or database change was required. Cloudflare Turnstile remains the preferred future CAPTCHA provider only if evidence changes.

## Slice 7.4B — hosted inspection

Authenticated, read-only inspection established the actual Production Auth posture before hardening:

| Control | Hosted value |
| --- | --- |
| Email/password | **ENABLED** |
| Email self-signup | **ENABLED** |
| Email confirmation | **ENABLED** |
| Secure email change | **ENABLED** |
| Anonymous sign-in | **DISABLED** |
| Google OAuth | **DISABLED** |
| Other OAuth providers | **DISABLED** |
| Minimum password length | **6** |
| Password composition | **No required characters** |
| Leaked-password protection | **DISABLED / PLAN-GATED** |
| CAPTCHA | **DISABLED** |
| JWT expiry | **3600 seconds** |
| Refresh-token rotation | **ENABLED** |
| Refresh-token reuse interval | **10 seconds** |
| Inactivity / maximum-duration / single-session restrictions | **UNCHANGED / not enabled** |
| Auth rate limits | **Provider-native hosted values; no custom tightening justified** |
| Site URL | `https://lockedin-study.vercel.app` |
| Redirect allowlist | Six exact historical URLs; no wildcard or localhost entry |

Visible native limits included sign-up/sign-in `30 requests / 5 minutes` per IP, token refresh `150 requests / 5 minutes` per IP, and OTP/magic-link verification `30 requests / 5 minutes` per IP. No synthetic attack traffic was generated. Recent Auth evidence showed no meaningful signup, recovery, failed-login, or email-abuse burst.

Inspection decision: keep CAPTCHA off, retain provider-native rate limits, raise the password minimum to 8, and correct the canonical Site URL/redirects. Leaked-password protection remains plan-gated and deferred.

## Slice 7.4C — owner-approved hosted hardening

Three hosted changes were applied and re-read successfully:

1. Auth Site URL changed from `https://lockedin-study.vercel.app` to `https://lockdinapp-web.vercel.app`.
2. Exact canonical redirects were added:
   - `https://lockdinapp-web.vercel.app/auth/callback`
   - `https://lockdinapp-web.vercel.app/update-password`
3. Minimum password length changed from **6** to **8**.

The password composition policy remained **no required characters**. All six previous redirect entries were preserved, producing eight total entries. No wildcard or localhost redirect was added.

Email confirmation stayed enabled; anonymous sign-in, Google OAuth, other OAuth providers, and CAPTCHA stayed disabled. Rate limits, JWT expiry, refresh rotation, reuse interval, and session restrictions were unchanged. Repository, Vercel, Production data, schema, migrations, Sentry, and PostHog were unchanged.

## Slice 7.4D — legitimate-flow verification

The owner entered the existing controlled Production account credentials directly in the browser. No credential or token was exposed to the agent or chat.

| Gate | Result |
| --- | --- |
| Fresh email/password login | **PASS** |
| Canonical post-login destination | **PASS** — `https://lockdinapp-web.vercel.app/dashboard` |
| Dashboard/API-backed content | **PASS** |
| Protected Dashboard route | **PASS** |
| Protected Study Plan route | **PASS** |
| Protected Past Papers route | **PASS** |
| Session persistence across protected navigations | **PASS** |
| Normal refresh-token operation | **NOT OBSERVED** |
| Redirect loop | **NONE** |
| Redirect to `lockedin-study.vercel.app` | **NONE** |
| Browser/raw/5xx error | **NONE OBSERVED** |
| Normal logout | **PASS** |
| Direct `/dashboard` after logout | **PASS** — redirected to `/login?next=%2Fdashboard` |

No study data was created, edited, or deleted.

## Recovery, signup, and password-policy boundaries

- Password recovery live request: **DEFERRED**. Owner approval for a live email was not given during this run, so no recovery email was sent and the canonical `/update-password` link target was not claimed as live proof.
- Password change: **NO**.
- Signup live creation: **NOT TESTED — NO NEW ACCOUNT REQUIRED**.
- Email confirmation: **ENABLED — HOSTED CONFIG VERIFIED**.
- Hosted password minimum: **8 — CONFIGURATION VERIFIED**.
- Runtime weak-password rejection: **NOT DESTRUCTIVELY TESTED**. No account was created and no existing password was changed solely for proof.

## Auth logs and abuse evidence

Recent Auth logs were inspected read-only and summarized without reproducing email addresses, user IDs, IP addresses, tokens, or request identifiers.

- expected controlled login activity: **PRESENT**;
- expected controlled logout activity: **PRESENT**;
- natural refresh: **NOT OBSERVED**;
- signup activity from this verification: **NONE**;
- recovery activity from this verification: **NONE**;
- redirect/server-error event: **NONE OBSERVED**;
- repeated failure burst: **NONE OBSERVED**;
- abuse evidence: **NONE**.

CAPTCHA remains **OFF**. Cloudflare Turnstile is **DEFERRED — EVIDENCE TRIGGER ONLY**.

## Redirect cleanup review

The current Vercel project reports only these domains:

- `lockdinapp-web.vercel.app`
- `lockdinapp-web-actif-devs.vercel.app`
- `lockdinapp-web-git-main-actif-devs.vercel.app`

All three historical hosts still returned HTTP 200 during the review, but none is a current domain of the `lockdinapp-web` project. The canonical Production login, protected routes, and logout flow completed without using them.

| Redirect entry | Classification |
| --- | --- |
| `https://lockedin-study.vercel.app/auth/callback` | **LIKELY OBSOLETE** — legacy Production host |
| `https://lockedin-study.vercel.app/update-password` | **LIKELY OBSOLETE** — legacy Production host |
| `https://lockedinapp-4833v113c-gidiprogrammers-projects.vercel.app/auth/callback` | **LIKELY OBSOLETE** — historical Preview deployment host |
| `https://lockedinapp-4833v113c-gidiprogrammers-projects.vercel.app/update-password` | **LIKELY OBSOLETE** — historical Preview deployment host |
| `https://lockedinapp-git-auth-and-tasks-gidiprogrammers-projects.vercel.app/auth/callback` | **LIKELY OBSOLETE** — historical branch Preview host |
| `https://lockedinapp-git-auth-and-tasks-gidiprogrammers-projects.vercel.app/update-password` | **LIKELY OBSOLETE** — historical branch Preview host |

Exact recommended cleanup set for owner approval: **all six entries above**. Deletion was **not performed**. Because the hosts still resolve, owner approval should confirm no retained email/link or legacy tester flow must complete on them before removal.

## Slice 7.4E — redirect cleanup and final closeout

The owner approved deletion of the exact six historical entries listed above, subject to a final pre-delete validation. That validation passed:

- starting Git evidence SHA: `9433ebf429837538376056beba8e8a512e4c125e` on clean, synchronized `main`;
- current Vercel project domains remained `lockdinapp-web.vercel.app`, `lockdinapp-web-actif-devs.vercel.app`, and `lockdinapp-web-git-main-actif-devs.vercel.app`;
- none of the six historical hosts was a current `lockdinapp-web` project domain;
- Supabase Auth Site URL remained `https://lockdinapp-web.vercel.app`;
- the allowlist contained exactly the six approved historical entries plus the two canonical entries, for a total of eight;
- no actual allowlist entry used a wildcard.

Only the six approved historical entries were selected. Supabase's dedicated **Remove URLs** confirmation reported six selected entries and persisted the deletion directly. The unrelated Site URL **Save changes** control remained disabled because the Site URL was not edited. A fresh page reload proved the persisted final state:

| Redirect result | Verdict |
| --- | --- |
| Historical entries removed | **6 / 6** |
| `https://lockdinapp-web.vercel.app/auth/callback` | **PRESENT** |
| `https://lockdinapp-web.vercel.app/update-password` | **PRESENT** |
| Final redirect count | **2** |
| Historical `lockedin-study` entries | **ABSENT** |
| Historical `gidiprogrammers` Preview entries | **ABSENT** |
| Wildcards | **NONE** |

### Post-cleanup security recheck

- Site URL: `https://lockdinapp-web.vercel.app`.
- Password minimum: **8**; composition: **no required characters**.
- Email/password and self-signup: **ENABLED**.
- Email confirmation and secure email change: **ENABLED**.
- Anonymous sign-in, Google, other OAuth providers, and CAPTCHA: **DISABLED**.
- JWT expiry: **3600 seconds**.
- Refresh-token compromise detection/rotation: **ENABLED**; reuse interval: **10 seconds**.
- Session restrictions: **UNCHANGED**.
- Provider-native rate limits: **UNCHANGED**.

### Post-cleanup legitimate flows

The owner completed exactly one fresh password login using the existing controlled account. Credentials were entered directly in the browser and were not exposed to the agent or chat.

| Gate | Result |
| --- | --- |
| Fresh login | **PASS** |
| Canonical dashboard destination | **PASS** |
| Dashboard/API-backed content | **PASS** |
| Study Plan | **PASS** |
| Past Papers | **PASS** |
| Old-domain redirect | **NONE** |
| Raw/5xx error | **NONE OBSERVED** |
| Study-data mutation | **NONE** |

The original authenticated session remained healthy after the recovery-link check. One normal logout then passed, and direct navigation to `/dashboard` redirected to `/login?next=%2Fdashboard`.

### Controlled recovery proof

The earlier Slice 7.4D recovery status remains historically **DEFERRED**. In Slice 7.4E the owner authorized exactly one controlled password-recovery request.

- request count: **ONE**;
- application response: **PASS — generic/non-enumerating**;
- recovery email: **RECEIVED**;
- effective destination host: `lockdinapp-web.vercel.app` — **PASS**;
- effective destination path: `/update-password` — **PASS**;
- historical-domain redirect: **NONE**;
- password changed: **NO**;
- second recovery email: **NOT SENT**.

The one-time recovery action reported `access_denied` / expired-or-invalid after resolving to the canonical destination. No query parameters, fragment values, recovery token, email address, or identifier were reproduced. This does not weaken the canonical redirect proof: the delivered link resolved to the required canonical host/path. The expired one-time action was recorded rather than retried, and no password change was attempted.

Recent Auth logs were reviewed read-only after the flow. Expected login/logout activity was present. No server error, invalid-redirect event, rate-limit problem, email burst, or repeated failure burst was observed. Abuse evidence remains **NONE**.

### Final policy and safety decisions

- CAPTCHA: **KEEP OFF**.
- Cloudflare Turnstile: **DEFERRED — ENABLE ONLY IF FUTURE ABUSE EVIDENCE JUSTIFIES IT**.
- Hosted/frontend password minimum parity: **8 / 8**.
- Local Supabase development minimum: **6**.
- Local config parity: **DEFERRED — NON-BETA-BLOCKING**. Align local development configuration to 8 in a future repository-hygiene change; do not add unrelated config churn to this hosted closeout.
- Production database and schema: **UNCHANGED**.
- Migration: **NONE**; head `0015_silent_sentinel`; **0016 ABSENT**.
- Vercel, Sentry, and PostHog: **UNCHANGED**.
- CAPTCHA and attack simulation: **OFF / NONE**.
- Passwords, recovery tokens, secret keys, and user identifiers exposed or reproduced: **NONE**.

## Privacy, telemetry, and safety

- Sentry: **UNCHANGED**; no deliberate error was created.
- PostHog: **UNCHANGED**.
- Auth PII/secrets in observed telemetry: **NONE OBSERVED**.
- Passwords, access/refresh tokens, recovery tokens, service-role credentials, and secret keys: **NOT INSPECTED OR EXPOSED**.
- Supabase settings during 7.4D: **UNCHANGED**.
- Production database and schema: **UNCHANGED**.
- Migration: **NONE**; head remains `0015_silent_sentinel`; **0016 ABSENT**.
- Vercel: **UNCHANGED**.
- Production attack simulation: **NONE**.

## Verdict

| Gate | Verdict |
| --- | --- |
| SLICE 7.4A AUDIT | **COMPLETE** |
| SLICE 7.4B HOSTED INSPECTION | **COMPLETE** |
| SLICE 7.4C HOSTED HARDENING | **CONFIGURATION PASS** |
| SLICE 7.4D AUTH FLOW VERIFICATION | **PASS** |
| SLICE 7.4E REDIRECT CLEANUP | **PASS — 6 REMOVED, 2 CANONICAL RETAINED** |
| RECOVERY REQUEST / EMAIL / CANONICAL DESTINATION | **PASS** |
| RECOVERY ONE-TIME ACTION | **EXPIRED/INVALID — RECORDED, NOT RETRIED; PASSWORD UNCHANGED** |
| CAPTCHA | **OFF — EVIDENCE-TRIGGERED TURNSTILE DEFERRED** |
| SLICE 7.4 | **CLOSED** |
| PHASE 7 | **IN PROGRESS** |
| NEXT | **SLICE 7.5 (not begun in this run)** |
