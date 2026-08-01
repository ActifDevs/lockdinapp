# Phase 2 Slice 2 — Backend Auth and Complete Task Isolation

> **Superseded in part by** [`18-phase2-slice2-remote-review-corrections.md`](./18-phase2-slice2-remote-review-corrections.md).
> Remote review of `dff86e9` required security/test/performance corrections. Exact two-user dashboard assertions, subject write quarantine, unowned-feature quarantine, bulk enrichment, and the non-skipping `test:integration` command are documented in report 18 — do not treat this report’s isolation claims as final without 18.

**Status:** Backend Auth + user-scoped task isolation implemented and tested against **local Supabase only**. Not committed. Not pushed. Hosted migration/task deletion not performed.
**Branch:** `auth-and-tasks`
**Starting commit:** `484e70db85d9079a3f5a4a23d1790e93026a6bda`
**Hosted Supabase modified:** **No**
**Migration `0001` applied to hosted:** **No**
**Nine hosted prototype tasks:** **Untouched**
**`main` modified:** **No**
**Frontend Auth / Google OAuth / onboarding RPC:** **Not implemented** (out of scope)

---

## 1. Starting branch and commit

```
branch: auth-and-tasks
HEAD = origin/auth-and-tasks = 484e70db85d9079a3f5a4a23d1790e93026a6bda
origin/main = 5f1fbf43cda2cf055c67ce123b1add04bacbb0b4 (unchanged)
```

Baseline before edits: `pnpm install --frozen-lockfile`, `pnpm typecheck`, api-server tests (4), revision-platform tests (6) — all passed.

## 2. Files changed

**New**

- `artifacts/api-server/src/lib/supabase-config.ts`
- `artifacts/api-server/src/lib/supabase-verifier.ts`
- `artifacts/api-server/src/lib/supabase-user-client.ts`
- `artifacts/api-server/src/lib/supabase-errors.ts`
- `artifacts/api-server/src/lib/task-row.ts`
- `artifacts/api-server/src/lib/user-tasks.ts`
- `artifacts/api-server/src/lib/enrich-task.ts`
- `artifacts/api-server/src/middlewares/require-auth.ts`
- `artifacts/api-server/src/types/express.d.ts`
- Unit/integration tests for the above
- This report

**Modified**

- `artifacts/api-server/package.json` (+ `@supabase/supabase-js`)
- `pnpm-lock.yaml`
- `artifacts/api-server/src/routes/tasks.ts`
- `artifacts/api-server/src/routes/dashboard.ts`
- `artifacts/api-server/src/routes/progress.ts`
- `artifacts/api-server/src/routes/subjects.ts`
- `artifacts/api-server/src/routes/dashboard.empty.test.ts`
- `lib/api-spec/openapi.yaml` (`bearerAuth`, `401`/`404` on task-owned routes)

No new Drizzle migration was generated.

## 3. Auth middleware design

`requireAuth` (`middlewares/require-auth.ts`):

1. Requires exactly one `Authorization: Bearer <token>` header.
2. Rejects missing / empty / malformed headers with generic `{ error: "Unauthorized" }` (401).
3. Verifies via `getSupabaseVerifier().auth.getClaims(token)` (publishable-key client).
4. Rejects verification errors with the same generic 401 (no claim/token details returned).
5. Validates `claims.sub` is a UUID; rejects otherwise.
6. Sets `req.userId = claims.sub` and `req.accessToken = token`.
7. Logs only safe reasons (`claims_verification_failed`, `invalid_sub_claim`, `auth_middleware_error`) — never tokens or claim payloads.

Express augmentation in `types/express.d.ts` adds optional `userId` / `accessToken`.

Server config reads only `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` (never `VITE_*`, never service-role for ordinary auth). Missing vars fail safely when authenticated routes are hit.

## 4. Request-scoped Supabase client design

`createUserScopedSupabaseClient(accessToken)` creates a **new** client per call with:

```ts
global: { headers: { Authorization: `Bearer ${accessToken}` } }
auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
```

No module-level Authorization mutation. The JWT verifier client is separate and never used for Data API CRUD.

Concurrency unit test asserts two successive factory calls receive distinct clients with distinct Bearer headers.

## 5. Task CRUD changes

All of `GET/POST/PATCH/DELETE /api/tasks` now:

- require `requireAuth`;
- use the request-scoped Data API client;
- filter by `user_id = req.userId` (list/update/delete);
- set `user_id` from `req.userId` on create;
- reject body `userId` / `user_id` with 400;
- return 404 for inaccessible/cross-user IDs (non-disclosing);
- map snake_case → camelCase deliberately;
- never expose `userId` in responses;
- enrich subject/topic names via Drizzle reference queries only.

Privileged Drizzle is **not** the ownership boundary for tasks.

## 6. Indirect task access paths and disposition

| Path | Previous | Disposition |
|---|---|---|
| `routes/tasks.ts` | Global Drizzle CRUD | Auth + user-scoped Data API |
| `routes/dashboard.ts` | Global `tasksTable` for today/upcoming/streak | Auth + user-scoped task rows; metrics from verified user only |
| `routes/progress.ts` | Global `tasksTable` for weekly/total completed | Auth + user-scoped task rows |
| `routes/subjects.ts` list/get/create enrich | Global `tasksTable` → `upcomingTasksCount` | **Removed** — always `0` |
| Subject detail enrichment | Global tasks + recent papers | Task counts removed; recent paper fields nulled |
| Study-plan / reminder API routes | None (frontend-only) | N/A — no server path |
| Dashboard `recentPerformance` / `upcomingExams` | Global past papers / exams | **Temporarily emptied** (not multi-tenant yet) |
| Progress `subjectAttentionNeeded` / `totalPapersLogged` | Global papers | **Emptied / 0** |

Confirmed: zero remaining `tasksTable` references under `artifacts/api-server`.

## 7. Public subject-catalogue decision

**Approach A — Public pure subject catalogue with no user-specific enrichment.**

- Remains unauthenticated.
- Keeps shared catalogue fields: id/name/code/color + syllabus topic aggregates.
- `upcomingTasksCount` always `0`.
- `recentPaperScore` / `recentPaperLabel` always `null`.
- User task enrichment lives on authenticated `/tasks`, `/dashboard/summary`, `/progress/overview`.

## 8. API contract changes

- Task response shape unchanged (still no `userId`).
- Tasks / dashboard / progress now require Bearer auth → OpenAPI updated with `bearerAuth` + `401` (and `404` on task mutate/delete).
- Subjects list/get still public; enriched user fields zeroed/nulled rather than removed from schema (preserves Zod/OpenAPI required fields).
- Dashboard/progress still return the same top-level keys; paper/exam sections are empty arrays / zero until ownership migrations land.

## 9. Unit-test results

`pnpm --filter @workspace/api-server test` (without needing local Supabase for unit files):

- missing Authorization → 401
- malformed Bearer → 401
- invalid token → generic 401
- invalid `claims.sub` → 401
- valid token populates `req.userId` / `req.accessToken`
- body `userId` / `user_id` rejected on create
- Supabase error mapping (404/400/500, no internals leaked)
- snake_case → camelCase mapper (no `userId` leak)
- request-scoped client concurrency (distinct Bearer headers)

## 10. Two-user integration-test results

Against **local** Supabase (`127.0.0.1` only; disposable users cleaned up in `afterAll`):

| Check | Result |
|---|---|
| A lists only A tasks | Pass |
| B lists only B tasks | Pass |
| A cannot update/delete B’s task | Pass (404) |
| B cannot update/delete A’s task | Pass (404) |
| A cannot create B-owned task via body | Pass (400) |
| Anonymous task requests fail | Pass (401) |
| Dashboard contains only current user’s task ids | Pass |
| Progress returns for authenticated user | Pass |
| Public subjects never expose other users’ task counts | Pass (`upcomingTasksCount === 0`) |
| Concurrent A/B list requests do not exchange context | Pass |

**Final api-server tally: 9 files, 27/27 tests passed.**

## 11. Concurrency-test result

- Unit: factory creates independent clients with non-shared Authorization headers — **pass**.
- Integration: parallel `GET /api/tasks` for A and B returned strictly isolated id sets — **pass**.

## 12. Typecheck / test / build results

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm --filter @workspace/db generate` | **No schema changes, nothing to migrate** |
| `pnpm typecheck` | Pass (all workspaces) |
| `pnpm --filter @workspace/api-server test` | 27/27 pass |
| `pnpm --filter @workspace/revision-platform test` | 6/6 pass |
| `PORT=5173 BASE_PATH=/ pnpm build` | Pass |
| `git diff --check` | Clean |

## 13. Hosted Supabase untouched

Yes. Integration testing used only the local stack (`API_URL` on `127.0.0.1`). No hosted migrate, SQL Editor write, or production connection was used in this slice.

## 14. Nine hosted prototype tasks untouched

Yes. No hosted task delete/update/select was performed.

## 15. Remaining risks or blockers

1. **Frontend still uses fake localStorage auth** — authenticated API routes will 401 until frontend Slice wires real Supabase sessions + `setAuthTokenGetter`. Expected for this backend-only slice.
2. **Past-paper / exam / syllabus-topic status are still not multi-tenant** — dashboard/progress paper sections are intentionally emptied; subjects recent-paper fields nulled. Ownership migrations for those tables remain later work.
3. **Hosted migration `0001` still not applied** — backend Data API paths require `tasks.user_id` + RLS policies that exist in the migration draft / local test DB, not yet on hosted.
4. **Hosted prototype task cutover** (delete vs backfill) remains a separate human-gated step.
5. **Local integration tests skip** when local Supabase is not running (`describe.skip`); CI without Colima/Supabase will still run unit tests.

---

**Stop for review. Not committed. Not pushed.**
