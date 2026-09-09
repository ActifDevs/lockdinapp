# Report 163 — Phase 7 Password Recovery End-to-End Proof

**Date:** 2026-09-09

**Status:** PASS — password recovery was proved end to end in Production with
the existing dedicated internal QA account.

## 1. Scope and authorization

This was an evidence-only Production Auth QA slice. The only authorized
Production mutation was changing the dedicated internal QA account password
through the participant-facing recovery flow. No product code, Auth
configuration, Vercel configuration, deployment, database/domain data,
migration, subject visibility, OAuth, RC QA, or beta invitation change was made.

No password, token-bearing URL, OTP, access token, refresh token, cookie, or
Authorization header was requested, read, printed, stored, or recorded.

## 2. Repository baseline

**FROZEN REPOSITORY EVIDENCE**

- Root: `C:/Users/USER/lockdinapp`
- Branch: `main`
- HEAD = fetched origin/main =
  `84f74eec3fd7379eb3a9a5d172defbba8bf2678c`
- Working tree before Report 163: CLEAN
- Report 162: FROZEN / PASS at that SHA
- Delta from Product SHA `1b57d9fbb6aa25e61598b4f49f495848e20ed758`:
  Report 162 only; no product file changed

## 3. Production deployment state

**CURRENT PRODUCTION EVIDENCE**

| Project | Deployment | State | Git SHA | Created |
| --- | --- | --- | --- | --- |
| Web `lockdinapp-web` | `dpl_HztXfTBraBjKdVRvTpDhBrXfFBBx` | READY / Production | `84f74eec3fd7379eb3a9a5d172defbba8bf2678c` | 2026-09-09 00:58:25 UTC |
| API `lockdinapp` | `dpl_DgnWHHBY7rCyoZYFEBg2LZw4izTG` | READY / Production | `84f74eec3fd7379eb3a9a5d172defbba8bf2678c` | 2026-09-09 00:58:25 UTC |

These are automatic documentation-only deployments. Their product tree is
equivalent to the last frozen Product SHA. This QA did not redeploy either
project.

## 4. Runtime/Auth configuration preflight

**CURRENT PRODUCTION EVIDENCE**

Pre-QA Web process, Web database, API process, and API database health all
returned HTTP 200 with `status=ok`; database checks also returned
`database=ok`.

The public Production Supabase Auth settings endpoint safely established:

- email/password provider: ENABLED
- email confirmation: ENABLED (`mailer_autoconfirm=false`)
- public signup: DISABLED
- anonymous Auth: DISABLED
- Google provider: DISABLED / DEFERRED

**FROZEN REPOSITORY/OWNER CONFIGURATION EVIDENCE** records the canonical Site
URL and the allowed canonical `/auth/callback` and `/update-password` redirects.
The fresh live recovery below independently proved the effective canonical
Production `/update-password` destination. Auth configuration changed: NO.

The current Supabase password-recovery contract remains
`resetPasswordForEmail(..., { redirectTo })`, followed by an authenticated
`updateUser({ password })`. The current changelog contained no hosted-password-
recovery breaking change applicable to this flow.

## 5. Dedicated QA account boundary

**OWNER MANUAL CREDENTIAL ACTION**

Only the existing dedicated internal QA account was used. No new user was
created and no participant or personal account was used. The owner entered all
email/password values manually. Codex credential knowledge: NONE.

## 6. Baseline pre-reset authentication proof

**OWNER MANUAL CREDENTIAL ACTION + CURRENT PRODUCTION EVIDENCE**

- Baseline password authentication: PASS
- Dashboard/protected application: PASS
- Settings account/profile load: PASS
- Clean sign-out: PASS
- Protected `/settings` after sign-out: redirected to `/login?next=%2Fsettings`

This established that the pre-reset credential genuinely worked before the
recovery request.

## 7. Recovery-request proof

**OWNER MANUAL CREDENTIAL ACTION + CURRENT PRODUCTION EVIDENCE**

- Participant route: `/forgot-password`
- Initial requests submitted: exactly 1
- Request minute: 2026-09-09 19:28 UTC
- Completion: PASS
- Safe confirmation: “If an account exists for that email, a password-reset
  link has been sent.”
- Raw Supabase/database/server error or stack trace: ABSENT
- Browser exception at the checked completion state: NONE
- Retry request: NOT REQUIRED

## 8. Fresh-email delivery proof

**OWNER MANUAL EMAIL EVIDENCE**

A newly generated recovery email sent after the recorded request minute was
received. No old email was used. No email content, full action URL, OTP, token,
or query value was provided to Codex or recorded here.

Fresh recovery email: RECEIVED.

## 9. Recovery redirect/update-password proof

**OWNER MANUAL EMAIL/CREDENTIAL ACTION**

The owner opened the fresh link without exposing it. After provider processing,
the browser reached the canonical Lockdin Production host at the safe route
`/update-password`, and the Update Password form loaded successfully.

- Localhost destination: NO
- Preview destination: NO
- Broken callback: NO
- Raw token shown to participant: NO EVIDENCE OBSERVED
- Recovery session recognized: PASS

No token-bearing URL is recorded.

## 10. Password-update proof

**OWNER MANUAL CREDENTIAL ACTION**

The owner selected and entered a new owner-controlled password and confirmation
and submitted once.

- New password set: PASS
- Participant-facing success state: SAFE
- Raw server/Supabase detail: ABSENT
- Application crash: NONE

The password itself is not known to Codex and is not present in Git, the report,
terminal commands, or chat.

## 11. Previous-password rejection proof

**OWNER MANUAL CREDENTIAL ACTION**

After establishing a clean normal-login state, the owner attempted the
pre-reset password once.

- Previous password rejected: PASS
- Protected access granted: NO
- Participant failure: SAFE / NON-SENSITIVE
- Raw backend information: ABSENT

## 12. New-password authentication proof

**OWNER MANUAL CREDENTIAL ACTION + CURRENT PRODUCTION EVIDENCE**

Normal email/password authentication with the new password passed, including a
final clean login after replay testing. The expected existing account and
protected application state loaded successfully.

- New password accepted: PASS
- Protected application access: PASS
- Expected account: PASS
- Expected existing user state: PRESENT

## 13. Recovery-link replay/single-use proof

**OWNER MANUAL EMAIL EVIDENCE**

After signing out, the owner opened the same consumed recovery link once more
without sharing it and without submitting another password. Production showed:
“This reset link is invalid or has expired. Request a new one.”

- Reused link creates a fresh valid recovery: NO
- Replay/single-use result: PASS

## 14. Protected-route sanity

**CURRENT PRODUCTION EVIDENCE**

With normal new-password authentication:

- Dashboard/protected app entry: PASS
- Settings: PASS; all five expected profile labels loaded
- Help & Support: PASS; all four support purposes rendered
- Past papers route: PASS
- Application error state: ABSENT

This was a narrow post-recovery sanity check, not broad product or RC QA.

## 15. Domain-data integrity

**CURRENT PRODUCTION EVIDENCE + FROZEN REPOSITORY EVIDENCE**

Aggregate-only authenticated application responses after recovery showed the
dedicated QA account still had 3 memberships, 2 route assignments, 3 study-
option selections, 2 existing tasks, and 0 Past Paper attempts. The 3 / 2 / 3
membership-route-option state exactly matches the frozen dedicated-QA baseline.
The existing account/profile remained present and usable.

This slice invoked no subject, membership, route, option, task, Past Paper, or
visibility-grant mutation. Therefore it created:

- new subjects: 0
- new memberships: 0
- route assignment changes: 0
- study-option changes: 0
- tasks: 0
- Past Paper attempts: 0
- visibility grants: 0

Existing account/domain state: PRESERVED. Direct PostgreSQL was not attempted;
the known exported connection limitation remains, and live database health plus
safe authenticated API evidence was sufficient with no contradiction.

## 16. Bounded runtime/log review

**CURRENT PRODUCTION EVIDENCE**

The bounded two-hour Production window covered preflight, baseline login,
recovery request and completion, credential rejection/acceptance, replay, and
final verification.

- Unexpected Web 5xx: no evidence observed
- Unexpected API 5xx: no evidence observed
- Web runtime error/fatal clusters: no evidence observed
- API runtime error/fatal clusters: no evidence observed
- Browser warnings/errors in instrumented checkpoints: 0
- Database-health failures: no evidence observed
- Log matches for password, recovery-token, Authorization, or cookie terms: 0
- Sensitive credential/token leak observed: NO

This is bounded evidence, not an unlimited-history claim. No log value capable
of containing a credential or token was printed.

## 17. Post-QA health

**CURRENT PRODUCTION EVIDENCE — 2026-09-09 21:10 UTC**

| Endpoint | Result |
| --- | --- |
| Web `/api/healthz` | HTTP 200, `status=ok` |
| Web `/api/healthz/db` | HTTP 200, `status=ok`, `database=ok` |
| API `/api/healthz` | HTTP 200, `status=ok` |
| API `/api/healthz/db` | HTTP 200, `status=ok`, `database=ok` |

## 18. Final QA account state

**OWNER MANUAL CREDENTIAL ACTION + CURRENT PRODUCTION EVIDENCE**

- Dedicated QA account: ACCESSIBLE
- Normal email/password login: PASS
- Credential: owner-controlled
- Codex credential knowledge: NONE

The owner should privately update the secure credential record used for this QA
account. No credential is recorded here.

## 19. Issue classification

| Severity | Count | Detail |
| --- | ---: | --- |
| Blocker | 0 | None |
| HIGH | 0 | None |
| MEDIUM | 0 | None |
| LOW | 0 | None |

Final verdict: **PASS**. No product defect was observed.

## 20. Release-gate update

- Password recovery: PROVED END TO END IN PRODUCTION
- R158-RP-004: CLOSED / PASS
- Support/privacy gate: remains CLOSED / PASS
- PB-OPS-01: remains PARTIAL
- Next technical gate: CONTROLLED-BETA CATALOGUE SCOPE AMENDMENT + 16-SUBJECT
  PRODUCTION ACTIVATION
- Then: PRE-RC INTEGRITY REVALIDATION
- Then: FULL RISK-BASED RC QA
- Full RC QA: NOT YET
- Google OAuth: DEFERRED / DISABLED
- DPC approval: NO
- Compliance/age/guardian: UNRESOLVED
- Invitation authorization: NOT AUTHORIZED
- Real beta invitations: NONE

Technical password-recovery PASS does not change compliance or invitation
authorization.

## 21. Exact next action

Owner review and freeze Report 163. Then perform a controlled-beta catalogue
scope amendment and 16-subject Production activation as a separately authorized
slice. After that activation, perform PRE-RC INTEGRITY REVALIDATION against the
same complete catalogue intended for controlled-beta participants, followed by
FULL RISK-BASED RC QA.

Do not perform the catalogue change in this freeze task, jump directly to full
RC QA, enable Google OAuth, or invite real beta participants.
