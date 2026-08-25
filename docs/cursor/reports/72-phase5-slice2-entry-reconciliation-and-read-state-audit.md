# Phase 5 Slice 2 — Entry Reconciliation and Read-State Audit

- **Audit date:** 2026-08-25
- **Scope:** audit/design gate and documentation only
- **Application implementation:** not started

## Canonical baseline

| Item | Audited value |
| --- | --- |
| Repository | `https://github.com/ActifDevs/lockdinapp.git` |
| Branch | `main` |
| Starting `HEAD` | `013a9177b543597264ee931387c71f926d1757ad` |
| Starting `origin/main` | `013a9177b543597264ee931387c71f926d1757ad` |
| Working tree at entry | Clean |
| Update result | `git fetch origin` and `git pull --ff-only origin main`; already current |
| Slice 1 | Closed |
| Slice 2 implementation | Not started |

No intervening commit, branch drift, or local work was present. The audit used
current canonical source rather than carrying Report 69 findings forward
without revalidation.

## Governing sources

The following were read in full:

- `docs/cursor/05-frontend-cutover.md`
- `docs/cursor/reports/69-phase5-entry-audit-and-frontend-cutover-reconciliation.md`
- `docs/cursor/reports/70-phase5-slice1-account-scoped-notification-preferences.md`
- `docs/cursor/reports/71-phase5-slice1-merge-and-production-closeout.md`
- `docs/lockdin-architecture-plan.md`

Current mounted pages, App/route composition, generated query functions,
`customFetch`, shared error copy, AuthProvider behavior, browser-state hooks,
and focused tests were inspected directly. The Supabase boundary remains Auth
in the browser and application data through the hardened `/api` surface.

## Slice 1 handoff

Report 71 is authoritative. The established account-scoped notification
preference model remains intact:

- account-scoped notification preferences: PASS
- User A -> User B isolation: PASS
- User B -> User A restoration: PASS
- Production preference persistence: PASS
- reminder regression: PASS

No current-source regression was found. This audit does not reopen preference
storage, legacy cleanup, or Reminder Runner isolation.

**PHASE 5 SLICE 1: CLOSED**

## Read/error-state matrix

Classification key: A complete/no change; B error presented correctly; C
failure silently appears empty; D partial-data policy unclear; E loading policy
incomplete; F retry/recovery gap; G outside Slice 2.

| Page / dependency | Endpoint and auth | Current loading / success / empty | Current error, retry, partial and stale behavior | Status semantics | Class / recommendation |
| --- | --- | --- | --- | --- | --- |
| Subject Detail — subject | `GET /api/subjects/:id`; public | Full-page skeleton; subject shell; missing data joins the error branch | Error copy and retry exist. A cached subject is hidden when a background refetch is errored because `isError` wins. | 401 is not expected anonymously; global handler still applies if received. 403 remains an error. 404 currently looks like a retryable load failure. 5xx/network use safe helper copy. | **B/F** — keep full-page failure, but distinguish terminal 404 from retryable failures and define stale-data behavior. |
| Subject Detail — syllabus | `GET /api/subjects/:id/syllabus`; optional auth | No section loading state; success drives progress/disclosures; `[]` shows unavailable copy | Failure becomes `undefined`: 0% header and a visually blank syllabus list, with no retry. Other primary/secondary content remains usable. Cached data may remain but has no stale warning. | 401 follows global handling; 403/404/5xx/network are silent; cancellation is query-managed. | **C/D/E/F** — section loading/error/retry; retain primary page and unrelated sections. |
| Subject Detail — performance | `GET /api/subjects/:id/performance`; authenticated | No section loading; success drives latest score, insight, stats and both performance cards | Failure becomes N/A/zero/empty-state content; no retry. Cached data can be displayed silently after refetch failure. | 401 global; 403/404/5xx/network silent. | **C/D/E/F** — unavailable indicators and section retry without a whole-page outage. |
| Subject Detail — tasks | `GET /api/tasks?subjectId=:id`; authenticated | No section loading; success drives header count, overview and task tab | Failure becomes zero pending tasks and genuine task empty states; no retry. Cached data can be displayed without failure indication. | 401 global; 403/404/5xx/network silent. | **C/D/E/F** — localized loading/error/retry shared by both task surfaces. |
| Subject Detail — attempts | `GET /api/past-paper-attempts?subjectId=:id`; authenticated | Query is issued, but its result is not consumed by mounted UI | Failure has no visible state because the dependency is redundant; performance already supplies the rendered aggregates/trend. | Global transport/auth rules still apply. | **G** — do not manufacture read-state UI for an unused result; remove only in a separately reviewed cleanup or while touching the page if explicitly approved. |
| Study Plan — tasks | `GET /api/tasks?filter=:view`; authenticated | Skeleton; task rows; rich genuine empty state | Error is ignored and renders the same empty state. No retry. Each filter has a separate cache; stale cached rows can remain visible with no warning after refetch failure. | 401 global; 403/404/5xx/network silent. | **C/D/F** — explicit task error/retry and deliberate stale-data notice; never show the motivational empty state for an errored query. |
| Study Plan — memberships | `GET /api/user-subjects`; authenticated | No loading presentation; success supplies create-form subjects; genuine zero memberships has no dedicated guidance | Failure produces an empty selector indistinguishable from no membership; Add Task remains available; no retry. Cached options may remain silently. | 401 global; 403/404/5xx/network silent. | **C/E/F** — gate only subject-dependent creation, explain loading/error/zero state, provide retry; task viewing remains usable. |
| Past Papers — memberships | `GET /api/user-subjects`; authenticated | Loading disables filter/logging; success supplies filters/form; zero gets a Settings CTA | Error alert and retry exist; historical attempts remain usable. Stale data is intentionally suppressed while `isError` is true. | 401 global; 403/404/5xx/network use the same localized alert. | **B** — preserve the partial-page policy. |
| Past Papers — attempts | `GET /api/past-paper-attempts[?subjectId=]`; authenticated | Paper-log skeleton; success drives chart and history; `[]` gets genuine empty states | Failure becomes empty chart/history and invites logging; no retry. Cached attempts may display silently on refetch error. | 401 global; 403/404/5xx/network silent. | **C/D/F** — shared attempts error/retry for chart and log; preserve logging if its own dependencies are healthy. |
| Past Papers — components | `GET /api/subjects/:id/assessment-components`; public | No selector loading state; success supplies component choices; genuine `[]` is not explained | Failure looks like an empty selector; no retry; form submit cannot become valid. Page/history should not be blocked. Cached options may remain silently. | A received 401 still uses global handling; 403/404/5xx/network are silent. | **C/E/F** — form-local loading/error/empty/retry and disable only component-dependent submission. |
| Settings — profile | AuthProvider resolves `GET /api/profile`; authenticated | Protected route waits for AuthProvider; Settings form is seeded/synchronized from resolved user | Bounded profile bootstrap failure signs out safely. No separate Settings query exists; profile mutation feedback is a later mutation slice concern. | 401/global auth behavior is authoritative; other bootstrap failure is handled by AuthProvider. | **A/G** — no Slice 2 page read change. |
| Settings — memberships | `GET /api/user-subjects`; authenticated | Explicit loading; success seeds editable selection; empty membership is valid input state | Error says the saved selection was not changed and offers retry. It suppresses editing. | 401 global; other statuses retain distinct localized failure. | **B** — preserve. |
| Settings — subject catalogue | `GET /api/subjects`; public | No loading state; success supplies choices; `[]` and pending both reach unavailable copy once membership loading finishes | Failure is indistinguishable from an empty catalogue, with no retry. Cached catalogue can remain without a refetch-failure notice. | 401 global if unexpectedly returned; 403/404/5xx/network silent. | **C/E/F** — compose catalogue and membership states; catalogue failure disables only subject editing and offers retry. |
| Settings — notification prefs/theme | user-scoped/device browser state; no API read | Synchronously restored through established hooks | Slice 1 preference behavior and device theme work as designed. | Not an HTTP surface. | **A/G** — preserve; do not reopen Slice 1. |

TanStack Query retries ordinary failed reads once by App default. That automatic
retry is not a user recovery path. Generated query functions pass their
`AbortSignal` to `customFetch`; cancellation/obsolescence is query-managed and
must not be converted into a visible error. No application-level timeout is
configured.

## Subject Detail findings

The subject record is the only primary dependency. An invalid ID already gets
a dedicated not-found page, and an unsuccessful subject query gets a
full-page retryable error. The HTTP 404 case should use a non-retry-first
"subject not found" presentation with a route back to Subjects; transient
403/5xx/network failures may retain retry. If a background refetch fails while
a subject is cached, the approved implementation should retain the safe cached
shell with an unavailable/stale notice rather than blanking it automatically.

Syllabus, performance and tasks are independent secondary resources. Their
failure must not replace the subject shell or each other. Each affected
surface needs an initial loading state, unavailable/error copy, and retry. A
syllabus failure must not claim 0% progress; a performance failure must not
claim zero papers or invite the user to create first data; a task failure must
not claim there are no pending/subject tasks. Existing cached data may remain
visible only with a localized refresh-failed/stale notice and retry.

The page's attempts query is not used. It should not acquire artificial UI or
expand Slice 2. Topic/task mutation feedback, bulk topic coordination, and
duplicate invalidation remain the planned mutation slice, not this read slice.

## Study Plan findings

The task list is primary page content and must distinguish task-query failure
from a real zero result. The current skeleton is adequate for initial loading,
but the error branch and user retry are missing. A refetch failure with cached
rows should preserve the rows with an inline refresh warning rather than
replace them or silently imply freshness.

Memberships are a dependency of task creation, not task viewing. Loading,
failure, or genuine zero membership should disable/annotate the Add Task form
subject control and submission, with retry or a Settings CTA as appropriate.
They must not block an already-loaded task list. Global 401 remains the only
session/logout path.

## Past Papers findings

Membership handling already demonstrates the correct partial-page model: its
failure disables logging/filtering, shows an alert/retry, and leaves historical
attempts independently usable. Preserve it.

Attempts are the primary data behind both the trend and paper log. An attempts
failure currently creates two false-empty surfaces. One attempts-level error
and retry should replace those empty invitations while logging remains
available when memberships/components are healthy. Cached history may remain
visible with a refresh warning.

Assessment components are form-local reference data. Their failure must only
block component selection/submission, show form-local retry, and leave paper
history, filters and the rest of the form/page intact. A genuine empty
component catalogue needs distinct unavailable copy.

## Settings findings

AuthProvider, not Settings, owns the profile read; protected content does not
mount until the session/profile is resolved. The memberships query already has
explicit loading, error, retry and selection-protection behavior.

The public subject catalogue is the remaining read gap. It is destructured as
data only, so pending, network/server failure and a genuine empty catalogue can
collapse into the same message. Slice 2 should expose catalogue loading/error/
retry, keep other Settings tabs usable, and disable only subject-selection
editing until both catalogue and membership state are authoritative.

Notification preferences are user-scoped browser state approved and verified
in Slice 1. Theme is a device preference. Neither is a Slice 2 read gap.

## Error semantics

| Condition | Existing boundary | Approved Slice 2 rule |
| --- | --- | --- |
| 400 | `ApiError` preserves status and safe server payload | For reads, show localized request failure; do not claim empty. Mutations remain outside this slice. |
| 401 | `customFetch` schedules AuthProvider's global unauthorized handler; cache clear/sign-out/login redirect | Preserve exactly. Pages must not duplicate logout/session logic. |
| 403 | Ordinary `ApiError`; never invokes unauthorized handler | Show unavailable/forbidden at the affected page or section. Never relabel as 401 or force logout. |
| 404 | Ordinary `ApiError` | Primary subject: terminal not-found navigation. Secondary/reference reads: affected-resource unavailable/error, not a false empty. |
| 409 | Ordinary `ApiError`; onboarding has specific username-conflict handling | Read surfaces should preserve conflict distinction if ever returned; no new mutation policy here. |
| 500 | `getQueryErrorMessage` replaces server detail where used | Reuse safe production copy at every new read error surface. |
| Network | Fetch rejection; helper recognizes common network failures | Show recoverable localized failure and retry. Production copy should remain environment-neutral when the helper is next refined. |
| Cancelled/obsolete query | Generated query function passes TanStack `AbortSignal` to fetch | Let TanStack restore/manage query state; never show a cancellation as a user error. |

The existing `getQueryErrorMessage` and page-level visual language should be
reused. A small shared compact read-error/retry component is justified only if
it accepts page-specific titles/copy and full/section/form layouts; consistency
must not force secondary failures into a whole-page UX.

## UI/navigation-state persistence inventory

Ownership categories: A intentionally reset; B memory-only; C
URL-addressable; D browser-persisted device; E user-scoped browser; F
server-derived/restored.

| Audited area | Current behavior across refresh/history/remount | Expected category | Issue | Recommendation |
| --- | --- | --- | --- | --- |
| Route/page selection | Wouter path/history is authoritative; direct loads are rewritten to the SPA | **C** | No defect found | Preserve route ownership. |
| Settings active tab | `?tab` is read once into uncontrolled `Tabs defaultValue`; clicks change Radix state only | **C** | Clicked tab is absent from URL and resets after refresh/remount/discarded tab; invalid query values can render no panel | Controlled, validated `?tab=account|subjects|appearance|notifications`; tab changes update Wouter-compatible history. |
| Settings unsaved profile/subject form edits | Component state; profile re-syncs from user and subjects from membership response | **B**, saved result **F** | Unsaved edits reset on remount/refresh, which is normal form-draft behavior | Keep memory-only; consider dirty-navigation warning only if future evidence warrants it. |
| Appearance theme | Global localStorage key restored by ThemeProvider | **D** | Works as intended; device preference need not be account-owned | Preserve. |
| Notification choices | Account-qualified localStorage restored after identity resolution | **E** | No current regression | Preserve Slice 1 contract. |
| Subject Detail active tab | Uncontrolled `Tabs defaultValue="overview"` | **C** | Syllabus/tasks/performance view resets on refresh, away/back remount and direct load; not linkable | Validated `?tab=overview|syllabus|tasks|performance`. |
| Subject syllabus expanded units | Component `Set`; survives renders only | **B** | Reset on remount/refresh, but disclosure state is high-volume and transient | Keep memory-only; do not put unit IDs in browser storage or server state. |
| Study Plan task view/filter | Controlled component state defaulting to `today`; it also changes the query key | **C** | Upcoming/completed/all resets and is not linkable; back/forward cannot restore view | Validated `?view=today|upcoming|completed|all`. |
| Study Plan dialog/form draft | Component/dialog/react-hook-form state | **A/B** | Reset on navigation/refresh; appropriate for an unsubmitted task draft | Keep ephemeral/memory-only. |
| Past Papers subject filter | Controlled component state defaulting to `all`; affects query key and both chart/log | **C** | Filter resets and back/forward cannot restore it | Validated `?subject=all|<current-membership-id>`; normalize stale/invalid IDs to `all`. |
| Past Papers log dialog/form draft | Component/dialog/react-hook-form state | **A/B** | Reset on navigation/refresh; selected component correctly resets when subject changes | Keep ephemeral/memory-only. |
| Progress views | No local selected view/filter/pagination state; server response drives content | **F** | No persistence defect | No implementation. |
| Calendar viewed month and selected date | Two component dates initialized to today | **C** | Month/date reset on refresh, back/forward and remount; selected date is meaningful navigation context | Use validated ISO query state, preferably `?month=YYYY-MM&date=YYYY-MM-DD`; derive defaults from today and normalize invalid dates. |
| Subjects page | No local filter/selection/pagination; membership/progress/task/attempt/syllabus queries drive cards | **F** | No persistence defect | No implementation. |
| Dashboard | No local selected view/filter/pagination; server state and derived presentation drive content | **F** | No persistence defect | No implementation. |
| Desktop sidebar collapsed | Global localStorage key | **D** | Works as intended as a device layout preference | Preserve. |
| Mobile menu / More drawer | AppShell component state closes on route change | **A** | No defect; persistence would reopen navigation unexpectedly | Preserve reset. |
| Onboarding wizard and draft | Page-local step and form/selection state; completed profile/memberships are server state | Draft **B**, completion **F** | Refresh loses an incomplete draft; previously documented debt, not evidence for the read slice | Keep out of Slice 2 and navigation slice unless product explicitly approves draft recovery. |
| Login/signup/recovery forms | Page-local form/submission state | **A/B** | Reset prevents credentials and transient errors from being persisted | Preserve. |
| Scroll position | AppShell explicitly scrolls to top on every route-location change | **A** | Browser back does not restore prior product-page scroll | Keep current deliberate reset; browser-history scroll restoration would require its own evidence and accessibility review. |
| Pagination | No mounted product-page pagination state found | N/A | No issue exists | Do not manufacture work. |

Normal in-place rendering preserves component state. Route navigation that
unmounts a page, a full refresh/direct URL load, authentication-driven
recreation, browser memory discard, or a true component remount recreates the
defaults above. There is no `visibilitychange` handler resetting tabs; merely
hiding/showing a still-mounted tab does not reset them. A browser that discards
and reloads the document behaves like refresh and exposes the default-state
problem. Browser back/forward can restore only state represented by Wouter's
path/search or retained by a still-mounted component; current product routes
unmount the prior page.

## Settings active-tab root cause

Settings computes `defaultTab` from `window.location.search` on render and
passes it to Radix as `Tabs defaultValue`. This is uncontrolled initial state,
not a URL-synchronized tab model. The triggers neither call Wouter navigation
nor write `history`, so selecting Alerts while at `/settings` leaves the URL as
`/settings`. Refresh, route recreation, document discard/reload, and remount
therefore initialize Account. Directly loading `/settings?tab=notifications`
does initialize Alerts, but later tab clicks still do not update the query,
back/forward does not track tab changes, and an unknown `tab` is not validated.

Settings recommendation: **Option B, query string**. It is a small fit with the
existing `/settings` Wouter route, supports refresh, deep links and history,
and keeps the tablist semantics intact. Path segments add routes and nesting
without product benefit. Browser storage is poor ownership for navigational
state: it is not linkable and would make a previous choice unexpectedly govern
future visits. Component-only state is the confirmed defect.

## Site-wide persistence findings

The confirmed issue is not Settings-only: Subject Detail tabs, Study Plan
view, Past Papers subject filter and Calendar context are independently
meaningful and currently reset. Their policies vary, while theme/sidebar,
account-scoped preferences, disclosures, forms and server-derived product data
already belong to different owners. A shared URL parser/normalizer convention
may be useful, but each page needs its own allowed values, defaults and invalid-
state behavior. No server or browser-storage schema should be introduced for
page navigation.

## Navigation-state scope decision

**NAVIGATION STATE FINDING: SEPARATE PHASE 5 SLICE RECOMMENDED**

The finding spans four unrelated pages and Wouter/history semantics, needs
direct-load and back/forward tests, and has varied ownership rules. Adding it
to Slice 2 would dilute the narrow read/error objective and combine two
independently reversible risks. No navigation-state implementation is
authorized by this audit.

## Recommended state ownership model

1. Path/search owns shareable product location: active Settings/Subject tabs,
   Study Plan view, Past Papers subject filter, and Calendar month/date.
2. TanStack/server state owns authenticated product records and saved account
   selections; identity changes continue to clear protected caches.
3. User-scoped browser state is reserved for explicitly approved per-account,
   per-device preferences such as Slice 1 notifications.
4. Global device browser state is reserved for presentation preferences such
   as theme and desktop sidebar width.
5. Component memory owns disclosures, drawers, dialogs, validation and
   unsaved form drafts; sensitive auth form values are never persisted.
6. Defaults must be validated and canonicalized. Invalid/stale URL values fall
   back safely; URL state must support direct load and browser history rather
   than being read once as a `defaultValue`.

## Test coverage

| Area | Classification | Evidence / required work |
| --- | --- | --- |
| Subject Detail loading/error/partial/retry | **MISSING — SLICE 2** | Static reconciliation asserts live metrics only; no mounted read-state tests. |
| Study Plan loading/error/empty/retry | **EXISTING — PARTIAL** | Static mutation invalidation contract exists; mounted task/membership read failures are untested. |
| Past Papers loading/error/empty/retry | **EXISTING — PARTIAL** | Membership loading/zero, membership removal, selectors and normal history are covered; attempts/component failures and recovery are not. |
| Settings data errors | **EXISTING — PARTIAL** | Membership write/invalidation contract exists; catalogue pending/error/empty and retry composition are untested. |
| Shared error copy | **EXISTING — PARTIAL** | 5xx/network/non-error/404 pass-through unit tests exist; page use, ApiError status presentation, stale data and cancellation are not covered. |
| Partial/stale data behavior | **MISSING — SLICE 2** | No affected page asserts cached data plus refetch error semantics. |
| Global 401 / distinct 403 | **EXISTING — ADEQUATE** | Global-auth 33 tests and transport unauthorized tests preserve the boundary. Add affected-page assertions only where needed to prevent duplicate handling. |
| Settings active tab/direct reload/history | **MISSING — FUTURE NAVIGATION SLICE** | No tab routing test. |
| Subject tab / Study view / Paper filter / Calendar context | **MISSING — FUTURE NAVIGATION SLICE** | No URL normalization, direct-load or back/forward tests. |
| Theme/sidebar/notification persistence | **EXISTING — ADEQUATE** | Theme/scoped preference isolation is covered; sidebar storage is preserved by Slice 1 cleanup coverage. |
| Onboarding draft recovery | **OUT OF SCOPE** | Previously documented product debt; no draft-persistence requirement approved. |

Slice 2 should add mounted page tests with controllable query results for
initial loading, success, genuine empty, status/network failure, manual retry,
secondary partial failure, cached-data refetch failure, and cancellation not
surfacing. The future navigation slice should add a mounted Wouter/history
harness plus direct URL, invalid value, refresh/remount, back and forward cases.

## Baseline validation

No hosted/Production database integration was run.

| Check | Result |
| --- | --- |
| Canonical frontend test wrapper | Known Git Bash signal-pipe launcher failure occurred before Vitest (`Win32 error 5`, exit `3221225794`) |
| Repository-pinned frontend Vitest | **PASS — 20 files / 98 tests** |
| Canonical root typecheck wrapper | Same launcher failure occurred before TypeScript |
| Repository-pinned typecheck | **PASS** — root references, API server, revision platform, mockup sandbox and scripts; no diagnostics |
| Canonical frontend build wrapper | Same launcher failure occurred before Vite |
| Repository-pinned Vite Production build (`PORT=3000`, `BASE_PATH=/`) | **PASS — 3,272 modules** |
| Global-auth policy | **PASS — 33/33** |
| Request-ID middleware | **PASS — 10/10** |

The build emitted only the unchanged tooltip/sheet sourcemap notices. The
launcher failure is environmental tooling evidence, not an application
failure; the pinned repository tools and identical configs passed.

## Gate 0 decisions

**GATE 0 OWNER DECISIONS: NONE**

The dependency boundaries determine the safe read behavior without a product
fork: subject identity is primary; the other Subject Detail resources are
secondary; tasks/attempts are primary within their respective content; and
membership/catalogue/component reads block only their dependent write/filter
controls. Cached data with a refresh failure remains visible but clearly marked
stale/unavailable. Global 401 and distinct 403 behavior are already governed.

Navigation work is deliberately excluded and recommended as a separate slice;
therefore its page-specific URL implementation does not block Slice 2 entry.
The future navigation slice may use the recommendations here as its design
baseline without reopening Slice 1.

## Exact Slice 2 implementation scope

1. **Shared read-state support** — reuse `getQueryErrorMessage`; add a small
   accessible read-error/retry presentation only if it stays configurable for
   full-page, section and form-local use. Preserve cancellation and global 401.
   Test status-safe copy, retry callbacks and non-presentation of cancellation.
2. **Subject Detail** — expose complete query state for subject, syllabus,
   performance and tasks; distinguish subject 404; add secondary loading,
   localized error/retry and cached-refresh warnings; prevent false zero/N/A/
   empty claims. Do not add UI for the unused attempts query. Add mounted tests
   for each dependency alone and in partial combinations.
3. **Study Plan** — add task failure/retry and stale-data warning; compose
   memberships loading/error/zero only into task-creation availability and
   guidance. Add mounted task and membership state tests.
4. **Past Papers** — add attempts failure/retry and cached-history warning
   shared across chart/log; add assessment-component loading/error/empty/retry
   inside the log form; preserve existing membership partial behavior. Extend
   mounted tests.
5. **Settings** — expose public catalogue loading/error/refetch; compose it
   with memberships so only subject editing is disabled and other tabs remain
   usable. Add catalogue pending/error/empty/retry tests.
6. **Verification** — full frontend tests/typecheck/build, global-auth 33 and
   request-ID 10. Preview QA must simulate safe 403/404/5xx/network failures
   and recovery, verify no false empties, partial-page usability and no logout
   except 401. Human QA must repeat loading/retry/stale/partial flows on the
   four pages and confirm normal empty states remain inviting and accurate.

Implementation risk is **medium**: the main danger is converting an optional
secondary failure into a whole-page outage or presenting cached personal data
as current. Changes stay page/local-helper/test-only and remain independently
reversible. No API/data/security contract needs to change.

## Explicit non-goals

- No implementation during this audit.
- No Settings/Subject tabs, Study Plan view, Past Papers filter, Calendar URL
  state, router/history, scroll restoration, onboarding draft persistence, or
  other navigation-state work.
- No reopening of notification preference storage, legacy cleanup, Reminder
  Runner isolation, theme, or sidebar persistence.
- No mutation feedback, bulk topic coordination, duplicate invalidation,
  profile-to-dashboard cache change, optimistic updates, or new write surface.
- No auth-provider/session rewrite, page-level logout logic, direct Supabase
  data access, API/OpenAPI/generated-client contract change, backend change,
  database/schema/migration/RLS/RPC change, reference-data change, environment
  change, Vercel configuration change, or checkpoint update.
- No request timeout framework, request-ID UI, broad visual redesign,
  pagination, Production DB integration, or Production human QA.

## Risk assessment

- **Partial-data risk:** highest; sections must fail independently.
- **Stale-data risk:** cached data must be labeled when refresh fails and must
  still be cleared on identity changes by the established AuthProvider path.
- **Auth risk:** shared error handling must not turn 403 into 401 or duplicate
  logout.
- **False-empty risk:** tests must prove error, pending and genuine zero are
  mutually distinguishable.
- **Scope risk:** navigation and mutation reconciliation stay separate.
- **Tooling risk:** use pinned Windows tools when the documented wrapper fails
  before execution; do not hide canonical-command evidence.

## Recommended QA plan

Automated Preview-capable tests should cover each query independently,
secondary partial failure, manual retry success, cached-data refresh failure,
401 global redirect, 403 without logout, subject 404, 5xx/network safe copy,
and cancellation. Preview QA may use controlled request interception or a
safe test environment; it must not alter Production data or security policy.
The human pass should verify each affected page remains usable when one
dependency fails, a retry recovers in place, genuine empty states still render,
and no authenticated session loop or unexpected logout occurs.

The future navigation slice should separately test direct links, invalid query
values, refresh/remount, route away/back, browser back/forward and discarded-
tab reload for each URL-owned page state.

## Entry verdict

The canonical repository is healthy, Slice 1 remains closed, the read/error
defects and partial-data policies are now exact, and no owner decision is
required before the bounded read-state implementation. Navigation persistence
is a real, evidence-backed finding but is explicitly a separate Phase 5 slice.

**PHASE 5 SLICE 2 ENTRY AUDIT: PASS — IMPLEMENTATION PLAN READY**

**PHASE 5 SLICE 2 IMPLEMENTATION: NOT STARTED**
