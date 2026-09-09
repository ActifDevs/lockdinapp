# Report 164 — Phase 7 Controlled-Beta Catalogue Scope Amendment and Activation

**Date:** 2026-09-09
**Status:** PASS — all sixteen validated subjects are globally selectable in Production.

## 1. Scope and owner authorization

**OWNER SCOPE DECISION**

The owner authorized one persistent Production change: set
`subjects.selectable_for_new_memberships` from `false` to `true` for exactly
8021, 9093, 9626, 9696, 9699, 9706, and 9990. Temporary membership
create/remove operations were authorized only for the existing dedicated QA
account and were required to leave no residue. No product code, migration,
Auth, deployment, syllabus, route, option, Feb/Mar, grant, or invitation change
was authorized.

## 2. Relationship to Report 159

Report 159 remains authoritative except for the controlled-beta catalogue
visibility decision. That decision is superseded by owner authorization on
2026-09-09: all sixteen validated subjects are globally selectable for new
memberships during controlled beta.

This amendment does **not** authorize public signup, Google OAuth, Feb/Mar,
additional subjects, public release, or real beta invitations. All other Report
159 decisions remain preserved.

## 3. Repository baseline

**FROZEN REPOSITORY EVIDENCE**

- Root: `C:/Users/USER/lockdinapp`
- Branch: `main`
- Report 163 freeze SHA: `b27cb5cfcf771cc803f91d3659058b8566e4a4b2`
- HEAD = fetched origin/main = `b27cb5cfcf771cc803f91d3659058b8566e4a4b2`
- Initial working tree: CLEAN
- Recent delta from Product SHA `1b57d9fbb6aa25e61598b4f49f495848e20ed758`:
  Reports 162 and 163 only; no product file changed

## 4. Production deployment/health baseline

**CURRENT PRODUCTION EVIDENCE**

| Project | Deployment | State | Git SHA |
| --- | --- | --- | --- |
| Web `lockdinapp-web` | `dpl_E53xLht4ySeKkf4n1guTf8wkLKpF` | READY / Production | `b27cb5cfcf771cc803f91d3659058b8566e4a4b2` |
| API `lockdinapp` | `dpl_BfAR9pdWeizf8Q5R581kiLdip4LL` | READY / Production | `b27cb5cfcf771cc803f91d3659058b8566e4a4b2` |

Both are automatic documentation-only deployments and product-equivalent to
the last frozen Product SHA. No deployment was initiated by this slice. Before
mutation, Web/API `/api/healthz` and `/api/healthz/db` all returned HTTP 200;
database responses reported `database=ok`.

## 5. Pre-mutation catalogue state

**CURRENT PRODUCTION DATABASE EVIDENCE**

| Invariant | Before |
| --- | ---: |
| Subjects | 16 |
| Syllabus versions | 29 (21 published / 8 retired) |
| Route sets / routes / route components | 29 / 95 / 333 |
| Option groups / options / option-unit mappings | 13 / 45 / 72 |
| Year mappings | 54 |
| Feb/Mar enabled | 0 |
| Visibility grants | 0 |
| Memberships / route assignments / option selections | 15 / 2 / 3 |
| Tasks / Past Paper attempts | 16 / 10 |
| Current-nine selectable | 9/9 |
| New-seven selectable | 0/7 |
| Total selectable | 9/16 |

Membership and option hashes were respectively
`8941b44a9be110503858d8adc9f7af64` and
`71c029e19bf52ff91ceb37349e1bd9d9`.

## 6. Structural verification of all new seven

Before mutation, an exact-cardinality query proved seven requested codes,
seven matched rows, seven distinct subject IDs, and all seven hidden. Every
subject had published immutable versions, matching published route sets,
routes/components, enabled-series policy, and applicable published versions.

| Code | Published versions | Routes | Components | Option groups/options | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| 8021 | 2 | 2 | 4 | 0 / 0 | PASS |
| 9093 | 1 | 3 | 10 | 0 / 0 | PASS |
| 9626 | 2 | 6 | 20 | 0 / 0 | PASS |
| 9696 | 2 | 6 | 20 | 4 / 16 | PASS |
| 9699 | 1 | 3 | 10 | 1 / 3 | PASS |
| 9706 | 1 | 3 | 10 | 0 / 0 | PASS |
| 9990 | 2 | 6 | 20 | 2 / 8 | PASS |

Global orphan checks were all zero: route set/version, route/set,
route-component/route, route-component/component, option-group/set, and
option/group. Geography exposes two A-level 2-of-4 groups per revision;
Sociology exposes one A-level 2-to-3-of-3 group; Psychology exposes one A-level
2-of-4 group per revision.

## 7. Existing membership immutability baseline

The Production baseline was 15 memberships, 2 route assignments, 3 option
selections, 16 tasks, and 10 Past Paper attempts. Safe full-domain hashes were
captured before mutation. The dedicated QA account held exactly History 9489,
Economics 9708, and Mathematics 9709; their existing pins, routes, and options
were retained in every replacement request.

## 8. Exact Production mutation

The canonical linked Supabase/PostgreSQL admin path executed one explicit
transaction. It locked and re-read the seven target rows, asserted exact target
and hidden counts of seven, rechecked membership/option baselines, updated only
`selectable_for_new_memberships` with an exact code list and `false` guard,
asserted the affected-row count was seven, verified 9/9 + 7/7 + 16/16 plus the
unchanged invariants inside the transaction, then committed.

- Target subjects: 7
- Rows changed: exactly 7
- Other subject fields changed: NO
- Routes, syllabuses, options, memberships, Auth, or grants changed: NO
- Force/deploy/code/migration action: NONE

## 9. Post-mutation 16/16 catalogue state

Immediate and final audits both proved current-nine 9/9, new-seven 7/7, and
total 16/16 globally selectable. Visibility grants remained 0; Feb/Mar remained
0. All catalogue, membership, activity, and mapping counts remained unchanged.

## 10. Global selection predicate proof

The canonical `lockdin_can_select_subject(uuid, integer)` predicate returned
true for all seven targets when evaluated with an all-zero UUID that has no
visibility grant. Together with 9/9 current subjects and a global grant count of
zero, ordinary access to all sixteen is grant-independent. The existing grant
mechanism remains preserved for future controlled visibility use.

## 11. Settings catalogue visibility proof

**CURRENT PRODUCTION UI EVIDENCE**

The authenticated dedicated-QA Settings → Subjects page rendered all sixteen.
All seven new subjects were not already held and were enabled selection buttons:

8021 PASS; 9093 PASS; 9626 PASS; 9696 PASS; 9699 PASS; 9706 PASS; 9990 PASS.

## 12. Route/option UI proof

The Production assignment-session endpoint supplied valid May/June or Oct/Nov
sessions for every new subject. The version-scoped route endpoints returned the
canonical route choices and resolved components for all seven without raw
server/API errors or empty valid pickers. English General Paper auto-selected
its single AS route; the other six returned their intended explicit routes.
No arbitrary component-checkbox construction appeared.

## 13. Temporary create/hydrate/cleanup matrix

**MACHINE-ASSISTED PRODUCTION QA — DEDICATED INTERNAL QA ACCOUNT ONLY**

Each case ran sequentially with only one temporary subject. A valid May/June
2027 session, canonical route, and applicable options were submitted through
the same authenticated Production membership endpoint used by Settings. Each
200 response was independently re-read, then the page/account was returned to
its exact three-subject baseline before the next case. Session credentials were
used transiently inside the browser-bound harness and were never printed or
stored.

| Code | Version | Route | Options | Create | Hydrate | Cleanup |
| --- | ---: | ---: | --- | --- | --- | --- |
| 8021 | 28 | 1 | none | PASS | PASS | PASS |
| 9093 | 30 | 3 | none | PASS | PASS | PASS |
| 9626 | 31 | 29 | none | PASS | PASS | PASS |
| 9696 | 34 | 40 | 27, 28 + 31, 32 | PASS | PASS | PASS |
| 9699 | 35 | 43 | 35, 36 | PASS | PASS | PASS |
| 9706 | 36 | 65 | none | PASS | PASS | PASS |
| 9990 | 37 | 92 | 38, 39 | PASS | PASS | PASS |

All creates succeeded with zero visibility grants. All hydrations returned the
expected published immutable version, matching route, exact options, and
May/June 2027 session. Temporary memberships/options remaining: 0/0.

## 14. Geography regression proof

The participant-facing Geography draft displayed both applicable A-level
groups, each with eight total controls split 4+4 and exact `Select 2`
requirements. With the full A-level route and selections 27, 28 + 31, 32, all
validation alerts cleared and `Save subjects` became enabled. Creation,
hydration, and cleanup passed. B5E-001 did not recur.

## 15. Psychology/Sociology option proof

Psychology displayed/returned its applicable `specialist_options` 2-of-4 rule;
Sociology displayed/returned its `paper_4_globalisation_media_religion`
2-to-3-of-3 rule. A one-option under-selection for each was rejected by
Production and an immediate read proved the baseline remained atomic. Valid
two-option selections were accepted, hydrated exactly, and cleaned.

## 16. English/IT/Accounting smoke proof

8021, 9093, 9626, and 9706 were globally visible, resolved a current published
session/version and canonical route, created without a grant, hydrated with the
expected version/route, and cleaned sequentially. Result: PASS for all four.

New-user first-time onboarding was not executed: public signup remains off and
creating another account was outside scope. Settings/global catalogue proof is
sufficient for this slice.

## 17. Mobile bounded proof

At a 390 × 844 emulated viewport, all seven codes remained reachable and
readable. The Geography route picker exposed three usable route controls and
eight option controls; the valid four-option draft enabled Save. Save remained
reachable by vertical scrolling, and document `scrollWidth` equalled viewport
width (no blocking horizontal overflow). Result: PASS.

## 18. Existing-membership immutability comparison

Final Production membership and option hashes exactly matched the pre-mutation
hashes. Final counts were again 15 memberships, 2 route assignments, 3 option
selections, 16 tasks, and 10 attempts.

- Existing memberships changed: 0
- Existing syllabus pins changed: 0
- Existing assessment routes changed: 0
- Existing study options changed: 0
- Automatic repins: 0

## 19. Final catalogue/invariant counts

| Invariant | Final |
| --- | ---: |
| Subjects / globally selectable | 16 / 16 |
| Original nine / newly activated seven | 9/9 / 7/7 |
| Syllabus versions | 29 |
| Published / retired | 21 / 8 |
| Route sets / routes / route components | 29 / 95 / 333 |
| Option groups / options / option-unit mappings | 13 / 45 / 72 |
| Year mappings | 54 |
| Visibility grants / Feb-Mar enabled | 0 / 0 |

## 20. Runtime/log evidence

The bounded 2026-09-09 21:29–22:09 UTC window covered the atomic visibility
mutation, catalogue/UI proof, all temporary creates, validation failures,
hydrations, cleanup, and final health. Vercel log queries for the exact Web and
API deployments returned no error/fatal entries and no HTTP 500–599 entries.
An instrumented Settings reload recorded zero browser exceptions, console
errors, log errors, failed requests, or 5xx responses. This is bounded evidence,
not an unlimited-history claim.

Post-QA health:

| Endpoint | Result |
| --- | --- |
| Web `/api/healthz` | HTTP 200, `status=ok` |
| Web `/api/healthz/db` | HTTP 200, `status=ok`, `database=ok` |
| API `/api/healthz` | HTTP 200, `status=ok` |
| API `/api/healthz/db` | HTTP 200, `status=ok`, `database=ok` |

## 21. Cleanup

The dedicated QA account returned to History, Economics, and Mathematics only.
Final global database counts/hashes prove baseline memberships, routes,
options, tasks, and attempts were restored/preserved. Temporary memberships,
option rows, tasks, attempts, and visibility grants remaining: 0. The only
persistent Production change is the seven authorized selectability flags.

## 22. Issue classification

| Severity | Count |
| --- | ---: |
| Blocker | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 0 |

Final verdict: **PASS**.

## 23. Release-gate update

- Controlled-beta catalogue: **16/16 GLOBALLY SELECTABLE**
- New-seven controlled visibility phase: **CLOSED**
- Per-user grants for ordinary catalogue access: **NOT REQUIRED**
- Existing grant mechanism: **PRESERVED**
- Report 159 catalogue decision: **SUPERSEDED ONLY AS DOCUMENTED**
- Password recovery: **CLOSED / PASS**
- Support/privacy: **CLOSED / PASS**
- PB-OPS-01: **PARTIAL**
- DPC approval: **NO**
- Compliance/age/guardian: **UNRESOLVED**
- Invitation authorization: **NOT AUTHORIZED**
- Real beta invitations: **NONE**

## 24. Exact next action

Owner review and freeze Report 164. Then run **PRE-RC INTEGRITY
REVALIDATION** against the complete 16-subject catalogue, followed by **FULL
RISK-BASED RC QA**. Do not invite beta participants, enable Google OAuth,
enable Feb/Mar, or add further subjects.
