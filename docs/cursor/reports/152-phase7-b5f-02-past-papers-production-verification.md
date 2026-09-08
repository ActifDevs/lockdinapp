# LOCKDIN — PHASE 7 B5F-02 PAST PAPERS PRODUCTION VERIFICATION

**Date:** 2026-09-08 UTC

**Status:** PASS WITH REVIEW NOTE — core B5D-006 Production browser behavior,
cleanup, and runtime health are proven; responsive and keyboard checks remain
incomplete broader accessibility/release review items

## Scope and Evidence Boundaries

This continuation consolidated three deliberately separate evidence classes:

1. **Current read-only verification** performed on 2026-09-08 after the Codex
   interruption.
2. **Prior Codex Production browser evidence** captured during the original
   B5F-02 run.
3. **Post-interruption cleanup evidence** supplied by the completed cleanup
   run and reverified by current read-only database queries.

No product code, migration, deployment configuration, global subject
visibility, membership, study-option selection, or Production data was changed
during this continuation. No deployment was performed. No real beta invitation
was created or sent.

## A. Current Read-Only Verification

### Repository Baseline

- Canonical repository: `C:\Users\USER\lockdinapp`
- Branch: `main`
- B5F-01 implementation SHA: `297840c5d24e9d74ac8e5e52d08f6304bedcce05`
- `HEAD`: `297840c5d24e9d74ac8e5e52d08f6304bedcce05`
- `origin/main` after `git fetch origin --prune`:
  `297840c5d24e9d74ac8e5e52d08f6304bedcce05`
- Pre-report working tree: clean
- B5F-01 / Report 151: **CLOSED / PASS; unchanged**

### Deployment Verification

| Surface | Deployment | State | Git SHA |
| --- | --- | --- | --- |
| Web (`lockdinapp-web`) | `dpl_FUitJWZ6RZfQAY53XqLtNnK6KbL1` | READY | `297840c5d24e9d74ac8e5e52d08f6304bedcce05` |
| API (`lockdinapp`) | `dpl_D2Gx7cATuLfKWMQazEryrhn6FmFM` | READY | `297840c5d24e9d74ac8e5e52d08f6304bedcce05` |

Both deployments are Production deployments from `main` at the exact
authorized B5F-01 SHA. The deployed implementation is therefore live on both
surfaces. Redeployment during this continuation: **NONE**.

### Production Database Baseline and Final Invariants

The database inspection ran with PostgreSQL
`default_transaction_read_only=on`, began an explicit `BEGIN READ ONLY`,
confirmed `transaction_read_only = on`, and ended without a write.

| Invariant | Current result |
| --- | ---: |
| Migration count / head | 21 / `0020_subject_visibility_grants` |
| Subjects | 16 |
| Syllabus versions | 29 |
| Published / retired versions | 21 / 8 |
| Route sets / routes | 29 / 95 |
| Memberships | 15 |
| Route-assigned memberships | 2 |
| Study-option rows | 3 |
| Current-nine globally selectable | 9/9 |
| New-seven globally selectable | 0/7 |
| Visibility grants | 0 |
| Temporary 9093 membership | 0 |
| Temporary 9093 option rows | 0 |
| Past Paper attempts for 9093 | 0 |
| Product-enabled Feb/Mar rows | 0 |

The dedicated QA account still has exactly the historical membership set
`9489, 9708, 9709`, with 3 memberships, 2 route assignments, and 3 study-option
rows. This matches the established pre-B5F-02 baseline. No historical QA
membership, route, version, or option mutation was found.

### Current Runtime Health

- Canonical Web process health: `GET /api/healthz` → HTTP 200,
  `{"status":"ok"}`.
- Canonical Web database health: `GET /api/healthz/db` → HTTP 200,
  `{"status":"ok","database":"ok"}`.
- Standalone API process health: `GET /api/healthz` → HTTP 200.
- Standalone API database health: `GET /api/healthz/db` → HTTP 503,
  `status=degraded`, `database=down`.
- The API health response identifies the cause: its serverless runtime has a
  Supabase session-pooler connection on port 5432, while the runtime guard
  requires transaction pooling on port 6543.

Vercel Production log inspection over the retained three-day window found:

- unexpected Web 5xx: **NONE**;
- fatal/error-level events on Web or API: **NONE**;
- Past Papers failures: **NONE OBSERVED**;
- route-catalogue failures: **NONE OBSERVED**;
- visibility failures: **NONE OBSERVED**;
- one API 5xx: the continuation's own read-only `/api/healthz/db` probe, which
  reproduced the current 503 described above.

The three-day query covers the available original QA and cleanup period. It
does not prove retention beyond that window. The current API database-health
failure is a runtime/configuration blocker even though the deployment state is
READY and the canonical full-stack Web database health is OK.

## B. Prior Codex Production Browser Evidence

The following is **prior-run Production evidence**, not a browser check newly
executed by this continuation.

### Controlled QA State

- Dedicated internal QA account only
- Temporary subject: `9093 — English Language`
- One QA-only visibility grant
- QA catalogue while granted: 10 subjects
- Unauthenticated/no-grant catalogue: 9 subjects
- 9093 global visibility: remained hidden
- One temporary 9093 membership
- Syllabus version: 30
- Assessment route: 3
- Route type: AS
- Study-option rows: 0
- Existing membership changes: none

### On-Route Proof

- Component: 124
- Paper: `9093/1`
- Syllabus version: 30
- Relation to route 3: `ON_ROUTE`
- Selectable: **PASS**
- Off-route warning: **ABSENT**

### Same-Version Off-Route Proof

- Component: 128
- Paper: `9093/3`
- Syllabus version: 30
- Relation to route 3: `OFF_ROUTE_SAME_VERSION`
- Selectable: **PASS**
- Inline off-route warning visible: **PASS**

Switching component 128 back to component 124 removed the warning and restored
the on-route state: **PASS**.

No Past Paper attempt was submitted. The assessment route, pinned syllabus
version, existing memberships, and study-option selections were not changed.

### Warning Copy Provenance

The deployed B5F-01 implementation contains:

> This paper is outside your assessment route. Logging it will not change your
> route or syllabus.

The prior Codex Production run observed the inline warning. An independent
exact rendered-text capture was not separately retained, so this report does
not claim one.

## C. Post-Interruption Cleanup Evidence

The separate cleanup run reported:

- temporary 9093 membership: 0 / 1 removed;
- temporary 9093 options: 0 / 0;
- temporary 9093 attempt: 0 / 0;
- visibility grants: 0 / 1 removed;
- memberships: 15 / 15;
- QA catalogue: 9 / 9;
- normal catalogue: 9 / 9;
- current-nine global: 9/9;
- new-seven global: 0/7;
- historical QA state: unchanged;
- product changes: none;
- Production changes: cleanup only;
- final cleanup: **PASS**.

The current read-only verification independently reconfirmed all database-side
cleanup invariants: zero 9093 membership, option, attempt, and visibility-grant
residue; 15 total memberships; 9/9 current-nine globally selectable; 0/7
new-seven globally selectable; and the unchanged 3/2/3 QA profile.

## Responsive and Keyboard Status

- Responsive 390 × 844: **NOT COMPLETED DUE TO INTERRUPTED RUN**
- Keyboard: **NOT EXECUTED / INCOMPLETE**
- Full accessibility compliance: **NOT CLAIMED**

These omissions do not contradict the completed core warning-behavior proof,
but they remain explicit review items.

## B5D-006 Classification

The core product behavior itself is proven in Production:

- on-route warning absent: **PASS**;
- same-version off-route warning visible: **PASS**;
- off-route paper remains selectable: **PASS**;
- switching back removes warning: **PASS**;
- route mutation: **NONE**;
- version mutation: **NONE**;
- existing membership mutation: **NONE**;
- option mutation: **NONE**;
- temporary attempt: **NONE**;
- cleanup: **PASS**.

At the end of the first continuation, the supplied close gate also required
`runtime blocker: NONE`, while the standalone Production API failed database
health with HTTP 503. B5D-006 was therefore left **OPEN PENDING API
RUNTIME-HEALTH RESOLUTION AND READ-ONLY RECHECK** at that point.

That historical hold was an infrastructure/runtime issue, not contradictory
browser evidence and not evidence that the B5F-01 warning implementation
regressed. It was resolved by B5F-02R below. B5F-01 remains **CLOSED / PASS**.

## D. B5F-02R Standalone API Runtime Resolution — 2026-09-08 UTC

### Previous Blocker

- Previous standalone API deployment:
  `dpl_D2Gx7cATuLfKWMQazEryrhn6FmFM`
- State / SHA: READY /
  `297840c5d24e9d74ac8e5e52d08f6304bedcce05`
- Process health: HTTP 200
- Database health: HTTP 503, `status=degraded`, `database=down`
- Root cause reported by the runtime guard: the serverless API used the
  Supabase session pooler on port 5432 instead of transaction pooling on port
  6543.

### Authorized Configuration Correction

Only the standalone API Vercel project `lockdinapp` was targeted. Its
Production `DATABASE_URL` changed from Supavisor session pooling on port 5432
to Supavisor transaction pooling on port 6543.

The replacement was derived from the existing same-project URI. Safe
comparison established that host, database, database username/project
reference, credential, and query/SSL configuration were preserved; only the
external pooler port changed. No password-bearing URI, token, or secret value
was printed or recorded.

The pre-existing Vercel environment row targeted both Preview and Production.
It was normalized into separate sensitive rows so Production alone receives
the transaction-pooler value and Preview retains its original session-pooler
value. The branch-specific Preview override remained unchanged. No Preview or
Web deployment was triggered.

No Web environment variable, Supabase key, auth setting, migration setting,
Development variable, product source, or Production data was changed.

### Corrected Deployment

- New standalone API deployment:
  `dpl_nkxPbGV7P8yip42sJ284iQ4sddSo`
- Target / state: Production / READY
- Source branch / SHA: `main` /
  `297840c5d24e9d74ac8e5e52d08f6304bedcce05`
- Deployment mechanism: redeploy of the exact previous API deployment to
  activate the environment correction
- Web redeployment: **NONE**

### Post-Correction Health and Logs

- Standalone API `GET /api/healthz`: HTTP 200, `status=ok`
- Standalone API `GET /api/healthz/db`: HTTP 200, `status=ok`, `database=ok`
- Repeated corrected-deployment DB-health requests: **CONSISTENTLY 200**
- Canonical Web `GET /api/healthz`: HTTP 200, `status=ok`
- Canonical Web `GET /api/healthz/db`: HTTP 200, `status=ok`, `database=ok`

Logs scoped to the corrected API deployment contained seven verification
requests, all HTTP 200. Post-fix results:

- unexpected 5xx: **NONE**;
- fatal/error-level events: **NONE**;

- database connection/pool or exhaustion failures: **NONE OBSERVED**;
- authentication failures: **NONE OBSERVED**;
- route-catalogue failures: **NONE OBSERVED**;
- Past Papers failures: **NONE OBSERVED**.

The historical pre-fix 503 remains documented above and in the earlier runtime
section; it is classified as the resolved blocker, not erased.

### Post-Correction Production Invariants

The final database recheck again used
`default_transaction_read_only=on` plus `BEGIN READ ONLY` and confirmed:

| Invariant | Final result |
| --- | ---: |
| Migration count / head | 21 / `0020_subject_visibility_grants` |
| Subjects | 16 |
| Syllabus versions | 29 |
| Published / retired versions | 21 / 8 |
| Route sets / routes | 29 / 95 |
| Memberships | 15 |
| Route-assigned memberships | 2 |
| Study-option rows | 3 |
| Visibility grants | 0 |
| Current-nine globally selectable | 9/9 |
| New-seven globally selectable | 0/7 |
| Temporary 9093 membership / options / attempts | 0 / 0 / 0 |
| Product-enabled Feb/Mar rows | 0 |

Production data mutation during B5F-02R: **NONE**.

### Final B5D-006 Classification

The existing core Production browser proof remains PASS, cleanup remains PASS,
and both standalone API process and database health now pass with no blocking
post-fix runtime errors. The runtime blocker is **RESOLVED**.

**B5D-006: FIXED IN PRODUCTION**

## Compliance and Change Boundary

- Product-code changes: **NONE**
- Migration changes: **NONE**
- Deployment configuration changes: **standalone API Production
  `DATABASE_URL` pooler mode only**
- Production data changes during continuation: **NONE**
- Global subject-visibility changes: **NONE**
- Real beta invitations: **NONE**
- B5E QA repeated: **NO**
- Report 151 modified: **NO**
- Report 152 committed: **NO**
- Report 152 pushed: **NO**

## Final Verdict

**PASS WITH REVIEW NOTE**

The core B5D-006 browser proof and cleanup are internally consistent, the
canonical Web surface remains healthy, and the corrected standalone API is
READY on the authorized SHA with process and database health both returning
HTTP 200. B5D-006 is **FIXED IN PRODUCTION**. Responsive and keyboard checks
remain review notes and do not undermine the core warning proof.

## Recommendation

Owner review and freeze Report 152 with the responsive/keyboard review note,
then formally close B5D-006 and resume the broader Phase 7 accessibility and
release-gate sequence. Do not repeat B5E QA, recreate the 9093 fixture, enable
global new-seven visibility, or invite real beta users.
