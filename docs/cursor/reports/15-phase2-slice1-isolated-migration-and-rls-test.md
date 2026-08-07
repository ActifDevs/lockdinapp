# Phase 2 Slice 1 — Isolated Migration and Two-User RLS Test Report

**Status:** Migration `0001_chilly_randall_flagg.sql` applied and fully exercised in an **isolated local environment only** — every test passed. **Hosted Supabase was never touched.**
**Branch:** `auth-and-tasks`
**Commit:** `8d6db594cd1f24cec9d2f42741faedcc1ed9c2c7` (unchanged by this task)
**Migration applied to hosted project:** **No**
**Hosted database modified:** **No**
**`main` modified:** **No**
**Repository committed / pushed / merged:** **No**

This follows [`14-phase2-slice1-audit-resolution-and-isolated-test.md`](./14-phase2-slice1-audit-resolution-and-isolated-test.md), where the isolated test was blocked on missing Docker/Supabase-CLI access. That blocker was resolved by installing Colima (a lightweight, Docker Desktop–free container runtime) via Homebrew, which allowed the local Supabase stack to run. All testing in this report happened exclusively against that local stack.

---

## 1. Repository safety

```
git fetch origin
git branch --show-current        → auth-and-tasks
git rev-parse HEAD                → 8d6db594cd1f24cec9d2f42741faedcc1ed9c2c7
git rev-parse origin/auth-and-tasks → 8d6db594cd1f24cec9d2f42741faedcc1ed9c2c7
git status --short                → only pre-existing untracked reports 11, 12, 13, 14
```

Confirmed at the start and re-confirmed at the end of this task: no tracked file changed, `git diff --stat` empty, `HEAD` unchanged throughout.

## 2. Human resolution record

Unchanged from report 14 — repeated here for completeness, not re-derived:

- **Q6 accepted** — `public.tasks` RLS already enabled with zero policies on hosted; treated as safe default-deny.
- **Q8/Q9 accepted** — hosted `anon`/`authenticated` broad grants; migration `0001`'s explicit `REVOKE ... FROM PUBLIC/anon/authenticated` before granting back makes the starting ACL irrelevant.
- Nine hosted `tasks` rows confirmed disposable prototype data by the human reviewer.
- Deletion of those nine rows remains **deferred to a later, separately coordinated cutover** — **not performed or authorised in this task**.

## 3. Isolated environment — established and proven non-production

**Environment type:** Local Supabase development stack (Option A), run via Colima instead of Docker Desktop.

**Setup performed** (with explicit user approval before installing anything):

```
brew install colima docker
colima start --cpu 2 --memory 4 --disk 20
pnpm exec supabase start -x analytics,vector,realtime,storage,imgproxy,edge-runtime,functions,studio,meta --ignore-health-check
```

Two issues encountered and resolved:
- The `vector` log-shipper container failed under Colima's mount driver (`operation not supported` mounting a host Unix socket) — excluded via `-x vector`, which has no effect on Postgres/Auth/PostgREST functionality.
- Some non-essential containers (`realtime`, `storage`, `pg_meta`, `studio`, `analytics`) were slow to pass their internal health checks the first time in this resource-constrained environment, causing the CLI's own health gate to tear everything down — resolved with `--ignore-health-check` plus excluding the containers not needed for this test. `db`, `auth`, `rest`, and `kong` (the four services this test actually depends on) all came up **healthy**.

**Proof this is not the hosted production project** (sanitised — no credentials shown):

| Check | Result |
|---|---|
| Local DB internal network address | `172.18.0.2:5432` (private Docker network, not internet-routable) |
| Local API URL | `http://127.0.0.1:54321` (localhost-only) |
| Hosted linked project ref on file (`supabase/.temp/project-ref`) | `hazvcdrcvsxmuwdfiucx` — a distinct, unrelated identifier from the local target above |
| Local API reachability check | `GET /rest/v1/` → `200` on `127.0.0.1:54321` only |

No database URL, password, key, or token is reproduced in this report.

## 4. Representative baseline data (pre-migration-0001 shape)

Migration `0000_syllabus_reference_and_paper_attempts.sql` is — as already documented in the Phase 0 checkpoint — an **incremental** migration that assumes pre-existing tables (from an earlier `push`-based history) and cannot run as-is against a truly empty database; it fails immediately (`relation "subjects" does not exist`). This is a pre-existing repository characteristic, not something introduced by this task.

Consistent with the Phase 0 hosted precedent (hand-bootstrap of the target `0000` shape, then stamp the migration journal), the same approach was used here, entirely inside the isolated local DB:

1. Built a scratch copy of the TypeScript schema representing the schema **as of `0000`** (current schema minus `profiles`, minus `tasks.user_id`) in a temp directory outside the repo.
2. Used `drizzle-kit push` (safe here — this is a disposable local DB, not a shared/hosted one) to create that exact `0000`-shaped baseline.
3. Stamped the local `drizzle.__drizzle_migrations` tracking table for `0000` using the migration file's actual SHA-256 hash — which matched the hash already recorded in the Phase 0 hosted checkpoint exactly, confirming the stamping method is correct and reproducible.
4. Inserted one test subject and two generic prototype tasks — **`Prototype task A`** and **`Prototype task B`** (no hosted titles, IDs, or content copied) — as the representative baseline row set.

## 5. Migration `0001` execution result

Applied via the real repository workflow (`drizzle-kit migrate`, pointed at the local DB only) from a scratch migrations folder containing the genuine, unmodified `0001_chilly_randall_flagg.sql`:

| Item | Result |
|---|---|
| Migration succeeded | **Yes** |
| SQL error | None |
| Duration | ~2 seconds |
| Existing isolated task rows removed or changed | **No** — both prototype rows unchanged (same id/title/subject_id/completed) |
| `tasks.user_id` after migration | Present, nullable, `NULL` for both existing rows |
| `public.profiles` after migration | Exists |

No hand-editing of the migration SQL was needed to make it pass.

## 6. Post-migration verification summary

Ran `docs/sql/phase2/phase2-post-migration-verification.sql` unmodified against the local DB. **Every check matched its expected value:**

| Check | Result |
|---|---|
| `profiles_table_exists` | true |
| `tasks.user_id` present, nullable | true |
| Total task count / null user_id / non-null / distinct owners | 2 / 2 / 0 / 0 (matches the 2 baseline rows exactly, untouched) |
| `auth_user_count` / `profile_count` / `missing_profile_count` / `orphan_profile_count` | 0 / 0 / 0 / 0 (before any test user was created) |
| `profiles` constraints | FK to `auth.users(id)` cascade, PK, username-format CHECK — all present |
| `tasks` constraints | PK, subject FK, topic FK, **new** `user_id` → `auth.users(id)` cascade FK — all present |
| Indexes (`profiles`, `tasks`) | `profiles_pkey`, `profiles_username_unique`, `tasks_pkey`, `tasks_user_id_idx` — all present |
| RLS enabled / forced on both tables | enabled=true, forced=false — as designed |
| Policies | `profiles_select_own`, `profiles_update_own`, `tasks_select_own`, `tasks_insert_own`, `tasks_update_own`, `tasks_delete_own` — all use `(select auth.uid()) = id` / `= user_id` |
| Full privilege matrix (28 checks: table/column/sequence privileges for `anon`/`authenticated`) | **Every single `_expect_false` column returned false; every expected-true column returned true** — exact match, no deviations |
| Raw ACL dump for `profiles`/`tasks`/`tasks_id_seq` | **Zero rows for `PUBLIC`**; `anon` has zero rows on any of the three; `authenticated` has exactly the intended grants |
| Function `EXECUTE` checks (`lockdin_handle_new_user`, `lockdin_set_profiles_updated_at`) | `anon`/`authenticated` execute = false for both |
| `PUBLIC` grant check on both functions | Zero rows (no inherited execute access) |
| Function metadata | `lockdin_handle_new_user`: `SECURITY DEFINER` = true, `search_path=""`; `lockdin_set_profiles_updated_at`: `SECURITY DEFINER` = false, `search_path=""` |
| `auth.users` triggers | `lockdin_on_auth_user_created` present, enabled |
| `profiles` triggers | `lockdin_profiles_set_updated_at` present, enabled |

No deviation from the expected shape was found anywhere in this script.

## 7. Profile-trigger results (two disposable local Auth users)

Created via the local GoTrue Admin API (service-role key, local instance only) with disposable `*.test` emails and passwords never shown in this report:

- **User A** — `user_metadata.full_name = "  Test User A  "` (leading/trailing whitespace, to test `BTRIM`).
- **User B** — `user_metadata.full_name = "   "` (all-whitespace, to test the blank→`NULL` fallback).

| Check | User A | User B |
|---|---|---|
| Exactly one profile row created | Yes | Yes |
| `profile.id` matches Auth user id | Yes | Yes |
| `full_name` copied correctly | `"Test User A"` (trimmed) | — |
| Blank metadata → `NULL` (not empty string) | n/a | **`NULL`** — confirmed |
| `username` auto-assigned | No — `NULL` | No — `NULL` |
| `onboarded_at` | `NULL` | `NULL` |
| `level` / `exam_session` | `NULL` | `NULL` |
| Total profile count after both signups | 2 (no duplicates, no missing rows) | |

## 8. Profile privilege/RLS matrix (real JWT sessions)

Both users signed in via the real password grant (`/auth/v1/token?grant_type=password`), producing genuine `role: authenticated` JWTs used for every request below via PostgREST (`/rest/v1/...`) — no direct psql superuser access was used for any of these checks.

| Test | Result |
|---|---|
| A reads own profile | `200`, correct row |
| A reads B's profile (by id filter) | `200`, **empty array** (RLS row filter, not an error) |
| A updates own `full_name` | `200`, succeeded |
| A updates own `level` | `200`, succeeded |
| A updates own `exam_session` | `200`, succeeded |
| A updates own `username` | **`403` / `42501` permission denied** |
| A updates own `onboarded_at` | **`403` / `42501`** |
| A updates own `id` | **`403` / `42501`** |
| A updates own `created_at` | **`403` / `42501`** |
| A updates own `updated_at` directly | **`403` / `42501`** (cannot bypass the trigger) |
| A updates B's profile | `200`, **0 rows affected** |
| B reads own profile | `200`, correct row (`full_name = NULL`) |
| B reads A's profile | `200`, empty array |
| B updates A's profile | `200`, 0 rows affected |
| Anonymous reads any profile | **`401` / `42501` permission denied** |
| `updated_at` auto-changes after an allowed update | **Confirmed** — timestamp advanced on each of A's three successful updates |

Every result matches the intended design exactly: table-level `UPDATE` is genuinely denied (not just column-restricted-but-silently-ignored), cross-user access is filtered at the row level rather than erroring, and anonymous access is denied outright.

## 9. Task RLS two-user matrix

| Test | Result |
|---|---|
| A creates a task with A's own `user_id` | `201`, succeeded |
| A creates a task claiming B's `user_id` | **`403` — "new row violates row-level security policy for table tasks"** |
| B creates a task with B's own `user_id` | `201`, succeeded |
| A lists tasks | `200`, sees **only** A's task |
| A selects B's task by id | `200`, empty array |
| A updates own task | `200`, succeeded |
| A updates B's task | `200`, 0 rows affected |
| A deletes B's task | `200`, 0 rows affected |
| B lists tasks | `200`, sees **only** B's task |
| B updates A's task | `200`, 0 rows affected |
| B deletes A's task | `200`, 0 rows affected |
| A deletes own task (cleanup) | `200`, succeeded |
| Anonymous lists tasks | **`401` / `42501`** |
| Anonymous creates a task | **`401` / `42501`** |
| Anonymous updates a task | **`401` / `42501`** |
| Anonymous deletes a task | **`401` / `42501`** |

All tested directly through authenticated Supabase (PostgREST) sessions with real JWTs, as required — not through the current Express task API, since backend Auth middleware doesn't exist yet.

## 10. Database constraint tests

| Test | Result |
|---|---|
| Invalid username characters (e.g. `Invalid User!`) | **Rejected** — `profiles_username_format` CHECK violation |
| Username < 3 characters (`ab`) | **Rejected** — same CHECK |
| Username > 24 characters | **Rejected** — same CHECK |
| Valid username (`test_user_a`) | Accepted |
| Duplicate non-null username on a second profile | **Rejected** — `profiles_username_unique` unique-index violation |
| Multiple `NULL` usernames | **Allowed** — confirmed two profiles coexisting, one with a username and one `NULL` |
| `tasks.user_id` referencing a UUID absent from `auth.users` | **Rejected** — `tasks_user_id_auth_users_id_fkey` foreign-key violation |
| Deleting an Auth user cascades to profile + owned tasks | **Confirmed** — deleting User B via the Admin API reduced `profiles` and `tasks` rows for that id to 0, and removed the `auth.users` row itself |

The onboarding RPC was not implemented, as instructed.

## 11. Repository validation

Run independently of the local DB test (these don't touch any database beyond `drizzle-kit generate`'s config-loading requirement):

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm --filter @workspace/db generate` | **"No schema changes, nothing to migrate"** — no new migration file created |
| `pnpm typecheck` | Pass — 4/4 workspaces |
| `pnpm --filter @workspace/api-server test` | Pass — 4/4 tests |
| `pnpm --filter @workspace/revision-platform test` | Pass — 6/6 tests |
| `PORT=5173 BASE_PATH=/ pnpm -r --if-present run build` | Pass |
| `git status --short` after every command | Only pre-existing untracked reports; nothing else changed |

## 12. Final report

| # | Item | Result |
|---|---|---|
| 1 | Isolated environment type | Local Supabase development stack, via Colima (installed with explicit approval) |
| 2 | Proof production was not used | Local DB on private Docker network (`172.18.0.2`), local API on `127.0.0.1:54321` only; hosted project ref (`hazvcdrcvsxmuwdfiucx`) confirmed distinct — see §3 |
| 3 | Human-resolution record | Q6 accepted; Q8/Q9 accepted; 9 hosted tasks disposable; deletion still deferred — see §2 |
| 4 | Migration execution result | Success, ~2s, no error, baseline rows untouched, `user_id` nullable — see §5 |
| 5 | Post-migration verification summary | Every check passed exactly as expected — see §6 |
| 6 | Profile-trigger results | Exactly one correct profile per user; blank metadata → `NULL` confirmed — see §7 |
| 7 | Profile privilege/RLS matrix | All own-row access allowed, all cross-user/anon/restricted-column access denied — see §8 |
| 8 | Task RLS two-user matrix | Full row isolation confirmed both directions; anon fully denied — see §9 |
| 9 | Username constraint tests | Format, length, uniqueness, and NULL-multiplicity all correct — see §10 |
| 10 | FK and cascade tests | Unknown-UUID FK rejected; Auth-user delete cascades to profile + tasks — see §10 |
| 11 | Validation command results | All pass — see §11 |
| 12 | Files changed in the repository | None — only this report file created |
| 13 | Hosted Supabase untouched | **Yes** — no SQL, connection, or request of any kind was made to the hosted project during this task |
| 14 | Nine hosted tasks remain untouched | **Yes** — not queried, not referenced, not deleted |
| 15 | `main` modified | No |
| 16 | Any failure requiring migration correction | **None** — migration `0001_chilly_randall_flagg.sql` applied and verified exactly as written, no hand-editing needed |

---

**Local environment cleanup performed after testing:** both disposable test users deleted, `supabase stop` run, Colima VM stopped, and all local temp files (test keys, tokens, SQL logs) deleted. Colima and the Docker CLI remain installed via Homebrew for future use but are not currently running.

**This report reflects an isolated-environment result only.** No hosted migration is authorised by these results alone — applying `0001` to the hosted project, and the separately-gated decision on the nine existing hosted task rows, both remain open, human-gated decisions.
