# Step 4: Subjects And Progress Query Audit

## Objective
Reduce query fan-out in the highest-volume overview endpoints outside dashboard:

- `GET /api/subjects`
- `GET /api/progress/overview`

## Why This Step Exists
- Both routes still performed per-subject query work after Step 3.
- These overview endpoints are likely to be hit often and should not depend on repeated per-subject reads.

## Scope
- preserve response contracts
- replace repeated subject/topic/paper scans with bulk reads and in-memory grouping
- leave single-subject detail handlers unchanged unless required

## Success Criteria
- `/api/subjects` no longer enriches the full list with per-subject query fan-out
- `/api/progress/overview` computes overview metrics from bulk reads
- existing API tests continue to pass

## Implementation
### `GET /api/subjects`
The list route previously called `enrichSubject()` for every subject, which in turn ran separate queries for:
- syllabus topics
- tasks
- recent paper
- recent component

The route now:
- fetches all subjects once
- fetches all topics once and groups by `subjectId`
- fetches all tasks once and groups by `subjectId`
- fetches all past paper attempts once and captures the latest paper per subject
- fetches required components in one bulk query
- computes list enrichment in memory

Single-subject handlers still use `enrichSubject()` for now; this step only targeted the full list endpoint.

### `GET /api/progress/overview`
The route previously queried:
- topics once per subject for syllabus completion
- papers once per subject
- topics again once per subject for attention-needed logic

The route now:
- fetches all subjects once
- fetches all topics once and groups by `subjectId`
- fetches all past paper attempts once and groups by `subjectId`
- reuses grouped data for both syllabus completion and subject-attention calculations

## Verification
- `@workspace/api-server` typecheck passed
- `@workspace/api-server` tests passed
- no lint issues in the touched files

## Outcome
- **Status:** complete
- **Production benefit:** overview routes now place less pressure on the database pool and issue fewer repeated reads under load
- **Contract impact:** none
