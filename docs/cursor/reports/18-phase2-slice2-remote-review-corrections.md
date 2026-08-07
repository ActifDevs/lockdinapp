# Phase 2 Slice 2 — Remote Review Corrections

**Status:** Correction pass complete on `auth-and-tasks`. **Not committed. Not pushed.** Hosted Supabase untouched.
**Branch:** `auth-and-tasks`
**Starting commit (required baseline):** `dff86e916f8d9e7b6062a4a096a1a68dec76f1fa`
**HEAD after edits:** still uncommitted on top of `dff86e9` (working tree dirty by design)
**Hosted Supabase modified:** **No**
**Migration applied to hosted:** **No**
**Nine hosted prototype tasks:** **Untouched**
**`main` modified:** **No**
**Frontend Auth / Google OAuth / onboarding RPC:** **Not implemented**

Supersedes the exact-isolation and catalogue-write claims in
[`16-phase2-slice2-backend-auth-and-tasks.md`](./16-phase2-slice2-backend-auth-and-tasks.md)
for the items corrected below. Report 16 retains historical Slice 2 Auth/task
implementation context and now carries a superseded banner pointing here.

---

## 1. Starting branch and commit

```
git fetch origin
branch: auth-and-tasks
HEAD = origin/auth-and-tasks = dff86e916f8d9e7b6062a4a096a1a68dec76f1fa
origin/main = 5f1fbf43cda2cf055c67ce123b1add04bacbb0b4 (unchanged)
```

Working tree at baseline was clean except untracked historical
`docs/cursor/reports/17-phase2-slice2-branch-review-commit.md`.
No reset/clean/restore/stash/force-push. No teammate commits on the branch.

---

## 2. Exact files changed

**New**

- `artifacts/api-server/src/lib/feature-quarantine.ts`
- `artifacts/api-server/src/lib/enrich-task.test.ts`
- `artifacts/api-server/scripts/require-local-supabase.mjs`
- `artifacts/api-server/vitest.integration.config.ts`
- `lib/api-zod/src/generated/types/errorMessage.ts` (codegen)
- `lib/api-zod/src/generated/types/syllabusTopicStatus.ts` (codegen)
- `docs/cursor/reports/18-phase2-slice2-remote-review-corrections.md` (this file)

**Modified (API / tests)**

- `artifacts/api-server/src/lib/enrich-task.ts` — bulk enrichment
- `artifacts/api-server/src/routes/subjects.ts` — read-only catalogue + neutral placeholders
- `artifacts/api-server/src/routes/pastPaperAttempts.ts` — quarantine
- `artifacts/api-server/src/routes/examDates.ts` — quarantine
- `artifacts/api-server/src/routes/syllabus.ts` — PATCH disabled
- `artifacts/api-server/src/routes/dashboard.ts` — neutral syllabusProgress; completed-today metric
- `artifacts/api-server/src/routes/progress.ts` — neutral syllabus placeholders
- `artifacts/api-server/src/routes/tasks.integration.test.ts` — exact two-user suite
- `artifacts/api-server/package.json` — `test:integration`
- `artifacts/api-server/vitest.config.ts` — exclude `*.integration.test.ts` from unit run

**Modified (OpenAPI + codegen)**

- `lib/api-spec/openapi.yaml`
- `lib/api-client-react/src/generated/api.ts`
- `lib/api-client-react/src/generated/api.schemas.ts`
- `lib/api-zod/src/generated/api.ts`
- `lib/api-zod/src/generated/types/index.ts`
- `lib/api-zod/src/generated/types/subject.ts`
- `lib/api-zod/src/generated/types/syllabusTopic.ts`

**Modified (frontend type adapt after codegen)**

- `artifacts/revision-platform/src/pages/onboarding.tsx` — cast for disabled createSubject return
- `artifacts/revision-platform/src/pages/settings.tsx` — onSuccess no longer assumes Subject body

**Docs**

- `docs/cursor/reports/16-phase2-slice2-backend-auth-and-tasks.md` — superseded banner only

**Untracked historical (unchanged this pass)**

- `docs/cursor/reports/17-phase2-slice2-branch-review-commit.md`

**Migrations**

- None generated. Still only `0000_…` and `0001_chilly_randall_flagg.sql`.

---

## 3. Subject write-route disposition

| Route | Behaviour |
|-------|-----------|
| `POST /api/subjects` | **403**, existing error shape `{ error: string }`, **no Drizzle query/insert** |
| `DELETE /api/subjects/:subjectId` | **403**, same message, **no Drizzle delete** |

Message: subject catalogue is read-only shared reference data (importer/admin managed).
No ordinary-user Auth added; no admin role implemented.

Preserved public reads: `GET /api/subjects`, `GET /api/subjects/:subjectId`,
syllabus, assessment-components.

---

## 4. Past-paper / exam / syllabus-progress quarantine

Shared helper: `feature-quarantine.ts` →
`FEATURE_TEMPORARILY_UNAVAILABLE` + `temporarilyUnavailableBody()`.

| Area | Reads | Writes / deletes |
|------|-------|------------------|
| Past papers | Auth required; `[]`; **no** `pastPaperAttemptsTable` query | **503** temporary unavailable |
| Subject performance | Contract-safe empty payload; **no** attempts query | n/a |
| Exam dates | Auth required; `[]`; **no** `examDatesTable` query | **503** |
| Syllabus topic PATCH | n/a | **503**; **no** update |

Anonymous callers cannot receive global past-paper or exam-date data (401).

---

## 5. Neutral syllabus-progress response behaviour

Shared `syllabus_topics.status` / `notes` are **not** treated as per-user data.

| Surface | Behaviour |
|---------|-----------|
| Subject list/detail | `syllabusProgress=0`, `topicsCompleted=0`, `topicsInProgress=0`, paper fields null, `upcomingTasksCount=0` |
| Syllabus GET | Titles/units/outcomes kept; `status="not_started"`; `notes=null` |
| Dashboard `subjectProgressSummary` | `syllabusProgress=0` for every subject |
| Progress overview | `syllabusCompletion[].syllabusProgress=0`, `overallSyllabusProgress=0` |

No progress is calculated from shared topic status.

---

## 6. Bulk task-enrichment design and query-count evidence

`enrichTasks(tasks)`:

1. Collect unique subject IDs
2. Collect unique non-null topic IDs
3. One subjects query (injected or Drizzle `inArray`)
4. One topics query only when topic IDs exist
5. In-memory maps
6. Preserve original order

Empty list → **zero** queries (early return before fetch).

`enrichTask(single)` delegates to `enrichTasks([task])`.

Unit evidence (`enrich-task.test.ts`):

- empty → `fetchSubjects`/`fetchTopics` not called
- three tasks sharing subjects/topics → each fetch called **once**
- missing refs → `Unknown` / `#6366f1` / `null`
- order preserved (`30,10,20`)
- null topicIds → topics fetch skipped

---

## 7. Exact two-user dashboard / progress results

Seeded distinguishable data (local Auth disposable users):

| User | Incomplete due today | Completed today |
|------|----------------------|-----------------|
| A | 1 (`A due today`) | 1 |
| B | 1 (`B due today`) | 3 |

Observed exact assertions (integration suite):

**Dashboard**

- A `todayTasks` / `upcomingDeadlines` contain A's due task; **not** B's
- B arrays contain B's due task; **not** A's
- A: `todayTasksTotal=1`, `todayTasksCompleted=1`
- B: `todayTasksTotal=1`, `todayTasksCompleted=3`
- Combined completed today = 4; neither user alone returns 4
- `recentPerformance=[]`, `upcomingExams=[]`; syllabus placeholders 0

**Progress**

- A `totalTasksCompleted=1`; B `=3`
- `weeklyTasksCompleted` for today: A=1, B=3
- Neither response contains combined total 4

**Subjects / quarantine**

- Public subjects: no task-derived values; create/delete **403**
- Performance empty; syllabus status/notes neutral
- Past-paper / exam writes **503**; syllabus PATCH **503**; safe reads `[]` / placeholders

Disposable users deleted in `afterAll` (tasks cascade via `ON DELETE cascade`).

---

## 8. Dedicated integration command (did not skip)

```json
"test": "vitest run",
"test:integration": "node ./scripts/require-local-supabase.mjs && vitest run --config vitest.integration.config.ts"
```

- Unit `test` excludes `*.integration.test.ts` (safe without local Supabase).
- `require-local-supabase.mjs` verifies `supabase status` API URL is
  `127.0.0.1` / `localhost`, fails clearly otherwise, **never** uses hosted.
- Integration config includes only `*.integration.test.ts` and does **not**
  `describe.skip`.

Proof from this pass:

```
[test:integration] Local Supabase OK at http://127.0.0.1:54321
Test Files  1 passed (1)
Tests  7 passed (7)
```

No skipped tests. Re-run produced the same 7/7 pass.

---

## 9. OpenAPI changes

- Subjects tagged as public read-only shared catalogue; list summary no longer
  says “for the current user”.
- `POST`/`DELETE` subjects marked deprecated; responses **403** only.
- Past-paper / exam routes: Bearer required; reads empty; writes **503**.
- Syllabus PATCH: deprecated **503**.
- Dashboard/progress descriptions note Auth-scoped tasks + neutral syllabus
  placeholders.
- Schema descriptions document placeholder fields on `Subject` / `SyllabusTopic`.
- Regenerated `@workspace/api-client-react` and `@workspace/api-zod` via orval.

---

## 10. Unit / integration / typecheck / build results

| Check | Result |
|-------|--------|
| `pnpm install --frozen-lockfile` | OK |
| `pnpm --filter @workspace/db generate` | **No schema changes, nothing to migrate** |
| `pnpm typecheck` | Pass |
| `pnpm --filter @workspace/api-server test` | **24 passed** (unit; integration excluded) |
| `pnpm --filter @workspace/api-server test:integration` | **7 passed, 0 skipped** (local Supabase) |
| `pnpm --filter @workspace/revision-platform test` | **6 passed** |
| `PORT=5173 BASE_PATH=/ pnpm build` | Pass |
| `git diff --check` | Clean |

Local stack used for integration:
`colima start` + `pnpm exec supabase start -x analytics,vector,realtime,storage,imgproxy,edge-runtime,functions,studio,meta --ignore-health-check`
→ `http://127.0.0.1:54321`.

---

## 11. Confirmation — no migration generated

`drizzle-kit generate` reported no schema changes. Migration set unchanged:
`0000_syllabus_reference_and_paper_attempts.sql`,
`0001_chilly_randall_flagg.sql`.

---

## 12. Confirmation — hosted Supabase untouched

No hosted connection, SQL, migration apply, or dashboard mutation in this pass.
Only local `127.0.0.1` Supabase was used for integration.

---

## 13. Confirmation — nine hosted prototype tasks untouched

No hosted task delete/update/select for production data. Local disposable
Auth users/tasks only.

---

## 14. Remaining blockers

1. **Hosted migration `0001` still not applied** (requires explicit authorisation).
2. **Nine hosted prototype tasks still present** (deletion deferred to cutover).
3. **Past-paper / exam-date / syllabus-progress ownership migrations** not started;
   routes remain quarantined.
4. **No admin role** for subject catalogue writes — importer/admin path TBD.
5. **Frontend still calls `createSubject` / `deleteSubject`** (onboarding/settings);
   API now returns 403 — UI/product rewiring for catalogue selection is still
   outstanding (out of Slice 2 Auth scope; type-adapted only so build passes).
6. **Frontend Auth** (session wiring, OAuth, onboarding RPC) still not implemented.
7. **Merge to `main` / production deploy** not authorised.

---

## Stop

Corrections are ready for review on `auth-and-tasks`. **Do not commit or push
in this pass** (per brief). Await review approval before any commit, push,
hosted migration, or further Slice work.
