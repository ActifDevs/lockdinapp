# Phase 3 Slice 4 — Exam-Date Ownership Implementation

**Date:** 2026-08-12  
**Branch:** `phase3-s4-exam-date-ownership`  
**Baseline:** `phase3-multitenancy` @ `d640128a6b0006b779c041b529cab38cc599df44`  
**Status:** Implementation complete locally — hosted Migration 0009 **NOT** applied

---

## Scope delivered

- `exam_dates.user_id UUID NOT NULL` → `auth.users(id) ON DELETE CASCADE`
- Migration `0009_dear_mathemanic.sql` (Drizzle-generated column/index + approved security SQL)
- Restored authenticated GET / POST / DELETE for `/exam-dates`
- Dashboard `upcomingExams` caller-scoped (today through +60 days)
- OpenAPI + Orval codegen (`api-zod`, `api-client-react`)
- Unit + local two-user integration tests

## Out of scope (unchanged)

- PATCH / UPDATE privilege
- New exam-management UI
- Hosted Migration 0009
- Merge into `phase3-multitenancy` / `main`
- Phase 4 / paper architecture / notification prefs / AS-A2 UI

---

## Migration 0009

**File:** `lib/db/migrations/0009_dear_mathemanic.sql`  
**Journal tag:** `0009_dear_mathemanic` (`when`: `1786547274449`)  
**Previous migrations modified:** NO

Contents (approved order):

1. `LOCK TABLE public.exam_dates IN ACCESS EXCLUSIVE MODE`
2. Empty-table guard — SQLSTATE `55000` / `exam_dates_not_empty`
3. `ADD COLUMN user_id uuid NOT NULL`
4. FK `exam_dates_user_id_auth_users_id_fk` → `auth.users(id)` ON DELETE CASCADE
5. Index `exam_dates_user_date_id_idx` (`user_id`, `date`, `id`)
6. ENABLE RLS + SELECT / INSERT / DELETE own policies (`TO authenticated`)
7. REVOKE ALL from PUBLIC / anon / authenticated; GRANT SELECT, INSERT, DELETE to authenticated
8. Sequence USAGE/SELECT via `pg_get_serial_sequence('public.exam_dates', 'id')`
9. **NO UPDATE** policy or table privilege

**Local apply:** only loopback `127.0.0.1:54322` via `@workspace/db migrate`.  
Local journal count after apply: **10**. Hosted: untouched.

---

## API

| Endpoint | Result |
| --- | --- |
| `GET /exam-dates` | Authenticated, caller-scoped, chronological (`date ASC`, `id ASC`), subject-enriched |
| `POST /exam-dates` | Auth identity owns row; spoof aliases rejected; subject validated |
| `DELETE /exam-dates/:id` | Owner match; foreign/missing → nondisclosing 404 |
| PATCH | Not implemented |

Helper: `artifacts/api-server/src/lib/exam-dates.ts` (list / enrich / upcoming filter).

---

## Dashboard / frontend

| Surface | Result |
| --- | --- |
| Dashboard `upcomingExams` | Caller-owned rows with `date` in `[today, today+60]` |
| Calendar | Existing `useListExamDates` — no new UI |
| Reminder runner | Existing list path; auth-safe under ownership |
| Auth cache | `queryClient.clear()` on auth lifecycle already covers exam-date keys |

---

## Tests

| Suite | Result |
| --- | --- |
| `@workspace/api-server` unit | PASS (50) |
| `@workspace/api-server` integration (local) | PASS (41) |
| `@workspace/revision-platform` unit | PASS (74) |
| Typecheck `@workspace/api-server` | PASS |

Integration coverage includes two-user isolation, spoof rejection, chronological list, Dashboard scoping, RLS, UPDATE denial, nondisclosing DELETE 404, and Migration 0009 journal/security assertions.

Consequential journal-count updates in Slice 3 / profile integration tests: expected drizzle migration count **9 → 10**.

---

## Hosted boundary

| Action | Status |
| --- | --- |
| Hosted Migration 0009 | **NOT applied** |
| Dashboard SQL Editor for tracked migrations | **Not used** |
| Hosted row / RLS manual changes | **None** |
| Production deploy | **None** |
| Merge to `main` / `phase3-multitenancy` | **None** |

---

## Stop for Owner

Ready for Owner review, then separate hosted-cutover authorization.
