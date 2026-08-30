# Phase 6 Slice 3C2B2 — Feature Production Deployment

- **Date:** 2026-08-30
- **Feature HEAD merged:** `6cbee457d25539838bc9c1806561274642cc6024`
- **Implementation SHA:** `b87b14f26c5a330894e9fc81c3d7f2ce8703b1e8`
- **Merge SHA:** `c6bae85ebe684a1754a225f68ab5af5cd697c50c`
- **Hosted 0015:** **NOT APPLIED**

## Merge

Preflight: feature HEAD `6cbee45` == `origin/phase6-slice3c2b2-strict-assignment`; `origin/main` `08c777f`; working tree clean.

Post-implementation delta `b87b14f..6cbee45`: Report 106 only. No runtime change after the tested implementation SHA.

`git merge --no-ff phase6-slice3c2b2-strict-assignment` → `c6bae85` (parents `08c777f` + `6cbee45`).

Pushed `origin/main` after confirming remote had not moved. HEAD == origin/main == merge SHA before this checkpoint report.

## Production deployment

Automatic Git deploy of merge SHA `c6bae85`.

| Project | GitHub deployment | Vercel | Immutable URL | State |
| --- | --- | --- | --- | --- |
| lockdinapp-web | 6162015248 | `CbFMXRe17SgpapKK1NMdMhN1EqYZ` | https://lockdinapp-mx2vhrrpl-actif-devs.vercel.app | READY |
| lockdinapp | 6162016704 | `GiKTn6JRfRevY9J4ajupaaM4vNaT` | https://lockdinapp-pksvgjk11-actif-devs.vercel.app | READY |

Canonical: https://lockdinapp-web.vercel.app

No manual redeploy.

## Hosted DB state

Read-only Session pooler (`hazvcdrcvsxmuwdfiucx`). No migrate, no writes.

| Check | Result |
| --- | --- |
| Journal rows | 15 |
| Head | `0014_perpetual_nighthawk` (`1788044465654` / `21da923b…9428df52`) |
| 0015 | **ABSENT** |
| r001 / applicability | 9 / 9 |
| Policy rows | 27 (Feb/Mar FALSE ×9, May/June TRUE ×9, Oct/Nov TRUE ×9) |
| Memberships / valid pins | 12 / 12 |
| r002 / second graph | NONE |
| `lockdin_complete_onboarding_apply` | still `is_current`; does **not** call resolver |

## Compatibility state

**FEATURE APP + 0014**

FEATURE APP: PRODUCTION

HOSTED 0015: NOT APPLIED

HOSTED HEAD: `0014_perpetual_nighthawk`

STRICT ASSIGNMENT: NOT ENABLED

NEW MEMBERSHIP SELECTOR: LEGACY DEFAULT

APPLICABILITY: 9/9

POLICY ROWS: 27

SECOND GRAPH: NONE

Known sittings still send structured year/series. Hosted RPCs still pin DEFAULT. `"Other"` create is blocked in the deployed UI.

## Production smoke

Against https://lockdinapp-web.vercel.app

| Request | Result |
| --- | --- |
| GET `/api/healthz` | 200 `{"status":"ok"}` |
| GET `/api/healthz/db` | 200 `{"status":"ok","database":"ok"}` |
| GET `/api/tasks` anonymous | 401 `Unauthorized` |
| GET `/api/subjects` | 200 |
| GET `/api/subjects/1` | 200 |
| GET `/api/subjects/1/syllabus` | 200 |
| GET `/api/subjects/1/assessment-components` | 200 |

No 5xx. No raw Postgres in those bodies.

## Authenticated read status

AUTHENTICATED READ: **NOT CHECKED** (no authorized session; credentials not requested). No membership create/delete.

## Frontend guard verification

Production chunks match feature build:

- `onboarding-DwMBBjjG.js`: “Other cannot create subjects”; `intendedExamSession`; no `syllabusVersionId`
- `settings-CIJ-FNox.js`: “Adding a subject needs May/June…”; new-add session guard
- `exam-sessions-Bnl1IF0b.js`: May/June + Oct/Nov only; no Feb/Mar

## Runtime

No startup/health/db failure. Hosted assignment RPCs remain 0014 signatures/bodies. Codegen is in the merge. Secrets not logged.

STRICT ASSIGNMENT PRODUCTION QA: **NOT YET APPLICABLE**

## Automated regression

Post-merge, non-destructive:

- API 139/139
- Frontend 213/213
- Syllabus 39/39
- Harness target safety 20/20
- Typecheck PASS
- `git diff --check` PASS

Disposable through 0015 and Preview QA: Report 105/106 (implementation unchanged after `b87b14f`).

## Rollback status

FEATURE APP + 0014 is the last easy rollback: redeploy previous Production app. Database stays 0014. No DB rollback.

## 0015 owner gate

Feature UX/error mapping is Production. Hosted DB is still 0014.

Hosted 0015 apply remains a **separate owner authorization**. Do not apply from this report.

Owner/QA final signoff: **DO NOT CLAIM**

## Final verdict

Feature deploy PASS. Strict assignment remains OFF. Phase 6 in progress.
