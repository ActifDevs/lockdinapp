# Phase 3 Slice 3 — Implementation

## Baseline

Branch:
`phase3-s3-past-paper-ownership`

Starting SHA:
`548b68720e8a2017d174e1d7c6672052836e3e92`

Ending SHA:
`548b68720e8a2017d174e1d7c6672052836e3e92` (current HEAD; implementation is
intentionally uncommitted for review)

Preflight reverified `origin/phase3-multitenancy` at the exact starting SHA,
a clean starting worktree, repository migrations through 0007, no competing
remote Migration 0008, hosted project `hazvcdrcvsxmuwdfiucx`, hosted
`past_paper_attempts = 0`, and hosted journal entries 0000–0007. The hosted
checks were read-only and rolled back.

## Schema

user_id:
`uuid NOT NULL`

year:
`integer NOT NULL`, no default

FK:
`past_paper_attempts.user_id -> auth.users(id) ON DELETE CASCADE`

indexes:

- `past_paper_attempts_user_date_id_idx` on
  `(user_id, date_attempted DESC, id DESC)`
- `past_paper_attempts_user_subject_date_id_idx` on
  `(user_id, subject_id, date_attempted DESC, id DESC)`

year check:
`year BETWEEN 1000 AND 9999`

RLS:
Enabled; authenticated owner-only SELECT, INSERT `WITH CHECK`, and DELETE.
There is no UPDATE policy.

grants:
All legacy access revoked from `PUBLIC`, `anon`, and `authenticated`, then only
`SELECT`, `INSERT`, and `DELETE` granted to `authenticated`. Required `USAGE`
and `SELECT` are granted on the existing legacy-named sequence
`past_papers_id_seq`. `anon` has no attempt-table access.

## Migration

Migration:
`0008_uneven_mojo.sql`

Journal metadata:
idx `8`, timestamp `1786394449630`, SHA-256
`831167e99874fba507a35ff22dabfdd146b23d714271671e59cdac0f09a40f73`

Previous migrations changed:
NO

Empty-table guard:
PASS — SQLSTATE `55000` / `past_paper_attempts_not_empty` is raised before
either required column is added if any attempt exists.

Migration 0008 was generated with the repository's Drizzle tooling and applied
only to loopback PostgreSQL at `127.0.0.1:54322` through the tracked
`@workspace/db migrate` command. The persisted local journal began at 0005, so
the runner applied pending 0006, 0007, and 0008 transactionally. Final local
journal count is nine, latest timestamp `1786394449630`.

## API

List:
PASS — authenticated, explicit caller filter, optional subject filter, and
deterministic `(date_attempted DESC, id DESC)` ordering.

Create:
PASS — HTTP 201, caller identity derived from the verified JWT, shared subject
and component references validated, and returned attempt enriched without an
owner field.

Delete:
PASS — caller-owned deletion only; missing and foreign-owned IDs both return
the nondisclosing 404 behavior.

Owner spoof rejection:
PASS — `userId`, `user_id`, `ownerId`, and `owner_id` are rejected; direct
authenticated insertion of another user's UUID is denied by RLS.

Year validation:
PASS — required four-digit integer, independent from `dateAttempted`.

Percentage calculation:
PASS — server calculates `score / totalMarks * 100`; a supplied percentage is
not trusted.

Component/subject validation:
PASS — missing subject, missing/mismatched component, negative score, zero
marks, score above total, invalid calendar date, and invalid year are rejected.

No PATCH/edit route or UPDATE privilege/policy was introduced.

## Analytics

Subject performance:
PASS — caller-only latest, average, best, count, chronological trend, and
component breakdown.

Dashboard isolation:
PASS — caller-only latest and immediately previous attempt per subject.

Progress paper count:
PASS — caller-owned exact attempt count replaces the placeholder.

Public catalogue neutral:
PASS — shared `/subjects` responses retain null paper score/label placeholders.

## Frontend

Year input:
PASS — explicit required Paper Year field; no inferred current year.

Year display:
PASS — response paper label, cards, table/session context, and chart labels.

Create flow:
PASS — submits required year and invalidates attempt list, dashboard, progress,
and subject-performance queries.

Delete flow:
PASS — existing delete control retained with the same complete invalidation set.

Auth session transitions already clear the React Query client, preventing a
previous user's cached attempt data from remaining visible after logout/login.

## Security

A/B isolation:
PASS — A and B can record the same paper identity independently; A can record
the same identity more than once with separate IDs; each user sees only their
own history, dashboard, progress count, subject metrics, and component
breakdown.

Anonymous protection:
PASS — API authentication required and `anon` has no table grants.

Direct Data API ownership:
PASS — owner spoof denied, B cannot read/delete A, and UPDATE is unavailable.

Disposable local Auth users were removed after each suite; the Auth FK cascade
left `past_paper_attempts = 0`. Final disposable `paper-*` Auth user count is 0.

## Tests

Typecheck:
PASS — full workspace.

API:
PASS — 12 files, 49 tests.

Frontend:
PASS — 9 files, 64 tests.

Scripts:
PASS — 3 files, 19 tests against the verified loopback DB where required.

Integration guard:
PASS — 11/11 exact-loopback guard tests; hosted/misleading URLs rejected.

Integration:
PASS — 4 files, 35 tests, including real local Auth JWTs, PostgREST/RLS,
schema/grant/journal checks, two users, repeated identities, and analytics.

API build:
PASS

Frontend build:
PASS (`PORT=3000`, `BASE_PATH=/` repository build values)

`git diff --check`:
PASS

## Hosted Work

Migration 0008 applied hosted:
NO

Hosted data modified:
NO

Production modified:
NO

## Scope Guard

Slice 4 work:
NO

AS/A2 changes:
NO

Attempt edit/PATCH:
NO

No paper catalogue, recommendations, advanced analytics, AI insights, broad
redesign, deploy, or merge was performed.

## Findings

BLOCKERS:
none

NON-BLOCKING:

- The persisted local database was at Drizzle Migration 0005, although its
  schema was suitable and `past_paper_attempts` was empty. The tracked runner
  safely applied 0006–0008 in order.
- Local application tables are owned by `supabase_admin`; an initial migration
  attempt under `postgres` rolled back at Migration 0007. Re-running the same
  tracked command under the verified local owner role succeeded. No partial
  journal or schema changes remained from either failed transaction.
- The renamed legacy attempt table retains sequence name `past_papers_id_seq`;
  Migration 0008 deliberately grants that verified existing sequence rather
  than inventing `past_paper_attempts_id_seq`.

## Verdict

A. SLICE 3 LOCAL IMPLEMENTATION PASSED — READY FOR REVIEW / HOSTED CUTOVER GATE
