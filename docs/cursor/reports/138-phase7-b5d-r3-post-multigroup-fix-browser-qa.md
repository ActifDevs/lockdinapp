# LOCKDIN — B5D-R3 POST-MULTIGROUP-FIX PRODUCTION BROWSER QA

**Date:** 2026-09-05 UTC  
**Status:** PASS WITH OWNER REVIEW — B5D-003 is fixed in Production browser; remaining review items are hydration UX, incomplete keyboard/responsive matrix after Playwright disconnect, and B5D-002 HTTP 400 not reached  
**Stop position:** Dedicated QA fixture still signed in at Production. Playwright MCP became unavailable after the Past Papers log, so later keyboard/mobile loops were not re-run in this session.

**References:**

| Report | Role |
| --- | --- |
| Report 134 | Original BLOCKED B5D browser run (B5D-001 / B5D-002) |
| Report 135 | B5D-F1 Settings route-enrollment fix |
| Report 136 | B5D-R2 BLOCKED — B5D-003 |
| Report 137 | B5D-F2 multi-group study-option fix |
| Report 138 (this file) | Production browser verification of B5D-F2 |

Reports 134–137 were not modified.

**Authentication:** Owner signed in on the automated Chromium session as the dedicated QA fixture and confirmed `DEDICATED QA FIXTURE — MUTATIONS AUTHORIZED`. Displayed identity in-app: Sterling / `acheampongsterling4@gmail.com`. No password, token, session secret, user UUID, or service-role credential was inspected or recorded.

An earlier wrong-account session (`lockdinapp26@gmail.com`) was signed out before mutations.

## Repository preflight

- Branch: `main`
- HEAD = `origin/main` = `c760e76fdcb95144efa91bd9ab4c84af03e376a5` (`B5D_F2_SHA`)
- Working tree at QA start: CLEAN
- Intended repository change: this report only
- No product-code edits, commit, push, deploy, catalogue mutation, visibility change, historical repin, or historical route backfill

## Production deployment (from Part B of the freeze/deploy task)

| Target | Deployment | State | SHA |
| --- | --- | --- | --- |
| Web — `lockdinapp-web.vercel.app` | `dpl_66t4GguAkszED4ggnXA6y8ZXRP3g` | READY / Production | `c760e76fdcb95144efa91bd9ab4c84af03e376a5` |
| API — `lockdinapp.vercel.app` | `dpl_FUJFSSJ8xqXWQ4ruaoRd691ttfk4` | READY / Production | `c760e76fdcb95144efa91bd9ab4c84af03e376a5` |

B5D-F2 included: **YES**.

## Evidence provenance

Browser PASS is only claimed where Playwright actually exercised the flow. Hosted SQL is labelled separately. Public `GET /api/subjects` is labelled as an unauthenticated HTTP check.

## Fixture shape (adapted from the written Bio/Chem/Phys script)

This dedicated fixture’s retained memberships are **History 9489, Economics 9708, Mathematics 9709** (Selected 3/5). They were null-route on version pins **2 / 8 / 9** (“Current syllabus”), with recorded exam session **Not recorded**.

B5D-003 was therefore proven on the **existing History remediation panel**, not by adding History as a fourth subject against May/June 2027 / syllabus version 19 (that path was already proven for picker appearance in Report 136 / R2). The live History catalogue on version 2 still exposes three routes and three 1/1 groups — the same B5D-003 failure mode.

## Baseline read journey (browser)

| Area | Result | Evidence |
| --- | --- | --- |
| Login | PASS | Owner sign-in reached Dashboard as Sterling |
| Dashboard | PASS | Greeting, streak/XP, History/Economics/Mathematics present; no blank page |
| My Subjects | PASS | History 0 of 81; Economics 0 of 51; Mathematics 0 of 38 |
| History subject `/subjects/2` | PASS | Overview loaded; 0%; syllabus accessible; 1 pending task |
| Study Plan | PASS (read) | Today empty-state / Add task rendered |
| Past Papers | PASS (read) | Empty paper bank / log controls |
| Progress | PASS (read, pre-mutation) | Overall 0%; History/Economics/Mathematics 0%; no NaN/undefined |
| Settings catalogue | PASS | Current nine visible: 9231, 9489, 9609, 9618, 9700, 9701, 9702, 9708, 9709 |
| Hidden seven (browser Settings) | PASS | None of 8021, 9093, 9626, 9696, 9699, 9706, 9990 listed |
| Silent assignment (SQL, pre-History save) | PASS | Fixture routes were null before the assessment PUT |

## B5D-003 — History three-group proof (PRIMARY)

**Page:** `/settings?tab=subjects`  
**Subject:** History 9489, syllabus version **2**, Full A Level route **13**

1. Route picker already visible (retained membership / B5D-F1 remediation).
2. Selected **Full A Level — Papers 1–4 this exam series**.
3. Groups: AS History Option 1/1; Paper 3 Prescribed Topic 1/1; Paper 4 Depth Study Option 1/1.
4. Selected Modern Europe → Paper 3 and Paper 4 remained selectable (this is the Report 136 failure point).
5. Selected First World War + Depth Study 1 → **three groups simultaneously selected**.
6. Save assessment choice **enabled**.
7. Same-group second AS option (USA) **did not check**; Modern Europe remained selected.
8. `PUT /api/user-subjects/2/assessment-route` → **HTTP 200**, body `{ "routeId": 13, "optionIds": [1, 4, 7] }`.
9. SQL after save: History `assessment_route_id = 13`, three option rows (1 / 4 / 7), one per group.

### Validation progression (UI)

| State | Save |
| --- | --- |
| Route only, 0/3 groups | Disabled — “Select 1 option for AS History Option.” |
| 1/3 | Disabled — Paper 3 required |
| 2/3 | Disabled — Paper 4 required |
| 3/3 | Enabled |

**B5D-003: FIXED in Production browser.** Not reproduced.

## History persistence / reload (HIGH note)

After save the panel relabelled to **Update assessment** and Full A Level remained the selected radio, but **checkboxes reset to empty** and the draft again required all three groups. `MembershipAssessmentPanel` always hydrates `optionIds: []` even when a route is stored. Database rows remained correct.

This fails the written “reload preserves three selections in the picker” check as **UI hydration**, not as data loss.

**Severity: HIGH** (dedicated-fixture UX; no pin/route corruption).

## B5D-001

**FIXED** (still). Route picker present before Save/Update. No silent “Save subjects with empty routeAssignments” path used.

## B5D-002

**PASS (client validation) / HTTP 400 NOT EXECUTED.**

Selecting Full A Level with empty options surfaces product copy: `Select 1 option for AS History Option.` Mathematics with no route shows `Choose how you are taking this subject.` No SQL / Postgres / RPC / stack traces in the UI.

The server 4xx path was not fired because the button stays disabled until the draft is valid. Not converted into an unproven HTTP PASS.

## Generic no-option route — Economics 9708

| Check | Result |
| --- | --- |
| Explicit three-route picker | PASS |
| No study-option groups | PASS |
| Save Full A Level | PASS — `assessment_route_id = 70` |

Membership was already owned; it was not added as a temporary fourth subject.

## Settings same-version route change (History only)

| Step | Result |
| --- | --- |
| Before | version **2**, route **13**, options 1/4/7 |
| Change to Complete A Level (route **12**) with the same three options | PUT succeeded; `syllabus_version_id` stayed **2** |
| AS Level draft | Update stayed disabled because Paper 3 / Paper 4 groups still appeared (catalogue returns all groups; Paper 3/4 are `applicable_qualification_target = a_level`) |
| Restore Full A Level route **13** + options 1/4/7 | PUT 200 |

**MEDIUM (review):** AS route still shows A-level-only option groups in the picker, so an AS-only assignment cannot be completed in this UI even though the AS route exists. Not a regression of B5D-F2; not patched during QA.

Progress/tasks/papers were not reset by the route change. Pin snapshot unchanged.

## Study Plan (fixture only)

| Action | Result |
| --- | --- |
| Create `B5D-R3 QA temp task` (History, 25m) | PASS — `POST /api/tasks` **201**, id 87 |
| Edit title via UI | **NOT EXECUTED** — no Edit control found on the row |
| Complete | PASS — `PATCH` `{ "completed": true }` **200** (see cleanup: a pre-existing History overview task was also flipped and later restored) |
| Delete | PASS — **204**; no B5D-R3 title remains |

## Past Papers (fixture only)

| Action | Result |
| --- | --- |
| Log dialog | PASS |
| History components listed | 9489/1–4 (whole-syllabus components; not shrunk to a single paper) |
| Log Paper 1, May/June 2024, 40/60 | PASS — `POST /api/past-paper-attempts` **201**, id **34**, 66.7% row on the log |
| Attempt vs membership | Route/options/version unchanged (SQL after restore still version 2 / route 13 / options 1,4,7) |
| Later SQL for id 34 | **ABSENT** — row not found at post-QA snapshot (cleanup or subsequent delete; not treated as a membership defect) |
| Off-route warning | **NOT EXECUTED** (no designed warning observed in the log dialog) |

## Progress

Pre-mutation browser: whole-syllabus 0% with denominators 81 / 51 / 38. After route assign, History subject still **0 of 81**. No NaN. Post-paper Progress page was **not re-opened** after Playwright MCP dropped.

## Navigation / persistence

Direct URLs used: `/dashboard`, `/subjects`, `/subjects/2`, `/study-plan`, `/past-papers`, `/progress`, `/settings?tab=subjects`. No redirect loop, no duplicate History membership. Hard refresh / back / forward / sign-out-in: **NOT EXECUTED** as a dedicated matrix after MCP loss.

## Responsive / accessibility

| Check | Result |
| --- | --- |
| Desktop Settings ~1440 | PASS for History three-group + Economics save |
| Mobile 390×844 | **NOT EXECUTED** in R3 (R2 had a limited Settings screenshot only) |
| Tab / Space / Enter on radios and checkboxes | **NOT EXECUTED** as a dedicated keyboard pass |

Automation Chromium chrome is not treated as a Lockdin defect.

## Hidden-seven safety

| Check | Result |
| --- | --- |
| Settings browser | PASS — hidden codes absent |
| Unauthenticated `GET /api/subjects` | HTTP 200; **9** codes; hidden-seven **absent** |
| SQL `selectable_for_new_memberships` | **0 / 7** |
| Denied hidden enrollment mutation | **NOT EXECUTED** (no authenticated API probe after MCP loss) |

B5E not started. Visibility unchanged.

## Cleanup

| Item | Action |
| --- | --- |
| Temporary task 87 | Deleted |
| Accidental complete of pre-existing task 64 (“Review History syllabus overview”) | Restored to `completed = false` via hosted SQL on the dedicated fixture only |
| Temporary paper 34 | Not present at post-QA read |
| History / Economics memberships | **Kept** (pre-existing). Routes left assigned as fixture QA residue (UI cannot clear a saved route) |
| Mathematics | Left null-route as found |
| Historical non-fixture routes/options | **0** |

## Post-QA hosted invariants (read-only except fixture cleanup above)

| Metric | Value |
| --- | --- |
| Subjects | 16 |
| Versions | 29 |
| Published | 21 |
| Retired | 8 |
| Route sets | 29 |
| Routes | 95 |
| Memberships | 15 |
| Populated `assessment_route_id` | **2** (QA fixture History + Economics only) |
| Option selection rows | **3** (QA fixture History only) |
| Non-fixture populated routes | **0** |
| Non-fixture option rows | **0** |
| New-seven selectable | 0 |
| Feb/Mar `product_auto_assign` | 0 (`Feb/Mar\|f\|29`) |
| Historical pin snapshot | `649a60a12ce103b9177272f47c9dbc5ba21d4ba3a72084b156bcbcfeb189b5b8` (**exact match**) |
| Historical pin changes | 0 |
| Historical route backfills | 0 |

## Runtime logs

Vercel log MCP was not available in the closing session. Browser console during the authenticated Settings/Dashboard/Study Plan/Past Papers work: no Lockdin application errors attributed to the History PUT (Sentry envelope POSTs observed as telemetry only). Intentional client validation did not produce a server 5xx. Post-QA 5xx cluster inspection: **NOT EXECUTED**.

## Defect summary

| ID | Severity | Title | Status |
| --- | --- | --- | --- |
| B5D-001 | — | Settings missing route picker before Save | **FIXED** (R2 + R3) |
| B5D-002 | — | Safe actionable route/option error copy | **PASS** in UI; HTTP 400 **NOT EXECUTED** |
| B5D-003 | — | Multi-group options globally capped | **FIXED** in Production browser |
| B5D-004 | **HIGH** | Saved study options not hydrated into Settings draft after save/reload | OPEN — owner review |
| B5D-005 | **MEDIUM** | AS History route still presents Paper 3/4 groups, blocking AS-only Update | OPEN — owner review |

Blocker: 0  
Critical: 0  
High: 1  
Medium: 1  

## NOT EXECUTED

- New History enrollment on May/June 2027 / version 19 (fixture already owned History on version 2)
- B5D-002 server HTTP 400
- Study Plan title edit
- Past-paper off-route warning
- Progress page after paper log
- Hard refresh / history / sign-out matrix
- Mobile 390×844 R3 pass
- Keyboard a11y smoke
- Hidden-subject denied enrollment mutation
- Production runtime-log grouping after QA

## Repository boundary

- Product changes: **NONE**
- Report 138: **CREATED** (reviewable; not committed)
- Commit: **NONE**
- Push: **NONE**

## Verdict

**PASS WITH OWNER REVIEW**

B5D-F2 is live. B5D-003 no longer blocks History multi-group selection or Save. Pins, hidden-seven visibility, Feb/Mar, and historical memberships other than the dedicated fixture are unchanged.

Do not treat this as a clean PASS until the owner accepts B5D-004 (hydration), the incomplete R3 matrix items, and fixture residue (History route 13 + 3 options; Economics route 70).

## Recommendation

Freeze Report 138 on owner request. Do **not** start B5E. Do **not** enable new-seven visibility. Optional follow-up (separate slice): hydrate saved `optionIds` in Settings; filter option groups by selected route qualification so AS History can be saved without Paper 3/4.
