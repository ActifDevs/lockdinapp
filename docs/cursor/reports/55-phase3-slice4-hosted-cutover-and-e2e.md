# Phase 3 Slice 4 — Hosted Cutover & E2E

**Date:** 2026-08-12
**Branch:** `phase3-s4-exam-date-ownership`
**Pre-cutover HEAD:** `dd2e8a782ee3117b2f01d0bda1cd2eaffcbaf27f`
**Implementation:** `682d06da46999e953a524be3b118a28ee60b3cc9`
**Base:** `d640128a6b0006b779c041b529cab38cc599df44`
**Hosted Supabase project:** `hazvcdrcvsxmuwdfiucx`

---

## Migration Integrity

Filename: `lib/db/migrations/0009_dear_mathemanic.sql`

SHA-256: `00a2d7ce2c6abdec9c3d8aab96fe423fe30dbf431d7bcdd994c511cf4380c5d3` (PASS)

Tracked mechanism: `pnpm --filter @workspace/db migrate`, with `DATABASE_URL` and `DIRECT_DATABASE_URL` scoped for the command to the proved hosted Lockdin pooler target only

Dashboard SQL Editor used: NO

Repository journal metadata: idx `9`, timestamp `1786547274449`, tag `0009_dear_mathemanic`

Rejected unsafe sources for this cutover:

- shell/local `.env.local` loopback `127.0.0.1:54322`
- `.vercel/.env.production.local` project `pviuoxdvakouigbfkxha`

Authorized connection source: the same non-loopback hosted pooler credential previously proved in the Slice 4 hosted precheck (`postgres.hazvcdrcvsxmuwdfiucx` @ `aws-0-eu-west-1.pooler.supabase.com`).

---

## Hosted Pre-Cutover (re-checked immediately before apply)

| Gate | Result |
| --- | --- |
| Journal | exactly 0000–0008; latest `1786394449630`; 0009 absent |
| `exam_dates` rows | `0` |
| `user_id` | ABSENT |
| Columns | `id, subject_id, paper_code, date, notes` |
| RLS | ENABLED; ownership policies NONE |
| Sequence | `pg_get_serial_sequence` → `public.exam_dates_id_seq`, `relkind=S` |

Baseline counts before migration:

| Table | Count |
| --- | --- |
| exam_dates | 0 |
| subjects | 9 |
| past_paper_attempts | 3 |
| tasks | 6 |
| user_subjects | 6 |
| topic_progress | 36 |
| profiles | 2 |
| auth.users | 2 |

---

## Migration Result

Result: PASS — tracked Drizzle migration completed successfully

Journal after: exactly 0000–0009 (10 entries)

Latest hash: `00a2d7ce2c6abdec9c3d8aab96fe423fe30dbf431d7bcdd994c511cf4380c5d3` (matches repository)

Latest timestamp: `1786547274449`

Duplicate 0009: NO

Schema: PASS — `user_id UUID NOT NULL`; FK `exam_dates_user_id_auth_users_id_fk` → `auth.users(id)` ON DELETE CASCADE; index `exam_dates_user_date_id_idx` on `(user_id, date, id)`; no unintended timestamps/uniqueness/membership constraints

RLS: PASS — enabled with authenticated owner-only SELECT / INSERT WITH CHECK / DELETE; no UPDATE policy; no anon owner policies

Table grants: PASS — `authenticated` SELECT, INSERT, DELETE only; UPDATE absent; `anon` has no table privileges

Sequence privileges: PASS — dynamically resolved sequence grants `authenticated` USAGE + SELECT only; UPDATE absent; `anon` has none

Post-migration `exam_dates` rows before E2E: `0`

Unrelated baseline tables unchanged by migration: PASS

---

## Two-User Hosted E2E

Mechanism: Express API under test loaded in-process (Vitest one-off harness, not committed) with hosted `DATABASE_URL` + hosted publishable/service credentials obtained via Supabase CLI for project `hazvcdrcvsxmuwdfiucx`. Product/Data-API assertions used ordinary user JWTs + publishable key. Service role used only for disposable Auth create/delete.

Exactly two disposable Auth users were provisioned and later deleted. Persistent users were not used as destructive subjects.

| Check | Result |
| --- | --- |
| User A create | PASS (HTTP 201, enriched, no ownership field) |
| User B create | PASS |
| List isolation + chronological order | PASS |
| Spoof aliases (`userId`/`user_id`/`ownerId`/`owner_id`) | PASS (all HTTP 400) |
| Invalid shared subject | PASS (HTTP 400) |
| Direct RLS cross-user SELECT | PASS |
| Direct RLS insert-as-other-user | PASS (denied) |
| Direct RLS foreign DELETE | PASS (A row retained) |
| API foreign DELETE | PASS (nondisclosing 404) |
| UPDATE denied | PASS |
| Dashboard caller isolation | PASS |
| Beyond-+60-day exam eligible in Dashboard data | PASS |
| Own DELETE | PASS |

Cleanup:

| Check | Result |
| --- | --- |
| Disposable Auth users removed | PASS |
| Disposable exam rows removed | PASS |
| Final `exam_dates` | `0` |
| Persistent baseline restored | PASS |

Final counts after cleanup:

| Table | Count |
| --- | --- |
| exam_dates | 0 |
| subjects | 9 |
| past_paper_attempts | 3 |
| tasks | 6 |
| user_subjects | 6 |
| topic_progress | 36 |
| profiles | 2 |
| auth.users | 2 |

---

## Remote Safety

| Action | Status |
| --- | --- |
| Hosted Supabase | YES — Migration 0009 only (+ disposable E2E rows cleaned) |
| Production deploy | NO |
| Vercel project/config changed | NO |
| Merge to `main` | NO |
| Merge to `phase3-multitenancy` | NO |
| Phase 4 / exam UI / PATCH | NO |

---

## Report Numbering

| Report | Role |
| --- | --- |
| 53 | IE review / execution prompt |
| 54 | Implementation + local verification |
| 55 | This hosted cutover + E2E report |

---

## Next Gate

Browser QA on a Preview of `phase3-s4-exam-date-ownership`.

Do not merge and do not deploy Production until browser QA clears.
