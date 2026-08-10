# Phase 3 Slice 2B — Journal Reconciliation Provenance Addendum

## Executive Summary

Report 45 established that the executable body of Migration
`0007_eager_squadron_supreme` was manually run against hosted project
`hazvcdrcvsxmuwdfiucx` through the Supabase Dashboard SQL Editor. At the time
of Report 45's investigation, the hosted Drizzle journal contained the `0007`
row, but the report could not recover whether that row came from a tracked
migration command or a separate bookkeeping action.

This addendum records later, independently established evidence that closes
that one remaining audit-trail gap. It does **not** rewrite Report 45 as
though this evidence were available during its original execution. Report 45
remains the provenance record for the earlier Dashboard DDL; this report is
the provenance record for the separate, subsequently authorized journal-only
reconciliation.

The two actions were distinct:

1. The destructive `DROP COLUMN` DDL was manually executed earlier through
   the Supabase Dashboard SQL Editor.
2. A separate, explicitly authorized Codex task later inserted only the
   missing canonical `0007` row into the hosted Drizzle migration journal.

The reconciliation did not replay Migration `0007`, execute schema DDL,
recreate either dropped column, or modify any existing journal entry.

## State Before Journal Reconciliation

The reconciliation task began by proving the connection targeted hosted
Supabase project `hazvcdrcvsxmuwdfiucx` through a non-loopback session-pooler
connection. Its read-only pre-write verification established:

| Check | Observed state |
| --- | --- |
| Migration `0007` DDL | Already present |
| `public.syllabus_topics.status` | Absent |
| `public.syllabus_topics.notes` | Absent |
| Hosted Drizzle journal | Exactly `0000`–`0006` |
| Existing canonical `0007` journal row | Absent |
| `public.syllabus_topics` rows | `520` |
| `public.topic_progress` | Intact |
| Shared subjects | `9` |
| Shared syllabus versions | `9` |

The schema therefore represented the intended `0007` end state while the
hosted migration journal still represented only `0000`–`0006`.

## Authorized Journal-Only Reconciliation

The later Codex task was authorized only to reconcile the missing hosted
Drizzle journal entry. It used the repository journal, the committed
migration file, and Drizzle's actual PostgreSQL migrator implementation to
derive the canonical hosted record shape: `hash` plus `created_at`, with the
journal table assigning its own serial `id`.

Canonical repository metadata:

| Field | Value |
| --- | --- |
| Migration | `0007_eager_squadron_supreme` |
| Repository journal index | `7` |
| Repository migration timestamp | `1786302770787` |
| LF-normalized SHA-256 | `4eab521214bf0b5c83b15a5568b0d1abaf5f98566fec28866ea6be65a96581aa` |

Inside a locked, serializable transaction, the task rechecked that the
journal still ended at canonical `0006`, that no row matched the `0007` hash
or timestamp, and that both legacy columns remained absent. It then inserted
exactly one row into `drizzle.__drizzle_migrations` using the canonical
`hash` and `created_at` values. The table assigned hosted row `id=8`.

The transaction asserted before commit that:

- the hosted journal had exactly eight rows after the insert;
- the new row matched the canonical `0007` hash and timestamp; and
- existing hosted rows `1`–`7` (`0000`–`0006`) were unchanged.

No migration SQL was passed to the database. No schema table, RLS policy,
grant, RPC, shared catalogue row, Auth user, or application-owned row was
created or modified by the reconciliation.

## State After Reconciliation

An independent post-write check ran in a fresh explicit read-only transaction
and compared every hosted journal row directly with the repository journal
and LF-normalized migration-file hashes.

| Check | Result |
| --- | --- |
| Hosted journal | Exactly `0000`–`0007` |
| Hosted entries vs repository | All eight hashes and timestamps match |
| Existing `0000`–`0006` entries | Unchanged |
| `public.syllabus_topics.status` | Absent |
| `public.syllabus_topics.notes` | Absent |
| `public.topic_progress` PK / RLS / SELECT-own policy | Intact |
| `topic_progress` grants and trusted RPCs | Intact |
| Subjects | `9` |
| Syllabus topics | `520` |
| Syllabus versions | `9` |
| Application/user-owned row counts | Unchanged |

This establishes the final hosted state as **Migration `0007` DDL applied and
the Drizzle journal consistent through `0007`**.

## DDL Provenance and Journal Provenance Are Separate

These events must not be conflated:

| Event | Mechanism | Meaning |
| --- | --- | --- |
| Legacy-column removal | Manual Supabase Dashboard SQL Editor execution recorded by Report 45 | Performed the destructive `DROP COLUMN` DDL |
| Journal reconciliation | Later, separately authorized Codex bookkeeping task | Recorded the already-present migration state without replaying DDL |

Report 45 dates the Dashboard execution to approximately
`2026-08-09 19:47:27–29 UTC`. The journal value `1786302770787` corresponds
to the repository migration metadata time (`2026-08-09T19:12:50.787Z`); it
is **not** the wall-clock timestamp at which the Dashboard SQL Editor ran the
DDL. The journal records migration ordering and identity, while Report 45's
Postgres/Dashboard evidence records the actual hosted execution mechanism and
time.

## Phase 3 Hosted Migration Process Rule

The normal hosted migration path for remaining Phase 3 work is:

```text
reviewed migration file
→ controlled migration task
→ drizzle-kit migrate / approved tracked migration path
→ hosted verification
→ report
```

Tracked migration files must **not** be pasted or run manually through the
Supabase Dashboard SQL Editor during normal Phase 3 work.

If hosted DDL is discovered to exist while the migration journal is behind:

1. **Stop and report.**
2. Do not replay the DDL.
3. Do not manually modify the journal.
4. Do not improvise reconciliation.
5. Reconcile only under a separately reviewed and explicitly authorized
   bookkeeping task after the hosted DDL and canonical repository metadata
   have been verified.

This is a mandatory process gate. The same manual Dashboard migration pattern
occurred for both Slice 2A and Slice 2B; the second occurrence created a
Production/application schema incompatibility because deployed Production
code still selected the removed columns.

## Production Recovery Is a Separate Stream

Production recovery has been handled separately through the dedicated
`hotfix/main-drop-legacy-topic-columns` workflow and pull request. This
addendum does not reproduce, review, cherry-pick, merge, or modify that
incident-response work. It does not modify `main`, Production deployment
configuration, or PR #8.

The Production hotfix stream and the Slice 2B implementation/audit stream
remain separate. Mentioning the recovery here provides chronology only; it
does not import the hotfix into this branch or alter any merge-clearance gate.

## Slice 2B Scope Preservation

This correction is documentation-only. It does not change application, API,
frontend, migration, schema, tests, snapshots, or generated contracts. The
already-reviewed Slice 2B implementation remains unchanged, including:

- the per-user `topic_progress` ownership model;
- removal of shared legacy `syllabus_topics.status` / `notes`;
- explicit catalogue projections;
- onboarding catalogue error and retry UX; and
- the existing one-to-five subject-selection rule.

AS-only, A2-only, or combined AS+A2 subject enrolment remains a later product
feature and is not part of Slice 2B.

## Updated Audit-Trail Status

Read Report 45 and this addendum together:

- Report 45 establishes how and when the destructive hosted `0007` DDL was
  executed and documents the resulting Preview/Production incident context.
- Report 46 establishes how the already-present `0007` DDL was later recorded
  in the hosted Drizzle journal without replaying or changing the schema.

The previously unresolved journal-row origin is now closed. The Slice 2B
hosted schema and migration journal are consistent through `0007`; remaining
QA and merge-clearance decisions stay in their own authorized gates.

## Final Safety Verification Checklist

- [x] Report 45 left unchanged as historical evidence
- [x] Earlier Dashboard DDL and later journal reconciliation kept distinct
- [x] Canonical `0007` index, timestamp, tag, and hash recorded
- [x] Hosted before/after state and unchanged row counts recorded
- [x] Normal tracked hosted-migration path documented
- [x] Stop-and-report rule documented for DDL/journal divergence
- [x] Separate authorization required for any future reconciliation
- [x] Production hotfix/main/PR #8 left separate and untouched
- [x] Migration `0007` and all Slice 2B source code unchanged
- [x] No hosted operation, deploy, merge, or Slice 3 work performed by this report
