# Phase 3 Slice 3 — Hosted Cutover & E2E

## Baseline

Branch: `phase3-s3-past-paper-ownership`

Commit: `dac5dca4f67ddf92cbe42eabd702fd92414a1c3d`

Preview: `https://lockdinapp-ha1chyolc-actif-devs.vercel.app`

Vercel project: `actif-devs/lockdinapp`

Hosted Supabase project: `hazvcdrcvsxmuwdfiucx`

Chronology: the first tracked hosted cutover failed on the superseded hard-coded sequence name and rolled back cleanly, leaving hosted at 0000–0007 with no attempt rows or partial 0008 DDL. Report 49 recorded the portable sequence-resolution correction and correction commit `dac5dca4f67ddf92cbe42eabd702fd92414a1c3d`. The exact corrected Preview was READY before this second cutover.

## Migration Integrity

Filename: `lib/db/migrations/0008_uneven_mojo.sql`

Hash: `263e7fe889d77e178b02dc267529b6666d57dda668bd062b705d85148a776934` (PASS, LF-normalized SHA-256)

Tracked mechanism: `pnpm --filter @workspace/db migrate`, with both `DATABASE_URL` and `DIRECT_DATABASE_URL` explicitly set to the proved hosted target for the command

Dashboard SQL Editor used: NO

Repository journal metadata: idx `8`, timestamp `1786394449630`, tag `0008_uneven_mojo`

Portable sequence block: PASS — it uses `pg_get_serial_sequence`, validates `relkind = 'S'`, quotes identifiers with `format(... %I ...)`, fails with SQLSTATE `55000` when resolution fails, revokes only from `PUBLIC`/`anon`/`authenticated`, and grants only `USAGE, SELECT` to `authenticated`.

## Hosted Pre-Cutover

Journal: exactly 0000–0007; latest `0007_eager_squadron_supreme`; 0008 absent

Attempts: `0`

user_id: ABSENT

year: ABSENT

Backing sequence: `public.past_paper_attempts_id_seq`, resolved through `pg_get_serial_sequence`

Preconditions: PASS

Safe target proof: non-loopback Supabase pooler host, database user project suffix `hazvcdrcvsxmuwdfiucx`, database `postgres`, port `5432`

Owned baseline: `auth.users=2`, `profiles=2`, `user_subjects=6`, `tasks=6`, `topic_progress=36`, `past_paper_attempts=0`

Shared baseline: `subjects=9`, `assessment_components=50`, `syllabus_versions=9`, `syllabus_topics=520`

## Migration Result

Result: PASS — tracked Drizzle migration completed successfully

Journal: exactly 0000–0008; latest hash `263e7fe889d77e178b02dc267529b6666d57dda668bd062b705d85148a776934`; latest timestamp `1786394449630`

Schema: PASS — `user_id UUID NOT NULL`, `year INTEGER NOT NULL` with no default, auth FK `ON DELETE CASCADE`, four-digit year check, and both owner indexes

RLS: PASS — enabled with authenticated owner-only SELECT, INSERT WITH CHECK, and DELETE policies; no UPDATE policy

Grants: PASS — `anon` has none; `authenticated` has only SELECT, INSERT, DELETE; UPDATE is absent

Sequence privileges: PASS — resolved backing sequence grants `authenticated` USAGE and SELECT, not UPDATE; `anon` has none. The tracked block targets only the dynamically resolved owned sequence.

## Preview Verification

READY: PASS

Commit match: PASS — exact SHA `dac5dca4f67ddf92cbe42eabd702fd92414a1c3d`, branch `phase3-s3-past-paper-ownership`, Git repository `ActifDevs/lockdinapp`

Creation time: `1786405360878` (2026-08-10 23:42:40 UTC)

Smoke: PASS for `/api/healthz` and `/api/healthz/db`; both returned HTTP 200 with healthy API/database responses. `/`, `/login`, and `/signup` returned the expected HTTP 404 because this Vercel project deploys the Express API server, not the frontend application.

Production promoted: NO

## Original Two-User E2E Attempt

A create: NOT RUN

B create: NOT RUN

Isolation: NOT RUN

Spoofing: NOT RUN

Foreign delete: NOT RUN

Repeated attempt: NOT RUN

Year: NOT RUN

Marks: NOT RUN

Component consistency: NOT RUN

Reason: the run stopped before provisioning. Local `SUPABASE_URL` and publishable-key configuration is loopback-only. A read-only Vercel Preview environment pull for the exact branch returned blank application Supabase values, and no safe hosted service-role/admin Auth interface was available. Existing users were not reused, hosted credentials were not probed, and `auth.users` was not manually mutated.

This remains the accurate chronology of the second cutover task. The hosted E2E described below occurred later, only after a separate ignored local configuration became available.

## Hosted E2E Continuation

Local configuration: `.env.hosted-e2e.local` supplied the hosted URL, publishable key, and trusted admin secret. The file was confirmed ignored by Git; its values were not printed, persisted in the report, or added to Vercel. No Vercel admin secret was required.

Target proof: PASS — the configured Supabase hostname matched project `hazvcdrcvsxmuwdfiucx` and was non-loopback. The exact API Preview remained `https://lockdinapp-ha1chyolc-actif-devs.vercel.app` at implementation correction commit `dac5dca4f67ddf92cbe42eabd702fd92414a1c3d`.

Credential separation: PASS — a trusted local client was used only for disposable Auth lifecycle and cleanup bookkeeping. Product requests and direct Data API assertions used separate publishable-key clients with User A/User B ordinary access tokens.

The first continuation harness invocation provisioned exactly two disposable users, confirmed both normal logins and UUID identities, then stopped before its first product request because the local Windows process launcher returned `spawn EINVAL` for the Vercel CLI wrapper. Its mandatory `finally` cleanup deleted and verified both users. A read-only recount then proved the complete owned/shared baseline was restored before retrying through the CLI's JavaScript entry point.

The corrected continuation run provisioned exactly two fresh disposable users with confirmed email state. A and B both signed in through normal publishable-key clients, and `auth.getUser()` matched each ordinary session to its expected UUID.

Deterministic shared references: subject `1`, matching component `1` (`9231/1`), and foreign-subject component `8`. Shared catalogue data was read only.

## Hosted Two-User API Results

A create: PASS — HTTP 201; year `2021`, attempt date `2026-08-10`, and server-derived percentage `50` were returned without an owner field.

B create: PASS — HTTP 201; year `2024` and server-derived percentage `30` were returned without an owner field.

List isolation: PASS — A initially saw only A's attempt and B saw only B's attempt.

Owner spoofing: PASS — `userId`, `user_id`, `ownerId`, and `owner_id` payloads were each rejected with HTTP 400.

Direct Data API RLS: PASS — B could not insert with A's UUID; B's direct SELECT of A returned no rows; B's direct DELETE of A returned no rows. All three assertions used B's ordinary user session, not the admin secret.

Foreign API delete: PASS — B deleting A and A deleting B each returned nondisclosing HTTP 404, with both owner rows still present afterward.

Repeated attempt: PASS — A created a second attempt with the same subject, component, variant, session, and paper year. It received a distinct ID; both A rows were retained independently and B remained isolated.

Year validation: PASS — paper year `2021` remained independent from attempt date `2026-08-10`; missing, fractional, three-digit, and five-digit years were rejected in the 400 class.

Score validation: PASS — negative score, zero total, negative total, and score greater than total were rejected. Supplied percentage values could not override server calculations (`50`, `30`, and `80`).

Subject/component consistency: PASS — the matching pair succeeded; nonexistent subject, nonexistent component, and a component belonging to another subject were rejected.

Normal owner delete: PASS — A deleted one owned attempt with HTTP 204; A's other attempt remained and B was unchanged.

## Analytics

Dashboard: PASS — A's latest/previous/change were `50`/`80`/`-30` with a 2021 paper label; B's values were `30`/`null`/`null` with a 2024 label. No cross-user row contributed.

Progress: PASS — A reported two papers logged and B reported one.

Subject performance: PASS — A reported latest `50`, average `65`, best `80`, two papers, a two-point chronological trend, and two attempts in the matching component breakdown. B reported `30`/`30`/`30` and one paper.

Public catalogue: PASS — the shared subject response retained neutral `recentPaperScore: null` and `recentPaperLabel: null` values.

## Original Analytics Status

Dashboard: NOT RUN

Progress: NOT RUN

Subject performance: NOT RUN

Public catalogue: smoke endpoint reachable, but two-user neutrality proof NOT RUN

These NOT RUN values describe only the original cutover attempt. They were superseded by the later continuation PASS evidence above.

## Browser Session

HUMAN QA REQUIRED

Reason: the immutable verified Preview is API-only and a frontend Preview has not yet been identified. No browser/session-cache PASS is claimed.

## Cleanup

Initial continuation harness users: both removed and absence verified before retry

Successful E2E User A: removed; absence verified

Successful E2E User B: removed; absence verified

Disposable attempts: `0`

Owned baseline: PASS — final counts equal pre-E2E counts: `auth.users=2`, `profiles=2`, `user_subjects=6`, `tasks=6`, `topic_progress=36`, `past_paper_attempts=0`

Shared counts: PASS — unchanged at `subjects=9`, `assessment_components=50`, `syllabus_versions=9`, `syllabus_topics=520`

No passwords, ordinary JWTs, or admin-secret values were persisted. Auth FK cascade removed the remaining disposable owned attempts.

## Final Hosted State

Journal: exactly 0000–0008 in the explicit pre-E2E catalogue audit; the E2E had no migration or journal capability

Hash: `263e7fe889d77e178b02dc267529b6666d57dda668bd062b705d85148a776934` (PASS)

Schema: PASS — owner/year columns, cascade FK, four-digit year check, and owner indexes verified before E2E; the continuation performed no DDL

Security: PASS — RLS, owner-only policies, table grants, resolved sequence grants, and absence of UPDATE were verified in the catalogue audit; ordinary-JWT direct insert/select/delete tests independently re-proved owner isolation during E2E

Attempts: `0`

Owned baseline: PASS — the fresh post-cleanup count was `auth.users=2`, `profiles=2`, `user_subjects=6`, `tasks=6`, `topic_progress=36`, `past_paper_attempts=0`

Shared data: PASS — the fresh post-cleanup counts remained `subjects=9`, `assessment_components=50`, `syllabus_versions=9`, `syllabus_topics=520`

No hosted write occurred after the final read-only Auth/Data API count audit.

## Production

Modified: NO

Deployed: NO

## Findings

BLOCKERS:

- None.

NON-BLOCKING:

- Browser session/cache isolation remains HUMAN QA REQUIRED.
- The immutable deployment is intentionally API-only, so root/login/signup UI routes are not present on this Preview project.
- The first continuation harness invocation was an infrastructure-only launcher failure before product requests; cleanup and a complete baseline recount passed before the corrected run.

## Verdict

SLICE 3 HOSTED CUTOVER & API E2E PASSED — READY FOR HUMAN QA
