# Phase 2 Slice 1 — Stop 2 Correction Report

**Status:** Correction pass complete — awaiting Stop 2 review
**Branch:** `auth-and-tasks`
**HEAD (unchanged throughout):** `cf91a82` docs: Phase 2 Stop 1 corrected architecture report
**Base:** `5f1fbf4` = `origin/main` = `origin/auth-and-tasks`
**Migration applied:** **No** (local / hosted / production all untouched)
**Anything committed, staged, pushed, or merged:** **No**

---

## 1. Branch and starting commit

| Item | Value |
|---|---|
| Branch | `auth-and-tasks` (tracks `origin/auth-and-tasks`) |
| HEAD | `cf91a82` docs: Phase 2 Stop 1 corrected architecture report |
| Base | `5f1fbf4` = `origin/main` = `origin/auth-and-tasks` |
| Commits made during this pass | 0 |

## 2. Initial working-tree state

Matched the Stop 1 report exactly:

- 4 modified tracked files: `lib/db/drizzle.config.ts`, `lib/db/migrations/meta/_journal.json`, `lib/db/src/schema/index.ts`, `lib/db/src/schema/tasks.ts`
- 6 untracked Slice 1 outputs: `docs/cursor/reports/08-phase2-slice1-migration-draft.md`, `lib/db/migrations/0001_chilly_randall_flagg.sql`, `lib/db/migrations/0001_profiles_and_task_ownership.audit.sql`, `lib/db/migrations/0001_profiles_and_task_ownership.rollback.sql`, `lib/db/migrations/meta/0001_snapshot.json`, `lib/db/src/schema/profiles.ts`

`git diff --check` was clean; nothing staged.

## 3. Files modified or moved in this pass

| File | Action |
|---|---|
| `lib/db/migrations/0001_profiles_and_task_ownership.audit.sql` | Moved → `docs/sql/phase2/phase2-pre-migration-audit.sql`, rewritten to be valid pre-migration |
| `lib/db/migrations/0001_profiles_and_task_ownership.rollback.sql` | Moved → `docs/sql/phase2/phase2-pre-user-data-rollback.sql`, updated to new names/policies |
| `docs/sql/phase2/phase2-post-migration-verification.sql` | **Created** (new) |
| `lib/db/migrations/0001_chilly_randall_flagg.sql` | Rewritten in place — functions/triggers/grants only, no table/column change |
| `lib/db/src/schema/tasks.ts` | `insertTaskSchema` now also omits `userId` |

Unchanged from Stop 1: `lib/db/src/schema/profiles.ts`, `lib/db/src/schema/index.ts`, `lib/db/migrations/meta/_journal.json`, `lib/db/migrations/meta/0001_snapshot.json` (table/column shape did not move, so no regeneration was needed or performed).

## 4. Final contents of `lib/db/migrations`

```
lib/db/migrations/0000_syllabus_reference_and_paper_attempts.sql
lib/db/migrations/0001_chilly_randall_flagg.sql
lib/db/migrations/meta/0000_snapshot.json
lib/db/migrations/meta/0001_snapshot.json
lib/db/migrations/meta/_journal.json
```

Only genuine Drizzle migration SQL and `meta/`. No audit/rollback files remain here, and none were added to the journal.

## 5. Final contents of `docs/sql/phase2`

```
docs/sql/phase2/phase2-post-migration-verification.sql
docs/sql/phase2/phase2-pre-migration-audit.sql
docs/sql/phase2/phase2-pre-user-data-rollback.sql
```

## 6. Exact privilege SQL (from the corrected migration)

```sql
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, level, exam_session) ON TABLE public.profiles TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.tasks FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON SEQUENCE public.tasks_id_seq FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tasks_id_seq TO authenticated;
```

Grep-verified: every `REVOKE` textually precedes its corresponding `GRANT`. `service_role` privileges are untouched.

## 7. Exact function and trigger names

| Old (generic — removed) | New (project-specific) |
|---|---|
| `public.handle_new_user()` | `public.lockdin_handle_new_user()` |
| `on_auth_user_created` | `lockdin_on_auth_user_created` |
| `public.set_profiles_updated_at()` | `public.lockdin_set_profiles_updated_at()` |
| `profiles_set_updated_at` | `lockdin_profiles_set_updated_at` |

- Both functions use `CREATE FUNCTION` (not `CREATE OR REPLACE`) so a name collision fails the migration instead of silently overwriting something already on the project.
- Both use `SET search_path = ''`; `lockdin_handle_new_user` is additionally `SECURITY DEFINER`.
- Both have `REVOKE ALL ... FROM PUBLIC, anon, authenticated` and **no** `EXECUTE` grant to any role.
- **No `DROP TRIGGER` statement exists anywhere in the migration** (grep-confirmed) — nothing on `auth.users` is ever dropped, under any name.

## 8. Full corrected migration SQL

See [`lib/db/migrations/0001_chilly_randall_flagg.sql`](../../../lib/db/migrations/0001_chilly_randall_flagg.sql) (authoritative, 201 lines). Contents:

- `profiles` table + username format check + unique partial index
- FK `profiles.id → auth.users.id` (hand-written SQL, not Drizzle `.references()`)
- Nullable `tasks.user_id` + FK → `auth.users.id` + index
- `lockdin_set_profiles_updated_at()` trigger function + `lockdin_profiles_set_updated_at` trigger
- `lockdin_handle_new_user()` SECURITY DEFINER trigger function + `lockdin_on_auth_user_created` trigger, with blank-string-safe metadata extraction
- Idempotent Auth-user profile backfill (`ON CONFLICT DO NOTHING`), same metadata normalization
- `profiles` RLS: `SELECT`/`UPDATE` own only, no `INSERT`/`DELETE` policies
- `tasks` RLS: full CRUD own, using `(select auth.uid()) = user_id`
- Explicit `REVOKE ALL` → `GRANT` privilege baseline on `profiles`, `tasks`, `tasks_id_seq`

## 9. Complete pre-migration audit SQL

See [`docs/sql/phase2/phase2-pre-migration-audit.sql`](../../sql/phase2/phase2-pre-migration-audit.sql). Runs cleanly against the **current, unmigrated** schema — does not reference `tasks.user_id` or `public.profiles`. Reports: task count; a private 100-row task sample (no `user_id`); tasks columns/constraints/indexes; RLS + FORCE RLS state; task policies; table + sequence grants (via `aclexplode`, not the querying-role-limited `information_schema` views); Auth-user count only; `to_regclass('public.profiles')` existence check; a collision check for the proposed `lockdin_*` function names; and the full list of non-internal triggers on `auth.users`. Explicitly excludes UUIDs, emails, metadata, tokens, provider identities, and connection strings.

## 10. Complete post-migration verification SQL

See [`docs/sql/phase2/phase2-post-migration-verification.sql`](../../sql/phase2/phase2-post-migration-verification.sql). Safe to run only **after** migration `0001` is applied. Ownership is reported as aggregates only: `total_task_count`, `null_user_id_count`, `non_null_user_id_count`, `distinct_owner_count` — no raw `user_id` values selected anywhere. Also verifies constraints, indexes, RLS/policies, table/column/sequence grants, function `SECURITY DEFINER`/`search_path` settings, function `EXECUTE` grants (expected empty), and the `auth.users` trigger list (expected superset of the pre-migration list).

## 11. Updated pre-user-data cleanup script

See [`docs/sql/phase2/phase2-pre-user-data-rollback.sql`](../../sql/phase2/phase2-pre-user-data-rollback.sql). Updated to the `lockdin_`-prefixed names, current policies, and current grants. Its header block states explicitly, in order:

1. It is **destructive** (drops `public.profiles` and all Slice 1 grants/policies/objects).
2. It is **valid only before real user-owned data exists**.
3. It is **provisional** until `phase2-pre-migration-audit.sql` confirms the original tasks RLS/privilege baseline it assumes.
4. It must **never** live in `lib/db/migrations/` or be journaled.
5. After real user data exists, **only forward fixes are permitted** — never a rollback like this one, never disabling RLS as a fix.

It was **not executed**.

## 12. `tasks.ts` diff and `userId` confirmation

```diff
-import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
+import {
+  pgTable, serial, text, integer, boolean, timestamp, date, uuid, index,
+} from "drizzle-orm/pg-core";
 ...
-export const tasksTable = pgTable("tasks", {
-  id: serial("id").primaryKey(),
-  title: text("title").notNull(),
-  ...
-});
+export const tasksTable = pgTable(
+  "tasks",
+  {
+    id: serial("id").primaryKey(),
+    userId: uuid("user_id"),
+    title: text("title").notNull(),
+    ...
+  },
+  (table) => [index("tasks_user_id_idx").on(table.userId)],
+);

-export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
+export const insertTaskSchema = createInsertSchema(tasksTable).omit({
+  id: true,
+  userId: true,
+  createdAt: true,
+});
```

Confirmed via `git grep`:

- `insertTaskSchema` / `InsertTask` are used nowhere else in the repo today.
- The actual client-facing API contracts (`CreateTaskBody`, `UpdateTaskBody`, generated from `lib/api-spec/openapi.yaml` → `TaskInput` / `TaskUpdate`) are a separate schema layer and already never accept or expose `userId`.
- Slice 1 API contracts are unchanged by this correction pass.

## 13. `profiles.ts`

New file (no prior base). `id` uuid PK, `fullName`/`username`/`level`/`examSession`/`onboardedAt` all nullable, `createdAt`/`updatedAt` timestamptz not-null default now(), `profiles_username_format` CHECK, partial unique index on `username`. The `auth.users` FK is hand-written in migration SQL only — not a Drizzle `.references()` — so drizzle-kit can never emit DDL against the `auth` schema.

## 14. `drizzle.config.ts` diff and justification

```diff
-import path from "path";
+// Relative paths are required: drizzle-kit 0.31 resolves out/meta by
+// prefixing `./`, which breaks when `path.join(__dirname, …)` is absolute.
 export default defineConfig({
-  schema: path.join(__dirname, "./src/schema/index.ts"),
-  out: path.join(__dirname, "./migrations"),
+  schema: "./src/schema/index.ts",
+  out: "./migrations",
```

Verified by running `pnpm exec drizzle-kit generate` (an offline, local schema-diff operation — unlike `push`/`migrate`, it makes no database connection). Output: all 11 tables resolved correctly, and **"No schema changes, nothing to migrate"** — confirming zero drift and that no new migration file was accidentally created. No unrelated config change was retained.

## 15. Journal and snapshot diff summary

- `_journal.json`: one new entry, `{ idx: 1, tag: "0001_chilly_randall_flagg" }`.
- `0001_snapshot.json`: new file; includes `profiles` and `tasks.user_id`; intentionally excludes `auth.*` FKs (hand-added in SQL only).
- Neither needed to change in this pass — the `generate` run in §14 confirms both still match the current TypeScript schema exactly.

## 16. Validation results

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm typecheck` | Pass (4 workspaces: `mockup-sandbox`, `api-server`, `scripts`, `revision-platform`) |
| `pnpm --filter @workspace/api-server test` | 4/4 pass |
| `pnpm --filter @workspace/revision-platform test` | 6/6 pass |
| `PORT=5173 BASE_PATH=/ pnpm build` | Pass |
| `git status --short` after every step | No unrelated tracked file ever changed |

## 17. Final git status and diff stat

Unchanged shape from the start of this pass — same 4 modified files, plus the moved/renamed/new untracked `docs/sql/phase2/*` and the rewritten `0001_chilly_randall_flagg.sql`. `git diff --check` clean. `git diff --cached` empty (nothing staged). `git log` unchanged — still `cf91a82` at `HEAD`.

## 18. Confirmation that no migration was applied

No `migrate`, `push`, or SQL Editor write ran at any point. The only `drizzle-kit` command executed was `generate`, which performs a local schema diff only and opens no network/database connection. `.env.local`'s `DATABASE_URL` was loaded into the shell solely to satisfy `drizzle.config.ts`'s own presence-check (`if (!process.env.DATABASE_URL) throw ...`), not to connect to anything.

## 19. Remaining uncertainty requiring Stop 2 approval

1. The hosted task-row wipe-vs-backfill decision is still unresolved — requires a human to actually run `phase2-pre-migration-audit.sql` against the real hosted database.
2. Whether column-level `UPDATE` grants on `profiles` behave as intended through PostgREST / the Data API is unverified against a live project.
3. `EXECUTE FUNCTION` trigger syntax assumes Supabase Postgres 15+; unverified against the actual hosted version in this pass.
4. The relative-path `drizzle.config.ts` fix is confirmed working via `generate`, but not yet exercised via a real `migrate` run.
5. The later onboarding RPC privilege model (narrow `SECURITY DEFINER`, `auth.uid()`-only, no arbitrary column writes) remains analysis-only — not implemented in this or any prior pass.

---

**Nothing was staged, committed, pushed, merged, or applied in this pass. Stopping here for Stop 2 review.**
