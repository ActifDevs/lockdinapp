# Phase 6 Slice 3C2A — Final Closeout

- **Date:** 2026-08-29
- **Repository:** `ActifDevs/lockdinapp`
- **Owner/QA final signoff of this Production pass:** **not claimed**

## Merge

- Feature branch: `phase6-slice3c2a-session-foundation`
- Feature HEAD: `2fb9e52795703f4c94a109ed5919d1a988fb96ac`
- Pre-merge `origin/main`: `9cf45c1fded885be7cddb568bc1c8f1b075f27c1` (unchanged)
- Hosted `0013` applied **before** merge (old Production + 0013 compatibility gate passed)
- Strategy: `git merge --no-ff` with message `merge: phase6 slice3c2a session foundation`
- **SLICE 6.3C2A MERGE SHA:** `4c0cbeb67e4b9d9d466dadc65063dc7146856a08`
- Parents: `9cf45c1fded885be7cddb568bc1c8f1b075f27c1` `2fb9e52795703f4c94a109ed5919d1a988fb96ac`
- `git push origin main` (normal only)
- After push: `HEAD` == `origin/main` == merge SHA; working tree CLEAN before this docs commit

## Hosted 0013 pre-apply

Read-only against authorized hosted project `hazvcdrcvsxmuwdfiucx` (Session pooler `aws-0-eu-west-1.pooler.supabase.com:5432`). No credentials in this report.

| Gate | Result |
| --- | --- |
| Journal rows | 13 |
| Head | `0012_ordinary_penance` (`created_at` `1788010369454`) |
| `0012` hash | `a86e2fa7f2e053d4d75632f5a5f044a8af5fb2a18b94243d7aeab17008b62eea` = SHA-256 of committed `0012_ordinary_penance.sql` |
| `0013` | ABSENT |
| `user_subjects.intended_exam_year` / `intended_exam_series` | ABSENT |
| `user_subjects` | 12 rows, 0 null pins |
| `syllabus_versions` | 9; drafts 0; max 1 per subject |
| `logical_revision_key` set | 0 |
| Applicability populated | 0 |

HOSTED LEGACY ADOPTION: **NOT PERFORMED**

HOSTED SECOND GRAPH: **NONE**

## Migration apply

**Mechanism:** `pnpm --filter @workspace/db migrate` (`drizzle-kit migrate --config ./drizzle.config.ts`) with `DATABASE_URL` / `DIRECT_DATABASE_URL` scoped to the authorized hosted Lockdin Session pooler.

- Exact file: `lib/db/migrations/0013_useful_husk.sql`
- Dashboard SQL Editor: **NOT USED**
- `supabase db push`: **NOT USED**
- `drizzle-kit push`: **NOT USED**
- No journal stamping
- No pin mutation, backfill, adopt, import, or publish

## Journal verification

| Field | Value |
| --- | --- |
| Journal rows | 14 |
| Previous head | `0012_ordinary_penance` (`1788010369454` / `a86e2fa7…b62eea`) |
| New head | `0013_useful_husk` |
| `0013` `created_at` | `1788038002411` (committed journal `when`) |
| `0013` hash | `2e9c58cc6f55c32657506470a5389efc72df56cf28fde04bb6d76a5a0d53dcde` = SHA-256 of committed `0013_useful_husk.sql` |
| Extra / skipped rows | none |

## Schema verification

| Object | Result |
| --- | --- |
| `intended_exam_year` | integer NULL |
| `intended_exam_series` | `exam_sitting_series` NULL |
| `user_subjects_intended_session_complete` | PRESENT |
| `user_subjects_intended_exam_year_four_digit` | PRESENT |
| Existing membership session pairs | 12 / 12 NULL / NULL |
| Membership count | 12 unchanged |
| Null pins | 0 |
| Versions / drafts / keyed / applicability | 9 / 0 / 0 / 0 unchanged |

Pins changed: **NONE**

## RPC compatibility

| Signature | Result |
| --- | --- |
| `lockdin_complete_onboarding(text,text,text,text,integer[])` | PRESENT; `authenticated` EXECUTE |
| `lockdin_replace_user_subjects(integer[])` | PRESENT; `authenticated` EXECUTE |
| Structured onboarding overload | PRESENT; `authenticated` EXECUTE |
| Structured replace overload | PRESENT; `authenticated` EXECUTE |
| `lockdin_resolve_applicable_syllabus_version` | PRESENT; published-only; no `is_current` fallback; EXECUTE revoked from PUBLIC / anon / authenticated |
| Internal apply/session helpers | not granted to students |

## Old-app compatibility after migration

Against still-current canonical Production **before** C2A merge (`https://lockdinapp-web.vercel.app`):

| Request | Result |
| --- | --- |
| `GET /api/healthz` | 200 `{"status":"ok"}` `x-request-id: fb1a4fc6-f006-46e5-b7ca-79904457ae29` |
| `GET /api/healthz/db` | 200 `{"status":"ok","database":"ok"}` `x-request-id: bd4b0825-3216-46db-9a86-a2dde9140974` |
| `GET /api/tasks` | 401 `{"error":"Unauthorized"}` `x-request-id: e878d729-8128-4daf-bb44-fdfbed2bdb0c` |
| `GET /api/subjects` | 200, 9 subjects |
| `GET /api/subjects/1` | 200 |
| `GET /api/subjects/1/syllabus` | 200, 4 units |
| `GET /api/subjects/1/assessment-components` | 200 |

No 5xx. No undefined-column / RPC-resolution failures observed on these routes.

AUTHENTICATED OLD-APP COMPATIBILITY: **NOT CHECKED**

## Production deployment

Automatic Vercel Production (no manual redeploy). GitHub Vercel statuses used.

**lockdinapp-web** (canonical `https://lockdinapp-web.vercel.app`):

- branch: `main`
- target: Production
- source: `4c0cbeb67e4b9d9d466dadc65063dc7146856a08`
- GitHub deployment: `6160346041`
- Vercel dashboard id: `254wWuBfQ219GnNbDMTRJhCCgwdH`
- immutable URL: `https://lockdinapp-1cq0kjlrf-actif-devs.vercel.app`
- state: READY / success

**lockdinapp** sibling (same source SHA):

- GitHub deployment: `6160344556`
- Vercel dashboard id: `7FijVniV9zo3GDG7bmi4MRaPhiXT`
- immutable URL: `https://lockdinapp-da219jho2-actif-devs.vercel.app`
- state: READY / success

## Production smoke

Against `https://lockdinapp-web.vercel.app` after C2A deploy (read-only, unauthenticated):

| Request | Result |
| --- | --- |
| `GET /api/healthz` | 200 `{"status":"ok"}` `x-request-id: 34cb08b5-0bbf-4712-a5d9-e42a7a64a8f3` |
| `GET /api/healthz/db` | 200 `{"status":"ok","database":"ok"}` `x-request-id: 8c679b9d-315c-4a41-a977-7e4d84782bf3` |
| `GET /api/tasks` | 401 `{"error":"Unauthorized"}` `x-request-id: 5630a396-b633-4885-a43d-5caad806df90` |
| `GET /api/subjects` | 200, 9 subjects |
| `GET /api/subjects/1` | 200 |
| `GET /api/subjects/1/syllabus` | 200 |
| `GET /api/subjects/1/assessment-components` | 200 |

No 5xx. No raw DB details. No RPC ambiguity or undefined-column errors on these routes.

## Authenticated read status

AUTHENTICATED PRODUCTION READ: **NOT CHECKED** (no already-authorized session; no credentials requested). Do not rewrite as PASS.

Structured write QA in Production: **NOT PERFORMED**.

## Automated evidence

Post-merge non-destructive:

- API unit **137/137**
- Frontend **212/212**
- Syllabus offline **36/36**
- Harness target-safety **20/20**
- Scripts / frontend / API typecheck **PASS**
- `typecheck:libs` **PASS**

Disposable reconstruction + resolver/DEFAULT proof: **PASS** as merge-clearance evidence (not re-run destructively after merge).

Stock API integration **42/42: NOT CLAIMED**.

## Security

No pin mutation. No user-data rewrite. No secrets in commits. Resolver not student-callable. Client cannot choose `syllabus_version_id`. Authenticated Production surfaces not re-checked this closeout.

## Rollout boundary

HOSTED 0013: **APPLIED**

STRICT ASSIGNMENT: **NOT ENABLED**

NEW MEMBERSHIP ASSIGNMENT: **LEGACY DEFAULT**

HOSTED LEGACY ADOPTION: **NOT PERFORMED**

APPLICABILITY DATA: **NOT POPULATED**

HOSTED SECOND GRAPH: **NONE**

C2B: **NOT STARTED**

6.3D: **NOT STARTED**

## Known limitations

- Authenticated Production membership echo (`intendedExamSession: null`) was not observed live.
- Feb/Mar picker and per-subject override UI remain 6.3D.
- Strict assignment must not be enabled until verified Production applicability data exists and owner authorizes a tracked C2B cutover.

## Final verdict

SLICE 6.3C2A: **CLOSED** (implementation merged, hosted 0013 applied, Production READY; owner/QA stamp not claimed).

PHASE 6: **IN PROGRESS**

NEXT: authoritative applicability data workstream (not C2B).
