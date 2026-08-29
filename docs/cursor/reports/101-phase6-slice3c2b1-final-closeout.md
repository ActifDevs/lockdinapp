# Phase 6 Slice 3C2B1 — Final Closeout

- **Date:** 2026-08-29
- **Repository:** `ActifDevs/lockdinapp`
- **Hosted project:** `hazvcdrcvsxmuwdfiucx`
- **Owner/QA final signoff of this Production pass:** **not claimed**

## Merge

- Feature: `phase6-slice3c2b1-series-policy-foundation`
- Implementation SHA: `82a7d3828bcfa6835d37883076cecfaa9917f33f`
- Feature HEAD (docs-only follow-up): `778a8bbf103374f6d7dc7e656d82a40620320334`
- Pre-merge `origin/main`: `964dab8d1867f62907b8584442967bc0cf78390c`
- Diff `82a7d38..778a8bb`: Report 100 wording only
- Hosted `0014` applied **before** merge (old Production + 0014 compatibility gate passed)
- Strategy: `git merge --no-ff` with message `merge: phase6 slice3c2b1 series policy foundation`
- **SLICE 6.3C2B1 MERGE SHA:** `8c9b7b5a9fc3951c3a8f010494d040f99ac7cb18`
- Parents: `964dab8d1867f62907b8584442967bc0cf78390c` `778a8bbf103374f6d7dc7e656d82a40620320334`
- `git push origin main` (normal only)

## Hosted 0014 pre-apply

Read-only. Journal **14** rows; head `0013_useful_husk` (`created_at` `1788038002411`, hash `2e9c58cc6f55c32657506470a5389efc72df56cf28fde04bb6d76a5a0d53dcde`). `syllabus_version_exam_series` ABSENT. Versions 9; `logical_revision_key` 9/9 (`9231-r001` … `9709-r001`); `content_sha256` 9/9; applicability 0/9; drafts 0; second graph NONE. Memberships 12; valid pins 12; null pins 0; mismatches 0. Graph 136 / 520 / 3198 / 50 / 4817. Tasks 14; topic_progress 39; past_paper_attempts 6. Assignment apply RPCs still `is_current = true`; no resolver call.

## Migration apply

**Mechanism:** `pnpm --filter @workspace/db migrate` against the authorized hosted Session pooler.

- Exact file: `lib/db/migrations/0014_perpetual_nighthawk.sql`
- Dashboard SQL Editor: **NOT USED**
- `supabase db push`: **NOT USED**
- `drizzle-kit push`: **NOT USED**
- No policy/applicability inserts

## Journal verification

| Field | Value |
| --- | --- |
| Journal rows | 15 |
| Previous | `0013_useful_husk` (`1788038002411` / `2e9c58cc…d53dcde`) |
| New head | `0014_perpetual_nighthawk` |
| `created_at` / journal `when` | `1788044465654` |
| `0014` hash | `21da923ba40b543d736d5722c56a3868a493127a795c14b58d1fb8429428df52` = SHA-256 of committed SQL |
| Extra / skipped | none |

## Series-policy schema

Table PRESENT. PK `(syllabus_version_id, series)`. `series` `exam_sitting_series` NOT NULL. `product_auto_assign` boolean NOT NULL DEFAULT false. FK to `syllabus_versions.id` ON DELETE CASCADE. RLS ENABLED. PUBLIC / anon / authenticated table privileges: none. Production rows: **0**. Official geography encoded: NO.

## Resolver verification

`lockdin_resolve_applicable_syllabus_version` requires published + complete range contain + matching policy row with `product_auto_assign = true` + exactly one. Zero / many fail closed. No `is_current` fallback. EXECUTE revoked from PUBLIC, anon, authenticated.

## Old-app compatibility

Canonical `https://lockdinapp-web.vercel.app` while still on pre-merge Production code + hosted 0014:

| Request | Status |
| --- | --- |
| GET `/api/healthz` | 200 |
| GET `/api/healthz/db` | 200 |
| GET `/api/tasks` anonymous | 401 |
| GET `/api/subjects` | 200 |
| GET `/api/subjects/1` | 200 |
| GET `/api/subjects/1/syllabus` | 200 |
| GET `/api/subjects/1/assessment-components` | 200 |

No 5xx. AUTHENTICATED OLD-APP READ: **NOT CHECKED**

## Production deployment

Automatic Git integration. No manual redeploy.

| Project | GitHub deployment id | Vercel inspect | Source SHA | Environment | State |
| --- | --- | --- | --- | --- | --- |
| lockdinapp-web | `6161295535` | `https://vercel.com/actif-devs/lockdinapp-web/3mTkbrAiTtuRiykbYeYUTvEYiAsw` | `8c9b7b5` | Production | READY / success |
| lockdinapp (sibling) | `6161297128` | `https://vercel.com/actif-devs/lockdinapp/Mq9uSkCs1tFVMGnqcmx75K4N7JaA` | `8c9b7b5` | Production | READY / success |

GitHub environment_url for lockdinapp-web: `https://lockdinapp-38bbhf1xf-actif-devs.vercel.app`. Canonical smoke used `https://lockdinapp-web.vercel.app`.

## Production smoke

Same catalogue/health paths as old-app gate after deploy: health 200, DB 200, anonymous tasks 401, subjects/syllabus/components 200. No 5xx. Authenticated read: **NOT CHECKED**. No write QA.

## Automated evidence

API 137/137 (base and feature previously; post-merge 137/137). Frontend 212. Syllabus 36. Harness target-safety 20. Typecheck PASS. Disposable pre-0000 → 0014 PASS at implementation SHA (not re-run for docs-only 778a8bb). Stock API integration NOT CLAIMED.

## API regression reconciliation

Isolated worktree base `964dab8` and feature `82a7d38` both 137/137. C2B1 did not touch `artifacts/api-server`. Earlier one-off 405 on anonymous DELETE `/exam-dates/1` did not reproduce.

## Data safety

Policy rows 0. Applicability 0/9. Pin fingerprint after 0014 unchanged vs pre-apply (`d84e57ea65731e591f135f1661883e59` over `user_id, subject_id`). Memberships 12 / valid 12 / null 0. Graph and activity counts unchanged. Second graph NONE.

## Assignment boundary

Onboarding and Settings apply RPCs still select `is_current`. Structured session remains metadata only. Strict assignment NOT ENABLED. 0014 alone cannot change live assignment; Production policy row count is zero.

## C2B2 prerequisites

Unchanged from Report 100: 0014 healthy (now true); owner-approved applicability on all selectable versions; consistent product-auto-assign series rows; intended-session capture adequate; resolver fixtures PASS; no ambiguous versions; Production data audit; explicit owner C2B2 authorization.

HOSTED 0014: **APPLIED**

SERIES POLICY DATA: **NOT POPULATED**

APPLICABILITY: **NOT POPULATED**

STRICT ASSIGNMENT: **NOT ENABLED**

NEW MEMBERSHIP SELECTOR: **LEGACY DEFAULT**

SECOND GRAPH: **NONE**

MIGRATION 0015: **NOT CREATED**

C2B2: **NOT STARTED**

## Final verdict

SLICE 6.3C2B1: **CLOSED** (implementation + hosted 0014 + merge + Production deploy). Phase 6 remains in progress. Next is applicability data resolution / C2B2 readiness, not automatic cutover.
