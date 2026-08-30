# Phase 6 — Final Closeout

## Baseline

- Repository: `https://github.com/ActifDevs/lockdinapp.git`
- Pre-merge `origin/main`: `a6019cfd26e46ab7d4c0e77b7bab599b2a61a3ca`
- Feature branch: `phase6-slice4-release-operational-hardening`
- Feature HEAD: `920e56da6ffbb973ab3a7d8920b55bb85856314e`
- Hosted project: `hazvcdrcvsxmuwdfiucx` (read-only Session pooler)
- Schema change this closeout: **NONE** (0016 not created)
- Owner/QA final signoff: **not claimed**

## Completed slices

| Slice | Outcome |
| --- | --- |
| 6.1–6.3C | Version lifecycle, pins, applicability foundation, series policy |
| Hosted applicability population | 9/9 windows; 27 policy rows |
| 6.3C2B2 / C2B2 | Strict resolver on assignment RPCs |
| 6.3D | Multi-session UX in Production |
| 6.4 | CI, migration drift, disposable HTTP/auth/RLS, future-revision tooling and synthetic r001→r002 proof |

SLICE 6.4: **CLOSED**

PHASE 6: **CLOSED**

## Reference-data architecture

Canonical subjects remain shared. Each subject has one published r001 graph. Memberships pin a syllabus version. Clients do not supply `syllabusVersionId`. Assignment uses structured intended session plus the server resolver.

## Immutable syllabus lifecycle

Published graphs stay content-addressed. Import/publish tooling refuses filename-as-identity. A successor is a new version row (`{code}-rNNN`), not an overwrite. Disposable proof showed overlapping published windows fail closed and published r001 cannot be overwritten.

## Applicability and series policy

Hosted (read-only):

- Applicability: **9/9**
- Policy rows: **27** (May/June TRUE 9, Oct/Nov TRUE 9, Feb/Mar FALSE 9)
- Production assignment-sessions: May/June and Oct/Nov only; Feb/Mar absent; History 9489 Oct/Nov 2026 excluded; History May/June 2027 present
- Internal identities not present on the public assignment-sessions payload

## Strict assignment

PRODUCTION / ENABLED. Hosted `lockdin_complete_onboarding_apply` and `lockdin_replace_user_subjects_apply` call `lockdin_resolve_applicable_syllabus_version`.

## Multi-session UX

PRODUCTION (Slice 3D). Global session, per-subject overrides, retained session display, no version selector, no repin controls.

## Disposable DB reliability

Dedicated `lockdin-db-harness` (ports 55421/55422). Empty → committed journal head. Hosted and ordinary `lockedinapp` targets fail closed.

## Integration/security

Authoritative path: disposable harness + synthetic `HTTP01`–`HTTP06` seed + the HTTP/auth/RLS Vitest files.

- Loopback guard: **11/11 PASS**
- HTTP: **45/45 PASS**, 0 skipped
- Ordinary stock stack: **SUPERSEDED** (not a valid target)

Coverage includes migrate through 0015, catalogue, May/June, Oct/Nov, Feb/Mar deny, missing session, out-of-range, resolver, override, pin/session retain, no automatic repin, safe errors, auth, RLS, atomic replace, no client version id.

## CI

`.github/workflows/pr-quality.yml`

- `quality`: typecheck, API, frontend **serialized** (`--pool=forks --maxWorkers=1`), syllabus units, harness unit, drift, codegen, `git diff --check`
- `disposable-db`: full harness including HTTP. No Production secrets. Inherited `DATABASE_URL` rejected.

PR workflow: **ENABLED**. Authoritative disposable integration: **ENFORCED**. Migration drift: **ENFORCED**. Frontend: **SERIALIZED**.

## Migration drift

`pnpm run check:migrations`: sequential journal, unique tags/hashes, every SQL file journalled. Head is the last journal entry.

Current committed/hosted head: **0015_silent_sentinel**. Count **16** (0000–0015). **0016 ABSENT**. Hosted journal `created_at` `1788051000000` hash prefix `39ee7c393b44` matches committed `0015_silent_sentinel.sql`.

## Future revision operations

`docs/reference-data/syllabus-applicability/future-syllabus-revision-runbook.md`

Parser accepts `{code}-rNNN`. Production write-set path still requires the nine r001 keys. Applicability may be written on draft or published successors. No automatic repin. No user-selected version.

DEFAULT flip on an already-published successor remains an **explicit owner admin step**. `publish` only publishes drafts. Sufficient for Phase 6; no new promotion system.

## r001→r002 proof

Disposable synthetic subject `R002X1` (not Cambridge content), inside `db-harness`:

- New assignment resolves r002
- Existing r001 pin preserved
- Automatic repin: **NO**
- Ambiguity fails closed: **PASS**

REAL r002: **NONE**. CURRENT REAL GRAPH: **r001 ONLY**.

## Production verification

Automatic Git/Vercel deployment. No manual redeploy. No Vercel env or protection changes.

| Project | GitHub deployment | Immutable URL | Source | State |
| --- | --- | --- | --- | --- |
| lockdinapp-web | `6167018417` | `https://lockdinapp-mz5ojoq77-actif-devs.vercel.app` | `95ba43fcc7a04cdeea995d3521350c4b66b84e24` | READY |
| lockdinapp | `6167014637` | `https://lockdinapp-b65tigzg0-actif-devs.vercel.app` | `95ba43fcc7a04cdeea995d3521350c4b66b84e24` | READY |

Canonical smoke: `https://lockdinapp-web.vercel.app`

| Check | Result |
| --- | --- |
| GET /api/healthz | 200 `{"status":"ok"}` |
| GET /api/healthz/db | 200 `{"status":"ok","database":"ok"}` |
| GET /api/subjects | 200 |
| GET /api/subjects/assignment-sessions | 200 |
| GET /api/subjects/2 | 200 |
| GET /api/subjects/2/syllabus | 200 |
| GET /api/subjects/2/assessment-components | 200 |
| GET /api/user-subjects (anonymous) | 401 `{"error":"Unauthorized"}` |
| Unexpected 5xx | NONE |
| Raw DB/internal error exposure | NONE |

Immutable URL healthz/db also 200.

PRODUCTION: **PASS**

## Hosted-state safety

Read-only. No hosted writes. No publish. No applicability/policy change. No repin.

| Check | Result |
| --- | --- |
| Journal rows | 16 |
| Head | `0015_silent_sentinel` |
| 0016 | ABSENT |
| Versions | 9 published r001 (`9231-r001` … `9709-r001`) |
| Drafts | 0 |
| Subjects with a second graph | 0 |
| Real r002 | NONE |
| Applicability | 9/9 |
| Policy | 27 |
| Strict assignment | ENABLED |
| Memberships | 12; null pins 0 |
| Pin mutation this run | NONE |

## Deferred boundaries

- Feb/Mar: **DEFERRED**
- Automatic repin: **NOT IMPLEMENTED**
- Published-successor DEFAULT flip: **EXPLICIT OWNER ADMIN STEP**
- Authenticated Production membership QA: not re-run this closeout (anonymous + hosted read-only + disposable HTTP/RLS used)

## Operational responsibilities

- Run future revisions on disposable first, then Preview, then Production, per the runbook.
- Do not invent 0016 for operational docs.
- Keep CI disposable and fail-closed.
- Preserve existing pins unless a separately authorized remapping exists.

## Final automated evidence

Post-merge on `95ba43fcc7a04cdeea995d3521350c4b66b84e24`:

| Gate | Result |
| --- | --- |
| API | **146/146 PASS** |
| Frontend (serial) | **227/227 PASS** |
| Syllabus | **41/41 PASS** |
| Harness unit | **21/21 PASS** |
| Disposable HTTP | **45/45 PASS**, 0 skipped |
| Loopback | **11/11 PASS** |
| Typecheck | **PASS** (4 workspace projects) |
| OpenAPI/codegen | **PASS** |
| Migration drift | **PASS** `count=16 head=0015_silent_sentinel` |
| Disposable harness (empty→head, r001→r002, HTTP, cleanup) | **PASS** |
| Production-equivalent build | **PASS** |
| git diff --check | **PASS** |

## Remaining risks

- Local parallel frontend can still hit 5s contention; CI stays serialized.
- Disposable harness needs Docker on CI.
- Owner final signoff is not claimed.

## Final verdict

PHASE 6: **CLOSED**

SLICE 6.4: **CLOSED**

PRODUCTION: **PASS**

MIGRATION HEAD: **0015_silent_sentinel**

0016: **NOT CREATED**

STRICT ASSIGNMENT: **ENABLED**

MULTI-SESSION UX: **PRODUCTION**

APPLICABILITY: **9/9**

POLICY: **27**

CURRENT REAL GRAPH: **r001 ONLY**

REAL r002: **NONE**

SYNTHETIC r001→r002 LIFECYCLE: **PROVEN**

EXISTING PINS: **PRESERVED**

AUTOMATIC REPIN: **NO**

FEB/MAR: **DEFERRED**

CI: **ENABLED**

AUTHORITATIVE INTEGRATION: **DISPOSABLE / FAIL-CLOSED**

Owner final signoff: **DO NOT CLAIM**
