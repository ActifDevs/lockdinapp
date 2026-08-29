# Phase 6 Slice 3C1 — Pin-Aware Reference Context

## Baseline

- Feature branch: `phase6-slice3c1-pin-aware-reference-context`
- Base `origin/main`: `cff8bbd7e157afe33c80b59eca5df27e3f4a4fc2`
- Migration head: **0012_ordinary_penance** (file unchanged)
- Prerequisite: 6.3B CLOSED (hosted 0012 applied; no second hosted graph)

## Resolver contract

Shared helper: `artifacts/api-server/src/lib/resolve-reference-syllabus-version.ts`.

Inputs: `subjectId` plus verified `req.userId` when present. Membership rows are loaded with explicit `(user_id, subject_id)` — never another user’s membership.

| Result | Meaning |
| --- | --- |
| `membership` | Existing pin served (`published` / `retired` / `archived`) |
| `default` | Successful lookup proved **no** membership row; use `is_current` |
| `none` | No DEFAULT version (catalogue empty) |
| `invariant` | Draft pin or broken/mismatched pin → HTTP **409** |
| thrown `ReferenceContextLookupError` | Database/API lookup failure → **500**, **not** DEFAULT |

DEFAULT is never used when a membership row exists.

## Catalogue DEFAULT reads

`GET /api/subjects` and `GET /api/subjects/:subjectId` `topicsTotal` count topics through `syllabus_topics → syllabus_units → syllabus_versions WHERE is_current`. Not `syllabus_topics.subject_id` alone.

Anonymous/unenrolled syllabus and assessment-components use the same DEFAULT version id.

No DEFAULT version: empty graph / `[]` / zero counts (existing empty-safe style).

## Membership PIN reads

Authenticated caller with a `user_subjects` row: syllabus units, assessment components, membership `topicsTotal`, and progress universes use `user_subjects.syllabus_version_id`.

`lockdin_replace_user_subjects` / onboarding assignment: **unchanged** (6.3C2).

## Syllabus graph

`GET /api/subjects/:subjectId/syllabus` remains optional-auth.

Selector: `syllabus_units.syllabus_version_id = resolvedVersionId`. Topics/outcomes load only as descendants. Progress merge only for returned topic IDs.

## Assessment components

Route and global policy: **optional** auth (anonymous still allowed).

Membership → pin; otherwise DEFAULT. Filter `assessment_components.syllabus_version_id`.

No `Cache-Control` / shared CDN policy on api-server routes; pin-specific JSON is not cached as public.

## User-subject aggregates

`subject.topicsTotal` is pin-scoped. PUT readback uses the same builder. Draft/broken pins on list/readback: 409.

## Progress aggregates

`getUserSubjectProgress` loads `subject_id, syllabus_version_id`, topics via units of those versions, and percentages only on that universe. Off-pin `topic_progress` remains stored and is excluded.

Dashboard/progress inherit this. Task/paper/exam historical totals are not pin-filtered.

## Historical read preservation

Task GET still enriches stored `topic_id`. Past-paper GET/performance still enrich stored `component_id`. No remapping, no hiding off-pin history.

Exam dates: **not version-scoped**.

## Current-context write validation

Narrow checks only:

- `POST /api/tasks` if `topicId` present: topic exists, subject matches, caller membership, topic unit version = pin.
- `POST /api/past-paper-attempts`: component exists, subject match (existing), then component version = pin (not merely same subject).
- `PATCH`/`DELETE /api/syllabus-topics/:topicId`: topic on caller pin before RPC.

Off-pin / not enrolled: **400** `Invalid request`. Missing topic: **404**. Draft/broken pin: **409**. No version IDs leaked.

RPC `lockdin_upsert_topic_progress` unchanged (no 0013).

## Lifecycle handling

published / retired / archived pin: served. draft pin: 409. No DEFAULT fallback from invariant.

## Cache/account-switch safety

`auth-provider.tsx` already `queryClient.clear()` when `previousUserId !== nextUserId`, on logout, and on `SIGNED_OUT`. Contract test added.

Settings membership PUT now invalidates syllabus and assessment-component query keys for selected + resulting subject IDs (in addition to dashboard/progress). Keys remain `subjectId` only.

## Security

Resolver uses verified `req.userId` only. Cross-user pins isolated in unit tests and harness. Owned-row `user_id` filters/RLS unchanged. No pin mutation. No hosted mutation.

## Multi-version disposable proof

`lockdin-db-harness` step **Prove pin-aware multi-version reference isolation**: subject `C1PIN01`, Graph A DEFAULT, Graph B published non-default, draft fixture, User A pin A, User B pin B, DEFAULT topic count = A only, units by `syllabus_version_id` unmixed, off-pin progress excluded from pin universe but stored, historical task keeps B `topic_id`. Cleanup deletes memberships/tasks/progress before subject.

Harness reconstruction (this slice): **PASS** including 0000–0012, lifecycle proof, C1 proof, syllabus DB 29, cleanup.

## Single-version regression

Production remains one graph per subject; DEFAULT and pin coincide. Response shapes unchanged. Unit tests keep existing catalogue/auth contracts.

## Tests

- API unit: **133/133** (was 119; resolver, writes, optional auth, progress universe, syllabus off-pin)
- Frontend: **209/209**
- Syllabus offline: **36/36**
- Harness target-safety: **20/20**
- Disposable harness: **PASS**
- Scripts typecheck: **PASS**
- Frontend typecheck: **PASS**
- API typecheck: **PASS** after refreshing local `@workspace/db` declaration emit (stale composite `.d.ts` had omitted `lifecycle`; `dist/` is gitignored). Not a product schema change.

Stock API integration runner still bound to ordinary `lockedinapp` workdir. **Do not claim 42/42.**

## Known limitations

Stock integration runner not retargeted. Multi-version HTTP-against-ordinary-local-DB is not this slice’s proof vehicle.

## Rollout boundary

SCHEMA MIGRATION: **NONE**

HOSTED LEGACY ADOPTION: **NOT PERFORMED**

HOSTED SECOND GRAPH: **NONE**

REAL SECOND PRODUCTION VERSION: **NOT AUTHORIZED**

6.3C2: **NOT STARTED** — new membership still pins `is_current`; `profiles.exam_session` still global.

## Out of scope

Merge, hosted apply/adopt/import/publish, 0013, exam-session assignment, Cambridge windows, frontend version selector, repinning, historical backfill.

## Final verdict

6.3C1 **implementation PASS** on the feature branch. Merge and hosted second graph **not performed**. Owner review required before merge.
