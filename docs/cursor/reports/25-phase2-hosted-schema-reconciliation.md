# Phase 2 Hosted Schema Reconciliation — Report 25

**Classification: A — EXACT UNJOURNALLED APPLICATION**

**Branch:** `auth-and-tasks`
**Starting commit:** `8e4e6b9acb3ccc4f6724e04230affeab37e97bec`
**Hosted writes:** **None**
**Nine hosted task rows:** **Untouched**
**`main`:** unchanged at `5f1fbf43cda2cf055c67ce123b1add04bacbb0b4`
**Report 13 / 24 / migrations / application code:** not modified

This report explains how the hosted schema reached the state observed in Report 24. It does **not** stamp the Drizzle journal, apply migrations, delete tasks, deploy, or merge.

---

## 1. Repository baseline

```
branch: auth-and-tasks
HEAD = origin/auth-and-tasks = 8e4e6b9acb3ccc4f6724e04230affeab37e97bec
origin/main = 5f1fbf43cda2cf055c67ce123b1add04bacbb0b4
working tree: clean at start
```

Required migration and report files confirmed present and left unmodified.

---

## 2. Read-only execution confirmation

Hosted inspection used `psql` against the approved hosted session-pooler connection (private env backup; connection string never printed, logged, or committed).

Journal, catalogue, and function-definition inspections ran inside:

```sql
BEGIN TRANSACTION READ ONLY;
-- read-only SELECTs only --
ROLLBACK;
```

`transaction_read_only` observed `on` during the journal transaction. No INSERT/UPDATE/DELETE/DDL/GRANT/REVOKE was executed. Raw private artefacts used for comparison were deleted after analysis.

---

## 3. Hosted Drizzle journal record

| Field | Result |
| --- | --- |
| Exact journal-record count | **1** |
| Matching local migration | **`0000_syllabus_reference_and_paper_attempts.sql`** |
| Hash match | Hosted hash equals local SHA-256 of migration **0000** |
| `created_at` vs journal `when` | **Exact match** to `meta/_journal.json` entry idx 0 (`1785172719598`) |
| Confirmed migration 0000 | **Yes** |
| Matches 0001 / 0002 / 0003 hashes | **No** |

Local SHA-256 (for comparison only; not secrets):

| Migration file | Role in this finding |
| --- | --- |
| `0000_syllabus_reference_and_paper_attempts.sql` | **Sole hosted journal match** |
| `0001_chilly_randall_flagg.sql` | Not journalled on hosted |
| `0002_phase2_atomic_onboarding.sql` | Not journalled on hosted |
| `0003_stormy_mongu.sql` | Not journalled; end-state absent |

**Conclusion:** hosted Drizzle tracking still reflects Phase 0 / migration **0000** only. Migrations **0001** and **0002** objects exist in the catalogue without corresponding journal rows.

---

## 4. Migration 0001 comparison matrix

Compared hosted catalogue (and private `pg_get_functiondef` / `pg_get_triggerdef` inspection) to `lib/db/migrations/0001_chilly_randall_flagg.sql`.

### A. `public.profiles`

| Requirement | Hosted result |
| --- | --- |
| Columns `id, full_name, username, level, exam_session, onboarded_at, created_at, updated_at` | Exact match |
| Types / nullability / `created_at`/`updated_at` default `now()` | Exact match |
| Primary key on `id` | Exact match |
| Username format check `^[a-z0-9_]{3,24}$` (null allowed) | Exact match |
| Partial unique index `profiles_username_unique` WHERE username IS NOT NULL | Exact match |
| FK `profiles_id_auth_users_id_fkey` → `auth.users(id)` ON DELETE CASCADE | Exact match (`ON UPDATE NO ACTION` omitted by Postgres display; equivalent default) |

### B. `public.tasks` ownership

| Requirement | Hosted result |
| --- | --- |
| `user_id` exists | Yes |
| Type `uuid` | Exact match |
| Currently nullable | **Yes** (expected pre-0003) |
| FK `tasks_user_id_auth_users_id_fkey` → `auth.users(id)` ON DELETE CASCADE | Exact match |
| Index `tasks_user_id_idx` | Exact match |

### C. Functions

| Function | Result |
| --- | --- |
| `public.lockdin_set_profiles_updated_at()` | **Exact match** (body; not SECURITY DEFINER; empty `search_path`; PUBLIC/anon/authenticated EXECUTE denied) |
| `public.lockdin_handle_new_user()` | **Exact match** (body; SECURITY DEFINER; empty `search_path`; PUBLIC/anon/authenticated EXECUTE denied) |

Notes: `pg_get_functiondef` emits `CREATE OR REPLACE` and `SET search_path TO ''` cosmetically; normalised body/header match migration **0001**. Complete function bodies are not reproduced here.

### D. Triggers

| Trigger | Result |
| --- | --- |
| `lockdin_profiles_set_updated_at` | BEFORE UPDATE on `public.profiles` → `lockdin_set_profiles_updated_at()` — Exact match |
| `lockdin_on_auth_user_created` | AFTER INSERT on `auth.users` → `lockdin_handle_new_user()` — Exact match |

### E. RLS and policies

| Item | Result |
| --- | --- |
| `profiles` RLS enabled / FORCE off | Exact match |
| `tasks` RLS enabled / FORCE off | Exact match |
| `profiles_select_own` | Exact match (`TO authenticated`, `(select auth.uid()) = id`) |
| `profiles_update_own` | Exact match (USING + WITH CHECK) |
| `tasks_select_own` / `insert_own` / `update_own` / `delete_own` | Exact match |
| Extra authenticated INSERT/DELETE policies on profiles | None (as required) |

### F. Grants (anon / authenticated intent)

| Item | Result |
| --- | --- |
| `anon` table privileges on `profiles` / `tasks` | None — Exact match |
| `authenticated` on `profiles`: SELECT + column UPDATE (`full_name`,`level`,`exam_session`) only | Exact match |
| `authenticated` on `tasks`: SELECT, INSERT, UPDATE, DELETE | Exact match |
| `authenticated` on `tasks_id_seq`: USAGE, SELECT | Exact match |
| `PUBLIC` direct table/sequence grants | None observed — Exact match |

Supabase owner/`service_role` catalogue privileges remain present (platform default). Migration **0001** does not revoke those roles; this is **not** treated as application drift relative to the migration text.

**Migration 0001 overall:** Exact match to repository migration (applied outside Drizzle journal).

---

## 5. Migration 0002 comparison matrix

Compared hosted `public.lockdin_complete_onboarding(text,text,text,text,integer[])` to `lib/db/migrations/0002_phase2_atomic_onboarding.sql`.

| Check | Result |
| --- | --- |
| Signature | Exact match (named args identical; whitespace-normalised) |
| Return type `profiles` | Exact match |
| SECURITY DEFINER | Exact match |
| Empty `search_path` | Exact match |
| Body vs migration SQL | **Exact match** after normalising `$function$` vs `$$` quoting |
| `auth.uid()`-derived ownership | Present |
| Validation / profile update / starter-task / exception handling | Present and matching |
| PUBLIC EXECUTE denied | Yes |
| anon EXECUTE denied | Yes |
| authenticated EXECUTE allowed | Yes |

**Migration 0002 overall:** Exact match (privileges + body). Complete function body not reproduced.

---

## 6. Migration 0003 state

| Check | Result |
| --- | --- |
| `tasks.user_id` NOT NULL | **No** — still nullable (`is_nullable = YES`) |
| Unowned task count | **9** / **9** |
| Journal row for 0003 | Absent |
| Classification | **Not applied** |

---

## 7. Hosted schema classification

**A. EXACT UNJOURNALLED APPLICATION**

Proven because:

- the sole journal record matches migration **0000** hash and journal timestamp;
- every examined migration **0001** object matches the repository SQL;
- migration **0002** matches the repository SQL;
- migration **0003** is not applied;
- no material definition/privilege/policy/constraint/trigger/function drift was found.

Interpretation relative to Reports 13 → 24: after Report 13’s clean pre-0001 baseline, migrations **0001** and **0002** were applied to hosted (outside or without updating Drizzle tracking). The nine prototype tasks remain, all with null `user_id`. Auth users and profiles counts remain **0**.

---

## 8. Backup status

| Field | Result |
| --- | --- |
| Current managed backup visible | Not verified — manual dashboard check required |
| Latest visible backup timestamp | Not verified — manual dashboard check required |

No backup was created or restored in this task.

---

## 9. Vercel matrix

Dashboard/CLI authenticated env inspection was not completed in this session. Values were never displayed.

| Variable | Preview | Production |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Not verified | Not verified |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Not verified | Not verified |
| `DATABASE_URL` | Not verified | Not verified |
| `SUPABASE_URL` | Not verified | Not verified |
| `SUPABASE_PUBLISHABLE_KEY` | Not verified | Not verified |

| Check | Status |
| --- | --- |
| No service-role value in `VITE_*` | Not verified |
| `DATABASE_URL` server-only | Not verified |

---

## 10. Auth matrix

| Auth item | Status |
| --- | --- |
| Production Site URL | Not verified |
| Production `/auth/callback` | Not verified |
| Production `/update-password` | Not verified |
| Preview `/auth/callback` | Not verified |
| Preview `/update-password` | Not verified |
| Email/password enabled | Not verified |
| Email-confirmation behaviour understood | Not verified |
| Password recovery available | Not verified |
| Google provider configured | Not verified |

Nothing in Auth settings was modified.

---

## 11. Google gate

**blocker unresolved**

Frontend still exposes a visible Google sign-in control. Hosted Google provider configuration was not verified, and no approved button-hiding change was applied or confirmed in this task.

---

## 12. Remaining blockers (operational — not schema-drift)

Schema reconciliation removes the “unknown / drifted 0001–0002” uncertainty. Cutover remains blocked on operational gates:

1. Current hosted backup not verified.
2. Vercel Preview/Production required variable names/scopes not verified.
3. Supabase Auth Site URL, redirects, email/password, and recovery not verified.
4. Google release gate unresolved (configure OAuth **or** land approved button hide before deploy).
5. Supervised cutover writes (task wipe, journal stamp, 0003 apply, deploy, merge) are **not** authorised by this report.

---

## 13. Recommended future cutover path (DO NOT EXECUTE HERE)

Because classification **A** is proven, a future separately approved supervised sequence should be equivalent to:

1. Verify backup immediately before writes.
2. Delete exactly the nine confirmed disposable prototype task rows.
3. Verify `public.tasks` is empty.
4. In one reviewed transaction, stamp migrations **0001** and **0002** into `drizzle.__drizzle_migrations` using their exact repository hashes and expected journal timestamps.
5. Run the normal Drizzle migration workflow so only migration **0003** applies.
6. Verify `tasks.user_id` becomes NOT NULL.
7. Run the complete post-migration verification.
8. Deploy and run hosted two-user Auth/onboarding/task-isolation tests.
9. Merge only after verification passes.

Do **not** supply or run journal INSERT SQL in this task.
Do **not** stamp 0001/0002 if any later re-check finds drift (would become classification B).

---

## 14. Confirmations

| Confirmation | Status |
| --- | --- |
| No hosted write occurred | **Yes** |
| All inspected hosted SQL transactions ended with ROLLBACK | **Yes** |
| Nine hosted task rows remain untouched | **Yes** |
| `main` remains unchanged | **Yes** |

---

## Stop

Read-only reconciliation complete. Hosted Supabase was not modified. No cutover write was performed.
