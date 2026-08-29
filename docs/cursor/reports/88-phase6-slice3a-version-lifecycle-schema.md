# Phase 6 Slice 3A — Version Lifecycle Schema Foundation

## Baseline

- Branch: `phase6-slice3a-version-lifecycle-schema`
- Base `origin/main`: `c60f3a94a828dd4bfd2ee1eda424ea2ae37f3e93`
- Prerequisite `0010` remains unmodified
- Historical migrations `0000`–`0010`: not edited

## Scope

Schema and constraint foundation only for Model D. No importer rewrite, no pin-aware reads, no session-based assignment, no frontend, no hosted apply, no merge.

## Approved invariants

PUBLISHED / DEFAULT (`is_current`) / APPLICABLE (session window) / PINNED remain distinct. Existing pins are not rewritten. Applicability values are not guessed.

## Schema design

On `syllabus_versions`:

- `lifecycle` enum `draft|published|retired|archived`, NOT NULL, default `published` (legacy rows)
- `logical_revision_key` text NULL, unique per subject when set
- `content_sha256` text NULL, unique per subject when set
- `published_at` / `retired_at` timestamptz NULL; existing published rows get `published_at = imported_at` only
- Structured window: `applicable_from_year/series`, `applicable_to_year/series` (enum `Feb/Mar|May/June|Oct/Nov`, not Specimen)
- Generated `applicable_session_range int4range` from year×3+series ordinal
- `is_current` kept as administrative DEFAULT; unique partial index one true per subject

Immutability of published graphs: **FUTURE IMPORTER CONTRACT** (6.3B). No new triggers.

## Exam-session representation

Ordinal: `year * 3 + {Feb/Mar:0, May/June:1, Oct/Nov:2}` via `lockdin_exam_session_ordinal`. Windows nullable. Complete-or-empty CHECK. Order CHECK plus generated-range bounds.

## Default uniqueness

`syllabus_versions_one_default_per_subject` unique index on `subject_id WHERE is_current = true`. Runtime selectors unchanged.

## Overlap enforcement

`EXCLUDE USING gist (subject_id WITH =, applicable_session_range WITH &&) WHERE (applicable_session_range IS NOT NULL)`.

Database-enforced: **YES**. NULL windows do not participate.

## Extension requirements

`btree_gist` (`CREATE EXTENSION IF NOT EXISTS`). Proved in disposable `lockdin-db-harness`. **Hosted apply of 0011 must create this extension** (owner/hosted-cutover consideration). Not created on hosted in this run.

## Migration

`lib/db/migrations/0011_open_sunfire.sql` (Drizzle generate + exclusion/generated-column SQL). Journal tag `0011_open_sunfire`. Does not touch `user_subjects` or 0010.

## Legacy compatibility

Existing versions remain. Pins untouched. User history untouched. No guessed Cambridge ranges. `valid_from`/`valid_to` text columns retained unused.

## Disposable DB proof

Harness: pre-0000 → 0000–0011 → journal → schema → dual-version DEFAULT/overlap/legacy NULL → syllabus db tests → cleanup. `LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB=1`. Hosted untouched.

## Tests

Harness reconstruction PASS. Loopback guard 20/20. Syllabus unit 22. API unit 119. API integration 42 after 0010 pin-test cleanup order adjusted for unique DEFAULT. Typecheck: pre-existing `createDatabasePoolConfig` / `validateDatabaseUrl` TS2305 on api-server; scripts typecheck PASS.

## Security

No RLS/grant/RPC changes. Function `lockdin_exam_session_ordinal` EXECUTE revoked from PUBLIC. 0010 `DO NOTHING` unchanged.

## Out of scope

Importer, 6.3C1/C2, 6.3D, 6.4, hosted 0011, merge, `profiles.exam_session` model.

## Future 6.3 sequence

- **6.3B:** immutable importer / publication lifecycle
- **6.3C1:** pin-aware reads
- **6.3C2:** exam-session-based new membership assignment
- **6.3D:** frontend/session UX where required
- **6.4:** pipeline release hardening / CI / operational closeout
