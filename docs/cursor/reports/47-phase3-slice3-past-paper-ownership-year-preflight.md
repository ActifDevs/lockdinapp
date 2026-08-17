# Phase 3 Slice 3 — Past-Paper Ownership + Year Preflight

## Audit-Trail Note

The Slice 3 preflight was originally performed as a read-only Codex task. By
instruction, that task did not create or commit a repository file. This Report
47 is the repository recording of that already-completed pre-implementation
analysis, added now for audit-trail continuity before the Slice 3 implementation
is committed.

This report preserves what was established and recommended during preflight. It
does not present later implementation findings as though they were known at the
time.

## Baseline

- Integration branch: `phase3-multitenancy`
- Integration SHA: `548b68720e8a2017d174e1d7c6672052836e3e92`
- `main` at preflight: `492e2a4b655c277f45ed90522065a84190bbc8f1`
- Working tree: clean
- Repository migration chain: exactly 0000–0007
- Competing Migration 0008: none found
- Proposed implementation branch: `phase3-s3-past-paper-ownership`

## Existing Past-Paper Model

The existing `past_paper_attempts` table mixed shared paper identity with a
student's personal attempt data. It had neither:

- `user_id`
- paper `year`

The existing identity fields included subject, component, variant, and session,
while `date_attempted` described when the student sat the paper. The attempt date
could not safely stand in for the paper's publication year.

## Hosted Read-Only Evidence

Authorized hosted inspection targeted project `hazvcdrcvsxmuwdfiucx` and used a
read-only transaction.

- `past_paper_attempts` rows: 0
- `past_paper_attempts.user_id`: absent
- `past_paper_attempts.year`: absent
- Hosted Drizzle journal: exactly 0000–0007

No hosted write, migration, journal mutation, deployment, or user creation was
performed during preflight.

The zero-row state was the critical migration-safety fact: ownership and paper
year could not be inferred honestly for existing personal records. A changed
non-empty state would require stopping for Owner review rather than deleting,
backfilling, or guessing.

## Risks Identified

- No durable attempt ownership boundary.
- Potential cross-user leakage through list, dashboard, progress, or subject
  performance analytics.
- Subject performance was public despite becoming personal when backed by
  attempts.
- Legacy grants were broader than the intended personal-data surface.
- A submitted component could be mismatched with the submitted subject unless
  explicitly validated.
- Client-supplied percentage could disagree with score and total marks.
- Paper identity was ambiguous without a distinct paper year.
- RLS without deliberate ownership policies and minimum grants did not provide
  the required multi-tenant model.

## Recommended Schema

Ownership:

```text
user_id UUID NOT NULL
→ auth.users(id)
→ ON DELETE CASCADE
```

Paper year:

```text
year INTEGER NOT NULL
CHECK year BETWEEN 1000 AND 9999
```

No default was recommended. The current year and `date_attempted` were both
explicitly rejected as sources from which to guess the paper year.

Owner-scoped read indexes were recommended for:

- `(user_id, date_attempted DESC, id DESC)`
- `(user_id, subject_id, date_attempted DESC, id DESC)`

No uniqueness constraint was recommended for paper identity. The same user must
be able to record the same component, variant, session, and year more than once,
and different users must be able to record that same identity independently.

## Recommended Security and API Boundary

The recommended database model was normal authenticated owner-scoped RLS:

- SELECT: `auth.uid() = user_id`
- INSERT: `WITH CHECK auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`
- deliberate privilege reset followed by minimum required grants
- no anonymous access to personal attempts

The client was not to select ownership. The proposed ownership path was:

```text
verified JWT → req.userId → server-supplied user_id → RLS
```

Queries were also to filter explicitly by the verified caller as defense in
depth. Request fields such as `userId`, `user_id`, `ownerId`, and `owner_id`
were to be rejected where the validation path permitted.

The API preflight recommended authenticated list/create/delete behavior,
server-calculated percentage, subject/component relationship validation,
four-digit year validation, deterministic newest-first ordering, and caller-only
dashboard/progress/performance consumers. Public subject catalogue responses
were to remain neutral.

## PATCH Scope Chronology

The original preflight identified PATCH / attempt editing as a possible
implementation addition. Before implementation began, Owner review narrowed
Slice 3 to the existing product mutation model:

- POST create
- DELETE remove
- **no PATCH or attempt-edit workflow in Slice 3**

The implementation task was therefore expected to follow the later, narrower
approved scope. This distinction is recorded here without rewriting the
original preflight recommendation.

## Migration Plan

- Generate the next migration through the repository's actual Drizzle tooling.
- Expected number: `0008_<generated-name>`.
- Put an explicit empty-table precondition before adding required owner/year
  columns.
- Stop safely if any attempt row exists.
- Do not infer ownership or year, delete rows, alter unrelated tables, or modify
  migrations 0000–0007.
- Apply and verify locally first through the tracked migration path.
- Leave hosted application for a separate, explicitly authorized cutover gate.

## Preflight Verdict

SLICE 3 PREFLIGHT PASSED — READY TO CREATE IMPLEMENTATION BRANCH
