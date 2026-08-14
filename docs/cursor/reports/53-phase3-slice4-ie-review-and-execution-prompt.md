# Slice 4 IE Review

**Date:** 2026-08-12
**Slice:** Phase 3 Slice 4 — Exam-Date Ownership
**Status:** Review complete — awaiting Owner approval of execution prompt before source changes

---

## Verdict summary

| Check | Result |
| --- | --- |
| Baseline verified | **PASS** |
| Preflight consistent with repository | **PASS** |
| Implementation plan consistent | **PASS** |
| Hosted boundary | **CONFIRMED** |
| Blockers | **none** (for drafting/executing against handoff facts) |

---

## Baseline verified: PASS

- `origin/phase3-multitenancy` = `d640128a6b0006b779c041b529cab38cc599df44`
- Journal on that tip: exactly `0000`–`0008` (last tag `0008_uneven_mojo`)
- No `0009` migration file
- No `phase3-s4-*` branch yet

**Approved implementation branch:** `phase3-s4-exam-date-ownership`

---

## Preflight consistent with repository: PASS

Matches Report 34 + live code:

- `exam_dates` has no `user_id`
- Personal-entry decision (not shared catalogue)
- Routes quarantined: `GET` → `[]`, `POST`/`DELETE` → 503, no table query
- Dashboard `upcomingExams: []`
- Calendar / `reminder-runner` consume list only

---

## Implementation plan consistent: PASS

Against the IE handoff approved facts (Sections 2–5) and the Slice 3 / Migration `0008` ownership pattern:

- Empty-table guard
- Owner-only SELECT / INSERT / DELETE RLS
- Least-privilege grants
- Sequence privileges via `pg_get_serial_sequence(...)`

---

## Unexpected differences

1. **No dedicated Slice 4 preflight/plan reports in-repo** (`docs/cursor/reports/` ended at Report 52 / Slice 3). Review used Report 34 + the IE handoff’s approved facts + repo inspection. Downloads only had the IE takeover text.
2. **Report 34 sketched UPDATE + `created_at`/`updated_at` for `exam_dates`.** Approved Slice 4 scope **narrows** that: **NO UPDATE / PATCH out of scope**; ownership column is `user_id` only per the handoff. Treat handoff facts as controlling.
3. **Migration `0008` has empty-table guard + dynamic sequence grants but no `LOCK TABLE`.** Approved Slice 4 plan **adds** a migration-time table lock — follow Slice 4 plan, not a copy-paste of `0008` alone.
4. Working tree may previously have been on other branches (e.g. hotfix); review is against `phase3-multitenancy` @ `d640128`.

**Non-blocking:** commit formal Slice 4 preflight/plan as later reports when available for provenance parity with earlier slices.

---

## Migration 0009 approach

Drizzle-generated migration only:

1. Migration-time table lock
2. Empty-table fail-closed guard
3. `user_id UUID NOT NULL`
4. FK `auth.users(id) ON DELETE CASCADE`
5. Caller-oriented index
6. Owner-only SELECT / INSERT / DELETE RLS
7. Revoke legacy grants
8. Authenticated SELECT / INSERT / DELETE only
9. Sequence privileges via `pg_get_serial_sequence(...)`
10. **NO UPDATE**

Do not edit `0000`–`0008` or hand-edit the journal. Local loopback migrate only; **stop before hosted apply**.

---

## API restoration

- **GET `/exam-dates`:** authenticated, caller-scoped, chronological, subject-enriched
- **POST `/exam-dates`:** reject ownership spoof aliases; validate subject; `user_id` from auth
- **DELETE `/exam-dates/:examDateId`:** id + owner match; nondisclosing 404
- **PATCH:** out of scope
- **Dashboard `upcomingExams`:** caller-scoped

Mirror Slice 3 request-scoped Supabase client + `hasOwnershipField` patterns.

---

## Test strategy

Unit + local integration:

- Two-user isolation
- Spoof rejection
- Empty / foreign DELETE → 404
- Chronological list
- Dashboard scoping
- Grant / RLS checks

No hosted Migration 0009 in this implementation phase.

---

## Hosted boundary: CONFIRMED

Not authorized during implementation:

- Apply Migration 0009 to hosted Supabase
- Use Dashboard SQL Editor for tracked migrations
- Modify hosted rows / RLS manually
- Deploy Production
- Merge into `main` or `phase3-multitenancy`
- Start Phase 4

Hosted cutover only after: implementation → local verification → pre-commit audit → commit/push → **separate hosted authorization**.

---

## Blockers

**none** for drafting/executing against the handoff’s approved facts.

---

# Recommended Slice 4 Implementation Execution Prompt

```text
CODING-AGENT PROMPT — Phase 3 Slice 4: Exam-Date Ownership (Implementation)

ROLE
You are the Slice 4 implementation agent for ActifDevs/lockdinapp.
Implement exam_dates ownership per the approved IE handoff facts and
Slice 3 / Migration 0008 patterns. You do not apply hosted Migration 0009,
deploy Production, or merge into phase3-multitenancy / main.

BASELINE (immutable)
- Branch from: origin/phase3-multitenancy
- Exact SHA: d640128a6b0006b779c041b529cab38cc599df44
- Working branch: phase3-s4-exam-date-ownership
- Journal before work: exactly 0000–0008 (last: 0008_uneven_mojo)
- Do not modify migrations 0000–0008
- Do not hand-edit lib/db/migrations/meta/_journal.json
- Do not invent legacy ownership; empty-table strategy only

APPROVED PRODUCT / SECURITY FACTS
- exam_dates = PERSONAL user data
- Hosted preflight assumed exam_dates row count 0; re-verify locally
  before empty-table assumptions; hosted apply is OUT OF SCOPE here
- No user_id today; RLS may be enabled with no policies; replace broad
  grants with least privilege
- Current API: GET [] quarantine; POST/DELETE 503; PATCH out of scope
- Owner from authenticated request identity only
- Reject ownership spoof aliases: userId, user_id, ownerId, owner_id
- Selected-subject membership is NOT required for Slice 4
- No new exam-management UI

============================================================
CHECKPOINT 1 — Branch + schema + Migration 0009 (local only)
============================================================
1. git fetch; confirm origin/phase3-multitenancy == d640128…
2. Create branch phase3-s4-exam-date-ownership from that SHA
3. Update lib/db/src/schema/examDates.ts:
   - Add userId: uuid NOT NULL → auth.users(id) ON DELETE CASCADE
   - Do NOT add UPDATE-oriented fields unless the approved plan
     explicitly requires them (handoff: ownership column is user_id;
     NO UPDATE privilege)
4. Generate Migration 0009 via repository Drizzle tooling only
5. Migration 0009 must include, in a safe order:
   a. Migration-time table lock on public.exam_dates
   b. Empty-table guard: IF EXISTS (SELECT 1 FROM exam_dates LIMIT 1)
      THEN RAISE EXCEPTION SQLSTATE 55000 / exam_dates_not_empty
      (fail closed; no invented owners)
   c. ADD COLUMN user_id UUID NOT NULL
   d. FK to auth.users(id) ON DELETE CASCADE
   e. Caller-oriented index (lead with user_id; date-oriented for list)
   f. ENABLE RLS (idempotent if already enabled)
   g. Policies (authenticated only):
      - exam_dates_select_own  FOR SELECT USING ((select auth.uid()) = user_id)
      - exam_dates_insert_own  FOR INSERT WITH CHECK ((select auth.uid()) = user_id)
      - exam_dates_delete_own  FOR DELETE USING ((select auth.uid()) = user_id)
      - NO UPDATE policy
   h. REVOKE ALL on table from PUBLIC, anon, authenticated
   i. GRANT SELECT, INSERT, DELETE ON TABLE to authenticated only
   j. Sequence privileges via pg_get_serial_sequence('public.exam_dates','id')
      — REVOKE ALL from PUBLIC/anon/authenticated; GRANT USAGE, SELECT to
      authenticated. Do not hard-code a physical sequence name.
6. Apply Migration 0009 ONLY to local loopback Supabase
7. Verify local: columns, FK, index, RLS policies, grants, sequence grants,
   empty-table guard behavior (optional local non-empty probe in a throwaway
   DB/transaction if safe — do not leave dirty state)
STOP CHECKPOINT 1: no hosted connection for migrate

============================================================
CHECKPOINT 2 — API + Dashboard + contracts/codegen
============================================================
Follow Slice 3 past-paper patterns (request-scoped Supabase client,
hasOwnershipField, nondisclosing 404).

1. Restore artifacts/api-server/src/routes/examDates.ts:
   GET /exam-dates
   - requireAuth
   - list caller-owned rows only
   - chronological order (date ASC, then stable id tie-break)
   - enrich subjectName / subjectColor from subjects catalogue
   POST /exam-dates
   - requireAuth
   - reject ownership spoof fields → 400
   - validate body (subjectId exists; paperCode/date/notes per existing contract)
   - insert with user_id = req.userId (never from body)
   - return enriched ExamDate
   DELETE /exam-dates/:examDateId
   - requireAuth
   - delete where id AND user_id = caller
   - missing or foreign → 404 (nondisclosing)
   PATCH: do not implement
2. Dashboard GET /dashboard/summary:
   - Replace upcomingExams: [] with caller-scoped upcoming exam rows
     (same enrichment/shape as ExamDate; chronological; reasonable upcoming window
      consistent with existing Calendar semantics)
3. OpenAPI:
   - Remove quarantine/503 ownership-not-implemented wording for exam-dates
   - Document auth requirements and 400 ownership-field rejection
   - Keep ExamDate / ExamDateInput response shapes stable for Calendar
   - Note PATCH still absent / out of scope
4. Regenerate api-zod + api-client-react from OpenAPI via repo scripts
5. Frontend:
   - Calendar: keep useListExamDates consumption; no new create/edit/delete UI
   - Dashboard: existing upcoming-exams UI should light up from scoped data
   - reminder-runner: verify listExamDates path is auth-safe under ownership
   - auth-provider: verify queryClient.clear / invalidate covers exam-date keys
     (getListExamDatesQueryKey); do not add new UI

============================================================
CHECKPOINT 3 — Tests + local validation
============================================================
Add/extend tests mirroring Slice 3 rigor where applicable:
- Unit: ownership spoof rejection; route quarantine removal
- Integration (local loopback only, two disposable Auth users):
  - A create/list/delete own rows
  - B cannot see/delete A’s rows (404 on foreign delete)
  - chronological list ordering
  - Dashboard upcomingExams scoped to caller
  - Direct Data API: authenticated SELECT/INSERT/DELETE own only;
    UPDATE denied; cross-user denied
  - Unauthenticated → 401
- Run: typecheck, api-server unit, revision-platform unit,
  api-server integration (local), relevant builds
- Confirm no hosted migrate occurred

============================================================
CHECKPOINT 4 — Pre-commit audit + implementation report
============================================================
1. Diff audit vs approved scope:
   - Only exam_dates ownership + API/Dashboard/contracts/tests/docs
   - No Phase 4, paper architecture, notification prefs, AS/A2 UI, PATCH UI
2. Write docs/cursor/reports/54-phase3-slice4-exam-date-ownership.md
   (verify next free number after this review report) covering:
   - baseline SHA / branch
   - schema + Migration 0009 contents
   - empty-table + lock + grants/RLS/sequence approach
   - API/Dashboard/frontend verification
   - test results
   - explicit: hosted Migration 0009 NOT applied
   - explicit: no merge
3. Commit logically on phase3-s4-exam-date-ownership and push
4. STOP for Owner review / hosted-cutover authorization

HOSTED SAFETY (hard stop)
- Do NOT apply Migration 0009 to hosted Supabase
- Do NOT use Dashboard SQL Editor for tracked migrations
- Do NOT modify hosted rows/RLS manually
- Do NOT deploy Production
- Do NOT merge into main or phase3-multitenancy

STOP CONDITIONS (report immediately; do not improvise)
- exam_dates unexpectedly non-empty where empty-table strategy is required
- journal / migrations 0000–0008 diverge from baseline
- Migration 0009 cannot be made transactional/safe
- grants/RLS differ materially from plan
- unapproved product decision required (e.g. membership gate, PATCH, timestamps
  beyond approved facts)
- cross-user isolation fails
- scope creep into out-of-scope Phase 4 / UI work

RETURN WHEN STOPPED
1. Branch + SHAs
2. Migration 0009 filename + local verify summary
3. API/Dashboard/codegen summary
4. Test table
5. Report path
6. Confirmation hosted untouched / no merge
```

---

## Stop

No source implementation until Owner approves this execution prompt.

Checkpoint 1 must not begin until approval is given.
