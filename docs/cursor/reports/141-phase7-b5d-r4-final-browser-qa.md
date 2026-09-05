# LOCKDIN — PHASE 7 B5D-R4 FINAL PRODUCTION QA

**Date:** 2026-09-05 UTC
**Status:** BLOCKED — mandatory populated pre-0019 backup restore failed; production cutover and browser QA stopped before any database write
**B5D-F3R freeze SHA:** `eb79025ad37681dbef57d4b0d2f4120237c4a739`
**Repository:** `main`; `HEAD` = `origin/main` = B5D-F3R freeze SHA

## Stop gate

The controlled sequence stopped in Part B, step 8. The fresh full Production dump was copied into a new disposable PostgreSQL 17 rehearsal container and restored into a blank database with:

`pg_restore --exit-on-error --no-owner --no-acl`

Restore failed while creating `realtime.list_changes`:

`ERROR: permission denied to set parameter "log_min_messages"`

The function definition includes `SET log_min_messages TO 'fatal'`. The disposable restore role did not have permission to set that parameter. Because the authorization says any restore failure must stop the sequence, no alternate restore flags, role escalation, selective restore, or second restore attempt was used.

## Repository freeze

| Check | Result |
| --- | --- |
| Starting baseline | `c9cc3cbc3980d2399d054bd15feaa480dcffa582` |
| Approved staged scope | PASS — B5D-F3R implementation + Report 140 only |
| Prior migrations 0016–0018 | UNCHANGED |
| Route manifests / syllabus data | UNCHANGED |
| Visibility / Feb/Mar | UNCHANGED |
| Cached diff check | PASS |
| Freeze commit | `eb79025ad37681dbef57d4b0d2f4120237c4a739` |
| Commit message | `fix(routes): enforce route option applicability and hydration` |
| Push | PASS — `main` |
| Post-push state | `HEAD` = `origin/main`; clean before this report |

## Production pre-cutover read-only proof

Project identity matched `hazvcdrcvsxmuwdfiucx`. Existing ignored local connection configuration was used without printing credentials. The transaction was read-only and rolled back.

| Invariant | Observed |
| --- | --- |
| Migration count | 19 |
| Migration head | `0018_subject_visibility_and_route_assignment` (journal timestamp `1788080000000`) |
| Subjects | 16 |
| Versions | 29 |
| Published / retired | 21 / 8 |
| Published route sets | 29 |
| Routes | 95 |
| Memberships | 15 |
| Route-assigned memberships | 2 — documented QA fixture only |
| Option rows | 3 — documented QA fixture only |
| Historical non-QA route assignments | 0 |
| Historical non-QA option rows | 0 |
| New-seven selectable | 0 |
| Feb/Mar auto-assignment | 0 |
| Membership pin SHA-256 | `649a60a12ce103b9177272f47c9dbc5ba21d4ba3a72084b156bcbcfeb189b5b8` |
| Route-assignment SHA-256 | `29a1a40b1b3196d056386458c2960386b7c1466b1dd480ea43aaee14a40812c1` |
| Option-row SHA-256 | `6c1c32a0b8663186de3d1ceafcce2edd13a1c170d16b6635ba5e6adefd1d3a83` |

## Fresh Production backup

| Item | Value |
| --- | --- |
| Type | Full PostgreSQL custom-format logical dump; owner/ACL omitted for portability |
| Path | `C:\Users\USER\lockdin-recovery\b5d-r4\lockdin-production-pre0019-20260905T195129Z.dump` |
| Size | 869,553 bytes |
| SHA-256 | `b35d68b1553ce02664dbcba20a62d6887c7abf4c85e8bb93a5b920deb9cbfcdf` |
| Repository storage | NONE |
| Retained | YES |

An earlier malformed container command produced no backup and its verified zero-byte file was removed. It did not modify Production.

## Populated 0018→0019 rehearsal

| Step | Result |
| --- | --- |
| Disposable target | New local Supabase PostgreSQL `17.6.1.143`, dedicated port 55434 |
| Blank rehearsal database | CREATED |
| Backup copied | PASS |
| Full restore | FAIL — `realtime.list_changes` could not set `log_min_messages` |
| Migration 0019 | NOT EXECUTED |
| Post-migration invariants | NOT EXECUTED |
| Resolver proofs | NOT EXECUTED |
| Disposable container cleanup | PASS |

## Production migration

- immediate pre-write reconfirmation: NOT EXECUTED
- migration 0019 applied: **NO**
- hosted database mutations: **0**
- Production remains at 19 migrations / `0018_subject_visibility_and_route_assignment`

## Deployment

The freeze SHA was pushed and may trigger configured Vercel automation. Deployment state was not inspected after the mandatory rehearsal failure. No manual deployment, redeployment, environment change, or Supabase configuration change was performed.

- Web deployment ID / SHA / state: NOT INSPECTED
- API deployment ID / SHA / state: NOT INSPECTED
- exact frozen fix confirmed live: NOT EXECUTED

## B5D-R4 browser QA

Real Production browser QA did not begin. The following are all **NOT EXECUTED**:

- authentication / dedicated fixture confirmation
- baseline read journey
- B5D-001 and B5D-002 regression checks
- B5D-003 three-group regression
- B5D-004 route/option hydration and reload
- B5D-005 AS applicability and stale-option removal
- AS → Full restoration
- Study Plan matrix
- Past Papers matrix
- Progress matrix
- navigation/session matrix
- desktop/mobile responsive matrix
- accessibility smoke
- browser hidden-seven proof
- QA fixture mutation/cleanup
- post-QA hosted invariants and runtime logs

No browser PASS is inferred from source code, automated tests, or SQL.

## Defects

| Severity | Count | Detail |
| --- | ---: | --- |
| Blocker | 1 | Required full backup restore is not reproducible with the attempted disposable-role permissions |
| Critical | 0 observed | Later cutover/QA stages were not reached |
| High | 0 observed | Later cutover/QA stages were not reached |
| Medium | 0 observed | Later cutover/QA stages were not reached |
| Low | 0 observed | Later cutover/QA stages were not reached |

## Safety boundaries

- Production migration applied: NO
- Production database mutation: 0
- manual deployment: NONE
- product patch during QA: NONE
- new-seven visibility mutation: 0
- historical repin/backfill: 0
- Feb/Mar enablement: NONE
- route manifest change: NONE
- B5E started: NO

## Verdict

**BLOCKED**

B5D cannot close. The owner must authorize a separate recovery/rehearsal fix slice that establishes a reproducible, permission-correct restore procedure for this full Supabase dump, then repeats the populated 0018→0019 gate before any Production migration.

Do not start B5E.
