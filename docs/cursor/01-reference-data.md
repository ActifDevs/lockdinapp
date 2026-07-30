# Phase 1 — Reference data becomes real

**Precedes:** Phase 2. **Depends on:** Phase 0 complete (live DB, migration
applied).

## Why this phase is mostly a verification pass, not a build

The temptation here is to treat "get the syllabus data into the DB" as new
work. It mostly isn't — `scripts/src/syllabus/{parse-csv,normalize,
db-upsert,cli}.ts` already implements a real three-stage pipeline (parse/
validate the 12-column CSVs → normalize into the unit/topic/learning-outcome
tree → idempotent upsert into Postgres), and it already has a test suite
(`__tests__/parse-csv.test.ts`, `db-upsert.test.ts`, `normalize.test.ts`).
There's also a separate, more rigorous QA pass already specified for the raw
CSVs themselves in `docs/cursor_audit_prompt_v2.md` (deterministic validator +
severity-triaged semantic review) — that's a complementary, narrower tool for
auditing the *source CSVs*, not a replacement for what's below, which is about
verifying the *pipeline that loads them*.

The actual risk in this phase isn't "the code doesn't exist," it's "the code
has never been run against a real database, twice, and diffed." Idempotency
claims from unit tests are not the same guarantee as idempotency proven
against live Postgres — a unit test can mock the upsert layer in a way that
never exercises real `ON CONFLICT` behavior, unique constraint interactions,
or partial-failure states.

## What's already correct and shouldn't be touched

- The subject → syllabus_version → syllabus_unit → syllabus_topic →
  syllabus_learning_outcome hierarchy in `lib/db/src/schema/` matches the
  normalized shape the report calls for.
- `assessment_components` and the atomized `past_paper_attempts` (subject +
  component + variant + session, not a raw `"9702/42"` string) are *ahead*
  of the deep-research report's ask — the report described papers as a flat
  code; this repo already models them properly. Don't regress this.
- `manifest.ts` wires up which CSVs map to which subjects — read it, don't
  rebuild it, unless you find it's actually missing a subject.

## Step-by-step

1. Read `manifest.ts` and list all subjects wired in. Cross-check against
   the 9 subjects the report and prior audit both expect (the checkpoint's
   `_audit_report.json`, if present, should have expected row counts per
   subject — use those as a sanity check, not gospel, since that file could
   also be stale).

2. Run the existing test suite for all three pipeline stages:
   ```bash
   pnpm --filter @workspace/scripts test
   ```
   All green is a prerequisite, not a nice-to-have — don't run a live import
   against a codebase with failing tests in the exact pipeline you're about
   to trust.

3. Run `pnpm --filter @workspace/scripts syllabus:validate` and read the *entire*
   output, not just the exit code. This step requires a working `DATABASE_URL` —
   the CLI imports the database module at startup.

4. Run `pnpm --filter @workspace/scripts syllabus:import` once. Capture counts.

5. Run `pnpm --filter @workspace/scripts syllabus:import` a second time, same
   database, same input. **This is
   the step nobody skips in a demo and everybody regrets skipping in
   production.** Diff the counts. The current implementation preserves final
   table row counts and does not accumulate duplicate domain rows, but
   `learning_outcome_components` undergoes delete-and-reinsert relationship
   churn. Relationship "created" reporting therefore does not represent only
   newly created rows. Diff-based relationship synchronization remains deferred
   technical debt.

6. Check whether `db-upsert.ts` actually respects a `--dry-run` flag if the
   CLI advertises one — read the code path, don't take the `--help` text's
   word for it. If it's aspirational (flag parsed but not wired to skip
   writes), either wire it properly or stop advertising it, since a
   dry-run flag that silently writes is worse than not having one.

7. Spot-check the normalized output against source: pick 2-3 topics per
   subject and manually confirm the learning outcomes attached to them in
   the DB match the source CSV. Automated tests catch structural bugs; they
   don't catch "normalize.ts silently dropped every third learning outcome
   for one subject because of an edge case in its splitting logic."

## What NOT to do

- Don't touch the frontend's hardcoded `SUBJECT_CATALOG` fallback in this
  phase. It's Phase 5's job to retire it, and ripping it out early just
  breaks the frontend for no reason before the DB-backed path is proven at
  the API layer.
- Don't "improve" `normalize.ts` or `parse-csv.ts` speculatively in this
  phase unless you find an actual bug via the steps above. This phase is
  about trust, not refactoring.

## Cursor prompt

```
Read docs/lockdin-architecture-plan.md section 4 and this entire file
(docs/cursor/01-reference-data.md) before starting. Assume Phase 0 is done
and DATABASE_URL is live and migrated.

1. Read scripts/src/syllabus/manifest.ts and list every subject wired in.
2. Run the full test suite for parse-csv, normalize, and db-upsert:
   ```bash
   pnpm --filter @workspace/scripts test
   ```
   Paste the results. If anything fails, stop here and report it — do not proceed
   to a live import against a database with failing pipeline tests.
3. Run `pnpm --filter @workspace/scripts syllabus:validate` and paste the complete
   output (not a summary).
4. Ask me to confirm before running `pnpm --filter @workspace/scripts syllabus:import`
   for the first time.
5. After I confirm: run the import once, report per-subject row/unit/topic/
   learning-outcome counts.
6. Run the import a SECOND time against the same database. Diff the counts
   against step 5's numbers and report the diff explicitly, even if it's
   "zero everywhere" — I want to see the confirmation, not just a "looks
   good."
7. Read db-upsert.ts and tell me whether --dry-run (if it exists as a flag)
   actually skips writes, by tracing the code path — don't infer this from
   the flag's name or help text.
8. Pick 2 topics from 3 different subjects at random, show me the source
   CSV rows for their learning outcomes side-by-side with what's now in the
   syllabus_learning_outcomes table for those topics, so I can eyeball a
   real diff rather than trust an aggregate count.

Do not modify parse-csv.ts, normalize.ts, or db-upsert.ts unless step 2, 6,
or 8 surfaces an actual bug — if you find one, stop and describe it to me
before fixing it.
```

## Definition of done

## Verified Phase 1 results — 30 July 2026

- [x] Manifest contains all 9 expected syllabus files.
- [x] Full syllabus test suite passed: 19/19 tests.
- [x] Database integration tests passed: 3/3 tests.
- [x] Syllabus validation passed: 9/9 files, 0 warnings.
- [x] Import dry-run completed with zero database writes.
- [x] The API returned all 9 database-backed subjects.
- [x] The complete subject → unit → topic → learning-outcome hierarchy was verified.
- [x] Six topics across three subjects matched the source CSV data:
  - 9702 Physics: Physical quantities; SI units
  - 9709 Mathematics: Quadratics; Functions
  - 9618 Computer Science: Data Representation; Multimedia Graphics
- [x] Previous live twice-import evidence remains valid, with stable final row counts.

### Remaining technical debt

`learning_outcome_components` still uses delete-and-reinsert synchronization
during repeated imports. Final row counts remain stable, but relationship
writes and created-row reporting are not fully differential.

## Rollback

If the import produces bad data, the pipeline should be re-runnable from a
clean slate — confirm `db-upsert.ts`'s upsert keys actually let you safely
truncate the reference tables and re-import, rather than assuming it. Don't
find this out for the first time during an incident.
