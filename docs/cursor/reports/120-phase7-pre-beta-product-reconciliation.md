# LOCKDIN — PHASE 7 PRE-BETA PRODUCT RECONCILIATION

## Executive Decision

Lockdin is in **PRE-BETA PRODUCT COMPLETION WITHIN PHASE 7**. Phase 6 is closed; Phase 7, the controlled beta, and public release are not. The release-candidate beta does not justify reopening every historical idea.

The bounded mandatory product scope is:

1. correct the two false `/privacy` statements and recheck the rest of the participant-facing disclosure;
2. establish an owned, monitored beta support/feedback/deletion process and put the final route in participant materials;
3. complete a narrow subject-context UI slice so a member can see the pinned syllabus identity, intended session, applicable components, topics, learning outcomes, and progress without weakening pin/version invariants;
4. pass a risk-based Release Candidate QA gate, including a successful password-recovery completion, mobile/accessibility/performance checks, serialized Linux CI, Production build, and hosted smoke.

Google OAuth, Information Technology, custom SMTP, PWA/installability, a custom domain, product email reminders, native tickets, community, and AI are not mandatory for the controlled beta. Candidate work must not enter implementation until its owner decision is recorded.

The Ghana DPC/participant-age/guardian workstream proceeds in parallel. It blocks **real invitations**, not unrelated engineering. This report makes no legal conclusion and claims no approval.

## Repository Baseline

| Fact | Evidence |
| --- | --- |
| Branch | `main` |
| HEAD | `1f22e1e06a1c3b6368d1e0544e0336869f2a4524` |
| Freshly fetched `origin/main` | same SHA; ahead/behind `0/0` |
| Working tree before task | clean |
| Owner checkpoint publication | `1f22e1e` (docs only) |
| Application baseline described by checkpoint | `0d2963c854ad3fbf9ce0e111c695138120fd42e5` |
| Intervening commits after checkpoint | none |
| Migration head | `0015_silent_sentinel`; 16 rows; `0016` absent |
| Canonical host | `https://lockdinapp-web.vercel.app` |

The required fetch initially hit sandbox permission on `.git/FETCH_HEAD`; the approved read-only fetch then succeeded. Current remote truth therefore matches local truth.

## Release Model

```text
Phase 7 readiness engineering
→ universal technical checkpoint
→ this reconciliation
→ owner scope freeze
→ approved pre-beta implementation
→ Phase 7 integrity revalidation
→ Release Candidate QA
→ feature freeze
→ controlled beta
→ beta blocker/critical-UX fixes
→ final regression
→ Phase 7 final closeout
→ bounded public-release gate
→ public release
```

Beta materials are drafts, not evidence that beta started. Public signup remains intentionally off. No real participant is invited merely because engineering is complete.

## Current Product Baseline

- Invited email/password users can authenticate, onboard, choose 1–5 subjects, set a global intended session plus per-subject overrides, and use dashboard, subjects, study plan, past papers, progress, calendar, settings, and browser-local reminders.
- `profiles.full_name` and normalized unique `profiles.username` exist. Auth creates a nullable profile; the authenticated onboarding RPC atomically completes identity and strictly assigns new memberships.
- Memberships pin immutable syllabus versions. Retained pins/sessions survive replacement. Zero and ambiguous assignment fail closed. `profiles.exam_session` is not assignment authority.
- The API returns pinned-version metadata, units, topics, learning outcomes, components, and progress. The UI shows units/topics/progress and uses components for paper logging, but does not visibly identify the pinned syllabus or expose learning outcomes/components together on the subject surface.
- Google provider code and a false-by-default login feature flag exist. Hosted Google OAuth is off and the flag is not evidenced as enabled. Public `/signup` contains no Google action or registration form.
- Nine subjects are supported. Information Technology has no source CSV, manifest, immutable graph, policy, or catalogue evidence.
- PostHog EU server-side custom analytics and Sentry frontend/API monitoring already exist. Restore proof already passed in an isolated temporary project.
- Basic metadata, Open Graph/Twitter tags, `robots.txt`, route-level lazy loading, responsive styles, and accessible controls exist. There is no sitemap, canonical tag, web manifest, service worker, or installable PWA.
- The GitHub PR quality job serializes frontend Vitest on Ubuntu. The current Windows host can hang on the full suite even though focused tests and earlier serialized full-suite evidence pass.

## Historical Checklist Reconciliation Matrix

| Area | Historical item | Actual current state | Classification | Why | Dependencies | Risk | Owner decision needed? | Phase 7 revalidation triggered | Recommended timing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Account | Full name | Profile, Auth metadata fallback, onboarding validation and RPC exist | ALREADY IMPLEMENTED | Correct 1:1 Auth/profile model | None | Low | No | Regression only | Keep |
| Account | Unique username/reservation | Lowercase format and partial unique index; atomic conflict handling | ALREADY IMPLEMENTED | Durable foundation without community claims | None | Low | No | Profile/RPC tests | Keep |
| Account | Live username availability check | Conflict is reported only on onboarding submission | PRE-BETA CANDIDATE | Convenience, not correctness | Onboarding UX | Low | Yes | Profile/RPC, enumeration review | Decide at scope freeze |
| Account | Username changes | Intentionally immutable through profile update | DEFERRED | Not needed for beta core loop | Identity policy | Medium | No | Auth/profile if later added | After beta |
| Onboarding | Modified five-step flow | Intro, identity, subjects, level/session, review | ALREADY IMPLEMENTED | Coherent and release-capable | None | Medium | No | RC UX regression | Keep; polish only from QA |
| Onboarding | Global AS/A Level selection | One profile-level level is collected | ALREADY IMPLEMENTED | It is display/profile context, not assignment authority | Profile contract | Low | No | Profile tests | Keep |
| Onboarding | Remove confusing global assumptions | Copy distinguishes profile level/session from per-subject overrides | ALREADY IMPLEMENTED | Current flow no longer assigns by profile label alone | None | Low | No | UX regression | Keep |
| Onboarding | Per-subject study route | `/subjects/:id` exists | ALREADY IMPLEMENTED | Existing navigation is sound | Membership | Low | No | Frontend regression | Keep |
| Onboarding | Per-subject level | Components carry AS/A context; no separate membership-level field | DEFERRED | A new field/model is not justified; do not invent it | Product decision, schema | High | No | Full syllabus/account gates if revived | Post-beta evidence only |
| Onboarding | Paper/component selection per subject | Pinned-version components are selected during paper logging | ALREADY IMPLEMENTED | Syllabus-aware validation exists | Membership pin | Medium | No | Component/paper tests | Keep |
| Onboarding | Per-subject exam session/overrides | Stored on memberships; onboarding/settings support overrides | ALREADY IMPLEMENTED | Correct assignment authority | Strict resolver | High | No | Resolver/pin tests | Preserve |
| Onboarding | Setup/review final step | Step 5 summarizes identity, subjects, level and sessions | ALREADY IMPLEMENTED | Prevents blind submission | None | Low | No | Frontend tests | Keep |
| Onboarding | Mobile/accessibility/polish | Responsive grids, labels, alerts and keyboard controls exist; no RC device audit | PRE-BETA REQUIRED | QA must prove the critical first-run journey | RC QA | Medium | No | Major frontend gates if fixes land | Before freeze |
| Auth | Email/password signup convergence | Public signup off; invitations produce the same Auth/profile/onboarding path | ALREADY IMPLEMENTED | Correct beta posture | Supabase invitation | Medium | No | Hosted Auth smoke | Keep |
| Auth | Google signup/login preparation | `signInWithOAuth`, callback route, flag and tests exist | ALREADY IMPLEMENTED | Preparation is real; capability is not enabled | None | Low | No | None while off | Keep off |
| Auth | Enable Google OAuth | Hosted provider off; no verified Google credentials/callback/config | PRE-BETA CANDIDATE | Useful but not needed for invite beta; adds provider/config risk | Owner YES, Google client, redirects | High | Yes | Auth/API/recovery/Sentry/analytics | Conditional separate slice |
| Auth | Google/password account convergence | Supabase verified-email automatic linking is provider behavior; manual linking off | PRE-BETA CANDIDATE | Must be explicitly tested only if OAuth is approved | Google OAuth | High | Yes (with OAuth) | Auth/profile/onboarding | Same conditional slice |
| Auth | Public signup | Hosted self-signup off; `/signup` is truthful invitation-only UX | DEFERRED | Deliberate beta control, not a defect | Public launch decision | High | No | Auth abuse/privacy if opened | Not before beta |
| Auth | Password recovery | Delivery and canonical path passed; one-time action expired and completion unproven | PRE-BETA REQUIRED | Account recovery must work end-to-end for real users | Controlled test account | High | No | Auth redirects, session, Sentry | RC gate |
| Auth | Local password minimum 6 vs hosted 8 | Real drift in `supabase/config.toml` | PRE-BETA CANDIDATE | Low-risk parity/hygiene; hosted safety is already 8 | Config-only review | Low | Yes | Local auth tests | Bundle only if approved |
| Subjects | Subjects catalogue/page | Nine membership cards with progress/tasks/latest paper | ALREADY IMPLEMENTED | Core route exists | Memberships | Low | No | RC regression | Keep |
| Subjects | Syllabus navigation | Subject tab renders ordered units/topics with progress controls | ALREADY IMPLEMENTED | Core hierarchy exists | Pinned syllabus API | Medium | No | Pin/progress tests | Keep |
| Subjects | Visible pinned syllabus identity/session | API returns version label and intended session; primary UI does not show them | PRE-BETA REQUIRED | Student cannot fully answer “which syllabus applies?” | Existing membership response | Medium | No | Pin-aware reads, responsive QA | Before freeze |
| Subjects | Learning outcomes visibility | API returns arrays; current subject UI does not render them | PRE-BETA REQUIRED | Outcomes are core revision content already shipped in data | Existing API | Medium | No | Read-state/a11y/performance | Before freeze |
| Subjects | Applicable components visibility | Components appear only in paper-log flow, not syllabus context | PRE-BETA REQUIRED | Student should understand applicable papers before logging | Existing pinned component endpoint | Medium | No | Component/pin tests | Same subject slice |
| Subjects | Topic hierarchy and progress | Units/topics, tri-state progress, notes, totals and percentages exist | ALREADY IMPLEMENTED | Functional current model | Topic progress RPC | Medium | No | Progress regression | Keep |
| Subjects | Large syllabus redesign | Historical broad redesign exceeds proven gap | SUPERSEDED / REMOVE | Narrow context completion replaces it | Subject slice | High | No | N/A | Remove from v1 roadmap |
| Syllabus | Immutable graphs/revision identity | Implemented and proven | ALREADY IMPLEMENTED | Core invariant | None | High | No | Integrity checks after relevant change | Preserve |
| Syllabus | Retained pin/no automatic repin | Implemented | ALREADY IMPLEMENTED | Prevents silent curriculum switching | None | High | No | Resolver/pin tests | Preserve |
| Syllabus | Feb/Mar automatic assignment | Schema-valid but product-disabled | DEFERRED | Explicit policy; no later decision | Official evidence/policy | High | No | Full syllabus gates if revived | Future |
| Syllabus | Real r002 | None exists | DEFERRED | Do not fabricate a revision | Official successor source | High | No | Full pipeline if real | Future operational need |
| Catalogue | Information Technology | Not implemented in any pipeline layer | PRE-BETA CANDIDATE | Only justified if cohort coverage materially needs it | Owner YES + official source pipeline | High | Yes | Full syllabus/import/resolver/frontend gates | Conditional independent stream |
| Support | Privacy/deletion contact | `privacy@lockdin.app` published; ownership/SLA not confirmed | IMPLEMENTED — CORRECTION REQUIRED | Route exists but operation is unowned | Mailbox owner | High | Yes | Privacy/deletion workflow | Before invitations |
| Support | Lightweight Help & Support entry | No dedicated page | PRE-BETA CANDIDATE | Helpful discoverability; materials can carry the minimum path | Channel decision | Low | Yes | Frontend/a11y/privacy | Optional before freeze |
| Support | Monitored mailbox | Only provisional privacy address | PRE-BETA REQUIRED | Real beta needs an owned response path | Coordinator/support/deletion owners | High | Yes | Privacy/support runbook | Before invitations |
| Support | Google Form | No form exists | PRE-BETA CANDIDATE | Sensible structured option, not uniquely required | Channel/processor decision | Medium | Yes | Privacy/data processor review | Before invitations if selected |
| Support | WhatsApp/direct qualitative feedback | Mentioned as possible, not finalized | PRE-BETA CANDIDATE | Can supplement, not replace owned issue capture | Coordinator | Medium | Yes | Privacy/retention guidance | Before invitations if selected |
| Support | Native ticket backend/admin dashboard | Not implemented | DEFERRED | Enterprise workflow is disproportionate | Product evidence | Medium | No | Broad backend/privacy gates | Post-beta/future |
| Privacy | PostHog project topology claim | Page falsely says separate projects; actual topology is one EU project + `environment` | IMPLEMENTED — CORRECTION REQUIRED | Participant-facing factual defect | None | High | No | Privacy copy + analytics contract | First implementation slice |
| Privacy | Sentry proof claim | Page falsely says hosted capture unproven | IMPLEMENTED — CORRECTION REQUIRED | Later hosted symbolication/Production evidence supersedes copy | None | High | No | Privacy copy + Sentry evidence | First implementation slice |
| Privacy | Invite-only/OAuth/support form disclosure | Invite posture is visible; future OAuth/form facts must not be claimed early | PRE-BETA REQUIRED | Final disclosure must match the selected beta operation | Owner scope decisions | High | No | Privacy review | Before freeze |
| Notifications | Browser-local preferences/reminders | Account-scoped localStorage and desktop notifications while app runs | ALREADY IMPLEMENTED | Truthfully labelled local/device-only | None | Low | No | RC browser tests | Keep |
| Email | Auth transactional email | Supabase invitations/recovery/confirmation exist; default sender/system only | ALREADY IMPLEMENTED | Sufficient functional foundation, not a product email system | Supabase limits | Medium | No | Hosted auth smoke | Keep |
| Email | Custom SMTP/branded sender/deliverability | Not configured or proven | PRE-BETA CANDIDATE | Staged 8–12 invites may work without it; verify limits/delivery plan | Provider/domain decision | Medium | Yes | Auth/privacy/sender security | Decide before invitations |
| Email | Product reminder emails/templates | Not implemented | DEFERRED | Browser reminders are the approved v1 minimum | Delivery/consent system | Medium | No | Broad privacy/email gates | Post-launch evidence |
| Email | Domain support/sender address | No official domain-email proof | UNRESOLVED OWNER DECISION | Strong public-release consideration, not beta necessity | Domain acquisition | Medium | Yes | SPF/DKIM/DMARC/support | Public-release gate |
| Performance | Route code splitting/lazy loading | All pages lazy-loaded; Sentry is separate async chunk | ALREADY IMPLEMENTED | Meaningful baseline exists | None | Low | No | Build regression | Keep |
| Performance | RC mobile/cross-browser/touch QA | No dedicated current completion evidence | PRE-BETA REQUIRED | Beta findings must not be dominated by basic device failures | Device matrix | High | No | Frontend/a11y/perf | RC QA |
| Performance | Lighthouse/CWV/bundle/slow-route gate | No dedicated closeout; prior main/Sentry chunks are material | PRE-BETA REQUIRED | Measure and fix only severe regressions, not chase vanity scores | Production build | Medium | No | Build/source maps | RC QA |
| PWA | Manifest/service worker/standalone/install tests | Absent | DEFERRED | Installability is optional and creates cache/update risk | Product decision | Medium | No | Broad frontend/release gates | Post-launch |
| SEO | Titles/descriptions/OG/Twitter/social image | Implemented in HTML plus route document titles | ALREADY IMPLEMENTED | Adequate for beta | None | Low | No | Smoke | Keep |
| SEO | Robots/indexing | `robots.txt` and meta currently allow indexing | ALREADY IMPLEMENTED | Public landing may be indexed; app access remains Auth-protected | Owner launch strategy | Low | No | Public-site audit | Reconsider at public release |
| SEO | Sitemap/canonical/public SEO audit | No sitemap or canonical URL | DEFERRED | Not needed for invite-only beta | Final domain | Low | No | Public-site smoke | Public-release gate |
| Domain | Custom web domain/cutover | No official custom domain; Vercel host canonical | UNRESOLVED OWNER DECISION | Not needed for beta; affects many public-release integrations | Domain choice | High | Yes | Vercel/Auth/OAuth/recovery/SEO/telemetry | Decide before public release |
| Reliability | PostHog four-event EU implementation | Server-only allow-list, HMAC identity, one project/environment split | ALREADY IMPLEMENTED | Supersedes GA plan | None | Medium | No | Event regression only | Preserve |
| Analytics | Google Analytics | Not present | SUPERSEDED / REMOVE | PostHog is authoritative | None | Low | No | None | Remove |
| Analytics | Additional beta events/autocapture/replay/heatmaps | Not enabled | DEFERRED | Existing four events answer minimum activation/use questions; added collection lacks need | New product question | High | No | Privacy/analytics if revived | Do not add for beta |
| Reliability | Sentry frontend/API/source maps/release/environment | Implemented and hosted evidence passed | ALREADY IMPLEMENTED | Do not recreate | None | Medium | No | Build/sanitizer regression | Preserve |
| Reliability | Sentry actionable alerts | Issues visible; automatic Production alerts deferred | PRE-BETA CANDIDATE | Daily named review can be the beta minimum | Triage owner | Medium | Yes | Monitoring workflow | Decide before invitations |
| Reliability | Logging/privacy/retention workflow | Sanitized capture exists; operational reviewer still unnamed | PRE-BETA REQUIRED | Monitoring without ownership is not operational | Triage owner | High | Yes | Sentry/privacy/runbook | Before invitations |
| Recovery | Isolated restore proof | Passed; temp target deleted; Production unchanged | ALREADY IMPLEMENTED | Criterion is satisfied | None | Low | No | Do not rerun for small changes | Preserve evidence |
| Community | Username foundation | Exists without public profile/social promises | ALREADY IMPLEMENTED | Appropriate future option | None | Low | No | None | Keep |
| Community | Public profiles/social/community | Not implemented | POST-LAUNCH / FUTURE | Not v1 beta purpose | Product validation | High | No | New privacy/security design | Future |
| AI | AI study features | Not implemented | POST-LAUNCH / FUTURE | No owner-approved v1 need | Product/privacy design | High | No | New architecture | Future |
| Integrations | Google Calendar/external sync | Disabled “coming soon” card; no OAuth/token store | POST-LAUNCH / FUTURE | Avoid premature token architecture | Product validation | High | No | Auth/privacy/schema | Future |
| Expansion | IGCSE/broader education | Not implemented | POST-LAUNCH / FUTURE | Scope creep beyond Cambridge A Level v1 | Product/data strategy | High | No | Full data architecture | Future |
| QA | Full frontend Windows hang | Reproducible host issue; serialized Linux CI/full-suite evidence exists | PRE-BETA CANDIDATE | Diagnose for DX, but use authoritative Linux RC run as release gate | CI evidence | Medium | Yes | Test infrastructure only | Do not block beta if Linux pass |
| QA | Release Candidate functional/accessibility/error-state pass | Not yet run against frozen candidate | PRE-BETA REQUIRED | Required for RC-quality beta | Required slices complete | High | No | All affected gates | Immediately before freeze |
| CI | Typecheck/API/frontend/harness/syllabus/migrations/codegen | Workflow exists for PRs; latest evidence green | ALREADY IMPLEMENTED | Mature baseline | None | Medium | No | Rerun by cadence | Per slice/RC/fixes |
| Operations | Beta materials | Drafted; no invitations sent | ALREADY IMPLEMENTED | Draft is preparation only | Final owners/channel | Low | No | Copy check | Finalize before invites |
| Compliance | DPC/age/guardian/participant process | External guidance and owner decisions unresolved | UNRESOLVED OWNER DECISION | Separate hard invitation gate; no invented legal answer | Owner/compliance | High | Yes | Operational/privacy only | Parallel; resolve before invites |
| Release | Feature freeze/beta/closeout/public launch | None has occurred | PRE-BETA REQUIRED | Governance gate, not a product feature | All required work | High | No | RC then post-beta regression | Follow release model |

## Already Implemented

The matrix is authoritative. In particular: onboarding/account identity, strict per-subject sessions, syllabus pins, topic progress, paper-component validation, invite-only signup UX, browser-local reminders, PostHog, Sentry, restore proof, basic metadata, CI foundations, and beta-material drafts already exist. They require regression, not recreation.

## Implemented — Correction Required

1. Correct `/privacy`: one PostHog EU project with mandatory `environment`, not separate projects.
2. Correct `/privacy`: hosted Sentry delivery/symbolication and Production configuration are proven; retain precise limits (no deliberate Production error injection).
3. Confirm the operational owner/SLA for `privacy@lockdin.app`; do not present an unmonitored address as a working process.

## Pre-Beta Required

- Narrow subject-context completion: visible pinned version/session, applicable components, and learning outcomes using existing pin-aware APIs.
- Truthful final privacy/support/feedback disclosures.
- Owned monitored support, deletion and monitoring triage workflows.
- Successful end-to-end password recovery.
- RC mobile, cross-browser, accessibility, error/loading/empty-state and performance verification.
- Full risk-based technical gate and feature freeze.

## Pre-Beta Candidates

Google OAuth, Information Technology, live username availability, Help & Support page, Google Form, WhatsApp supplement, local password-config parity, custom SMTP, automatic Sentry alerts, and Windows-hang diagnosis require explicit decisions or evidence. Recommendation: approve only the minimum support channel and local parity if convenient; defer the rest unless cohort/release evidence changes.

## Deferred

Public signup, username changes, per-membership level redesign, Feb/Mar assignment, real r002, native tickets, product email reminders, sitemap/canonical audit until public release, and PWA/installability.

## Post-Launch / Future

Community/social, AI, external calendar, IGCSE and broader education expansion. Unique usernames are only a foundation; no fake profiles/testimonials or unsupported adoption claims are allowed.

## Superseded / Removed

- Google Analytics is superseded by PostHog.
- Recreating Sentry is removed.
- Repeating restore proof merely because it appeared on an old checklist is removed.
- A broad syllabus/navigation rebuild is superseded by the narrow context-completion slice.
- Express rate limiting for browser-to-Supabase Auth remains superseded by provider-native controls.

## Owner Decision Register

| Decision | Why needed | Options | Recommended option | Consequence of delaying | Blocking what? |
| --- | --- | --- | --- | --- | --- |
| Freeze onboarding scope | Prevent redesign creep | keep + QA polish / redesign | Keep current architecture; defects only | Scope cannot freeze | Implementation start |
| Google OAuth before beta | Provider/config/account-path cost | yes / no | **No**; revisit after beta/custom-domain decision | None to email invite beta | OAuth slice only |
| Information Technology before beta | Cohort coverage vs large data cost | yes / no | **No unless named cohort demand** | Those students cannot participate meaningfully | IT stream/recruitment |
| Support/feedback channel | Participants need one real route | monitored mailbox / Form + mailbox / WhatsApp supplement | Form + monitored mailbox if processor review permits; otherwise mailbox | Invitations unsafe/unmanageable | Real invitations |
| Named coordinator/triage/deletion owners | Operational accountability | assign people | Assign before RC freeze | Findings/requests may be lost | Real invitations |
| Custom SMTP before beta | Default sending limits/deliverability | configure / staged default sends | Verify plan and staged delivery first; configure only if insufficient | Invite schedule may be constrained | Invitation plan |
| Help & Support page | Discoverability | lightweight page / materials only | Add only if cheap after channel is fixed | Materials remain usable | Optional UI slice |
| Sentry alerts | Notification noise vs responsiveness | alerts / daily manual review | Daily named review for tiny beta; add alerts if cleanly scoped | Slower discovery if review omitted | Monitoring runbook |
| Domain before public release | Brand/callback/email/canonical coupling | Vercel host / custom domain | Decide once before OAuth/email/SEO cutover | Causes rework if decided late | Public release integrations |
| DPC/participant age/jurisdiction/guardian process | External/owner boundary | per received guidance | Record the actual approved process; invent nothing | Software may continue; invites cannot | Real invitations only |

## Dependency Graph

```text
Owner scope freeze
├─ Privacy corrections ─┬─ final support channel ── named owners
│                       └─ selected processor/form disclosure
├─ Subject-context UI ─── existing membership pin + syllabus/component APIs
├─ Conditional Google OAuth ── Google client + Supabase provider + redirects
│                              └─ verified-email convergence tests
├─ Conditional IT ── official evidence → curated CSV → immutable r001 → policy → QA
└─ RC QA ── all approved code/config slices complete
           ├─ successful recovery
           ├─ serialized Linux CI + build
           ├─ mobile/a11y/performance
           └─ hosted smoke → feature freeze

Parallel compliance: DPC/age/guardian process ───────────────┐
Parallel operations: coordinator/support/triage ownership ──┼─> real invitations
Engineering freeze + RC gate ────────────────────────────────┘
```

Critical path: scope freeze → privacy/support operation + subject-context slice → RC QA/revalidation → feature freeze → owner/compliance invitation gate.

## Proposed Implementation Slices

### Slice 1 — Truthful disclosure and beta operations

**Goal:** correct `/privacy` and finalize the owned support/feedback/deletion/monitoring route. **Why now:** factual defects and unowned channels block truthful participation. **Scope:** copy corrections, final participant-material links, runbook/owners; optional tiny Help entry only if approved. **Explicit non-scope:** legal conclusions, native tickets, processor deletion automation. **Dependencies:** channel/owner decisions. **Repository areas likely affected:** `privacy.tsx`, `docs/beta/`, possibly navigation/help page. **Database migration expected:** NO. **Hosted configuration expected:** NO unless a selected form/mailbox requires owner setup. **Owner action required:** YES. **Acceptance criteria:** copy matches Reports 115/116; one monitored contact and escalation path; deletion and telemetry wording accurate; no SLA/legal promise invented. **Tests/verification:** focused legal-page/navigation tests, a11y/link check, build. **Phase 7 gates:** analytics/privacy, Sentry/privacy, support ownership. **Rollback/risk:** stale copy is higher risk than a simple revert; avoid expanding data collection.

### Slice 2 — Subject context completion

**Goal:** expose what the student is studying without changing assignment. **Why now:** the existing UI omits already-available version, component and outcome context. **Scope:** pinned version label/exam board/qualification, intended session, applicable components, expandable learning outcomes, progress clarity. **Explicit non-scope:** new selection authority, per-membership level schema, repin, DEFAULT behavior, new subject, CSV edits. **Dependencies:** existing member and component endpoints; confirm exact IA. **Repository areas likely affected:** subject pages/components, generated client consumption, focused tests; API only if response composition needs a safe aggregation. **Database migration expected:** NO. **Hosted configuration expected:** NO. **Owner action required:** NO after scope freeze. **Acceptance criteria:** the five student questions in §8 are answerable; members always see pinned context; responsive/a11y behavior; no client-supplied version IDs. **Tests/verification:** pin-aware API tests, component tests, UI read/error/empty states, mobile keyboard/screen-reader review, build. **Phase 7 gates:** strict resolver, retained pins, progress compatibility, Sentry source maps, performance. **Rollback/risk:** HIGH-RISK if anyone tries to simplify version assignment; UI-only rollback otherwise.

### Slice 3 — Conditional Google OAuth (only if owner says YES)

**Goal:** admit invited Google users through the same profile/onboarding path. **Why now:** only if defined as v1. **Scope:** Google client, hosted Supabase provider, exact callback and app redirects, feature flag, invite eligibility rule, verified-email automatic-link tests, analytics account semantics. **Explicit non-scope:** public signup, custom account-merging system, manual linking, other providers. **Dependencies:** owner approval, domain decision or explicit Vercel-host acceptance. **Repository areas likely affected:** Auth provider/login/callback/tests/docs. **Database migration expected:** NO/UNKNOWN only if a proven account rule requires data. **Hosted configuration expected:** YES. **Owner action required:** YES. **Acceptance criteria:** invited Google identity works; uninvited/public enrollment remains blocked by an explicit tested rule; same verified email does not duplicate profile; mismatched emails are not silently merged; recovery/password path remains safe. **Tests/verification:** Preview then hosted Auth matrix, redirect/recovery/API auth/onboarding/Sentry sanitization. **Phase 7 gates:** full auth boundary. **Rollback/risk:** disable flag/provider; preserve email/password access.

### Slice 4 — Conditional Information Technology (only if owner says YES)

**Goal:** add a fully valid tenth subject. **Why now:** only if beta cohort value exceeds opportunity cost. **Scope:** official source evidence → curated source data → semantic validation → manifest → immutable `r001` → outcomes/components → applicability/series policy → resolver/frontend/tests/hosted validation. **Explicit non-scope:** subjects-row-only insert, auto-repin, Feb/Mar by assumption, migration 0016. **Dependencies:** verified Cambridge source and session policy. **Repository areas likely affected:** data, manifest/tooling evidence, reference docs, tests/catalogue. **Database migration expected:** NO unless separately proven. **Hosted configuration expected:** NO; hosted reference-data apply expected: YES, separately authorized. **Owner action required:** YES. **Acceptance criteria:** entire pipeline passes and strict assignment has exactly one valid match. **Tests/verification:** semantic audit, validator, importer dry-run, resolver/harness, UI and hosted aggregates. **Phase 7 gates:** all syllabus/data/pin/progress controls. **Rollback/risk:** do not delete published graphs casually; stop before hosted apply if any ambiguity.

### Slice 5 — RC QA and integrity revalidation

**Goal:** prove the frozen candidate is beta-ready. **Why now:** after approved implementation, before freeze. **Scope:** critical journeys, successful recovery, mobile/desktop/cross-browser, accessibility, errors/loading/empty states, Lighthouse/CWV/bundle review, Linux serialized CI, Production-equivalent build, hosted smoke, owner runbooks. **Explicit non-scope:** PWA, broad optimization, feature ideas. **Dependencies:** required slices deployed. **Repository areas likely affected:** none unless defects are separately fixed. **Database migration expected:** NO. **Hosted configuration expected:** verification only. **Owner action required:** YES for hosted flows. **Acceptance criteria:** no P0/P1; P2 explicitly dispositioned; core journeys pass; no severe a11y/mobile/performance defect; all technical checks green; monitoring and support watched. **Tests/verification:** matrix in Beta Entry Criteria. **Phase 7 gates:** all affected controls once, not restore repetition. **Rollback/risk:** rollback offending slice; do not weaken invariants to make QA pass.

## Parallel Workstreams

- **Product/UI:** privacy correction and subject context can run in parallel after scope freeze.
- **Operations/support:** mailbox/Form setup, coordinator, triage and deletion ownership can run in parallel with code.
- **Compliance:** DPC/age/guardian work continues independently; it blocks invitations only.
- **Conditional auth:** Google OAuth must stay isolated from subject/support work and off the critical path unless approved.
- **Conditional reference data:** IT can run independently but joins before RC QA if approved.
- **Performance:** measurement can start early; final gate waits for the candidate build.

## Phase 7 Revalidation Map

| Change | Revalidate |
| --- | --- |
| Auth/OAuth | Supabase provider/signup posture, invite boundary, API JWT, profile trigger, onboarding convergence, recovery, exact redirects, PostHog identity/event semantics, Sentry sanitization |
| Onboarding/profile | atomic RPC, username constraint/conflict, 1–5 memberships, global/override session payload, strict zero/ambiguous fail, `onboarding_completed` |
| Subject/syllabus UI | membership-pinned reads, non-member DEFAULT context only, components from pinned version, retained pins, progress compatibility, no client version authority |
| New subject | source provenance, semantic audit, immutable import, applicability/series policy, strict resolver, frontend catalogue, harness/hosted aggregates |
| Support/email/form | privacy disclosure, processor inventory, sender security, mailbox ownership, deletion workflow, retention |
| Domain | Vercel, Supabase Site URL/redirects, recovery, OAuth, canonical/OG, PostHog/Sentry environment/release, email SPF/DKIM/DMARC |
| Major frontend | serialized tests, a11y/responsive/cross-browser, route chunks/bundle, private Sentry source maps and symbolication |

Cadence: targeted checks after each slice; the full RC gate once before beta; targeted + full regression after beta fixes; final build/smoke/config review before public launch. Restore proof is repeated only after a material recovery/schema/platform change or evidence expiry—not after ordinary UI/copy work.

## Feature Freeze Definition

Freeze begins when the RC gate passes and the owner records the candidate SHA/config baseline. After freeze, changes require triage and are limited to P0/P1 blockers, security/privacy/data-integrity defects, critical accessibility/usability corrections, and release-environment fixes. P2 changes require explicit owner acceptance that risk is lower than churn. P3, new features, new subjects, new telemetry, redesigns, PWA, OAuth (if not already in the candidate), and growth work are deferred. Every allowed change receives targeted verification plus the relevant regression gate and resets the candidate SHA.

## Beta Entry Criteria

### Product

- Required scope is complete; privacy facts are correct.
- Invited-user sign-in → onboarding → subjects/syllabus/progress → task → paper log → dashboard → sign-out passes.
- Pinned syllabus/session/components/outcomes are understandable.
- Recovery completes successfully; public signup remains off.
- No open P0/P1; P2s are fixed or explicitly accepted with workaround.

### Technical

- Clean candidate SHA; migration head still expected and no unexplained drift.
- Typecheck, API, serialized frontend, syllabus, harness, migration and codegen checks pass on authoritative Linux CI.
- Production-equivalent build passes; private source maps upload when configured.
- Mobile/desktop/cross-browser/a11y and smallest meaningful Lighthouse/CWV/bundle review have no severe defect.
- Hosted health, DB, reference, Auth and protected-route smoke pass; PostHog/Sentry remain privacy-constrained.

### Operational

- Coordinator, support, triage and deletion owners are named.
- Monitored channel and response/triage cadence are tested; feedback prompts/materials finalized.
- Invitation list/schedule respects Auth email capacity; monitoring is checked daily or alerts are proven.
- Known issues, rollback contact and incident path are recorded.

### Compliance / Owner

- Owner approves frozen scope and candidate.
- Actual participant jurisdiction/age/minor/guardian process is resolved in line with received guidance; no approval is inferred here.
- Any selected external Form/mailbox/processor use is reviewed and accurately disclosed.
- **No real invitation before all owner/compliance gates are recorded as satisfied.**

## Beta Exit Criteria

- The planned 8–12 active-participant, approximately 10–14-day run is completed or an owner-approved documented variation is used.
- Findings are deduplicated, severity-triaged and assigned; blockers and critical UX defects are fixed or explicitly deferred with rationale.
- Support/deletion requests are resolved; no unacceptable telemetry/security/privacy incident remains.
- Participant data/channel cleanup and retention actions are performed as applicable.
- The final beta-fix candidate passes targeted and full regression plus hosted smoke.
- Outcome, limitations and recommended public-release decision are documented. Beta completion is not automatic public launch.

## Phase 7 Final Closeout Criteria

Beta exit criteria pass; Phase 7 controls have no unacceptable regression; known issues and residual risks are documented; Production config/monitoring/support are reviewed; owner/team sign-off is recorded; and a final Phase 7 closeout report explicitly marks the phase closed. Until then Phase 7 remains in progress.

## Public Release Gate

Keep the post-closeout gap small: select the final RC SHA; decide/customize domain and canonical URL if applicable; finalize Production Auth/signup and sender configuration; recheck redirects/recovery/OAuth; confirm support and monitoring coverage; run final build and hosted smoke; record team sign-off; release. This is a bounded release operation, not a new product-development phase.

## Risks / Scope-Creep Warnings

1. Do not turn the subject-context gap into a new assignment model or automatic repin.
2. Do not enable OAuth while assuming public signup remains controlled; define and test invitation eligibility.
3. Do not add Information Technology as a lone `subjects` row.
4. Do not expand analytics, replay, autocapture or heatmaps without a necessary beta question and privacy review.
5. Do not confuse local Supabase config with hosted truth.
6. Do not treat the Windows hang as proof the product suite fails when serialized Linux CI passes; do not ignore it as DX debt either.
7. Do not make domain, PWA, community, AI, broad SEO or email-reminder work a pre-beta condition without new evidence.
8. Do not claim DPC approval, beta start, Phase 7 closure or public readiness prematurely.

## Recommended Immediate Next Action

**OWNER REVIEW AND FREEZE OF THIS PRE-BETA SCOPE.** Record the candidate decisions and named operational owners before any implementation prompt or product change is started.

---

## Owner Scope Decision Addendum

**Decision date:** 2026-09-03

**Authority:** Lockdin owner

**Effect:** This addendum amends the forward-looking scope classifications and recommendations in this report. It does not rewrite the evidence, implementation state, or conclusions that existed when the original reconciliation was performed. Where an original classification conflicts with this addendum, this addendum is authoritative.

### Phase and Release Position

- Phase 6: **CLOSED**.
- Phase 7: **IN PROGRESS**.
- Controlled beta: **NOT STARTED**.
- Public release: **NOT STARTED**.
- Current stage: **PRE-BETA PRODUCT COMPLETION WITHIN THE REMAINING PHASE 7 JOURNEY**.

The controlled beta remains a release-candidate beta. Participants should exercise something close to the intended Lockdin v1 product, so major v1 account and product journeys should not normally be introduced only after beta.

### Onboarding Architecture Freeze

Do not broadly redesign the five-step onboarding architecture. Preserve the full-name flow, unique username, subject selection, exam-session configuration, per-subject session overrides, final review, and atomic profile/membership onboarding architecture.

Pre-beta changes may improve UX, copy, accessibility, responsive/mobile behavior, validation, and QA-discovered usability defects. This freeze does not resolve the two open product-model questions below.

### Unresolved Product Decision 1 — Global AS/A Level Model

**Classification:** UNRESOLVED OWNER PRODUCT DECISION. It must be resolved before the account/onboarding implementation slice is frozen.

The present profile-level value does not control strict syllabus assignment, but that technical harmlessness does not settle whether the question is correct or understandable product UX. The decision review must evaluate:

- **Option A:** retain profile-level AS/A Level solely as general student/profile information;
- **Option B:** remove the global level question from onboarding;
- **Option C:** move meaningful level/study-route configuration to individual subjects.

This addendum selects no new schema or data model. Any later decision must preserve strict session-aware assignment, membership pins, immutable syllabus versions, and each membership's intended exam session.

### Unresolved Product Decision 2 — Persistent Per-Subject Paper/Component Study Route

**Classification:** UNRESOLVED OWNER PRODUCT DECISION, with a strong possibility of becoming PRE-BETA REQUIRED. It must be resolved before subject/account implementation architecture is frozen.

Selecting a component while logging a past-paper attempt does not satisfy the broader historical concept of a student persistently configuring the papers/components studied under each subject. A decision brief must establish:

- what the existing assessment-component model supports;
- whether persistent user/component selection is required;
- whether selections should shape subject-context UI;
- whether existing `learning_outcome_components` can map relevant outcomes;
- whether a schema change is required;
- whether the feature can avoid client authority over syllabus-version selection; and
- how it remains compatible with later syllabus revisions.

No final database design is approved by this addendum.

### Frozen Subject Candidate Set

The pre-beta candidate expansion list is frozen at seven subjects:

1. Information Technology
2. Accounting
3. Psychology
4. Geography
5. Sociology
6. English General Paper
7. English Language

The supported catalogue remains nine subjects; adopting every candidate would produce a maximum catalogue of sixteen. No additional subject enters this batch unless the owner explicitly reopens scope.

### Deferred Subjects

- **English Literature — DEFERRED.** Prescribed texts and option sets may require an additional syllabus → component → prescribed-text/option → student/school selection → relevant-content model. Do not force it into a uniform-subject model during this beta cycle.
- **French — DEFERRED.** Language-specific qualification/content modelling is postponed until the general subject-adoption process is proven.

These subjects are not permanently rejected.

### Subject Adoption Workstream

The seven frozen candidates form a formal **PRE-BETA SUBJECT-ADOPTION WORKSTREAM**, but are not automatically PRE-BETA REQUIRED or approved for import. First perform a no-import adoption audit for each candidate covering:

- exact Cambridge qualification name and syllabus code;
- AS and A Level availability;
- current syllabus family and validity years;
- assessment components, syllabus hierarchy, and learning-outcome structure;
- optional pathways, special cases, and exam-series applicability;
- complexity and risk;
- compatibility with the immutable graph model and current CSV schema;
- any importer/tooling extension required; and
- whether strict assignment works unchanged.

Each candidate must then be classified as **READY FOR ADOPTION**, **READY WITH MINOR PIPELINE EXTENSION**, **REQUIRES ARCHITECTURE DECISION**, or **DEFER FROM V1**.

An approved subject must traverse the complete reference-data pipeline: official Cambridge evidence → curated source data → semantic audit → validation → manifest metadata → immutable `r001` → units/topics → learning outcomes → assessment components → outcome/component mappings → applicability window → exam-series policy → strict resolver verification → frontend catalogue verification → tests → controlled hosted apply → Production validation.

Forbidden shortcuts include a subjects-row-only addition, automatic or `DEFAULT`-driven repinning, guessed applicability, guessed February/March support, a fake `r002`, or manual Production edits outside reviewed tooling.

### Revised Authoritative Pre-Beta Scope

#### A. PRE-BETA REQUIRED

- Correct all participant-facing privacy facts, including the PostHog and Sentry statements, through a complete copy reconciliation.
- Establish operational support, privacy/deletion, issue-triage, beta-coordination, and monitoring-review ownership.
- Provide a lightweight in-app **Help & Support** experience with actions to ask for help, report a bug, and give feedback.
- Complete the subject-context experience so pinned syllabus identity, intended session, applicable components, topics, outcomes, and progress are understandable, subject to the unresolved persistent-study-route decision.
- Implement and validate Google OAuth as the single v1 OAuth provider while preserving invitation-only eligibility and identity safety.
- Prove password recovery end to end: request → valid link → new password → authentication → protected route → appropriate controlled-state cleanup/restore.
- Pass responsive, mobile, cross-device, accessibility, loading/error/empty-state, Lighthouse/Core Web Vitals, and bundle/route quality gates; correct severe regressions without score chasing.
- Revalidate Phase 7 integrity after affected slices.
- Run Release Candidate functional and non-functional QA.
- Enter feature freeze only after the RC gate passes and the candidate baseline is recorded.

#### B. SUBJECT ADOPTION WORKSTREAM

- Audit the seven frozen candidates without importing them.
- Classify each candidate using the four adoption outcomes above.
- Adopt only candidates subsequently approved through the complete safety pipeline.

#### C. UNRESOLVED PRODUCT DECISIONS

1. Global AS/A Level model.
2. Persistent per-subject paper/component study route.

Both must be resolved before account/subject implementation architecture is frozen.

#### D. CONDITIONAL PRE-BETA

- **Custom SMTP:** first prove whether current Supabase Auth email delivery is suitable for the small controlled cohort. Promote custom SMTP to PRE-BETA REQUIRED only if invitation or recovery delivery is materially unsuitable; otherwise defer sender/domain work to public release.
- **Automatic Sentry alerts:** optional if named ownership and a reliable documented daily Sentry review are in place.
- **Custom domain:** not a controlled-beta requirement, but surface it early if Google OAuth, email, or another approved integration proves to have a technical domain dependency.
- **Additional beta analytics events:** add only if the product-question review demonstrates a necessary gap that direct feedback and the existing allow-list cannot answer with less privacy impact.

#### E. DEFERRED

- Product reminder emails unless the owner later explicitly includes them in v1.
- Native support-ticket backend, admin ticket dashboard, and enterprise support tooling.
- PWA/installability: service worker, install prompt, standalone experience, and PWA-specific caching.
- English Literature and French for this beta-cycle adoption batch.
- Custom sender/domain email when existing Supabase Auth delivery is suitable for the controlled cohort.

#### F. POST-LAUNCH / FUTURE

- Community/social features; retain the unique-username foundation.
- AI study assistant, including any later/pro capability.
- Google Calendar integration.
- IGCSE and broader education expansion.
- Custom Lockdin domain as a primary public-release gate, unless an earlier technical dependency is proven.

### Google OAuth Decision

Google OAuth is **PRE-BETA REQUIRED** as part of the intended v1 account experience. Keep scope to Google only. Public signup remains off during controlled beta, and invitation eligibility must remain enforced.

Google and email/password authentication must converge on the same profile/onboarding model. The same verified email must not accidentally create duplicate Lockdin identities; mismatched identities must not be silently merged. Do not build a generic manual account-merging system unless evidence proves it necessary.

Before acceptance, revalidate Supabase Auth, callback/redirect behavior, the invitation boundary, the profile trigger, onboarding, API JWT/auth, recovery, PostHog identity/event semantics, and Sentry sanitization. This decision does not enable OAuth or change hosted configuration.

### Help, Support, and Contact Truthfulness

Help & Support is **PRE-BETA REQUIRED**. A temporary beta implementation may route the in-app structured actions to a Google Form and a monitored temporary Lockdin/team mailbox; WhatsApp or direct messages may supplement qualitative feedback.

A real monitored contact is **PRE-BETA REQUIRED**. Verify that `privacy@lockdin.app` can receive mail and is monitored. If not, use an approved monitored temporary mailbox and update participant-facing copy so it is truthful. Before invitations, name the support owner, privacy/deletion owner, issue-triage owner, beta coordinator, and monitoring-review owner.

### Privacy and Analytics Corrections

Participant-facing privacy copy must state the implemented PostHog arrangement accurately: one PostHog Cloud EU project with mandatory environment separation, not separate Preview and Production projects.

Sentry hosted delivery/symbolication and Production configuration/build evidence exist; copy must not claim hosted Sentry is unproven. Retain the evidence boundaries: no Session Replay, privacy sanitization, and no deliberate Production error injection where that remains true. This is factual reconciliation, not a legal conclusion.

PostHog remains authoritative. Google Analytics is **SUPERSEDED / REMOVE**. Keep the baseline allow-list unless the product-question review establishes a strong gap:

- `account_created`
- `onboarding_completed`
- `task_created`
- `past_paper_attempt_created`

Every proposed event must identify its product question, why the small beta needs telemetry, why direct feedback and existing events are insufficient, the minimum properties, and the privacy impact. Do not enable autocapture, Session Replay, heatmaps, arbitrary page tracking, or free-text analytics properties by default.

### Email, Recovery, Quality, and Monitoring

Keep Supabase transactional Auth email, invitations, recovery, confirmation, product reminders, support email, and future domain email as distinct concerns. Product reminders are deferred. Assess current Supabase delivery before deciding custom SMTP.

Password-recovery completion proof and the mobile/responsive/accessibility/performance quality gate are PRE-BETA REQUIRED. Preserve existing lazy loading and code splitting and measure them. PWA work remains deferred.

Sentry is already implemented and must not be recreated. Operational monitoring is PRE-BETA REQUIRED through a named triage owner and documented daily Sentry review; automatic alerting remains optional/conditional.

### Compliance and Invitation Boundary

Ghana Data Protection Commission engagement continues separately. This report claims neither DPC approval nor a final legal conclusion. Development may proceed after the planning decisions are resolved, but real participant invitations remain on hold.

Do not invite participants until the participant age/jurisdiction process, applicable guardian process, required compliance/owner gates, beta operations, and RC gate are all recorded as satisfied.

### Immediate Next Action

Prepare one owner decision brief that resolves the **global AS/A Level model** and the **persistent per-subject paper/component study route**, using current product and data-model evidence, before any account, subject, OAuth, support, or catalogue implementation slice begins.

---

# Owner Product Model Decision Brief — Global Level + Per-Subject Study Route

**Prepared:** 2026-09-03 17:03 Atlantic/Reykjavik (UTC)

**Mode:** analysis and documentation only. No application, test, schema, migration, reference-data, hosted-service, or configuration change is authorized by this brief.

## Executive Recommendation

Adopt one coherent subject-owned study model:

1. **Remove the global AS/A Level question from onboarding.** Do not replace it with Year 12/Year 13. Retain `profiles.level` temporarily as nullable legacy profile data for compatibility, stop treating it as a required or actively editable v1 field, and give it no product authority.
2. **Persist one canonical, syllabus-version-scoped assessment route per subject membership.** Shared reference data defines valid route choices and their components. Lockdin automatically chooses the route when only one valid choice remains after the student's subject/session/qualification context is known, and asks a student to choose among plain-language valid routes when more than one remains. Students do not construct routes by ticking arbitrary papers.

This pair places qualification meaning where it varies—in each subject membership—while preserving server-controlled syllabus assignment. It is the smallest model that is correct for Mathematics 9709, Further Mathematics 9231, the staged science routes, mixed-subject students, and later syllabus revisions.

**Overall migration conclusion:** the existing schema cannot store canonical valid combinations or a membership's persistent route. **A FUTURE 0016 MAY BE JUSTIFIED**, but this brief does not create it or settle final table design.

## Evidence Boundary

Evidence inspected:

- this complete Report 120, including the 2026-09-03 Owner Scope Decision Addendum;
- checkpoint `docs/checkpoints/2026-09-01_2245/`, especially Current State, Architecture, and Data Pipeline;
- current Drizzle schemas and migration head `0015_silent_sentinel`;
- onboarding, Auth profile hydration, Settings, dashboard fallback, membership replacement, subject/syllabus reads, topic progress, and past-paper code;
- OpenAPI and generated-contract dependencies;
- focused profile, onboarding, membership-pin, progress, and past-paper tests;
- all nine validated 12-column syllabus CSVs and their normalization/import model;
- repository-recorded official Cambridge sources, including Mathematics 9709 document 697427, Further Mathematics 9231 document 697357, Biology 9700 document 664560, and Physics 9702 document 664565.

No frozen candidate subject was researched or imported. No hosted database was queried or changed.

## Concept Definitions

| Concept | Product meaning | Why it is distinct |
| --- | --- | --- |
| School year | A school/cohort label such as Year 12 or Year 13 | It describes local educational timing, not a Cambridge award or paper combination. A Year 12 learner may be preparing for AS, a staged A Level, or no sitting; a Year 13 learner may be resitting AS or taking a full A Level. |
| Qualification level | The award context, principally AS Level or A Level | It determines award meaning and often weights/availability, but not necessarily one component combination. |
| Syllabus version | The immutable curriculum/reference revision pinned by a membership | It establishes which canonical content and component definitions exist. It is selected by the strict server/database resolver, not by level or route input from the client. |
| Intended exam session | A membership's target year plus series | It already controls strict version assignment for a new membership and may differ by subject. It says when, not which papers. |
| Assessment component | One paper/component within the pinned version | It is an individual examinable unit, not proof of a valid qualification combination. |
| Assessment/study route | A Cambridge-valid pathway or component combination for a subject/version, including staged/current-sitting meaning where necessary | It expresses the student's actual qualification pathway and constrains component choices. |
| Past-paper attempt component | The component attached to one historical practice attempt | It records what was attempted on that occasion. It neither selects nor changes the student's persistent route. |

Therefore Year 12 is not AS Level, Year 13 is not A Level, A Level is not one universal component set, and an attempt component is not a membership configuration.

## Decision A Evidence — Current Global Level

### Actual Usage Trace

| Layer/path | Current behavior | Required/nullable | Product effect if changed |
| --- | --- | --- | --- |
| `lib/db/src/schema/profiles.ts` | `profiles.level` is a text column | Nullable | Existing rows and Auth-created pre-onboarding profiles already tolerate null. |
| `lib/db/migrations/0015_silent_sentinel.sql` | `lockdin_complete_onboarding_apply` trims `p_level`, rejects null/blank or over 80 characters, and writes it to the profile | Required by current RPC | The RPC contract must be revised; passing a fabricated constant would preserve misleading data and is rejected. |
| `lib/api-spec/openapi.yaml` | Profile responses include nullable `level`; profile update accepts optional `level`; onboarding input requires `level` | Mixed | OpenAPI, generated clients/Zod, API validation, and callers require coordinated contract change. |
| `artifacts/api-server/src/routes/profile.ts` | Reads/maps the field, accepts profile edits, requires it for onboarding, forwards `p_level` | Required during onboarding; optional update | No route outside profile handling consumes it for domain behavior. |
| `artifacts/revision-platform/src/lib/exam-sessions.ts` | Options are `AS Level (Year 12)` and `A2 Level (Year 13)` | Fixed UI options | The labels explicitly conflate school year and qualification stage and use A2 where the product decision is A Level. |
| `artifacts/revision-platform/src/pages/onboarding.tsx` | Step 4 blocks until a level is chosen; Step 5 displays it | Required UI | Removing the question simplifies onboarding but requires the API/RPC contract change above. |
| `artifacts/revision-platform/src/pages/settings.tsx` | Displays and edits profile level | Optional after onboarding | This is profile metadata only; changing it does not change memberships or components. |
| `artifacts/revision-platform/src/components/auth-provider.tsx` | Hydrates `user.level` from the profile and forwards it during onboarding | Nullable read, required write type | Compatibility surface only. |
| `artifacts/revision-platform/src/pages/dashboard.tsx` | Appends profile level to the profile exam-session fallback when there is no computed next exam | Optional display fallback | This is the only non-Settings/onboarding runtime display found; it makes no calculation or authorization decision. The unrelated gamification `level` is a different concept. |
| Relevant tests | Profile integration, Auth provider, onboarding/session, Settings, and dashboard fixtures carry/assert level values | Test dependency | Tests would need contract/UX updates, but no domain result depends on the value. |
| Analytics | No level property is sent in the four-event allow-list | Not used | No analytics loss. |

### Authority Classification

`profiles.level` is a **mixture of required legacy transport and display/profile metadata**, not authoritative study data.

Actual code confirms that it does **not** affect:

- syllabus-version assignment;
- assessment-component lookup or filtering;
- learning-outcome lookup or filtering;
- topic progress or dashboard progress calculations;
- tasks;
- past-paper validation, logging, or summaries;
- notification behavior;
- analytics events; or
- any authorization decision.

New syllabus assignment uses each membership's intended year/series and the strict resolver. Component writes check the caller's pinned version. Whole-syllabus progress counts pinned-version topics. The global level participates in none of those paths.

### Does Global Level Add Product Value?

If Lockdin knows a membership's pinned syllabus, intended session, canonical study route, and selected/derived route components, the current global AS/A Level value makes **no additional product decision**.

It cannot safely infer a subject route, because one student may have different qualification contexts by subject and one qualification level may permit multiple routes. It is not reliable school-year data because the current options merely assume Year 12/AS and Year 13/A2. Optional demographic or cohort analytics do not justify retaining a required, potentially contradictory onboarding question, especially when the approved analytics allow-list does not collect it.

### Global-Level Option Scorecard

Scores describe fitness for the criterion; for complexity/impact/debt, STRONG means lower burden or debt.

| Option | Student clarity | Correctness | Mixed-subject flexibility | Implementation complexity | Migration impact | API impact | Future catalogue | Technical debt | Beta suitability |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. Keep required global level | WEAK | MIXED | WEAK | STRONG | STRONG | STRONG | MIXED | WEAK | MIXED |
| B. Remove from onboarding; subject routes own meaning | STRONG | STRONG | STRONG | GOOD | GOOD | GOOD | STRONG | GOOD | STRONG |
| C. Keep as optional profile context | MIXED | GOOD | GOOD | GOOD | STRONG | GOOD | GOOD | MIXED | MIXED |
| D. Replace with school year | WEAK | WEAK | MIXED | GOOD | MIXED | MIXED | MIXED | WEAK | WEAK |

### Decision A Recommendation

Choose **Option B**.

- Remove the global question from first-time onboarding and from the final review.
- Do not use Year 12/Year 13 as a substitute.
- Keep `profiles.level` nullable as legacy data during the compatibility period; do not erase existing values merely to make the model look clean.
- Stop giving the field onboarding, assignment, route, filtering, progress, or analytics authority.
- Prefer removing its Settings editor and dashboard fallback so stale legacy data is not presented as current study truth.
- Preserve nullable profile response compatibility initially if useful; deprecate and remove the field only in a later deliberate contract/data cleanup.

**Migration impact:** no column drop or existing-row rewrite is required. A database contract change is nevertheless **LIKELY** because the current onboarding RPC requires `p_level`. That change can be reviewed with the future route migration; the implementation must not hide the problem by sending a dummy value.

## Year 12 / Year 13 Decision

Lockdin does not currently need school year as authoritative product data. Subject route plus intended exam session answers the study-planning questions required for v1 more accurately.

School year could later be optional profile context for cohort support or explicitly justified analytics, but no current behavior requires it and the existing analytics policy excludes it. Adding it now would expand scope without resolving route meaning.

## Decision B Evidence — Current Component and User Model

### Shared Component Model

`assessment_components` currently provides:

- surrogate identity: integer `id`;
- natural key: unique `(syllabus_version_id, paper_code, level)`;
- version relationship: required foreign key to `syllabus_versions`, cascade on version-graph deletion;
- subject relationship: indirect and authoritative through the version's `subject_id`;
- required `level`, `paper_code`, and `component_name`;
- nullable duration, total marks, and weighting;
- required order index and creation timestamp.

The natural key is correctly level-aware because a base paper code can appear in both AS and A Level contexts with different weightings. For example, Mathematics Paper 1 is represented separately at AS and A Level.

`learning_outcome_components` currently provides:

- a many-to-many occurrence from one normalized learning outcome to a component;
- required occurrence `level`;
- nullable `component_id` for syllabus-wide content such as Biology mathematical requirements; and
- uniqueness over `(learning_outcome_id, component_id, level)`, with importer rebuild semantics handling nullable-key deduplication.

This is enough to identify which outcomes occur against which components or level contexts. It is not enough to identify which component combinations constitute valid routes.

Across the validated data, component mapping is materially many-to-many: Mathematics has outcomes appearing in AS Paper 2 and A Level Paper 3; Biology contains component-null syllabus-wide occurrences; several subjects repeat outcomes across multiple components. Route relevance can therefore be derived from route components plus `learning_outcome_components`, provided component-null syllabus-wide outcomes are always retained.

### Current User-Owned Model

`user_subjects` stores only:

- authenticated user identity;
- subject;
- pinned syllabus version;
- intended exam year/series; and
- timestamps.

Repository-wide inspection found no persistent user route, selected-component set, membership qualification level, route stage, or component-set history. The composite subject/version foreign key correctly prevents cross-subject pins, but it does not model assessment choice.

### Current Past-Paper Selection

The component picker appears only inside the **Log paper** form after a current membership subject is chosen. The frontend loads every component from that membership's pinned version, labels each with paper code/name/level, and clears stale component state when the subject changes.

On submission, the API derives the caller from Auth, confirms subject existence, confirms the component belongs to that subject, and calls `assertComponentOnCallerPin` to reject an off-version component. The chosen component is persisted only on that `past_paper_attempts` row. It does not:

- persist as a future subject preference;
- narrow later component choices;
- alter Subject Detail;
- alter learning-outcome visibility;
- alter whole-syllabus progress; or
- alter later paper logs.

Historical attempts remain caller-owned facts. `component_id` is nullable and uses `ON DELETE SET NULL`; reads explicitly tolerate a removed reference, although published-version immutability should normally keep it present.

Therefore Report 120's original statement that paper/component selection was already implemented described attempt logging correctly but **did not satisfy** the clarified requirement for persistent per-subject study-route configuration.

## Cambridge Route Evidence

### Fixed Component Sets and Staged Routes

Official Biology 9700 document 664560 and Physics 9702 document 664565 each define:

- AS-only: Papers 1, 2, and 3 in one series;
- staged A Level: Papers 1, 2, and 3 in the AS stage, then Papers 4 and 5 to complete A Level; and
- full A Level in one series: Papers 1–5.

Within a stated award/stage, the paper set is fixed. But `A Level` alone still does not say whether the learner is continuing from carried-forward AS or preparing for all five papers in one series. The current science CSVs preserve component/level mappings, not that staged route state.

### Alternative Valid Combinations

Official Further Mathematics 9231 document 697357 defines two AS combinations—Papers 1+3 or Papers 1+4—while A Level includes all four papers. This proves that even an AS/A qualification label can map to more than one valid component set.

### Mathematics 9709 Architecture Test

Official Mathematics 9709 document 697427 defines multiple valid combinations:

- AS only: Papers 1+5, Papers 1+4, or Papers 1+2; the Papers 1+2 option cannot be carried forward to A Level;
- staged A Level: valid Year 1/Year 2 pairings include 1+4 then 3+5, 1+5 then 3+6, and 1+5 then 3+4;
- full A Level in one series: 1+3+4+5 or 1+3+5+6.

Consequences:

- a global `A Level` value cannot determine the student's papers;
- arbitrary checkboxes would permit invalid combinations such as Papers 2+6 or an incomplete A Level set;
- a component set alone can lose route-stage meaning: the same eventual full set may be reached through a staged path or taken together;
- route reference data needs qualification target and, where Cambridge distinguishes it, staged/current-sitting semantics—not just an unordered bag of component IDs.

### Component-Specific and Syllabus-Wide Content

Mathematics and Further Mathematics map named content sections strongly to particular papers. The sciences distinguish AS and A Level topic ranges and practical/theory papers. Biology additionally has syllabus-wide mathematical-requirement outcomes with no paper code. A route-aware UI must therefore combine selected component mappings with always-relevant syllabus-wide occurrences; it cannot assume every outcome belongs exclusively to one paper.

## Qualification Level and Route Cardinality

- **Can a route determine qualification level?** Yes, if canonical route definitions include one explicit award target. That is recommended.
- **Can qualification level determine route?** Not generally. It can only do so after the reference data proves exactly one valid route remains for the particular subject/version/context.
- **One-to-one:** a subject/version may have exactly one valid component route for a given award and stage; the application may then infer it.
- **One-to-many:** one qualification level can permit multiple routes, as 9709 AS and A Level demonstrate.
- **Many-to-one:** several distinct route variants may target the same qualification level; staged and same-series A Level routes are examples.

A route should not ambiguously represent multiple qualification levels. The same base paper code may participate in multiple level-specific reference rows and many routes, so neither paper code nor level is a route identity.

## Study-Route Option Scorecard

| Option | Cambridge correctness | Prevent invalid combinations | Student clarity | Implementation complexity | Pipeline complexity | Current nine | Future subjects | Revision compatibility | Progress compatibility | Beta value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1. No persistent route | WEAK | WEAK | MIXED | STRONG | STRONG | MIXED | WEAK | MIXED | STRONG | WEAK |
| 2. Persist arbitrary components | WEAK | WEAK | MIXED | GOOD | GOOD | GOOD | WEAK | MIXED | MIXED | MIXED |
| 3. Reference-defined routes | STRONG | STRONG | GOOD | MIXED | MIXED | GOOD | STRONG | STRONG | GOOD | STRONG |
| 4. Hybrid arbitrary selection within constraints | GOOD | GOOD | MIXED | WEAK | WEAK | GOOD | GOOD | GOOD | MIXED | MIXED |
| 5. Reference routes, derive when fixed and ask when ambiguous | STRONG | STRONG | STRONG | MIXED | MIXED | STRONG | STRONG | STRONG | GOOD | STRONG |

Option 4 is not materially different from Option 3 if the constraint resolves to choosing a canonical route. If it permits free component combinations beyond named canonical routes, it adds validation states without improving correctness. The useful UX behavior in Option 5 should therefore be combined with Option 3, not stored as a separate hybrid model.

## Decision B Recommendation

Choose **reference-defined assessment routes with derive-where-fixed/ask-where-ambiguous UX** (Options 3+5).

Conceptually:

```text
syllabus version
  → canonical assessment routes
    → qualification target
    → route/stage meaning where required
    → ordered valid component participation

user subject membership
  → one route belonging to that exact pinned syllabus version
```

The final schema is not selected here. The data model must, however, enforce these semantics:

- route definitions are immutable reference data scoped to one syllabus version;
- route/component membership can reference only components from that same version;
- a user's selected route must belong to the membership's pinned version;
- the route selection does not choose or change `syllabus_version_id`;
- invalid combinations fail closed;
- qualification level is derived from the selected canonical route rather than duplicated as separately editable membership data;
- where staged routes matter, reference data can distinguish components relevant to the current sitting from carried-forward/prior components without deleting historical facts.

Do not let users build a route from arbitrary individual papers. Plain-language choices may expose the component combination beneath each valid route so students can recognize their school entry, but the stored choice is a validated canonical route.

### Database Impact

**Migration needed: YES for the combined recommended product model.**

The existing model has component definitions and outcome/component occurrences but lacks both:

1. canonical valid route combinations; and
2. a persistent membership-to-route selection.

Those facts cannot be represented safely in `profiles.level`, `user_subjects.intended_exam_*`, or `past_paper_attempts.component_id`. Encoding route IDs in free text or inferring combinations from weightings would be denormalized/unsafe. A future migration is justified for version-scoped shared route reference data, route/component relationships, and a constrained membership selection or equivalent reviewed structure.

The exact tables, nullability during rollout, backfill sequence, and constraint layout remain implementation-design work after owner approval. No separate route-selection history is recommended for v1 unless a later audit need appears; immutable past-paper attempts already preserve what was actually attempted, while the membership needs the current route.

**A FUTURE 0016 MAY BE JUSTIFIED. DO NOT CREATE IT IN THIS DECISION TASK.**

### Reference-Data Impact

**Extension needed: YES.**

The current 12-column CSV can define components and outcome/component occurrences. It cannot faithfully encode:

- valid component combinations;
- prohibited combinations;
- AS combinations that cannot carry forward;
- staged versus same-series routes;
- current-sitting versus carried-forward component roles; or
- stable route identity/labels.

Mathematics 9709 proves these combinations cannot be safely derived from paper level, weighting, order, or co-occurrence in rows. Official route tables must be separately curated and reviewed.

Prefer a **separate version-controlled route manifest** associated with each syllabus source/revision over adding route columns to every repeated learning-outcome CSV row. A separate manifest avoids massive duplication, makes combinations reviewable, and can be included in the canonical graph hash/publication contract. Importer, validator, semantic audit, canonical hash, database graph loader, and publication checks would need extension. All current nine subjects need an evidence-backed route backfill before membership route selection becomes required. Do not invent mappings from current CSVs.

The later seven-subject adoption audit should require route evidence as part of each candidate's complete pipeline. This architecture is generic enough for those candidates without researching them now. English Literature and French remain deferred and do not shape this v1 model.

## User Experience Comparison

| Model | Conceptual onboarding UX | Result |
| --- | --- | --- |
| No persistent route | Choose subjects → exam session → finish | Lowest effort, but Lockdin cannot say which papers/content the student studies. |
| Arbitrary component selection | Choose subjects → session → tick paper codes → finish | Exposes Cambridge jargon and permits invalid qualifications. |
| Canonical routes, always ask | Choose subjects → for each subject choose qualification/pathway → inspect valid papers → finish | Correct but asks unnecessary questions for fixed cases. |
| Recommended conditional canonical routes | Choose subjects → for each subject choose session and plain-language qualification/pathway context → auto-select sole valid route or ask among valid choices → review → create atomically | Correct, minimizes questions, and makes the papers visible before confirmation. |

### Recommended Onboarding Experience

Preserve the five-step architecture. Replace the current global level control inside Study Context with per-subject route configuration:

```text
Choose subjects
  ↓
For each subject:
  intended exam session
  ↓
  “What are you working toward?”
  AS Level / completing A Level from AS / full A Level together
  ↓
  if one valid route remains: show and confirm it
  if several remain: choose one plain-language route with paper names/codes
  ↓
Review each subject's session + route + papers
  ↓
Create profile, memberships, pins, route selections, and starter tasks atomically
```

Do not ask students to understand internal syllabus-version IDs, `r001`, route primary keys, or raw database levels. Use paper names with codes as recognition aids. Explain carry-forward only when the chosen subject/version exposes a staged choice.

### Owner-Facing Examples

1. **Biology 9700 — fixed after context.** A student chooses Biology, May/June 2027, and “AS Level this sitting.” Lockdin shows Papers 1, 2, and 3 and selects the sole valid AS route automatically. A student choosing “complete A Level from AS” sees Papers 4 and 5 as the current-sitting focus while the canonical route retains the carried-forward AS context.
2. **Mathematics 9709 — multiple valid routes.** A student chooses “AS Level only.” Lockdin asks which valid pathway matches their school: Pure 1 + Statistics 1, Pure 1 + Mechanics, or Pure 1 + Pure 2, and warns in explanatory copy that the Pure 1 + Pure 2 route is standalone rather than an A-Level carry-forward path. It never offers arbitrary paper checkboxes.
3. **Physics 9702 — level-specific content and components.** “AS Level this sitting” resolves to Papers 1–3 and AS topics. “Complete A Level from AS” focuses on Papers 4–5 and advanced topics while keeping earlier/syllabus-wide context accessible. The user's global school year is unnecessary.
4. **Further Mathematics 9231 — constrained AS choice.** AS students choose between the two official combinations, Papers 1+3 or Papers 1+4; A Level students receive the all-four-paper route. Qualification level alone would miss the AS branch.

### Settings and Route Changes

Settings should show each membership's pinned syllabus identity, intended session, qualification target, route, and components. Route changes use a dedicated authenticated boundary or the reviewed membership RPC—not a direct table update.

Conservative route-change behavior:

- never change the membership's syllabus pin;
- never delete topic progress, notes, tasks, exam dates, or past-paper attempts;
- validate the new route against the exact pinned version and fail closed;
- update only current/default content relevance, recommended components, and future picker defaults;
- retain historical attempts even when their components are outside the new route; and
- do not silently convert a staged route to a same-series route or vice versa.

The current membership replacement RPC preserves retained subject pins and sessions but has no route argument or route validation. Onboarding and replacement boundaries will need coordinated review. A dedicated route-change RPC is preferable after onboarding because it can lock the membership and validate one route without recreating the entire subject set. Exact function design is deferred.

## Learning Outcomes and Progress Semantics

Choose a combination of **B and C** from the considered display options:

- retain all pinned-syllabus outcomes;
- show route-relevant outcomes by default;
- mark route relevance rather than deleting or claiming unrelated content is invalid; and
- provide an “All syllabus content” view.

Component-null syllabus-wide outcomes remain relevant to every route. Outcomes mapped to any selected/current route component are route-relevant; outcomes mapped to multiple components are shown once with their relationships available.

Do **not** redefine the existing primary progress percentage for pre-beta. Current progress is one status per topic and its denominator is all topics in the pinned syllabus. It cannot accurately express completion of a subset of outcomes inside a mixed topic. Changing the denominator on a route change would make a student's percentage jump without study activity and would make historical comparisons misleading.

Recommended v1 behavior:

- preserve whole-pinned-syllabus topic progress as the authoritative continuity metric;
- use route relevance for filtering, emphasis, and recommendations;
- never delete existing topic progress when routes change; and
- consider a separately labelled route-focus indicator only after its denominator and mixed-topic semantics are explicitly designed. Such an indicator would require API work and may require finer-grained progress data; it is not implied by this decision.

## Past-Paper Behavior

For a membership with a route:

- default the component selector to current-route/current-sitting components;
- keep all historical attempts visible, including prior-route or carried-forward components;
- allow an explicit “different pinned-syllabus paper” path with a warning rather than destroying or falsifying a real practice attempt;
- never allow a component from another subject or syllabus version;
- do not let an off-route attempt silently alter the persistent route; and
- after a route change, use the new route for future defaults while keeping old attempts intact.

This distinguishes route configuration, which must be Cambridge-valid, from an attempt fact, which may legitimately record exploratory or historical practice outside the current route.

## API and Security Consequences

- The client continues to submit subject/session and a route choice, never `syllabus_version_id`.
- Server/database code first assigns or loads the pinned version, then validates the selected route belongs to that version.
- Route/component combinations fail closed when missing, cross-version, or invalid.
- Caller identity continues to come exclusively from verified Auth/`auth.uid()`.
- Initial route selection belongs in the atomic onboarding boundary so a membership is not created in an internally contradictory state once route selection is required.
- Subject replacement must validate routes for new memberships while preserving retained pins and existing valid route selections.
- Later route changes should use a narrow authenticated RPC/API boundary with membership locking and same-version validation.
- Direct browser writes to internal route reference structures should remain unavailable; RLS/grants and any security-definer function require the same narrow review used by current membership RPCs.

## Future Syllabus Revision Compatibility

Route definitions must be version-scoped. An existing r001 membership continues to reference an r001 route and r001 components even after a real r002 is published. DEFAULT changes never repin or remap it.

If a future explicit membership migration from r001 to r002 is authorized:

- preserve topic progress, tasks, dates, and historical attempts;
- validate or map the route only against reviewed reference correspondence;
- auto-map only when a unique, semantically equivalent route mapping is proven;
- require owner/user confirmation where route meaning or components changed; and
- fail safely rather than guessing when mapping is absent or ambiguous.

Past attempts continue to reference their original version-scoped components. A new route affects only current context and future defaults.

## High-Level Implementation Consequences

| Area | Consequence after owner approval |
| --- | --- |
| Frontend | Replace global level with per-subject, conditional route questions; show route/papers and relevance without exposing internal IDs. |
| API | Extend membership/onboarding responses and validated writes with canonical route context; add a narrow route-change operation. |
| Database | Add version-scoped route reference capability and persistent membership route selection; revise the onboarding RPC's required global-level contract. |
| Reference data | Add reviewed official route manifests, validation, canonical hashing/import/publication support, and backfill evidence for all nine subjects. |
| Onboarding | Preserve five steps and atomic creation; infer sole routes and ask only for genuine Cambridge choices. |
| Settings | Edit route per subject with explicit consequences; retain pin/session unless separately changed through existing rules. |
| Subject Detail | Show pinned version, session, route, current components, route-relevant outcomes by default, and all-content access. |
| Past Papers | Default to route components; warn/allow deliberate off-route pinned-version attempts; preserve history. |
| Progress | Keep whole-syllabus topic progress authoritative; use route relevance for focus, not silent denominator changes. |
| Testing | Cover route manifest semantics, 9709 invalid combinations, version scoping, atomic onboarding, retained pins/routes, route change preservation, component picker behavior, and existing security boundaries. |
| Phase 7 revalidation | Rerun migration integrity, importer/hash/immutability, strict assignment, membership retention, progress/task/attempt preservation, API codegen, frontend responsive/a11y, and RC gates. |

These are consequences, not implementation slices. Detailed sequencing begins only after owner acceptance.

## Principal Risks and Controls

| Risk | Control |
| --- | --- |
| Inventing route combinations from incomplete CSV evidence | Require official, reviewed route manifests; fail validation when route evidence is absent. |
| Route selection becoming indirect client authority over syllabus version | Resolve/preserve the pin first; validate route strictly inside that pinned version. |
| Onboarding overload | Ask plain-language context; infer a sole route; reveal paper codes as confirmation, not as the primary concept. |
| Progress percentages changing when route changes | Keep whole-syllabus progress semantics unchanged; separate route focus from mastery. |
| Historical attempts becoming invalid or hidden | Keep attempt rows and original component references; route changes affect future defaults only. |
| r002 cross-version references or guessed mappings | Scope routes to versions; require explicit, verified migration mapping and confirmation when ambiguous. |
| Migration scope becoming a redesign | Add only the missing route/reference/membership semantics and the required onboarding contract change; preserve all established assignment and ownership invariants. |

## Explicit Answers

1. **Should the global AS/A Level question remain in onboarding?** No.
2. **Should `profiles.level` remain in the database?** Yes temporarily as nullable legacy data; do not drop or rewrite it as part of initial rollout.
3. **If retained, what authority does it have?** None. It is deprecated profile metadata only.
4. **Should each membership have persistent study-route information?** Yes.
5. **Should users choose arbitrary individual papers?** No.
6. **Should valid routes be canonical reference data?** Yes, scoped to the immutable syllabus version.
7. **Should Lockdin automatically choose a route where only one valid route exists?** Yes, after the student's per-subject context leaves exactly one valid route.
8. **When multiple routes exist, what should the student choose?** One plain-language, reference-defined valid pathway, with its papers shown for recognition.
9. **Does the recommendation require a new migration?** Yes for the combined route model; the current schema is insufficient. A future 0016 may be justified, but is not created here.
10. **Does it require extending the syllabus data/import pipeline?** Yes. Route evidence, validation, canonical identity, import/publication, and nine-subject backfill are required.

## Owner Decision Form

### GLOBAL AS/A LEVEL

**Recommended:** remove the global question from onboarding; retain `profiles.level` temporarily as nullable, non-authoritative legacy metadata and deprecate its active UI/API use.

**Alternative:** keep it optional as clearly labelled general profile context with no subject behavior. This is not preferred because no current v1 decision consumes it.

**Owner decision:** PENDING

### PER-SUBJECT STUDY ROUTE

**Recommended:** canonical syllabus-version-scoped assessment routes, one persistent route per membership, automatic selection when unique, and a constrained plain-language choice when multiple routes exist. No arbitrary component-set construction.

**Alternative:** no persistent route and show all pinned-version components. This is safer than arbitrary checkboxes but does not meet the clarified v1 requirement.

**Owner decision:** PENDING

**MIGRATION EXPECTATION:** YES — **A FUTURE 0016 MAY BE JUSTIFIED**, after owner approval and detailed design. Do not create it yet.

**REFERENCE-DATA EXTENSION EXPECTATION:** YES — separate reviewed, version-scoped route manifests plus validator/importer/hash/publication extensions and evidence-backed backfill for all nine current subjects.

**PRE-BETA CLASSIFICATION:** persistent per-subject study route is **PRE-BETA REQUIRED if the owner accepts this model**; global-level removal is part of the same account/onboarding architecture correction. Implementation remains blocked pending the two owner decisions.

---

## Owner Product Model Decision — APPROVED

**Decision date:** 2026-09-03

**Authority:** Lockdin owner

**Status:** APPROVED

This approval resolves the two product-model decisions presented in the preceding decision brief. The earlier brief is retained unchanged as the decision rationale and historical record; this addendum is the authoritative owner decision.

### Final Approved Product Model

#### Global AS/A Level Model

- Remove the global AS/A Level question from onboarding.
- Do not replace it with a Year 12 / Year 13 question.
- Retain `profiles.level` temporarily as nullable legacy metadata.
- Treat `profiles.level` as having no syllabus, assignment, assessment-route, progress, analytics, or other product authority.
- Deprecate active UI and API use of `profiles.level` as part of the future implementation.
- Do not delete or rewrite existing profile-level values merely for cleanup.

#### Per-Subject Study Route

- Introduce canonical assessment/study routes scoped to immutable syllabus versions.
- Persist one valid route against each relevant subject membership.
- Automatically select the route when exactly one valid route remains.
- When multiple valid routes remain, present only canonical, reference-defined choices in clear student-facing language.
- Do not allow arbitrary paper or component combinations.
- Derive the qualification target/level from the canonical route rather than storing it as separately editable membership data.
- Never allow route selection to choose or change the membership's syllabus version.

#### Progress

- Preserve current whole-syllabus topic progress as the authoritative continuity metric.
- Use route relevance for filtering and focus.
- Show route-relevant outcomes by default while preserving access to all content in the pinned syllabus version.
- Do not change progress percentages merely because the selected route changes.

#### Past Papers

- Default future component selection to the membership's current route.
- Preserve all historical attempts.
- Permit an explicit, warned off-route attempt only when the component still belongs to the membership's pinned syllabus version.
- Never modify the persistent route as a consequence of an off-route attempt.

#### Future Syllabus Revisions

- Scope routes to syllabus versions.
- Keep existing r001 memberships and routes pinned when r002 becomes available.
- Auto-map a route during a future syllabus-version migration only when a unique, reviewed equivalent has been proven.
- Require explicit confirmation, or fail safely, when a route mapping is ambiguous.

### Migration and Reference-Data Impact

- A future migration `0016` is justified for the approved route model, but this decision does **not** authorize creating it.
- A detailed implementation and data-migration design must be produced and reviewed before migration work begins.
- Extend the reference-data architecture with reviewed, syllabus-version-scoped assessment-route metadata.
- Prefer separate route manifests instead of adding repeated route information to the 12-column syllabus CSV.
- Supply evidence-backed route definitions and a backfill strategy for all nine existing subjects before route selection becomes mandatory.
- Include route evidence in the adoption audit for each of the seven candidate subjects.
- Design the transition so unique routes can be assigned automatically and ambiguous legacy memberships require explicit resolution or fail safely.

No source, test, schema, migration, syllabus CSV, route manifest, generated artifact, or hosted-environment change is authorized by this documentation decision.

### Remaining Unresolved Pre-Beta Owner Decisions

The global level and per-subject route product-model decisions are now resolved. The remaining owner decisions or owner-controlled gates identified by this report are:

1. Name the operational owner for each pre-beta workflow and confirm the monitored support/contact mailbox or channel.
2. Decide whether custom SMTP is required before beta if delivery evidence shows the managed provider is insufficient.
3. Decide whether automatic operational alerts are required before beta if manual review proves insufficient.
4. Complete the analytics review and decide whether any event beyond the four already required by scope is justified.
5. Decide adoption separately for each of the seven candidate subjects after its full audit, including route evidence.
6. Close the applicable compliance, participant-age, jurisdiction, privacy, and guardian-consent gates before issuing invitations.

The exact implementation and data-migration design is also a required planning gate. It may surface additional owner choices, but it is not itself authorization to implement or to create migration `0016`.

### Recommended Next Planning Task

Produce a documentation-only detailed implementation and data-migration design for the approved per-subject study-route model. It should define the proposed conceptual `0016` changes; route manifest schema, evidence, validation, hashing, import, and publication flow; nine-subject backfill and ambiguous-membership handling; API and UI deprecation of `profiles.level`; membership route selection and authorization boundaries; progress and past-paper invariants; future syllabus-version mapping rules; staged rollout, acceptance checks, rollback, and failure behavior. Do not implement the design or create migration `0016` until that design is reviewed and explicitly authorized.

---

# Detailed Study-Route Implementation & Migration Design

**Prepared:** 2026-09-03

**Status:** OWNER REVIEW REQUIRED

**Mode:** Read, trace, compare, simulate, and document only. This section proposes an implementation architecture; it does not authorize implementation, migration creation, reference-data creation/import/publication, hosted changes, or participant invitations.

## Design Conclusion

The approved product model is implementable without weakening the existing strict syllabus resolver or rewriting historical user data. The recommended design is:

1. retain `syllabus_versions.content_sha256` as the immutable hash of the existing syllabus content graph;
2. attach a separately versioned and independently hashed **route-reference contract** to exactly one syllabus version;
3. store canonical routes and ordered route/component roles beneath that contract;
4. add one temporarily nullable `user_subjects.assessment_route_id` column;
5. use composite foreign keys to enforce version alignment;
6. make authenticated RPC/API operations the only membership write boundary;
7. keep route selection nullable only as an explicit legacy transition state; and
8. tighten nullability later, after all nine subjects have reviewed route coverage and every legacy membership is resolved.

This makes route metadata an attached immutable reference layer rather than a second syllabus-assignment system. It also avoids falsely claiming that route data existed inside the historical `r001` content hashes.

## Verified Repository Baseline

| Fact | Verified state |
| --- | --- |
| Branch | `main` |
| HEAD | `1f22e1e06a1c3b6368d1e0544e0336869f2a4524` |
| Fetched `origin/main` | Same SHA; ahead/behind `0/0` |
| Working tree before this design | Only untracked Report 120 |
| Migration count | 16 |
| Migration head | `0015_silent_sentinel` |
| Migration `0016` | Absent |
| Integrity checker | PASS: count 16, head `0015_silent_sentinel` |
| Schema workflow | Imperative Drizzle migrations; no `supabase/migrations` or declarative schema path |
| Current reference graphs | Nine published `*-r001` graphs; no real `r002` |
| Current graph totals from checkpoint evidence | 9 subjects, 9 versions, 136 units, 520 topics, 3,198 outcomes, 50 components, 27 series-policy rows |

The current Drizzle schema and migration intent agree on all route-relevant structures: `profiles.level` is nullable; `user_subjects` has a composite subject/version pin and complete-or-null intended session; components belong to one version; outcomes are normalized with occurrence rows; topic progress is user/topic scoped; and paper attempts retain a component reference without configuring a membership route.

## Current Architecture Trace

### Database and RPCs

- `user_subjects` is keyed by `(user_id, subject_id)` and pins `syllabus_version_id` through `(subject_id, syllabus_version_id) → syllabus_versions(subject_id, id)`.
- `assessment_components` is unique by `(syllabus_version_id, paper_code, level)`. The same paper code may legitimately occur at different qualification levels.
- `learning_outcome_components` records normalized outcome occurrences; `component_id` is nullable for syllabus-wide content and `level` is retained on every occurrence.
- `topic_progress` remains one user-owned status/note per topic. Its denominator is the complete set of topics under the pinned graph.
- `past_paper_attempts.component_id` records one attempt fact and uses `ON DELETE SET NULL`; it has no persistent-route meaning.
- Direct browser mutation of `user_subjects` is revoked. Onboarding and replacement use narrow `SECURITY DEFINER` functions with `auth.uid()`, an empty `search_path`, explicit revokes, and authenticated execute grants.
- `lockdin_complete_onboarding_apply` currently requires `p_level`, updates the profile, strictly resolves each new membership's version from its intended session, creates memberships, and creates starter tasks in one transaction.
- `lockdin_replace_user_subjects_apply` locks the caller's profile, preserves retained rows, deletes removed memberships, and strictly resolves only newly added memberships.
- `lockdin_resolve_applicable_syllabus_version` accepts subject plus structured exam session, considers only published and product-enabled versions, locks candidates, and fails on zero or multiple matches.

### API and frontend

- Profile GET exposes nullable `level`; profile PATCH can edit it; onboarding requires it and forwards `p_level`.
- Membership responses expose subject, pinned-version metadata, intended session, and timestamps, but no route.
- The assignment-session endpoint intentionally hides internal version identities; final database writes independently resolve the version.
- Subject syllabus and component reads resolve the authenticated member's stored pin, falling back to DEFAULT only for non-members.
- Topic and paper writes verify that the referenced topic/component belongs to the caller's exact pin.
- Onboarding step 4 currently asks for a global level and exam session; review repeats the level.
- Settings edits the global level and subject set. AuthProvider hydrates profile level. Dashboard has one profile-level display fallback.
- Subject Detail receives learning outcomes but does not yet expose route context. Past Papers lists all pinned-version components and clears stale form state on subject changes.

### Reference pipeline

- Nine 12-column CSVs contain syllabus content, components, and outcome/component occurrences.
- Parse and normalize produce one ordered content graph. Canonical hashing includes exam board, qualification, units, topics, outcomes, component definitions, and occurrence mappings.
- Canonical hashing excludes source filename, lifecycle, applicability, version labels, and timestamps.
- Draft import, explicit legacy identity adoption, publication, applicability population, and strict runtime assignment are separate controlled operations.
- Published/retired/archived graphs are immutable by importer contract. Publication re-loads and re-hashes the database graph before changing lifecycle.
- Current r001 applicability evidence and expected content hashes are tracked separately under `docs/reference-data/syllabus-applicability/`.

## Invariant and Sequencing Rule

The only valid sequence is:

```text
subject + intended exam session
  → strict server/database syllabus-version resolution or retained pin
  → load the one published route-reference contract for that exact version
  → auto-select the sole valid route or validate the submitted canonical route key
  → persist that route on the membership
```

A client never submits `syllabus_version_id`, never chooses a route contract, and never submits an arbitrary component set. A route lookup or route change cannot call the syllabus resolver in a way that repins an existing membership.

## Proposed Reference Structures

### 1. `assessment_route_sets`

This is the independently versioned route-reference contract attached to an immutable syllabus version.

| Field | Required / nullable | Mutability | Purpose, source, and validation | User-facing | Canonical route hash |
| --- | --- | --- | --- | --- | --- |
| `id` | Required | Immutable | Database-generated surrogate identity; positive primary key | No | No |
| `syllabus_version_id` | Required | Immutable | Import target; FK to one existing version and unique-set scope | Indirectly | Logical revision identity/content hash is hashed, not numeric ID |
| `route_revision_key` | Required | Immutable after creation | Manifest-owned, nonblank human-reviewable key unique within the syllabus version | No | Yes |
| `lifecycle` | Required | Mutable only through controlled `draft → published → retired` transitions | Publication operation; constrained state and no reverse transition | No | No |
| `manifest_sha256` | Nullable in draft; required when published | Mutable only while draft | Tool-computed 64-character lowercase SHA-256; must equal reloaded canonical route graph at publication | No | Stored result |
| `source_manifest` | Required | Mutable only while draft | Registry-owned normalized repository-relative path; no external/user input | No | No |
| `created_at` | Required | Immutable | Database-generated operational timestamp | No | No |
| `published_at` | Nullable until publication | Set once | Database publication timestamp; required exactly when published/retired | No | No |

Constraints: unique `(syllabus_version_id, id)`, unique `(syllabus_version_id, route_revision_key)`, and a partial unique index allowing at most one `published` route set per syllabus version. Drafts may coexist for review. A published set is never edited in place.

### 2. `assessment_routes`

| Field | Required / nullable | Mutability | Purpose, source, and validation | User-facing | Canonical route hash |
| --- | --- | --- | --- | --- | --- |
| `id` | Required | Immutable | Database-generated surrogate identity; positive primary key | No | No |
| `route_set_id` | Required | Immutable | Import-resolved parent contract; composite FK must agree with version | No | Route revision key is hashed, not numeric ID |
| `syllabus_version_id` | Required | Immutable | Copied from parent set solely for composite same-version constraints | No | Logical version identity is hashed |
| `route_key` | Required | Immutable | Manifest-owned nonblank stable key, unique within route set and never reused for changed semantics | Sent to clients | Yes |
| `display_label` | Required | Mutable only while draft | Reviewed, trimmed plain-language label with bounded length | Yes | Yes |
| `qualification_target` | Required | Mutable only while draft | Official evidence; constrained `as_level` or `a_level`; membership qualification derives from it | Yes, translated | Yes |
| `pathway_type` | Required | Mutable only while draft | Official evidence; constrained `single_series`, `staged_completion`, or `full_same_series` | Yes, translated | Yes |
| `progression_eligibility` | Required | Mutable only while draft | Official evidence; `eligible`, `not_eligible`, or `not_applicable`; validator requires `not_applicable` for completed A Level routes | When relevant | Yes |
| `order_index` | Required | Mutable only while draft | Manifest-owned nonnegative unique order within route set | Indirectly | Yes |

The recommended semantic model is therefore **qualification target + pathway type + progression eligibility + component roles**. A single route enum is insufficient, while free-form stage text cannot support validation. No separate editable membership-level field is added.

| Route-semantics option | Result |
| --- | --- |
| A. Single enum | Rejected: either Mathematics-specific values proliferate or staged/current-sitting meaning is lost |
| B. Qualification target + pathway type | Necessary foundation but insufficient alone for non-carry-forward AS routes and staged component roles |
| C. Qualification target + current-sitting metadata | Captures sitting focus but needs a stable route-level pathway and progression meaning |
| D. Recommended normalized combination | Qualification target + constrained pathway + progression eligibility on the route, with current/carried role on each component; generic across current subjects |

Do not add route-level `active`, arbitrary metadata JSON, user-defined descriptions, weighting copies, or school-year fields. Publication state belongs to the route set; component facts remain on `assessment_components`.

### 3. `assessment_route_components`

| Field | Required / nullable | Mutability | Purpose, source, and validation | User-facing | Canonical route hash |
| --- | --- | --- | --- | --- | --- |
| `route_id` | Required | Immutable after parent publication | Import-resolved parent route; FK and primary-key member | No | Stable route key is hashed |
| `component_id` | Required | Immutable after parent publication | Resolved from manifest paper-code/level to exactly one existing level-aware component | Component details are shown | Natural component key is hashed |
| `syllabus_version_id` | Required | Immutable | Copied from route/component and required to match both composite FKs | No | Logical version identity is hashed |
| `role` | Required | Mutable only while draft | Official evidence; constrained exclusively to `current_sitting` or `carried_forward` | Yes, translated | Yes |
| `order_index` | Required | Mutable only while draft | Manifest-owned nonnegative unique order within route | Indirectly | Yes |

Every listed component is required because a route is a fixed canonical combination. Do not add `required`, `optional`, `prior_stage`, or multiple booleans that permit contradictory states. The two exclusive roles preserve the staged distinction: a staged A Level can retain AS papers as `carried_forward` and mark only completion papers as `current_sitting`; a full same-series A Level marks all papers `current_sitting`.

Primary key `(route_id, component_id)` prohibits duplicates. At least one `current_sitting` component and at least one total component are publication requirements.

### 4. `user_subjects.assessment_route_id`

Choose **Option A: a nullable foreign-key column on `user_subjects`**.

- It directly expresses the approved one-current-route-per-membership model.
- It reuses the existing composite membership primary key and ownership/RLS model.
- It avoids a history table that v1 does not need.
- Null is reserved for pre-cutover legacy/transitional rows, not a permanent product state.
- `updated_at` provides an existing stale-write token for route changes.

A separate membership-route table would add a second ownership lifecycle, additional RLS, and one-to-one uniqueness without delivering required history. If selection history becomes a proven audit requirement later, add a purpose-built append-only history/event design rather than overloading the current-state relation.

| Membership-storage option | Simplicity/integrity | Rollout/nullability | History/RLS | Decision |
| --- | --- | --- | --- | --- |
| A. Nullable `user_subjects.assessment_route_id` | Direct one-current-route model; composite FK fits existing pin | Additive and naturally supports legacy null | Reuses membership ownership; no history | Recommended |
| B. Separate user-subject-route table | Adds one-to-one uniqueness and a second lifecycle | More moving parts for missing legacy rows | Separate RLS; still no history unless redesigned | Rejected for v1 |
| C. Component array/free text | Weak referential integrity and arbitrary combinations | Superficially easy | Poor auditability | Rejected |

The new membership field is nullable during transition, mutable only through onboarding/replacement/route-change RPCs, sourced from a canonical route lookup, validated against the membership's exact version, not directly user-facing, and excluded from reference hashing because it is user-owned state.

## Database Constraint Strategy

The proposed constraints are deliberately redundant enough to make cross-version references impossible:

1. retain `user_subjects(subject_id, syllabus_version_id) → syllabus_versions(subject_id, id)`;
2. add a unique non-partial key on `assessment_components(syllabus_version_id, id)`;
3. add `assessment_route_sets(syllabus_version_id, id)` uniqueness;
4. enforce `assessment_routes(route_set_id, syllabus_version_id) → assessment_route_sets(id, syllabus_version_id)`;
5. add `assessment_routes(syllabus_version_id, id)` uniqueness;
6. enforce `assessment_route_components(route_id, syllabus_version_id) → assessment_routes(id, syllabus_version_id)`;
7. enforce `assessment_route_components(component_id, syllabus_version_id) → assessment_components(id, syllabus_version_id)`; and
8. enforce `user_subjects(assessment_route_id, syllabus_version_id) → assessment_routes(id, syllabus_version_id)`.

PostgreSQL composite foreign keys require referenced columns to be backed by a primary/unique non-partial key. Foreign keys do not automatically index their referencing side, so add only the supporting indexes needed for membership lookup and reference maintenance: `user_subjects(assessment_route_id)` where non-null, `assessment_routes(route_set_id, order_index)`, and `assessment_route_components(route_id, role, order_index)`. Add `assessment_route_components(component_id)` only if delete/reference checks or observed queries justify it; route publication should normally prevent component deletion.

Structural constraints cannot prove official Cambridge correctness or that a draft route is non-empty. A narrow publication function must lock the set, validate its full graph, recompute its hash, reject empty/duplicate/semantically inconsistent routes, and only then publish. Route-table and junction triggers must reject writes beneath a published or retired route set. Runtime APIs read only the published set.

No immediate `NOT NULL` is proposed for the membership route column. Adding a `NOT VALID` non-null check too early would still reject updates to unresolved legacy rows and could strand Settings operations. Application/RPC enforcement for new membership creation precedes a later all-row database tightening.

## Route Manifest Design

### Format decision

Use **JSON** with a versioned schema.

| Format | Assessment |
| --- | --- |
| JSON | Best fit: existing repository manifests use JSON; strict schema validation, nested route/component roles, deterministic serialization, and simple TypeScript tooling |
| YAML | Human-friendly comments but more parser ambiguity and canonicalization complexity |
| TypeScript | Strong local types but executable input and poor language-neutral auditability |
| CSV | Good for flat data but unsuitable for nested routes, sources, roles, and per-route evidence without duplication |

The existing 12-column CSV remains unchanged and continues to own content, component definitions, and outcome/component occurrences. Route combinations never appear on every outcome row.

No route-specific exam-series column is included in the initial database model without evidence. The existing version-level series policy first determines whether the version is assignable. If a nine-subject audit proves that valid route combinations differ by exam series inside one version, stop and extend the manifest/schema with a normalized, evidence-backed route-availability relation; do not hide that rule in labels or API code.

### Candidate manifest topology

```json
{
  "schemaVersion": 1,
  "subjectCode": "<Cambridge code>",
  "syllabusRevisionKey": "<existing *-r001 key>",
  "routeRevisionKey": "<version-scoped route revision>",
  "sources": [
    {
      "sourceKey": "<stable reference>",
      "documentId": "<official document identifier>",
      "title": "<official title>",
      "validity": "<official validity period>",
      "locator": "<page/table/section>",
      "url": "<official URL>"
    }
  ],
  "routes": [
    {
      "key": "<stable semantic key>",
      "label": "<plain-language label>",
      "qualificationTarget": "as_level",
      "pathwayType": "single_series",
      "progressionEligibility": "eligible",
      "orderIndex": 0,
      "evidenceRefs": ["<sourceKey>#<locator>"],
      "components": [
        {
          "paperCode": "<existing paper code>",
          "level": "<existing component level>",
          "role": "current_sitting",
          "orderIndex": 0
        }
      ]
    }
  ],
  "review": {
    "status": "reviewed",
    "reviewers": ["<named reviewer>"],
    "reviewedAt": "<ISO date>",
    "auditReport": "<repository-relative report>"
  }
}
```

The example shows shape only; it is not a production route or key.

| Manifest field | Required / mutable | Validation and source | Runtime/user use | Canonical route hash |
| --- | --- | --- | --- | --- |
| `schemaVersion` | Required; immutable per file | Supported positive schema version | Tooling only | Yes |
| `subjectCode` | Required; immutable | Must match existing subject and registered syllabus source | Recognition/audit | Yes |
| `syllabusRevisionKey` | Required; immutable | Must resolve exactly one expected version/content hash | Binding, not client input | Yes |
| `routeRevisionKey` | Required; immutable after publication | Nonblank and unique for the version | Contract identity | Yes |
| `sources[]` | Required; mutable while draft | At least one official source with unique `sourceKey`, document identity, validity, locator, and official URL | Audit only | Stable document identity/validity/locator yes; URL presentation no |
| `routes[]` | Required; mutable while draft | Nonempty, deterministic, unique keys and semantics | Runtime choices | Yes |
| `routes[].key` | Required; immutable after publication | Stable nonblank slug unique in set | API write/read identifier | Yes |
| `routes[].label` | Required; mutable while draft | Reviewed bounded student-facing text | UI | Yes |
| `qualificationTarget` | Required; mutable while draft | Constrained and evidence-backed | Derived qualification | Yes |
| `pathwayType` | Required; mutable while draft | Constrained and evidence-backed | UI grouping/copy | Yes |
| `progressionEligibility` | Required; mutable while draft | Constrained and consistent with target/pathway | Warning/help copy | Yes |
| `orderIndex` | Required; mutable while draft | Nonnegative and unique within parent | Stable UI order | Yes |
| `evidenceRefs[]` | Required; mutable while draft | Nonempty references to declared sources/locators | Audit only | Yes |
| `components[]` | Required; mutable while draft | Nonempty, unique paper-code/level pairs | Runtime route membership | Yes |
| component `paperCode`/`level` | Required; mutable while draft | Must resolve one component in exact version | Paper recognition | Yes |
| component `role` | Required; mutable while draft | Current-sitting/carried-forward only; semantic checks apply | UI/picker focus | Yes |
| component `orderIndex` | Required; mutable while draft | Nonnegative and unique in route | Stable paper order | Yes |
| `review` | Required to publish; mutable while draft | Status must be reviewed with named internal reviewers, date, and tracked audit path | Publication gate only | Excluded to avoid semantic hash changes from reviewer metadata |

### Stable route keys

- Scope uniqueness to the route set/version; do not include database IDs or display text.
- Use a compact semantic slug that identifies qualification/pathway and a stable variant, while leaving component membership in structured data.
- Do not concatenate every paper code into the key: official corrections or presentation changes would make keys fragile and unreadable.
- Never reuse a published key for different semantics. A replacement contract can preserve a key only when reviewed equivalence is exact.

### Evidence boundary

- **Manifest:** official document identifier/title/validity, exact page/table/section locators, source URL, per-route evidence references, reviewed status, reviewers, and audit report path.
- **Audit report:** extracted official table interpretation, prohibited combinations, carry-forward reasoning, ambiguity notes, cross-check evidence, reviewer sign-off, and any unresolved issue.
- **Runtime database:** operational route semantics, contract identity/hash, and repository manifest path only. Do not copy narrative evidence notes or reviewer personal data into runtime tables.

## Validator and Semantic Audit

### Structural validation

Fail before database access when:

- schema version or required fields are invalid;
- subject code or logical syllabus revision is unknown;
- the expected content hash does not match the pinned repository identity;
- route revision or route keys are missing/duplicated;
- qualification, pathway, progression, component role, or order values are invalid;
- a route is empty or lacks a current-sitting component;
- duplicate component occurrences exist within a route;
- a paper-code/level pair does not resolve to exactly one component in the same version;
- route/component orders are nondeterministic or duplicated;
- staged/full-same-series roles contradict structural rules;
- evidence references are missing or dangling; or
- two routes have identical canonical semantics under different keys without an explicit reviewed explanation.

### Official-evidence audit

Structural validity does not prove Cambridge correctness. A separate human-reviewed audit must establish the valid combinations, prohibited combinations, award target, current-sitting/carry-forward meaning, validity period, series caveats, and carry-forward eligibility. Mathematics-like alternatives require table-by-table evidence; no validator may infer them from component weights or CSV co-occurrence.

## Import, Hashing, and Publication

### Recommended pipeline

```text
12-column syllabus CSV + syllabus manifest
  → existing content validation/normalization

route JSON + route audit
  → route structural validation + official-evidence gate

content graph identity + canonical route graph
  → one draft version plus attached draft route contract
  → transactional import/rebuild while both are draft
  → independent content and route hashes
  → publication verification
  → published syllabus/reference contract
  → applicability and series policy
```

For future drafts, import the route graph in the same database transaction as the attached syllabus draft graph so publication sees a complete contract. Keep parsing/validation modules separate because their source formats and evidence differ. Publication must recompute both hashes and publish them together; no published syllabus intended for route-mandatory use may lack a published route set.

### Hash model

- Preserve `syllabus_versions.content_sha256` exactly as the content-graph hash.
- Add `assessment_route_sets.manifest_sha256` as the canonical route graph hash.
- Treat the ordered pair `(content_sha256, manifest_sha256)` as the complete reference-contract identity; a third stored combined hash is unnecessary duplication.
- Hash stable logical identifiers, route semantic fields, display labels, qualification/pathway/progression values, ordered component natural keys and roles, and stable source/evidence locators.
- Exclude numeric database IDs, file path, lifecycle, timestamps, and reviewer names/dates.
- Any change to qualification target, component membership, component role, carry-forward eligibility, or display label changes the route hash.

### Immutability and correction

- Draft route sets may be rebuilt by reviewed tooling.
- Published and retired route sets and their child rows are immutable at database and tooling boundaries.
- Never hand-edit Production route rows or reopen a published set.
- Correct route semantics by creating a new route-set revision attached to the same syllabus version; do not fabricate `r002` when syllabus content did not change.
- Publication of a replacement route set must be blocked while memberships reference the old set unless a complete reviewed mapping/resolution plan is supplied. Exact unique equivalents may be migrated; ambiguous or changed semantics require confirmation.
- A true syllabus revision still receives a new syllabus graph and its own route set. Existing memberships remain pinned to the old version and route.

## Existing Published r001 Backfill Strategy

Choose a **separate route-layer publication** rather than reopening or re-hashing the nine published r001 content graphs.

| Backfill architecture | Integrity effect | Decision |
| --- | --- | --- |
| A. Mutate existing r001 and overwrite content hash | Rewrites historical identity and invalidates Phase 6 evidence | Rejected |
| B. Separately versioned route layer attached to r001 | Preserves content hash while giving routes their own immutable identity | Recommended |
| C. Reopen and re-hash the published graph | Violates published immutability even if content rows are unchanged | Rejected |
| D. Create a fake r002 | Misrepresents Cambridge syllabus revision and risks repinning logic | Rejected |
| E. Unversioned side table | Cannot prove which reviewed route state applied over time | Rejected |

1. Freeze and record each existing `*-r001` logical key and `content_sha256` from the reviewed applicability manifest/checkpoint.
2. For each subject, collect the official source document, validity period, qualification options, valid/prohibited combinations, current-sitting/carry-forward semantics, and reviewer sign-off.
3. Create a future draft route manifest and audit report; do not derive combinations from the CSV.
4. Validate every component natural key against the exact r001 database graph and expected content hash.
5. Import a draft route set and children without modifying the syllabus graph, its content hash, applicability, DEFAULT, or membership pins.
6. Re-load the route graph, recompute its independent hash, and publish only after the subject audit passes.
7. Repeat for all nine subjects: Further Mathematics 9231, History 9489, Business 9609, Computer Science 9618, Biology 9700, Chemistry 9701, Physics 9702, Economics 9708, and Mathematics 9709.
8. Enable route selection only when all nine current published versions have one reviewed published route set.

Repository evidence already supports using Mathematics, Further Mathematics, Biology, and Physics as structural test cases. It does not authorize filling their production manifests in this task, and it does not conclusively define routes for the other five subjects.

| Current subject | Code | Current evidence boundary | Mandatory future route-audit output |
| --- | --- | --- | --- |
| Further Mathematics | 9231 | Report 120 records official two-option AS and all-four A Level evidence | Re-verify source validity, combinations, roles, prohibitions, keys, labels, mappings, and review status |
| History | 9489 | Edition/applicability evidence exists; no conclusive route mapping recorded | Obtain official route table and complete the full audit; do not infer from CSV |
| Business | 9609 | Edition/applicability evidence exists; no conclusive route mapping recorded | Obtain official route table and complete the full audit; do not infer from CSV |
| Computer Science | 9618 | Edition/applicability evidence exists; no conclusive route mapping recorded | Obtain official route table and complete the full audit; do not infer from CSV |
| Biology | 9700 | Report 120 records AS, staged A Level, and full same-series structural examples | Re-verify source validity, roles, combinations, keys, labels, mappings, and review status |
| Chemistry | 9701 | Edition/applicability evidence exists; no conclusive route mapping recorded | Obtain official route table and complete the full audit; do not infer from science similarity |
| Physics | 9702 | Report 120 records AS, staged A Level, and full same-series structural examples | Re-verify source validity, roles, combinations, keys, labels, mappings, and review status |
| Economics | 9708 | Edition/applicability evidence exists; no conclusive route mapping recorded | Obtain official route table and complete the full audit; do not infer from CSV |
| Mathematics | 9709 | Report 120 records multiple AS, staged, same-series, and carry-forward distinctions | Re-verify every official combination/prohibition and complete reviewed production mappings |

For every row, the audit must identify the official document and validity period, qualification options, valid and prohibited combinations, current-sitting/carry-forward rules, stable keys, plain-language labels, component natural-key mappings, confidence, reviewer, and final reviewed status.

This strategy preserves historical Phase 6 truth: the old content hash still says exactly what it always said, while the new route hash records the later attached route-reference evidence.

## Legacy Membership Classification and Behavior

### Deterministic classifier

For each existing membership:

1. lock/read its existing `(user_id, subject_id, syllabus_version_id)` without invoking DEFAULT;
2. require a published route set for that exact version;
3. derive candidate routes solely from the published route set for that pin; the session remains authoritative for the existing pin but does not narrow routes unless a separately reviewed route-availability extension is approved;
4. ignore `profiles.level` as authority; and
5. classify by candidate cardinality and invariant health.

| Classification | Definition | Write behavior |
| --- | --- | --- |
| AUTO-ASSIGNABLE | Exactly one canonical route is provably valid from the pin plus authoritative membership/session state | Assign that route in a locked, idempotent batch; record aggregate/operator evidence |
| AMBIGUOUS | More than one valid canonical route remains | Leave null; never infer from school year, progress, tasks, attempt history, or recent paper; prompt the user |
| UNRESOLVABLE / INVALID | No route matches, the pin/reference contract is missing, or the membership invariant is broken | Leave null, fail route-dependent operations closed, retain historical access, and require operator investigation |

Profile level and activity history may be displayed to a human as explicitly non-authoritative context only if a later owner decision allows it. They never drive an automated write.

### Transitional user experience

- Do not block login, dashboard, tasks, progress, historical attempts, or all-syllabus Subject Detail for ambiguous legacy members.
- Show a persistent but non-destructive “Confirm your study route” callout on the affected subject and Settings.
- A one-time post-login completion screen may be offered, but the recommended default is deferrable until the user enters route-dependent focus or logging flows.
- With no route, Subject Detail defaults to all pinned-syllabus content and makes no route-relevance claim.
- With no route, Past Papers continues to allow any same-version component and explains that route defaults/warnings are unavailable until confirmation.
- New membership creation after cutover must never produce a null route.
- Unresolvable rows use the same historical-access posture, plus an operator-visible failure code. New/replacement writes for the affected subject/version fail until reference data is corrected.

## Onboarding Design

### Preview boundary

Use an authenticated API preview endpoint backed by the existing strict database resolver. The client submits subject IDs and structured intended sessions only. The server resolves each exact version, loads its published route set, and returns safe route options. It does not accept or expose a version ID.

Do not make the preview result authoritative. Final onboarding independently repeats version resolution and route-key validation inside its transaction. A stale route key or changed route contract fails with a refresh-required response.

| Preview option | Assessment |
| --- | --- |
| A. Server HTTP preview endpoint | Correct client boundary and easiest typed/error-controlled contract |
| B. Browser-callable RPC preview | Avoids one API layer but exposes more database surface and couples UI to PostgREST shape |
| C. API computes and returns opaque options | Good only if “opaque” means stable route keys; a signed token adds complexity and still cannot replace final validation |
| D. Recommended | Authenticated API endpoint calls the strict resolver/read path, returns stable route keys and safe syllabus labels, while final v2 RPC independently re-resolves |

### Five-step placement

1. Welcome/identity remains.
2. Subject selection remains.
3. Study context keeps intended session and per-subject overrides, removes global AS/A Level, and loads per-subject route context after the session is valid.
4. For each subject, ask “What are you working toward?” using plain language. If one route remains, show it as resolved. If multiple remain, show only canonical choices and recognizable paper names/codes. Ask a second paper-combination question only where canonical alternatives actually require it.
5. Review shows each subject's intended session, qualification target, pathway, and current-sitting/carry-forward papers before submission.

Never show database IDs, `r001`, or raw `syllabus_version_id`.

### Atomic final transaction

The v2 onboarding function must:

1. derive `auth.uid()` and validate identity/subject/session/route-key input;
2. lock the profile and re-check onboarding state;
3. resolve every subject's syllabus version with the strict resolver;
4. lock/read the published route set for each resolved version;
5. auto-select when exactly one valid route exists, otherwise require and validate a submitted route key;
6. update profile identity without writing `profiles.level`;
7. insert every membership with its pin, intended session, and route;
8. create starter tasks under current behavior; and
9. return success only if every step succeeds.

Any missing, stale, ambiguous, cross-version, or unpublished route rolls back profile, memberships, and tasks together.

## Membership Replacement and Route Change

### Replacement

- **Retained subject:** preserve pin and intended session under current rules; preserve the existing route when it belongs to that pin and its contract remains valid.
- **New subject:** strict-resolve the version, then auto-select or validate a canonical route within that version in the same transaction.
- **Removed subject:** retain existing current deletion semantics; route removal follows membership deletion, while progress/tasks/attempt behavior remains governed by existing ownership/reference rules.
- **Future explicit session change on a retained subject:** do not repin. Revalidate the existing route against the same pin and any evidence-backed session restrictions. If invalid or ambiguous, require route confirmation; do not guess.

The existing replacement operation locks the profile. Extend that lock order consistently rather than introducing a second race-prone write path.

### Dedicated route change

Propose `PATCH /user-subjects/{subjectId}/route` with `{ routeKey, expectedUpdatedAt }`.

The API authenticates the caller and invokes a narrow route-change RPC. The RPC derives `auth.uid()`, locks the profile first and membership second, compares the optional stale-write token, loads the route against the membership's existing version, requires the published route contract, and updates only `assessment_route_id`/`updated_at`.

It must never update the pin, intended session, progress, tasks, dates, attempts, or profile. A subject replacement and route change serialize through the same profile lock order. A stale or removed membership returns conflict, not an insert.

## `profiles.level` Deprecation

The column remains nullable and existing values remain untouched. It is not part of route classification or the proposed initial migration cleanup.

Remove active use in this order:

1. introduce the v2 onboarding RPC without `p_level` while retaining old signatures temporarily;
2. remove `level` from the onboarding request schema, API validation, AuthProvider completion payload, UI control, review screen, and tests;
3. remove `level` from profile PATCH and revoke authenticated column-level UPDATE for `profiles.level`;
4. remove the Settings editor and dashboard fallback;
5. keep nullable `level` in Profile GET for one compatibility window, explicitly deprecated and ignored;
6. remove it from generated response contracts in a later coordinated API release if no supported client consumes it; and
7. consider a physical column drop only in a separate future owner-approved cleanup, never by rewriting existing values for appearance.

`profiles.exam_session` is not changed by this decision. It remains non-authoritative display/legacy data; structured membership sessions continue to control assignment.

## API and RPC Contract Design

### Public API representations

`AssessmentRoute` should expose:

- `key`, not the numeric route ID;
- `label`;
- `qualificationTarget`;
- `pathwayType`;
- `progressionEligibility`; and
- ordered `components` containing the existing component ID needed for paper logging, paper code/name/level, and `role`.

`UserSubjectMembership` gains nullable `route` during transition. The route becomes non-null in the final contract after legacy completion. Pinned syllabus metadata remains separate and authoritative.

`RouteOptionsPreview` should return, per subject:

- subject ID/name/code;
- intended session echoed in normalized form;
- resolved syllabus label, exam board, and qualification, but no internal version ID;
- available canonical routes;
- `autoSelectedRouteKey` when exactly one option exists; and
- a bounded status such as `selection_required`, `resolved`, or `unavailable`.

The preview and route-change writes accept stable route keys. The database resolves the numeric route ID only after the version is authoritative.

### RPC compatibility

Do not change an existing PostgreSQL function signature in place. PostgreSQL treats a changed argument list as a different overload, and the repository already carries legacy/new overload compatibility.

Recommend:

- add `lockdin_complete_onboarding_v2(...)` without `p_level` and with structured per-subject route selections;
- add `lockdin_replace_user_subjects_v2(...)` with route selections for newly added subjects;
- add `lockdin_change_user_subject_route(...)` for one existing membership;
- optionally add a read-only internal resolver function for preview, but keep the public HTTP API as the client contract;
- retain v1 functions through the compatibility window with their existing grants;
- revoke v1 execute only at the cutover when old frontend traffic is no longer supported; and
- drop v1 functions later in a separate cleanup, not in the additive first deployment.

Every definer function must use schema-qualified objects, `SET search_path = ''`, explicit `PUBLIC`/`anon`/`authenticated` revokes followed by only the intended grant, `auth.uid()` verification, narrow return values, and a consistent lock order. Current Supabase guidance distinguishes grants from RLS and warns that definer functions run with owner privileges, so execute privileges are part of the security boundary.

## Subject Detail and Relevance

### Information architecture

Subject Detail should present:

1. subject and pinned syllabus label/exam board;
2. intended exam session;
3. derived qualification target and plain-language pathway;
4. current-sitting papers first and carried-forward papers separately labelled;
5. route-relevant syllabus content by default; and
6. an explicit “All syllabus content” view with unchanged progress controls.

### Learning-outcome relevance algorithm

For each normalized learning outcome, inspect all `learning_outcome_components` occurrences once:

- `syllabusWide = true` when any occurrence has `component_id IS NULL`; such an outcome is relevant to every route regardless of the occurrence's stored level label.
- `currentFocus = true` when any non-null occurrence's component is in the route with role `current_sitting`.
- `priorStage = true` when any occurrence matches only a `carried_forward` component.
- `routeRelevant = syllabusWide OR currentFocus OR priorStage`.
- AS-only and A-Level occurrences match through their concrete level-aware component IDs, not by comparing a global level string.
- “AS & A Level” and component-null occurrences remain once in the normalized outcome and carry a syllabus-wide badge.
- When the same normalized outcome has multiple matching occurrences, return one outcome with aggregated component/role badges; never duplicate the text.

Use one batched query/join for the version's outcomes, occurrences, route components, and roles. Do not issue a query per outcome.

### Topic relevance

- `relevant`: every child outcome is route-relevant.
- `partially_relevant`: at least one child outcome is relevant and at least one is not.
- `not_route_relevant`: no child outcome is relevant.
- Syllabus-wide outcomes force at least partial relevance and carry their own badge; do not invent a fourth progress state.

Topic progress status and percentage remain unchanged. The primary percentage is still completed topics divided by all topics in the pinned syllabus, including when the route changes.

## Past-Paper Design

- Primary picker: route components with `current_sitting` role, ordered as reviewed.
- Secondary action: “Choose a different paper from this syllabus.”
- Carried-forward components: not primary defaults; show in a separately labelled historical/context group where helpful.
- Off-route selection: show an explicit warning, then permit only after the existing same-subject/same-pinned-version check passes.
- Route-null legacy membership: show all pinned-version components with a route-unconfirmed notice.
- Submission records the attempt only. It never changes `assessment_route_id`.
- All historical attempts remain visible after route changes, including attempts outside the current route and attempts whose component is later unavailable for new selection.

## Conceptual Migration 0016

Migration `0016` remains **justified but not authorized or created**.

### Tables

- Add `assessment_route_sets`.
- Add `assessment_routes`.
- Add `assessment_route_components`.

### Existing-table changes

- Add the composite uniqueness required on `assessment_components(syllabus_version_id, id)`.
- Add nullable `user_subjects.assessment_route_id`.
- Add the composite membership-route foreign key and supporting index.
- Keep `profiles.level`; do not rewrite it.

### Functions

- Add route-set publication/integrity validation for trusted tooling.
- Add v2 onboarding and replacement functions.
- Add narrow route-change function.
- Preserve strict version resolver unchanged unless a proven defect emerges.
- Preserve v1 signatures during the compatibility window.

### RLS and grants

- Enable RLS on every new public table.
- Revoke all route-table privileges from `PUBLIC`, `anon`, and `authenticated` by default.
- Serve route reads through authenticated application API endpoints using the trusted server database path; ordinary users receive reference data, not direct mutation rights.
- Grant importer/publication writes only to the existing trusted operator path.
- Keep `user_subjects` directly read-only for authenticated users; all route writes go through reviewed RPCs.
- If a later decision exposes route tables directly through the Data API, add explicit SELECT grants and read-only policies then. Do not assume public-schema tables are automatically exposed.

### Ordered migration/backfill

1. preflight exact migration/hash/host target;
2. apply additive tables, constraints, RLS, revokes, nullable membership column, and dormant v2 functions;
3. verify no existing row, pin, progress, task, date, or attempt changed;
4. build and review route tooling outside migration;
5. import and publish route contracts for all nine versions;
6. deploy backward-compatible route read/preview API;
7. deploy frontend and v2 writes behind a cutover gate;
8. classify legacy memberships, auto-assign only unique matches, and prompt ambiguous rows;
9. prove zero unexpected/unresolvable rows and complete user confirmations; and
10. add final database non-null enforcement only in a later migration after null count is zero.

### Pre/post checks

- exact migration head/hash and target safety;
- table/column/constraint/index/RLS/grant/function inventory;
- zero cross-version route/component or membership/route rows;
- exactly one published route set per route-enabled version;
- every published route non-empty with current-sitting components;
- all nine expected content hashes unchanged;
- membership pins/sessions unchanged;
- profile-level values unchanged;
- progress/task/date/attempt counts and ownership unchanged; and
- API old/new compatibility smoke.

### Migration rollback boundary

The additive schema can remain dormant safely. Routine rollback disables feature/API exposure and stops writes; it does not drop tables, delete routes, null user selections, or reverse pins. Physical schema removal is allowed only before any route data or membership reference exists and only through a separately reviewed migration.

## Staged Rollout Compatibility

| Stage | Old frontend | New frontend | Old API | Route null allowed | Stranding risk/control |
| --- | --- | --- | --- | --- | --- |
| 0. Evidence/design only | Works | Not deployed | Works | Yes | None |
| 1. Additive 0016 dormant | Works unchanged | Not deployed | Works unchanged | Yes | No behavior change |
| 2. Nine route contracts imported/published | Works unchanged | Not deployed | Works unchanged | Yes | Runtime ignores route layer |
| 3. Backward-compatible read/preview API | Works | Can be tested behind flag | Works; v1 writes remain | Yes | Preview failure falls back to old product before cutover |
| 4. New frontend compatibility mode | Works during bounded cache window | Works; legacy null shown safely | v1 and v2 available | Yes for existing/v1 | Do not declare route mandatory yet |
| 5. New-write cutover | Cached old UI must refresh; do not silently create ambiguous nulls | Works through v2 | v1 write returns bounded upgrade-required response or is revoked after cache window | Legacy only | Auth and historical reads remain available |
| 6. Legacy auto-backfill/prompt | Reads still work | Works | v2 authoritative | Legacy ambiguous/unresolvable only | No silent assignment; deferrable confirmation |
| 7. Legacy completion | Unsupported | Works | v2 only | Expected zero | Verify before tightening |
| 8. Later non-null migration | Unsupported | Works | v2 only | No | Apply only after proven zero nulls |

Google OAuth users entering during partial rollout use the same profile/onboarding state machine. Before Stage 5, v1 compatibility remains; after Stage 5, all providers use v2 and an outdated client receives a refresh-required response without creating partial state.

## Rollback Strategy

| Failure point | Rollback action | Preserved state |
| --- | --- | --- |
| Additive migration deployed, UI absent | Leave dormant schema in place; keep feature flag off | All existing data and Auth |
| Route contracts imported, UI fails | Stop publication/cutover; keep immutable route data unreferenced | Pins, progress, tasks, attempts |
| Preview/read API fails | Roll back API deployment or disable route endpoints before new-write cutover | Old frontend/API remain valid |
| New onboarding fails before cutover | Disable new UI and v2 calls; retain v1 temporarily | Existing onboarding path |
| New onboarding fails after cutover | Keep Auth/login/read access, return bounded maintenance/refresh state, repair v2; never fall back to partial membership creation | No partial profiles/memberships/tasks |
| Legacy classifier shows unexpected ambiguity | Stop before writes or stop next batch; leave unresolved rows null | Membership pins and history |
| A published route contract is wrong | Do not edit/delete it; prepare reviewed replacement contract and explicit mapping/confirmation plan | Hash truth and referenced history |
| Route UI causes severe regression | Hide route-focus UI while preserving stored selections; all-content and historical reads continue | User data and route references |

## Failure Modes

| Failure | Fail-closed behavior | User-facing behavior | Operator action |
| --- | --- | --- | --- |
| No route set for version | No new membership/route claim | “Study route is temporarily unavailable”; existing all-content access remains | Supply reviewed route evidence |
| Duplicate route key | Validator/import aborts | None; never published | Correct manifest |
| Missing component reference | Validator/import aborts | None | Correct source mapping |
| Cross-version component | Composite FK/import aborts | None | Correct manifest/version target |
| Membership cross-version route | Composite FK/RPC rejects | Refresh/reselect; no pin change | Investigate stale/forged input |
| Zero route options after version resolution | Final write rolls back | No compatible route available | Audit route coverage/session rules |
| Multiple routes where client expected one | No auto-selection | Ask user to choose after refresh | Verify preview/final consistency |
| Legacy membership ambiguous | Leave route null | Deferrable confirmation prompt | Monitor unresolved count |
| Legacy membership unresolvable | Leave null; route operations disabled | Historical/all-content access plus support message | Repair reference/invariant |
| Manifest/source mismatch | Evidence gate aborts | None | Re-review official source |
| Route hash mismatch | Import/publication/runtime integrity fails | Route feature unavailable, not guessed | Recompute and compare database graph |
| Route change races replacement | Shared lock order serializes; stale operation conflicts | Retry on current membership | Inspect concurrency logs |
| Stale route key/updatedAt | RPC rejects without update | Refresh choices | None unless recurring |
| Mutation after publication | Trigger/tooling rejects | None | Create new route-set revision |
| Google OAuth user during partial rollout | Same v1/v2 gate as password user; no partial onboarding | Refresh/maintenance message | Complete or roll back deployment stage |

## Security Boundary

| Threat | Control |
| --- | --- |
| Forged route ID/key | Clients write stable key only; RPC resolves it inside the locked membership/resolved version |
| Cross-user membership | `auth.uid()` is the only owner source; no user ID parameter; ownership RLS remains |
| Cross-version route | Composite membership/route FK plus RPC validation |
| Cross-subject component | Component → version and membership subject/version constraints |
| Stale client | Final re-resolution, published-set hash/state check, and optional `expectedUpdatedAt` |
| Direct REST update | `user_subjects` UPDATE remains revoked; route reference writes revoked |
| RLS bypass | Narrow server/RPC surface, explicit grants, no service key in browser, automated RLS tests |
| Definer misuse | Empty search path, schema-qualified names, explicit revokes/grants, caller check, narrow return, reviewed owner |
| Replacement/change race | Profile-first then membership lock order and stale-write conflict |

Supabase's current model treats table grants and RLS as separate controls. The 2026 Data API change also means new public tables must not be assumed to be exposed automatically; the migration must state grants explicitly. This design intentionally keeps authenticated route reads behind the API and all writes behind trusted importer or RPC boundaries.

## Privacy, Analytics, and Monitoring

- Route key, qualification target, pathway, and paper combination are study data. Do not add them to PostHog.
- Preserve the existing four-event allow-list and `onboarding_completed.subject_count`; route work does not independently justify a new event or property.
- Do not send route labels, paper combinations, request bodies, profile level, or free text to Sentry.
- Review Sentry sanitizers for new bounded error codes. Safe diagnostics may include operation name and a non-user-specific error category; avoid membership IDs and route labels unless a specific debugging need is approved.
- Backfill evidence should use aggregate counts and pseudonymous/controlled operator records, not a committed user-membership export.

## Performance Design

- Route option preview is bounded to at most five onboarding subjects and should batch version/route/component reads.
- Membership listing should fetch route/set/components in one or a small constant number of batched queries, not per membership.
- Subject Detail relevance should join only one pinned version and one route, aggregate occurrences in the API, and reuse existing ordered graph loading.
- Past-paper filtering uses the small route/component junction and existing component IDs.
- Expected cardinality is low: a handful of routes/components per version. Do not denormalize route arrays onto memberships or outcomes.
- Measure `EXPLAIN (ANALYZE, BUFFERS)` on representative preview, membership, Subject Detail, and picker queries before adding indexes beyond FK/read-path support.

## Test Matrix

### Database and migration

- migration integrity count/head/hash and clean rebuild;
- all composite FK positive/negative cases;
- duplicate route set/key/component rejection;
- cross-version route/component and membership/route rejection;
- published-set mutation rejection and draft rebuild allowance;
- publication empty/current-sitting/hash checks;
- route RLS/grants for anon, authenticated, importer, and server paths;
- v2 onboarding/replacement/change atomicity, Auth ownership, stale conflict, and lock concurrency;
- old signatures remain callable only during the declared compatibility stage.

### Reference data

- JSON schema and deterministic normalization;
- nine manifest presence only when each has evidence/audit approval;
- component natural-key resolution inside exact version;
- route semantic duplicate detection;
- route hash changes for qualification, role, progression, order, label, or component change;
- DB route graph re-hash equality;
- published immutability and replacement-contract workflow;
- structural validator never claims official correctness without audit status.

### Backfill

- one candidate auto-assigns idempotently;
- multiple candidates remain null;
- zero candidates/missing set remain null and emit bounded operator status;
- profile level, year label, progress, tasks, and attempts never influence assignment;
- batching/rerun does not overwrite a user-confirmed route;
- all pin/session/content hashes and historical counts remain unchanged.

### API

- preview hides version IDs and returns only routes for strict resolution;
- final onboarding re-resolves and rejects stale/cross-version keys;
- membership responses handle transitional null and final non-null route;
- retained replacement preserves pin/session/route;
- additions require route; removals do not alter other memberships;
- route change owns caller, locks row, and changes only route/timestamp;
- component list/past-paper write remains pinned-version safe;
- profile update rejects level after deprecation; GET compatibility is explicit;
- code generation has no drift.

### Frontend

- unique route auto-selection and read-only confirmation;
- multiple-route selector with paper recognition and keyboard/screen-reader support;
- route preview loading/error/stale refresh states;
- final review by subject;
- Settings confirmation and stale conflict;
- deferrable ambiguous legacy flow and all-content fallback;
- Subject Detail route/full-content toggle, outcome deduplication, syllabus-wide content, and partial-topic labels;
- Past Papers current-sitting defaults, carried-forward grouping, warned off-route flow, and no route mutation;
- responsive/mobile, focus order, reduced motion, and error recovery.

### Regression and Phase 7 revalidation

- strict resolver zero/ambiguous behavior and no client version authority;
- no automatic repin, including real successor simulation;
- profile/onboarding atomicity and Google/password convergence;
- topic progress percentage invariant across route changes;
- progress notes, tasks, dates, and attempt preservation;
- PostHog allow-list unchanged and Sentry sanitization safe;
- serialized Linux CI, Production build, migration/codegen checks, hosted smoke, and RC quality gates.

## Measurable Acceptance Gate

Implementation must not begin until the design is approved. Feature cutover must not occur until all of the following are proven:

1. clients cannot send or influence syllabus-version identity;
2. no arbitrary paper combination can be stored;
3. database constraints reject every cross-version route/component/membership fixture;
4. all nine current published versions have reviewed official route coverage and reproducible route hashes;
5. every new membership is created atomically with one valid route;
6. ambiguous legacy members are never silently assigned or locked out of historical/core access;
7. global profile level is absent from onboarding and active edit/display paths while stored values remain unchanged;
8. route change modifies no pin, session, progress, task, date, attempt, or profile data;
9. primary progress percentages are byte-for-byte/equivalently unchanged when route alone changes;
10. historical attempts remain readable and same-version off-route attempts remain explicitly possible;
11. published route semantics have official provenance, human review, independent hash verification, and database immutability;
12. old/new deployment compatibility is proven through the cutover matrix without partial onboarding;
13. RLS, grants, definer functions, direct REST denial, and stale/race cases pass;
14. analytics properties remain unchanged and Sentry emits no sensitive route detail; and
15. the complete affected Phase 7 test/release map passes before feature freeze.

## Seven-Subject Adoption Impact

Every no-import audit for Information Technology, Accounting, Psychology, Geography, Sociology, English General Paper, and English Language must now add:

- official route source and validity period;
- qualification targets;
- all valid and prohibited route/component combinations;
- current-sitting and carry-forward semantics;
- progression/carry-forward eligibility;
- whether session-specific route availability exists;
- whether the student sees one or multiple route choices;
- proposed stable route keys and plain-language labels;
- compatibility with the route-set/route/component-role model; and
- any evidence that requires an architecture extension.

Do not research, import, or approve these subjects in this design. A candidate cannot be READY FOR ADOPTION until both its syllabus graph and route contract pass the full evidence, validation, hash, publication, resolver, UI, and test gates.

## Future Syllabus Revisions

- A real r002 receives its own content graph and route set.
- Existing r001 memberships keep both their r001 pin and r001 route.
- DEFAULT/applicability changes never migrate memberships or routes.
- A later explicit version migration uses a reviewed mapping from old route semantic identity to the new route set.
- Auto-map only a unique reviewed equivalent. Multiple, changed, or absent equivalents require explicit confirmation or remain safely pinned.
- Past attempts continue to reference their original components. Progress/tasks/dates require their own already-approved preservation/mapping rules and are never deleted merely because a route changes.

## Future Implementation Slices

| Slice | Goal | Dependencies | Primary risk | Likely areas | Migration/config impact | Acceptance gate |
| --- | --- | --- | --- | --- | --- | --- |
| A. Route reference schema/tooling | Add route set/entity/junction design and JSON validation/hash/import/publication support | Approved design | Hash/immutability error | `lib/db/src/schema`, `scripts/src/syllabus`, migration tests | Conceptual 0016; no hosted apply yet | Structural/integrity suite passes |
| B. Nine-subject evidence/backfill | Produce reviewed route manifests/audits | A tooling, official sources, reviewers | Invented route semantics | future `data`/`docs/reference-data` route area | Reference data only | 9/9 official audits pass |
| C. Additive migration/API compatibility | Add nullable route storage, v2 RPCs, reads/preview/contracts | A+B | Old/new incompatibility, RLS | migrations, OpenAPI, API routes/libs, generated clients | 0016 plus codegen | Compatibility and security matrix passes |
| D. Legacy resolution | Classify/auto-assign unique rows and build confirmation states | Published 9/9 routes, C | Silent misassignment | backfill tooling, API, Settings | Hosted data operation requires separate approval | Dry-run counts reviewed; ambiguous untouched |
| E. Onboarding/frontend | Remove global level and add conditional per-subject routes | C, route coverage | Partial onboarding/UX overload | onboarding, AuthProvider, Settings, tests | No new migration | Atomicity and responsive/a11y pass |
| F. Subject Detail/Past Papers | Add route context, relevance, defaults, warnings | C+E | Progress/history regression | subject detail, subjects/papers API/UI | No new migration | Invariants and UX tests pass |
| G. Controlled hosted apply/cutover | Apply migration/data/API/UI in staged order | A–F approval | Production incompatibility | deployment/runbooks | Hosted migration/reference import/config gates | Stage-by-stage smoke and rollback proof |
| H. Integrity revalidation | Re-run Phase 7 and RC gates | G | Hidden cross-system regression | complete test/release surface | None unless remediation approved | Full acceptance list passes |

No slice is authorized by this plan.

## Open Owner Decisions Exposed by This Design

The approved product model is not reopened. Three implementation-risk choices require owner confirmation:

1. **Existing r001 integrity:** approve the recommended independently hashed, versioned route-reference contract attached to r001, rather than reopening/re-hashing published content graphs or fabricating successor syllabus revisions.
2. **Ambiguous legacy timing:** approve deferrable route confirmation with uninterrupted core/history access, rather than an immediate post-login hard gate.
3. **Student-facing terminology:** approve the final copy set for `single_series`, `staged_completion`, `full_same_series`, current-sitting, and carried-forward concepts after the nine-subject evidence audit proves the real choices.

Everything else in this design is an implementation consequence of the approved model or an existing security/data invariant.

## Recommended Next Action

**OWNER REVIEW OF THIS DETAILED DESIGN.** Approve or amend the three open implementation-risk choices above before authorizing migration `0016`, route-manifest creation, or any implementation slice.

---

## Owner Study-Route Implementation Design Decision — APPROVED

**Decision date:** 2026-09-03

**Authority:** Lockdin owner

**Status:** APPROVED, subject to the route-set lifecycle clarification recorded below

This decision approves the Detailed Study-Route Implementation & Migration Design above. The prior design text remains unchanged as the proposal and rationale; this section is the authoritative owner decision and clarification.

### Approved Design Status

| Item | Owner decision |
| --- | --- |
| Detailed study-route design | **APPROVED** |
| Existing-r001 independent route contracts | **APPROVED** |
| Deferrable ambiguous legacy confirmation | **APPROVED** |
| Final student terminology | **DEFERRED UNTIL NINE-SUBJECT ROUTE AUDIT** |
| Route-set lifecycle clarification | **APPROVED** |
| Conceptual migration `0016` | **JUSTIFIED** |
| Migration `0016` implementation | **NOT YET PERFORMED** |
| Hosted migration apply | **NOT AUTHORIZED BY THIS DOCUMENTATION TASK** |

### Existing r001 Route-Contract Strategy — Approved

Use independently versioned and independently hashed route-reference contracts attached to the existing immutable syllabus version.

Preserve `syllabus_versions.content_sha256` unchanged. The complete reference-contract identity is conceptually the independently reproducible pair:

```text
content_sha256
+
route_manifest_sha256
```

Do not reopen a published r001 syllabus graph, recompute its historical content identity as though route data had always existed, mutate published syllabus content, fabricate r002 merely to introduce route metadata, or repin memberships.

### Ambiguous Legacy Memberships — Approved

Route confirmation may be deferrable for an existing membership when no route can be safely inferred. Do not silently assign a route.

An ambiguous member retains authentication, Dashboard, Study Plan, progress, notes, tasks, exam dates, historical past-paper attempts, all-syllabus Subject Detail, and access to components from the same pinned syllabus version wherever route-specific filtering cannot safely be applied.

Show a non-destructive **Confirm your study route** state where appropriate. A route-dependent experience may require confirmation when the route becomes necessary, without turning the unresolved route into a general account lockout.

### Student-Facing Terminology — Deferred

Internal canonical concepts may use structured identifiers such as `single_series`, `staged_completion`, `full_same_series`, `current_sitting`, and `carried_forward`.

These identifiers are not approved as final student-facing labels. Final plain-language wording must be reviewed after the nine-current-subject route evidence audit establishes the real route patterns students need to recognize.

### Route-Set Lifecycle Clarification — Approved

A syllabus version may have an older **retired** route-reference contract and a newer **published** route-reference contract. Retirement does not invalidate an existing membership reference.

#### Current Selectable Routes

- New memberships may select only a route from the current published route set for the exact server-resolved syllabus version.
- Route-option and onboarding-preview reads expose only that current published route set.
- A route change may move a membership only to a route from the current published set, after explicit authenticated and validated user action.

#### Historically Referenced Membership Routes

- An existing membership may continue referencing a route whose parent route set is retired.
- Runtime membership reads resolve the stored `assessment_route_id` directly and return its canonical route context even when the parent set is retired.
- The referenced route remains readable and historically valid.
- Route-set retirement never nulls, rewrites, automatically maps, or otherwise changes a membership's route selection.

#### Replacement Route Contracts

- Publishing a replacement route set changes which routes are selectable for new memberships and explicit route changes; it does not invalidate or migrate existing selections.
- An existing membership may be migrated automatically only through a separately authorized process where a unique, reviewed semantic equivalent is proven.
- Where equivalence is absent or ambiguous, retain the old route or require explicit confirmation.
- Runtime code must therefore distinguish **current selectable route resolution** from **stored historical membership-route resolution**. Statements that runtime APIs read only the published set apply to option/preview and new-selection paths, not to membership reads.

### Authorization Boundary

This approval freezes the design and lifecycle semantics. It does not authorize source, test, schema, migration, route-manifest, reference-data, import/publication, hosted-service, or configuration changes. Migration `0016` remains justified but uncreated. No implementation slice, hosted migration apply, membership migration, commit, push, or participant invitation is authorized by this documentation task.

### Recommended Next Action

Commission the documentation-only official route evidence audit for all nine current subjects, including lifecycle-compatible route equivalence evidence and candidate student terminology, before authorizing migration `0016`, route-manifest creation, or implementation.
