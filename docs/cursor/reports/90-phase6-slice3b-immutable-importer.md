# Phase 6 Slice 3B — Immutable Importer

## Baseline

- Feature branch: `phase6-slice3b-immutable-importer`
- Base `origin/main`: `5c8db5545cd4169741f17b99b6cbc1b55bfc1ef8`
- Prerequisite: 6.3A CLOSED; hosted journal head remains **0011** (this slice does not apply 0012 hosted)
- Historical migrations `0000`–`0011`: not edited

## OWNER REVIEW

**PASS WITH REQUIRED SAFETY CORRECTIONS**

Corrections applied on the same feature branch (no 0013):

1. Publication recomputes `hashCanonicalGraph` for the draft version and requires equality with stored `content_sha256` (`draft_graph_fingerprint_mismatch` otherwise). No auto-repair.
2. Final published set: if more than one published version remains, every window must be known/non-null. NULL+known without retiring the NULL row is rejected. Explicit retire of NULL A then publish known B is allowed.
3. Successful publication that leaves any published version must leave **exactly one DEFAULT**. First publish requires `--make-default`. Retiring the current DEFAULT without `--make-default` is rejected.
4. `import` / `adopt` / `publish` require exactly one `--files=<subject-code>`. Unknown or multiple codes REJECT before DB load. Validate and `--dry-run` still allow the full manifest offline.
5. `publish` does not parse or normalize CSV; it uses subject code + logical key only.
6. `adopt` of a row that already holds the requested key as a **draft** REJECTS (not a legacy published target). Terminal same-key/same-hash remains already-adopted.

### FINAL LEGACY GUARD CORRECTION

Ordinary `importSyllabusRevision` looks up by `logical_revision_key`. If none exists, it now searches identity-null rows for the same `subject_id` + `source_file` **before** inserting a draft.

- Exactly one identity-null **terminal** snapshot (`published` / `retired` / `archived`): **REJECT** `legacy_identity_requires_adoption` — operator must run explicit adopt. No draft, no graph write, no auto-adopt.
- More than one such match: **REJECT** `ambiguous_legacy_candidate`.
- Identity-null **draft** at that provenance: invariant error (not a legacy candidate).
- No matching identity-null row: create a new draft as before (including a new key after A has been adopted, even if `source_file` is reused).
- A different `source_file` does not match unrelated legacy A; draft B may be created at the data-model level. Hosted second graphs remain forbidden until 6.3C1.

0012 is unchanged.

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

Command: `pnpm --filter @workspace/scripts syllabus:adopt --mode=adopt --files=<code> --revision=<key>` (exactly one subject)

Discovers identity-null rows via subject + `source_file` only. Ambiguous matches **REJECT**. Verifies canonical hashes equal, then SET `logical_revision_key` and `content_sha256` only. Draft rows with the requested key are not treated as already-adopted.

**HOSTED LEGACY ADOPTION: NOT PERFORMED**

## Draft import

`syllabus:import` requires `--revision=` and exactly one `--files=` subject. Creates `lifecycle=draft`, `is_current=false`. Same hash → NO-OP / provenance-only filename update. Changed hash on draft → rebuild **that** version’s children. Changed hash on published/retired/archived → REJECT.

## Published immutability

Importer does not UPDATE/DELETE/rebuild children of terminal lifecycles. No DB triggers.

## Publication lifecycle

`syllabus:publish --files=<code> --revision= [--make-default] [--retire-revision=]`

Does not read CSV. Subject advisory lock. Recomputes DB graph fingerprint vs stored hash. Overlap / NULL-window / DEFAULT rules are evaluated against the **intended final published set**. Transaction rollback leaves draft unpublished.

## Applicability safety

Multiple published versions only when every published window is known and non-overlapping. A single published NULL version remains allowed (legacy). No invented Cambridge ranges.

## Source-removal proof

Harness: published A retains units/IDs; draft B omits “Unit Drop”; A unchanged.

## Concurrency

Same logical key: unique index + advisory lock; parallel imports yield one row.

## Disposable DB verification

`lockdin-db-harness` with loopback, identity, `LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB=1`.

pre-0000 → 0000–0012 → journal → schema (including 0012 indexes) → lifecycle proof → syllabus DB tests → cleanup: **PASS**

## Tests

- Offline hash + CLI (including publish-without-CSV and single-subject scope)
- Harness target-safety 20/20
- Syllabus DB integration (upsert + Model D + legacy import guard)
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

6.3B **implementation PASS WITH REQUIRED SAFETY CORRECTIONS** on the feature branch. Merge and hosted 0012/adopt **not performed**. Owner review required.
