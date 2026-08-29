# Phase 6 Slice 3A — Version Lifecycle Schema Foundation

## Baseline

- Branch: `phase6-slice3a-version-lifecycle-schema`
- Base `origin/main`: `c60f3a94a828dd4bfd2ee1eda424ea2ae37f3e93`
- Prerequisite `0010` remains unmodified
- Historical migrations `0000`–`0010`: not edited

## Owner review

**PASS WITH REQUIRED CORRECTION**

Corrections applied in unpublished `0011` (not hosted):

- overlap exclusion lifecycle-scoped to **published** rows with non-null windows;
- DEFAULT constrained to **published** lifecycle (`NOT is_current OR lifecycle = 'published'`);
- publication-transition schema proof (draft overlapping published, then retire A / publish B in one transaction).

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
- CHECK `syllabus_versions_default_must_be_published`

Immutability of published graphs: **FUTURE IMPORTER CONTRACT** (6.3B). No new triggers.

## Exam-session representation

Ordinal: `year * 3 + {Feb/Mar:0, May/June:1, Oct/Nov:2}` via `lockdin_exam_session_ordinal`. Windows nullable. Complete-or-empty CHECK. Order CHECK plus generated-range bounds.

## Default uniqueness

`syllabus_versions_one_default_per_subject` unique index on `subject_id WHERE is_current = true`. DEFAULT must be published. Runtime selectors unchanged.

## Overlap enforcement

`EXCLUDE USING gist (subject_id WITH =, applicable_session_range WITH &&) WHERE (applicable_session_range IS NOT NULL AND lifecycle = 'published')`.

Database-enforced: **YES**. Draft/retired/archived overlapping a published window is allowed. Two published windows for the same subject are not.

## Extension requirements

`btree_gist` (`CREATE EXTENSION IF NOT EXISTS`). Proved in disposable `lockdin-db-harness`. **Hosted apply of 0011 must create this extension**. Not created on hosted in this run.

## Hosted-apply preparation (read-only; not performed)

Before any future hosted apply of 0011, verify:

A. Hosted journal head is still exactly **0010**.
B. No subject has more than one `is_current = true` version.
C. Existing rows are compatible with lifecycle default `published`, DEFAULT-must-be-published, and nullable windows.
D. `btree_gist` is available/creatable on the authorized hosted project.

## Migration

`lib/db/migrations/0011_open_sunfire.sql`. Journal tag `0011_open_sunfire`. Does not touch `user_subjects` or 0010. Status: **unmerged / unapplied hosted**.

## Legacy compatibility

Existing versions remain. Pins untouched. User history untouched. No guessed Cambridge ranges. `valid_from`/`valid_to` text columns retained unused.

## Disposable DB proof

Harness: pre-0000 → 0000–0011 → journal → schema → lifecycle constraint + publication-transition proof → syllabus db tests → cleanup.

## Tests

Correction-pass evidence is recorded in the implementation closeout. Typecheck: pre-existing `createDatabasePoolConfig` / `validateDatabaseUrl` TS2305 on api-server if still present.

## Security

No RLS/grant/RPC changes. Function `lockdin_exam_session_ordinal` EXECUTE revoked from PUBLIC. 0010 `DO NOTHING` unchanged.

## Out of scope

Importer, 6.3C1/C2, 6.3D, 6.4, hosted 0011, merge, `profiles.exam_session` model.

## Future 6.3 sequence

- **6.3B:** NOT STARTED — immutable importer / publication lifecycle
- **6.3C1:** NOT STARTED — pin-aware reads
- **6.3C2:** NOT STARTED — exam-session-based new membership assignment
- **6.3D:** NOT STARTED — frontend/session UX where required
- **6.4:** NOT STARTED — pipeline release hardening / CI / operational closeout
