# Phase 3 Slice 2A — Hosted Cutover

## Executive Summary

Phase 3 Slice 2A passed its hosted cutover gate against an immutable Vercel
Preview of `phase3-s2-topic-progress` at `523e63394461e100fe2dab0c88d4f0b83674c6d5`.

Hosted migration `0006` DDL for `topic_progress` (Option B SELECT-only RLS +
trusted upsert/reset RPCs) was already present on the hosted database before
this session, while the Drizzle journal still ended at `0005`. This session
did **not** re-run the DDL. It reconciled the hosted journal by inserting the
`0006_slippery_squirrel_girl` hash/timestamp so the journal is now exactly
`0000`–`0006`. Shared `syllabus_topics` fingerprint and the known orphaned
`in_progress` row were unchanged throughout.

Exactly two disposable users obtained real Auth password-login sessions, were
onboarded through the Preview API, and exercised the Slice 2A topic-progress
matrix end to end. Direct Data API writes were denied with `42501`. Both
sessions were globally signed out and both Auth users deleted. Final hosted
user-owned tables returned to the zero-row pre-E2E baseline.

Production remained healthy and remains on pre-Slice-2A application code for
topic-progress routes. The Preview was not promoted. No merge was performed.

## Git Baseline

Branch:
`phase3-s2-topic-progress`

Application commit tested:
`523e63394461e100fe2dab0c88d4f0b83674c6d5`

At the start of this cutover, local `HEAD` and `origin/phase3-s2-topic-progress`
both resolved to that commit. The working tree had no staged/unstaged
implementation changes (only an unrelated untracked Report 32 file that was
not part of this task). Report 39 was present. Report 40 was absent. Local
`lib/db/migrations/meta/_journal.json` contained exactly `0000`–`0006` with
`0006_slippery_squirrel_girl` last.

## Preview Deployment

- Immutable Preview URL:
  `https://lockedinapp-gebaxtm44-gidiprogrammers-projects.vercel.app`
- Deployment ID: `dpl_AymJdEfJPp1t88Rve3GQi6PjbZjd`
- Branch meta: `phase3-s2-topic-progress`
- Commit: `523e63394461e100fe2dab0c88d4f0b83674c6d5`
- Target: Vercel Preview (`target: preview`), not Production
- State: READY

The Preview frontend bundle targeted hosted Supabase project
`hazvcdrcvsxmuwdfiucx`, exposed only the publishable client key class,
contained no service-role JWT marker, and did not embed a loopback Supabase
configuration. One inert `http://localhost:9999` library constant was present
and is not deployed configuration.

## Hosted Database Pre-E2E State

The fresh pre-E2E check ran inside an explicit read-only transaction and was
rolled back. Connection targeted the `hazvcdrcvsxmuwdfiucx` hosted project
(eu-west-1 pooler). No loopback URL was used.

| Relation | Rows |
| --- | ---: |
| `auth.users` | 0 |
| `public.profiles` | 0 |
| `public.user_subjects` | 0 |
| `public.tasks` | 0 |
| `public.topic_progress` | 0 (table already present) |
| `public.subjects` | 9 |
| `public.syllabus_topics` | 520 |
| `public.syllabus_versions` | 9 |

`syllabus_topics` status aggregate before E2E: 519 `not_started`, 1
`in_progress`. The single non-default row remained `id=1`, `status=in_progress`,
`notes` null. Content fingerprint
`md5(...)=8c57774ed65cfbdd213e1ba8d9903bfb`.

No unexplained hosted user-owned data was present before disposable users were
created.

## Migration Status

| Item | Status |
| --- | --- |
| Hosted journal before this session | Exactly `0000`–`0005` |
| Hosted `topic_progress` DDL before this session | ALREADY PRESENT and matched Migration 0006 (PK, status/notes CHECKs, Auth/topic FKs, topic_id index, updated_at trigger, SELECT-only policy/grant, both SECURITY DEFINER RPCs returning `SETOF topic_progress` / `void`) |
| `drizzle-kit migrate` DDL reapply | NOT RUN — `CREATE TABLE topic_progress` would fail with already-exists |
| Journal reconciliation | APPLIED — inserted `0006` hash for current migration file content and `created_at=1786296025143` |
| Migrations `0000`–`0005` | NOT REAPPLIED |

No hosted Auth configuration, Vercel project settings, shared catalogue rows, or
Slice 2B legacy-column cleanup was performed.

## Hosted Journal Verification

PASS. After reconciliation the hosted Drizzle journal contained exactly seven
entries corresponding to migrations `0000`–`0006`, with newest
`created_at=1786296025143`. The same seven entries remained after cleanup.

## Preview Smoke Verification

| Request | Expected | Observed |
| --- | ---: | ---: |
| `GET /` | 200 | 200 |
| `GET /login` | 200 | 200 |
| `GET /signup` | 200 | 200 |
| `GET /api/healthz` | 200 | 200 |
| `GET /api/healthz/db` | 200 | 200 |
| `PATCH /api/syllabus-topics/:topicId` unauthenticated | 401 | 401 |
| `DELETE /api/syllabus-topics/:topicId` unauthenticated | 401 | 401 |

The mandatory Slice 2A endpoint gate passed: topic-progress mutations returned
401 rather than 404 or 503.

## Hosted User Provisioning Note

PASS with method note. An initial attempt to complete ordinary
signup → Mail.tm confirmation → password login timed out waiting for the
hosted confirmation email. Disposable Mail.tm inboxes were still created for
each user. Users were then provisioned with
`admin.createUser({ email_confirm: true })` (service-role used only for
provision/cleanup), and **all API sessions were obtained via real
`signInWithPassword` with the publishable key**. No service-role JWT was used
as a request session.

Both users completed Preview onboarding for subject `6` (Chemistry).

## Section 10 Test Matrix Results

| Check | Result | Observed |
| --- | --- | --- |
| Preview smoke | PASS | `/`, `/login`, `/signup`, `/api/healthz`, `/api/healthz/db` all 200 |
| Unauthenticated topic-progress gate | PASS | PATCH 401, DELETE 401 |
| A/B different progress on same topic | PASS | Topic `247`: A=`in_progress`/`A notes`; B=`completed`/`B notes`; syllabus GET returned only caller values |
| Missing-row default | PASS | Topic `248` remained `not_started` / `notes=null` for A |
| Reset isolation | PASS | A DELETE → 204; A view defaulted; B still `completed`/`B notes`; shared topic `247` stayed `not_started`/null; full syllabus fingerprint unchanged |
| Cross-user denial | PASS | A Data API SELECT returned only A's row; B's ownership not visible |
| Direct Data API write rejection (Option B) | PASS | Own insert/update/delete and spoofed-`user_id` insert all denied with `42501` |
| Nonexistent topic | PASS | PATCH `999999999` → 404 |
| Progress overview | PASS | A overall `0` (0/104); B overall `1` (1/104 completed); both scoped to enrolled subject 6 |
| Ownership field rejection | PASS | `userId`/`user_id`/`ownerId`/`owner_id` each → 400 |
| Logout/session hygiene | PASS | A and B global sign-out succeeded before Auth deletion |

## Disposable User Cleanup

PASS for hosted Auth/data cleanup.

- USER A global sign-out: passed
- USER B global sign-out: passed
- USER A Auth user deletion: passed
- USER B Auth user deletion: passed
- Temporary Mail.tm inbox DELETE responses: 401/401 after sign-out (Mail.tm
  token no longer accepted); no hosted impact. Hosted Auth users were already
  removed.
- Dependent profile, membership, task, and topic_progress rows removed by
  cascade / absence after Auth deletion

No disposable credentials, access/refresh tokens, confirmation URLs, or actual
disposable email addresses are recorded in this report.

## Post-Cleanup Counts

| Relation | Pre-E2E | Post-cleanup |
| --- | ---: | ---: |
| `auth.users` | 0 | 0 |
| `public.profiles` | 0 | 0 |
| `public.user_subjects` | 0 | 0 |
| `public.tasks` | 0 | 0 |
| `public.topic_progress` | 0 | 0 |
| `public.subjects` | 9 | 9 |
| `public.syllabus_topics` | 520 | 520 |
| `public.syllabus_versions` | 9 | 9 |

Orphan profiles: 0. Orphan memberships: 0. Orphan tasks: 0. Orphan
topic_progress: 0.

`syllabus_topics` fingerprint after cleanup matched pre-E2E
(`8c57774ed65cfbdd213e1ba8d9903bfb`). The orphaned legacy row remained
`id=1`, `status=in_progress`, `notes` null and was **not modified**. No Slice
2B action was taken.

## Hosted Schema / Security Final State

PASS.

- Journal: exactly `0000`–`0006`
- `topic_progress` RLS: enabled
- `topic_progress` policies: exactly `topic_progress_select_own` (SELECT)
- Data API grant among `anon`/`authenticated`: authenticated SELECT only
- RPCs: `lockdin_upsert_topic_progress`, `lockdin_reset_topic_progress`
  present as SECURITY DEFINER
- Subjects / syllabus versions unchanged at 9 / 9
- Shared syllabus/reference rows modified by this task: none

## Production Health

| Request | Observed |
| --- | ---: |
| `GET /api/healthz` | 200 |
| `GET /api/healthz/db` | 200 |
| `GET /login` | 200 |
| `GET /signup` | 200 |
| `GET /api/user-subjects` | 404 |
| `PATCH /api/syllabus-topics/1` | 503 |

Hosted Supabase now contains the Slice 2A schema/journal. The immutable Preview
contains the Slice 2A application code. Production remains on earlier
application code for these routes, so the 404/503 observations above are
expected and are not treated as Preview failures. The Preview was not
promoted.

## Repository Changes

Only this Report 40 file is added by this task. No implementation, migration,
prior report, environment, or deployment configuration file was modified as
part of the documentation commit.

## Remaining Risks / Follow-ups

- Ordinary Mail.tm email-confirmation signup timed out in this environment;
  disposable users used admin email confirmation for identity creation while
  keeping password-login sessions. Re-check hosted Auth email delivery at a
  later operational gate if product requires confirmation-email proof.
- Manual browser UI session/cache isolation was not run.
- Slice 2B legacy column removal and the orphaned `syllabus_topics` row
  decision remain separately gated.
- Merge into `phase3-multitenancy` / `main` remains a separate merge-clearance
  task.

None of these items invalidate the hosted API, database security, cleanup, or
Production-health evidence recorded above.

## Final Safety Verification Checklist

- [x] Git baseline verified at `523e633` on `phase3-s2-topic-progress`
- [x] Preview target confirmed Preview, not Production
- [x] Preview bundle targets `hazvcdrcvsxmuwdfiucx`; no service-role exposure
- [x] Hosted pre-E2E audit was read-only and rolled back
- [x] Hosted journal before work was exactly `0000`–`0005`
- [x] Migration `0006` DDL was not reapplied; journal reconciled only
- [x] `syllabus_topics` fingerprint unchanged; orphaned row read-only
- [x] No Slice 2B / past-paper / exam-date work
- [x] Two-user isolation and Option B direct-write denial verified hosted
- [x] Disposable Auth users deleted; user-owned tables returned to baseline
- [x] No Production promotion
- [x] No merge into `phase3-multitenancy` or `main`

## Final Slice 2A Hosted Verdict

SLICE 2A HOSTED CUTOVER PASSED — READY FOR SEPARATE MERGE-CLEARANCE REVIEW
