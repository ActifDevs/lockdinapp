# LOCKDIN — PHASE 7 B5D-F1 SETTINGS ROUTE ENROLLMENT FIX

**Date:** 2026-09-05 UTC
**Status:** PASS WITH REVIEW NOTES — implementation and automated verification complete; local/Preview browser QA was not available
**Baseline:** `e810a0d8e0cc5687c8c51d8991bacc8783de42d8` (`main`, matching freshly fetched `origin/main` at preflight)
**Repository action:** Reviewable working-tree diff only. No commit, push, deployment, migration, hosted catalogue mutation, visibility change, membership backfill, or hosted membership mutation.

## Scope and frozen evidence

Reports 132, 133, and frozen Report 134 were read before implementation. Report 134 remains unchanged and is the authoritative hosted reproduction for B5D:

- retained Biology, Chemistry, and Physics;
- selected History 9489 for May/June 2027;
- no route or option picker appeared;
- `PUT /api/user-subjects` returned HTTP 400 with `Choose how you are taking this subject.`;
- Settings replaced that safe reason with generic retry copy;
- no partial membership or option rows were written;
- the historical syllabus-pin snapshot remained unchanged.

This fix addresses only B5D-001 and B5D-002. Server validation and transaction rules were not weakened or changed.

## Root causes

### B5D-001 — confirmed

`artifacts/revision-platform/src/pages/settings.tsx` rendered `MembershipAssessmentPanel` for retained memberships, but newly selected subjects had only exam-session controls. The replacement body therefore included subject IDs and session data without the version-scoped `routeAssignments` already accepted by the API.

### B5D-002 — confirmed

`productSafeAssignmentError` allowed only session-related messages. It discarded known safe route and study-option validation messages, including `Choose how you are taking this subject.`, and Settings fell back to a generic retry message.

## Implementation

### New Settings state model

Settings now holds new-subject route catalogues and drafts separately from retained membership state:

- catalogue identity: `subjectId` plus resolved `syllabusVersionId`;
- draft identity: `subjectId`, selected `routeId`, and generic `optionIds`;
- retained memberships continue through their existing read/edit path;
- only IDs absent from the retained-membership set are included in the new-subject route flow.

Every new subject must resolve a supported session and syllabus version, load a matching route catalogue, reach the explicit `ready` load state, and pass generic route/option validation before **Save subjects** is enabled. Loading and failed refresh states keep Save disabled even when an older compatible draft remains visible.

### Route fetching and stale-state handling

Settings reuses `OnboardingRouteStep` and the existing route-selection helpers rather than introducing a Settings-specific contract. The shared step fetches each new subject's route catalogue using the session-resolved syllabus version and handles all existing modes:

- `none_available`: safe unavailable copy and blocked Save;
- `auto`: sole route selected automatically and displayed;
- `explicit`: accessible radio group requiring a route choice.

Multiple catalogues load concurrently. A response from an obsolete render is ignored. Changing the global session clears all new-subject route state; changing one subject's session or toggling that subject off/on clears only that subject. Compatible, valid drafts for other subjects are preserved when catalogues refetch. Dependency comparison uses availability content, preventing equivalent query arrays from restarting the loader.

### Study options

The existing generic `StudyOptionPicker` remains the only option model. It consumes catalogue `minSelections` and `maxSelections`; existing helper coverage includes 1/1, 2/2, and 2/3 groups. Route changes clear that subject's option IDs. The picker prevents selection beyond the maximum, and validation blocks zero/under-selection. Routes without option groups render no unnecessary picker and become valid after route selection.

### Replacement request

After all new-subject drafts validate, Settings builds `routeAssignments` with the existing `routeAssignmentsPayload` helper and sends it in the same `PUT /api/user-subjects` request as subject IDs and session data. No incomplete draft, route from a different resolved version, or retained membership route is added to the payload. The server remains authoritative and revalidates the request inside the existing atomic transaction.

### Error UX

Known safe server messages now include:

- `Choose how you are taking this subject.`
- `No assessment route is available for this subject yet.`
- `Invalid assessment route assignment.`
- `Select the required number of study options.`

Settings shows the safe reason inline beside the route configuration and in the existing toast, then focuses and scrolls toward that configuration where the browser supports it. Unknown errors keep the generic fallback. SQL, constraint, RPC, Supabase, and stack details are not rendered.

## Regression proof

### History 9489 / May–June 2027

The focused Settings test uses History code 9489, resolves May/June 2027 to syllabus version 10, verifies the version-scoped route request, exposes three explicit routes, and requires one option from a 1/1 group. It proves:

- zero options keeps Save disabled;
- one option enables Save after a route choice;
- attempting a second choice cannot exceed the 1/1 maximum;
- changing the route clears the prior option;
- the request includes History's route and selected option.

The local assignment-availability test independently proves History includes May/June 2027 and excludes Oct/Nov 2026. Browser persistence against an actual History catalogue remains for post-deployment B5D resumption.

### Additional current-nine and no-option route

Chemistry 9701 provides the additional generic subject regression. Its explicit multi-route test resolves the requested version, renders the picker, clears the draft after a session change, and permits Save after re-selection. The selected route has no option groups, so no option choice is required and `optionIds` is empty.

### Multiple new subjects

Focused tests add Chemistry and History together, verify independent route assignments, preserve Chemistry's valid route while History loads, keep History invalid until its own route is chosen, and emit separate assignment rows. An auto-route multi-subject case also verifies independent per-subject assignments with different session choices.

### Retained memberships

Frontend tests prove retained-only and removal-only replacements omit new-assignment fields. A retained assigned route is not resent or changed, and retained legacy null-route state stays outside the new-subject route payload. Local integration proves legacy null-route viewing does not mutate it and intentional remediation preserves the existing syllabus pin. Existing server replacement tests continue to prove retained pins and caller data isolation.

No code path in this slice changes progress, notes, tasks, or paper history. No hosted write was attempted, so the historical hosted state frozen in Report 134 remains unchanged.

## Atomicity and API integration

The dedicated local Supabase harness first passed 11 target-safety tests, including rejection of hosted Supabase URLs. It reset only the dedicated local stack and ran the non-skipping HTTP/RPC integration suite: 6 files and 53 tests passed.

The route integration now directly proves, against the local database:

| Case                                                  | Result                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| New multi-route membership without `routeAssignments` | HTTP 400 with `Choose how you are taking this subject.`; zero membership/option writes |
| Route belonging to the wrong subject/version          | Rejected; zero replacement writes                                                      |
| Unknown option ID                                     | Rejected; zero replacement writes                                                      |
| Insufficient option cardinality                       | Rejected; zero membership/option writes                                                |
| Valid route and options                               | Membership and option state commit atomically                                          |
| Existing route and syllabus pin                       | Preserved after rejected cross-version assignment                                      |
| Legacy null route                                     | Remains null on read; pin preserved on explicit remediation                            |

## Hidden-seven and migration safety

No subject catalogue, visibility, route manifest, or migration file changed. Migrations 0016, 0017, and 0018 are untouched; no migration was added. Migration integrity passes with 19 migrations and head `0018_subject_visibility_and_route_assignment`.

The public catalogue remains server-filtered. Existing integration coverage proves hidden subjects are omitted, hidden new enrollment is rejected, and an already-owned hidden membership remains readable. This slice does not enable 8021, 9093, 9626, 9696, 9699, 9706, or 9990. Visibility mutations: 0.

## Files changed

- `artifacts/revision-platform/src/pages/settings.tsx` — new-subject route state, validation, payload, and inline safe errors.
- `artifacts/revision-platform/src/components/onboarding-route-step.tsx` — reusable multi-subject loading, unavailable/error presentation, compatible-draft preservation, and stale-response safety.
- `artifacts/revision-platform/src/lib/membership-session-selection.ts` — safe route/option error allowlist.
- `artifacts/revision-platform/src/pages/settings.mutation.test.tsx` — B5D frontend regressions.
- `artifacts/api-server/src/routes/assessment-routes.integration.test.ts` — explicit zero-write replacement cases.
- `docs/cursor/reports/135-phase7-b5d-settings-route-enrollment-fix.md` — this report.

## Verification

| Check                                                  | Result                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `pnpm check:migrations`                                | PASS — 19 migrations; head 0018                                          |
| `pnpm --filter @workspace/scripts test:route-manifest` | PASS — 10 files, 46 tests                                                |
| `pnpm --filter @workspace/scripts test:harness`        | PASS — 5 files, 44 passed, 1 skipped                                     |
| `pnpm --filter @workspace/scripts test:unit`           | PASS — 7 files, 44 tests                                                 |
| Focused Settings + onboarding                          | PASS — 2 files, 20 tests on final implementation                         |
| Full Revision Platform suite                           | PASS — 44 files, 281 tests                                               |
| Full API server unit suite                             | PASS — 37 files, 190 tests                                               |
| Dedicated local API integration                        | PASS — 11 safety tests, then 6 files / 53 tests                          |
| Repository-wide `pnpm run typecheck`                   | PASS — libraries, API server, mockup sandbox, Revision Platform, scripts |
| `git diff --check`                                     | PASS                                                                     |

An initial unrestricted frontend run and an early one-worker retry exhausted Node's heap because clearing parent route state caused a loader loop when equivalent assignment arrays had new identities. That defect was fixed by content-keying the dependency and preserving compatible drafts. The final clean full run passed 44/44 files and 281/281 tests in 216.88 seconds.

## Preview/browser QA

**NOT EXECUTED — PREVIEW BROWSER NOT AVAILABLE.** No local web/API preview was listening on the standard project ports after automated verification, and the open browser surface points to Production. Production mutation was prohibited, so the History enrollment, rendered route/options interaction, and error UX were not relabelled as browser PASS.

Post-deployment owner-authorized B5D must repeat the exact History 9489 May/June 2027 journey in a fresh QA enrollment and finish the remaining browser matrix from Report 134.

## Production and repository state

- Hosted mutations: 0.
- Hosted catalogue/reference writes: 0.
- Visibility mutations: 0.
- Deployment: none.
- Commit: none.
- Push: none.
- Production remains at the previously frozen deployment state; this working-tree fix has not been published.

## Verdict and next steps

**PASS WITH REVIEW NOTES.** B5D-001 and B5D-002 are fixed in the reviewable local diff and covered by frontend, API, and local-database integration tests. Browser confirmation remains intentionally unexecuted until the exact reviewed SHA is deployed.

Next:

1. Owner review and freeze B5D-F1.
2. Deploy the exact frozen fix SHA.
3. Resume B5D from a fresh QA History enrollment.
4. Do not advance to B5E until resumed B5D passes.
