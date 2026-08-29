# Phase 6 Slice 3A — Merge and Hosted Apply

- **Date:** 2026-08-29
- **Repository:** `ActifDevs/lockdinapp`
- **Authorized hosted project:** `hazvcdrcvsxmuwdfiucx` (Session pooler host `aws-0-eu-west-1.pooler.supabase.com:5432`)

## Merge

- Preflight `origin/main`: `c60f3a94a828dd4bfd2ee1eda424ea2ae37f3e93` (unchanged; merge proceeded)
- Feature branch: `phase6-slice3a-version-lifecycle-schema`
- Feature HEAD (pre-merge): `f3c99f05fea7eea38f316a73cd753bb15cecf809` (`HEAD` == `origin/phase6-slice3a-version-lifecycle-schema`)
- Core corrected implementation: `f6d400fcabe47c080049ebf9b8a19846ab8829db`
- Working tree at merge: CLEAN
- Strategy: `git merge --no-ff` with message `merge: phase6 slice3a version lifecycle schema`
- **SLICE 6.3A MERGE SHA:** `6b6b8757bc2d7ea18858261d64a44269dca4c60c`
- Parents: `c60f3a94a828dd4bfd2ee1eda424ea2ae37f3e93` `f3c99f05fea7eea38f316a73cd753bb15cecf809`
- `git push origin main` (normal push only; no force)
- After push: `HEAD` == `origin/main` == merge SHA; working tree CLEAN

Feature vs `origin/main` (pre-merge) was 6.3A only: `0011_open_sunfire.sql` + snapshot/journal, `syllabusVersions` schema, db-harness proof/verify, journal-count test updates, Report 88. Migrations `0000`–`0010` unchanged. No importer rewrite, pin-aware read cutover, session assignment, frontend, syllabus CSV, Vercel config, or secrets.

## Hosted pre-apply

Read-only against the authorized administrative Session-pooler path (not application/serverless runtime connection semantics; not Dashboard SQL Editor).

| Gate | Result |
| --- | --- |
| Journal row count | 11 |
| Latest tag/head | `0010` (`created_at` `1787998795377`) |
| Latest hash | `a7f5ad2af14acd378ba911543865c95565617283c7dd7b551021d15921898d3c` = SHA-256 of committed `0010_preserve_existing_syllabus_version_pins.sql` |
| Subjects with >1 `is_current` | 0 |
| Counts | syllabus_versions 9; user_subjects 12; topic_progress 39; tasks 14; past_paper_attempts 6 |
| `btree_gist` | available; not required to be pre-installed |

## Hosted migration

**Mechanism:** `pnpm --filter @workspace/db migrate` (`drizzle-kit migrate --config ./drizzle.config.ts`) with `DATABASE_URL` / `DIRECT_DATABASE_URL` scoped to the authorized hosted Lockdin Session pooler.

- Dashboard SQL Editor: **NOT USED**
- `supabase db push`: **NOT USED**
- `drizzle-kit push`: **NOT USED**
- No journal stamping, no history rewrite, no pin migration, no syllabus import, no user-data backfill beyond the committed `published_at = imported_at` UPDATE in `0011`

`CREATE EXTENSION IF NOT EXISTS btree_gist` ran as part of committed `0011` only.

## Journal verification

| Field | Value |
| --- | --- |
| Journal rows | 12 |
| Previous head | `0010` (`1787998795377` / `a7f5ad2a…21898d3c`) |
| New head | `0011_open_sunfire` |
| `0011` `created_at` | `1788003568152` (matches committed journal `when`) |
| `0011` hash | `eb7908939c34d47fef47ba48371a3c9dbca9dd3161c4d29271142cb8fbf8e681` = SHA-256 of committed `lib/db/migrations/0011_open_sunfire.sql` |
| Extra / skipped / stamped rows | none |

## Schema verification

| Check | Result |
| --- | --- |
| `btree_gist` | INSTALLED (`extversion` 1.7) |
| `syllabus_version_lifecycle` | `draft,published,retired,archived` |
| Columns | `lifecycle`, `logical_revision_key`, `content_sha256`, `published_at`, `retired_at`, applicability year/series fields, generated `applicable_session_range` |
| `syllabus_versions_one_default_per_subject` | present |
| DEFAULT must be published | `CHECK (((NOT is_current) OR (lifecycle = 'published'::syllabus_version_lifecycle)))` |
| Published overlap exclusion | `EXCLUDE USING gist (subject_id WITH =, applicable_session_range WITH &&) WHERE (((applicable_session_range IS NOT NULL) AND (lifecycle = 'published'::syllabus_version_lifecycle)))` |
| `user_subjects` columns | unchanged |
| `lockdin_replace_user_subjects` | still contains `ON CONFLICT … DO NOTHING` and `is_current = true` |

No hosted mutation queries were issued to exercise constraints.

## Data safety

Pre vs post counts identical: versions 9, pins 12, progress 39, tasks 14, attempts 6.

| Check | Result |
| --- | --- |
| Syllabus version rows deleted | NONE |
| `user_subject` rows deleted | NONE |
| Applicability windows guessed/backfilled | NONE (`applicable_from_year` set: 0) |
| `published_at = imported_at` | 9/9 (expected legacy backfill in committed `0011`) |
| All rows `lifecycle = published` | 9/9 (legacy default) |
| Syllabus import | NONE |

## Production deployment

Automatic Vercel Production (no manual redeploy).

**lockdinapp-web** (canonical `https://lockdinapp-web.vercel.app`):

- branch: `main`
- source: `6b6b8757bc2d7ea18858261d64a44269dca4c60c`
- GitHub deployment: `6155737245`
- Vercel dashboard deployment id: `8wwShPg86TQUA2YUcQdDdQQGtmyQ`
- immutable URL: `https://lockdinapp-cxllon8si-actif-devs.vercel.app`
- GitHub status: success / READY (`Vercel – lockdinapp-web`)

**lockdinapp** sibling (same source SHA):

- GitHub deployment: `6155738680`
- Vercel dashboard deployment id: `8vbTo4bX4or3EizSfyxnqz9b1jPu`
- immutable URL: `https://lockdinapp-8ro2patwj-actif-devs.vercel.app`
- status: success / READY

## Production smoke

Against `https://lockdinapp-web.vercel.app` (read-only, unauthenticated):

| Request | Result |
| --- | --- |
| `GET /api/healthz` | 200 `{"status":"ok"}` `x-request-id: cdb44e0a-5801-436b-a7f2-7f1db1ed9fb6` |
| `GET /api/healthz/db` | 200 `{"status":"ok","database":"ok"}` `x-request-id: e4f0cefb-d089-438f-9ef0-9332d0bb5e1b` |
| `GET /api/tasks` | 401 `{"error":"Unauthorized"}` `x-request-id: 4ca5217c-64d8-463d-b48b-862b89a2c9f2` |

Immutable URL `GET /api/healthz` also 200. No authentication, no user-data writes.

Production `buildCommand` remains `pnpm run build:vercel` (api-server build + Vite). It does not invoke db-harness, pre-0000 bootstrap, local Supabase lifecycle, migration reconstruction, or syllabus import. Hosted `0011` was a separate administrative `drizzle-kit migrate`.

## Test-runner limitation

Stock `pnpm --filter @workspace/api-server test:integration` remains bound to the ordinary root `lockedinapp` Supabase workdir and **cannot** target the dedicated `lockdin-db-harness` without test-infrastructure changes.

**Do not claim 42/42 PASS.**

Evidence that stands:

- formerly failing exam-dates journal/hash assertion: **PASS** on the clean dedicated corrected-0011 reconstruction (pre-merge clearance)
- clean disposable **0000–0011** migration proof: **PASS** (pre-merge clearance; not destructively re-run on the ordinary local DB after merge)
- stock runner limitation: **KNOWN / NON-BLOCKING**

Post-merge non-destructive gates: harness/loopback safety **20/20**; syllabus **22/22**; API unit **119/119**; scripts typecheck **PASS**. API typecheck remains **PRE-EXISTING TS2305** (`createDatabasePoolConfig` / `validateDatabaseUrl` from `@workspace/db`); not fixed in this slice.

## Scope boundaries

6.3A created **schema foundation only**. Runtime remains legacy-compatible (`is_current` DEFAULT selector; existing pins unchanged).

Not claimed / not started:

- 6.3B immutable importer
- 6.3C1 pin-aware reads
- 6.3C2 session-based membership assignment
- 6.3D frontend session UX
- 6.4

## Final verdict

SLICE 6.3A: **CLOSED** (merged, hosted `0011` applied via tracked Drizzle migrate, Production READY + smoke PASS).

PHASE 6: **IN PROGRESS**. Next is 6.3B design/implementation planning **only after owner review**.
