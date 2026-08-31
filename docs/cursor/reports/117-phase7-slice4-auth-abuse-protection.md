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
| RECOVERY LIVE PROOF | **DEFERRED** |
| REDIRECT CLEANUP | **OWNER DECISION REQUIRED — NO DELETION PERFORMED** |
| SLICE 7.4 | **IN PROGRESS** |
| NEXT | **OWNER REDIRECT-CLEANUP DECISION + 7.4E CLOSEOUT** |
