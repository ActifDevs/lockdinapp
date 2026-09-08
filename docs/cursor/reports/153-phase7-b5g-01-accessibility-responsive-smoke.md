# LOCKDIN — PHASE 7 B5G-01 ACCESSIBILITY + RESPONSIVE SMOKE

**Date:** 2026-09-08 UTC

**Status:** PASS WITH REVIEW NOTES — no keyboard or responsive blocker found;
four medium accessibility findings require owner prioritization

## Scope and Safety

This was a targeted, machine-assisted release-readiness smoke against the real
Production application at `https://lockdinapp-web.vercel.app`. It was not an
exhaustive device certification, human usability study, WCAG audit, or claim of
full accessibility compliance.

- Baseline SHA: `bfc268e7b9b354edf3c54aa1756f60bb150f8dc6`
- Branch: `main`
- Preflight `HEAD` / `origin/main`:
  `bfc268e7b9b354edf3c54aa1756f60bb150f8dc6`
- QA identity: existing dedicated internal QA account only
- Product-code changes: **NONE**
- Migration/configuration/visibility changes: **NONE**
- Real beta invitations: **NONE**
- B5E/B5F end-to-end QA repeated: **NO**
- Temporary 9093 state recreated: **NO**

The browser viewport was explicitly set to 390 × 844 for responsive checks
and reset after testing. No task, Past Paper attempt, membership, route,
syllabus version, or study-option change was submitted.

## Production Health Preflight and Final Health

| Surface | Process health | Database health |
| --- | --- | --- |
| Canonical Web | HTTP 200, `status=ok` | HTTP 200, `status=ok`, `database=ok` |
| Standalone API | HTTP 200, `status=ok` | HTTP 200, `status=ok`, `database=ok` |

Both process and database checks remained healthy after browser QA.

## Keyboard Matrix

| Area | Result | Evidence |
| --- | --- | --- |
| Global navigation | PASS WITH REVIEW NOTE | Tab order reached the skip link, menu, page actions, cards, and mobile primary navigation. Enter opened both navigation disclosures. The full navigation dialog accepted Escape. The mobile More disclosure did not. |
| Account/user menu | PASS | Enter opened the labelled Navigation menu dialog; identity, Settings, theme, sign-out, privacy, and terms controls were exposed semantically. Escape closed it. No destructive control was activated. |
| Focus visibility | PASS for representative controls | Keyboard-focused controls exposed browser outline and/or explicit teal focus-ring/box-shadow styling. |
| Focus order | PASS WITH REVIEW NOTE | Main-page order was logical. Both tested form dialogs initially focused Close, but closing returned focus to document body rather than the invocation control. |
| Keyboard trap | NONE | Navigation and form overlays could be exited; no focus trap prevented escape from a flow. |
| Settings | PASS WITH REVIEW NOTE | Subject controls, session select, route choices, option checkboxes, Save, View, and update controls were keyboard reachable. Space selected a different route and restored the original route. Space toggled a selected History option off and back on. Arrow keys did not change the custom radio selection. No update/save was submitted. |
| Study Plan | PASS WITH REVIEW NOTE | Enter opened Add task; fields and Cancel/submit were reachable; empty submission moved focus to the invalid title. Escape closed the form. No task was created. Error messaging and focus restoration findings are below. |
| Past Papers | PASS WITH REVIEW NOTE | Enter opened Log paper. Subject and component comboboxes opened and options were keyboard selectable; History components were exposed with full paper labels. Submit remained unused and no attempt was created. Escape closed the selector and dialog, but focus returned to body. |
| Subject workspace | PASS | History workspace tabs exposed tab semantics; ArrowRight moved Overview → Syllabus and ArrowLeft restored Overview. |

## Responsive Matrix — 390 × 844

| Surface | Result | Evidence |
| --- | --- | --- |
| Dashboard | PASS | No document horizontal overflow. Hero actions, mission content, subject cards, and fixed five-item mobile navigation remained readable and reachable. |
| Settings | PASS | No horizontal overflow. Subject cards, session select, Save action, History route controls, three option groups, long option labels, and update controls wrapped without right-edge clipping. |
| Study Plan | PASS | No horizontal overflow. Add task and task tabs were reachable. The bottom-sheet form was internally scrollable; actions remained visible/reachable. |
| Past Papers | PASS | No horizontal overflow. Page actions and empty states were reachable; the log-paper bottom sheet and its labelled controls fit through internal scrolling. |
| History workspace | PASS | No horizontal overflow. Breadcrumb, summary, four tabs, overview content, and mobile navigation remained reachable. |
| Complex option UI | PASS | Existing History Full A Level membership provided the complex route/three-option-group check. Labels remained understandable and operable; no Geography/new-seven fixture was created. |
| Blocking overflow or clipped primary controls | NONE | Each inspected surface reported document `scrollWidth <= clientWidth`; no visible interactive control extended beyond the right viewport edge. |

## Targeted Semantic Accessibility

| Check | Result | Evidence |
| --- | --- | --- |
| Navigation landmarks and labels | PASS | Skip link, banner, main, mobile primary navigation, named dialog, and section navigation were exposed. |
| Form labels | PASS | Study Plan and Past Papers fields exposed textbox, combobox, spinbutton, and date control names. |
| Settings groups | PASS WITH REVIEW NOTE | Route choices expose radiogroup/radio roles and option sets expose named groups/checkboxes; custom radios omit the expected arrow-key behavior. |
| Status/alert semantics | PASS WITH REVIEW NOTE | Loading, selected-count, and unresolved-route status/alert semantics were exposed. Study Plan required-field feedback did not expose a readable message. |
| Warning semantics | PASS BY PRESERVED IMPLEMENTATION EVIDENCE | B5D-006 remains fixed. The warning is an inline alert with explanatory text and does not rely solely on color. The temporary 9093 proof was not recreated. |
| Color-only communication | MEDIUM FINDING | Empty Study Plan submission changed required labels to red and set fields invalid, but supplied no readable error text in the accessibility tree or visually. |

## Safe Error-State Smoke

Submitting the empty Add task form was a client-side validation action only.
It created no record. The title and subject fields received
`aria-invalid=true`; focus moved to Task Title. Both fields referenced form
message IDs through `aria-describedby`, but the rendered message nodes were
empty. There was no alert and no raw stack/database detail.

Settings also retained the already-established enabled Save semantics for
retained memberships; this was not misclassified as dirty-state behavior.

No server fault was intentionally induced.

## Findings

### MEDIUM — Custom Settings radios do not support arrow-key selection

- Reproduction: Settings → Subjects → existing History assessment; focus the
  selected Full A Level radio and press ArrowLeft.
- Observed: selection remained Full A Level. Space on a specific radio did
  select it, and Space restored the original selection.
- Impact: keyboard users can complete the flow, but the custom radiogroup does
  not follow the standard radio-group arrow-key interaction model, increasing
  keystrokes and cognitive friction.
- Standard: WCAG 2.1.1 Keyboard; WAI-ARIA radio-group keyboard pattern.
- Source: `artifacts/revision-platform/src/components/membership-assessment-panel.tsx:142`.
- Recommendation: implement roving `tabIndex` and Left/Right/Up/Down movement,
  preserving Space activation and the existing draft-only behavior.

### MEDIUM — Form dialogs do not restore focus to their invocation controls

- Reproduction: open Add task or Log paper with Enter; close with Escape.
- Observed: each dialog closed, but `document.activeElement` became `body`
  rather than the Add task or Log paper trigger.
- Impact: screen-reader and keyboard users lose their place and must navigate
  from the document start after dismissing a form.
- Standard: WCAG 2.4.3 Focus Order; WAI-ARIA modal dialog focus guidance.
- Sources: `artifacts/revision-platform/src/components/responsive-form-panel.tsx:35`,
  `artifacts/revision-platform/src/pages/study-plan.tsx:260`, and
  `artifacts/revision-platform/src/pages/past-papers.tsx:385`.
- Recommendation: connect each controlled panel to its trigger or explicitly
  restore focus to the recorded invocation element on close.

### MEDIUM — Required Study Plan errors have no readable message

- Reproduction: open Add task and activate Add task with title and subject
  empty.
- Observed: focus moved to Task Title and both fields became invalid, but the
  described form-message elements were empty. The only visible change was red
  required-field styling; no alert or readable explanation appeared.
- Impact: users, especially screen-reader and color-vision users, are not told
  what must be corrected even though the form refuses submission.
- Standard: WCAG 3.3.1 Error Identification and 1.4.1 Use of Color.
- Source: `artifacts/revision-platform/src/pages/study-plan.tsx:446`.
- Recommendation: ensure Zod messages are rendered in the associated
  `FormMessage` elements and announced when validation fails.

### MEDIUM — Mobile More disclosure ignores Escape

- Reproduction: at 390 × 844, focus More navigation, press Enter, then Escape.
- Observed: `aria-expanded` remained true and the Past papers, Calendar, and
  Settings disclosure stayed open. The toggle remained reachable and there was
  no trap.
- Impact: keyboard users have a workaround but cannot use the conventional
  dismissal key for an open navigation disclosure.
- Standard: WCAG 2.1.1 Keyboard; disclosure keyboard convention.
- Source: `artifacts/revision-platform/src/components/app-shell.tsx:463`.
- Recommendation: close the disclosure on Escape and return focus to its More
  button.

No BLOCKER, HIGH, or LOW defect was established.

## Implementation Audit Notes

The implementation remains a coherent, product-specific revision workspace.
The mechanical detector reported nine non-blocking warnings: one generic font
warning, seven rounded-tab border-style warnings, and one width-transition
warning in the desktop sidebar. None reproduced as a blocker in this targeted
keyboard/mobile smoke. They are review notes, not B5G-01 defects.

Targeted internal audit health score:

| Dimension | Score | Key result |
| --- | ---: | --- |
| Accessibility | 2/4 | Primary flows work, but four material keyboard/error issues remain. |
| Performance | 3/4 | No runtime failure; detector noted one layout-property transition. |
| Responsive design | 4/4 | All five required 390 × 844 surfaces passed. |
| Theming | 4/4 | Dark theme remained legible across tested surfaces and states. |
| Implementation integrity | 3/4 | Strong native/ARIA structure with isolated custom-control gaps. |
| **Total** | **16/20 — Good** | **No release blocker; address accessibility findings.** |

## Cleanup and Final Production Invariants

No temporary record was created, so no destructive cleanup action was needed.

| Invariant | Final result |
| --- | ---: |
| Migration count / head | 21 / `0020_subject_visibility_grants` |
| Memberships / route-assigned memberships | 15 / 2 |
| Study-option rows | 3 |
| Current-nine globally selectable | 9/9 |
| New-seven globally selectable | 0/7 |
| Visibility grants | 0 |
| Dedicated QA profile | 3 memberships / 2 routes / 3 options (`9489,9708,9709`) |
| Temporary tasks created | 0 |
| Temporary attempts created | 0 |
| Temporary memberships created | 0 |
| Temporary 9093 memberships / attempts | 0 / 0 |
| Historical membership / route / option drift | 0 / 0 / 0 |

The draft History route and checkbox interactions were restored before leaving
Settings and were never submitted.

## Runtime Evidence

- Browser console errors/warnings captured during the live QA: **NONE**
- Web Production error events in the inspected QA window: **0**
- Standalone API Production error events in the inspected QA window: **0**
- Web Production 5xx in the inspected QA window: **0**
- Standalone API Production 5xx in the inspected QA window: **0**
- Fatal errors: **NONE OBSERVED**
- Frontend runtime errors: **NONE OBSERVED**
- API failures: **NONE OBSERVED**
- Database-health failures: **NONE OBSERVED**
- Final Web DB health: HTTP 200
- Final standalone API DB health: HTTP 200

## Final Verdict

**PASS WITH REVIEW NOTES**

The primary flows are keyboard usable, no keyboard trap was found, every
required mobile surface passed the 390 × 844 overflow/reachability smoke,
runtime health stayed good, and Production invariants remained unchanged. The
four medium findings have workarounds and do not prevent safe use, but they
should be prioritized in a separate accessibility fix slice before claiming a
stronger accessibility posture.

## Recommendation

Owner review and freeze Report 153, then authorize a narrow accessibility fix
slice for the four medium findings. After fixes, rerun the targeted keyboard
checks and proceed to broader Phase 7 pre-beta/release-gate reconciliation.
Do not globally enable new-seven subjects or invite real beta users without
separate authorization.
