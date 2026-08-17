# Phase 3 Slice 4 — Exam-Date Ownership Implementation

**Date:** 2026-08-12
**Branch:** `phase3-s4-exam-date-ownership`
**Baseline:** `phase3-multitenancy` @ `d640128a6b0006b779c041b529cab38cc599df44`
**Implementation commit:** `682d06da46999e953a524be3b118a28ee60b3cc9`
**Clarification correction:** follow-up commit on same branch (see git log)
**Status:** Local implementation corrected and verified — hosted Migration 0009 **NOT** applied

---

## Scope delivered

- `exam_dates.user_id UUID NOT NULL` → `auth.users(id) ON DELETE CASCADE`
- Migration `0009_dear_mathemanic.sql` (Drizzle-generated column/index + approved security SQL)
- Restored authenticated GET / POST / DELETE for `/exam-dates`
- Dashboard `upcomingExams` caller-scoped: **`date >= today`**, chronological (`date ASC`, `id ASC`); **no upper date window**; Dashboard UI retains **`.slice(0, 4)`** presentation cap
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
**Clarification audit:** SQL content unchanged (already met sequence + lock requirements)

### Transaction semantics

Repository runner: `drizzle-kit migrate` → `drizzle-orm` PostgreSQL dialect `migrate()`:

- Pending migration statements (split on `--> statement-breakpoint`) execute inside **`session.transaction(...)`**
- `LOCK TABLE` + empty-table guard + column/FK/index/RLS/grants/sequence block therefore share one transactional boundary
- `ACCESS EXCLUSIVE` lock is held until that transaction commits, so a row cannot appear between the empty-table check and ownership conversion

### Contents (approved order)

1. `LOCK TABLE public.exam_dates IN ACCESS EXCLUSIVE MODE`
2. Empty-table guard — SQLSTATE `55000` / `exam_dates_not_empty`
3. `ADD COLUMN user_id uuid NOT NULL`
4. FK `exam_dates_user_id_auth_users_id_fk` → `auth.users(id)` ON DELETE CASCADE
5. Index `exam_dates_user_date_id_idx` (`user_id`, `date`, `id`)
6. ENABLE RLS + SELECT / INSERT / DELETE own policies (`TO authenticated`)
7. REVOKE ALL from PUBLIC / anon / authenticated; GRANT SELECT, INSERT, DELETE to authenticated
8. Sequence USAGE/SELECT via dynamic `pg_get_serial_sequence('public.exam_dates', 'id')` with `relkind = 'S'` validation; missing/invalid → SQLSTATE `55000` / `exam_dates_id_sequence_missing`
9. **NO UPDATE** policy or table privilege; sequence UPDATE not granted

**Local apply:** only loopback `127.0.0.1:54322` via `@workspace/db migrate`.
Local journal count: **10** (`0000`–`0009`). Hosted: untouched.

Local rebuild of `0000`–`0009` after clarification: **NOT REQUIRED** (Migration 0009 SQL unchanged).

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
| Dashboard `upcomingExams` | Caller-owned rows with **`date >= today`** (no +60-day cutoff) |
| Dashboard UI cap | Existing `upcomingExams.slice(0, 4)` preserved |
| Calendar | Existing `useListExamDates` — Calendar may still apply its own +60 UI filter; Slice 4 does not change Calendar semantics |
| Reminder runner | Existing list path; auth-safe under ownership |
| Auth cache | `queryClient.clear()` on identity switch / sign-out; regression covers exam-date query key |

---

## Report numbering

| Report | File | Role |
| --- | --- | --- |
| 53 | `53-phase3-slice4-ie-review-and-execution-prompt.md` | IE review + execution prompt (pre-implementation) |
| 54 | `54-phase3-slice4-exam-date-ownership.md` (this file) | Implementation + local verification |

Report 53 already existed; implementation correctly uses **54** and does not overwrite 53.

---

## Tests

Coverage includes:

- two-user list isolation
- caller-owned POST / DELETE
- foreign DELETE nondisclosing 404
- four ownership spoof aliases
- direct RLS cross-user SELECT denial
- direct RLS cross-user DELETE denial
- insert-as-other-user denial
- UPDATE denied
- chronological ordering
- Dashboard caller isolation
- future exam **beyond +60 days** included in upcoming path
- auth identity switch clears exam-date query state

Consequential journal-count updates in Slice 3 / profile integration tests: expected drizzle migration count **10**.

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

## Validation (clarification correction)

| Check | Result |
| --- | --- |
| Workspace typecheck | PASS |
| API unit | 50 PASS |
| Frontend unit | 75 PASS |
| API integration (local) | 41 PASS |
| API production build | PASS |
| Frontend production build (`PORT=3000`, `BASE_PATH=/`) | PASS |
| `git diff --check` | PASS |

---

## Stop for Owner

Ready for Owner hosted-cutover review after clarification correction validation results are recorded in the follow-up commit message / audit response.
