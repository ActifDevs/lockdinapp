# Report 162 — Phase 7 Pre-Beta Support/Privacy Production Verification

**Date:** 2026-09-09

**Status:** PASS — Production configuration, desktop verification, and the
authorized live 390 × 844 mobile continuation passed. The initial browser
attempt remains recorded below as incomplete at 1280 × 720.

## 1. Scope and authorization

This slice was authorized to set only the canonical Web Production
`VITE_SUPPORT_FORM_URL`, rebuild the exact support-finalization SHA, and perform
targeted read-only Production verification. No product code, API environment,
database, Auth, OAuth, migration, subject-visibility, password-recovery, RC QA,
or participant-invitation change was authorized or made.

## 2. Repository baseline

**FROZEN REPOSITORY/TEST EVIDENCE**

- Root: `C:/Users/USER/lockdinapp`
- Branch: `main`
- HEAD = fetched origin/main = `1b57d9fbb6aa25e61598b4f49f495848e20ed758`
- Initial working tree: CLEAN
- Frozen tests: direct Help/Support 4/4; focused matrix 47/47; full frontend 334/334 across 50 files; typecheck and build PASS

## 3. Pre-change Production deployment state

**CURRENT PRODUCTION EVIDENCE**

| Project | Deployment | State | Git SHA | Created |
| --- | --- | --- | --- | --- |
| Web `lockdinapp-web` | `dpl_5FyqDk8D3hfhMsFKpCL2obd1GSjH` | READY / Production | `1b57d9fbb6aa25e61598b4f49f495848e20ed758` | 2026-09-09 00:03:11 UTC |
| API `lockdinapp` | `dpl_G1w71JMP1jjsEi8xSwGwQNVg4HkS` | READY / Production | `1b57d9fbb6aa25e61598b4f49f495848e20ed758` | 2026-09-09 00:03:11 UTC |

Both were automatic main deployments. The Web build predated support-variable
configuration, so a Web rebuild was still required.

## 4. Production environment configuration

**CURRENT PRODUCTION EVIDENCE**

- Project: `actif-devs/lockdinapp-web`
- Environment: Production only
- Before: `VITE_SUPPORT_FORM_URL` ABSENT
- Action: added only `VITE_SUPPORT_FORM_URL`
- Authorized value supplied: `https://forms.gle/rJwXYBhS8Qm46XVf7`
- After: PRESENT; Vercel classifies the value as Sensitive and re-exports it as `[SENSITIVE]`
- Exact effective value: independently proved by the rebuilt live anchor resolving to the authorized URL
- Preview/Development/API environments changed: NO
- No unrelated environment values were printed or changed

## 5. Web rebuild/redeployment evidence

The pre-change Web deployment was rebuilt after configuration. No Git commit was
created to trigger it.

- Final Web deployment: `dpl_8pPUBF1RiWFo4KhEiixLjCkg1tyZ`
- Deployment URL: `https://lockdinapp-ju5sy9aof-actif-devs.vercel.app`
- Canonical alias: `https://lockdinapp-web.vercel.app`
- State: READY / Production
- Git SHA: `1b57d9fbb6aa25e61598b4f49f495848e20ed758`
- Created: 2026-09-09 00:19:31 UTC
- Action provenance: redeploy of `dpl_5FyqDk8D3hfhMsFKpCL2obd1GSjH`

## 6. API deployment boundary

The support variable is a frontend Vite build value. The support-finalization
diff changes no API runtime file. The API was not redeployed for this variable;
its existing automatic deployment `dpl_G1w71JMP1jjsEi8xSwGwQNVg4HkS` remained
READY on the same exact SHA.

## 7. Runtime health

**CURRENT PRODUCTION EVIDENCE**

Pre-QA and post-QA checks both passed:

| Endpoint | Result |
| --- | --- |
| Web `/api/healthz` | HTTP 200, `status=ok` |
| Web `/api/healthz/db` | HTTP 200, `status=ok`, `database=ok` |
| API `/api/healthz` | HTTP 200, `status=ok` |
| API `/api/healthz/db` | HTTP 200, `status=ok`, `database=ok` |

## 8. Data/invariant baseline

**CURRENT PRODUCTION EVIDENCE**

Aggregate-only GET requests through the Production Supabase Data API returned
exact counts and no row bodies:

| Invariant | Result | Expected |
| --- | ---: | ---: |
| Subjects | 16 | 16 |
| Syllabus versions | 29 | 29 |
| Published / retired | 21 / 8 | 21 / 8 |
| Route sets | 29 | 29 |
| Routes | 95 | 95 |
| Memberships | 15 | 15 |
| Route-assigned memberships | 2 | 2 |
| Study-option rows | 3 | 3 |
| Current-nine globally selectable | 9/9 | 9/9 |
| New-seven globally selectable | 0/7 | 0/7 |
| Visibility grants | 0 | 0 |
| Feb/Mar enabled | 0 | 0 |
| Tasks / Past Paper attempts | 16 / 10 | baseline 16 / 10 |

Direct PostgreSQL verification was attempted with
`default_transaction_read_only=on` and `BEGIN READ ONLY`, but Vercel's
environment export supplied a localhost placeholder rather than the effective
hosted connection. Each attempt failed at connection establishment before SQL
execution. Therefore current migration-table count/head is not re-proved here;
the frozen repository/Report 158 evidence remains 21 / `0020_subject_visibility_grants`,
and live database health plus all exposed aggregate invariants pass.

## 9. PostHog privacy Production proof

**CURRENT PRODUCTION EVIDENCE**

The rendered `/privacy` page states that one PostHog Cloud EU project is used
with mandatory environment separation. It preserves minimal allow-listed custom
events, no browser PostHog SDK, no autocapture, no Session Replay, no heatmaps,
and no advertising integrations. Obsolete separate Preview/Production project
wording is absent. R158-SW-001 is **FIXED IN PRODUCTION**.

## 10. Sentry privacy Production proof

**CURRENT PRODUCTION EVIDENCE**

The rendered page states that, when configured, Lockdin uses Sentry to record
React workspace and Express API errors and identifies this as reliability
monitoring. Obsolete hosted-capture-unproven wording is absent. No certification,
perfect-reliability, unlimited-history, or deliberate Production-error-injection
claim is rendered. R158-SW-002 is **FIXED IN PRODUCTION**.

## 11. Help & Support Production proof

**CURRENT PRODUCTION EVIDENCE**

The existing dedicated internal QA browser session was already authenticated;
no password was requested, printed, stored, or exposed.

- Route: `https://lockdinapp-web.vercel.app/settings?tab=help`
- Help & Support tab: selected and visible
- Purposes: Ask for help, Report a bug, Give feedback, Privacy/account deletion — all visible
- Primary action: Open support form — visible
- Temporary-unavailable state: ABSENT
- Status: IMPLEMENTED IN PRODUCTION on desktop

## 12. Real support-link proof

**CURRENT PRODUCTION EVIDENCE**

- Live anchor `href`: `https://forms.gle/rJwXYBhS8Qm46XVf7`
- `target`: `_blank`
- `rel`: `noopener noreferrer`
- Accessible name: `Open support form`
- Activation opened `Lockdin Beta — Help & Support` at the Google Forms responder
- The opened Form visibly contained the four expected categories
- No response was submitted and no Form data was changed
- No placeholder, broken link, general-support privacy-email fallback, or unconfigured state was present

## 13. Mobile/accessibility bounded check

**CURRENT PRODUCTION EVIDENCE**

- Desktop keyboard semantics: native anchor PASS
- Accessible name: PASS (`Open support form`)
- External-link semantics: PASS
- Icon ambiguity: PASS; the icon is decorative and the text name is present
- Visible focus styling: live anchor includes the shipped `focus-visible:ring-2`
  and `focus-visible:ring-offset-2` classes
- Browser console warnings/errors during the checked Help session: 0
- 390 × 844 live check: **NOT COMPLETED**. The browser advertised a viewport
  override, but two bounded attempts left the measured viewport at 1280 × 720.
  The override was reset afterward. Frozen direct/App Shell tests and code review
  support the mobile implementation, but they are not substituted for live
  Production evidence.

### Mobile Verification Continuation

**CURRENT PRODUCTION EVIDENCE — 2026-09-09 00:43–00:47 UTC**

The authorized continuation used an isolated Microsoft Edge profile attached
through the Chrome DevTools Protocol. The existing dedicated internal QA account
was authenticated manually by the owner; no password or session secret was
requested, read, printed, or stored by the verifier. CDP device metrics created
an explicit mobile CSS layout viewport and live runtime evaluation measured:

- `window.innerWidth = 390`
- `window.innerHeight = 844`
- initial `document.documentElement.clientWidth = 390`
- initial `document.documentElement.scrollWidth = 390`

At that measured viewport, keyboard Space opened the bottom-navigation More
disclosure (`aria-expanded=true`). Sequential keyboard Tab focus moved through
Past papers, Calendar, Settings, and Help. Help was visible, fully inside the
viewport, keyboard focused with `:focus-visible=true` and the browser focus
outline, and Enter navigated to `/settings?tab=help` while the measured viewport
remained 390 × 844. The selected page rendered both the Help & Support tab and
heading.

The live mobile Help card kept all four purposes readable: Ask for help using
Lockdin, Report a bug or issue, Give feedback or suggestions, and Request
privacy/account deletion. The `Open support form` action was fully visible and
reachable at approximately 254 × 44 CSS pixels, with no clipped primary content
or navigation overlap. Its live semantics were:

- `href=https://forms.gle/rJwXYBhS8Qm46XVf7`
- `target=_blank`
- `rel=noopener noreferrer`
- accessible name `Open support form`

Keyboard focus on the action produced `:focus-visible=true`, a 2 px white offset
and a 4 px teal 40%-opacity focus ring. Tab moved onward to the privacy email and
Shift+Tab returned to the support action, establishing no keyboard trap in this
bounded path. Enter opened the real Google Form in a new Edge tab at the exact
short URL; no response was submitted.

After scrolling the action into view, the vertical scrollbar reduced the root
content box to `clientWidth = 375`; `scrollWidth = 375` and `scrollLeft = 0`.
Therefore there was no horizontal scrolling, clipped Help card/action, or
blocking horizontal overflow. The fixed mobile navigation remained visible and
usable.

Final lightweight health after mobile QA:

| Endpoint | Result |
| --- | --- |
| Web `/api/healthz` | HTTP 200, `status=ok` |
| Web `/api/healthz/db` | HTTP 200, `status=ok`, `database=ok` |
| API `/api/healthz` | HTTP 200, `status=ok` |
| API `/api/healthz/db` | HTTP 200, `status=ok`, `database=ok` |

This continuation created 0 tasks, 0 Past Paper attempts, 0 memberships, 0
visibility grants, and 0 Google Form responses. It made no product,
configuration, deployment, database, Auth, migration, subject-visibility, or
invitation change. No broader aggregate audit was repeated.

**Chronology:** Initial attempt: **NOT COMPLETED — 1280 × 720**. Authorized
continuation: **390 × 844 LIVE PASS**.

No accessibility certification is claimed.

## 14. Support operational evidence

**OWNER MANUAL GOOGLE FORM EVIDENCE**

- Google Form: VERIFIED
- Four-path test: PASS
- Responses and linked Sheet: VERIFIED
- Notification mailbox: `lockdinapp26@gmail.com`
- Notifications: VERIFIED ENABLED
- Monitoring owner: Project owner
- Review cadence: DAILY
- Monitored route: VERIFIED

Operational storage was not retested and no new response was submitted.

## 15. Broader operations still open

Support-form intake ownership is assigned. Beta coordinator, issue triage beyond
Form intake, privacy/deletion fulfilment, Sentry monitoring owner/cadence, and
the escalation path remain open. Real participant invitations remain blocked
independently.

## 16. Runtime log window

**CURRENT PRODUCTION EVIDENCE**

Vercel Production logs were queried for the bounded 30-minute window
approximately 2026-09-08 23:57 UTC through 2026-09-09 00:27 UTC, covering
configuration, deployment, and browser QA:

- Unexpected Web 5xx: no evidence observed
- Unexpected API 5xx: no evidence observed
- Web error/fatal events: no evidence observed
- API error/fatal events: no evidence observed
- Browser console warnings/errors: 0
- Database-health failures: no evidence observed

This is bounded evidence, not an unlimited-history claim.

## 17. Post-QA health/data safety

All four health checks remained HTTP 200. Post-QA counts remained tasks 16,
attempts 10, memberships 15, route-assigned memberships 2, option selections 3,
visibility grants 0, and new-seven globally selectable 0/7. This slice created
0 tasks, 0 attempts, 0 memberships, and 0 visibility grants. No historical
aggregate drift was observed.

## 18. Final issue classification

- R158-SW-001: FIXED IN PRODUCTION
- R158-SW-002: FIXED IN PRODUCTION
- R158-RP-002: IMPLEMENTED IN PRODUCTION
- PB-IMPL-01: CLOSED / PASS
- PB-IMPL-02: CLOSED / PASS
- Support route: VERIFIED / MONITORED DAILY
- PB-OPS-01: PARTIAL
- Product defect observed: NONE
- Evidence blocker: NONE

## 19. Release-gate update

The slice is **PASS**. The required live mobile viewport proof is complete and
password-recovery end-to-end proof is the next technical release action. No RC
QA was performed. Broader operational ownership remains partial and real beta
invitations remain unauthorized.

## 20. Compliance and invitation boundary

- DPC approval: NO
- Compliance/age/guardian: UNRESOLVED
- Real beta invitation authorization: NOT AUTHORIZED
- Real beta invitations: NONE

Passing this technical support/privacy gate does not authorize invitations.

## 21. Exact next action

Owner review and freeze Report 162, then authorize password-recovery end-to-end
proof as the next technical release action.

Do not begin RC QA, enable Google OAuth, globally enable the new-seven subjects,
or invite real participants.
