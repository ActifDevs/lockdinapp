# Step 3: Dashboard Query Hardening

## Objective
Reduce `GET /api/dashboard/summary` query fan-out so the route remains efficient and less connection-hungry under production traffic.

## Why This Step Exists
- Step 1 stabilized pool usage, but did not remove the route's high internal query count.
- The dashboard is a hot endpoint and should not depend on per-subject/per-task/per-exam enrichment queries.

## Scope
- keep the response contract unchanged
- reduce N+1 query patterns inside `artifacts/api-server/src/routes/dashboard.ts`
- preserve existing dashboard behavior for empty-state and populated-state paths

## Success Criteria
- dashboard route uses bulk reads and in-memory joins where possible
- route tests still pass
- no frontend contract changes are required

## Implementation
The route contract was kept unchanged. The work was limited to `artifacts/api-server/src/routes/dashboard.ts`.

### Query hardening changes
#### Subjects
- still fetched once
- now also used to build a `subjectById` map for later enrichment

#### Syllabus topics
- previously queried once per subject
- now fetched once in bulk and grouped in memory by `subjectId`

#### Tasks
- still fetched once
- subject/topic enrichment no longer issues per-task queries
- enrichment now uses:
  - `subjectById`
  - `topicById`

#### Past paper attempts
- previously queried once per subject, then fetched the latest component row per subject
- now all attempts are fetched once and grouped by `subjectId`
- latest component IDs are collected, fetched in one bulk query, and mapped in memory

#### Exam dates
- still fetched once
- subject enrichment now uses `subjectById` instead of per-exam queries

## Result
The route moved away from repeated N+1 enrichment patterns while preserving the same response shape required by `GetDashboardSummaryResponse.parse(...)`.

## Verification
- `@workspace/api-server` typecheck passed
- `@workspace/api-server` tests passed
- no lint issues in the route or report

## Outcome
- **Status:** complete
- **Production benefit:** dashboard remains less query-heavy and less connection-hungry after the Step 1 pool stabilization
- **Contract impact:** none
