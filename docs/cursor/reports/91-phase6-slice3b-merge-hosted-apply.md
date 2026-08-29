# Phase 6 Slice 3B — Merge and Hosted 0012 Apply

- **Date:** 2026-08-29
- **Repository:** `ActifDevs/lockdinapp`
- **Authorized hosted project:** `hazvcdrcvsxmuwdfiucx` (Session pooler host `aws-0-eu-west-1.pooler.supabase.com:5432`)

## Merge

- Preflight `origin/main`: `5c8db5545cd4169741f17b99b6cbc1b55bfc1ef8` (unchanged; merge proceeded)
- Feature branch: `phase6-slice3b-immutable-importer`
- Feature HEAD (pre-merge): `7dc8d69e3d1f0216a6971b6ce7cda9b047ffbe2a` (`HEAD` == `origin/phase6-slice3b-immutable-importer`)
- Working tree at merge: CLEAN
- Strategy: `git merge --no-ff` with message `merge: phase6 slice3b immutable importer`
- **SLICE 6.3B MERGE SHA:** `f1926cdee1ec218f1b4aa2ea22672b528f2d1c4b`
- Parents: `5c8db5545cd4169741f17b99b6cbc1b55bfc1ef8` `7dc8d69e3d1f0216a6971b6ce7cda9b047ffbe2a`
- `git push origin main` (normal push only; no force)
- After merge push: `HEAD` == `origin/main` == merge SHA; working tree CLEAN

## Hosted pre-apply

Read-only against the authorized administrative Session-pooler path (not Dashboard SQL Editor).

| Gate | Result |
| --- | --- |
| Journal row count | 12 |
| Current head | `0011_open_sunfire` |
| `0011` `created_at` / hash | `1788003568152` / `eb7908939c34d47fef47ba48371a3c9dbca9dd3161c4d29271142cb8fbf8e681` = SHA-256 of committed `0011_open_sunfire.sql` |
| Unexpected migration after `0011` | none |
| `syllabus_versions_subject_source_unique` | PRESENT (pre-0012) |
| `syllabus_versions_content_sha256_per_subject` | PRESENT UNIQUE (pre-0012) |
| `syllabus_versions_logical_revision_per_subject` | PRESENT UNIQUE |
| Lifecycle / applicability / DEFAULT constraints | PRESENT |

Pre-apply counts: syllabus_versions 9; user_subjects 12; syllabus_units 136; syllabus_topics 520; `logical_revision_key` set 0; `content_sha256` set 0.

## Migration 0012

**Mechanism:** `pnpm --filter @workspace/db migrate` (`drizzle-kit migrate --config ./drizzle.config.ts`) with `DATABASE_URL` / `DIRECT_DATABASE_URL` scoped to the authorized hosted Lockdin Session pooler.

- Exact file: `lib/db/migrations/0012_ordinary_penance.sql`
- Dashboard SQL Editor: **NOT USED**
- `supabase db push`: **NOT USED**
- `drizzle-kit push`: **NOT USED**
- No journal stamping

Constraint/index correction only. No table-row rewrite, identity backfill, pin mutation, or graph mutation.

## Journal verification

| Field | Value |
| --- | --- |
| Journal rows | 13 |
| Previous head | `0011_open_sunfire` (`1788003568152` / `eb790893…c9dd3161c4d29271142cb8fbf8e681`) |
| New head | `0012_ordinary_penance` |
| `0012` `created_at` | `1788010369454` (matches committed journal `when`) |
| `0012` hash | `a86e2fa7f2e053d4d75632f5a5f044a8af5fb2a18b94243d7aeab17008b62eea` = SHA-256 of committed `lib/db/migrations/0012_ordinary_penance.sql` |
| Extra / skipped / stamped rows | none |

## Index verification

| Object | Result |
| --- | --- |
| `syllabus_versions_subject_source_unique` | ABSENT |
| `syllabus_versions_subject_source_idx` | PRESENT / non-unique |
| `syllabus_versions_content_sha256_per_subject` | ABSENT |
| `syllabus_versions_content_sha256_idx` | PRESENT / non-unique |
| `syllabus_versions_logical_revision_per_subject` | PRESENT / UNIQUE |
| `syllabus_versions_one_default_per_subject` | PRESENT / UNIQUE (0011) |
| `syllabus_versions_default_must_be_published` | PRESENT CHECK |
| `syllabus_versions_applicable_windows_no_overlap` | PRESENT EXCLUDE |

## Data safety

Post-apply counts identical to pre-apply: versions 9, pins 12, units 136, topics 520, keyed 0, hashed 0.

| Check | Result |
| --- | --- |
| User pins changed | NONE |
| `user_subject` rows deleted | NONE |
| Syllabus versions deleted | NONE |
| Reference graph rows deleted | NONE |
| `logical_revision_key` backfill | NONE |
| `content_sha256` backfill | NONE |
| `source_file` rewrites | NONE |

HOSTED LEGACY ADOPTION: **NOT PERFORMED**

HOSTED SECOND GRAPH: **NONE**

REAL SECOND PRODUCTION VERSION: **NOT AUTHORIZED**

## Production deployment

Automatic Vercel Production (no manual redeploy).

**lockdinapp-web** (canonical `https://lockdinapp-web.vercel.app`):

- branch: `main`
- target: Production
- source: `f1926cdee1ec218f1b4aa2ea22672b528f2d1c4b`
- GitHub deployment: `6156859889`
- Vercel dashboard deployment id: `rnbv2oisbmJYGcV4ngrNzwpPo8oP`
- immutable URL: `https://lockdinapp-1htsrh8v6-actif-devs.vercel.app`
- GitHub status: success / READY (`Vercel – lockdinapp-web`)

**lockdinapp** sibling (same source SHA):

- GitHub deployment: `6156855693`
- Vercel dashboard deployment id: `62F7SVT1JmtMAnzfEYtmQ5iFELfJ`
- immutable URL: `https://lockdinapp-3qvacm3jh-actif-devs.vercel.app`
- status: success / READY

Production `buildCommand` remains `pnpm run build:vercel` (api-server build + Vite). It does not invoke `syllabus:adopt`, `syllabus:import`, `syllabus:publish`, db-harness, pre-0000 bootstrap, or migration reconstruction. Hosted `0012` was a separate administrative `drizzle-kit migrate`.

## Production smoke

Against `https://lockdinapp-web.vercel.app` (read-only, unauthenticated):

| Request | Result |
| --- | --- |
| `GET /api/healthz` | 200 `{"status":"ok"}` `x-request-id: 69965d68-b182-45e9-971c-8c233b47749e` |
| `GET /api/healthz/db` | 200 `{"status":"ok","database":"ok"}` `x-request-id: f694c561-0b11-4d16-a448-35e6da32808b` |
| `GET /api/tasks` | 401 `{"error":"Unauthorized"}` `x-request-id: d9876e6e-6d00-464e-b090-d7ad3c7344ac` |

Immutable URL `GET /api/healthz` also 200. No authentication, no user-data writes. No fatal build failure, runtime crash, DB connectivity blocker, recurring 5xx, or unexpected import/publication execution observed on this smoke.

## Rollout boundary

After `0012`, **no** hosted `syllabus:adopt`, **no** hosted `syllabus:import` for a new revision, **no** `syllabus:publish` creating a second published version.

6.3C1 pin/version-scoped read paths are still not implemented. Current application may mix multiple graphs by `subject_id`. HOSTED SECOND GRAPH must remain **ZERO**.

6.3C1: **NOT STARTED**

## Known test limitations

Stock `pnpm --filter @workspace/api-server test:integration` remains bound to the ordinary root `lockedinapp` Supabase workdir.

**Do not claim 42/42 PASS.**

Post-merge non-destructive gates: harness target-safety **20/20**; syllabus offline **36/36**; API unit **119/119**; scripts typecheck **PASS**. DB integration **29/29** is pre-merge clearance evidence (not destructively re-run on the ordinary local DB). API typecheck remains **PRE-EXISTING TS2305** (`createDatabasePoolConfig` / `validateDatabaseUrl` from `@workspace/db`); not fixed in this slice.

## Final verdict

SLICE 6.3B: **CLOSED** (merged, hosted `0012` applied via tracked Drizzle migrate, Production READY + smoke PASS).

PHASE 6: **IN PROGRESS**. Next is 6.3C1 design/implementation planning **only after owner review**.
