# LOCKDIN - PHASE 7 B5E-F3R2 GEOGRAPHY PRODUCTION RETEST

**Date:** 2026-09-06 UTC

**Status:** PASS WITH REVIEW NOTE - targeted Production retest complete and cleaned up

## Scope and Authorization

This was a targeted retest of the B5E-001 Geography Settings save-state fix
using the existing internal QA account only. No real beta invitations were
sent. No global new-seven visibility, migration, schema, or product changes
were made. No deployment was performed during this retest because the
implementation was already serving from the authorized SHA.

## Implementation and Deployment

- Application SHA: `b50893172b8c94bff78fbe0672fe0af8a330bdde`
- Web deployment: `dpl_6eaUs8ZxRQkrP7EWW7tSyG6mo3kR`
- Web state: **READY**
- Web SHA: `b50893172b8c94bff78fbe0672fe0af8a330bdde`
- API deployment: `dpl_FzYP7WQoqPuCnghP59FdqgLNubJW`
- API state: **READY**
- API SHA: `b50893172b8c94bff78fbe0672fe0af8a330bdde`
- New deployment during retest: **NONE**

## Production Baseline

Before the temporary QA mutation:

- Subjects: 16
- Syllabus versions: 29
- Published / retired versions: 21 / 8
- Route sets / routes: 29 / 95
- Total memberships: 15
- QA-account memberships: 3
- QA-account route-assigned memberships: 2
- QA-account option selections: 3
- Current-nine globally selectable: 9/9
- New-seven globally selectable: 0/7
- Visibility grants: 0

## Controlled Geography Proof

Temporary subject:

- Geography `9696`, subject ID `22`
- Internal QA account only
- One temporary visibility grant, granted by the same QA account

The real Production Settings UI was tested at approximately `390 x 844`:

- Geography selected
- Session: May/June 2027
- Route type: Full A Level
- Paper 3: 2/2 selected
- Paper 4: 2/2 selected
- 0/2 and 1/2 incomplete states were invalid
- 2/2 + 2/2 became valid
- `Save subjects` was enabled

The real UI save completed successfully:

- Request: `PUT /api/user-subjects`
- Response: HTTP **200**
- Persisted syllabus version: `34`
- Persisted route: `40`
- Persisted option rows: 4
- Persisted option IDs: `27, 28, 31, 32`

## Hydration and State

After leaving Settings and returning, Geography hydrated with:

- May/June 2027
- Full A Level
- Paper 3 at 2/2
- Paper 4 at 2/2

The final reload fetched `/api/user-subjects` with HTTP 200. The relevant save
request also returned HTTP 200.

The top-level `Save subjects` control remained enabled after hydration with no
user mutation. Source inspection shows this is expected behavior, not a
route-draft dirty-state signal: the control is disabled only for loading or
catalogue errors, invalid subject-count bounds, a pending replacement, or
invalid newly added subject routes. Retained memberships produce no
`newSubjectIds`, so `newSubjectRoutesReady` is true and the button remains
enabled. The existing retained-only Settings test confirms that a save is
allowed with an unchanged retained membership.

The Geography 2/2 + 2/2 test, and the generic route validation coverage for
History 1/1 groups, Psychology 2/2, Sociology 2/3, and no-option routes,
remain passing. No Geography-specific dirty-state defect was reproduced.

The prior observation is therefore classified as **expected product behavior**,
not asynchronous hydration timing or an unrelated dirty field. A focused
option mutation and restoration was not required to establish the root cause:
route drafts are only held for newly added subjects, while retained-subject
assessment state is read-only in Settings.

## Cleanup

Cleanup used the supported Settings removal path:

- `PUT /api/user-subjects`: HTTP **200**
- Temporary Geography membership: **removed**
- Geography option rows: **removed**
- Temporary Geography visibility grant: **removed**
- Final visibility grants: **0**

Post-cleanup Production invariants:

- Total memberships: 15
- Geography memberships: 0
- QA-account memberships: 3
- QA-account route-assigned memberships: 2
- QA-account option selections: 3
- Geography option rows: 0
- Current-nine globally selectable: 9/9
- New-seven globally selectable: 0/7
- Temporary Geography membership residue: **NONE**
- Visibility-grant residue: **NONE**

Historical non-QA membership and option counts returned to their pre-test
baseline. No global subject visibility flags changed.

## Runtime and Browser Health

Production runtime logs for the two-hour retest window showed:

- Web 5xx logs: **none**
- API 5xx logs: **none**
- API error/fatal/warning logs matching route, option, or visibility terms:
  **none**

The relevant final network requests completed successfully: the final GET and
the save PUT for `/api/user-subjects` both returned HTTP 200.

One intermediate browser console resource error reported HTTP 400 for
`/api/user-subjects`. The retained browser evidence does not include the
failed request's method, request payload, response body, or request purpose;
the network listing retained only the successful GET and PUT entries. It is
therefore classified as **UNEXPLAINED REVIEW NOTE**, not as an established
product defect. No save failure or persistence inconsistency resulted.

Keyboard smoke was **NOT EXECUTED**. This does not establish full accessibility
compliance.

## Residuals

- B5D-006: **OPEN - MEDIUM**
- Accessibility keyboard smoke: **NOT EXECUTED**
- Real beta invitation authorization remains a separate compliance activity.

## Final Verdict

**PASS WITH REVIEW NOTE**

The targeted Geography Production save, persistence, hydration, cleanup, and
final invariant gates passed. B5E-001 remains **FIXED IN PRODUCTION**. The
hydrated enabled Save control is expected from the current Settings contract.
The single intermediate HTTP 400 remains an unexplained evidence limitation
and should be investigated separately if it recurs. The next controlled stage
remains separately authorized. Do not invite real beta users or change global
new-seven visibility as part of this report.
