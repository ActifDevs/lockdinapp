# Phase 6 — Applicability Population Tooling

- **Date:** 2026-08-30
- **Branch:** `phase6-applicability-population-tooling`
- **Research merge SHA:** `eb53500c5f5f9db2aa6b2f69b0603f2f5b644746`
- **Hosted mutation:** none
- **Hosted APPLY:** not run

## Baseline

`origin/main` was `202332973d5de722c0ab79ec9dc36c6a8619fd06` before the research merge. Hosted remains **0014_perpetual_nighthawk**, identities 9/9, applicability 0/9, policy rows 0, strict assignment OFF.

## Approved data

Report 102 windows plus explicit Feb/Mar `product_auto_assign = false` for all nine r001 keys.

## Manifest

`docs/reference-data/syllabus-applicability/population-manifest.json`

Nine entries keyed by `subjectCode` + `logicalRevisionKey`. Expected `content_sha256` values are the adopted canonical hashes from identity-adoption evidence. Provenance points at Report 102.

## Operator

`pnpm --filter @workspace/scripts syllabus:applicability` (`scripts/src/syllabus/applicability-cli.ts`)

- Default / `--mode=validate`: read-only transaction, all nine prechecks, no writes.
- `--mode=apply`: classify all nine, then write in the same transaction.

Not `syllabus:adopt` or `syllabus:publish`. No public API.

## Preconditions

Each target must exist exactly once, be published, match the expected hash, and have NULL applicability + no policy **or** already exactly the desired window and three policy rows. Any other state fails closed.

## Transactionality

Validate/classify all nine before any write. Writes are one `db.transaction`. One failure rolls back everything.

## Idempotency

Exact desired state → `already-applied`. Second apply does not duplicate policy rows.

## Conflict handling

Different applicability or different policy values → `applicability_conflict` / `series_policy_conflict`. No overwrite.

## Series policy

Exactly Feb/Mar false, May/June true, Oct/Nov true. Not Cambridge geography.

## Resolver proof

Disposable apply then `lockdin_resolve_applicable_syllabus_version`: May/June and Oct/Nov at inclusive endpoints succeed; Feb/Mar rejects; outside range rejects. No `is_current` fallback.

## History boundary

9489 2026 MJ/ON reject; 2027 MJ and 2029 ON pass; 2030 MJ reject.

## Science boundary

9702 2024 ON reject; 2025 MJ and 2030 MJ/ON pass; 2031 MJ reject.

## Atomic failure proof

Wrong `content_sha256` on 9708-r001 fails the all-nine apply; 9709 applicability unchanged.

## Assignment still DEFAULT

APPX01 DEFAULT A vs resolver B: onboarding still pins A.

## Security

Operator CLI only. No student endpoint. Credentials not logged.

## Tests

See implementation result. Stock API integration not claimed.

## Hosted state

HOSTED APPLICABILITY: **NOT POPULATED**

HOSTED SERIES POLICY: **0 ROWS**

HOSTED MUTATION: **NONE**

STRICT ASSIGNMENT: **NOT ENABLED**

C2B2: **NOT STARTED**

0015: **NOT CREATED**

## Rollout boundary

Do not run APPLY against hosted until a later owner authorization.

## Production population prerequisites

1. Tooling merged and healthy  
2. Hosted still 0014 / 9 r001 / 0 applicability / 0 policy  
3. Owner authorizes hosted APPLY  
4. Post-apply audit 9/9 + 27 rows  
5. Separate C2B2 authorization for assignment cutover  

## Final verdict

Population tooling implemented and proven on disposable DB only.
