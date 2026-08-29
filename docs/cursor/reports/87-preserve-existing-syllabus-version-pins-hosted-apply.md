# Preserve existing syllabus-version pins — merge and hosted apply

- **Date:** 2026-08-29
- **Repository:** `ActifDevs/lockdinapp`
- **Canonical branch:** `main`

## Merge

- Pre-merge `origin/main`: `20e3805047a11f45406b3b6386f3b2dd79f1650a`
- Feature: `origin/fix/preserve-existing-syllabus-version-pins` at `48f83862c2872580f172d7f4ab26e72535a9ccaf`
- Merge-base: `origin/main` (clean fast-forward)
- Strategy: `git merge --ff-only` (no merge commit)
- `main` / `origin/main` after push: `48f83862c2872580f172d7f4ab26e72535a9ccaf`

Implementation `87a4f7c`, tests `5c6fd46`, implementation report `48f8386`.

## Hosted apply

**Mechanism:** `pnpm --filter @workspace/db migrate` (`drizzle-kit migrate`). **Dashboard SQL Editor was not used** to apply, paste, or execute migration SQL.

Authorized target: Lockdin hosted project `hazvcdrcvsxmuwdfiucx`, Session pooler `aws-0-eu-west-1.pooler.supabase.com:5432` (same class of connection as Report 55). Loopback and the unrelated `.vercel` frontend env project were not used.

Hosted journal **before** apply: 10 rows, latest `0009` (`created_at` `1786547274449`, hash `00a2d7ce2c6abdec9c3d8aab96fe423fe30dbf431d7bcdd994c511cf4380c5d3`).

Hosted journal **after** apply: 11 rows. Latest is `0010` (`created_at` `1787998795377`, hash `a7f5ad2af14acd378ba911543865c95565617283c7dd7b551021d15921898d3c`), immediately after `0009`. Hash matches SHA-256 of committed `0010_preserve_existing_syllabus_version_pins.sql`.

No other migration was applied. No `user_subjects` backfill.

## Hosted verification (read-only)

| Check | Result |
| --- | --- |
| Function contains `ON CONFLICT (user_id, subject_id) DO NOTHING` | YES |
| Function contains `SET syllabus_version_id = EXCLUDED.syllabus_version_id` | NO |
| `SECURITY DEFINER` | YES |
| `search_path=""` | YES |
| `EXECUTE` for `authenticated` | YES |
| `EXECUTE` for `anon` / `PUBLIC` | NO |
| `user_subjects` columns | unchanged (`user_id, subject_id, syllabus_version_id, created_at, updated_at`) |
| `syllabus_versions` column count | 10 (unchanged) |
| Other `lockdin_*` functions present | unchanged set |

`CREATE OR REPLACE` left owner/service_role `EXECUTE` as in the existing Supabase catalog; it did not grant `anon` or `PUBLIC`.

## Production health (read-only)

No app-code deploy was required. Canonical Production `https://lockdinapp-web.vercel.app`:

- `GET /api/healthz` → **200** `{"status":"ok"}`
- `GET /api/healthz/db` → **200** `{"status":"ok","database":"ok"}`

No Production `PUT /api/user-subjects` was issued.

## Out of scope (confirmed untouched)

Phase 6 Slice 3 Model D (immutable snapshots, draft/publish, pin-aware reads, current-pointer uniqueness, importer rewrite) was not started. No historical pin cleanup.

Governing implementation record: `docs/cursor/reports/86-preserve-existing-syllabus-version-pins.md`.
