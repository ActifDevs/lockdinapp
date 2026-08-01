# Phase 2 Slice 1 — Remote Review Correction Report

**Status:** Static review findings addressed, committed, and pushed to `auth-and-tasks` — **not merged, not applied, not approved for database application**
**Branch:** `auth-and-tasks`
**Previous HEAD:** `671109efe55e3a235d4dd6f70993d6b37b78a842` (feat(db): draft Phase 2 profiles and task ownership migration)
**New commit:** `8d6db594cd1f24cec9d2f42741faedcc1ed9c2c7`
**Remote:** Pushed to `origin/auth-and-tasks` (non-force)
**Migration applied:** **No**
**Database or Supabase connected to / modified:** **No**
**`main` modified:** **No**

This pass addresses four static correction items identified during remote review of the commit documented in [`11-phase2-slice1-branch-review-commit.md`](./11-phase2-slice1-branch-review-commit.md): an over-broad exported profile insert schema, a transaction-pooler-only Drizzle connection setting, an incomplete post-migration profile-integrity check, and two intermediate reports needing an explicit "historical" marker.

---

## 1. Safety check

```
git fetch origin
git branch --show-current        → auth-and-tasks
git status -sb (before)          → auth-and-tasks...origin/auth-and-tasks
                                     ?? docs/cursor/reports/11-phase2-slice1-branch-review-commit.md
git rev-parse HEAD                → 671109efe55e3a235d4dd6f70993d6b37b78a842
git rev-parse origin/auth-and-tasks → 671109efe55e3a235d4dd6f70993d6b37b78a842
git rev-parse origin/main         → 5f1fbf43cda2cf055c67ce123b1add04bacbb0b4
```

- Branch: `auth-and-tasks` — confirmed
- `HEAD` equalled `origin/auth-and-tasks` at the expected commit `671109e` — confirmed
- No teammate had pushed new commits — confirmed
- The one untracked file (`11-phase2-slice1-branch-review-commit.md`, written in a prior turn) is explainable and out of scope for this pass — left untouched
- No `reset`, `clean`, `restore`, or automatic stash used

## 2. Remove the unsafe exported profile insert schema

**Consumer search:**

```
git grep -n "insertProfileSchema"
git grep -n "InsertProfile"
```

Result: **no consumers**. The only matches were the definition itself in `lib/db/src/schema/profiles.ts` and a documentation quote inside report 10 (not executable code). No `artifacts/`, `lib/`, or `scripts/` file imported either name.

**Change applied** — removed `insertProfileSchema`, `InsertProfile`, and the now-unused `createInsertSchema`/`z` imports. Kept internal row types:

```ts
export type NewProfileRow = typeof profilesTable.$inferInsert;
export type Profile = typeof profilesTable.$inferSelect;
```

with a comment explaining why no client-facing insert/update schema exists (every writable column — `username`, `onboarded_at` — is reserved for a later, reviewed onboarding operation). No client profile-insert endpoint or schema was created. `username`/`onboarded_at` remain non-client-writable.

## 3. Use the direct database URL for Drizzle operations

`lib/db/drizzle.config.ts` updated:

```ts
const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required");
}
```

Used in `dbCredentials.url`. The verified relative `schema`/`out` paths (`./src/schema/index.ts`, `./migrations`) were preserved unchanged. No environment value was displayed, logged, or committed; `.env.local` was not modified — it still only defines `DATABASE_URL`, so the fallback branch of the `??` was exercised when `generate` ran (see §6).

## 4. Complete post-migration profile verification

`docs/sql/phase2/phase2-post-migration-verification.sql` updated with two additions:

**New §3a — aggregate Auth/profile integrity** (no UUIDs, emails, or metadata):

```sql
SELECT
  (SELECT count(*) FROM auth.users) AS auth_user_count,
  (SELECT count(*) FROM public.profiles) AS profile_count,
  (SELECT count(*)
     FROM auth.users u
     LEFT JOIN public.profiles p ON p.id = u.id
     WHERE p.id IS NULL) AS missing_profile_count,
  (SELECT count(*)
     FROM public.profiles p
     LEFT JOIN auth.users u ON u.id = p.id
     WHERE u.id IS NULL) AS orphan_profile_count;
```

Expected after migration: `missing_profile_count = 0` and `orphan_profile_count = 0`.

**§10 privilege matrix extended** — added explicit `has_table_privilege('authenticated', 'public.profiles', 'INSERT'|'UPDATE'|'DELETE')` checks (all expected `false`), placed alongside the existing column-level checks so both are visible together:

- `authenticated_can_table_update_profiles_expect_false` = **false** (table-level UPDATE denied)
- `authenticated_can_update_full_name` / `_level` / `_exam_session` = **true** (column-level UPDATE allowed)
- `authenticated_can_update_username` / `_onboarded_at` / `_id` / `_created_at` / `_updated_at` = **false** (unchanged from before)

A comment explains why both checks are necessary: `GRANT UPDATE (col1, col2)` grants column-level privilege without granting table-level `UPDATE`. The decision checklist at the bottom of the file was updated to reference both new checks.

## 5. Mark intermediate reports as historical

Added identical blockquote banners immediately under the H1 in both files:

> **Historical report:** superseded for implementation purposes by [`10-phase2-slice1-stop2-final-hardening.md`](./10-phase2-slice1-stop2-final-hardening.md). Do not use this document as the current migration or operational-SQL instruction set.

Applied to:
- `docs/cursor/reports/08-phase2-slice1-migration-draft.md`
- `docs/cursor/reports/09-phase2-slice1-stop2-correction.md`

No historical findings, conclusions, or content in either file were removed or rewritten — only the banner was prepended.

## 6. Validation

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm --filter @workspace/db generate` | **"No schema changes, nothing to migrate"** — no new migration file created; confirms the config change didn't alter what Drizzle thinks the schema/migration state is |
| `pnpm typecheck` | Pass (4 workspaces) — confirms removing `insertProfileSchema`/`InsertProfile` and their imports broke nothing |
| `pnpm --filter @workspace/api-server test` | 4/4 pass |
| `pnpm --filter @workspace/revision-platform test` | 6/6 pass |
| `PORT=5173 BASE_PATH=/ pnpm build` | Pass |
| `git status --short` after every command | Only the 5 intended files ever changed |

```
git diff --check   → clean
git diff --stat    →
 docs/cursor/reports/08-phase2-slice1-migration-draft.md    |  5 +++
 docs/cursor/reports/09-phase2-slice1-stop2-correction.md   |  5 +++
 docs/sql/phase2/phase2-post-migration-verification.sql     | 40 ++++++++++++++++++++--
 lib/db/drizzle.config.ts                                   | 13 +++++--
 lib/db/src/schema/profiles.ts                              | 13 ++++---
 5 files changed, 63 insertions(+), 13 deletions(-)
```

## 7. Commit and push

**Staged explicitly** (no `git add .` / `-A`):

```
lib/db/src/schema/profiles.ts
lib/db/drizzle.config.ts
docs/sql/phase2/phase2-post-migration-verification.sql
docs/cursor/reports/08-phase2-slice1-migration-draft.md
docs/cursor/reports/09-phase2-slice1-stop2-correction.md
```

`git diff --cached --check` passed cleanly (no whitespace findings this time). `git diff --cached --name-status` showed exactly these 5 files, all modifications — matching the expected scope exactly.

**Commit:**

```
git commit -m "fix(db): address Phase 2 migration review findings"
[auth-and-tasks 8d6db59] fix(db): address Phase 2 migration review findings
 5 files changed, 63 insertions(+), 13 deletions(-)
```

**Pre-push re-check** (remote had not moved since the initial fetch):

```
git log -3 --oneline --decorate                       → 8d6db59 (HEAD) → 671109e → cf91a82
git log -3 --oneline --decorate origin/auth-and-tasks  → 671109e → cf91a82 → 5f1fbf4
```

**Push:**

```
git push origin auth-and-tasks
To https://github.com/ActifDevs/lockdinapp.git
   671109e..8d6db59  auth-and-tasks -> auth-and-tasks
```

Non-force push to `auth-and-tasks` only. No push to `main`, no merge, no rebase, no SQL executed.

## 8. Remote push verification

```
git fetch origin
git rev-parse HEAD                  → 8d6db594cd1f24cec9d2f42741faedcc1ed9c2c7
git rev-parse origin/auth-and-tasks → 8d6db594cd1f24cec9d2f42741faedcc1ed9c2c7
git status -sb                      → auth-and-tasks...origin/auth-and-tasks (no ahead/behind)
git rev-parse origin/main           → 5f1fbf43cda2cf055c67ce123b1add04bacbb0b4 (unchanged)
```

Working tree otherwise clean except the pre-existing, out-of-scope untracked report 11 from the prior turn.

## 9. Final response summary

| # | Item | Result |
|---|---|---|
| 1 | Previous / new commit | `671109e` → `8d6db59` |
| 2 | Files changed | 5 (listed in §7) |
| 3 | `insertProfileSchema` consumers | None found |
| 4 | Final `profiles.ts` exports | `profilesTable`, `NewProfileRow`, `Profile` |
| 5 | Drizzle URL logic | `DIRECT_DATABASE_URL ?? DATABASE_URL`, throws if both unset |
| 6 | Profile-integrity SQL | §3a: `auth_user_count`, `profile_count`, `missing_profile_count`, `orphan_profile_count` |
| 7 | Profile denial checks | `authenticated` table-level INSERT/UPDATE/DELETE on `profiles` — all expected false |
| 8 | Historical banners | Added to reports 08 and 09, findings untouched |
| 9 | generate/typecheck/test/build | All pass; generate reports no schema changes |
| 10 | Push result | `671109e..8d6db59 auth-and-tasks -> auth-and-tasks` |
| 11 | Final branch status | `HEAD` = `origin/auth-and-tasks`; clean otherwise |
| 12 | Database operation occurred | No |
| 13 | `main` modified | No — remains `5f1fbf4` |

---

**This correction commit addresses static review findings only. No migration was applied, no database was connected to or modified, and no pull request was opened or merged.**
