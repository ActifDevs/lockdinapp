# LOCKDIN — PHASE 7 B5G-03 ACCESSIBILITY PRODUCTION REGRESSION

**Date:** 2026-09-08 UTC

**Status:** BLOCKED — three fixes verified in Production; A11Y-003 remains open
because the empty Subject error exposes raw coercion language

## Scope and Safety

This was the authorized targeted Production regression for the four B5G-02
accessibility findings only. It did not repeat B5E/B5F QA and did not change
product code, migrations, configuration, Production data, subject visibility,
or invitations.

- B5G-01 close SHA: `90d393943242513aafc5e1a3c89b2ed179d51b9c`
- B5G-02 implementation SHA:
  `8447de0c74ac8d72ec60ec7b071b5d26e7f2604e`
- Repository preflight: `main`; `HEAD = origin/main =` B5G-02 SHA; clean
- Dedicated existing internal QA account only
- Full accessibility certification: **NOT CLAIMED**
- Real beta invitations: **NONE**

## Production Deployment

Both projects were already serving the exact B5G-02 SHA through automatic
deployment. No manual deployment or redeployment occurred.

| Surface | Deployment ID | State | Git SHA |
| --- | --- | --- | --- |
| Canonical Web (`lockdinapp-web`) | `dpl_4G9LgZGQAhRwAKxXjexiBh623mau` | READY | `8447de0c74ac8d72ec60ec7b071b5d26e7f2604e` |
| Standalone API (`lockdinapp`) | `dpl_4itXHSTjybFPV2kwC8pGTWYqqNNU` | READY | `8447de0c74ac8d72ec60ec7b071b5d26e7f2604e` |

Deployment during slice: **NONE** (the inspected deployment was automatic and
already READY before this slice).

## Runtime Health

Preflight and final probes both returned:

| Probe | Result |
| --- | --- |
| Web `GET /api/healthz` | HTTP 200, `status=ok` |
| Web `GET /api/healthz/db` | HTTP 200, `status=ok`, `database=ok` |
| API `GET /api/healthz` | HTTP 200, `status=ok` |
| API `GET /api/healthz/db` | HTTP 200, `status=ok`, `database=ok` |

The standalone API remains compatible with the corrected Production
transaction-pooler configuration: its deployed runtime guard rejects Supabase
session pooling on port 5432 in serverless operation, and the READY deployment
served repeated process/database health checks successfully. `DATABASE_URL`
was not read out, printed, or changed.

## Production Database Baseline and Final Safety

The database check set `default_transaction_read_only=on`, opened an explicit
`BEGIN READ ONLY` transaction, queried only aggregate invariants, and rolled
back.

| Invariant | Result |
| --- | ---: |
| Migration count / head | 21 / `0020_subject_visibility_grants` |
| Memberships | 15 |
| Route-assigned memberships | 2 |
| Study-option rows | 3 |
| Current-nine globally selectable | 9/9 |
| New-seven globally selectable | 0/7 |
| Visibility grants | 0 |
| Product-enabled Feb/Mar rows | 0 |
| Temporary 9093 memberships / attempts | 0 / 0 |

No form was submitted to an API. Temporary tasks, attempts, memberships, and
visibility grants created during B5G-03 were all **0**.

## A11Y-001 — Settings Route Radios

**FIXED IN PRODUCTION**

The existing History membership began on Full A Level. Keyboard-only proof
established:

- ArrowRight wrapped to AS Level, updated the single checked radio, moved focus,
  and moved `tabIndex=0` to that radio;
- ArrowLeft restored Full A Level;
- ArrowDown repeated the forward behavior;
- ArrowUp restored Full A Level;
- exactly one radio remained checked after every key; and
- all non-active radios had `tabIndex=-1`.

Update assessment and Save subjects were never activated. A fresh Settings load
showed persisted Full A Level plus the same three selected History options:
Modern Europe, origins of the First World War, and Depth Study 1. Historical
membership, route, and option drift: **0 / 0 / 0**.

## A11Y-002 — Dialog Focus Restoration

**FIXED IN PRODUCTION**

| Flow | Escape | Cancel | Result |
| --- | --- | --- | --- |
| Study Plan → Add task | Focus returned to Add task | Focus returned to Add task | PASS |
| Past Papers → Log paper | Focus returned to Log paper | Focus returned to Log paper | PASS |

Both forms opened using keyboard Enter. Neither form submitted data. Successful
close was not manufactured in Production; the B5G-02 automated proof remains
the evidence for that path. No keyboard trap was observed.

## A11Y-003 — Study Plan Validation Messages

**OPEN — MEDIUM**

Empty Add task submission was rejected, created no task, and moved focus to the
first invalid field. Both required fields had `aria-invalid=true`; both
`aria-describedby` values referenced their rendered message IDs; and both
messages were visibly readable rather than color-only.

However, only the title message was suitable user-facing copy:

- Task Title: `Title is required` — PASS
- Subject: `Expected number, received nan` — FAIL

The Subject text is raw schema/coercion terminology, not `Subject is required`
or a user-facing equivalent. It violates the explicit B5G-03 requirement not to
expose implementation details. B5G-02 fixed the empty message-node rendering
root cause but did not fix the schema's empty-value coercion message. The
original finding therefore cannot be classified as fully fixed in Production.

## A11Y-004 — Mobile More Escape

**FIXED IN PRODUCTION**

At an explicit 390 × 844 viewport:

- keyboard Enter opened More and set `aria-expanded=true`;
- Past papers, Calendar, and Settings were keyboard reachable;
- Escape from within the disclosure closed it;
- `aria-expanded` became `false`; and
- focus returned to the More navigation button.

The disclosure was reopened with Enter and closed again with Escape. No
destination was activated.

## Targeted 390 × 844 Responsive Regression

| Surface | Result |
| --- | --- |
| Settings | PASS — document `scrollWidth = clientWidth`; route controls and Save remained reachable |
| Study Plan | PASS — document `scrollWidth = clientWidth`; bottom-sheet form opened and closed |
| Past Papers | PASS — document `scrollWidth = clientWidth`; internally scrollable log-paper sheet remained usable |
| Mobile navigation | PASS — all five primary controls plus open-disclosure links remained reachable |

No blocking horizontal overflow, clipped primary action, or unreachable
control was observed. The temporary viewport override was reset after testing.

## B5D-006 Boundary

No temporary 9093 state was recreated. The deployed source still contains the
B5D-006 warning implementation and the existing automated coverage remained
the accepted regression evidence. Normal Past Papers UI showed no obvious
warning-path regression. Full on-route/off-route Production proof was not
repeated.

## Runtime Logs

Vercel Production log queries covering the B5G-03 window found:

- unexpected Web 5xx: **0**;
- unexpected API 5xx: **0**;
- Web error-level events: **0**;
- API error-level events: **0**;
- fatal events: **0**; and
- database-health failures: **0**.

The browser console captured no warning or error entries during the targeted
UI run.

## Findings and Classification

| Severity | Count | Detail |
| --- | ---: | --- |
| Blocker | 0 | None |
| High | 0 | None |
| Medium | 1 | A11Y-003 empty Subject message exposes `Expected number, received nan` |
| Low | 0 | None |
| Review note | 0 | None beyond the explicit certification boundary |

Final original-finding classification:

- A11Y-001: **FIXED IN PRODUCTION**
- A11Y-002: **FIXED IN PRODUCTION**
- A11Y-003: **OPEN**
- A11Y-004: **FIXED IN PRODUCTION**

## Final Verdict

**BLOCKED**

The B5G accessibility remediation cannot be formally closed while A11Y-003 is
open. Authorize a narrow local correction to make an empty Subject selection
produce the schema-driven user-facing `Subject is required` message, then
deploy and repeat only that validation check. Do not repeat B5E/B5F QA, enable
new-seven subjects globally, or invite real beta users.
