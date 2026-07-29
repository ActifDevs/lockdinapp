# Phase 0 — Environment truth

**Precedes:** everything. **Depends on:** nothing except a real Supabase
connection string existing somewhere.

## Why this phase exists (read this before running the prompt)

Here's the uncomfortable finding from the audit that kicked this whole plan
off: this repo's own documentation cannot currently be trusted about what's
"done." `docs/README.md` and the checkpoint under `docs/checkpoints/` say the
CSV import pipeline is *not implemented*. It is — `scripts/src/syllabus/`
has a working, tested three-stage pipeline (parse → normalize → upsert) and a
real migration file (`lib/db/migrations/0000_syllabus_reference_and_paper_
attempts.sql`) already sitting in the repo. The checkpoint was written against
an older commit and filed under a later timestamp, so it looks current when it
isn't.

The reason that matters for Phase 0 specifically: **almost everything in this
repo has been built and tested against code, but never verified against a
live, deployed database.** `drizzle.config.ts` throws immediately if
`DATABASE_URL` isn't set, which tells you nobody has run a migration against a
real target recently, or this would already be a solved problem. Until that's
verified, every "already implemented" claim (mine included) is really "the
code exists and compiles," not "this works." Phase 0's entire job is closing
that gap before anyone writes a line of new schema.

## What NOT to do in this phase

- Don't write any new schema files or migrations. This phase verifies
  existing infrastructure; it doesn't add to it.
- Don't run `drizzle-kit push` against whatever database you connect to,
  even to "just get started quickly." A migration file already exists
  (`0000_syllabus_reference_and_paper_attempts.sql`), which means the
  project has already committed to migration-history tracking. `push`
  schema-diffs directly against the live DB with no history — the instant you
  run it against a shared database, the migration files and the live schema
  can silently diverge, and nobody will notice until a teammate's `migrate`
  run fails or (worse) succeeds against the wrong assumptions. `lib/db/
  package.json` has both scripts; `migrate` is the one you want:

  ```json
  "generate": "drizzle-kit generate --config ./drizzle.config.ts",
  "migrate": "drizzle-kit migrate --config ./drizzle.config.ts",
  "push": "drizzle-kit push --config ./drizzle.config.ts"
  ```

  `push` / `push-force` are fine for a scratch local Postgres you personally
  own and can throw away, and nowhere else.

## Step-by-step

1. **Get the connection strings.** Supabase gives you two you actually care
   about here: the pooled connection (for the running app, via PgBouncer) and
   the direct connection (for running migrations, which don't play well
   through a pooler in transaction mode). Confirm which one `drizzle.config.ts`
   expects — right now it just reads a single `DATABASE_URL`, so if the team's
   Supabase project uses connection pooling by default, that's a real decision
   to make now, not discover later: point migrations at the direct connection
   explicitly, or you risk migrations mysteriously failing/hanging under a
   pooled connection in transaction mode.

2. **Run the migration.**
   ```bash
   cd lib/db
   pnpm migrate
   ```
   Confirm it applies `0000_syllabus_reference_and_paper_attempts.sql`
   cleanly. If it fails, read the actual error — don't assume and don't
   fall back to `push` to "just make it work." A failed migration on a fresh
   database usually means either the connection string is wrong or the
   migration file itself has an ordering/dependency bug that's never been
   exercised against Postgres for real.

3. **Validate the syllabus CSVs before importing anything.**
   ```bash
   pnpm --filter <syllabus-script-package> exec tsx src/syllabus/cli.ts --mode=validate
   ```
   (Confirm the exact invocation from `scripts/src/syllabus/cli.ts` and its
   `package.json` — read the file rather than guessing the flag names.) This
   step has no side effects and should be run and read in full before import.

4. **Run the import, once.**
   Then immediately run it a **second time** against the same database and
   diff the row counts. If they're not identical, `db-upsert.ts` isn't
   actually idempotent despite what its unit tests claim (unit tests can
   mock the DB layer in a way that hides real upsert-conflict behavior) —
   stop and fix that before this pipeline is trusted for Phase 1's repeated
   re-imports whenever Cambridge revises a syllabus.

5. **Verify against the running API, not just the DB.**
   ```bash
   curl http://localhost:<port>/healthz
   curl http://localhost:<port>/api/subjects
   ```
   Paste the actual JSON. "The DB has rows" and "the API correctly returns
   them" are different claims — `routes/subjects.ts` might have bugs in
   query construction that only show up here.

6. **Regenerate the checkpoint**, and this time make it defensible: base it
   on the actual schema files under `lib/db/src/schema/`, the actual
   migrations under `lib/db/migrations/`, and the actual verified curl output
   from step 5 — not on a description of what you intended to build. Note
   explicitly which claims in the *previous* checkpoint were stale, so the
   next person (human or Cursor) doesn't inherit the same false assumption.

## Cursor prompt

```
Read docs/lockdin-architecture-plan.md section 3 and this entire file
(docs/cursor/00-environment-truth.md) before doing anything.

I'm going to give you a DATABASE_URL. Before I do, tell me:
1. Whether Supabase's pooled or direct connection string is the right one to
   use for running `drizzle-kit migrate`, and why — read drizzle.config.ts
   first.
2. What env var name(s) the app expects it under.

Once I've given you the value:
1. Run `pnpm migrate` inside lib/db and show me the full output, including
   any errors verbatim. Do not fall back to `push` if `migrate` fails — stop
   and show me the error instead.
2. Run the syllabus CLI in validate mode (find and confirm the exact command
   from scripts/src/syllabus/cli.ts — don't guess flags). Show me the full
   output.
3. Wait for my explicit go-ahead before running import mode.
4. After I approve, run the import once, record per-subject row/topic/
   outcome counts, then run it again against the same DB and show me a diff
   of the counts. If they differ at all, stop and tell me — do not proceed
   to "fixing" it without discussing what you found first.
5. Curl /healthz and /api/subjects against the running server and paste the
   raw response.
6. Only after all of the above pass, draft a new checkpoint file under
   docs/checkpoints/ reflecting verified reality, and explicitly list which
   claims in the old checkpoint were wrong.

Do not write, generate, or apply any new schema/migration file in this
session — this phase is verification only.
```

## Definition of done

- [ ] `pnpm migrate` succeeds against the real DB from a clean state
- [ ] Import runs twice with identical row counts (idempotency proven, not
      assumed)
- [ ] `/api/subjects` returns real, non-empty, DB-backed data
- [ ] New checkpoint committed, old checkpoint's stale claims explicitly
      called out somewhere (in the new checkpoint or a short doc-drift note)
- [ ] `migrate` vs `push` decision written down somewhere durable (this file
      counts, but also worth a one-liner in `docs/README.md`)

## Rollback

Nothing in this phase is destructive to source — worst case, a bad migration
run leaves a half-applied schema on a database you can just drop and recreate
before Phase 1 starts. Don't run this phase directly against a database with
real user data in it (there shouldn't be any yet, but confirm that before
you start).
