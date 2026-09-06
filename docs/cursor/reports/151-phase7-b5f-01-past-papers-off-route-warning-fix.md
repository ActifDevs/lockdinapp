# LOCKDIN — B5F-01 PAST PAPERS OFF-ROUTE WARNING FIX

## Scope

B5F-01 was limited to the local Past Papers warning defect. No Production
deployment, Production mutation, migration, visibility change, grant,
membership, beta invitation, or B5E rework was performed.

Baseline implementation SHA:

`7a058e6b967e1d45ccca5024783df65a7933d33d`

## Root Cause

The Past Papers component selector emits string values. The warning predicate
previously required the selected component ID to have JavaScript number type.
Consequently, an off-route component selected in the UI never reached the
warning condition, even though the route catalogue and component IDs were
otherwise valid.

The selected subject ID was also normalized before membership and route
catalogue lookup so string-valued form controls cannot prevent route context
resolution.

## Implementation

The shared route-selection module now exposes a semantic classifier with three
outcomes:

- `ON_ROUTE`
- `OFF_ROUTE_SAME_VERSION`
- `INVALID_VERSION_OR_UNRESOLVED`

The classifier requires a resolved membership, pinned syllabus version,
assessment route, route catalogue, and route component list. It fails closed
when route or version context is unavailable. It does not mutate membership
route/version data or study-option selections.

Past Papers normalizes selector IDs before classification. Same-version
off-route components remain selectable and display the accessible inline
warning:

> This paper is outside your assessment route. Logging it will not change your
> route or syllabus.

Returning to an on-route component removes the warning.

## Verification

Focused route-selection and Past Papers tests cover:

- History, Geography, Psychology, Sociology, and no-option route structures;
- on-route and same-version off-route classification;
- wrong-version and unresolved catalogue failure;
- string-valued component selector behavior;
- warning appearance and removal when switching components;
- existing Past Papers mutation and retry behavior.

Focused result:

`3 test files, 60 tests passed`

Frontend typecheck:

`PASS`

Production frontend build:

`PASS`

The full frontend suite completed with 311 passing tests and one unrelated
timeout in `src/pages/onboarding.sessions.test.tsx`:

`requires a visible override for a subject that cannot use the global default`

## Attempt Safety

Past Paper attempt creation remains limited to attempt fields. The fix does not
send or update assessment route IDs, syllabus versions, memberships, or study
options.

## Accessibility

The warning remains inline in the existing semantic alert region associated
with the component selection flow. No keyboard-only smoke test was added in
this local slice; full accessibility compliance is not claimed.

## Production Status

No Production deployment or mutation occurred during B5F-01.

Production remains:

- migration `21 / 0020_subject_visibility_grants`;
- current-nine globally selectable `9/9`;
- new-seven globally selectable `0/7`;
- visibility grants `0`;
- temporary Geography memberships `0`.

## Final Status

B5F-01 local implementation and regression coverage: `PASS`

Production verification and deployment are deferred to the separately
authorized B5F-02 slice.
