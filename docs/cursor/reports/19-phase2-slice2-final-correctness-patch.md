# Phase 2 Slice 2 — Final Exact Correctness Patch

**Status:** Exact correctness patch complete on `auth-and-tasks`. **Not committed. Not pushed.** Hosted Supabase untouched.
**Branch:** `auth-and-tasks`
**Starting commit:** `da9f1ed1f579b01defd8dbd882f8ce2d68c2228d`
**Hosted Supabase modified:** **No**
**Migration applied to hosted:** **No**
**Nine hosted prototype tasks:** **Untouched**
**`main` modified:** **No**
**Frontend Auth / onboarding / settings changes:** **Not in scope**

---

## 1. Starting commit

```
branch: auth-and-tasks
HEAD = origin/auth-and-tasks = da9f1ed1f579b01defd8dbd882f8ce2d68c2228d
origin/main = 5f1fbf43cda2cf055c67ce123b1add04bacbb0b4 (unchanged)
working tree: clean at baseline
```

---

## 2. Exact files changed

- `artifacts/api-server/src/routes/dashboard.ts`
- `artifacts/api-server/src/routes/tasks.integration.test.ts`
- `artifacts/api-server/scripts/require-local-supabase.mjs`
- `artifacts/api-server/scripts/require-local-supabase.test.mjs` (new)
- `artifacts/api-server/package.json`
- `docs/cursor/reports/19-phase2-slice2-final-correctness-patch.md` (this file)

No lockfile change. No migrations. No OpenAPI/codegen. No frontend page changes.

---

## 3. Final today-mission definitions

- **todayTasksTotal:** number of all tasks owned by the current user whose `deadline` equals today.
- **todayTasksCompleted:** number of completed tasks within that same due-today set.
- **todayTasks:** incomplete tasks within that due-today set only.
- **completedAt** is not used for mission totals (still used for streak / weekly progress).

---

## 4. User A exact result

| Metric | Value |
|--------|-------|
| todayTasksTotal | **2** |
| todayTasksCompleted | **1** |
| totalTasksCompleted | **2** |
| weekly completed today | **2** |

Seed: A1 incomplete due today; A2 completed due today; A3 completed with no deadline.

---

## 5. User B exact result

| Metric | Value |
|--------|-------|
| todayTasksTotal | **4** |
| todayTasksCompleted | **3** |
| totalTasksCompleted | **3** |
| weekly completed today | **3** |

Seed: B1 incomplete due today; three completed tasks due today.

---

## 6. Completed-undated-task test (A3)

Proved:

- `completed === true`
- `completedAt` date is today
- `deadline === null`
- counts in `totalTasksCompleted` and `weeklyTasksCompleted` for today
- does **not** count in `todayTasksTotal` or `todayTasksCompleted`
- does **not** appear in `todayTasks`
- does **not** appear in User B responses

---

## 7. API_URL exact-loopback validation

`assertLoopbackUrl("API_URL", apiUrl)` after `supabase status`. Hostname must be exactly one of `localhost`, `127.0.0.1`, `::1` (URL-parsed; no substring match). Failures exit non-zero and do not print the URL.

---

## 8. DB_URL exact-loopback validation

`assertLoopbackUrl("DB_URL", dbUrl)` with the same hostname rules. Existence alone is insufficient. Failures do not expose credentials or connection strings.

---

## 9. URL-guard unit-test results

`node --test artifacts/api-server/scripts/require-local-supabase.test.mjs`:

- **11 passed, 0 failed, 0 skipped**
- Accepts localhost / 127.0.0.1 / `[::1]` / PostgreSQL loopback
- Rejects hosted, path/query spoofing, misleading hostnames, malformed/missing URLs
- Assertion error message does not include the private URL or password

---

## 10. Integration-test result

`pnpm --filter @workspace/api-server test:integration`:

```
11 loopback unit tests passed
[test:integration] Local Supabase loopback URLs verified
Test Files  1 passed (1)
Tests  7 passed (7)
```

Zero skipped. Exact A/B mission and progress assertions passed.

---

## 11. Typecheck / unit / revision-platform / build

| Check | Result |
|-------|--------|
| `pnpm install --frozen-lockfile` | OK |
| `pnpm --filter @workspace/db generate` | No schema changes |
| `pnpm typecheck` | Pass |
| `pnpm --filter @workspace/api-server test` | 24 passed |
| `pnpm --filter @workspace/revision-platform test` | 6 passed |
| `PORT=5173 BASE_PATH=/ pnpm build` | Pass |
| `git diff --check` | Clean |

---

## 12. Confirmation — no migration generated

Migration set unchanged: `0000_…`, `0001_chilly_randall_flagg.sql`.

---

## 13. Confirmation — hosted Supabase untouched

Only local loopback Supabase used for integration. No hosted connection or SQL.

---

## 14. Confirmation — nine hosted prototype tasks untouched

No hosted task delete/update. Local disposable Auth users/tasks only.

---

## 15. Confirmation — main unchanged

`origin/main` remains `5f1fbf43cda2cf055c67ce123b1add04bacbb0b4`.

---

## 16. Remaining blockers

1. Hosted migration `0001` still not applied.
2. Hosted prototype-task deletion still deferred.
3. Frontend Auth not implemented.
4. Frontend subject-selection rewiring still pending (`createSubject` / `deleteSubject` remain API-disabled).

---

## Stop

Patch ready for review. **Do not commit or push in this task.**
