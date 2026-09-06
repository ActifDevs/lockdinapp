# LOCKDIN - PHASE 7 B5E-F2 PRODUCTION CONTROLLED VISIBILITY CUTOVER

**Date:** 2026-09-06 UTC

**Status:** PASS - migration 0020 applied, verified, and controlled visibility
proof completed with all temporary grants removed

## Safety Result

- Production migration applied: **0020_subject_visibility_grants only**
- Production data changes: **temporary internal QA grant only; removed**
- Production memberships created: **NONE**
- Global subject visibility changes: **NONE**
- Beta invitations: **NONE**
- Deployment changes: **NONE**
- B5E-F2 follow-on actions: **NOT STARTED**

## Pre-Write Gate

- Production migration count / head before write: `20 / 0019_route_option_group_applicability`
- Subjects before write: `16`
- Memberships before write: `15`
- Existing visibility grants before write: `0`
- Existing visibility table: `ABSENT`
- Existing authorization helper: `ABSENT`
- Exact authorized migration source: commit
  `3acb9bf3b81f65dbfc795f3f3f217b21b2c311a0`
- Rehearsal and restore-fidelity gates: **PASS**

## Fresh Production Backup

- Path:
  `C:\Users\USER\lockdin-recovery\b5e-f2\lockdin-production-pre0020-20260906T213352Z.dump`
- Size: `874260` bytes
- SHA-256:
  `0c3223624621ac0799beb87158b92bb27e0752ee1f0833dcb1ffbcf593ea2c93`
- Snapshot-bound dump: **PASS**
- `pg_restore --list`: **PASS**

## Migration Result

- Migration count / head: `21 / 0020_subject_visibility_grants`
- `public.subject_visibility_grants`: **EXISTS**
- `public.lockdin_can_select_subject(uuid, integer)`: **EXISTS**
- Grant table RLS and private ordinary-role privileges: **VERIFIED**
- Direct helper execution for `anon`: **DENIED**
- Direct helper execution for `authenticated`: **DENIED**

The migration SQL was sourced exactly from the authorized B5E-F1 commit. The
corresponding Drizzle migration journal row was recorded with the authorized
hash after the SQL completed successfully.

## Passive Invariants

| Invariant | Post-cutover Production |
| --- | ---: |
| Migration count / head | 21 / `0020_subject_visibility_grants` |
| Subjects | 16 |
| Syllabus versions | 29 |
| Published / retired versions | 21 / 8 |
| Route sets / routes | 29 / 95 |
| Memberships | 15 |
| Route-assigned memberships | 2 |
| Option selections | 3 |
| New-seven globally selectable | 0 / 7 |
| Current-nine globally selectable | 9 / 9 |
| Feb/Mar rows | 0 |
| Visibility grants after cleanup | 0 |

Canonical digests remained unchanged from the snapshot baseline:

- Membership pins:
  `649a60a12ce103b9177272f47c9dbc5ba21d4ba3a72084b156bcbcfeb189b5b8`
- Route assignments:
  `f086f7f0e3c476623111f50c63ecd72b2feaa5a269f0c855174444eaea1f2432`
- Option selections:
  `0e88375f8b75b0fa6f9bad0e0be1958f09590e6f332b9b98f6b8121cb6996562`

## Controlled Visibility Proof

A temporary internal QA Geography grant was created for subject id `22`
(code `9696`) and removed in the same controlled proof sequence.

- Granted-user catalogue: `10` subjects
- Other-user catalogue: `9` subjects
- Geography route: id `36`, syllabus version `33`, `Complete A Level`
- Required option groups: `2`
- Selected option rows: `19`, `20` in group `7`; `23`, `24` in group `8`
- Group contract: `2/2 + 2/2`
- Post-revocation visibility grant count: `0`
- Production Geography membership residue: **NONE**

No global `selectable_for_new_memberships` flags were changed.

## Runtime and Deployment Health

- Web deployment: READY on B5E-F1 SHA
  `3acb9bf3b81f65dbfc795f3f3f217b21b2c311a0`
- API deployment: READY on B5E-F1 SHA
  `3acb9bf3b81f65dbfc795f3f3f217b21b2c311a0`
- Runtime error clusters in the inspected hour: **NONE**
- Production 5xx clusters in the inspected hour: **NONE**
- Missing-relation, missing-function, and Postgres function-lookup errors:
  **NONE OBSERVED**

## Repository Result

- Product-code changes: **NONE**
- Migration files changed: **NONE**
- This report is the only working-tree change.
- Report committed or pushed: **NO**

## Final Gate

**PASS**

Production is at migration `0020_subject_visibility_grants`, passive data is
unchanged, controlled visibility is isolated and cleaned up, and no global
visibility or beta-user changes were performed.

## Next Authorized Stage

The fresh snapshot-bound backup is retained for recovery evidence. B5E-F2
follow-on work remains stopped pending separate authorization.
