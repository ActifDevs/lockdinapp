# Phase 6 Slice 3C2A — Session Foundation

- **Date:** 2026-08-29
- **Feature branch:** `phase6-slice3c2a-session-foundation`
- **Base `origin/main`:** `9cf45c1fded885be7cddb568bc1c8f1b075f27c1`
- **Historical migrations `0000`–`0012`:** unchanged
- **Hosted apply of 0013:** **NOT PERFORMED**

## Baseline

Implementation started from clean `main` matching `origin/main`. Migration head before this slice: `0012_ordinary_penance`. No 0014.

## Owner decisions

Approved Model C:

- Per-membership intended exam session is the future authoritative assignment input.
- `profiles.exam_session` remains compatibility/display/default text.
- Changing the profile session must not rewrite pins or membership session metadata.
- Existing-membership session change is a future explicit repin (not implemented).

C2A staging (approved):

- Implement schema, resolver, session contract, optional metadata capture, minimal client, tests.
- New-membership assignment remains **LEGACY DEFAULT / `is_current`**.
- Do **not** add an env/runtime cutover flag.
- C2B is a later tracked RPC/migration change after Production applicability data exists.

## Migration 0013

`lib/db/migrations/0013_useful_husk.sql` (journal `when` `1788038002411`).

Adds nullable `user_subjects.intended_exam_year` and `user_subjects.intended_exam_series` (`exam_sitting_series`). Complete-or-empty CHECK. Four-digit year CHECK (`1000`–`9999`, same structural rule as past-paper years). No backfill. No pin rewrites.

## Membership session model

Legacy rows: both intended fields NULL, pin remains valid.

Stored pair is authoritative. GET `/user-subjects` echoes `intendedExamSession` or `null`. It is never inferred from `profiles.exam_session` or version applicability.

## Applicability resolver

`lockdin_resolve_applicable_syllabus_version(subject_id, exam_year, exam_series)`:

- published only
- `applicable_session_range` contains the session ordinal (inclusive 0011 semantics)
- exactly one match
- 0 or >1: fail closed (`no_applicable_syllabus_version` / `ambiguous_applicable_syllabus_version`)
- no `is_current` fallback
- `FOR SHARE` on candidates; function is `VOLATILE` so row locks are legal
- `EXECUTE` revoked from `PUBLIC`, `anon`, and `authenticated`

Helpers `lockdin_membership_session_from_request`, `lockdin_complete_onboarding_apply`, and `lockdin_replace_user_subjects_apply` are also not granted to students.

## Assignment remains DEFAULT

`lockdin_complete_onboarding` and `lockdin_replace_user_subjects` still pin **new** rows to `is_current`.

The resolver is implemented and harness-tested. It is **not** called by those RPCs in C2A.

Structured session on new memberships is **metadata capture only**.

## Onboarding contract

Existing required fields unchanged: `fullName`, `username`, `level`, `examSession`, `subjectIds`.

Optional:

- `intendedExamSession` `{ year, series }`
- `subjectSessionOverrides[]` `{ subjectId, year, series }`

Global structured session is copied to every new membership unless that subject has an override. Pins remain DEFAULT. Atomicity unchanged: one RPC, all-or-nothing.

Clients must not send `syllabusVersionId`.

## Settings contract

`PUT /user-subjects` still requires `subjectIds`. Optional same structured default/overrides.

Retained membership: pin and intended session unchanged (`ON CONFLICT DO NOTHING`).

New membership: DEFAULT pin; store supplied session or leave NULL.

Removed membership: existing delete semantics.

## Profile compatibility

`profiles.exam_session` schema unchanged. PATCH still updates display/default text only. Disposable proof: changing `exam_session` left pin and intended session untouched.

## RPC deployment compatibility

Strategy: **keep the currently deployed signatures**.

- `lockdin_complete_onboarding(text, text, text, text, integer[])` remains callable.
- `lockdin_replace_user_subjects(integer[])` remains callable.

New overloads add structured-session parameters. Old Production application code that omits those parameters continues to hit the original signatures after 0013 (hosted apply is still future). C2B may drop compatibility wrappers later.

## Client/OpenAPI

`lib/api-spec/openapi.yaml` updated. Regenerated `@workspace/api-zod` and `@workspace/api-client-react` via `pnpm --filter @workspace/api-spec codegen`. No hand-edits of generated clients.

Minimal frontend:

- picker options already carry `year` + `series`
- onboarding/Settings send `intendedExamSession` only when the selected label matches a picker option
- `"Other"` does not invent a structured session
- no per-subject override UI (6.3D)
- Feb/Mar picker still absent (6.3D). C2B must not enable until the Production client can collect every supported series.

## Security

`auth.uid()` only. No body `user_id`. No student-chosen `syllabus_version_id`. Resolver is not a student RPC.

## Disposable verification

`lockdin-db-harness` with loopback, exact disposable identity, `LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB=1`.

pre-0000 → 0000–0013 → journal → schema → lifecycle → C1 pin proof → C2A session/DEFAULT proof → syllabus DB tests → cleanup.

**PASS.** Cleanup contract verified.

## Tests

- API unit: 137/137
- Frontend: 212/212
- Syllabus unit: 36/36
- Harness target safety: 20/20
- Scripts / frontend / API typecheck: PASS
- OpenAPI codegen + `typecheck:libs`: PASS
- `git diff --check`: PASS
- Stock API integration 42/42: **NOT CLAIMED**

## Applicability-data dependency

Repository still has **no** authoritative Cambridge applicability windows. Hosted versions remain NULL. Separate owner-controlled workstream required: subject code, logical revision, first/last sitting, Cambridge document + citation. No filename/`current`/snippet authority. Prefer a version-controlled provenance artifact when that workstream starts.

## C2B cutover prerequisites

1. C2A deployed and healthy.
2. All selectable Production subjects have verified published applicability coverage.
3. Any needed new versions imported/published with verified windows.
4. Production client can supply every supported intended session (including Feb/Mar if the product supports it).
5. Legacy identity reconciled where the importer workflow requires it (separate owner authorization).
6. Resolver fixtures remain PASS.
7. Owner explicitly authorizes a **tracked** DB/RPC cutover (not an env flag).

Only then may new-membership assignment stop using DEFAULT.

## Rollout boundary

Closing C2A does **not** authorize a second Production syllabus version or strict assignment.

STRICT ASSIGNMENT: **NOT ENABLED**

HOSTED 0013: **NOT APPLIED**

HOSTED LEGACY ADOPTION: **NOT PERFORMED**

APPLICABILITY DATA: **NOT POPULATED**

HOSTED SECOND GRAPH: **NONE**

C2B: **NOT STARTED**

## Out of scope

Repin, 6.3D UX, importer changes, Cambridge research/import, migration 0014, hosted mutation, env cutover flag, Vercel/secrets.

## Final verdict

6.3C2A implementation is complete on the feature branch. Merge, hosted 0013, and C2B remain owner-gated.
