# Phase 7 Slice 5 — Isolated Restore Proof and Beta Readiness

## Baseline and scope

- Repository: `https://github.com/ActifDevs/lockdinapp.git`
- Branch: `main`
- Starting `HEAD` / `origin/main`: `404371ee811a64a268356a8d78d0b07e6ab4ff85`
- Production Supabase project: `hazvcdrcvsxmuwdfiucx` (`Lockdin-app`, `eu-west-1`)
- Temporary restore project: `brxcmopanjrkggstwavz` (`Lockdin Restore QA`, `eu-west-1`) — created for proof only, deleted after validation
- Production web app: `https://lockdinapp-web.vercel.app`
- This report records Slice 7.5E isolated restore proof and consolidates beta-readiness posture from Slices 7.5C–7.5D.
- No application code, schema, migration, Vercel, Sentry, or PostHog change was made in this slice.

## Beta posture (from Slice 7.5D)

| Control | Value |
| --- | --- |
| Beta model | Invite-only Production beta |
| General public email self-signup | **DISABLED** |
| Email/password provider | **ENABLED** |
| Email confirmation | **ENABLED** |
| CAPTCHA | **OFF** |
| Anonymous sign-in | **OFF** |
| OAuth | **OFF** |
| Controlled QA Dashboard invitation | **PASS** |
| Real beta participants invited | **NONE** |
| Beta started | **NO** |

Preview was Production-backed. A controlled QA invitation proved invite-only onboarding, profile creation, onboarding/dashboard/API access, and safe cleanup. Dashboard invitations without `full_name` metadata are acceptable: profile rows may be created with nullable `full_name` and the UI falls back to **Scholar**.

Recommended post-beta UX (not implemented): on `/signup`, show that registration is invitation-only while public signup remains disabled, so visitors are not presented with a form that only fails on submit.

## Free-plan restore constraints

- Organization **A-Level-Revision** is on the Supabase **Free** plan.
- Account-wide project creation remained available; the owner created one additional temporary Free project for restore proof.
- This CLI session operates under a **Developer** token: Management API writes (Auth config patch, project delete) returned **403**. Hosted reads, logical backup, restore, and validation proceeded; temp-project deletion was completed by the owner in the Dashboard.
- Docker/Colima was required for `supabase db dump` (CLI `2.109.1`).

## CLI preflight

| Capability | Supported |
| --- | --- |
| `supabase --version` | `2.109.1` |
| `--db-url` | yes |
| `--linked` | yes |
| `--role-only` | yes |
| `--data-only` | yes |
| `--use-copy` | yes |
| `-x` / `--exclude` | yes |
| `--schema` | yes |

## Production aggregate baseline (pre-backup)

Captured immediately before logical backup. Non-sensitive aggregates only.

| Metric | Count |
| --- | --- |
| `subjects` | 9 |
| `syllabus_versions` where `lifecycle = 'published'` | 9 |
| `syllabus_units` | 136 |
| `syllabus_topics` | 520 |
| `syllabus_learning_outcomes` | 3198 |
| `assessment_components` | 50 |
| `syllabus_version_exam_series` | 27 |
| `drizzle.__drizzle_migrations` | 16 |
| RLS-enabled public tables | 14 |
| public RLS policies | 14 |

Catalogue invariants at execution time:

- All nine syllabus versions are published.
- No rows with `logical_revision_key = 'r002'`.
- `logical_revision_key = 'r001'` count was **0** at execution time (do not assume historical r001 labelling without querying Production).

## Migration proof (pre-backup)

| Check | Result |
| --- | --- |
| Repository migration files | 16 |
| Repository head | `0015_silent_sentinel` |
| `0016` | **ABSENT** |
| Hash method | SHA-256 of exact migration SQL file bytes |
| Timestamp method | `lib/db/migrations/meta/_journal.json` entry `when` |
| Production `drizzle.__drizzle_migrations` rows | 16 |
| Hash/timestamp correspondence | **16/16 MATCH** |

## User-data FK graph and row exclusion strategy

Direct `public` foreign keys to `auth.users`:

- `profiles`
- `user_subjects`
- `tasks`
- `topic_progress`
- `past_paper_attempts`
- `exam_dates`

No additional `public` tables transitively depend on those user-owned parents. Reference/catalogue tables (`subjects`, syllabus graph, assessment components, applicability/series join tables, `learning_outcome_components`) remain in the data dump.

**Strategy:** restore schema/RLS/policies for all tables; exclude **row data** for user-owned tables and Auth/session tables. Do **not** copy Production Auth users or participant PII.

### Final `data.sql` exclusions

**Storage**

- `storage.buckets_vectors`
- `storage.vector_indexes`
- `storage.objects`
- `storage.s3_multipart_uploads`
- `storage.s3_multipart_uploads_parts`

**Public user-owned**

- `public.profiles`
- `public.user_subjects`
- `public.tasks`
- `public.topic_progress`
- `public.past_paper_attempts`
- `public.exam_dates`

**Auth user/session PII**

- `auth.users`
- `auth.identities`
- `auth.sessions`
- `auth.refresh_tokens`
- `auth.mfa_factors`
- `auth.mfa_amr_claims`
- `auth.mfa_challenges`
- `auth.one_time_tokens`
- `auth.oauth_authorizations`
- `auth.oauth_consents`
- `auth.webauthn_challenges`
- `auth.webauthn_credentials`
- `auth.flow_state`
- `auth.audit_log_entries`

Non-user Auth configuration tables (OAuth/SSO provider scaffolding with no copied user rows) may remain empty in the dump.

## Custom auth/storage handling

Known Lockdin customization:

- `public.lockdin_handle_new_user()` — included in `schema.sql`
- trigger `lockdin_on_auth_user_created` on `auth.users` — **not** in default schema dump

Official `supabase db diff --linked --schema auth,storage` against Production returned **no diff** (shadow DB already matched managed auth/storage baseline). A reviewed artifact containing **only** the trigger creation statement was applied after schema/data restore:

```sql
CREATE TRIGGER lockdin_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.lockdin_handle_new_user();
```

No storage customization exists in Production.

## Logical backup and inspection

Backup artifacts were written to a host temporary directory **outside** the repository working tree. Files:

- `roles.sql`
- `schema.sql`
- `data.sql`
- `auth_storage_custom.sql` (reviewed trigger-only)

Inspection summary:

| File | Result |
| --- | --- |
| `roles.sql` | No embedded secrets; small role attribute/grant script |
| `schema.sql` | Application tables, Drizzle journal structure, RLS, `lockdin_handle_new_user()` present |
| `data.sql` | Catalogue/reference COPY blocks present; excluded user-owned tables absent; `auth.users` absent |
| `auth_storage_custom.sql` | Trigger-only; no destructive or unrelated auth DDL |

## Restore execution (temp target only)

Target: `brxcmopanjrkggstwavz` ≠ `hazvcdrcvsxmuwdfiucx`.

Sequence:

1. `schema.sql`
2. `SET session_replication_role = replica`
3. `data.sql`
4. reviewed `auth_storage_custom.sql`

`roles.sql` was **not** applied: hosted Postgres rejected `GRANT SET ON PARAMETER "log_min_messages"` (`permission denied`). Default Supabase hosted roles on the temp project were sufficient; this matches common Supabase backup-restore guidance for managed projects.

Restore completed successfully with `ON_ERROR_STOP=1` inside a single transaction for schema/data/trigger apply.

## Restore validation (temp only)

### Migrations

| Check | Result |
| --- | --- |
| `drizzle.__drizzle_migrations` present | yes |
| Row count | 16 |
| Hashes | **16/16 MATCH** repository + Production |
| Timestamps | **16/16 MATCH** |
| Head | `0015_silent_sentinel` |
| `0016` | absent |

### Catalogue aggregates

Restored temp counts matched Production baseline exactly for all required catalogue metrics (9 / 9 / 136 / 520 / 3198 / 50 / 27).

### Schema / security

| Check | Result |
| --- | --- |
| Application tables | present |
| Public foreign keys | 24 |
| Public indexes | 33 |
| RLS-enabled public tables | 14 |
| Public RLS policies | 14 |
| `profiles_select_own`, `tasks_select_own` | present |
| `lockdin_handle_new_user()` | present |
| `lockdin_on_auth_user_created` on `auth.users` | present |

### User-data privacy

On temp after restore:

| Table | Production row data copied |
| --- | --- |
| `profiles` | **NONE** (0 rows) |
| `user_subjects` | **NONE** |
| `tasks` | **NONE** |
| `topic_progress` | **NONE** |
| `past_paper_attempts` | **NONE** |
| `exam_dates` | **NONE** |
| Production participant/account PII | **NONE** |
| Production study-content rows | **NONE** |

Temp `auth.users` count was 0 after restore (no copied Production Auth users).

### Application invariants (DB-level)

Safe structural checks confirmed restored catalogue hierarchy, assessment components, applicability/series relationships, user-owned table schemas, and RLS/policy presence. The real Vercel deployment was **not** connected to the temp project. No real user accounts were created on temp merely to prove runtime behaviour.

## Production post-restore health

After temp validation, Production remained unchanged and healthy:

| Check | Result |
| --- | --- |
| `GET /api/healthz` | **200** |
| `GET /api/healthz/db` | **200** |
| `GET /api/subjects` | **200** |
| Production aggregate spot-check (`subjects`, drizzle rows) | unchanged |
| Production mutation from restore proof | **NONE** |

General public signup remained **OFF**; CAPTCHA remained **OFF**.

## Cleanup

| Item | Result |
| --- | --- |
| Temp project `brxcmopanjrkggstwavz` | **DELETED** (owner Dashboard; verified absent via CLI list) |
| Production `hazvcdrcvsxmuwdfiucx` | **RETAINED** |
| Local backup directory / SQL artifacts | **REMOVED** from host temp |
| Local temp DB secret file | **REMOVED** |
| Repository working tree | **CLEAN** |

## Remaining beta gates

Restore proof and invite-only signup control are complete. Beta start remains **HOLD** until:

1. Participant process / legal basis for controlled beta participants is resolved.
2. Beta materials (onboarding copy, support path, signup-page invitation-only messaging) are prepared.
3. Optional post-beta improvement: surface invitation-only registration on `/signup`.

## Verdict

| Gate | Result |
| --- | --- |
| Isolated restore proof | **PASS** |
| Migration hash/timestamp proof | **PASS** |
| Catalogue aggregate fidelity | **PASS** |
| RLS / policy / profile trigger fidelity | **PASS** |
| User PII / study-data exclusion | **PASS** |
| Production unchanged + healthy | **PASS** |
| Temp cleanup | **PASS** |
| Beta start | **HOLD** |

**SLICE 7.5:** restore and signup-control proof complete; participant/legal/material gates remain before controlled beta launch.
