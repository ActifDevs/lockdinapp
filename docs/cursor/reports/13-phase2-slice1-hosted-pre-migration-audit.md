# Phase 2 Slice 1 — Hosted Pre-Migration Audit Report

**Status:** Read-only audit executed against the hosted Supabase database — **migration not applied, no database object changed, result is BLOCKED pending human review**
**Branch:** `auth-and-tasks`
**Commit audited against:** `8d6db594cd1f24cec9d2f42741faedcc1ed9c2c7`
**Migration applied:** **No**
**Database modified:** **No**
**Repository committed / pushed / merged:** **No**

This report records the results of running [`docs/sql/phase2/phase2-pre-migration-audit.sql`](../../sql/phase2/phase2-pre-migration-audit.sql) — a read-only script — against the real hosted Supabase project, ahead of ever applying `0001_chilly_randall_flagg.sql`. Two of the script's own documented stop conditions were triggered. No corrective action was taken; this is a snapshot for a human decision.

---

## 1. Repository safety

```
git fetch origin
git branch --show-current        → auth-and-tasks
git rev-parse HEAD                → 8d6db594cd1f24cec9d2f42741faedcc1ed9c2c7
git rev-parse origin/auth-and-tasks → 8d6db594cd1f24cec9d2f42741faedcc1ed9c2c7
git status --short                → only pre-existing untracked reports 11 and 12
```

- Branch, `HEAD`, and `origin/auth-and-tasks` all matched the expected reviewed commit exactly.
- `docs/sql/phase2/phase2-pre-migration-audit.sql` was opened and confirmed to contain **SELECT statements only** — a regex sweep for `INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE` at line-start returned zero matches.
- `0001_chilly_randall_flagg.sql`, `phase2-post-migration-verification.sql`, and `phase2-pre-user-data-rollback.sql` were **not opened or used** during this task.

## 2. Execution method (one disclosed deviation from the literal instruction)

The instruction asked for execution through the **Supabase SQL Editor** wrapped in `BEGIN TRANSACTION READ ONLY; ... ROLLBACK;`. Neither a Supabase MCP server nor browser access to the Dashboard SQL Editor was available in this session (only unrelated Lovable/Sanity MCP servers were configured). Instead, the script was run via `psql` directly against the project's existing hosted `DATABASE_URL` (the same session-pooler connection already used for Phase 0), wrapped in **exactly** the same read-only transaction:

```sql
BEGIN TRANSACTION READ ONLY;
-- full contents of phase2-pre-migration-audit.sql --
ROLLBACK;
```

Result: `BEGIN` → 12 read-only result sets → `ROLLBACK`. `psql` exited `0`. This gives the same read-only guarantee the SQL Editor wrapper would have provided. Connection string was never printed, logged, or committed. Raw output (which includes a small private task-title sample) was captured to a local temp file, reviewed privately, and then deleted before this report was written — it was never pasted into chat or into this file.

## 3. Sanitised audit result

| Field | Result |
|---|---|
| Repository commit | `8d6db594cd1f24cec9d2f42741faedcc1ed9c2c7` |
| Database writes performed | No |
| Read-only transaction used | Yes — via `psql` against hosted `DATABASE_URL` (Supabase MCP unavailable; no Dashboard access this session); `BEGIN TRANSACTION READ ONLY; ... ROLLBACK;` completed cleanly |
| Task count | 9 |
| Task classification | Clearly disposable prototype tasks — auto-pattern-generated titles, duplicated across subjects, created in tight timestamp clusters seconds apart, with zero Auth users existing at creation time. Raw titles withheld per privacy instructions. |
| Auth-user count | 0 |
| `public.profiles` already exists | No |
| `tasks.user_id` already exists | No |
| Actual `tasks` ID sequence | `public.tasks_id_seq` |
| Sequence matches `public.tasks_id_seq` | Yes |
| Tasks RLS enabled | **Yes** ⚠️ — see stop conditions |
| Tasks FORCE RLS enabled | No |
| Existing task policies — count | 0 |
| Existing task policies — names | (none) |
| Existing policy broader than own-row | Not applicable (zero policies) |
| Task table grants — PUBLIC | No direct ACL entry |
| Task table grants — `anon` | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| Task table grants — `authenticated` | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| Task sequence grants — PUBLIC | No direct ACL entry |
| Task sequence grants — `anon` | SELECT, UPDATE, USAGE |
| Task sequence grants — `authenticated` | SELECT, UPDATE, USAGE |
| Proposed function-name collisions (`lockdin_handle_new_user`, `lockdin_set_profiles_updated_at`) | No |
| Proposed trigger-name collisions (`lockdin_on_auth_user_created`, `lockdin_profiles_set_updated_at`) | No |
| Existing non-internal `auth.users` triggers | (none) |
| Existing Auth trigger conflicts with profile bootstrap | No (no non-internal triggers exist at all) |
| **Stop conditions triggered** | **Yes** |

### Stop conditions triggered

- **[Q6] Tasks RLS already enabled.** The audit's documented baseline assumed RLS starts disabled pre-migration. Found `tasks_rls_enabled = true` with **zero** policies attached — meaning the Data API currently denies all `anon`/`authenticated` row access by default (a safe outcome), but the starting state does not match what Slice 1 assumed.
- **[Q8] `anon`/`authenticated` already hold full table-level privileges on `public.tasks`.** Baseline assumed zero rows here; found `DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE` for both roles. This matches Supabase's default public-schema grant behavior for newly created tables, not anything granted by this session or the migration draft — but it was not accounted for in the audit's stated assumptions.
- **[Q9] `anon`/`authenticated` already hold `SELECT`/`UPDATE`/`USAGE` on `public.tasks_id_seq`.** Same cause as Q8; baseline assumed zero rows.

## 4. Path classification

**PATH D — blocked**, on the "unexpected RLS/policies/grants" criterion, even though task ownership alone would otherwise look like Path B (disposable prototypes).

**Why it still blocks despite looking otherwise clean:** the migration's own `REVOKE ALL ... FROM PUBLIC` → `REVOKE ... FROM anon, authenticated` → narrow `GRANT` sequence would still converge on the intended end-state regardless of this starting ACL, and `ENABLE ROW LEVEL SECURITY` is idempotent if already on. But the audit exists specifically to surface mismatches between assumed and actual baseline before anyone rationalizes past them. A human should confirm — not assume — why RLS is already on with no policies and why `anon`/`authenticated` already carry broad table/sequence grants (most likely Supabase's default public-schema grants from the earlier hand-bootstrap, possibly compounded by a Security Advisor auto-remediation) before Slice 1 is applied.

No deletion, backfill, or ownership assignment was performed or proposed. No Auth UUID was invented.

## 5. Final safety verification

```
git status --short   → only pre-existing untracked reports 11 and 12; nothing else changed
git rev-parse HEAD    → 8d6db594cd1f24cec9d2f42741faedcc1ed9c2c7 (unchanged)
```

- No commit, no push, no migration applied.
- No SQL other than the wrapped read-only audit was executed.
- No table, row, policy, grant, trigger, or function was changed — the transaction ended in `ROLLBACK`.
- No raw private data (task titles, connection string) appears in this report; the local temp files holding raw `psql` output have been deleted.

---

**This report reflects a read-only observation only. Slice 1 must not be applied to this hosted database until a human explicitly resolves the RLS/grant baseline mismatch above.**
