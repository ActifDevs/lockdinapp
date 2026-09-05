# LOCKDIN — B5D-R2 POST-FIX PRODUCTION BROWSER QA

**Date:** 2026-09-05 UTC
**Status:** BLOCKED — History enrollment cannot complete when multiple study-option groups are required
**Stop position:** Authenticated Playwright browser at `https://lockdinapp-web.vercel.app/settings?tab=subjects`, restored to Selected 3/5 (Biology, Chemistry, Physics). No membership Save executed after the blocker. Mutation testing stopped under §0.

**References:**

| Report | Role |
| --- | --- |
| Report 134 | Original BLOCKED B5D browser run (B5D-001 / B5D-002) |
| Report 135 | B5D-F1 Settings route-enrollment implementation proof |
| Report 136 (this file) | Post-fix Production browser verification |

**Authentication:** Owner manually signed in inside the retained automated Chromium session and confirmed `DEDICATED QA FIXTURE — MUTATIONS AUTHORIZED`. No password, token, session secret, user UUID, or service-role credential was inspected or recorded.

## Repository preflight

- Branch: `main`
- HEAD = `origin/main` = `3467eeeb4e2198856fad301400edcd2d965036e9`
- Working tree: CLEAN at start
- Intended repository change: this report only
- No product-code edits, commit, push, deploy, catalogue mutation, visibility change, repin, or backfill

## Production deployment

| Target | Deployment | State | SHA |
| --- | --- | --- | --- |
| Web — `lockdinapp-web.vercel.app` | `dpl_13dEFMMzXFMgHcmLbqTydXtFgtU8` | READY / Production | `3467eeeb4e2198856fad301400edcd2d965036e9` |
| API — `lockdinapp.vercel.app` | `dpl_G5BfkR9dz5jdcEewKgDfibxuo4xf` | READY / Production | `3467eeeb4e2198856fad301400edcd2d965036e9` |

B5D-F1 fix commit `2e0d3d7a1aeac92f5213c10045f25f1fccc923ae` is an ancestor of the serving web SHA. Fix included: **YES**.

## Evidence provenance

Only checks recorded as browser-exercised are browser evidence. Hosted SQL is labelled separately. Source inspection was used only to classify the blocker after browser reproduction (not as a substitute for browser PASS).

## Baseline read journey (browser)

| Area | Result | Evidence |
| --- | --- | --- |
| Login | PASS | Owner sign-in reached `/dashboard` |
| Dashboard | PASS | Biology / Chemistry / Physics cards; streak/XP; recent papers; no blank page; console clean |
| My Subjects | PASS | Bio 13/62 (21%), Chem 10/104 (10%), Phys 14/81 (17%) |
| Owned Biology | PASS | Overview + Syllabus tab loaded with populated content |
| Study Plan | PASS (read) | Today empty-state / create controls rendered; mutations NOT EXECUTED |
| Past Papers | PASS (read) | Existing Chemistry/Physics entries visible; route-focus/attempt NOT EXECUTED |
| Progress | PASS (read) | Page loaded; no NaN/undefined observed in exercised view; route-change impact NOT EXECUTED |
| Calendar | PASS (read) | Page loaded |
| Settings legacy | PASS (observe) | Three retained memberships; recorded session Oct/Nov 2027; null-route remediation radios; Save assessment choice disabled |
| Silent assignment | PASS (SQL corroboration) | Hosted `assessment_route_id` populated remains 0; pin snapshot unchanged |
| Current-nine catalogue | PASS | Visible: 9231, 9489, 9609, 9618, 9700, 9701, 9702, 9708, 9709 |
| Hidden seven (browser) | PASS | None of 8021, 9093, 9626, 9696, 9699, 9706, 9990 present in Settings catalogue |

## Primary History regression (9489 / May–June 2027)

**Steps exercised:**

1. Select History → Selected 4/5; Save subjects disabled.
2. Override session to May/June 2027 → “Effective session: May/June 2027”.
3. Network: `GET /api/subjects/2/syllabus-versions/19/assessment-routes` → HTTP 200.
4. Route picker appeared with three routes:
   - AS Level — Papers 1 + 2 this exam series
   - Complete A Level — carry forward AS, take Papers 3 + 4
   - Full A Level — Papers 1–4 this exam series
5. Catalogue `optionGroups` (three × 1/1): AS History Option; Paper 3 Prescribed Topic; Paper 4 Depth Study Option.
6. Selected Full A Level; selected Modern Europe in AS History Option.
7. Attempts to select Paper 3 / Paper 4 options had no effect.
8. Attempt to select a second option inside AS History Option had no effect (over-select blocked).
9. Save subjects remained **disabled**. Alert required remaining groups.
10. History deselected without Save → restored Selected 3/5. No membership write.

**Resolved version:** syllabus version **19** for subject 2 (History), session May/June 2027.

### B5D-001

**FIXED** — route picker and session-resolved catalogue load before Save. The previous “Save with no routeAssignments → HTTP 400” path no longer occurs for this UI flow.

### B5D-002

**NOT EXECUTED** — no membership Save / HTTP error path was reached after B5D-F1 because Save stayed client-blocked by incomplete multi-group options.

## BLOCKER — B5D-003: multi-group study-option selection is globally capped

**Severity:** BLOCKER
**Page:** `/settings?tab=subjects`
**Subject:** History 9489 / May–June 2027 / Full A Level
**Time:** approximately 15:52–15:54 UTC, 2026-09-05

**Actual:** After selecting one option in the first 1/1 group, checkboxes in other required groups cannot be selected. Save remains disabled. History enrollment cannot complete against the live catalogue (three required 1/1 groups). Server-side `lockdin_resolve_route_assignment` also requires cardinality for every group on the route set, so a single-group selection cannot succeed even if Save were forced.

**Expected:** Per-group `maxSelections` applies within that group only, so each required 1/1 group can accept one selection and Save can enable when all groups are valid.

**Browser classification aid (not a product change):** `toggleStudyOptionSelection` compares `selectedIds.length` (all groups) to the current group’s `maxSelections`. With `maxSelections === 1`, the second group can never receive a selection.

Evidence artifact: Playwright full-page screenshot `b5d-r2-history-option-blocker.png` captured during the failed multi-group attempt.

**Stop rule:** Mutation testing stopped. No patching during QA.

## Generic multi-route / no-option (UI only; no Save)

| Check | Result |
| --- | --- |
| Economics 9708 selected (unsaved) | Explicit three-route picker; no study-option picker |
| Save | Remained disabled until route chosen (not completed) |
| Cleanup | Economics deselected; no Save; returned to 3/5 |

Chemistry was already a retained membership, so new-subject Chemistry enrollment was not used. Economics provided the no-option multi-route UI evidence without a membership write.

## Deferred / NOT EXECUTED (blocked by B5D-003)

- History Save / persistence / reload
- Atomic invalid submission / B5D-002 toast copy
- Settings same-version route change on a route-assigned QA History membership
- History subject/syllabus route-aware views after enrollment
- Study Plan create/edit/complete/cleanup
- Past Papers route focus / off-route warning / attempt
- Progress before/after route change
- Hard refresh / back-forward / sign-out-in matrix beyond observed navigation
- Full accessibility Tab/Shift+Tab/Enter/Space matrix on route+options
- Hidden-membership denied enrollment API mutation
- Temporary membership / task / paper cleanup (none created)

## Responsive / accessibility (limited)

| Check | Result |
| --- | --- |
| Desktop Settings 1440×1000 | PASS for exercised History/Economics flows |
| Mobile Settings ~390×844 | Limited PASS — page rendered; Save/status readable; full picker matrix NOT EXECUTED after stop |
| Keyboard route/options | NOT EXECUTED beyond observed labelled controls |

Chromium automation command-line warnings: none treated as Lockdin defects in this run.

## Hidden-seven contract (read-only SQL)

| Check | Result |
| --- | --- |
| New-seven selectable | **0** |
| New-seven hidden | **7** |
| Browser visibility | PASS (none listed) |
| Denied enrollment mutation | NOT EXECUTED |

Current-version option-group shapes observed:

| Code | Groups |
| --- | --- |
| 9489 History | 3 × 1/1 (`as_history_option`, `paper_3_topic`, `paper_4_depth_study`) |
| 9696 Geography | 2 × 2/2 |
| 9699 Sociology | 1 × 2/3 |
| 9990 Psychology | 1 × 2/2 |

## Post-QA hosted invariants (read-only)

| Metric | Value |
| --- | --- |
| Subjects | 16 |
| Versions | 29 |
| Published | 21 |
| Retired | 8 |
| Route sets | 29 |
| Routes | 95 |
| Memberships | 15 |
| Populated `assessment_route_id` | 0 |
| Option selection rows | 0 |
| New-seven selectable | 0 |
| Feb/Mar `product_auto_assign` | 0 |
| Historical pin snapshot | `649a60a12ce103b9177272f47c9dbc5ba21d4ba3a72084b156bcbcfeb189b5b8` (exact match) |
| Historical pin changes | 0 |
| Historical route backfills | 0 |
| QA residue memberships | none (no Save) |

## Runtime logs (post-QA window ~2h)

| Surface | Observation |
| --- | --- |
| Web status groups | 200 / 304 only in sampled grouping |
| API status groups | Includes 401, 404, and single 500 / 503 counts (consistent with earlier healthz/db degraded probe and unauthenticated probes; not attributed to a successful membership Save) |
| Runtime error clusters | none (web + API) |
| Browser console (QA session) | no warning/error messages recorded while exercising authenticated pages |

Do not classify historical B5D HTTP 400 (Report 134) as a server crash. No intentional validation 4xx was produced in this resumed run because Save never fired.

## Defect summary

| ID | Severity | Title | Status |
| --- | --- | --- | --- |
| B5D-001 | — | Settings missing route picker before Save | **FIXED** in this browser run |
| B5D-002 | — | Generic toast for known route/option errors | **NOT EXECUTED** |
| B5D-003 | **BLOCKER** | Multi-group study-option selection globally capped at first group’s max | **OPEN** — blocks History enrollment |

Blocker: 1
Critical: 0
High: 0
Medium: 0
Low: 0

## Repository boundary

- Product changes: **NONE**
- Report 136: **CREATED** (reviewable; not committed)
- Commit: **NONE**
- Push: **NONE**

## Verdict

**BLOCKED**

B5D-F1 is live and closes B5D-001, but Production History enrollment remains impossible while B5D-003 is open. Do not start B5E. Do not patch in this task.

## Recommendation

OWNER REVIEW + authorize a separate fix slice for B5D-003 (per-group selection semantics in `toggleStudyOptionSelection` / StudyOptionPicker, with automated coverage for ≥2 option groups). Re-run B5D browser QA only after that fix is deployed to Production.
