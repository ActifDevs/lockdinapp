# Phase 6 Slice 3C2B2 — Strict Session-Aware Assignment

- **Date:** 2026-08-30
- **Feature branch:** `phase6-slice3c2b2-strict-assignment`
- **Base `origin/main`:** `08c777f08d330bd2adec6451332e52f59e687e16`
- **Historical migrations `0000`–`0014`:** unchanged
- **Hosted apply of 0015:** **NOT PERFORMED**

## Baseline

Implementation started from clean `main` matching `origin/main` after Report 104. Hosted Production remains `0014_perpetual_nighthawk`, applicability 9/9, policy 27 rows, strict assignment OFF.

## Owner contract

New membership assignment is:

subject + effective structured intended session → `lockdin_resolve_applicable_syllabus_version` → exact `syllabus_version_id`.

`DEFAULT` / `is_current` does not participate. There is no profile-text fallback and no inference of year/series. Existing pins stay immutable on retain, profile PATCH, and later publish/DEFAULT changes. Session completeness is required only for **new** membership rows.

## Migration 0015

`lib/db/migrations/0015_silent_sentinel.sql` (journal `when` `1788051000000`).

Function-body cutover only: `lockdin_complete_onboarding_apply` and `lockdin_replace_user_subjects_apply`. No new tables. No applicability/policy seed.

Legacy signatures remain and call the apply functions with NULL session arrays.

## Onboarding assignment

Every onboarding subject is new. Effective session = override if present, else global structured pair. Incomplete session → `intended_exam_session_required`. Then resolver pin + store the pair. One atomic write; any failure writes nothing.

Subject existence is required. A current DEFAULT version is **not** required.

## Settings assignment

Retained rows: pin and intended session preserved (`INSERT` only for subjects not already held).

Removed rows: existing delete semantics.

New rows: require complete effective session, then resolver pin.

If any new row cannot resolve, the whole replacement fails.

## Retained membership behavior

Retained-only and removal-only calls with no structured session succeed. Legacy NULL-session memberships remain readable and retainable.

## Session-required semantics

Stable DB message: `intended_exam_session_required` (`22023`).

Do not parse `profiles.exam_session`. Do not guess DEFAULT.

## Resolver/error mapping

API maps:

| DB message | HTTP | Client error |
|---|---|---|
| `intended_exam_session_required` | 400 | Choose a supported exam session. |
| `no_applicable_syllabus_version` | 400 | No syllabus matches that exam session. |
| `ambiguous_applicable_syllabus_version` | 409 | That exam session cannot be assigned right now. |
| `invalid_subject_session_overrides` | 400 | Invalid subject session override. |

No function names, version IDs, or candidate lists.

## Frontend compatibility

Structured May/June and Oct/Nov picker options still send `{ year, series }`.

Onboarding blocks `Other` before submit. Settings blocks `Other` only when the save would **add** a subject. Profile save may still store `Other` as display text. Feb/Mar is not added to the picker.

## Public DEFAULT boundary

Anonymous/unenrolled catalogue selection is unchanged (C1 DEFAULT). Resolver remains `EXECUTE`-revoked and is used only inside assignment RPCs.

## Disposable multi-version proof

`proveStrictAssignment`: DEFAULT A + applicable B; onboarding 2026 May/June pins **B**. Settings retain/add, missing-session, overrides, Feb/Mar, outside-range, atomic failure, ambiguity (temporary overlap-constraint drop, same method as C2B1), publish-does-not-repin.

## Atomic failure proof

Valid subject + out-of-range override on a second subject → no memberships written. Failed Settings add of Y leaves X unchanged.

## Security

`auth.uid()` only. Clients cannot send `syllabusVersionId`. Resolver and apply helpers stay ungranted to `anon`/`authenticated`.

## Tests

- API: 139/139
- Frontend: 213/213
- Syllabus unit: 39/39
- Harness target safety: 20/20
- Full disposable pre-0000 → 0015: PASS
- Typecheck: PASS
- `git diff --check`: PASS
- Stock API integration: NOT CLAIMED

## Deployment compatibility

Keep old RPC signatures.

After 0015:

- Legacy onboarding with subjects and no structured session → fail closed.
- Legacy Settings: retain/remove-only may succeed; any new membership without session fails.
- Compatibility wrappers do **not** restore DEFAULT.

Recommended expand/cutover:

1. Deploy application (error mapping + `Other` create-path guard). C2A already sends structured session for known picker labels, so Production on 0014 still assigns DEFAULT until 0015.
2. Apply hosted 0015 in a later authorized run.
3. Smoke onboarding (known sitting) and Settings retain-only / new-add.

0015 may land before the app: known sittings already send structured fields; `Other` onboarding fails closed instead of pinning DEFAULT.

## Hosted state

Read-only expectation for this run (no hosted mutation):

HOSTED 0015: **NOT APPLIED**

STRICT ASSIGNMENT IN PRODUCTION: **NOT ENABLED**

FEATURE STRICT ASSIGNMENT: **IMPLEMENTED** (disposable)

EXISTING PINS: **UNCHANGED**

PRODUCTION APPLICABILITY: **9/9**

PRODUCTION POLICY: **27 ROWS**

SECOND GRAPH: **NONE**

## Rollout boundary

Do not merge or apply 0015 until owner preview/review.

## Preview requirements

Owner review of 0015 RPC semantics, error mapping, and `Other` UX. Hosted apply is a later authorized step.

## Final verdict

C2B2 implementation is on the feature branch only. Production assignment remains LEGACY DEFAULT until hosted 0015.
