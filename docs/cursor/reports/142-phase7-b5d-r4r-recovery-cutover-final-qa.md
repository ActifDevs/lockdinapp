# LOCKDIN — PHASE 7 B5D-R4R RECOVERY / CUTOVER / FINAL QA

**Date:** 2026-09-06 UTC
**Status:** BLOCKED — retained backup restored completely with the permission-correct local superuser, but the mandatory restored route-assignment snapshot did not match the recorded Production pre-cutover hash
**Report 141 freeze commit:** `1623f20c203769bffdd2071c3372bb105e56bef9`
**B5D-F3R application SHA:** `eb79025ad37681dbef57d4b0d2f4120237c4a739`

## Stop gate

The sequence stopped at Part C, step 11. Migration 0019 was not applied to the restored database or Production. No fresh cutover backup, deployment action, Production browser mutation, product change, visibility change, membership repin/backfill, or B5E work was performed.

## Repository

| Check | Result |
| --- | --- |
| Branch before Report 141 push | `main` |
| Pre-push HEAD | `1623f20c203769bffdd2071c3372bb105e56bef9` |
| Pre-push `origin/main` | `eb79025ad37681dbef57d4b0d2f4120237c4a739` |
| Freeze commit contents | Report 141 only; one documentation file added |
| Product-code / migration changes in freeze commit | NONE |
| Push | PASS — `main` |
| Post-push HEAD / `origin/main` | `1623f20c203769bffdd2071c3372bb105e56bef9` |
| Post-push working tree | CLEAN |

## Restore failure diagnosis

The retained custom dump was readable by PostgreSQL 17.6 tooling. Its full schema definition for `realtime.list_changes` contains:

`SET log_min_messages TO 'fatal'`

The blocked Report 141 restore used a disposable role that was not a PostgreSQL superuser and failed while recreating this function. This was a disposable restore-role permission problem, not dump corruption. No Production role or parameter privilege was changed.

## Permission-correct local recovery

| Item | Result |
| --- | --- |
| Disposable image | `public.ecr.aws/supabase/postgres:17.6.1.143` |
| Network exposure | Loopback only, dedicated port 55435 |
| Database | Fresh `template0` database; zero non-system objects before restore |
| Role named `postgres` | `rolsuper = false`; not used for restore |
| Image built-in restore role | `supabase_admin` |
| `current_user` / `session_user` | `supabase_admin` / `supabase_admin` |
| `rolsuper` | `true` |
| `SET log_min_messages TO 'fatal'; RESET ...` | PASS |
| Production privilege changes | NONE |

## Retained backup

| Item | Value |
| --- | --- |
| Path | `C:\Users\USER\lockdin-recovery\b5d-r4\lockdin-production-pre0019-20260905T195129Z.dump` |
| Size | 869,553 bytes |
| SHA-256 | `b35d68b1553ce02664dbcba20a62d6887c7abf4c85e8bb93a5b920deb9cbfcdf` |
| Format | PostgreSQL custom, gzip compression, 665 TOC entries |
| Dumped from / by | PostgreSQL 17.6 / pg_dump 17.6 |
| Dump alteration | NONE |

## Full restore proof

The verified dump was restored into the fresh blank database as the disposable image's actual built-in superuser with:

`pg_restore --exit-on-error --no-owner --no-acl`

| Gate | Result |
| --- | --- |
| Exit code | 0 |
| Permission errors | 0 |
| Object-creation failures | 0 |
| Skipped restore errors | 0 |
| Selective restore / exclusions / TOC edits | NONE |
| `realtime.list_changes` recreation | PASS |

## Restored pre-0019 state

| Invariant | Required | Restored |
| --- | ---: | ---: |
| Migration count | 19 | 19 |
| Migration head timestamp | 1788080000000 / 0018 | 1788080000000 / 0018 |
| Subjects | 16 | 16 |
| Versions | 29 | 29 |
| Published | 21 | 21 |
| Retired | 8 | 8 |
| Published route sets | 29 | 29 |
| Routes | 95 | 95 |
| Memberships | 15 | 15 |
| New-seven selectable | 0 | 0 |
| Feb/Mar auto-assignment | 0 | 0 |

## Exact snapshot fidelity

The original Production verification query was recovered from the prior local task record and reused exactly. It hashes sorted newline-delimited rows with a final newline.

| Snapshot | Required | Restored | Result |
| --- | --- | --- | --- |
| Membership pins | `649a60a12ce103b9177272f47c9dbc5ba21d4ba3a72084b156bcbcfeb189b5b8` | same | PASS |
| Route assignments | `29a1a40b1b3196d056386458c2960386b7c1466b1dd480ea43aaee14a40812c1` | `3eac5cb0936471066be1966cdce854dff7ccea88694f90b39a14459811ea5b19` | **FAIL** |
| Option rows | `6c1c32a0b8663186de3d1ceafcce2edd13a1c170d16b6635ba5e6adefd1d3a83` | same | PASS |

The exact route snapshot serialization was:

`user_id|subject_id|syllabus_version_id|coalesce(assessment_route_id, 'null')`

ordered by `user_id, subject_id` and terminated by a final newline.

Because one required snapshot differs, the completed restore is not accepted as a valid populated rehearsal. The discrepancy was not explained or waived.

## Populated 0018 → 0019 rehearsal

- pre-head: 19 / `0018_subject_visibility_and_route_assignment`
- migration 0019: **NOT EXECUTED — fidelity stop gate**
- post-head: NOT EXECUTED
- resolver matrix: NOT EXECUTED
- rehearsal fixtures: NONE CREATED
- disposable environment cleanup: PASS

## Fresh cutover backup and authoritative rehearsal

- Production reconfirmation: NOT EXECUTED
- fresh cutover backup: NOT CREATED
- authoritative second restore: NOT EXECUTED
- authoritative 0018 → 0019 rehearsal: NOT EXECUTED

## Production migration

- Production migration 0019: NOT APPLIED
- Production database mutations during R4R: 0
- Production privilege escalation: NONE
- Production is not freshly reverified after the fidelity stop; Report 141's last recorded state remains 19 / 0018

## Deployment and runtime

- Web deployment inspection: NOT EXECUTED
- API deployment inspection: NOT EXECUTED
- manual deployment: NONE
- runtime-log inspection: NOT EXECUTED

## B5D regression and browser matrix

All Production browser items are **NOT EXECUTED** because the mandatory database rehearsal gate did not pass:

- baseline navigation
- B5D-001 through B5D-005
- History hydration and Full → AS → Full
- Study Plan
- Past Papers
- Progress
- hard refresh / back / forward / direct URL / sign-out-in
- mobile 390 × 844
- accessibility keyboard smoke
- browser hidden-seven proof
- browser fixture cleanup

No browser PASS is inferred from automated or SQL evidence.

## Final hosted invariants

NOT EXECUTED after the stop gate. No hosted write occurred in this R4R run.

## Defects

| Severity | Count | Detail |
| --- | ---: | --- |
| Blocker | 1 | Retained dump's restored route-assignment digest does not equal the required recorded Production pre-cutover digest under the exact original canonical query |
| Critical | 0 observed | Later cutover and browser stages were not reached |
| High | 0 observed | Later cutover and browser stages were not reached |
| Medium | 0 observed | Later cutover and browser stages were not reached |
| Low | 0 observed | Later cutover and browser stages were not reached |

## Safety boundaries

- product changes during R4R: NONE
- migrations 0016 / 0017 / 0018 changed: NO
- migration 0019 changed: NO
- Production migration applied: NO
- Production database mutation: 0
- new-seven visibility mutation: 0
- historical repin/backfill: 0
- Feb/Mar enablement: NONE
- route manifest change: NONE
- B5E started: NO
- Report 142 commit: NONE
- Report 142 push: NONE

## Verdict

**BLOCKED**

The permission-correct full restore procedure is proven, but restore fidelity is not. Do not apply 0019 to Production and do not start B5E until the route-assignment snapshot discrepancy is explained and a fresh authoritative populated rehearsal passes every gate.
