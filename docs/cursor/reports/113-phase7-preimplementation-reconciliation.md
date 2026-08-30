# Phase 7 — Pre-Implementation Reconciliation

## Baseline

- Repository: `https://github.com/ActifDevs/lockdinapp.git`
- Audited base / `origin/main`: `bb8344461e8259c9e6ea138e33bf2fa4be36e43f`
- Audit branch: `phase7-preimplementation-reconciliation`
- Latest checkpoint: `docs/checkpoints/2026-08-30_1339/` (checkpoint commit `13cbb4fa223fbf9a688b9f9106c279976a8934eb`)
- Post-checkpoint documentation cleanup: `bb8344461e8259c9e6ea138e33bf2fa4be36e43f`
- Phase 6: **CLOSED**
- Production: **HEALTHY** in the current closeout evidence
- Migration head: **0015_silent_sentinel**; journal count **16**; **0016 ABSENT**
- Authoritative integration: **DISPOSABLE / FAIL-CLOSED**
- Hosted-state evidence source: Report 112 and the latest checkpoint. This audit did not query or write hosted Supabase.
- Repository database evidence: committed Drizzle schema/migrations, RLS/grant SQL, integration tests, and a read-only migration-integrity run: **PASS**, `count=16 head=0015_silent_sentinel`.
- Audit effect: documentation only. No application code, migration, reference data, hosted configuration, Vercel configuration, or historical checkpoint changed.

## Repository-defined Phase 7

### Title

**Phase 7 — Ship gate**

### Original purpose

Phase 7 is the final static roadmap gate before a public launch. It is deliberately more product/operations-led than the earlier engineering phases. Its purpose is to make the launch decision conscious, observe real use and failures, protect the public authentication surface, prove recovery, and confirm that past-paper tracking is presented as one part of Lockdin rather than as a separate product.

Phase 7 closure is not itself a claim that every possible public-launch, growth, domain, SEO, performance, or product redesign task is complete.

### Original deliverables

The cumulative repository contract in `docs/lockdin-architecture-plan.md` section 10 and `docs/cursor/07-ship-gate.md` is:

1. The team explicitly discusses the unclosed user-validation question and consciously chooses either to validate now or to ship based on other evidence.
2. A small real-user beta is run and glaring UX issues are dispositioned.
3. A deliberately small, owner-approved product analytics event set is live from day one.
4. Error monitoring is live on both the React frontend and Express API.
5. Signup, login, and password-reset abuse controls are verified at the actual authentication boundary.
6. Backup/recovery is verified by an actual restore, performed by a human with the required Supabase dashboard/billing access.
7. Past-paper tracking remains integrated into the main Lockdin/StudyPlanner product in architecture and user-facing framing.

The analytics event examples named by the dedicated ship-gate document are account creation, first task creation, first past-paper attempt, streak achieved, and subject completed. They are examples for owner approval, not an authorization to instrument those events automatically.

### Original acceptance criteria

- The validation question has an explicit recorded team decision.
- Analytics is wired for an approved small event list.
- Error monitoring is live on frontend and API.
- Auth endpoints are rate-limited or otherwise equivalently abuse-protected at the real provider boundary.
- A real backup restore has been tested and recorded; backup existence or `pg_restore --list` alone is insufficient.
- Repository and any reviewed user-facing framing present past papers as an integrated Lockdin capability.
- Phase 6 remains complete and its security, CI, migration, pin, and fail-closed guarantees remain intact.

### Original deferred items

The roadmap explicitly leaves AI integration, a standalone FocusBuddy/blocker, and server-side achievement/XP persistence outside the static phases. Calendar OAuth token storage and notification-delivery history were also explicitly rejected until a real delivery/integration mechanism exists.

### Expected Phase 7 end state

Lockdin has a conscious product-validation disposition, controlled beta evidence, privacy-reviewed engagement telemetry, actionable frontend/API error alerts, verified provider-layer auth abuse controls, tested recovery evidence, and unified product framing. The existing CI, RLS, API, deployment, and syllabus-version foundations remain green and unchanged unless a separately approved Phase 7 design genuinely requires a change.

## Source-of-truth conflicts

### Authority order used

1. Current code, migrations, tests, configuration, Report 112, and the latest checkpoint define present system behavior.
2. `docs/cursor/07-ship-gate.md` is the dedicated Phase 7 checklist.
3. `docs/lockdin-architecture-plan.md` section 10 defines the phase purpose and the deliberately narrow roadmap boundary.
4. `docs/deep-research-report.md` Parts 15, 18, and 19 are upstream product research, not a blanket engineering scope declaration.
5. Older checkpoints/reports are historical evidence and cannot override newer implementation evidence.

### Conflicts and disposition

| Conflict | Evidence | Disposition |
| --- | --- | --- |
| The deep-research report's “Before launching publicly” list also mentions marketing hooks, social presence, and referrals; the Phase 7 roadmap does not carry those items forward. | `docs/deep-research-report.md` Part 18 versus the plan section 10 and dedicated ship-gate checklist. | Keep marketing/social/referral work outside Phase 7. The roadmap selectively adopted beta/validation and analytics, then added monitoring, auth abuse protection, recovery, and framing. |
| The architecture plan summarizes Phase 7 as beta + analytics + integrated past papers, while the dedicated ship-gate adds monitoring, auth rate limiting, and restore verification. | `docs/lockdin-architecture-plan.md:160-166`; `docs/cursor/07-ship-gate.md`. | Treat the documents cumulatively. The dedicated phase document supplies the detailed acceptance checklist. |
| The ship-gate prompt suggests an in-process Express limiter, but login, signup, and reset now call Supabase Auth directly from the browser. | `artifacts/revision-platform/src/components/auth-provider.tsx`; no corresponding Express auth routes. | The security requirement remains. The Express implementation assumption is **SUPERSEDED BY NEWER ARCHITECTURE**. Verify/configure Supabase Auth rate limits and, if approved, CAPTCHA at the hosted provider boundary. Do not add a cosmetic Express limiter that never sees auth traffic. |
| Older Phase 2 evidence proves a private logical backup existed and was readable, but managed backup visibility and an actual restore were not proven. | Reports 25–32; Report 31 records `pg_dump` and `pg_restore --list`, not a restore execution. | The Phase 7 recovery criterion remains open and human-gated. Do not infer restore readiness from archive listing. |
| Much of the July architecture plan describes pre-Phase-2 current state. | Phase 6 closeout and current code show real Auth, multi-tenancy, RLS, CI, and Production. | Use the old plan only for its still-unmodified Phase 7 contract. Current implementation evidence supersedes its old baseline descriptions. |
| The latest checkpoint recorded a stale applicability README. | Checkpoint limitation 5 versus post-checkpoint commit `bb834446...`. | Already corrected before this audit; no Phase 7 scope impact. |

No roadmap correction was made. Changing the auth-limiter wording or narrowing/expanding the Phase 7 checklist would materially alter scope and requires owner approval.

## Current implementation overlap

### Requirement reconciliation

| Repository requirement | Classification | Current evidence | Gap remaining | Relevant areas | Dependencies | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| Explicit validation discussion and conscious validate/ship decision | **UNCLEAR / BLOCKED** | The deep-research report defines interviews and a landing-page test; the repository contains no recorded interview, demand-test, or explicit skip/validate decision. | Owner/team discussion and recorded decision. If validation is chosen, define evidence and completion threshold. | `docs/deep-research-report.md`; `docs/cursor/07-ship-gate.md` | Owner/product team; access to target students | **BLOCKER** for Phase 7 closure |
| Small real-user beta and glaring-issue disposition | **NOT STARTED** | No beta cohort, beta run, feedback summary, or issue disposition is recorded. Prior authenticated QA used controlled technical accounts, not real-user product validation. | Cohort, consent/privacy posture, environment, feedback method, issue triage, and owner signoff. | Product operations; Preview/Production depending owner choice | Validation decision; telemetry/monitoring; auth protection | **HIGH** |
| Approved minimal product analytics | **NOT STARTED** | No analytics SDK exists in package manifests and no runtime event capture is present. API “progress analytics” is a user feature, not product telemetry. | Select provider, approve event taxonomy and identity/privacy rules, wire frontend/API as justified, update privacy disclosure, configure environments, verify delivery and deduplication. | Frontend entry/auth/mutations; API completion points; `.env.example`; Vercel env; privacy page | Owner tool/event approval; provider project/keys | **HIGH** |
| Frontend and API error monitoring | **PARTIALLY IMPLEMENTED** | React route error boundaries exist; Express has Pino, redaction, structured errors, and request IDs. No remote monitoring SDK/DSN, alert policy, release/source-map linkage, or provider dependency exists. | Select provider, capture unhandled frontend/API failures safely, link request/release context, upload source maps securely if used, configure alerts, and verify both runtimes. | `artifacts/revision-platform/src/App.tsx`, `src/main.tsx`; `artifacts/api-server/src/express-app.ts`, `lib/error-handler.ts`, `lib/logger.ts`; build/env config | Owner provider/data-retention approval; Vercel env | **HIGH** |
| Integrated PastPaperTracker/StudyPlanner architecture and framing | **IMPLEMENTED EARLIER** for repository scope | Past papers share Lockdin auth, API, database, navigation, dashboard, and landing-page framing. No separate PaperTrack/PastPaperTracker product identity exists in runtime copy. The original architecture plan already classified the structural decision as complete. | Owner should confirm any external/untracked marketing copy before closure; none is available in the repository to audit. | Past-papers page/routes/schema, dashboard, landing page, app navigation | Owner confirmation for materials outside repository | **LOW** |
| Rate limiting/abuse protection on signup, login, and reset | **SUPERSEDED BY NEWER ARCHITECTURE**; hosted gate **UNCLEAR** | Browser calls `supabase.auth.signUp`, `signInWithPassword`, and `resetPasswordForEmail` directly. Local `supabase/config.toml` defines Auth rate limits, but local config is not proof of hosted settings. CAPTCHA is commented out. No Express limiter can cover these provider endpoints. | Human verifies hosted Supabase Auth rate limits; owner decides whether CAPTCHA/stronger controls are required; configure and test safely in non-Production first. Record exact settings without secrets. | Supabase Auth dashboard/config; frontend auth error handling | Supabase owner access; possibly CAPTCHA provider/site keys | **HIGH** |
| Backup/restore verified by an actual restore | **BLOCKED** | Historical private logical backup was created and archive-listed. Managed backup/PITR visibility and a successful restore into an isolated target are not recorded. | Owner selects recovery objective and isolated restore target, confirms plan capabilities, executes a real restore, validates representative schema/data/invariants, records timestamp/result, and cleans up safely. | Supabase dashboard/billing/backups; recovery runbook/evidence | Human owner access; possibly paid plan or temporary project | **BLOCKER** for Phase 7 closure |

### Work completed incidentally before Phase 7

The following are not substitutes for the remaining ship-gate criteria, but they materially reduce Phase 7 implementation risk:

- Real Supabase Auth lifecycle, caller-derived identity, global fail-secure API classification, and RLS isolation.
- Structured API errors, Pino logging/redaction, server-authoritative request IDs, and client-visible safe failures.
- Generated OpenAPI/Zod/client contracts and codegen-drift enforcement.
- CI for typecheck, API/frontend/reference-data tests, migration integrity, codegen, whitespace, and disposable DB integration.
- Dedicated loopback-only disposable Supabase harness with HTTP/auth/RLS coverage and Production-URL rejection.
- Automatic Vercel deployments, Production-equivalent build evidence, canonical health/database smoke, and no manual-redeploy dependency.
- Immutable/pin-aware syllabus revisions, strict assignment, applicability policy, and current r001 lifecycle operations.
- Integrated past-paper routes, storage, dashboard analytics, navigation, and landing-page copy.

These foundations make Phase 7 compatible with the current system. They do not prove real-user validation, telemetry delivery, alert delivery, hosted Auth limits, or recovery.

## Remaining gaps

### Not started

- Product analytics provider/event taxonomy/instrumentation.
- Real-user beta and feedback disposition.
- Actual isolated restore test.

### Partially implemented

- Error handling/logging exists, but remote error monitoring and alerting do not.
- Local Supabase Auth rate-limit values exist, but hosted configuration is unverified and CAPTCHA is not configured.

### Implemented earlier

- Integrated past-paper architecture and repository user-facing framing.
- Phase 7 prerequisites: Auth, RLS, API hardening, CI, disposable integration, migration integrity, deployment health, and production readiness foundations.

### Superseded

- An in-process Express limiter for browser-to-Supabase Auth requests. It would protect the wrong boundary and is not an acceptable completion mechanism.

### Obsolete

- No Phase 7 outcome is obsolete. Only the old limiter implementation suggestion is stale.

### Blocked or unclear

- Team validation decision: no repository evidence.
- Hosted Supabase Auth limit/CAPTCHA posture: requires owner dashboard access.
- Managed backup/PITR capability and real restore: requires owner dashboard/billing access and an isolated target.
- Analytics and monitoring vendors, data retention, PII rules, and costs: require owner approval.
- External marketing framing: outside repository visibility.

## Deferred-item reconciliation

| Deferred item | Classification | Repository basis |
| --- | --- | --- |
| Broader task editing | **POST-PHASE-7 / OUT OF SCOPE** | Latest checkpoint calls it non-blocking and only to be mounted if brought into scope; Phase 7 contract does not mention it. |
| Mounted exam-date mutation UI | **POST-PHASE-7 / OUT OF SCOPE** | Phase 5 and latest checkpoint explicitly defer it; not a ship-gate requirement. |
| Onboarding draft persistence | **POST-PHASE-7 / OUT OF SCOPE** | Explicit non-blocking Phase 5 deferral; not a Phase 7 requirement. |
| Cross-device preferences | **POST-PHASE-7 / OUT OF SCOPE** | Browser-local preferences were an approved Phase 5 choice until a server delivery channel exists. |
| External calendar sync | **POST-PHASE-7 / OUT OF SCOPE** | Architecture plan explicitly rejects Calendar OAuth token storage without a real flow; no Phase 7 requirement. |
| Feb/Mar assignment | **INTENTIONALLY DEFERRED** | Product policy is false and public choices exclude it by design. Enabling it changes applicability/product policy and is unrelated to the ship gate. |
| Automatic repin | **INTENTIONALLY DEFERRED / OUT OF SCOPE** | Explicitly excluded by the immutable pin architecture. Any remapping needs separate owner authorization and tooling. |
| Real `r002` | **INTENTIONALLY DEFERRED / OPERATIONAL FUTURE WORK** | No real successor exists. The runbook and synthetic proof cover future revision operations; Phase 7 does not require inventing a successor. |
| Already-published DEFAULT promotion tooling | **INTENTIONALLY DEFERRED** | Current explicit owner admin step is documented as sufficient; add tooling only if an operational need is approved. |

None of these items belongs to the confirmed Phase 7 contract.

## Post-Phase-7 backlog boundary

| Product idea | Phase 7 disposition | Reason |
| --- | --- | --- |
| Redesigned onboarding / per-subject route and component choices | **OUT** | Product redesign, not ship-gate work. |
| Live Google OAuth enablement | **OUT** | Optional code path already exists behind a false-by-default feature flag, but hosted provider enablement is not a Phase 7 criterion. |
| Full name/unique username/community preparation | **OUT** | Existing profile identity does not make community architecture a ship-gate requirement. |
| Detailed syllabus redesign/checklist/status/percentages | **OUT** | Post-roadmap product work. |
| Editable syllabus target dates, planner/calendar integration, reminders, on-track insights | **OUT** | Post-roadmap planning product work; must not imply automatic completion. |
| Transactional/reminder email and support/deliverability system | **OUT** | No delivery system is part of Phase 7. |
| Dedicated performance/Core Web Vitals/PWA/install work | **OUT** | Worth separate performance scope; not in the Phase 7 contract. |
| Google Analytics specifically | **OUT AS A PRESELECTED VENDOR** | Minimal product analytics is **IN**, but the repository names several possible providers and requires owner approval. Do not silently choose Google Analytics. |
| Sentry specifically | **IN AS AN ALLOWED OPTION, NOT PREAPPROVED** | Error monitoring on both runtimes is explicitly Phase 7; the contract names Sentry or equivalent. |
| SEO/Open Graph/social metadata/sitemap/robots/canonical work | **OUT** | Not adopted into the static Phase 7 roadmap. |
| Domain purchase/cutover and redirect changes | **OUT** | Separate launch operation with its own Auth/domain QA. |
| Marketing/waitlist/launch/growth work | **OUT** | Present in upstream research but not carried into the repository Phase 7 contract. Product validation/beta remains **IN**. |

## Architecture compatibility

### Overall

**PARTIAL, with one stale implementation instruction.** The Phase 7 outcomes fit the current architecture. The Express auth-limiter suggestion does not.

### Compatibility by layer

- **React/Vite:** compatible with analytics and monitoring SDKs via small wrappers initialized at the app boundary. Avoid direct vendor calls scattered through pages.
- **Express/Vercel:** compatible with server monitoring around existing structured error middleware and request IDs. An in-memory limiter is not reliable across serverless instances and cannot see direct Supabase Auth traffic.
- **Supabase Auth:** is the real signup/login/reset boundary. Hosted rate limits and optional CAPTCHA belong here. Google OAuth enablement is separate and out of scope.
- **Supabase Postgres / Drizzle:** no Phase 7 table or column is required. Do not create migration 0016 unless an owner-approved design proves a schema need. A first-party event table would add avoidable privacy/RLS/retention scope and is not the default recommendation.
- **RLS and security-definer functions:** no change required. Existing owner isolation, narrowed grants, empty `search_path`, and caller-derived ownership must remain invariant.
- **Pin-aware syllabus, strict assignment, multi-session membership, immutable revisions:** unrelated to the ship-gate implementation and must not be modified.
- **Disposable integration:** remains authoritative for database/security regression. It must never receive hosted credentials.
- **GitHub Actions:** the PR workflow already runs all quality and disposable gates. New telemetry/monitoring/auth-control tests should join the existing jobs without Production secrets.
- **Vercel:** analytics/monitoring may require public client configuration and server-only secrets/tokens. Every new value requires owner approval and correct Preview/Production scoping. Do not expose server secrets through `VITE_*`.

### Current Supabase change watch

The 2026 Supabase changelog records that new public tables are moving to explicit Data API exposure. Phase 7 should not need a table. If scope changes and a table is approved, Drizzle remains migration authority and explicit grants/exposure plus RLS must be reviewed; table creation alone is not API authorization.

## Dependencies

```text
Owner Gate 0
  ├─ validation decision + beta intent
  ├─ analytics vendor/event/privacy approval
  ├─ monitoring vendor/alert/privacy approval
  ├─ Supabase Auth abuse-control decision
  └─ backup/restore capability + isolated target approval
        ↓
Analytics implementation ─┐
Monitoring implementation ├─→ CI + Preview verification
Auth abuse controls ───────┘          ↓
                              controlled beta
                                      ↓
                         issue disposition + framing review
                                      ↓
                         human isolated restore proof
                                      ↓
                    automatic Production deploy + light smoke
                                      ↓
                             Phase 7 closeout
```

### Dependency types

- **Schema:** none expected; migration 0016 is not a prerequisite.
- **API:** analytics may need narrowly defined server-side milestone emission; monitoring integrates at existing middleware/error boundaries. No auth proxy should be invented.
- **Frontend:** provider initialization, event wrapper, consent/privacy behavior if required, key product milestone calls, and frontend error capture.
- **External services:** one analytics provider and one monitoring provider unless an approved tool safely covers both; optional CAPTCHA provider; Supabase backup/restore facilities.
- **Environment/config:** Vercel Preview/Production variables; Supabase hosted Auth limits/CAPTCHA; source-map upload token if applicable; alert destinations.
- **Human/owner:** tool/cost/retention choice, event list, privacy approval, product validation decision, beta cohort, hosted config access, backup plan/restore execution, final signoff.

## Schema/infrastructure gates

| Change | Required? | Gate |
| --- | --- | --- |
| Migration 0016+ | **NO** for confirmed scope | Stop and obtain a new owner-approved design if a tool choice proposes application tables. |
| New tables/columns | **NO** for confirmed scope | Prefer external telemetry with minimized payloads. Any table requires Drizzle migration, RLS/grants/exposure review, disposable proof, and hosted write authorization. |
| New Supabase Auth/provider configuration | **YES** for verification and possibly CAPTCHA/rate adjustments; **NO** for Google OAuth | Owner must inspect/approve hosted Auth controls. Test non-Production first. |
| New Vercel environment values | **YES** for selected analytics/monitoring tools | Owner approves provider projects and variable scope. Client-safe IDs only in `VITE_*`; ingestion/auth tokens remain server/build secrets. |
| New third-party service | **YES / OWNER CHOICE** | Analytics and error monitoring providers are unselected. CAPTCHA may add another provider. |
| New Production secrets | **LIKELY** | Monitoring/analytics server tokens or source-map tokens must be owner-created, scoped, and stored only in Vercel/provider settings. |
| OAuth configuration | **NO** | Google OAuth and calendar OAuth are not Phase 7. |
| Domain changes | **NO** | Domain cutover is post-Phase-7. |
| Hosted database write | **NO** for default plan | Backup restore must target an isolated approved environment, never overwrite Production. |

## Proposed slices

### 7.1 — Owner Gate 0 and ship-gate design

- **Purpose:** resolve the decisions the original prompt requires before implementation.
- **Scope:** record validate-versus-ship decision; beta intent; choose analytics and monitoring providers; approve minimal event list, PII/identity/retention/consent rules, alert destinations, Auth abuse-control posture, and restore target/objective; confirm repository/external past-paper framing inventory.
- **Likely files:** a new Phase 7 design/decision report; possibly `.env.example` plan only. No runtime edits.
- **Schema impact:** none.
- **Hosted impact:** read-only inventory only; no config change yet.
- **Tests:** none beyond configuration inventory and threat/privacy review.
- **Preview QA:** not applicable.
- **Owner gate:** mandatory written approval.
- **Definition of done:** every provider, event, privacy, beta, auth-control, restore, and external-framing decision has an owner and an explicit disposition.

### 7.2 — Privacy-conscious product analytics

- **Purpose:** satisfy “analytics from day one” with the smallest meaningful taxonomy.
- **Scope:** provider wrapper; approved milestone events only; stable deduplication semantics; no syllabus content, free text, scores, email, names, tokens, or raw error data unless separately approved; privacy disclosure; environment configuration.
- **Likely files:** frontend app/auth/mutation boundaries, possibly API milestone boundaries, provider wrapper/tests, `.env.example`, privacy page, package manifests/lockfile, Vercel env outside Git.
- **Schema impact:** none expected.
- **Hosted impact:** provider project plus Vercel variables; no Supabase DB write.
- **Tests:** wrapper disabled/missing-config behavior, exact event names/properties, deduplication, account-boundary reset, and PII-deny assertions.
- **Preview QA:** approved events arrive once with expected non-sensitive properties; disabled/missing config fails safely.
- **Owner gate:** provider/event/privacy approval and Vercel env authorization.
- **Definition of done:** approved events are visible in Preview and Production, privacy disclosure is accurate, and no unapproved data is sent.

### 7.3 — Frontend/API error monitoring

- **Purpose:** turn existing local error handling and logs into actionable alerts.
- **Scope:** initialize selected provider in both runtimes; capture unhandled errors at React and Express boundaries; attach release/environment/request ID; redact Auth headers, cookies, user content, database details, and sensitive payloads; configure alert thresholds and source maps safely.
- **Likely files:** frontend `main.tsx`/`App.tsx`, API `express-app.ts`/`error-handler.ts`/logger integration, build config, `.env.example`, tests, provider config, Vercel env.
- **Schema impact:** none.
- **Hosted impact:** monitoring project, alert destination, Vercel variables, optional build token.
- **Tests:** mocked capture on both boundaries, redaction, no duplicate reports, request/release context, disabled configuration.
- **Preview QA:** controlled non-Production frontend and API errors appear with readable source mapping and no sensitive data.
- **Owner gate:** provider/retention/alert approval; no Production failure injection.
- **Definition of done:** both runtimes report actionable Preview evidence and Production is configured without exposing secrets.

### 7.4 — Supabase Auth abuse controls

- **Purpose:** protect the real signup/login/reset boundary.
- **Scope:** inspect and record hosted Supabase limits; compare with expected beta/public traffic; adjust only with owner authorization; decide CAPTCHA; ensure frontend safely handles 429/CAPTCHA states; keep Express out of the direct Auth path.
- **Likely files:** possibly frontend auth error/captcha integration, `.env.example`, tests, current Supabase config documentation. Hosted settings are outside Git.
- **Schema impact:** none.
- **Hosted impact:** Supabase Auth settings and possibly CAPTCHA provider/Vercel public site key.
- **Tests:** unit handling for 429/provider challenge; local/disposable or controlled Preview abuse-limit proof. Never brute-force Production.
- **Preview QA:** controlled threshold/challenge behavior, recovery, accessibility, and no account enumeration regression.
- **Owner gate:** Supabase dashboard config and CAPTCHA credentials/settings.
- **Definition of done:** the actual hosted Auth endpoints have recorded, approved abuse controls and the UI fails safely.

### 7.5 — Beta, recovery proof, and Phase 7 closeout

- **Purpose:** complete the human/product/operational gates after instrumentation and abuse controls exist.
- **Scope:** run the approved small beta; collect and disposition glaring issues; confirm integrated past-paper framing across known materials; perform a real restore into an isolated owner-approved target; validate representative schema/data/RLS/application invariants; automatic deploy only; light Production smoke and telemetry/monitoring confirmation.
- **Likely files:** evidence/closeout reports and only separately approved beta-finding fixes. Substantial fixes become their own slices, not silent closeout edits.
- **Schema impact:** none expected; a beta defect requiring schema returns to planning and migration gates.
- **Hosted impact:** isolated restore target; read-only Production checks; normal automatic deployment of approved code.
- **Tests:** all existing CI; targeted regression for fixed beta defects; post-restore integrity checks; no Production failure injection.
- **Preview QA:** authenticated core journey, approved event flow, controlled monitoring proof, auth-control behavior.
- **Owner gate:** beta cohort/signoff, restore execution/access, Production go/no-go.
- **Definition of done:** every original Phase 7 checkbox has dated evidence, all blockers are closed, Production remains healthy, and post-Phase-7 work is not pulled into closeout.

## QA strategy

### Automated

- Preserve current typecheck, API, serialized frontend, syllabus, harness, migration-integrity, codegen, whitespace, and disposable DB gates.
- Analytics: exact event-contract tests, PII/property allow-list, deduplication, missing-config behavior, logout/account-switch reset.
- Monitoring: frontend/API capture tests, redaction, request ID/release tagging, no duplicate capture, disabled-config behavior.
- Auth controls: 429/challenge error mapping and recovery tests; use local/disposable or controlled Preview configuration, not Production load.
- Run existing HTTP/auth/RLS disposable coverage after any auth UI or API boundary change even when schema is unchanged.

### Preview

- Verify environment separation and that Preview events/errors cannot contaminate Production dashboards.
- Exercise approved milestone events once and confirm payload minimization.
- Trigger controlled frontend/API exceptions only in Preview and verify alerts/source maps/redaction.
- Verify hosted Preview Auth limit/CAPTCHA behavior with a bounded owner-approved procedure.
- Run the full authenticated core journey and past-paper integration framing check.

### Authenticated

- Use controlled Preview accounts or approved beta accounts.
- Verify signup/login/reset, onboarding, subject assignment, tasks, progress, past-paper attempt, logout/account switch, and no cross-account telemetry identity leakage.
- Preserve current RLS and pin invariants; do not mutate Production memberships for failure testing.

### Production

- Automatic deployment only; no manual redeploy.
- Lightweight health/database/auth-boundary smoke and one approved non-destructive telemetry confirmation.
- Confirm Production monitoring configuration without deliberate failure injection.
- Confirm hosted Auth settings from the dashboard; do not stress-test Production.
- Restore testing occurs against an isolated target, never over Production.

### Manual owner QA

- Validation decision and beta acceptance.
- Provider, event, privacy/retention, cost, and alert approval.
- External marketing/framing review if such materials exist.
- Supabase Auth configuration signoff.
- Backup plan capability and actual restore execution/signoff.
- Final Phase 7 go/no-go.

## Risks

### BLOCKER

- The repository cannot supply the required human validation decision, beta participants, external-material inventory, Supabase dashboard/billing access, provider accounts, or restore authorization.
- A real isolated restore has not been evidenced. Phase 7 cannot close on archive existence alone.

### HIGH

- Telemetry or error reports could expose minors' identity, study data, free text, paper scores, tokens, or database details unless payloads are allow-listed and retention is approved.
- Applying a limiter to Express would leave direct Supabase Auth endpoints unprotected while creating false confidence.
- Changing hosted Auth limits/CAPTCHA without Preview proof can lock out legitimate signup/recovery flows.
- Backup capability can be plan-dependent; attempting a restore without an isolated target risks destructive impact.
- A beta without telemetry/monitoring and a triage owner can produce anecdotes without actionable evidence.

### MEDIUM

- Serverless instances make in-memory global rate limiting inconsistent even for Express-owned endpoints.
- Source-map upload tokens or server ingestion keys could leak if placed in `VITE_*` or logs.
- Duplicate client/server events can corrupt funnel conclusions.
- Monitoring alert noise or missing release/environment tags can make alerts unactionable.
- Beta findings can cause Phase 7 scope creep into the separate product backlog.
- Vendor outages/cost/retention changes add operational dependency.

### LOW

- Integrated past-paper framing is already consistent in tracked runtime copy.
- No schema change is required, so existing user rows, memberships, pins, applicability, and revision graphs should remain untouched.
- Existing CI, request IDs, error boundaries, Pino redaction, and disposable integration provide strong foundations.

## Phase 7 exit criteria

Phase 7 may be marked **CLOSED** only when all of the following have dated evidence:

1. Team/owner validation decision explicitly recorded.
2. Small real-user beta completed under an approved privacy/feedback process; glaring issues fixed, deferred with rationale, or explicitly accepted.
3. Minimal owner-approved analytics events live, verified, privacy-disclosed, environment-separated, and free of unapproved PII/study content.
4. Error monitoring live and verified on React and Express with redaction, environment/release context, request correlation where appropriate, and actionable alerts.
5. Hosted Supabase Auth signup/login/reset abuse controls verified and approved at the provider boundary; any CAPTCHA flow is accessible and tested.
6. Actual backup restore completed into an isolated target by an authorized human; representative schema, migration head, data, RLS, and application invariants verified; result recorded.
7. Past-paper integration/framing confirmed across tracked copy and any owner-supplied external launch material.
8. Existing CI and disposable integration pass; migration head remains 0015 unless a separately approved design legitimately introduced and proved a later migration.
9. No Production failure injection, hosted DB-as-local-test use, pin mutation, applicability change, real r002 creation, automatic repin, or unrelated product backlog expansion occurred.
10. Automatic Production deployment is healthy and lightweight smoke passes.
11. Owner gives explicit Phase 7 closeout signoff.

**PHASE 7 CLOSED** means the repository-defined ship gate is satisfied.

It does **not** mean **PRODUCT PUBLIC-LAUNCH READY** unless the owner separately approves domain, legal/privacy, SEO/social, support, marketing, distribution, performance, email, and other post-roadmap launch work that the static Phase 7 contract does not contain.

## Recommendation

Phase 7 is technically **READY TO PLAN** but **NEEDS OWNER DECISION before implementation**. Begin only Slice 7.1. Do not choose vendors, event payloads, CAPTCHA, hosted limits, beta cohort, or restore target on the owner's behalf.

The safest default technical posture is:

- no migration 0016 and no application event table;
- one small analytics wrapper with an allow-listed event schema;
- monitoring integrated at existing React/Express error boundaries;
- Supabase-hosted Auth controls rather than an ineffective Express limiter;
- Preview-only controlled failure/limit verification;
- isolated restore proof by an authorized human;
- no Phase 7 expansion into the post-roadmap product backlog.
