# Phase 6 Slice 3D — Multi-Session Assignment UX

## Baseline

- Base and `origin/main`: `b07d91cbb83fb6547726c3679aee305e525d263d`
- Feature branch: `phase6-slice3d-multi-session-ux`
- Implementation commit: `7e2914da96558d18bb5be6ed64693f02f0b9882e`
- Pre-authenticated-QA HEAD: `02ba678aaeb9f41a0b23c58cb5602a7586b9fa87`
- Runtime implementation source: `7e2914da96558d18bb5be6ed64693f02f0b9882e`.
- The `7e2914d..02ba678` delta changes only this report; no runtime file changed.
- Hosted migration head remains `0015_silent_sentinel`.

## Product model

Each new membership can now use its own intended exam session. A global session
remains a convenience default, while an explicit subject override wins. Profile
`exam_session` remains display/default compatibility text and is not assignment
authority. Retained memberships keep both their stored intended session and their
syllabus pin unchanged.

## Availability contract

`GET /api/subjects/assignment-sessions` is a public, read-only catalogue endpoint.
It returns a subject ID and product-safe upcoming May/June and Oct/Nov choices.
The projection is derived from published applicability plus
`product_auto_assign = true`, is bounded to twelve sittings / six future years,
and withholds ambiguous choices. It does not expose version IDs, content hashes,
logical revision keys, or mutation capability.

Public access is consistent with the existing subject catalogue: the response has
no user-owned data. The strict database resolver still runs on every membership
write and remains the only assignment authority.

## Onboarding UX

- Preserves a global intended-session default.
- Shows each selected subject's effective sitting and inherited/override state.
- Keeps explicit overrides stable when the global default changes.
- Disables known unsupported subject/session choices.
- Blocks completion until every selected subject has a currently projected choice.
- Never silently changes an invalid subject to another sitting.

## Settings UX

- Displays retained membership intended sessions read-only.
- Displays `Not recorded` for legacy null sessions.
- Separates the profile/default session wording from existing membership state.
- Gives only newly added subjects an inherited default and per-subject override.
- Retained-only and removal-only saves omit assignment-session fields and remain
  possible even when no structured default is selected.

## Per-subject overrides

Both flows use the existing `subjectSessionOverrides[]` contract. Payloads contain
only intended session data; clients never send `syllabusVersionId`. Settings never
sends override entries for retained memberships.

## Existing membership display

Retained membership sessions are labelled as recorded and read-only. There is no
edit, replacement, version selector, or repin control.

## Error presentation

The frontend preserves the API's safe strict-assignment messages for required,
missing, ambiguous, and invalid-override cases. Onboarding no longer replaces a
known safe reason with a generic failure. Settings appends the atomic no-change
outcome to the safe reason. SQL, Postgres codes, RPC names, stack traces, and
internal identities remain hidden.

## Other behavior

`Other` remains available as profile compatibility text. It cannot be an effective
onboarding membership session or a new-subject assignment session. Retained-only
and removal-only Settings operations are not blocked by profile compatibility text.

## Feb/Mar boundary

Feb/Mar is not returned by the availability projection or offered in normal
assignment controls. The domain enum remains unchanged. Eligibility and automatic
assignment remain deferred.

## Security

- Availability exposes no user data or internal revision identity.
- Availability performs no mutation.
- Clients cannot send `syllabusVersionId`.
- Strict resolution remains internal and fail-closed.
- Existing RLS, grants, pins, applicability, and series policy are unchanged.

## Tests

- API: `146/146` PASS.
- Frontend: `227/227` PASS.
- Syllabus: `39/39` PASS.
- Harness target safety: `20/20` PASS.
- Full workspace typecheck: PASS.
- OpenAPI/Orval code generation plus library typecheck: PASS.
- Production-equivalent local Vercel build: PASS.
- Impeccable UI detector: PASS (no findings).
- `git diff --check`: PASS.
- Stock integration: NOT CLAIMED.

The new coverage includes published/false-policy/lifecycle/range/ambiguity
availability cases; History 9489 excluding Oct/Nov 2026 and including May/June
2027; inherited and mixed override payloads; global-change stability; restoring
inheritance; `Other`; pre-submit gates; retained/null display; retained/removal-only
saves; safe error presentation; and absence of `syllabusVersionId`.

## Preview

- API deployment: `dpl_671HYEZkkUdsnXan8DqkC2UGD2N4`
- API immutable URL: `https://lockdinapp-hi7fn1dez-actif-devs.vercel.app`
- Frontend deployment: `dpl_C2vL2eZAR4aH68o2y2oZa29qnwT1`
- Frontend immutable URL: `https://lockdinapp-lquvs44kh-actif-devs.vercel.app`
- Source: `02ba678aaeb9f41a0b23c58cb5602a7586b9fa87`
- State: READY for both deployments.

### Preview environment repair

The failed Preview used the shared sensitive `DATABASE_URL`, a Supabase Session
Pooler connection on port 5432. Vercel metadata confirmed no prior branch-specific
variables. A single sensitive branch-specific Preview override was added for
`phase6-slice3d-multi-session-ux`. It preserves the existing authorized Supabase
pooler host and database identity while using Transaction Pooler port 6543.

- Scope: Preview / `phase6-slice3d-multi-session-ux` only.
- Host family: Supabase transaction pooler.
- Port: 6543.
- Production environment changed: NO.
- Shared Preview variable changed: NO.
- Other variables changed: NO.
- Credential or connection string exposed: NO.

### Public Preview smoke

The repaired immutable Preview returned:

- `GET /api/healthz`: 200.
- `GET /api/healthz/db`: 200.
- `GET /api/subjects`: 200 (nine catalogue subjects).
- `GET /api/subjects/assignment-sessions`: 200 (nine subject projections).
- `GET /api/subjects/2`: 200.
- `GET /api/subjects/2/syllabus`: 200.
- `GET /api/subjects/2/assessment-components`: 200.
- anonymous `GET /api/profile`: 401.

No smoke request returned 5xx or exposed database detail.

### Availability API verification

- May/June: present where valid.
- Oct/Nov: present where valid.
- Feb/Mar: absent.
- History 9489 Oct/Nov 2026: absent.
- History 9489 May/June 2027: present.
- `syllabusVersionId`: absent.
- `logicalRevisionKey`: absent.
- `contentSha256`: absent.
- internal candidate identities: absent.

Runtime logs around the smoke contained only expected 200 responses and the
anonymous 401. There was no pool guard failure, unexpected 5xx, raw SQL/Postgres
detail, auth leakage, duplicate write, or repeating request loop.

## Authenticated QA status

PASS. Vercel deployment protection was temporarily disabled manually for this QA.
No other Vercel setting was changed during authenticated QA. The connected browser
then reached the exact-source frontend Preview and used an already-authorized
controlled Lockdin QA session. No account was created, and no credentials, tokens,
user identifiers, or database secrets were recorded.

Onboarding authenticated write QA was not executed because resetting the
established controlled account would have been unsafe and unnecessary. Automated
onboarding coverage remains PASS; Settings supplied the live mixed-session write
proof.

## Final authenticated Preview QA

### Preview source

- Frontend deployment: `dpl_C2vL2eZAR4aH68o2y2oZa29qnwT1`.
- Immutable URL: `https://lockdinapp-lquvs44kh-actif-devs.vercel.app`.
- Source: `02ba678aaeb9f41a0b23c58cb5602a7586b9fa87`.
- State: READY.
- Database health and catalogue/availability routes: PASS.

### Controlled session and baseline

- Controlled Lockdin QA session: AVAILABLE / AUTHORIZED.
- Baseline memberships: 3.
- Baseline subject, stored-session, and pin-context fingerprint: captured
  privately; no identity or raw pin was recorded in this report.
- Baseline intended sessions: three legacy `NULL` values, rendered as
  `Not recorded`.
- Retained session controls: read-only.
- Syllabus version selector: absent.
- Repin/session-edit control: absent.

### Two-subject mixed-session proof

- Temporary subject A: Further Mathematics 9231, May/June 2027.
- Temporary subject B: History 9489, Oct/Nov 2027.
- Both choices were live server-projected and supported.
- Both explicit overrides were visible simultaneously while the global default
  remained Oct/Nov 2026.
- One add submission succeeded and created both memberships exactly once.
- Reloaded Settings displayed both stored sessions as retained and read-only.
- The three original membership sessions remained `Not recorded`.
- The three original pin-aware subject contexts remained valid and unchanged.
- Resolver-pin result: MATCH. New membership creation can only use the strict
  resolver; both valid writes completed, both pin-aware subject reads succeeded,
  and each subject has one hosted r001 identity with no second graph or alternate
  candidate.

### Retain-only and invalid-session proof

- One unchanged retain-only save succeeded.
- Both temporary stored sessions remained unchanged.
- All original memberships remained unchanged.
- History with inherited Oct/Nov 2026 was visibly invalid before write; the option
  was disabled and the inline message identified History and required an available
  May/June or Oct/Nov session.
- `Other` was absent from new-membership assignment choices.
- No invalid Feb/Mar, out-of-range, or unsupported database mutation was sent.

### Cleanup and restoration

- One cleanup save removed only Further Mathematics and History.
- Temporary memberships after cleanup: 0.
- Restored membership count: 3.
- Original subject set: exact match.
- Original intended sessions: exact match (`NULL` / `Not recorded`).
- Original pins: unchanged. Pin-aware reads remained valid, and the stable
  subject/session/r001 fingerprint matched the pre-QA baseline.
- Profile fields and profile/default session: unchanged.

### Runtime

- Membership mutations: exactly 3 distinct `PUT /api/user-subjects` requests
  (mixed add, retain-only, cleanup), all HTTP 200.
- Unexpected 5xx: 0.
- Error/fatal runtime logs: 0.
- Pool guard failure: none.
- Raw SQL/Postgres detail: none.
- RPC/internal function detail shown to the user: none.
- Authentication leakage: none detected.
- Duplicate membership write or repeating mutation loop: none.

### Merge clearance

Authenticated Preview QA: PASS. The controlled account was restored exactly, and
Slice 3D is ready for owner-authorized merge. No merge or Production deployment was
performed.

## Hosted state

SCHEMA CHANGE: NONE

MIGRATION 0016: NOT CREATED

HOSTED DATABASE MUTATION: CONTROLLED QA ADD / RETAIN / REMOVE ONLY

TEMPORARY MEMBERSHIPS: NONE

RESTORATION: PASS — EXACT BASELINE RESTORED

EXISTING PINS: UNCHANGED

STRICT ASSIGNMENT: REMAINS ENABLED

FEB/MAR: DEFERRED

REPIN: NOT IMPLEMENTED

## Rollout boundary

No Production deployment was performed. No Supabase schema, applicability, policy,
pin, or profile data was changed. Two temporary controlled-account memberships were
added and later removed; the original membership baseline was restored exactly.
Infrastructure changes were limited to the previously authorized branch-specific
sensitive Preview `DATABASE_URL` override and the owner's temporary manual disabling
of Preview deployment protection for QA.

## Final verdict

Implementation, local verification, Preview environment repair, public smoke,
availability API QA, authenticated mixed-session Settings QA, retain-only proof,
cleanup, restoration, and runtime review: PASS.

Merge clearance: READY FOR OWNER AUTHORIZATION.
