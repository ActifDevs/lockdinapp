# Phase 2 Hosted Cutover Readiness — Report 24

**Final verdict: BLOCKED**

**Branch:** `auth-and-tasks`
**Starting commit:** `e0eef3c3680bd5e28a34ee69f99a075fb7e76fc1`
**Readiness check (UTC):** `2026-08-02T23:35:00Z` (approx.; executed in this session)
**Hosted writes:** **None**
**Hosted transactions:** both ended with `ROLLBACK`
**Nine hosted task rows:** **Untouched** (read-only inspection only)
**`main`:** unchanged at `5f1fbf43cda2cf055c67ce123b1add04bacbb0b4`
**Report 23 / SQL / application code:** not modified

This report is the final hosted readiness assessment before a separately approved Phase 2 cutover. It does **not** authorise migration application, task deletion, deployment, or merge.

---

## 1. Repository baseline

```
branch: auth-and-tasks
HEAD = origin/auth-and-tasks = e0eef3c3680bd5e28a34ee69f99a075fb7e76fc1
origin/main = 5f1fbf43cda2cf055c67ce123b1add04bacbb0b4
working tree: clean of task-related changes at start
```

Required files present (unmodified):

- `docs/sql/phase2/phase2-final-cutover-preflight.sql`
- `docs/sql/phase2/phase2-pre-migration-audit.sql`
- `docs/sql/phase2/phase2-post-migration-verification.sql`
- `docs/cursor/reports/23-phase2-closeout-preparation.md`

---

## 2. Execution method

No Supabase MCP or Dashboard SQL Editor was available in this session.

Both scripts were executed via `psql` against the approved hosted session-pooler `DATABASE_URL` (loaded from the private hosted env backup; connection string never printed, logged, or committed), each wrapped exactly as:

```sql
BEGIN TRANSACTION READ ONLY;
-- complete script contents --
ROLLBACK;
```

Identity check (sanitised): server address was **not** loopback; `transaction_read_only` was **on** during the exact Drizzle-count transaction.

Raw private task-sample output was reviewed locally for classification, then deleted. Titles, IDs, and row contents are **not** recorded here.

---

## 3. Final preflight — READ ONLY + ROLLBACK

**Confirmation:** `BEGIN TRANSACTION READ ONLY` → full `phase2-final-cutover-preflight.sql` → `ROLLBACK`. Exit code 0. No writes.

Sanitised results:

| Item | Result |
| --- | --- |
| Auth-user count | **0** |
| Task count | **9** |
| `public.profiles` exists | **Yes** |
| `public.tasks.user_id` exists | **Yes** |
| `tasks.user_id` nullability (when present) | **YES** (nullable) |
| Unowned-task count (`user_id` null) | **9** |
| Tasks RLS enabled | **Yes** (`true`) |
| Tasks FORCE RLS | **No** (`false`) |
| Task policy count | **4** |
| Task policy names | `tasks_delete_own`, `tasks_insert_own`, `tasks_select_own`, `tasks_update_own` |
| Profile policy count | **2** |
| Profile policy names | `profiles_select_own`, `profiles_update_own` |
| `lockdin_handle_new_user` present | **Yes** |
| `lockdin_set_profiles_updated_at` present | **Yes** |
| `lockdin_complete_onboarding` present | **Yes** |
| `lockdin_on_auth_user_created` present | **Yes** (on `auth.users`) |
| `lockdin_profiles_set_updated_at` present | **Yes** (on `public.profiles`) |
| Unexpected collision vs expected pre-cutover baseline | **Yes — objects already present** (expected absent before applying 0001–0003) |
| Drizzle migration table exists | **Yes** |
| Drizzle migration record estimate | **1** |
| Exact Drizzle record count | **1** (separate READ ONLY + ROLLBACK query) |
| Subject count | **9** |
| Syllabus-topic count | **520** |
| Assessment-component count | **50** |
| Past-paper-attempt count | **0** |
| Exam-date count | **0** |

---

## 4. Pre-migration audit — READ ONLY + ROLLBACK

**Confirmation:** `BEGIN TRANSACTION READ ONLY` → full `phase2-pre-migration-audit.sql` → `ROLLBACK`. Exit code 0. No writes.

Sanitised comparison with final preflight (no material conflict between the two audits on current hosted state):

| Item | Preflight | Pre-migration audit | Match |
| --- | --- | --- | --- |
| Auth-user count | 0 | 0 | Yes |
| Task count | 9 | 9 | Yes |
| `profiles` exists | Yes | Yes | Yes |
| `tasks.user_id` exists | Yes | Yes | Yes |
| Tasks RLS enabled / forced | Yes / No | Yes / No | Yes |
| Task policies | 4 named own-row policies | same 4 names | Yes |
| lockdin functions/triggers | present | present | Yes |

Both audits **agree with each other** and **disagree with the expected historical pre-cutover baseline** (profiles absent; `user_id` absent; migrations 0001–0003 not applied; no lockdin_* objects).

Additional audit catalogue notes (sanitised):

- `tasks_id_seq` matches expected name.
- `tasks_user_id_idx` and `tasks_user_id_auth_users_id_fkey` exist.
- Non-internal `auth.users` trigger present: `lockdin_on_auth_user_created` only.
- Table/sequence grants differ from the older Report 13 baseline (post-migration privilege shape visible); not used as a READY signal.

---

## 5. Private task classification

**Classification:** `disposable prototype tasks`

Basis (private; no titles/IDs/contents recorded):

- exactly **9** rows;
- created in a tight timestamp cluster (within one day);
- patterned prototype-style titles across a small set of subjects;
- **0** Auth users and **0** profiles;
- all **9** rows have null `user_id`.

Consistent with prior human classification in Report 13. **No rows were deleted or updated.**

---

## 6. Backup readiness

| Field | Result |
| --- | --- |
| Backup method | Not verified — manual dashboard check required |
| Verification status | **Not verified** |
| Backup timestamp / latest visible backup time | Not verified — manual dashboard check required |

No backup was created or committed during this task. No Supabase Dashboard backup UI was accessible in this session.

**Blocker:** current backup not verified.

---

## 7. Vercel environment-variable readiness

Vercel CLI / Dashboard access was not available in this session (`vercel` not on PATH; no authenticated project linkage used). Values were never displayed.

| Variable | Preview | Production |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Not verified — manual dashboard check required | Not verified — manual dashboard check required |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Not verified — manual dashboard check required | Not verified — manual dashboard check required |
| `DATABASE_URL` | Not verified — manual dashboard check required | Not verified — manual dashboard check required |
| `SUPABASE_URL` | Not verified — manual dashboard check required | Not verified — manual dashboard check required |
| `SUPABASE_PUBLISHABLE_KEY` | Not verified — manual dashboard check required | Not verified — manual dashboard check required |

Also required confirmations:

| Check | Status |
| --- | --- |
| No service-role secret in any `VITE_*` variable | Not verified — manual dashboard check required |
| `DATABASE_URL` is server-only | Not verified — manual dashboard check required |
| Frontend vars are publishable/public only | Not verified — manual dashboard check required |
| Preview and Production scopes inspected separately | **No** (not inspected) |

**Blocker:** required Vercel variables unverified.

---

## 8. Supabase Auth readiness

Supabase Auth settings were not accessible in this session (no Dashboard / Management API verification performed). Nothing was changed.

| Auth item | Status |
| --- | --- |
| Production Site URL configured | Not verified — manual dashboard check required |
| Production `/auth/callback` redirect allowed | Not verified — manual dashboard check required |
| Production `/update-password` redirect allowed | Not verified — manual dashboard check required |
| Preview `/auth/callback` redirect allowed | Not verified — manual dashboard check required |
| Preview `/update-password` redirect allowed | Not verified — manual dashboard check required |
| Email/password provider enabled | Not verified — manual dashboard check required |
| Email-confirmation behaviour understood | Not verified — manual dashboard check required |
| Password-recovery delivery available | Not verified — manual dashboard check required |
| Google provider configured | Not verified — manual dashboard check required |

**Blocker:** Auth readiness unverified.

---

## 9. Google release gate

Frontend still exposes a visible **Continue with Google** control on login/signup (`signInWithOAuth({ provider: "google" })`).

| Result | Value |
| --- | --- |
| Google release-gate result | **blocker: visible Google button is not configured** *(provider configuration Not verified — manual dashboard check required; no approved button-hiding plan verified in-repo for this readiness pass)* |

No button-hiding change was implemented in this task.

**Blocker:** visible Google button without verified configured provider or approved hide plan.

---

## 10. Expected vs observed hosted baseline

| Expected historical baseline | Observed hosted now | Status |
| --- | --- | --- |
| Auth users = 0 | 0 | Match |
| Tasks = 9 | 9 | Match |
| `public.profiles` absent | **present** | **Mismatch** |
| `public.tasks.user_id` absent | **present (nullable)** | **Mismatch** |
| Migrations 0001–0003 not applied | **0001/0002 objects present**; `user_id` still nullable (0003 NOT NULL not applied); Drizzle journal count **1** | **Mismatch / inconsistent journal** |
| Disposable prototype tasks | disposable prototype tasks | Match |
| No unexpected lockdin_* collision before apply | lockdin functions + triggers **already exist** | **Mismatch** |

Interpretation: hosted schema is **not** the clean pre-0001 baseline assumed by the cutover runbook. Objects from migrations **0001** and **0002** appear already present, while the Drizzle journal reports only **one** recorded migration. Migration **0003** (`user_id SET NOT NULL`) is **not** reflected (`is_nullable = YES`, unowned count = 9). Re-applying 0001/0002 would collide; applying 0003 alone against nine null-owner rows would fail NOT NULL.

---

## 11. Every blocking condition

1. Hosted baseline diverged: `public.profiles` exists (expected absent).
2. Hosted baseline diverged: `public.tasks.user_id` exists (expected absent).
3. Hosted baseline diverged: lockdin functions/triggers/policies from 0001/0002 already present (expected not applied).
4. Drizzle journal inconsistency: migration table exists with exact count **1** while 0001/0002 catalog objects are present.
5. Migration 0003 end-state not present (`user_id` still nullable; 9 unowned tasks) — cutover cannot treat schema as pre- or post-cutover cleanly.
6. Current database backup: **Not verified — manual dashboard check required**.
7. Vercel Preview/Production required variables: **Not verified — manual dashboard check required**.
8. Supabase Auth Site URL / redirects / email-password / recovery: **Not verified — manual dashboard check required**.
9. Google release gate: visible Google button; provider **not verified**; no approved hide plan verified → blocked.

---

## 12. Final verdict

**BLOCKED**

Not READY FOR SUPERVISED CUTOVER.

BLOCKED is the correct verdict: readiness could not be proved against the expected hosted baseline, and required dashboard checks were unavailable.

---

## 13. Exact next actions

1. **Human investigation (hosted Dashboard + SQL):** explain how `profiles`, `tasks.user_id`, lockdin functions/triggers/policies exist while `drizzle.__drizzle_migrations` count is **1**. Do **not** re-apply 0001/0002 until the journal/schema story is reconciled.
2. **Decide cutover path** for the diverged hosted schema (repair journal vs. formalise already-applied 0001/0002 vs. restore-from-backup to true pre-migration baseline). Separately approve any path that writes.
3. **Verify a current backup** in Supabase (or confirm a non-empty private logical backup outside the repo) and record method + timestamp.
4. **Inspect Vercel Preview and Production** env var **names/scopes** only; confirm no service-role in `VITE_*`; confirm `DATABASE_URL` server-only.
5. **Inspect Supabase Auth:** production Site URL; production + preview `/auth/callback` and `/update-password` redirects; email/password; confirmation behaviour; recovery delivery.
6. **Close Google gate:** configure Google OAuth for supervised cutover testing, **or** land a separately reviewed change that hides the Google button before deploy.
7. Only after the above are green, re-run this readiness pass (or an approved delta checklist) before any supervised cutover that deletes the nine prototype tasks and applies remaining migrations.

Do **not** apply migrations, delete hosted tasks, deploy, or merge on the strength of this report.

---

## Stop

Read-only readiness audit complete. Hosted Supabase was not written. All hosted SQL transactions ended with `ROLLBACK`. Nine hosted task rows remain untouched. `main` unchanged.
