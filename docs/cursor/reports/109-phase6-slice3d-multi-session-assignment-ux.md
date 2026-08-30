# Phase 6 Slice 3D — Multi-Session Assignment UX

## Baseline

- Base and `origin/main`: `b07d91cbb83fb6547726c3679aee305e525d263d`
- Feature branch: `phase6-slice3d-multi-session-ux`
- Implementation commit: `7e2914da96558d18bb5be6ed64693f02f0b9882e`
- Pre-QA / runtime source: `f5f28850f8327e27fbac25b222da6013dafe9bd8`
- The `7e2914d..f5f288` delta adds only this report; no runtime file changed.
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

- Deployment: `dpl_GdXcXp4RGMrJn34NCnCpK9zNmxn4`
- Immutable URL: `https://lockdinapp-3qj5o6n3f-actif-devs.vercel.app`
- Source: `f5f28850f8327e27fbac25b222da6013dafe9bd8`
- State: READY

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

BLOCKED — NO AUTHORIZED QA SESSION. Vercel deployment protection redirected the
only connected browser to login, and no alternate connected browser or authorized
controlled Lockdin QA account/session was available. No account was created and no
credentials were requested or exposed.

Onboarding interactive/write QA: NOT CHECKED. It was not safe to reset an
established user.

Settings mixed-session, retained-display, retain-only, removal-only, resolver-pin,
and cleanup QA: NOT CHECKED. No membership baseline was captured because there was
no authorized user session, and no hosted membership write was attempted.

Write behavior remains covered locally by browser-level frontend tests plus the
retained C2B2 strict-resolver evidence. Authenticated Preview QA remains required
before merge.

## Hosted state

SCHEMA CHANGE: NONE

MIGRATION 0016: NOT CREATED

HOSTED DATABASE MUTATION: NONE

TEMPORARY MEMBERSHIPS: NONE

RESTORATION: NOT NEEDED

EXISTING PINS: UNCHANGED

STRICT ASSIGNMENT: REMAINS ENABLED

FEB/MAR: DEFERRED

REPIN: NOT IMPLEMENTED

## Rollout boundary

No Production deployment was performed. No Supabase schema, applicability, policy,
membership, pin, or profile data was changed. The only infrastructure mutation was
the authorized branch-specific sensitive Preview `DATABASE_URL` override. Before
merge, complete authenticated read/UI QA with an already-authorized controlled
account. Do not use ordinary user memberships for Preview writes.

## Final verdict

Implementation, local verification, Preview environment repair, public smoke, and
availability API QA: PASS.

Merge clearance: BLOCKED pending authenticated QA with a controlled account.
