# Phase 7 Slice 7.5F — Participant Process + Beta Materials Preflight

## Baseline

- Repository: `https://github.com/ActifDevs/lockdinapp.git`
- Branch: `main`
- Starting `HEAD` / `origin/main`: `dc9480a86bda5fba9a92f1f1e4951b0cdf17a6de` (Report 118)
- Working tree at start: **CLEAN**
- Migration head: `0015_silent_sentinel`
- `0016`: **ABSENT** (unchanged)
- Production data: **UNTOUCHED**
- Real invitations: **NONE**
- Beta started: **NO**
- Supabase Auth posture: **UNCHANGED** in this slice (public email self-signup remains disabled per Report 118)

## Report 118 reconciliation

Report 118 treated `/signup` invitation-only messaging inconsistently:

1. Remaining beta gates item 2 listed signup-page invitation-only messaging among materials to prepare **before** beta start.
2. Remaining beta gates item 3 and an earlier “Recommended post-beta UX” line deferred the same UX until after beta.

**Owner decision for this slice (authoritative):** the `/signup` invitation-only UX is **PRE-BETA** work, not post-beta. Public signup remains disabled at Supabase. The public signup page must not misleadingly present normal self-registration during the controlled beta. Invitation/account-setup architecture is unchanged.

## Participant-process inventory (repository as found)

| Area | What exists today | Gap |
| --- | --- | --- |
| Privacy information | `/privacy` — account/revision data, PostHog analytics disclosure, Sentry monitoring disclosure, `privacy@lockdin.app` | Formal legal review still flagged (under-18, lawful basis, DPAs) |
| Account deletion / contact | No in-app delete control. This slice added an explicit deletion/privacy-request paragraph pointing to `privacy@lockdin.app` | Mailbox owner / SLA / processor wipe steps unresolved |
| Support / contact | Only published mailbox: `privacy@lockdin.app`. Report 114 listed “support email” as post-Phase-7 | Named beta support person **OWNER INPUT REQUIRED** |
| Feedback collection | No in-product feedback form. Report 114 proposed structured form + optional calls | Final channel / owner **OWNER INPUT REQUIRED** |
| Beta / onboarding guidance | Report 114 one-pager proposal; product onboarding flow exists for invited users | Coordinator-owned welcome copy now drafted in `docs/beta/` |
| Age / minor statements | Privacy page flags under-18 / lawful basis for formal review; no age gate in product | **OWNER / LEGAL REVIEW REQUIRED** |
| Analytics disclosure | Present on `/privacy` (PostHog EU, allow-listed server events, no browser SDK / replay) | Processor / consent questions remain legal-flagged |
| Monitoring disclosure | Present on `/privacy` (Sentry, no Session Replay, sanitized events) | Same |

### Unresolved owner / legal decisions (not chosen here)

| Decision | Status |
| --- | --- |
| Intended participant age range | **OWNER INPUT REQUIRED** |
| Whether anyone under 18 may participate | **OWNER INPUT REQUIRED** / **OWNER / LEGAL REVIEW REQUIRED** |
| Participant countries / jurisdictions | **OWNER INPUT REQUIRED** |
| Guardian / consent process where applicable | **OWNER / LEGAL REVIEW REQUIRED** |
| Person responsible for participant support | **OWNER INPUT REQUIRED** |
| Person responsible for deletion / privacy requests | Confirm ownership of `privacy@lockdin.app` — **OWNER INPUT REQUIRED** |
| Feedback mechanism (final channel) | **OWNER INPUT REQUIRED** |
| Beta coordinator | **OWNER INPUT REQUIRED** |
| Issue triage owner | **OWNER INPUT REQUIRED** |

No legal conclusions were invented in this slice.

## Beta materials prepared

New file: [`docs/beta/controlled-beta-materials.md`](../../beta/controlled-beta-materials.md)

Covers minimum invite-only controlled-beta copy:

| Item | Status |
| --- | --- |
| A. Invitation-only signup-page message | **Implemented** on `/signup` |
| B. Short welcome / onboarding copy | Draft in materials |
| C. Support / contact path | Draft; coordinator name still required |
| D. Feedback instructions | Draft questions; channel still required |
| E. Participant expectations (beta, bugs, reporting) | Draft |
| F. Account / deletion request path | Draft + `/privacy` update |
| G. Privacy / analytics / monitoring disclosures | Already on `/privacy`; referenced in materials |

## Implementation

### `/signup`

- Removed the public self-registration form (name / email / password / Google).
- Shows controlled-beta invitation-only copy and a Sign-in CTA.
- Points invited users to the invitation email → password-setup flow.
- Login, forgot-password, update-password, and auth-callback routes were **not** modified structurally (login footer copy only; recovery and invitation routes unchanged).
- `AuthProvider.signUp` remains available for any non-page callers; the public page no longer invokes it.
- Landing CTAs that previously promised open “Start free” / “Create your workspace” now say **Invitation only** and still route to `/signup`.
- Document title for `/signup`: `Invitation only · Lockdin`.

### Privacy

- Added **Account deletion and privacy requests** section using the existing `privacy@lockdin.app` contact. No legal timeline promised.

### Tests

Updated `artifacts/revision-platform/src/pages/auth-pages.test.ts`:

- Asserts invitation-only copy and absence of a public self-signup form / `signUp(` / password fields.
- Asserts login links to invitation-only signup.
- Retains password-reset and update-password wiring checks.
- Restored login profile-load safety check.

## Validation

| Check | Result |
| --- | --- |
| Prettier on touched files | **PASS** (written) |
| `pnpm run typecheck` | **PASS** |
| Focused auth tests (`auth-pages`, `require-auth`, `auth-provider`) | **PASS** (37) |
| `PORT=3000 BASE_PATH=/` revision-platform Vite build | **PASS**; signup bundle contains controlled-beta / invitation copy; no “Create account” form |
| Workspace `pnpm run build` (all packages) | Mockup-sandbox fails without `PORT` (pre-existing env requirement); product packages built as above |
| `/signup` invitation-only state | **PASS** (source + built chunk) |
| Login structure | **PASS** (unchanged auth form; invitation-only link) |
| Password recovery route | **UNCHANGED** |
| Invitation callback / update-password | **UNCHANGED** |
| Public Supabase signup | Remains **OFF** per Report 118; this slice made **no** Auth config change |
| Migration `0016` | **ABSENT** |
| Production data | **UNTOUCHED** |
| Real invitation sent | **NO** |

## Owner-gate decision table

| Gate | Result |
| --- | --- |
| PARTICIPANT AGE RANGE | **OWNER INPUT REQUIRED** |
| MINORS INCLUDED | **OWNER INPUT REQUIRED** |
| PARTICIPANT JURISDICTIONS | **OWNER INPUT REQUIRED** |
| GUARDIAN/CONSENT PROCESS | **OWNER / LEGAL REVIEW REQUIRED** |
| BETA COORDINATOR | **OWNER INPUT REQUIRED** |
| TRIAGE OWNER | **OWNER INPUT REQUIRED** |
| SUPPORT CONTACT | **OWNER INPUT REQUIRED** (provisional mailbox `privacy@lockdin.app` only) |
| DELETION/PRIVACY CONTACT | **PASS** (published `privacy@lockdin.app`; mailbox ownership still confirm with owner) |
| FEEDBACK METHOD | **OWNER INPUT REQUIRED** |
| SIGNUP INVITATION-ONLY UX | **PASS** |
| BETA MATERIALS | **READY** (drafts cover A–G; launch still blocked by gates above) |
| REAL INVITES SENT | **NO** |
| BETA STARTED | **NO** |

## Verdict

| Gate | Result |
| --- | --- |
| Report 118 signup contradiction resolved (pre-beta UX) | **PASS** |
| `/signup` no longer presents open self-registration | **PASS** |
| Beta materials drafted | **PASS** |
| Participant / legal process gates | **HOLD — OWNER / LEGAL** |
| Slice 7.5 fully closed | **NO** |
| Controlled beta start | **HOLD** |

**STOP at the owner decision gate.** Do not invite participants until the OWNER INPUT / LEGAL REVIEW rows above are resolved or explicitly accepted in writing with residual risk.
