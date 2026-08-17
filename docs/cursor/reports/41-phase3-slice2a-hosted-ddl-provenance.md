# Phase 3 Slice 2A — Hosted DDL Provenance Correction

## Executive Summary

Report 40 (Slice 2A hosted cutover) recorded that hosted `topic_progress` DDL
was already present when that session began, with the hosted Drizzle journal
still ending at `0005`, and left the origin of that DDL unexplained. This
report closes that gap.

The DDL was applied manually through the Supabase Dashboard SQL Editor at
`2026-08-09 17:45:38 UTC` — inside the window Report 40 itself identified
(between the Slice 2A implementation commit at `17:26:32 UTC` and the hosted
cutover commit at `18:08:36 UTC`) — by the `GidiProgrammer` account, the same
account that authored every commit in this branch's history. The executed SQL
is byte-identical to the committed `0006_slippery_squirrel_girl.sql` (a
trailing-newline difference only).

This is a **process finding, not a content finding**. The schema, RLS, and RPC
definitions that ended up hosted are exactly the reviewed and tested Migration
0006. The gap was procedural: hosted DDL was applied outside the tracked
`drizzle-kit migrate` path, which is why the journal and the live database
briefly disagreed. Report 40's cutover verdict is not invalidated by this
finding, but its "DDL already present, cause unknown" framing is now
superseded by direct evidence and should be read alongside this report.

## What Report 40 Got Right

- Correctly declined to reapply DDL that would have failed on
  `CREATE TABLE ... already exists`.
- Correctly reconciled the journal rather than leaving hosted state internally
  inconsistent.
- Correctly verified the hosted DDL matched the committed migration file
  structurally before treating it as trustworthy.
- Correctly did not touch `syllabus_topics` or attempt any Slice 2B action
  while investigating.

## What Report 40 Left Open

Report 40 stated the DDL was "already present" without identifying who
applied it, when, or by what mechanism, and without ruling out competing
explanations (e.g. an accidental `drizzle-kit push`/`push-force` against a
hosted `DATABASE_URL`, or an unrelated/unauthorized change). That gap is
closed by this report.

## Evidence

### Direct confirmation — hosted Postgres logs

`postgres_logs` for project `hazvcdrcvsxmuwdfiucx`:

| Field | Value |
| --- | --- |
| Timestamp | `2026-08-09 17:45:38.924 UTC` |
| `application_name` | `supabase/dashboard-query-editor` |
| `command_tag` | `CREATE TABLE` |
| `user_name` | `postgres` |
| Query | Full body of `0006_slippery_squirrel_girl.sql` (header comment, `--> statement-breakpoint` markers, Option B RLS/RPCs intact) |
| Dashboard footer on query | `-- source: dashboard` / `-- date: 2026-08-09T17:45:38.786Z` |

This timestamp falls inside the `17:26:32`–`18:08:36 UTC` window Report 40
already established as the gap between the implementation commit and the
hosted-cutover commit, and directly explains DDL-present-with-no-journal-row.

### Supporting evidence

- A saved SQL snippet (`24d99434-…`) owned by `GidiProgrammer`, created
  `17:45:37 UTC` — content matches the committed `0006` file (trailing
  newline only).
- `pg_stat_statements` shows the same migration-file fingerprints (comment
  text, `statement-breakpoint` structure) and no push-style schema-diff SQL
  of the kind `drizzle-kit push` would generate.
- Local shell history contains no `drizzle-kit push` / `push-force` invocation
  in that window, or anywhere on August 9.
- Prior agent sessions: the local implementation session ran `migrate` only
  against loopback Supabase (per Report 39's safety checklist); the hosted
  cutover session only journal-reconciled after discovering the DDL already
  present (per Report 40) — neither session applied hosted DDL directly.

### Ruled out

`drizzle-kit push` / `push-force` against a hosted `DATABASE_URL` — this
mechanism would not produce the hand-written migration comments,
`statement-breakpoint` markers, or `supabase/dashboard-query-editor`
`application_name` observed in the logs. The evidence is specific to a manual
Dashboard SQL Editor paste-and-run, not a CLI schema-diff push.

## Conclusion

The hosted `topic_progress` schema, RLS policy, grants, and both
`SECURITY DEFINER` RPCs currently live on the hosted database because the
reviewed Migration 0006 SQL was run manually through the Supabase Dashboard
by the project owner's own account, shortly before the hosted-cutover session
began — not because of an accidental tool misfire, a competing/parallel
migration slice, or an unauthorized change.

Because the executed SQL is byte-identical in substance to the committed and
reviewed migration file, this finding does not change Report 40's functional
verdict: the hosted schema is correct, RLS/grants match Option B, and the
Section 10 test matrix results in Report 40 remain valid evidence of correct
behavior against that schema.

## Process Correction Going Forward

The gap that made this investigation necessary was purely procedural: hosted
DDL bypassed `drizzle-kit migrate`, so the tracked journal and live schema
briefly disagreed with no record of why. To prevent a repeat where the SQL
might not be a correct match next time:

1. Hosted DDL for this project should be applied only through
   `drizzle-kit migrate` against the hosted connection string as part of a
   reviewed hosted-cutover task — never pasted into the Supabase Dashboard SQL
   Editor directly, even when the intent is to unblock a waiting session.
2. If a hosted-cutover agent ever again finds DDL present with the journal
   behind, treat it as a stop-and-report condition rather than a
   reconcile-and-continue action, pending exactly this kind of provenance
   check — the outcome here was benign, but the check should happen before
   the journal is edited, not after.

## Updated Status

Report 40's cutover verdict — **SLICE 2A HOSTED CUTOVER PASSED** — stands.
This report resolves its one open item. Merge clearance for
`phase3-s2-topic-progress` may proceed with both Report 40 and this report as
its hosted-cutover evidence.

## Final Safety Verification Checklist

- [x] Provenance of pre-existing hosted DDL established from direct Postgres
      log evidence, not inference
- [x] Executed SQL confirmed byte-identical (modulo trailing newline) to the
      committed and reviewed Migration 0006
- [x] Competing explanation (`drizzle-kit push`/`push-force` against hosted)
      explicitly ruled out with evidence
- [x] No new hosted, migration, or application change made by this report
- [x] No Slice 2B or legacy-column action taken
- [x] No merge performed
