# LOCKDIN — PHASE 7 PRE-BETA SCOPE FREEZE

**Report:** 159

**Date:** 2026-09-08

**Mode:** OWNER DECISION / GOVERNANCE ONLY

**Baseline:** `b5b64af6a8d2c5adc1bbf68e19d9de5fb04e8862`

## 1. Executive scope decision

**OWNER DECISION:** Lockdin's controlled-beta product scope is **FROZEN** and its remaining engineering implementation scope is **FINITE**.

The controlled beta will validate the real Lockdin v1 study experience: invite-only access, onboarding, subject and intended-session selection, syllabus progress, route-aware assessment configuration, Study Plan, Past Papers, dashboard/progress, Settings/account operation, participant support/feedback, and reliability monitoring.

The only product implementation authorized next is:

1. correct the two factual defects on `/privacy`;
2. add one minimal, visible authenticated Help & Support entry; and
3. connect that experience to one truthful monitored support/privacy contact route, with focused tests.

Google OAuth is **DEFERRED FROM CONTROLLED BETA**. Invite-only email/password access is sufficient to validate the core study proposition. Password recovery proof, integrity revalidation, full Release Candidate QA, exact-candidate recording, and feature freeze remain mandatory release work after the implementation slice. Operational ownership and external compliance/age/guardian authorization remain mandatory before any real participant invitation.

No product, Production, migration, Auth configuration, subject-visibility, grant, or participant change is made by this decision report.

### Decision provenance

- **OWNER DECISION:** the final required, deferred, and later scope established in this report.
- **TECHNICAL EVIDENCE:** frozen Reports 120 and 158, current repository/Auth posture, and later B5 closeout evidence.
- **EXTERNAL / COMPLIANCE STATUS:** DPC approval remains absent; participant age/guardian and invitation authorization remain unresolved.

## 2. Decision principles

1. Include only work that materially improves controlled-beta learning, participant safety, operational truthfulness, or release confidence.
2. Preserve invite-only access and the validated B5D–B5G product/data invariants.
3. Prefer the smallest auditable implementation over speculative convenience features.
4. Do not turn targeted accessibility evidence into a full certification claim.
5. Do not confuse technical RC readiness with authorization to invite real people.
6. Deferred means not required for controlled-beta entry, not permanently rejected.

### Report 120 reconciliation

Report 120's opening decision classified Google OAuth as non-mandatory, while a later appended owner decision made it pre-beta required. Report 158 correctly exposed that conflict. This owner freeze supersedes both classifications for the controlled-beta gate: Google OAuth is deferred because no current participant or product dependency requires it, email/password already provides invite-only access, and OAuth would add provider, callback, identity-linking, and regression scope without improving validation of the study proposition.

Report 120's later decisions remain authoritative where the need is unchanged: truthful privacy copy, a minimal Help & Support experience, owned participant operations, complete recovery proof, risk-based RC QA, and feature freeze remain required at the gates defined below. Later B5 evidence makes earlier route/catalogue/accessibility gaps obsolete where Reports 144–158 explicitly closed them.

## 3. Google OAuth decision

**Final decision:** **DEFERRED FROM CONTROLLED BETA**.

**Rationale:**

- invite-only email/password and email confirmation already support controlled admission;
- OAuth is unnecessary to validate onboarding, study planning, syllabus progress, routes/options, Past Papers, Settings, support, or monitoring;
- hosted OAuth is currently off and unvalidated;
- enabling it would add provider configuration, callbacks, invitation eligibility, account-linking, identity convergence, and expanded RC regression surfaces;
- it may be reassessed after beta if participant evidence establishes material sign-in friction.

No OAuth implementation, enablement, or hosted validation is authorized by this freeze. `R158-RP-003` is **CLOSED AS DEFERRED**.

## 4. Help & Support decision

**Final decision:** **MANDATORY BEFORE RC / CONTROLLED BETA**.

The minimum adequate experience is:

- one clearly visible Help / Support entry in the authenticated product;
- concise actions or wording for asking for help, reporting a bug, and giving feedback;
- one real monitored support/contact route;
- privacy and deletion questions routed to an owned monitored contact;
- no fake chat, live-support, response-time, or SLA promise;
- documented ownership and escalation expectations.

This decision does not authorize a ticketing platform, chatbot, community forum, knowledge-base CMS, admin support system, or advanced support tooling. `R158-RP-002` remains **OPEN — MINIMAL IMPLEMENTATION REQUIRED**.

## 5. Privacy requirements

Both participant-facing defects are **MANDATORY BEFORE RC**:

- `R158-SW-001` remains **OPEN — IMPLEMENTATION REQUIRED**. Replace the incorrect separate-project statement with the verified architecture: one PostHog Cloud EU project using mandatory environment separation.
- `R158-SW-002` remains **OPEN — IMPLEMENTATION REQUIRED**. Acknowledge the established hosted Sentry capture/symbolication evidence while preserving the limits: no certification claim, no exhaustive reliability claim, no unlimited-history claim, and no deliberate Production error-injection claim.

The next implementation slice must recheck the surrounding participant-facing wording for internal consistency without adding a legal conclusion or unsupported operational promise.

## 6. Auth/recovery scope

The controlled-beta Auth boundary is frozen as:

| Capability | Decision |
| --- | --- |
| Email/password | REQUIRED |
| Email confirmation | REQUIRED |
| Password recovery | REQUIRED, WITH SUCCESSFUL END-TO-END PROOF |
| Public signup | OFF |
| Anonymous access | OFF |
| CAPTCHA | DEFERRED unless abuse evidence appears |
| Google OAuth | DEFERRED; reassess after beta |

Password recovery proof is mandatory before RC completion and must be performed in a later verification slice, not in the next implementation slice. The proof must cover reset request, delivery, canonical callback/update route, a live one-time action, new-password acceptance, expected old-password rejection, subsequent sign-in, protected-route access, leakage review, and account/session integrity. `R158-RP-004` remains **OPEN — RECOVERY PROOF REQUIRED**.

## 7. Operations/ownership scope

Operational ownership is **MANDATORY BEFORE REAL BETA INVITATIONS**. The required functions are:

- beta coordinator;
- participant support owner;
- privacy/deletion request owner;
- issue-triage owner;
- Sentry/monitoring review owner; and
- participant feedback owner.

One person may own multiple functions. Each function requires a named accountable person or role, a monitored channel, an expected review cadence, and an escalation path for urgent participant-impacting issues.

No owner names are invented here. Current status for every function is **OWNER ASSIGNMENT REQUIRED**. `R158-RP-007` remains open. The next implementation slice may document the required responsibility template, but real invitations remain prohibited until the assignments and monitored route are confirmed.

## 8. Observability scope

| Capability | Controlled-beta decision |
| --- | --- |
| Sentry Web/API monitoring | IMPLEMENTED / SUFFICIENT TECHNICAL BASELINE |
| PostHog allow-listed analytics | IMPLEMENTED / SUFFICIENT TECHNICAL BASELINE |
| Web/API health checks | IMPLEMENTED |
| Additional analytics/events | DEFERRED |
| Autocapture, replay, heatmaps | DEFERRED / NOT AUTHORIZED |
| Automatic alerting | OPTIONAL / CONDITIONAL |
| Manual monitoring review | REQUIRED before invitations, with named owner and cadence |

No new observability product is required. Automatic alerts are optional if a reliable documented manual review process exists.

## 9. Catalogue/visibility scope

- Current nine: **ENABLED / NORMALLY SELECTABLE**.
- New seven: **GLOBALLY HIDDEN**.
- Per-user controlled-visibility grants: **TECHNICALLY AVAILABLE WHEN SEPARATELY AUTHORIZED**.
- Feb/Mar product assignment: **DEFERRED / OFF**.

The new seven must not be globally enabled for controlled beta by default. If an authorized participant needs one, only the established per-user mechanism may be used, after compliance and invitation authorization for that participant. Existing version, route, option, immutable-pin, no-repin, and retirement invariants remain frozen.

## 10. Deferred scope

The following are not required to enter controlled beta:

- Google OAuth;
- Feb/Mar assignment;
- public signup and CAPTCHA absent abuse evidence;
- PWA/installability;
- custom domain;
- custom SMTP unless current delivery proves materially unsuitable;
- expanded analytics, autocapture, replay, and heatmaps;
- community/social features;
- AI features;
- expanded calendar/integration work;
- additional curricula, IGCSE, and broader post-v1 product ideas;
- native tickets, chatbot, forum, knowledge-base CMS, and advanced support tooling.

Post-beta/public-release work includes reassessing OAuth from beta evidence, public signup/abuse controls, domain/sender/SEO release choices, and any validated future features. None is authorized merely by appearing in this list.

## 11. Required implementation set

The finite pre-RC implementation set is:

| ID | Required work | Gate |
| --- | --- | --- |
| PB-IMPL-01 | Correct `R158-SW-001` and `R158-SW-002` on `/privacy`; reconcile adjacent disclosure; add focused tests | Before RC |
| PB-IMPL-02 | Add the smallest authenticated Help & Support entry and wire a truthful monitored support/privacy contact route; add focused tests | Before RC |
| PB-OPS-01 | Record responsibility functions, monitored channel, cadence, and escalation template without inventing owners | Before invitation; prepare alongside implementation |

There is **no OAuth implementation slice**. No other feature implementation is authorized by this freeze.

## 12. Required verification/release sequence

The frozen sequence is:

1. implement PB-IMPL-01, PB-IMPL-02, and the documentation portion of PB-OPS-01;
2. run focused local tests;
3. deploy the exact authorized implementation SHA;
4. perform focused Production verification;
5. prove password recovery end to end in a separate verification slice;
6. revalidate Phase 7 integrity;
7. run full risk-based Release Candidate functional/non-functional QA;
8. resolve any RC blocker or HIGH defect through separately authorized slices;
9. record the exact RC candidate SHA;
10. enter feature freeze;
11. confirm named operational ownership, monitored channels, cadence, and escalation;
12. separately confirm compliance, age/minor, guardian, and DPC status;
13. obtain explicit real-beta invitation authorization; and
14. begin controlled beta.

Implementation must not skip directly to beta. `R158-RP-005` remains **OPEN — RC QA REQUIRED** and `R158-RP-006` remains **OPEN — FEATURE FREEZE REQUIRED**.

## 13. Compliance/invitation boundary

**EXTERNAL / COMPLIANCE STATUS:**

- DPC approval: **NO**. An online-meeting request is not approval.
- Compliance authorization: **UNRESOLVED**.
- Participant age/minor/guardian process: **UNRESOLVED**.
- Real beta invitation authorization: **NOT AUTHORIZED**.
- Real beta invitations: **NONE**.

Passing technical RC and feature freeze will not itself authorize invitations. `R158-EX-001`, `R158-EX-002`, and `R158-EX-003` remain open until separate authoritative evidence closes them.

## 14. Scope-freeze matrix

| Item | Final decision | Before RC? | Before real invitation? | Deferred? | Rationale | Next action |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Privacy copy | REQUIRED FIX | Yes | Yes | No | Two known participant-facing factual defects | PB-IMPL-01 |
| Help & Support | REQUIRED MINIMUM | Yes | Yes | No | Participants need a truthful visible route | PB-IMPL-02 |
| Support contact | MONITORED ROUTE REQUIRED | Yes for implementation truthfulness | Yes | No | Unmonitored contact is not an operation | Verify selected route |
| Google OAuth | DEFERRED | No | No | Yes | Email/password suffices; avoid new Auth surfaces | Reassess after beta |
| Email/password | REQUIRED / IMPLEMENTED | Preserve | Yes | No | Invite-only access path | RC regression |
| Email confirmation | REQUIRED / IMPLEMENTED | Preserve | Yes | No | Current Auth posture | RC regression |
| Password recovery | REQUIRED + E2E PROOF | Before RC completion | Yes | No | Account recovery must work | Separate proof slice |
| Public signup | OFF | Preserve | Yes | Yes | Controlled admission | Keep off |
| CAPTCHA | DEFERRED | No | No absent abuse | Yes | No current abuse evidence | Reassess if evidence appears |
| Sentry | IMPLEMENTED | Preserve/test | Yes operationally | No | Sufficient technical baseline | Name review owner |
| PostHog | IMPLEMENTED | Preserve/test | Yes with truthful copy | No | Minimal allow-list sufficient | Fix disclosure only |
| Monitoring owner | OWNER REQUIRED | No technical gate | Yes | No | Monitoring needs accountability | Assign person/role and cadence |
| Beta coordinator | OWNER REQUIRED | No technical gate | Yes | No | Participant operation | Assign person/role |
| Privacy/deletion owner | OWNER REQUIRED | Contact must be truthful | Yes | No | Requests require ownership | Assign person/role |
| Feedback route | MONITORED ROUTE REQUIRED | Yes | Yes | No | Core beta learning and support | Implement minimum |
| Current nine | ENABLED | Preserve | No extra action | No | Validated catalogue | No change |
| New seven | GLOBALLY HIDDEN | Preserve | Grants only after authorization | No global enablement | Controlled mechanism exists | No change |
| Feb/Mar | OFF / DEFERRED | No | No | Yes | Frozen policy | No change |
| RC QA | REQUIRED | Yes | Yes | No | Complete release confidence absent | Run after implementation/recovery |
| Feature freeze | REQUIRED | After RC | Yes | No | Stable beta candidate needed | Record exact SHA |
| Compliance/DPC | UNRESOLVED | Independent of internal RC | Yes | No | External authorization absent | Follow up and record outcome |
| Age/guardian process | UNRESOLVED | Independent of internal RC | Yes | No | Participant safety/legal gate | Define from authoritative guidance |
| Invitation authorization | NOT AUTHORIZED | Independent of technical work | Yes | No | Separate affirmative decision required | Keep invitations at zero |

## 15. Updated open-item register

| ID | Final state after freeze | Required next action |
| --- | --- | --- |
| R158-RP-001 | **CLOSED BY SCOPE FREEZE** | None; Report 159 is authoritative |
| R158-SW-001 | **OPEN — IMPLEMENTATION REQUIRED** | PB-IMPL-01 |
| R158-SW-002 | **OPEN — IMPLEMENTATION REQUIRED** | PB-IMPL-01 |
| R158-RP-002 | **OPEN — MINIMAL HELP/SUPPORT IMPLEMENTATION REQUIRED** | PB-IMPL-02 |
| R158-RP-003 | **CLOSED AS DEFERRED** | Reassess after beta only with evidence |
| R158-RP-004 | **OPEN — RECOVERY PROOF REQUIRED** | Separate post-implementation proof slice |
| R158-RP-005 | **OPEN — RC QA REQUIRED** | Full risk-based RC matrix |
| R158-RP-006 | **OPEN — FEATURE FREEZE REQUIRED** | Freeze exact RC candidate after PASS |
| R158-RP-007 | **OPEN — OWNER ASSIGNMENT REQUIRED** | Assign roles/channels/cadence/escalation before invitations |
| R158-EX-001 | **OPEN — EXTERNAL AUTHORIZATION UNRESOLVED** | DPC/compliance follow-up |
| R158-EX-002 | **OPEN — AGE/GUARDIAN PROCESS UNRESOLVED** | Record applicable approved process |
| R158-EX-003 | **OPEN — INVITATION AUTHORIZATION ABSENT** | Separate affirmative authorization |

### Frozen verdicts

- Controlled-beta product scope: **FROZEN**.
- Engineering implementation scope: **FINITE**.
- Google OAuth: **DEFERRED**.
- Help & Support: **REQUIRED**.
- Password recovery: **REQUIRED**.
- Privacy fixes: **REQUIRED**.
- RC QA: **REQUIRED**.
- Feature freeze: **REQUIRED**.
- Real invitations: **NOT AUTHORIZED**.

## 16. Exact next authorized slice

**PHASE 7 PRE-BETA IMPLEMENTATION SLICE 1** is authorized with exactly this scope:

- correct the two `/privacy` factual defects;
- implement one minimal authenticated Help & Support entry;
- wire one truthful monitored support/privacy contact route;
- add and run focused tests for the changed experience.

**Stop condition:** if no currently monitored support/privacy route can be evidenced, the implementation slice must stop before publishing wording that implies monitoring and report **MONITORED CONTACT ROUTE OWNER INPUT REQUIRED**. A published email address alone is not evidence that the route is monitored.

Explicit non-scope:

- no OAuth work;
- no password-recovery QA in the same implementation slice;
- no full RC QA yet;
- no Production, migration, Auth-configuration, subject-visibility, or grant change without a later explicit slice;
- no global enablement of the new seven;
- no real beta invitation.

**Final verdict: PRE-BETA SCOPE FROZEN.**
