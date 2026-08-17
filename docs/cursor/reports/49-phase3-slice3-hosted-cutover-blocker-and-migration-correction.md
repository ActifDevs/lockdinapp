# Phase 3 Slice 3 — Hosted Cutover Blocker and Migration Correction

Date: 2026-08-10
Branch: `phase3-s3-past-paper-ownership`
Reviewed implementation commit: `7de3661fa496765aec506fe348cf8d1e70223c44`
Hosted project: `hazvcdrcvsxmuwdfiucx`

## Purpose and chronology

This report records a blocked hosted cutover and the pre-release correction of
Migration 0008. It supersedes only Report 48's assumption that the physical
serial sequence name was portable; Report 48 remains unchanged as
contemporaneous implementation evidence.

1. Migration `0008_uneven_mojo.sql` was reviewed and committed at `7de3661`.
2. Hosted read-only preflight proved the intended project, journal 0000–0007,
   zero `past_paper_attempts` rows, and absent `user_id` / `year` columns.
3. The tracked `@workspace/db migrate` runner attempted Migration 0008.
4. The runner exited nonzero and the database transaction rolled back.
5. Read-only verification proved the hosted journal remained 0000–0007 and
   the hosted schema, policies, grants, shared data, and attempt count remained
   unchanged.
6. No Dashboard SQL Editor, manual migration fragment, manual journal edit,
   reconciliation, or destructive recovery was used.
7. The root cause was a hard-coded sequence name: local used
   `public.past_papers_id_seq`, while hosted used
   `public.past_paper_attempts_id_seq`.
8. Migration 0008 was corrected before any successful hosted application.
9. A disposable loopback database was rebuilt from the historical pre-0000
   shape and the tracked 0000–0008 chain was applied from the beginning.
10. Hosted application E2E was **NOT RUN — CUTOVER BLOCKED**. This is not an
    application test failure.

## Sequence-name provenance

The repository originally had no tracked migration baseline. Commit `f271bef`
defined `past_papers.id` as `serial`, and the schema was created through the
old scratch `drizzle-kit push` workflow. That produced
`public.past_papers_id_seq`.

The first tracked migration, `0000_syllabus_reference_and_paper_attempts.sql`,
is incremental. It renames `past_papers` to `past_paper_attempts`; PostgreSQL
preserves the name and ownership of the existing serial sequence during that
table rename. A local database evolved through this path therefore resolves:

`pg_get_serial_sequence('public.past_paper_attempts', 'id')`

to `public.past_papers_id_seq`.

Hosted Phase 0 followed the separately documented bootstrap path in checkpoint
`2026-07-29_0156`: the target schema was created directly on an empty project,
then journal entry 0000 was recorded. Creating the already-renamed table with a
`serial` id produced `public.past_paper_attempts_id_seq`. Both sequences are
owned by `past_paper_attempts.id`, and both defaults call their respective
owned sequence.

The defect was therefore the assumption that a physical sequence name was
portable across the two valid historical provisioning paths.

## Migration correction

File: `lib/db/migrations/0008_uneven_mojo.sql`

Old LF-normalized SHA-256:
`831167e99874fba507a35ff22dabfdd146b23d714271671e59cdac0f09a40f73`

Corrected LF-normalized SHA-256:
`263e7fe889d77e178b02dc267529b6666d57dda668bd062b705d85148a776934`

The corrected migration:

- resolves the sequence owned by `public.past_paper_attempts.id` with
  `pg_get_serial_sequence`;
- resolves its schema/name from `pg_class` and `pg_namespace` and requires
  `relkind = 'S'`;
- raises SQLSTATE `55000` with
  `past_paper_attempts_id_sequence_missing` if no backing sequence exists;
- quotes the resolved schema and sequence identifiers with `format('%I.%I')`;
- revokes sequence privileges only from `PUBLIC`, `anon`, and
  `authenticated` on that resolved sequence;
- grants only `USAGE` and `SELECT` on that sequence to `authenticated`.

No table, column, policy, index, foreign-key, year-check, or ownership design
changed. No Migration 0009 was created. Migrations 0000–0007, snapshot 0008,
and `_journal.json` did not require modification because the logical schema,
tag, index, and timestamp did not change.

## Clean local migration proof

Target proof:

- configured URL: exact loopback `127.0.0.1:54322`;
- database: `postgres`;
- pre-reset Auth users and all user-owned table rows: zero;
- reference content was reproducible from the canonical syllabus importer.

The local database was reset without manually editing the Drizzle journal.
The reset command recreated Postgres but returned nonzero while the local
Storage container restarted unhealthy. Subsequent local status and direct
read-only database checks proved Postgres healthy with zero public tables and
no Drizzle journal. This environmental Storage warning did not affect the
database rebuild.

Because committed Migration 0000 is intentionally incremental, the historical
pre-0000 schema from commit `f271bef` was applied to the empty disposable local
database using the documented scratch-local `drizzle-kit push` exception. It
produced `past_papers` backed by `public.past_papers_id_seq`. The repository's
tracked Drizzle runner then applied migrations 0000, 0001, 0002, 0003, 0004,
0005, 0006, 0007, and corrected 0008 successfully.

Final local journal:

- entries: exactly 0000–0008;
- latest timestamp: `1786394449630`;
- latest hash:
  `263e7fe889d77e178b02dc267529b6666d57dda668bd062b705d85148a776934`.

The canonical nine-subject syllabus catalogue was then restored through the
repository importer.

## Sequence portability proof

The clean migration chain proved the corrected block against
`public.past_papers_id_seq`. A focused integration test then opened a local
transaction, renamed that owned sequence to
`public.past_paper_attempts_id_seq`, executed the exact grant block extracted
from Migration 0008, and verified:

- `pg_get_serial_sequence` followed the alternate name;
- `authenticated` had `USAGE = true` and `SELECT = true`;
- `authenticated` had `UPDATE = false`;
- the transaction rolled back, restoring the original local name.

This provides deterministic local proof for both historically observed names
without changing hosted Supabase.

## Local schema and security verification

- `user_id uuid NOT NULL`: PASS
- `year integer NOT NULL`: PASS
- `user_id -> auth.users(id) ON DELETE CASCADE`: PASS
- four-digit year constraint: PASS
- owner/date and owner/subject/date indexes: PASS
- RLS enabled: PASS
- authenticated SELECT-own policy: PASS
- authenticated INSERT-own `WITH CHECK`: PASS
- authenticated DELETE-own policy: PASS
- UPDATE policy/grant absent: PASS
- `anon` table access absent: PASS
- authenticated table grants exactly SELECT/INSERT/DELETE: PASS
- actual backing sequence grants limited to USAGE/SELECT: PASS

## Regression evidence

- Workspace typecheck: PASS
- API unit tests: 49/49 PASS
- Frontend tests: 64/64 PASS
- Script tests: 19/19 PASS
- Exact-loopback integration guard: 11/11 PASS
- API integration tests: 36/36 PASS (one focused portability test added)
- API build: PASS
- Frontend build: PASS
- `git diff --check`: PASS

The frontend build retained its known base-path and sourcemap warnings and
completed successfully.

## Hosted final read-only state

A fresh read-only transaction against project `hazvcdrcvsxmuwdfiucx`
confirmed:

- journal: exactly 0000–0007;
- latest timestamp: `1786302770787`;
- `past_paper_attempts` rows: 0;
- `user_id`: absent;
- `year`: absent;
- 0008 owner policies: absent;
- 0008 privilege reset/grants: absent.

No hosted write occurred during this correction task.

## Vercel read-only discovery

- authenticated CLI identity: `lockdinapp26-7169`;
- linked team/project: `actif-devs/lockdinapp`;
- project ID: `prj_mAJNDRGExffevfYDKc7oj3xowPV6`;
- project root: `artifacts/api-server`;
- Git repository verified from deployment metadata:
  `ActifDevs/lockdinapp`;
- existing Slice 3 Preview at original commit `7de3661`:
  `https://lockdinapp-lo76q91v7-actif-devs.vercel.app`;
- branch Preview alias:
  `https://lockdinapp-git-phase3-s3-past-paper-ownership-actif-devs.vercel.app`.

The `7de3661` deployment is explicitly not the corrected Preview. The immutable
Preview for the correction commit cannot exist until that commit is pushed and
must be verified afterward by exact Git SHA before future hosted E2E.

The linked project's Production URL is `https://lockdinapp.vercel.app`.
Historical repository evidence also references
`https://lockedin-study.vercel.app`; their relationship remains an unresolved,
non-blocking deployment-topology question for Owner review. Neither Production
URL, alias, domain, project configuration, nor environment was modified.

`.env.local` and `.vercel/` are Git-ignored. Neither is included in the
correction diff, and no token, password, key, connection string, or disposable
credential is recorded here.

## Scope and next gate

- Dashboard SQL Editor used: NO
- Hosted journal manually edited: NO
- Hosted Migration 0008 applied: NO
- Implementation source changed: NO
- Reports 43–46 changed: NO
- Slice 4 work: NO
- Merge: NO
- Production deployment/promotion: NO

The corrected migration and evidence are ready for correction-commit review.
After the correction commit is pushed, its READY Preview must be matched to the
exact correction SHA. A second controlled hosted cutover remains a separate,
explicitly authorized task.
