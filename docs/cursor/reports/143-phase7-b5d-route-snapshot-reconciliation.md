# LOCKDIN — PHASE 7 B5D-R4R2 ROUTE-SNAPSHOT RECONCILIATION

**Date:** 2026-09-06 UTC

**Status:** PASS — the Report 142 discrepancy was reproduced as a NULL-sentinel serialization difference, a fresh Production dump was bound to the same exported MVCC snapshot as its baseline, exact restore fidelity passed, and migration 0019 plus the resolver matrix passed only on a disposable restored database

**Report 142 freeze commit / R4R2 baseline:** `d9689febf571404595702814688c873f709fc522`

**Frozen B5D-F3R application SHA:** `eb79025ad37681dbef57d4b0d2f4120237c4a739`

## Safety result

- Production diagnostics and snapshot export were read-only.
- Production migration 0019 was not applied.
- Production database mutations: **0**.
- Production privilege changes: **NONE**.
- Deployment: **NONE**.
- Product-code changes: **NONE**.
- Migration-file changes: **NONE**.
- B5E: **NOT STARTED**.

## Repository freeze

Report 142 was the only file committed in `d9689febf571404595702814688c873f709fc522` with message `docs: freeze blocked B5D-R4R restore fidelity`. The commit was pushed directly from `main`; post-push `HEAD` and `origin/main` both equalled the freeze commit and the working tree was clean. Report 142 remains an accurate historical blocked record and was not rewritten.

## Current Production read-only baseline

The correct configured Production database for project `hazvcdrcvsxmuwdfiucx` was inspected inside a `REPEATABLE READ READ ONLY` transaction and rolled back.

| Invariant | Current Production |
| --- | ---: |
| Migration count / head | 19 / `0018_subject_visibility_and_route_assignment` (`1788080000000`) |
| Subjects | 16 |
| Syllabus versions | 29 |
| Published / retired versions | 21 / 8 |
| Published route sets / routes | 29 / 95 |
| Memberships | 15 |
| Route-assigned memberships | 2 |
| Option rows | 3 |
| New-seven selectable | 0 |
| Feb/Mar auto-assignment | 0 |
| Membership-pin SHA-256 | `649a60a12ce103b9177272f47c9dbc5ba21d4ba3a72084b156bcbcfeb189b5b8` |
| Route-assignment SHA-256 | `29a1a40b1b3196d056386458c2960386b7c1466b1dd480ea43aaee14a40812c1` |
| Option-row SHA-256 | `6c1c32a0b8663186de3d1ceafcce2edd13a1c170d16b6635ba5e6adefd1d3a83` |

Raw identifiers were retained only in temporary evidence outside the repository. Users are deterministically aliased below.

| User | Subject | Version | Route | Updated at (UTC) | Options | QA fixture |
| --- | ---: | ---: | ---: | --- | --- | --- |
| U01–U04 | 12 memberships total | pinned versions unchanged | null | unchanged retained/current | none | No |
| U05 | 2 | 2 | 13 | 2026-09-05T17:17:56.002Z | 1, 4, 7 | Yes |
| U05 | 8 | 8 | 70 | 2026-09-05T17:15:38.656Z | none | Yes |
| U05 | 9 | 9 | null | 2026-08-21T22:05:40.689Z | none | Yes |

## Historical route-digest discrepancy

| Evidence | Route SHA-256 |
| --- | --- |
| Historical expected Production digest | `29a1a40b1b3196d056386458c2960386b7c1466b1dd480ea43aaee14a40812c1` |
| Report 142 recorded retained-restore digest | `3eac5cb0936471066be1966cdce854dff7ccea88694f90b39a14459811ea5b19` |
| Current Production, canonical lowercase-null query | `29a1a40b1b3196d056386458c2960386b7c1466b1dd480ea43aaee14a40812c1` |
| Retained restore, canonical lowercase-null query | `29a1a40b1b3196d056386458c2960386b7c1466b1dd480ea43aaee14a40812c1` |
| Same retained rows, uppercase-NULL query | `3eac5cb0936471066be1966cdce854dff7ccea88694f90b39a14459811ea5b19` |

The retained dump was restored again in full with `pg_restore --exit-on-error --no-owner --no-acl` as the disposable image's verified `supabase_admin` superuser. Restore exit code was 0. The canonical current-Production and retained-dump route rowsets had **zero differing rows**. Pin and option rowsets also matched exactly.

The two route digests were reproduced mathematically from the same retained rowset. The canonical expression using `coalesce(assessment_route_id::text, 'null')` produces `29a1a40...`; changing only the null sentinel to uppercase `'NULL'` produces `3eac5cb0...`. Therefore Report 142's `3eac...` result was a diagnostic serialization inconsistency, not restored data drift. Its prose recorded the lowercase canonical query, but the reported failed value corresponds exactly to uppercase NULL serialization.

**Classification:** CASE D — query-different, fully explained.

**Exact differing database rows:** 0.

**Non-QA unexplained drift:** 0.

The leading timeline hypothesis was rejected. The only populated QA route updates occurred at 17:15:38Z and 17:17:56Z, before the retained dump at approximately 19:51:29Z. Current Production and the retained dump contain the same values and timestamps. No after-baseline/before-dump row mutation is needed to explain the digest difference.

## Snapshot-bound authoritative backup

The installed PostgreSQL client was `pg_dump 17.6`; its help confirmed `--snapshot=SNAPSHOT`. The selected Production URL was the configured session-capable connection, not the transaction-pooler URL.

An exporter connection opened `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`, exported snapshot `00000036-000032F3-1`, and remained open. A second live database session successfully imported that snapshot before reading, proving the actual connection architecture supported exported-snapshot sharing. The authoritative invariant queries ran within the exporter transaction, and `pg_dump --snapshot=00000036-000032F3-1` completed successfully while that transaction remained open. The exporter transaction was then rolled back.

| Item | Value |
| --- | --- |
| Snapshot export time | 2026-09-06T09:19:58.147Z |
| Format | PostgreSQL custom |
| Portability options | `--no-owner --no-acl` |
| Path | `C:\Users\USER\lockdin-recovery\b5d-r4r2\lockdin-production-pre0019-snapshot-20260906T092009Z.dump` |
| Size | 874,548 bytes |
| SHA-256 | `b00e8f235615faee6df147c546ea769f0534bb7c1d5e8a5989895cfb83152abf` |
| Completed / file timestamp | 2026-09-06T09:22:34.667Z |

No credentials were written to logs or this report.

## Authoritative pre-0019 snapshot

| Invariant | Authoritative value |
| --- | ---: |
| Migration count / head | 19 / 0018 (`1788080000000`) |
| Subjects / versions | 16 / 29 |
| Published / retired versions | 21 / 8 |
| Published route sets / routes | 29 / 95 |
| Memberships / route-assigned | 15 / 2 |
| Option rows | 3 |
| New-seven selectable / Feb-Mar | 0 / 0 |
| Pin SHA-256 | `649a60a12ce103b9177272f47c9dbc5ba21d4ba3a72084b156bcbcfeb189b5b8` |
| Route SHA-256 | `29a1a40b1b3196d056386458c2960386b7c1466b1dd480ea43aaee14a40812c1` |
| Option SHA-256 | `6c1c32a0b8663186de3d1ceafcce2edd13a1c170d16b6635ba5e6adefd1d3a83` |

## Fresh restore fidelity

The snapshot-bound dump was restored into a second fresh `template0` database in a separate disposable `public.ecr.aws/supabase/postgres:17.6.1.143` container. The built-in local `supabase_admin` role was verified as `rolsuper = true`, the `SET/RESET log_min_messages` probe passed, and the full restore used `pg_restore --exit-on-error --no-owner --no-acl` with no exclusions or TOC edits.

| Gate | Result |
| --- | --- |
| Restore exit code / all objects | 0 / PASS |
| Migration count and head | exact match — PASS |
| Catalogue and membership counts | exact match — PASS |
| Pin SHA | exact match — PASS |
| Route SHA | exact match — PASS |
| Option SHA | exact match — PASS |
| New-seven and Feb/Mar invariants | exact match — PASS |
| Overall same-snapshot fidelity | **PASS** |

## Populated 0018 → 0019 rehearsal

Only after exact restore fidelity passed, the repository's established migration command applied the committed `0019_route_option_group_applicability` migration from the frozen application state to the fresh disposable restored database. No manual SQL replacement was used.

| Gate | Result |
| --- | --- |
| Pre-migration | 19 / 0018 (`1788080000000`) |
| Post-migration | 20 / 0019 (`1788090000000`) |
| Pin SHA after 0019 | unchanged — PASS |
| Route SHA after 0019 | unchanged — PASS |
| Option SHA after 0019 | unchanged — PASS |
| Passive membership-data drift | NONE |

### Resolver matrix

All fixtures were created inside one transaction on the disposable restored database, and that transaction was rolled back. Post-rollback fixture-user residue was 0. The final restored database still had 15 memberships, 2 route-assigned memberships, and 3 option rows with the authoritative hashes unchanged.

| Case | Result |
| --- | --- |
| History AS + valid AS/both option | ACCEPT — PASS |
| History AS + A-Level-only option | REJECT — PASS |
| History AS missing required AS option | REJECT — PASS |
| History Full + one option from all three groups | ACCEPT — PASS |
| History Full missing a required group | REJECT — PASS |
| Full → AS | ACCEPT — same version retained and stale A-Level options removed atomically |
| Wrong-version route/option | REJECT — PASS |
| Unknown option/route reference | REJECT — PASS |
| Cross-user membership attempt | REJECT — PASS |
| Invalid transactions | 0 partial writes — PASS |

Both disposable restore containers, including all rehearsal fixture state, were destroyed after verification.

## Final verdict

**PASS**

The retained backup is row-faithful, the historical digest discrepancy is fully explained, the new logical backup and its baseline share one exported MVCC snapshot, exact fresh-restore fidelity passed, and the populated local 0018→0019 rehearsal passed without passive membership drift. Production remains on 0018 with zero mutations from this task.

## Recommendation

Owner review and freeze Report 143. Then authorize a short, separate Production cutover task to reconfirm no unexpected Production drift, create or reuse a freshly proven backup as appropriate, apply exact migration 0019, verify zero passive data drift, verify the exact frozen application deployment, and run final B5D Production browser QA. Do not start B5E before that cutover and QA complete.
