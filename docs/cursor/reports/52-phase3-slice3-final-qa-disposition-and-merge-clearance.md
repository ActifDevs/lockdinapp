# Phase 3 Slice 3 — Final QA Disposition & Merge Clearance

Date: 2026-08-11

## Slice

Branch: `phase3-s3-past-paper-ownership`

Head: `7b1d532ac2e46afb026cb749bb39d6fded281943`

Target: `phase3-multitenancy`

Target head at audit: `548b68720e8a2017d174e1d7c6672052836e3e92`

The target remains exactly at the expected pre-Slice 3 integration baseline.
It has no commits added since that baseline, so no integration-side overlap or
conflict was introduced after Slice 3 branched.

## Hosted State

Migration 0008: APPLIED + VERIFIED.

Hosted journal: 0000–0008.

Production: UNTOUCHED.

This disposition relies on the authoritative hosted cutover and two-user E2E
evidence in Report 50. Its recorded hosted migration hash is
`263e7fe889d77e178b02dc267529b6666d57dda668bd062b705d85148a776934`.
The focused browser-QA Preview at
`https://lockdinapp-lkb0c4bam-actif-devs.vercel.app` is Preview-only, READY,
and was previously verified at this Slice head. It was neither promoted nor
used to alter Production.

## API / Security

Hosted API E2E: PASS.

RLS isolation: PASS.

Two-user ownership: PASS.

The API requires an authenticated request and derives the owner only from
`req.userId`. List/count queries additionally scope to that owner, while RLS
independently provides the same database boundary. Create rejects `userId`,
`user_id`, `ownerId`, and `owner_id`; it computes percentage server-side and
validates scores, year, and the subject/component pairing. Delete matches both
attempt ID and authenticated owner. There is no PATCH endpoint.

Migration 0008 supplies the final database enforcement: `user_id uuid NOT
NULL`, `year integer NOT NULL` with a four-digit check, the `auth.users(id)`
foreign key with `ON DELETE CASCADE`, owner/date and owner/subject/date
indexes, enabled RLS, and authenticated SELECT-own, INSERT-own, and
DELETE-own policies. It grants authenticated users SELECT/INSERT/DELETE only;
UPDATE is absent. The portable sequence block resolves the owned serial
sequence dynamically through `pg_get_serial_sequence`.

## Initial Browser QA

The verifier evidence is preserved as follows:

- Browser two-user isolation: PASS
- No cross-user data flash: PASS
- Create/delete: PASS
- Repeated attempts: PASS
- Paper Year: PASS

## Focused Retest

- Percentage display: PASS
- Progress Papers logged: PASS
- Subject Performance tooltip: PASS
- Math/Biology component selector: QA marked FAIL because the tester recommends a canonical-paper architecture
- Subject Mastery: PASS

The focused Preview also confirmed the bounded percentage formatting, the
Progress `Papers logged` card, readable tooltip tokens, component labels, and
current-user Subject Mastery filtering in the deployed correction assets.

## Component Architecture Follow-Up

QA proposed: canonical paper model.

Current Slice decision: DEFERRED.

The apparent duplicate assessment components are not duplicate rows: they
represent distinct qualification level/weighting records under the existing
`(paperCode, level)` model. The approved Slice 3 correction makes each option
visibly distinguishable as `paperCode — componentName — level`, preserves its
original component ID, and introduces no deduplication or data removal.

SLICE 3 ACCEPTANCE RESULT: PASS.

The proposed canonical paper entities plus qualification/route mappings and
per-route weighting require a separate product and data-model investigation.
That work may affect reference data, schema, APIs, weighting logic, and
migrations; it is not a failed implementation of the approved Slice 3
correction and is not a Slice 3 merge blocker.

## Additional Backlog

Dashboard `This week` task-chart tooltip has a dark-mode contrast issue.

Classification: PRE-EXISTING / OUT-OF-SCOPE UI ISSUE.

Status: DEFERRED — NON-BLOCKING.

Recommended follow-up: backlog / future UI cleanup. No source change was made
for it in Slice 3.

## Slice Commit History Audit

Actual complete history from the integration baseline to the Slice head:

1. `7de3661fa496765aec506fe348cf8d1e70223c44` — `feat(phase3): add user-owned past-paper attempts`
2. `dac5dca4f67ddf92cbe42eabd702fd92414a1c3d` — `fix(phase3): make past-paper sequence grant portable`
3. `741425d790d7e36d51ff7fe11798c94b07a0186b` — `docs(phase3): record slice 3 hosted cutover and e2e`
4. `7b1d532ac2e46afb026cb749bb39d6fded281943` — `fix(slice3): address focused browser QA findings`

No unexplained commits exist. History was inspected only; it was not rewritten.

## Complete Diff Audit

The complete target-to-Slice diff contains 39 changed files (4,329 additions,
183 deletions), classified as follows:

- Database/schema: `lib/db/src/schema/pastPaperAttempts.ts`
- Migration: `lib/db/migrations/0008_uneven_mojo.sql`, its `0008` snapshot, and the journal entry
- API: past-paper helper/routes plus Dashboard, Progress, and Subject Performance scoping; associated API tests
- Generated contracts: OpenAPI specification plus API client/Zod generated types
- Frontend: Past Papers, Dashboard Subject Mastery filtering, Progress display, chart formatting/tooltip, and component-option utilities; associated frontend tests
- Documentation: Reports 47–51

No changed path is a secret, `.env` file, `.vercel` directory, coverage output,
distribution output, smoke artifact, inspection download, OIDC credential, or
unrelated project file. `git diff --check` passes.

The focused correction commit changes only frontend presentation/tests and
Report 51 (15 files); it does not alter backend routes, contracts, schema,
migrations, RLS, hosted data, or authentication behavior.

## Migration Chain Audit

Slice 3 contributes exactly one SQL migration:
`0008_uneven_mojo.sql`.

- Migrations 0000–0007 are unchanged.
- The journal is valid and sequential from 0000 through 0008.
- No 0009 migration exists.
- The corrected 0008 hash matches the reviewed, hosted-applied migration recorded in Report 50.
- The migration resolves the backing serial sequence portably rather than assuming a physical sequence name.
- Its user ownership and paper-year changes match the hosted verified state.

No migration was run during this audit.

## API, Analytics, and Frontend Review

Past-paper functionality includes caller-scoped list, create, and delete;
allows repeated same-paper attempts; separates four-digit paper year from
`date_attempted`; computes percentage on the server; and validates score and
subject/component consistency. Public subjects catalogue responses remain
neutral. Dashboard, Progress, and Subject Performance all source past-paper
analytics through caller-scoped attempt queries.

The frontend contains the Paper Year input and validation, year rendering,
create/delete flows, bounded percentage formatting, Progress `Papers logged`,
the corrected Subject Performance tooltip tokens, component labels containing
paper code/name/level, and Subject Mastery filtered to current authenticated
subject memberships. No canonical-paper architecture change occurred.

## Validation Evidence

Latest verified evidence:

- Typecheck: PASS
- Frontend tests: 74 PASS across 15 files
- Frontend build: PASS
- API tests: 49 PASS
- Script tests: 19 PASS
- Exact-loopback integration guard: 11 PASS
- API integration tests: 36 PASS, including the sequence portability test
- Hosted API E2E: PASS
- Browser isolation: PASS
- Focused QA: PASS after the owner disposition above

Counts are taken from the authoritative implementation/cutover reports and
the correction validation report; no tests were rerun solely for this
documentation audit.

## Merge Conflict Preview

Read-only `git merge-tree` analysis of the target baseline and Slice head
reports a clean result.

Clean merge expected: YES.

Conflicting files: none.

## Production Safety

Production branch/deployment: UNTOUCHED by Slice 3 QA corrections.

Historical frontend: UNTOUCHED.

API-only Vercel project: UNTOUCHED.

Current Slice QA Preview: Preview only. No Preview was promoted, and no
Production deployment is required for merge clearance.

## Deferred Items

The following do not block Slice 3:

1. Canonical paper / qualification-route architecture investigation.
2. Dashboard `This week` chart dark-mode tooltip.
3. New explicit Dashboard paper-count card.
4. AS/A2/Both per-subject product requirement, if it remains separately planned.

## Merge Gate

Security blockers: NONE.

Functional Slice 3 blockers: NONE.

Migration blockers: NONE.

QA blockers: NONE AFTER OWNER DISPOSITION.

Final merge clearance: PASS.

## Verdict

SLICE 3 FINAL MERGE CLEARANCE PASSED — READY FOR OWNER MERGE AUTHORIZATION.
