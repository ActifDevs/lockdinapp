# Phase 6 Slice 3C2B2 — Final Closeout

- **Date:** 2026-08-30
- **Pre-cutover main:** `030b3d339ed1f1ebb3ec19a9723ee2931710dfc7`
- **C2B2 merge:** `c6bae85ebe684a1754a225f68ab5af5cd697c50c`
- **Hosted project:** `hazvcdrcvsxmuwdfiucx`

## Feature deployment baseline

Canonical Production https://lockdinapp-web.vercel.app was on GitHub deployment `6162031448` / SHA `030b3d3` (READY). That commit is docs-only vs merge `c6bae85` (`107-phase6-slice3c2b2-feature-production-deploy.md` only). Production chunks still contain C2B2 error mapping, `"Other"` create block, Settings new-add guard, and no version selector.

## Hosted 0015 pre-apply

Read-only Session pooler. Journal 15 / head `0014_perpetual_nighthawk`. 0015 absent. Versions 9 / r001 9 / applicability 9. Policy 27 (Feb/Mar FALSE ×9, May/June TRUE ×9, Oct/Nov TRUE ×9). Memberships 12 / valid 12 / null 0 / mismatches 0. Pin fingerprint `2de1b5d2301968b8cb890582a67e07a3`. Tasks 14; topic_progress 39; past_paper_attempts 6; exam_dates 0. r002 NONE.

Pre-cutover smoke: health/db 200; `/api/tasks` 401; catalogue/subject/syllabus/components 200.

## Migration apply

`lib/db/migrations/0015_silent_sentinel.sql` (journal `when` `1788051000000`). File SHA-256 `39ee7c393b443608bd951c5377acf0837b50483a7fab1d0371f37da2d904c2b7`. Function-body cutover only. No table/seed/pin/graph writes.

Mechanism: `pnpm --filter @workspace/db migrate` once against the authorized hosted connection. No Dashboard SQL, `supabase db push`, or `drizzle-kit push`.

## Journal verification

16 rows. Previous `0014_perpetual_nighthawk`. Head `0015_silent_sentinel` (`created_at` `1788051000000`). Stored hash equals committed SQL SHA-256. 0016 ABSENT.

## RPC verification

`lockdin_complete_onboarding_apply` and `lockdin_replace_user_subjects_apply` call `lockdin_resolve_applicable_syllabus_version`, require `intended_exam_session_required` for new rows, and do not assign via `is_current`. Replace inserts only when `NOT EXISTS` a retained row. Legacy wrappers remain and pass NULL session into apply (fail closed on create). Resolver EXECUTE still revoked from `anon` / `authenticated`.

## Strict assignment activation

HOSTED 0015: **APPLIED**

FEATURE APP: **PRODUCTION**

STRICT ASSIGNMENT: **ENABLED**

NEW MEMBERSHIP SELECTOR: **SESSION-AWARE RESOLVER**

DEFAULT FALLBACK FOR NEW MEMBERSHIP: **NONE**

## Controlled authenticated QA

No service-role/JWT for project `hazvcdrcvsxmuwdfiucx` is present in authorized env (root hosted bak is `DATABASE_URL` only). QA used the Production assignment RPCs (`lockdin_replace_user_subjects`) with `request.jwt.claims.sub` = an existing 3-subject account. That is the same function the Production API calls. HTTP `GET /api/user-subjects` was not separately tokenized.

Chosen add: catalogue **9231**, sitting **2027 May/June** (in-window; not History Oct/Nov 2026; not Feb/Mar).

Pre-resolve: version id **1** / `9231-r001`.

## Resolver/pin proof

After one 6-arg replace (existing three + 9231):

- 9231 pin **1** = resolver result
- intended session **2027 May/June**
- `logical_revision_key` `9231-r001`
- no duplicate 9231
- existing 9700/9701/9702 pins and NULL sessions unchanged

## Retained-pin proof

1-arg replace with the four-subject set: pins and intended sessions unchanged (including the new 9231 row). Existing NULL-session rows not rewritten.

Pin graph for version 1: 24 topics (via units), 7 assessment components.

## Cleanup/restoration

1-arg replace with the original three subject ids. 9231 gone. Account codes 9700/9701/9702. Global memberships **12**. Pin fingerprint restored to `2de1b5d2301968b8cb890582a67e07a3`. Tasks/progress/attempts unchanged.

UI `"Other"` create block remains in Production chunks. No deliberate invalid DB mutation.

## Production smoke

After cutover, canonical:

| Request | Result |
| --- | --- |
| GET `/api/healthz` | 200 |
| GET `/api/healthz/db` | 200 |
| GET `/api/tasks` anonymous | 401 |
| GET `/api/subjects` | 200 |
| GET `/api/subjects/1` | 200 |
| GET `/api/subjects/1/syllabus` | 200 |
| GET `/api/subjects/1/assessment-components` | 200 |

Authenticated HTTP membership GET: not separately checked. RPC membership read/write on the controlled uid: PASS.

## Runtime

No migrate failure. Health/db ok. No secret logged. Resolver remains non-student-callable.

## Data safety

EXISTING PINS: **UNCHANGED** (fingerprint match pre-apply)

APPLICABILITY: **9/9**

POLICY ROWS: **27**

Identity / graph: **unchanged** (9 versions, hashes present, r002 NONE)

MIGRATION 0016: **NOT CREATED**

## Rollback boundary

Old pre-C2B2 app + hosted 0015 is **unsafe**. Do not roll the application back. Recovery must be a later owner-authorized **forward** migration/app fix. No down-migration.

## Automated evidence

API 139/139. Frontend 213/213. Syllabus 39/39. Harness 20/20. Disposable through 0015 PASS. Typecheck PASS. Stock API integration NOT CLAIMED.

## Final verdict

C2B2 hosted cutover **PASS**. Strict assignment **ENABLED**. Owner/QA final signoff: **DO NOT CLAIM**.

PHASE 6 remains in progress for later slices (for example 6.3D). This report does not start them.
