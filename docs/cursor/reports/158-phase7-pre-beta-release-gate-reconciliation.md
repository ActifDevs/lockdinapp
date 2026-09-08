# LOCKDIN — PHASE 7 PRE-BETA / RELEASE-GATE RECONCILIATION

**Report:** 158

**Date:** 2026-09-08

**Mode:** READ-ONLY / AUDIT / DECISION GATE

**Repository baseline:** `980e70bfd4f1847a781ca93259a1e80ade9af896`

## 1. Executive decision

Lockdin's B5D, B5E, B5F, and B5G engineering findings are reconciled and closed. Current Production contains the authorized product implementation, is healthy in the bounded checks performed for this report, and matches the canonical database invariants.

Lockdin is **not yet at the controlled-beta entry gate**. No open B5D/B5E/B5F/B5G defect blocks it, but required pre-beta work frozen in Report 120 has no closing evidence: the two participant-facing privacy statements remain factually stale; the required Help & Support experience and owned operational contacts are not evidenced; hosted Google OAuth remains off despite the later owner decision making Google OAuth pre-beta required; successful password-recovery completion is still unproven; full Release Candidate QA has not occurred; and feature freeze has not been recorded.

Technical readiness for controlled beta is therefore **BLOCKED by incomplete pre-beta product/release work**, not by catalogue, route, visibility, runtime, or data-integrity failure. Real participant invitations are independently **NOT AUTHORIZED** because compliance/DPC/age/guardian and operational-owner gates remain unresolved. The DPC request for an online meeting is not approval.

The strongest next action is a **PRE-BETA SCOPE FREEZE** that resolves the conflict between Report 120's initial candidate classifications and its later owner-approved revised scope, records the exact remaining mandatory set, and then authorizes the smallest implementation slice. Irrespective of that decision, the two known `/privacy` claims are current factual defects and must be corrected before participants are invited.

### Evidence provenance

- **CURRENT READ-ONLY VERIFICATION:** freshly fetched Git baseline, live Vercel deployment state/timestamps, four Production health requests, bounded one-hour error-level Vercel log queries, and aggregate-only Production SQL with `default_transaction_read_only=on` plus `BEGIN READ ONLY`.
- **FROZEN HISTORICAL REPORT EVIDENCE:** Reports 113–157, with Reports 144–157 used to reconcile B5D–B5G and later closeouts superseding earlier blocked reports.
- **REPOSITORY / TEST EVIDENCE:** current source/config inspection and preserved test/build results on the exact Production product SHA.
- **EXTERNAL / COMPLIANCE STATUS:** the supplied current baseline and repository participant-process documents; no legal approval is inferred.

## 2. Repository/deployment baseline

### Repository

| Field | Result | Provenance |
| --- | --- | --- |
| Root | `C:/Users/USER/lockdinapp` | Current Git verification |
| Branch | `main` | Current Git verification |
| HEAD | `980e70bfd4f1847a781ca93259a1e80ade9af896` | Current Git verification |
| Fresh `origin/main` | `980e70bfd4f1847a781ca93259a1e80ade9af896` | `git fetch origin --prune`, current verification |
| Ahead / behind | `0 / 0` | Current Git verification |
| Initial working tree | Clean | Current Git verification |
| Allowed final change | This Report 158 only | Repository boundary |

The only commit after the validated product implementation SHA `438876648ca5cf18d07a7085a109ce7e18cf2536` is the documentation-only Report 157 freeze commit. Production is not stale merely because it serves the product SHA rather than the documentation descendant.

### Production deployments

| Surface | Deployment ID | Current state | Product Git SHA | Branch | Created |
| --- | --- | --- | --- | --- | --- |
| Canonical Web (`lockdinapp-web`) | `dpl_6Uefg1Ufw99NSwztKT9dQqZgjQQX` | `READY` | `438876648ca5cf18d07a7085a109ce7e18cf2536` | `main` | 2026-09-08 19:02:46 UTC |
| Standalone API (`lockdinapp`) | `dpl_9jNseSAmEUrYp1bFkyxYpqKNfZpS` | `READY` | `438876648ca5cf18d07a7085a109ce7e18cf2536` | `main` | 2026-09-08 19:02:46 UTC |

Current Vercel inspection established deployment ID, target `production`, `READY` state, aliases, and timestamp. Report 157 supplies the frozen Git SHA/branch association for those exact IDs. No redeploy was performed or required.

## 3. Phase 7 sequence status

| Stage | Status | Reconciliation |
| --- | --- | --- |
| 1. Readiness engineering | COMPLETE | Analytics, monitoring, Auth hardening, restore proof, participant-material foundation, route/catalogue work, and B5 remediation are evidenced. |
| 2. Universal Technical Checkpoint | COMPLETE | Historical checkpoint/reconciliation evidence exists; later implementation and closeouts supersede its earlier gaps where explicitly closed. |
| 3. Pre-Beta Product Reconciliation | COMPLETE | Report 120 exists and includes a later owner-approved revised scope. |
| 4. Decisions / scope freeze | CURRENT / INCOMPLETE | Product-model decisions progressed through Reports 121–133, but no single final pre-beta scope-freeze record reconciles Report 120's initial and later scope classifications. |
| 5. Approved implementation | PARTIAL / BLOCKED | B5 route/catalogue/visibility/accessibility work is complete; privacy/support/OAuth pre-beta requirements lack closure. |
| 6. Integrity revalidation | PARTIAL | B5 database/runtime integrity repeatedly passed, including current verification; complete affected Phase 7 revalidation still belongs to the frozen RC gate. |
| 7. Release Candidate QA | PENDING / BLOCKING | B5D and B5G were targeted QA, not the complete Report 120 RC matrix. |
| 8. Feature freeze | PENDING / BLOCKING | No frozen RC candidate baseline is recorded. |
| 9. Controlled beta | BLOCKED | Technical pre-beta gates and separate invitation authorization remain incomplete. |
| 10. Blocker / critical UX fixes | NOT YET APPLICABLE | Begins only after beta evidence, except pre-beta blockers identified here. |
| 11. Final regression | NOT YET APPLICABLE | Post-beta stage. |
| 12. Final closeout | NOT YET APPLICABLE | Phase 7 is not closed. |
| 13. Public-release gate / signoff / domain | NOT YET APPLICABLE | Public-release work follows beta closeout. |
| 14. Public release | NOT YET APPLICABLE | Not evaluated as ready. |

## 4. Historical issue reconciliation

| Issue / gate | Original severity/status | Resolution | Evidence | Current status |
| --- | --- | --- | --- | --- |
| B5D-001 Settings route-less enrollment | Defect | Route-aware enrollment/remediation UI shipped and passed Production QA | Reports 135, 136, 144 | CLOSED / FIXED IN PRODUCTION |
| B5D-002 safe validation feedback | Validation gate | Client validation passed; server validation remained automated-coverage evidence | Report 144 | CLOSED / PASS |
| B5D-003 multi-group options | Defect | Required 1/1 groups enforced | Reports 137, 138, 144 | CLOSED / FIXED IN PRODUCTION |
| B5D-004 route/option hydration | Defect | Navigation, reload, and re-auth persistence passed | Reports 139–144 | CLOSED / FIXED IN PRODUCTION |
| B5D-005 route transition semantics | Defect | Full → AS removes inapplicable options; AS → Full does not silently resurrect them | Reports 140, 144 | CLOSED / FIXED IN PRODUCTION |
| B5D-006 off-route Past Papers warning | MEDIUM / OPEN | Same-version off-route paper selectable with warning; on-route warning absent; route/version unchanged | Reports 151–152 | CLOSED / FIXED IN PRODUCTION |
| B5E-001 Geography Settings save state | HIGH / BLOCKED | Implementation fix plus Production retest and persistence proof | Reports 148–150 | CLOSED / FIXED IN PRODUCTION |
| A11Y-001 route radio keyboard model | MEDIUM | Native radio semantics and arrow-key model implemented and Production-verified | Reports 153–155, 157 | CLOSED / FIXED IN PRODUCTION |
| A11Y-002 panel focus restoration | MEDIUM | Dialog/Sheet close restores focus | Reports 153–155, 157 | CLOSED / FIXED IN PRODUCTION |
| A11Y-003 Study Plan readable validation | MEDIUM, then Production regression | Schema message corrected and empty-subject Production proof passed | Reports 153–157 | CLOSED / FIXED IN PRODUCTION |
| A11Y-004 mobile More Escape | MEDIUM | Escape closes disclosure and restores focus | Reports 153–155, 157 | CLOSED / FIXED IN PRODUCTION |
| B5E unexplained intermediate HTTP 400 | REVIEW NOTE | No reproducible save/persistence failure; later clean health and tests | Report 150 and later evidence | ACCEPTED REVIEW NOTE; investigate only if it recurs |
| Dedicated B5D keyboard smoke | NOT EXECUTED | Superseded by targeted B5G keyboard/accessibility work | Reports 153–157 | SUPERSEDED / CLOSED AS GAP |
| Full accessibility certification | NOT CLAIMED | Targeted findings closed; no broader certification performed | Reports 153–157 | ACCEPTED EVIDENCE BOUNDARY |

No closed historical finding above is carried into the current open-item register.

## 5. Production/runtime health

| Check | Current result |
| --- | --- |
| Web `/api/healthz` | HTTP 200, `{"status":"ok"}` |
| Web `/api/healthz/db` | HTTP 200, `{"status":"ok","database":"ok"}` |
| API `/api/healthz` | HTTP 200, `{"status":"ok"}` |
| API `/api/healthz/db` | HTTP 200, `{"status":"ok","database":"ok"}` |
| Web Production error-level logs, last hour, max 100 | No entries returned |
| API Production error-level logs, last hour, max 100 | No entries returned |

The API health and DB health results are compatible with the corrected Production transaction-pooler configuration preserved by the exact validated B5G product deployment. No `DATABASE_URL` value was printed or changed.

The bounded log result means **no error-level evidence was observed in the queried one-hour windows**. It is not proof of absence across unlimited history and does not replace Sentry operational review.

## 6. Data/migration integrity

The Production aggregate query set `default_transaction_read_only=on`, opened `BEGIN READ ONLY`, and performed no mutation. One first query batch reached an invalid final Feb/Mar column name after returning the preceding aggregates; PostgreSQL aborted that transaction. A corrected, separate read-only transaction then verified the remaining aggregates and rolled back normally.

| Invariant | Current result | Expected | Status |
| --- | ---: | ---: | --- |
| Migration rows / repository head | 21 / `0020_subject_visibility_grants` | 21 / `0020_subject_visibility_grants` | PASS |
| Subjects | 16 | 16 | PASS |
| Syllabus versions | 29 | 29 | PASS |
| Published / retired versions | 21 / 8 | 21 / 8 | PASS |
| Route sets | 29 | 29 | PASS |
| Routes | 95 | 95 | PASS |
| Memberships | 15 | 15 | PASS |
| Route-assigned memberships | 2 | 2 | PASS |
| Persisted option selections | 3 | 3 | PASS |
| Current-nine globally selectable | 9/9 | 9/9 | PASS |
| New-seven globally selectable | 0/7 | 0/7 | PASS |
| Visibility grants | 0 | 0 | PASS |
| Feb/Mar product-auto-assign rows | 0 | 0 | PASS |
| Tasks / past-paper attempts | 16 / 10 | Frozen 16 / 10 | PASS |
| New-seven memberships / attempts | 0 / 0 | 0 / 0 temporary residue | PASS |

**Drift:** none observed in the requested aggregate invariants. No QA fixture or Production data change was made.

## 7. Catalogue/routes/options

All intended subjects exist with coherent version and route totals:

- Current nine: 9231, 9489, 9609, 9618, 9700, 9701, 9702, 9708, 9709 — 9/9 globally selectable.
- New seven: 8021, 9093, 9626, 9696, 9699, 9706, 9990 — 0/7 globally selectable and no current Production membership/attempt residue.
- Full catalogue: 16 subjects, 29 versions, 21 published, 8 retired, 29 route sets, and 95 routes.

Frozen schema, integration tests, migration/harness evidence, and B5D Production QA support the intended model:

- each membership pins one exact syllabus version and at most one canonical route in that version;
- exactly one valid route may be selected automatically; ambiguity requires explicit user choice;
- option groups enforce min/max and route-target applicability;
- persisted options hydrate;
- Full → AS removes only now-inapplicable choices;
- returning AS → Full does not silently resurrect removed choices;
- retirement/default changes do not rewrite memberships or auto-repin users.

No destructive route QA was repeated in this report.

## 8. Controlled visibility

Migration `0020` and current source preserve one shared server predicate: a subject is available for new membership when globally selectable **or** when the authenticated user has a matching subject visibility grant. The catalogue and membership-creation paths use that predicate. Frozen integration/harness evidence covers ordinary users, granted users, cross-user isolation, deletion of grants, and retained hidden memberships.

Grant DML remains service-role controlled. Production currently has zero grants; the current nine remain open and the new seven remain globally hidden. The mechanism itself is **technically ready**, but using it for real participants remains subject to the beta invitation gate.

## 9. Core product flows

| Flow | Current evidence state |
| --- | --- |
| Current-nine onboarding/enrollment | Implemented; session-aware assignment and route-aware membership covered |
| New-seven controlled enrollment | B5E grant-isolation and internal QA passed; no current grant or membership |
| Settings updates | Route/option selection, save, hydration, persistence, and Geography fix passed |
| Study Plan create/complete | Production evidence passed |
| Study Plan retry/error behavior | Preserved automated evidence; no new current failure |
| Study Plan readable validation/focus | A11Y-003 fixed in Production |
| Study Plan edit | Historical browser path explicitly not executed because no shipped Edit control was exercised; not a regression in a promised edit flow |
| Past Papers on-route/off-route | B5D-006 fixed in Production; route/version are not mutated by an attempt |
| Full RC journey matrix | Not executed; remains a release-process blocker |

Recent B5E/B5F evidence is reused; no temporary 9093 QA state was recreated.

## 10. Accessibility/responsive

- A11Y-001 through A11Y-004: **FIXED IN PRODUCTION**.
- Targeted 390 × 844 responsive smoke: **PASS**.
- Keyboard trap: **NONE FOUND** in the targeted audit.
- Current B5G status: **CLOSED / PASS**.
- Full accessibility certification: **NOT CLAIMED**.

No known accessibility item remains a standalone controlled-beta blocker. The complete RC accessibility/responsive/cross-browser matrix is still a **release-process gate**, not evidence that the four fixed findings reopened.

## 11. Observability

| Area | State | Beta classification |
| --- | --- | --- |
| Runtime health checks | IMPLEMENTED; four current 200 responses | Not blocking |
| PostHog analytics | IMPLEMENTED server-side with four allow-listed events, HMAC identity, EU project, and no autocapture/replay/heatmaps | Not blocking technically |
| Sentry Web/API monitoring | IMPLEMENTED with sanitization, release/environment tags, request ID, and private source-map evidence | Not blocking technically |
| Additional analytics | DEFERRED; no evidence of need | Not required for controlled beta |
| Automatic Sentry alerts | CONDITIONAL / DEFERRED if a documented daily review owner exists | Not inherently blocking |
| Named monitoring-review/triage owner and daily workflow | NOT EVIDENCED | Blocking invitation operations under Report 120 |

## 12. Auth/invite-only

The latest authoritative hosted evidence preserved in the 2026-09-01 checkpoint records:

| Setting | State |
| --- | --- |
| Public signup | OFF |
| Email/password provider | ON |
| Email confirmation | ON |
| Anonymous access | OFF |
| OAuth | OFF |
| CAPTCHA | OFF / deferred until abuse evidence |
| Site URL | `https://lockdinapp-web.vercel.app` |
| Allowed redirects | `/auth/callback`, `/update-password` on the canonical host |

This is compatible with an invite-only beta in principle. However, Report 120's later owner decision makes Google OAuth part of the required v1 pre-beta experience, while current source defaults `VITE_GOOGLE_AUTH_ENABLED=false` and no later hosted-enable/validation evidence exists. Successful password recovery completion also remains unproven: delivery and the canonical route passed, but the retained one-time action was expired/invalid.

## 13. Compliance/privacy/guardian gate

- DPC Ghana requested an online meeting after prior correspondence.
- That request is **not approval**.
- No authoritative evidence resolves participant jurisdiction/age, minor participation, guardian process, legal/compliance acceptance, or invitation authorization.
- No real participant has been invited.

**REAL CONTROLLED-BETA INVITATIONS: BLOCKED BY COMPLIANCE / EXTERNAL AUTHORIZATION.** This is non-technical and independent of engineering readiness.

Participant-operation truthfulness is also incomplete: `privacy@lockdin.app` is published, but the repository still labels its monitored ownership and the beta coordinator, support owner, privacy/deletion owner, issue-triage owner, monitoring-review owner, and feedback route as owner input required.

## 14. Test/CI state

No current test rerun was needed: `980e70b` differs from the exact deployed/tested product SHA only by Report 157 documentation. Preserved evidence on `438876648` includes:

- focused Study Plan validation: 1 file / 9 tests PASS;
- bounded accessibility regression: 6 files / 37 tests PASS;
- full frontend suite: 48 files / 322 tests PASS;
- frontend typecheck: PASS;
- frontend Production build: PASS;
- migration 0020 disposable rehearsal, visibility integration, route suites, scripts unit/harness, migration checks, and codegen checks: preserved PASS evidence in Reports 146–157.

This is **preserved historical/repository evidence**, not a new execution for Report 158. The current read-only production checks establish runtime and aggregate integrity only. A complete cross-browser/mobile/performance/recovery RC run remains pending.

## 15. Release-gate matrix

| Gate | Evidence | Status | Blocks controlled beta? | Blocks public release? | Required action |
| --- | --- | --- | --- | --- | --- |
| Repository integrity | Fresh fetch; exact SHA; clean start | PASS | No | No | Preserve Report-only diff |
| CI/build | Exact product SHA historical green | PASS / preserved | No | Re-run at final RC/public candidate | RC cadence |
| Production runtime | READY deployments; four 200 health checks | PASS | No | No current blocker | Continue monitoring |
| Database integrity | Current read-only aggregates | PASS | No | No current blocker | Preserve invariants |
| Migrations | 21 / `0020` | PASS | No | No | None |
| 16-subject catalogue | 16/29/21/8 | PASS | No | No current blocker | Preserve |
| Route model | 29 sets / 95 routes; B5D evidence | PASS | No | No current blocker | Preserve |
| Option contracts | Three persisted rows; route applicability evidence | PASS | No | No current blocker | Preserve |
| Session-aware assignment | Schema/resolver/QA evidence | PASS | No | No current blocker | Preserve |
| Controlled visibility | Migration/helper/server predicate/tests; 0 grants | PASS | No | No current blocker | Use grants only when authorized |
| Auth/invite-only | Public signup off; email/confirmation on | PASS WITH OPEN REQUIRED AUTH ITEMS | Yes | Yes | Decide/finalize OAuth; prove recovery |
| Settings | B5D/B5E closeouts | PASS | No | No current blocker | RC regression |
| Onboarding | Automated and historical hosted evidence | PASS / RC PENDING | Via RC gate | Yes | Include in RC |
| Study Plan | Create/complete and validation passed | PASS / RC PENDING | Via RC gate | Yes | Include error/retry matrix in RC |
| Past Papers | B5D-006 fixed in Production | PASS | No | No current blocker | RC regression |
| Responsive | Targeted 390 × 844 PASS | TARGETED PASS | Via full RC gate | Yes | Complete RC device matrix |
| Accessibility | Four findings fixed; no certification | TARGETED PASS | Via full RC gate | Yes | Complete RC audit; claim only evidence obtained |
| Monitoring | Sentry implemented; owner/workflow absent | OPERATIONALLY INCOMPLETE | Yes for beta operation/invites | Yes | Name owner and review workflow |
| Analytics | PostHog implemented; privacy copy stale | TECH PASS / COPY FAIL | Yes | Yes | Correct participant-facing facts |
| Privacy/compliance | DPC meeting request only | BLOCKED | No for internal engineering; yes for invitations | Yes | Complete external/owner process |
| Guardian process | Not resolved | BLOCKED IF MINORS APPLICABLE | Yes for invitations | Yes | Record age scope and applicable process |
| Beta scope freeze | No final reconciled freeze | CURRENT / INCOMPLETE | Yes | Yes | Freeze exact required/deferred scope |
| RC QA | Only targeted B5D/B5G evidence | PENDING | Yes | Yes | Execute Report 120 RC matrix |
| Feature freeze | No RC baseline recorded | PENDING | Yes | Yes | Freeze after RC passes |
| Beta invitation authorization | Explicitly absent | BLOCKED | Yes for real invitations | Yes | Separate compliance/owner authorization |

## 16. Current open-item register

### Software defects

| ID | Title | Category | Severity | Owner type | Technical? | Beta blocker? | Public blocker? | Evidence | Recommended next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R158-SW-001 | Privacy page says Preview and Production use separate PostHog projects | Participant-facing factual defect | HIGH | Engineering/privacy | Technical copy | Yes | Yes | Current `privacy.tsx`; Report 120 requires one EU project + environment separation | Correct copy and focused legal-page tests |
| R158-SW-002 | Privacy page says hosted Sentry capture is unproven | Participant-facing factual defect | HIGH | Engineering/privacy | Technical copy | Yes | Yes | Current `privacy.tsx`; Reports 116/120 and hosted evidence prove configured delivery/symbolication | Correct copy without overstating certification |

No other current software defect was established.

### Release-process items

| ID | Title | Category | Severity | Owner type | Technical? | Beta blocker? | Public blocker? | Evidence | Recommended next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R158-RP-001 | Final pre-beta scope freeze absent | Governance | HIGH | Product owner | Non-technical decision | Yes | Yes | Report 120 initial vs later revised classifications; no later comprehensive freeze | Record one authoritative mandatory/deferred scope |
| R158-RP-002 | Required Help & Support and owned contact route not evidenced | Product/operations | HIGH | Product + operations | Mixed | Yes | Yes | Report 120 revised scope; current repository search | Select channel, implement required entry, verify monitored contact |
| R158-RP-003 | Google OAuth required by later owner decision but off/unvalidated | Auth/release | HIGH | Product + engineering | Mixed | Yes | Yes | Report 120 later decision; current false-by-default flag; hosted OAuth evidence OFF | Reconcile at scope freeze; if retained, implement isolated tested slice |
| R158-RP-004 | Successful password-recovery completion unproven | Auth QA | HIGH | Engineering/QA | Technical verification | Yes | Yes | Checkpoint and Report 120 | Execute controlled full recovery proof |
| R158-RP-005 | Complete RC QA not run | Release QA | HIGH | QA/release | Mixed | Yes | Yes | Report 120 matrix; B5D/B5G targeted boundaries | Run risk-based RC matrix after implementation |
| R158-RP-006 | Feature freeze not recorded | Release governance | HIGH | Release owner | Non-technical gate | Yes | Yes | No frozen RC baseline | Record exact candidate after RC PASS |
| R158-RP-007 | Monitoring/support/beta operational owners unnamed | Operations | HIGH | Owner/team | Non-technical operation | Yes for operation/invites | Yes | Participant materials and Report 120 | Name owners and daily triage workflow |

### Compliance / external items

| ID | Title | Category | Severity | Owner type | Technical? | Beta blocker? | Public blocker? | Evidence | Recommended next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R158-EX-001 | DPC/compliance authorization unresolved | Compliance/external | BLOCKER | Owner/legal/DPC | Non-technical | Yes for real invitations | Yes | Current supplied status | Attend/follow up; record actual outcome; infer no approval |
| R158-EX-002 | Age/minor/guardian process unresolved | Compliance/participant process | BLOCKER if minors participate | Owner/legal | Non-technical | Yes for real invitations | Yes | Reports 119–120/checkpoint | Fix participant age scope and approved guardian process |
| R158-EX-003 | Real beta invitation authorization absent | External decision gate | BLOCKER | Owner/legal | Non-technical | Yes for real invitations | Yes | Explicit current baseline | Keep invitations at zero until separately authorized |

### Optional / deferred items

| ID | Title | Category | Severity | Owner type | Technical? | Beta blocker? | Public blocker? | Evidence | Recommended next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R158-DF-001 | Feb/Mar assignment | Deferred product policy | LOW now | Product/data | Mixed | No | Decision later | Zero enabled rows; frozen scope | Keep disabled |
| R158-DF-002 | Public signup and CAPTCHA | Deferred Auth/abuse | LOW now | Product/security | Mixed | No | Public decision | Hosted state and Report 120 | Keep invite-only; revisit with evidence |
| R158-DF-003 | Custom SMTP/domain, PWA, expanded analytics | Deferred hardening/features | LOW now | Product/release | Mixed | No unless dependency proven | Potentially | Report 120 | Do not add to beta without evidence |
| R158-DF-004 | Community, AI, calendar, IGCSE expansion | Post-launch scope | LOW now | Product | Mixed | No | No current gate | Report 120 | Keep out of Phase 7 beta |

## 17. Separate readiness verdicts

### A. Engineering readiness

**READY WITH NON-BLOCKING ITEMS** for continued internal pre-beta work. Core B5 engineering, Production runtime, data integrity, catalogue, routes, options, controlled visibility, and targeted accessibility are healthy. The two privacy copy defects are bounded and do not require architectural work, but must be fixed before beta entry.

### B. Product readiness for RC / pre-beta

**BLOCKED.** Required participant-facing/product/operational items are unfinished and the final scope is not reconciled into one freeze.

### C. Technical readiness for controlled beta

**BLOCKED.** The product cannot enter controlled beta until the remaining required implementation, recovery proof, full RC QA, and feature freeze pass. This does not reopen B5D–B5G.

### D. Authorization to invite real beta users

**NOT AUTHORIZED.** Compliance/DPC/age/guardian, operational ownership, and explicit invitation authorization remain unresolved.

### E. Public release readiness

**NOT YET EVALUATED.** Controlled beta, post-beta fixes/regression, Phase 7 closeout, public-release signoff, and any domain decision have not occurred.

## 18. Recommended next action

**Strongest next action: PRE-BETA SCOPE FREEZE.**

Create one owner-reviewed decision record that explicitly reconciles Report 120's initial recommendations with its later revised owner decisions and fixes the exact remaining mandatory sequence. The recommended minimum sequence is:

1. freeze whether Google OAuth and in-app Help & Support remain mandatory for this controlled beta;
2. immediately correct the two known `/privacy` factual defects and finalize a truthful monitored support/privacy route;
3. implement only the retained required auth/support scope;
4. prove password recovery end to end;
5. run the full risk-based RC matrix and integrity revalidation;
6. record feature freeze;
7. keep real invitations prohibited until the separate compliance/guardian/owner authorization is affirmative.

Do not begin another broad engineering cycle, redeploy documentation-only commits, enable the new seven globally, create a visibility grant, or invite a real participant as part of this reconciliation.
