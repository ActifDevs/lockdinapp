# LOCKDIN — PHASE 7 B5G-03R2 SUBJECT VALIDATION PRODUCTION VERIFICATION

**Date:** 2026-09-08 UTC

**Status:** PASS — A11Y-003 fixed in Production; B5G accessibility remediation
closed

## Scope and Release Boundary

This was the authorized targeted Production verification of the Study Plan
empty-Subject validation path only. It did not repeat A11Y-001, A11Y-002,
A11Y-004, B5E, or B5F QA.

- B5G-03 historical blocked SHA:
  `75f84f1386d9e258f241a33804fb9c887e2a5ab4`
- B5G-03R implementation SHA:
  `438876648ca5cf18d07a7085a109ce7e18cf2536`
- Repository preflight: `main`; `HEAD = origin/main =` B5G-03R SHA; clean
- Existing dedicated internal QA account only
- Product-code changes: **NONE**
- Migration/configuration/visibility changes: **NONE**
- Real beta invitations: **NONE**
- Full accessibility certification: **NOT CLAIMED**

## Production Deployment

Both Production projects were already READY on the exact B5G-03R SHA through
automatic deployment. No manual deployment or redeployment occurred.

| Surface | Deployment ID | State | Git SHA |
| --- | --- | --- | --- |
| Canonical Web (`lockdinapp-web`) | `dpl_6Uefg1Ufw99NSwztKT9dQqZgjQQX` | READY | `438876648ca5cf18d07a7085a109ce7e18cf2536` |
| Standalone API (`lockdinapp`) | `dpl_9jNseSAmEUrYp1bFkyxYpqKNfZpS` | READY | `438876648ca5cf18d07a7085a109ce7e18cf2536` |

Deployment classification: **AUTO** — already completed before B5G-03R2;
deployment action during this slice: **NONE**.

## Runtime Health Preflight and Final Health

The same results were observed before and after browser QA:

| Probe | Result |
| --- | --- |
| Web `GET /api/healthz` | HTTP 200, `status=ok` |
| Web `GET /api/healthz/db` | HTTP 200, `status=ok`, `database=ok` |
| API `GET /api/healthz` | HTTP 200, `status=ok` |
| API `GET /api/healthz/db` | HTTP 200, `status=ok`, `database=ok` |

No runtime blocker was present. No Vercel environment variable, including
`DATABASE_URL`, was changed.

## A11Y-003 Targeted Production Proof

The authenticated Production Study Plan was opened with the existing dedicated
QA account. Add task was focused and activated with keyboard Enter. Task Title
and Subject were left in their real empty/unselected UI states, then Add task
was activated.

Observed result:

| Requirement | Production result |
| --- | --- |
| Submission rejected | PASS — dialog remained open |
| Task Title visible message | PASS — `Title is required` |
| Subject visible message | PASS — `Subject is required` |
| Task Title `aria-invalid` | PASS — `true` |
| Subject `aria-invalid` | PASS — `true` |
| Task Title association | PASS — `aria-describedby` included its rendered message ID |
| Subject association | PASS — `aria-describedby` included its rendered message ID |
| First-invalid focus | PASS — active element was the Task Title input |
| Feedback not color-only | PASS — both messages rendered as readable text |
| Raw coercion/Zod copy | NONE |
| Raw server/database detail | NONE |

The rendered accessibility tree exposed both labels, both controls, and both
required messages. It did not contain `Expected number`, `NaN`, `invalid_type`,
or equivalent implementation terminology.

The optional malformed-value path was not manufactured in Production; its
local B5G-03R automated coverage remains the evidence for `Select a valid
subject`.

## Close and Persistence Safety

The invalid form was closed with Escape. No valid submission occurred and no
API mutation was initiated. Focus naturally returned to Add task; this was
recorded as incidental preservation evidence, not a repeat of the A11Y-002
matrix.

Production task and Past Paper attempt totals were checked in read-only
transactions immediately before and after the UI action:

| Row count | Before | After | Drift |
| --- | ---: | ---: | ---: |
| Tasks | 16 | 16 | 0 |
| Past Paper attempts | 10 | 10 | 0 |

Temporary tasks, attempts, memberships, and visibility grants created during
B5G-03R2: **0 / 0 / 0 / 0**.

## Final Production Invariants

The database query set `default_transaction_read_only=on`, opened an explicit
`BEGIN READ ONLY` transaction, queried aggregate invariants only, and rolled
back.

| Invariant | Final result |
| --- | ---: |
| Migration count / head | 21 / `0020_subject_visibility_grants` |
| Memberships | 15 |
| Route-assigned memberships | 2 |
| Study-option rows | 3 |
| Current-nine globally selectable | 9/9 |
| New-seven globally selectable | 0/7 |
| Visibility grants | 0 |
| Historical membership / route / option drift | 0 / 0 / 0 |

## Runtime Logs

Vercel Production log queries covering the narrow QA window found:

- unexpected Web 5xx: **0**;
- unexpected API 5xx: **0**;
- Web error-level events: **0**;
- API error-level events: **0**;
- fatal events: **0**; and
- database-health failures: **0**.

The Production browser console captured no warning or error entries.

## Final Accessibility Findings

- A11Y-001: **FIXED IN PRODUCTION**
- A11Y-002: **FIXED IN PRODUCTION**
- A11Y-003: **FIXED IN PRODUCTION**
- A11Y-004: **FIXED IN PRODUCTION**

## Final Verdict

**PASS**

B5G targeted accessibility remediation is **CLOSED / PASS**. This is targeted
release-readiness remediation evidence, not a full accessibility certification.

Owner review and freeze Report 157, then stop creating further B5G engineering
slices and move to the broader Phase 7 pre-beta/release-gate reconciliation.
Do not globally enable new-seven subjects or invite real beta users without
separate authorization.
