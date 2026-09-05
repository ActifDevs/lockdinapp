# LOCKDIN — B5D INTERNAL / RC BROWSER QA

**Date:** 2026-09-05 UTC
**Status:** BLOCKED — current-nine enrollment through Settings fails before route selection
**Stop position:** Authenticated Playwright browser at `https://lockdinapp-web.vercel.app/settings?tab=subjects`, viewport 1440 × 1000. Settings reloaded to its persisted three-subject state. Mutation testing stopped after B5D-001. Owner review and a separately authorized fix slice are required.

**Authentication continuation:** Owner manually signed in inside the retained automated Chromium session, then explicitly confirmed “Dedicated QA fixture — mutation authorized”. Authentication succeeded at approximately 00:45 UTC. Existing historical memberships were observed only. No password, token, user UUID or service-role credential was inspected or recorded in this report.

## Repository preflight

- Branch: `main`.
- HEAD and freshly fetched `origin/main`: `a667d74303878db4d7e8eb2e0e15eb4fd39bc8d5`.
- Latest commit: `a667d74 feat(ops): harden hosted catalogue cutover tooling`.
- Initial working tree: CLEAN. No pull required.
- Initial sandboxed fetch could not write FETCH_HEAD; authorized escalated fetch succeeded. No unexpected remote commit.
- Report 133 read as frozen evidence. Reports 132/133 and migration 0018 were not modified or reconstructed.
- Intended final diff: this report only. No product changes, commit, push, deployment, catalogue mutation, visibility change, repin, or backfill performed.

## Evidence provenance

Only checks explicitly recorded as browser-exercised are browser evidence. Initial anonymous QA and automated preflight remain preserved below and were not repeated. The authenticated continuation ran approximately 00:45–00:53 UTC. New hosted read-only checks are identified separately. No SQL or source inspection is relabelled as browser PASS.

## Production deployment verification — current session

Vercel canonical-alias lookup confirmed both targets are Production and READY:

| Target | SHA | Deployment |
| --- | --- | --- |
| API — lockdinapp.vercel.app | `a667d74303878db4d7e8eb2e0e15eb4fd39bc8d5` | `dpl_3dwLr72ZBFc3BVkZmd16pMxuDdQ8` |
| Web — lockdinapp-web.vercel.app | `a667d74303878db4d7e8eb2e0e15eb4fd39bc8d5` | `dpl_DkuFYe2GWiwPCQ6NJRBMjygvNucg` |

This is an expected state allowed by the handoff. No redeployment needed. Initial error/fatal Production runtime-log queries for each project over the preceding 24 hours returned empty grouped counts. After the authenticated failure, one-hour runtime-error cluster and Production HTTP 5xx count queries again returned no entries for both projects. The browser captured a genuine HTTP 400 for membership replacement; absence of runtime-error clusters does not negate this defect. Deployment/read-surface health passes within exercised scope; enrollment health fails.

## Genuine anonymous browser evidence

Playwright MCP was usable. Checks occurred approximately 00:36–00:38 UTC.

| Check | Result | Actual evidence / limit |
| --- | --- | --- |
| Landing render | PASS | Canonical URL settled from loading to full landing content; title “Lockdin — A-Level Revision Workspace”; navigation, hero, feature sections and footer present. |
| Landing desktop dimensions | PASS, limited layout check | 1120 × 448 viewport; document scrollWidth 1106, no horizontal overflow. No full desktop visual review claimed. |
| Landing mobile dimensions | PASS, limited layout check | Browser resized to 390 × 844; document scrollWidth 375, no horizontal overflow. |
| Landing → signup navigation | PASS | Clicked actual “Invitation only” control in banner; reached `/signup`. |
| Signup restriction surface | PASS | Title “Invitation only · Lockdin”; controlled-beta invitation-only notice and Sign in link; no public registration form. No invitation requested or sent. |
| Signup mobile dimensions | PASS, limited layout check | At 390px viewport, document scrollWidth 390. |
| Signup → login navigation | PASS | Clicked actual Sign in link; reached `/login`. |
| Sign-in surface | PASS for render only | Title “Log in · Lockdin”; “Welcome back”, labelled Email and Password textboxes, Sign in button, Forgot password link, Invitation only link. No credentials entered and no login success claimed. |
| Browser console | PASS for observed anonymous journey | Zero recorded errors or warnings across this browser session. |
| Network inspection | Limited evidence | Non-static request listing showed successful telemetry submissions; no failed request in that listing. This is not an API functional-health check. |
| Forgot-password journey | NOT EXECUTED | Link observed; stopped at login under handoff §7 before navigating further. |
| Hard refresh, back/forward, remaining public navigation | NOT EXECUTED | Still required on continuation. |
| Keyboard/focus/error accessibility smoke | NOT EXECUTED | Accessible form labels observed; keyboard and error behavior not exercised. |

Browser snapshots were returned by Playwright for the landing, signup and login pages; evidence is summarized here without credentials, user identifiers, telemetry keys, or session data. No screenshot-based visual PASS is claimed.

## Completed preflight inherited from handoff

| Automated check | Supplied result, not rerun |
| --- | --- |
| Migration | PASS — 19 / `0018_subject_visibility_and_route_assignment` |
| Route manifest | PASS — 46/46 |
| Harness | PASS — 44 passed / 1 skipped |
| Unit | PASS — 44 passed |
| Typecheck | PASS |
| Hosted-gate / supersession coverage | PASS |

Hosted baseline supplied and corroborated as historical evidence by frozen Report 133: 16 subjects; 29 versions (21 published, 8 retired); 29 route sets; 95 routes; 333 components; 13 option groups; 45 options; 72 option-unit mappings; 54 year mappings; History r002 year mappings 27; History AS component-null 448; 15 historical memberships with zero populated routes and zero option-selection backfills. Current nine selectable 9/9; new seven selectable 0/7; Feb/Mar automatic assignment zero. These are prior verified results, not a fresh post-QA database snapshot.

## Authenticated browser matrix

NOT EXECUTED below means stopped by the release-blocker rule, not missing authentication.

| Area | Result and actual evidence |
| --- | --- |
| Login | PASS — manual owner sign-in reached `/dashboard` in the same automated session. No credential inspection. |
| Dashboard | PASS for legacy read journey — Biology, Chemistry and Physics cards; existing tasks, paper history and progress; no blank page or redirect loop. |
| My Subjects | PASS for legacy read journey — three subjects; Biology 3/62 topics (5%), Chemistry 0/104, Physics 0/81. |
| Owned Subject | PASS for Biology overview — one pending task, latest paper 62.5%, three papers, average 72.5%, best 80%. |
| Syllabus | PASS for Biology tab load and topic list — populated syllabus sections including Assessment objectives 3/3, Cell structure 0/2 and Biological molecules 0/4. No completion controls used. Expanding outcomes/full-content canonical audit remains NOT EXECUTED. |
| Study Plan | PASS for read journey — Today tab and empty-state/create controls rendered. Create/edit/complete/dashboard refresh NOT EXECUTED. |
| Past Papers | PASS for legacy read journey — four existing entries with labels, marks, dates and score-trend chart; no blank page. Route-assigned focus/off-route warning/new attempt NOT EXECUTED. |
| Progress | PASS for read journey — 1% overall syllabus, one completed task, four papers, readable charts and 5%/0%/0% subject breakdown. No NaN/undefined observed. Canonical denominator and route-change impact NOT EXECUTED. |
| Settings legacy remediation | PASS for observation — three retained memberships show recorded session “Not recorded”, explicit AS/staged/full A-Level radio groups with no selected route, disabled Save assessment choice and textual validation. No historical route submitted. |
| Silent assignment | PASS — read-only hosted aggregate before mutation attempt and after failure: all 15 historical routes remain null; exact frozen pin hash unchanged. |
| Current-nine catalogue | PASS for Settings list — exactly 9231, 9489, 9609, 9618, 9700, 9701, 9702, 9708, 9709, with corresponding names. Search/onboarding-specific and full mobile catalogue coverage NOT EXECUTED; no search control on the observed Settings surface. |
| Hidden seven | PASS for observed Settings catalogue — none of 8021, 9093, 9626, 9696, 9699, 9706, 9990 present. Separate live DB check confirms all false. |
| Fresh QA enrollment | FAIL — new History, May/June 2027, Save subjects → HTTP 400; no route picker, options or persisted membership. This tested fresh membership via Settings, not first-account onboarding. |
| Multi-route | FAIL for new-subject Settings flow — no explicit route choice before submit. Existing-subject choices were visible but not submitted. Successful route persistence NOT EXECUTED. |
| History 1/1 | NOT EXECUTED beyond subject/session selection — blocked before route/options UI. No zero/one/over-selection browser PASS. Published r002 and 1/1 data are verified separately below. |
| No-option subject | NOT EXECUTED — stop rule. |
| Atomic/error UX | PASS for no partial membership/options on this one genuine failed request. User-facing error contains no SQL, table names, stack or service internals. Actionable explanation FAIL (B5D-002). Double-submit NOT EXECUTED. |
| Settings same-version change | NOT EXECUTED — no fresh QA route-assigned membership created. No historical membership altered to work around the blocker. |
| Navigation/session | PASS for observed clicks between Dashboard → Subjects → owned Biology → Syllabus → Study Plan → menu → Past Papers, and direct Progress/Settings navigation. Settings full document reload returns persisted 3/5 selection and null routes. Browser-cache-bypassing hard refresh, other refresh/back-forward/sign-out-in cases NOT EXECUTED. |
| Calendar | NOT EXECUTED — navigation link observed; blocker reached before visit. |
| Responsive | Limited PASS — authenticated Dashboard 390×844, scrollWidth 375; Settings desktop 1440×1000, scrollWidth 1425; full Settings screenshot visually reviewed with readable wrapping and reachable Save subjects. Full mobile/core route/options matrix NOT EXECUTED. |
| Accessibility | Partial observation only — labelled session select/radio groups and textual alerts. Genuine Tab/Shift+Tab/Enter/Space route/options testing NOT EXECUTED. |

Successful observed application reads included profile, dashboard summary, progress overview, user subjects, tasks, paper attempts, owned syllabuses, selectable subjects, assignment sessions and retained assessment-route catalogues (HTTP 200). The membership replacement was HTTP 400. Browser console was clear before that request and then recorded its HTTP 400 resource error.

## B5D-001 — BLOCKER: Settings cannot collect required route for a new subject

**Page:** `/settings?tab=subjects`
**Goal:** Add History 9489 for May/June 2027 to the owner-authorized QA fixture while retaining its three existing subjects.
**Time:** approximately 00:50:19 UTC, 2026-09-05.
**Severity:** BLOCKER — required current-nine fresh enrollment path cannot proceed.

**Browser steps:**

1. Open Settings → Subjects with Biology, Chemistry and Physics retained.
2. Select History. The count becomes 4/5; a session selector appears, with no History route/option controls.
3. Choose available override May/June 2027. The UI displays “Effective session: May/June 2027”.
4. Click Save subjects once.

**Actual:** `PUT /api/user-subjects` returns 400 with `{"error":"Choose how you are taking this subject."}`. The visible toast says “Could not update subjects” / “Your previous selection is unchanged. Please try again.” No route picker appeared before submission. Settings reload restores 3/5. No partial membership or option rows persisted.

**Expected:** Resolve the selected session, present explicit version-scoped route and required study options, require valid selections, then atomically persist the new membership while retaining existing pins.

**Captured request body (no user identifiers or credentials):**

```json
{"subjectIds":[5,6,7,2],"intendedExamSession":{"year":2026,"series":"Oct/Nov"},"subjectSessionOverrides":[{"subjectId":2,"year":2027,"series":"May/June"}]}
```

**Root cause supported by browser and source:**

- `artifacts/revision-platform/src/pages/settings.tsx:327` builds replacement data from subject IDs and session payload only; no `routeAssignments`.
- The same file at lines 758–775 renders `MembershipAssessmentPanel` only for retained memberships. The new-subject branch beginning at line 776 supplies a session select and availability message, with no route/options picker.
- `artifacts/api-server/src/routes/user-subjects.ts:224` forwards route assignments when supplied. `artifacts/api-server/src/lib/intended-exam-session.ts:112` maps `assessment_route_required` to the observed safe HTTP 400 message.
- Hosted `lockdin_replace_user_subjects` delegates to `lockdin_replace_user_subjects_apply`; the latter enforces route resolution for new memberships. Hosted `lockdin_resolve_route_assignment` requires an explicit choice when multiple routes exist. History r002 has three routes.
- Read-only route counts show all currently published current-nine revisions have multiple routes (3–8). The missing Settings payload therefore likely affects other new current-nine additions too; only History was browser-reproduced, and no further mutation retries were performed after the blocker.

**Classification:** Genuine product integration failure with an HTTP response and matching source/data evidence, not an automation rendering issue. No code fix applied.

## B5D-002 — MEDIUM: route-required error becomes an unactionable retry message

Same reproduction and request as B5D-001. The API supplies safe actionable text, “Choose how you are taking this subject.” Settings instead displays a generic retry message. `artifacts/revision-platform/src/lib/membership-session-selection.ts:101` allows only four session-related messages, so `productSafeAssignmentError` discards the route-required reason; Settings falls back at lines 371–377. Expected: a safe explanation associated with the required route field once that field exists. No raw internals leaked. This issue does not count as a second enrollment failure.

## Hosted read-only contracts and post-QA invariants

Evidence source: configured Lockdin Production database, project ref `hazvcdrcvsxmuwdfiucx`, accessed with existing local connection configuration and `BEGIN READ ONLY` / `ROLLBACK`. No migration or mutation functions executed by these checks. Connection secrets never printed. No migration verification or frozen reproduction was rerun.

| Metric | After failed enrollment |
| --- | --- |
| Subjects | 16 |
| Versions / published / retired | 29 / 21 / 8 |
| Published route sets / routes | 29 / 95 |
| Memberships | 15 |
| Historical routes populated | 0 |
| Option selections | 0 |
| New-seven selectable | 0 |
| Feb/Mar automatic assignment | 0 |
| Historical pin changes | 0 — exact established snapshot hash |
| Historical route backfills | 0 |
| QA membership/route/option rows retained | 0 |

Established pin snapshot semantics were read from `scripts/src/syllabus/b5c-cutover-rehearsal.ts`: ordered `user_id|subject_id|syllabus_version_id` lines with trailing newline, SHA-256. Before the attempt and after it: `649a60a12ce103b9177272f47c9dbc5ba21d4ba3a72084b156bcbcfeb189b5b8`, exactly matching frozen Report 133. No user UUID output was needed.

| Subject | Live published revisions | Hosted structural data contract |
| --- | --- | --- |
| 8021 | r001, r002 | PASS — hidden; one published route set and one route per revision |
| 9093 | r001 | PASS — hidden; one set / three routes |
| 9626 | r001, r002 | PASS — hidden; one set / three routes per revision |
| 9696 Geography | r001, r002 | PASS DATA CONTRACT — hidden; one set / three routes per revision; Paper 3 advanced physical and Paper 4 advanced human groups each min 2 / max 2, four choices |
| 9699 Sociology | r001 | PASS DATA CONTRACT — hidden; one set / three routes; Paper 4 group min 2 / max 3, three choices |
| 9706 | r001 | PASS — hidden; one set / three routes |
| 9990 Psychology | r001, r002 | PASS DATA CONTRACT — hidden; one set / three routes per revision; specialist options min 2 / max 2, four choices |
| 9489 History | r002 | PASS DATA CONTRACT — selectable; one set / three routes; AS History, Paper 3 and Paper 4 groups each min 1 / max 1, three choices |

These are live SQL catalogue/cardinality observations, not public API resolver executions or browser option-flow passes. No P1/P2 learning-outcome relationships were fabricated or altered. The History session-to-revision resolver was not independently executed; no browser-resolved revision or membership is claimed.

**Hidden membership guard:** Hosted function-definition inspection confirms the public replacement RPC delegates to the apply function, which rejects a non-selectable new subject before membership writes and permits only retention of an already-owned hidden subject. This is read-only hosted guard evidence, not an executed denied mutation test. No hidden membership request was sent. The initial lookup of the wrapper alone contained no inline gate; following its delegation resolved that inspection limitation, with no corruption finding.

**Hidden-seven public browser flows, including Geography/Psychology/Sociology:** DEFERRED UNTIL CONTROLLED VISIBILITY. No visibility enabled.

## Automation environment, evidence and cleanup

Owner reported that normal Chrome did not reproduce the automated browser's earlier login appearance difference. **AUTOMATION-BROWSER ENVIRONMENT DIFFERENCE — normal Chrome comparison did not reproduce the issue; no product-code change warranted.** This comparison is owner-provided evidence, not an independent normal-Chrome test by the agent. The unsupported `--disable-blink-features=AutomationControlled` browser banner is not a Lockdin defect.

No QA membership, task, route, option selection or paper attempt persisted. One authorized browser mutation request was attempted and rejected atomically; no second submission or workaround followed. Reload discarded the unsaved History selection. Existing content and historical memberships remain intact.

Local Playwright snapshots/screenshots are retained outside the repository in the task visualization directory under `b5d-evidence`. The `b5d-history-failure.png` main-content screenshot shows the unsaved History/session surface; the transient toast is evidenced by the captured accessibility snapshot and response above, not claimed to remain in that screenshot. The full Settings screenshot was used for desktop visual inspection and is not embedded here because it includes account sidebar information.

## Final gate and owner handoff

**BLOCKED.** One BLOCKER (B5D-001), one MEDIUM (B5D-002), no additional Critical/High/Low findings established in exercised scope. Untested flows remain explicitly unexecuted; this is not release clearance.

Mutation testing stopped under the handoff rule. Only read-only diagnosis, invariant/runtime verification, evidence retention and this report update followed. No product code edits, hotfix, catalogue/route mutation, visibility change, commit or push.

Owner review is required for a separate fix slice covering Settings new-subject route/options collection and safe error presentation. After a reviewed fix is deployed, resume B5D at fresh QA enrollment and complete the remaining route/options, task, settings-change, paper-attempt, responsive and keyboard matrix. Do not advance to B5E or issue beta invitations on this result.
