# Phase 6 Slice 3B — Immutable Importer

## Baseline

- Feature branch: `phase6-slice3b-immutable-importer`
- Base `origin/main`: `5c8db5545cd4169741f17b99b6cbc1b55bfc1ef8`
- Prerequisite: 6.3A CLOSED; hosted journal head remains **0011** (this slice does not apply 0012 hosted)
- Historical migrations `0000`–`0011`: not edited

## Identity contract

- **`logical_revision_key`:** canonical version identity. Unique per subject when set. A published graph is never rewritten under the same key.
- **`content_sha256`:** semantic **graph fingerprint**, not identity. Duplicate hashes under different keys are legal.
- **`source_file`:** last-seen provenance filename, not identity. Duplicate filenames under different keys are legal.

## Migration 0012

`lib/db/migrations/0012_ordinary_penance.sql` (journal `when` `1788010369454`).

- DROP `syllabus_versions_subject_source_unique`
- DROP unique index `syllabus_versions_content_sha256_per_subject`
- CREATE non-unique `syllabus_versions_subject_source_idx`
- CREATE partial non-unique `syllabus_versions_content_sha256_idx`
- **Preserve** `syllabus_versions_logical_revision_per_subject`

No data backfill, no pin changes, no graph mutation.

**HOSTED 0012: NOT APPLIED**

## Canonical content fingerprint

SHA-256 (hex) of deterministic JSON for exam board, qualification, ordered units/topics/outcomes, components, and outcome↔component relationships (including level). Excludes filename, CSV representation, `is_current`, lifecycle, timestamps, applicability, label, subject catalogue fields.

Shared by source hashing, DB graph load (`loadCanonicalGraphForVersion` by **version id** only), draft checks, and adoption.

## Legacy adoption

Command: `pnpm --filter @workspace/scripts syllabus:adopt --mode=adopt --files=<code> --revision=<key>`

Discovers identity-null rows via subject + `source_file` only. Ambiguous matches **REJECT**. Verifies canonical hashes equal, then SET `logical_revision_key` and `content_sha256` only.

**HOSTED LEGACY ADOPTION: NOT PERFORMED**

## Draft import

`syllabus:import` requires `--revision=`. Creates `lifecycle=draft`, `is_current=false`. Same hash → NO-OP / provenance-only filename update. Changed hash on draft → rebuild **that** version’s children. Changed hash on published/retired/archived → REJECT.

## Published immutability

Importer does not UPDATE/DELETE/rebuild children of terminal lifecycles. No DB triggers.

## Publication lifecycle

`syllabus:publish --revision= --make-default [--retire-revision=]`

Subject advisory lock. Overlap: retire named published version first, then publish draft as DEFAULT. Non-overlapping windows: both may stay published; DEFAULT unset then set. Transaction rollback leaves draft unpublished.

## Applicability safety

Refuse a second **published** version with **null** windows when one already exists. No invented Cambridge ranges.

## Source-removal proof

Harness: published A retains units/IDs; draft B omits “Unit Drop”; A unchanged.

## Concurrency

Same logical key: unique index + advisory lock; parallel imports yield one row.

## Disposable DB verification

`lockdin-db-harness` with loopback, identity, `LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB=1`.

pre-0000 → 0000–0012 → journal → schema (including 0012 indexes) → lifecycle proof → syllabus DB tests → cleanup: **PASS**

## Tests

- Offline hash + CLI + parse/normalize
- Harness target-safety 20/20
- Syllabus DB integration 16 (upsert + Model D)
- API unit 119/119
- Scripts typecheck PASS
- API typecheck: pre-existing TS2305 (`createDatabasePoolConfig` / `validateDatabaseUrl`) — not fixed

## Security

No RLS/RPC/grant changes. Importer remains operator scripts. `lockdin_replace_user_subjects` untouched. No application user publication grants.

## Rollout boundary

- **HOSTED 0012:** NOT APPLIED
- **HOSTED LEGACY ADOPTION:** NOT PERFORMED
- **HOSTED SECOND GRAPH:** NONE
- **REAL SECOND PRODUCTION VERSION:** NOT AUTHORIZED
- 6.3C1 remains required before any second hosted graph (including drafts)

## Known limitations

Stock API integration runner still bound to ordinary `lockedinapp` workdir. Not retargeted. Do not claim 42/42.

## Out of scope

6.3C1/C2, 6.3D, 6.4, merge to main, hosted apply, frontend, Cambridge window data.

## Final verdict

6.3B **implementation PASS** on the feature branch. Merge and hosted 0012/adopt **not performed**. Owner review required.
