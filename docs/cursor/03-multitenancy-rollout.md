# Phase 3 — Multi-tenancy rollout

**Precedes:** Phase 4. **Depends on:** Phase 2 fully done and proven on
`tasks`, including its two-user integration test passing.

## The rule for this phase: one table, one PR, every time

Everything here is mechanically the same pattern as Phase 2 — migration →
RLS policy → middleware → client wiring → two-user integration test — applied
to each remaining user-owned table. The temptation once the pattern is
proven is to batch several tables into one big migration "since it's the
same thing four times." Don't. A bad RLS policy on `exam_dates` shouldn't
block or get tangled up with a good one on `past_paper_attempts` in code
review, and if something's wrong in production you want to know which table
broke, not which migration.

## Table 1 of 4: `past_paper_attempts` — the easy one

Structurally this table is already ahead of the report's own ask (report
described paper identity as a flat string like `"9702/42"`; this repo already
models it as `subject_id` + `component_id` (FK into `assessment_components`)
+ `variant` + `session` enum, with a derived display string computed at read
time). The schema file's own doc-comment (`lib/db/src/schema/
pastPaperAttempts.ts`) explicitly notes `user_id` was deferred until auth
ships — this is that moment. Apply the exact `tasks` pattern:
`user_id`, RLS, middleware, client wiring, two-user test. No structural
surprises expected here.

## Table 2 of 4: `exam_dates` — resolve an actual ambiguity first

`lib/db/src/schema/examDates.ts` currently models `exam_dates` as: subject +
paper code + date + notes, with **no ownership concept at all**, shared
across the whole (currently single, implicit) user base. Before touching
this table, get an actual answer to a product question, because the
schema-correct move is different depending on the answer:

- If these are **official Cambridge exam-timetable dates** (the real date
  9702/42 is sat, same for every student sitting that paper) — this should
  stay *shared reference data*, like `syllabus_topics`. Adding `user_id`
  here would be wrong for the same reason it'd be wrong on `syllabus_
  topics` — it'd fork one canonical fact into N per-user copies.
- If these are **a student's personal exam-day entries** (self-reported, may
  differ from the official timetable, e.g. exam center scheduling quirks) —
  this is genuinely user-owned and gets the standard `user_id` + RLS
  treatment.
- If it's currently a mix of both use cases stuffed into one table (plausible
  — check whether any current app UI lets a user *edit* an exam date, versus
  only ever displaying one) — that's two tables, not one column decision.
  Splitting a table after real user data exists is much more painful than
  deciding this now, before Phase 3 even starts on this table.

Read how the frontend actually uses `exam_dates` (search for its usage in
the calendar/progress views) before deciding — don't guess from the schema
alone.

## Table 3 of 4: `topic_progress` — the one with a real migration, not just an addition

This is the one place in the whole plan where I need to correct something I
said earlier: `syllabus_topics.status` and `.notes` **already exist** as
columns directly on the shared reference table (confirmed in the schema
file's own doc-comment — this was intentional, deliberate scope for the
single-user prototype, not an oversight). That's a real problem for
multi-tenancy: one shared row can't hold a different `status` for two
different students studying the same topic. This needs an actual data
migration, sequenced carefully:

1. **Migration A — additive only.** Create `topic_progress` (`user_id`,
   `topic_id`, `status`, `notes`, timestamps), FK'd to both `auth.users` and
   `syllabus_topics`, with RLS. Do **not** touch or drop
   `syllabus_topics.status`/`.notes` in this migration.

2. **Backfill.** For every existing `syllabus_topics` row that has a
   non-default `status` or non-null `notes`, insert a corresponding
   `topic_progress` row. Since there's no real multi-user data yet (auth
   didn't exist until Phase 2), this backfill effectively attributes all
   existing progress to whichever single account has been used for testing
   so far — confirm that's actually correct/acceptable before running it,
   since if multiple people have been poking at a shared dev/staging DB
   under the fake localStorage auth, "backfill it all to user X" may not be
   the right call, and a clean wipe instead might be more honest for
   pre-launch data.

3. **Cut over reads/writes.** Update the API routes and frontend to read/
   write `topic_progress` instead of `syllabus_topics.status`/`.notes`.

4. **Migration B — deprecate, in a separate PR, once nothing reads the old
   columns.** Only after step 3 is live and verified do you drop (or at
   minimum stop writing to) `syllabus_topics.status`/`.notes`. Keeping
   Migration A and Migration B separate means if something's wrong with the
   new table, you haven't also destructively dropped the old data path in
   the same breath.

RLS for `topic_progress` is the standard `auth.uid() = user_id` pattern —
nothing novel there, the novelty is entirely in the backfill/cutover
sequencing above.

## Table 4 of 4: `user_subjects` — new table, no existing data to migrate

Subject enrollment is currently implicit/global (every subject just... shows
up). Create `user_subjects` (`user_id`, `syllabus_version_id`, `subject_id`,
enrolled-at timestamp, maybe a `target_grade` field if the report's
gamification/goal-setting features need it — check the report's spec before
adding fields speculatively). **Target Phase 3 design:** `user_subjects` must
reference `syllabus_version_id` alongside `subject_id` to pin each user to a
specific syllabus version. Shared syllabus records must not be duplicated per
user. Standard RLS. This one's genuinely additive with no backfill complexity,
since there's no prior per-user enrollment concept to migrate from — every
existing test account effectively gets "enrolled" in whatever subjects it's
currently interacting with, which you can backfill simply by looking at which
subjects have `tasks` or `past_paper_attempts` rows for that user.

## Cursor prompt (run once per table — fill in the bracket)

```
Read docs/lockdin-architecture-plan.md section 6, .cursor/rules/
lockdin-architecture.mdc, and this entire file
(docs/cursor/03-multitenancy-rollout.md) before starting. Assume Phase 2 is
complete and proven on tasks.

Table for this pass: [past_paper_attempts | exam_dates | topic_progress |
user_subjects] — do ONLY this table in this session, as a standalone PR.

If exam_dates: before writing any migration, search the frontend for every
place exam_dates is read or written, and tell me whether the current usage
looks like shared canonical exam-timetable data, personal per-user entries,
or a mix of both. Wait for my decision before proceeding — do not add
user_id speculatively.

If topic_progress: this is NOT a simple additive change. Follow this exact
sequence and stop between each step for my confirmation:
1. Migration A: create topic_progress with RLS, do not touch
   syllabus_topics.status/.notes in this migration. Show me the migration
   before applying it.
2. Propose the backfill query and show it to me before running it — tell me
   explicitly which existing data it will attribute to which user, and flag
   if you think a clean wipe would be more honest than backfilling to a
   single test account.
3. After I approve and you run the backfill, update the relevant API routes
   and frontend components to read/write topic_progress instead of the old
   columns. Show me the diff.
4. Only after step 3 is verified working, propose Migration B (deprecating
   the old columns) as a SEPARATE migration/PR — do not combine it with
   Migration A.

If past_paper_attempts or user_subjects: apply the same pattern as the
tasks table from Phase 2 — migration, RLS policy (show me before applying),
middleware wiring, client wiring, two-user integration test. For
user_subjects specifically, propose a backfill approach based on which
subjects each existing user already has tasks/past_paper_attempts rows for,
and show me before running it.

For every table: the definition of done is the same as tasks in Phase 2 —
a two-real-user integration test proving isolation, shown to me, not just
claimed.
```

## Definition of done (per table, all four before Phase 4 starts)

- [ ] `past_paper_attempts`: `user_id` + RLS + middleware + passing
      two-user test
- [ ] `exam_dates`: ownership model explicitly decided (shared / personal /
      split) before any schema change, then implemented per that decision
- [ ] `topic_progress`: Migration A and backfill reviewed and approved
      before running; cutover verified working; Migration B (deprecating
      old columns) landed as a separate, later PR
- [ ] `user_subjects`: table exists, RLS'd, backfilled sensibly from
      existing per-user activity
- [ ] Each table's PR is standalone — no table's migration is bundled with
      another's

## Rollback

Migration A for `topic_progress` is safe to roll back at any point before
Migration B runs, since the old columns are untouched. Once Migration B
drops those columns, rolling back means restoring from a backup, not
reverting code — that's exactly why Migration B is gated on the cutover
being verified first, not just "should be fine."
