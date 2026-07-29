# Phase 6 — Quality gate

**Precedes:** Phase 7 (ship gate). **Depends on:** Phases 0-5 complete —
full multi-tenant product, hardened API, cutover frontend.

## Where the repo actually stands on tests

Worth being honest about this rather than assuming: `scripts/src/syllabus/`
is the one part of this codebase with real automated test coverage
(`__tests__/parse-csv.test.ts`, `db-upsert.test.ts`, `normalize.test.ts`).
Everything built during Phases 2-5 — the highest-risk part of the whole
migration, since it's exactly the auth/RLS boundary — has, at best, the
manual two-user checks each phase document required. Those manual checks
were the right call *during* migration (fast feedback while iterating), but
they don't scale as regression protection once the team is shipping features
on top of this instead of migrating it. Phase 6 converts the manual
verification this plan required at each step into something that runs on
every PR automatically.

## Step-by-step

### 1. RLS boundary tests — the highest-value tests in this entire plan

For every user-owned table (`tasks`, `past_paper_attempts`, `exam_dates` if
it ended up user-owned, `topic_progress`, `user_subjects`), write an
integration test that:
1. Creates two real (or realistically faked, e.g. via Supabase's test
   helpers / a local Supabase instance) users.
2. Inserts a row owned by user A.
3. Confirms user B's session cannot read, update, or delete it — via the
   actual API, not a direct DB query bypassing the app layer, since the
   thing being tested is the whole chain (client → middleware → RLS), not
   just RLS in isolation.
4. Confirms user A *can* read/update/delete their own row, so the test
   isn't accidentally passing because everything is broken and returning
   403 for everyone.

This is worth its own test file/suite, separate from ordinary route tests,
because it's testing a security property, not a feature — treat a failure
here as a stop-the-line severity, not "a test broke."

### 2. API route tests

For every route: unauthenticated request → 401 (or the classified-public
exception from Phase 4). Authenticated request → 200 and correctly scoped
data. Malformed body → 400 via the Zod validation confirmed in Phase 4, not
a raw DB error leaking through.

### 3. CI wiring

At minimum, on every PR:
- Root typecheck (there should already be a root script for this — confirm
  and use it rather than adding a parallel one).
- The existing syllabus pipeline test suite.
- The new integration tests from steps 1-2.
- A migration-drift check (see next point).

### 4. Enforce `migrate`-not-`push` in CI, not just in a doc

A written rule in `.cursor/rules/lockdin-architecture.mdc` only protects
against Cursor forgetting; it does nothing against a human running `push`
directly from a terminal out of habit. Add a CI step that runs `drizzle-kit
generate` and fails the build if it produces a new, undiffed migration file
— that means someone changed the schema without generating/committing the
corresponding migration, which is the actual failure mode this rule exists
to prevent.

### 5. A note on test data hygiene

Integration tests that create real Supabase users need real cleanup —
either a dedicated test project/branch, or explicit teardown that deletes
test users and their cascade-deleted rows after each run. Don't let this
suite quietly accumulate hundreds of `test-user-*@example.com` accounts in
whatever database it points at; decide the test-environment strategy (local
Supabase via their CLI, a dedicated test project, or an ephemeral branch per
CI run) explicitly rather than defaulting to running these against shared
staging.

## Cursor prompt

```
Read docs/lockdin-architecture-plan.md section 9 and this entire file
(docs/cursor/06-quality-gate.md) before starting. Assume Phases 0-5 are
fully complete.

1. First, tell me what test environment strategy you recommend for the RLS/
   integration tests we're about to write (local Supabase CLI instance,
   dedicated test project, ephemeral CI branch) and why, including how test
   users get cleaned up after each run. Wait for my confirmation before
   writing tests that create real accounts anywhere.
2. Once confirmed, write an RLS boundary test suite covering every
   user-owned table (tasks, past_paper_attempts, exam_dates if applicable,
   topic_progress, user_subjects). Each test: two real users, row created
   by user A, confirm user B is denied via the actual API (not a raw DB
   query), and confirm user A succeeds on their own row (so we know the
   test isn't just seeing universal 403s). Run this suite and paste the
   results.
3. Write API route tests: 401 without a token (except confirmed-public
   routes from Phase 4's classification), 200 + correctly scoped data with
   one, 400 on malformed input via the Zod schemas.
4. Find the existing root typecheck script and wire it, the syllabus
   pipeline tests, and the new suites from steps 2-3 into CI to run on
   every PR.
5. Add a CI check that runs drizzle-kit generate and fails if it produces
   an uncommitted migration file, to enforce migrate-not-push at the CI
   level rather than relying on the cursor rules file alone.

Treat any failure in the RLS boundary suite (step 2) as stop-the-line —
report it to me immediately rather than trying to quietly patch the test
until it passes.
```

## Definition of done

- [ ] Test environment/cleanup strategy decided and confirmed before any
      test-user creation
- [ ] RLS boundary suite exists and passes for every user-owned table,
      including a positive case (owner succeeds) alongside the negative
      case (non-owner denied)
- [ ] Route-level auth/validation tests exist and pass
- [ ] CI runs typecheck + syllabus tests + new suites on every PR
- [ ] Migration-drift CI check in place and verified to actually fail on a
      deliberately introduced undiffed schema change (test the test)

## Rollback

None of this phase touches production schema or data — it's pure tooling
and test additions. The only real risk is test-account pollution in a
shared environment if the environment-strategy decision in step 1 gets
skipped; that's cheap to prevent and annoying to clean up after the fact.
