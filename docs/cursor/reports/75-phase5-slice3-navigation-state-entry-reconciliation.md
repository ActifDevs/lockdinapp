# Phase 5 Slice 3 — Navigation-State Entry Reconciliation

## Canonical baseline

| Item | Audited value |
| --- | --- |
| Repository | `https://github.com/ActifDevs/lockdinapp.git` |
| Branch | `main` |
| Starting `HEAD` | `62ce1c62ff51b5289f31604623cc63327bf98e44` |
| Starting `origin/main` | `62ce1c62ff51b5289f31604623cc63327bf98e44` |
| Working tree at entry | Clean |
| Slice 1 | Closed |
| Slice 2 | Closed |
| Slice 3 implementation | Not started |

`git fetch origin` found no upstream drift. The last twelve commits were
inspected; the baseline is the documentation closeout immediately following
the conflict-free Slice 2 merge. No local work was present, and this audit made
no application-source change.

## Governing evidence

The following were read in full:

- `docs/cursor/reports/72-phase5-slice2-entry-reconciliation-and-read-state-audit.md`
- `docs/cursor/reports/73-phase5-slice2-read-state-reconciliation-implementation-and-validation.md`
- `docs/cursor/reports/74-phase5-slice2-merge-and-production-closeout.md`
- `docs/cursor/05-frontend-cutover.md`
- `docs/lockdin-architecture-plan.md`

Current `App.tsx`, Wouter composition, Wouter's installed query/history APIs,
all five candidate pages, Slice 2 read-state implementations, AuthProvider,
browser-state hooks, AppShell reset behavior, Radix Tabs wrapper, and current
tests were inspected directly. Report 72 remains valid design evidence, but
this plan is based on the post-Slice 2 source at the canonical baseline.

Report 74 is authoritative for handoff:

**PHASE 5 SLICE 1: CLOSED**

**PHASE 5 SLICE 2: CLOSED**

## Confirmed user-facing defects

| Surface | Current source behavior | Confirmed defect |
| --- | --- | --- |
| Settings | Reads `tab` once and passes it to uncontrolled Radix `Tabs defaultValue`; clicks do not update the URL | Alerts/Subjects/Appearance can reset to Account after refresh, remount, or document restoration; an unknown value can select no panel |
| Subject Detail | Uncontrolled `Tabs defaultValue="overview"` | Syllabus/Tasks/Performance reset to Overview and cannot be deep-linked |
| Study Plan | `activeTab` is component state initialized to `today` and is also the task query filter/key | View resets to Today; direct links and back/forward cannot restore the query-driving view |
| Past Papers | `filterSubject` is component state initialized to `all` | Current-subject filter resets to All and is not addressable in history |
| Calendar | `viewMonth` and `selectedDate` are independent component dates initialized to now | Both meaningful pieces of calendar context reset and cannot be restored from a URL |

There is no `visibilitychange` reset. The failures occur when page state is
recreated: refresh, true remount, route-away/back after unmount, browser
document discard/restoration, or a direct load that lacks the chosen state.

## State ownership classification

| Candidate | Category | Decision |
| --- | --- | --- |
| Route/page | **C — URL-addressable** | Existing Wouter path remains authoritative |
| Settings active tab | **C — URL-addressable** | `tab` query parameter |
| Subject Detail active tab | **C — URL-addressable** | `tab` query parameter on the existing subject path |
| Study Plan task view | **C — URL-addressable** | `view` query parameter and direct query-key input |
| Past Papers subject filter | **C — URL-addressable** | `subject` query parameter validated against current memberships |
| Calendar viewed month/date | **C — URL-addressable** | Compact `month`/`date` query contract |
| Theme | **D — device-local browser state** | Preserve global localStorage ownership |
| Desktop sidebar collapsed state | **D — device-local browser state** | Preserve global localStorage ownership |
| Notification preferences | **E — user-scoped browser state** | Preserve Slice 1 account-qualified storage |
| Server product records and saved memberships/profile | **F — server-derived/restored** | TanStack/API/AuthProvider remain authoritative |
| Settings edits, syllabus disclosures, dialog/form drafts | **B — memory-only** | Reset on refresh/remount remains intentional |
| Auth credentials, transient auth errors, mobile menu/drawer | **A — intentionally reset** | Never persist |
| Onboarding draft | **B/F — draft memory/server completion** | Separate deferred product issue |

No React state should be persisted merely because it exists. The Slice 3
boundary is the five user-facing navigation contexts above.

## Settings

- **Current defect:** `window.location.search` is read into uncontrolled
  `defaultValue`; clicks, back, and forward do not synchronize it.
- **Ownership:** C — URL-addressable.
- **Contract:** `/settings` defaults to Account. Valid explicit values are
  `?tab=account`, `?tab=subjects`, `?tab=appearance`, and
  `?tab=notifications`. The visible label "Alerts" deliberately maps to the
  stable value `notifications`.
- **Default writing:** selecting Account removes the owned `tab` parameter to
  keep the normal Settings URL concise. An explicit valid `tab=account` direct
  link is accepted.
- **Invalid value:** render Account immediately, then remove only the invalid
  `tab` with history replacement. Never leave Radix with an unknown controlled
  value and no selected panel.
- **History:** user tab selections **push history**. Back and Forward therefore
  traverse meaningful Settings sections before leaving the page.
- **Implementation:** derive the controlled Radix `value` from the live Wouter
  search params and update it in `onValueChange`; preserve all unrelated query
  parameters. Do not mirror the URL value in React state.
- **Tests:** add default, all direct values, click-to-URL, remount, invalid
  normalization, unrelated-param preservation, and Back/Forward coverage.
- **QA:** direct-load Alerts and Subjects, refresh, route away/back, use browser
  Back/Forward, and verify profile/subject drafts remain memory-only.

## Subject Detail

- **Current defect:** the active Radix tab is uncontrolled and always
  initializes to Overview.
- **Ownership:** C — URL-addressable.
- **Contract:** preserve `/subjects/:id`; valid values are `?tab=overview`,
  `?tab=syllabus`, `?tab=tasks`, and `?tab=performance`.
- **Default writing:** `/subjects/:id` means Overview; selecting Overview
  removes `tab`. A valid explicit `tab=overview` remains acceptable.
- **Invalid value:** render Overview immediately and replace-normalize by
  removing only `tab`.
- **History:** user tab selections **push history**. For
  Overview -> Syllabus -> Tasks, Back returns Tasks -> Syllabus -> Overview
  before leaving Subject Detail.
- **Implementation:** keep the existing route and all Slice 2 query/read-state
  branches. Make only the Radix root controlled from live search state and
  write changes through Wouter's query API. Subject identity remains the path
  parameter and is never inferred from query state.
- **Tests:** extend the mounted page harness for the default and four direct
  states, click synchronization, remount restoration, invalid normalization,
  Back/Forward, unrelated-param preservation, and unchanged localized
  loading/error/stale/retry behavior in a directly linked non-Overview tab.
- **QA:** deep-link and refresh every tab on a valid subject; verify Subject
  404, secondary failures, stale notices, and retries still behave exactly as
  Slice 2 established.

## Study Plan

- **Current defect:** `activeTab` is local state and feeds both Radix and
  `useListTasks`, so reconstruction silently changes both the selected view
  and query key to Today.
- **Ownership:** C — URL-addressable.
- **Contract:** `/study-plan` defaults to Today. Valid values are
  `?view=today`, `?view=upcoming`, `?view=completed`, and `?view=all`.
- **Default writing:** selecting Today removes `view`; explicit
  `view=today` is accepted.
- **Invalid value:** resolve to Today before invoking the task query and
  replace-normalize by removing only `view`. An invalid value must never reach
  the generated query parameters or query key.
- **History:** user view changes **push history** because they replace the
  page's primary result set. Back/Forward restore both the tab and matching
  task query.
- **Implementation:** delete the mirrored `useState`; derive one validated,
  typed view from live search params and pass that same value to Radix,
  `useListTasks`, and `getListTasksQueryKey`. URL resolution occurs during
  render, avoiding an effect frame where the wrong account query/filter is
  displayed. Do not touch task mutations or invalidation.
- **Tests:** assert the default and each direct view, the exact query-hook
  filter/query key, click changes, remount, invalid input never reaching the
  hook, unrelated-param preservation, Back/Forward, and retention of Slice 2
  loading/error/empty/stale/retry cases.
- **QA:** compare each URL with visible rows and network query, then refresh
  and traverse history; create/update/delete behavior is regression-only.

## Past Papers

- **Current defect:** the subject filter is local state and resets to All.
- **Ownership:** C — URL-addressable.
- **Stable identifier:** the current Select and API use the numeric shared
  catalogue `subject.id`; the URL uses its decimal string, for example
  `?subject=9`. Subject names/codes are not substituted because the request
  contract and membership objects already use the stable numeric ID.
- **Contract:** `/past-papers` and `?subject=all` mean All Subjects;
  `?subject=<positive decimal current-membership subject ID>` selects a current
  subject.
- **Default writing:** choosing All removes `subject`; explicit `subject=all`
  is accepted.
- **Initial resolution:** `all` is immediately authoritative. A numeric value
  remains provisional while current-account memberships resolve and must not
  drive the filtered attempts query until that membership is confirmed. During
  that interval (and if membership loading fails), the safe effective filter
  is All and the filter control remains disabled under the existing policy.
  The raw numeric URL may remain pending authoritative validation; it is never
  membership or authorization evidence.
- **Stale/invalid value:** once current memberships load successfully, a
  malformed, non-canonical, or non-member ID resolves to All and is removed
  with history replacement. Do not use a prior account's browser storage or
  cached membership list as authority. If membership loading fails, retain the
  raw safe numeric URL until authoritative validation can occur and preserve
  the existing localized membership error behavior.
- **History:** deliberate user filter selections **push history**. This is a
  low-frequency, meaningful data-scope change; Back/Forward restores the
  previous filter. Automatic stale-value normalization replaces.
- **Implementation:** derive `filterSubject` from live URL state rather than
  `useState`; keep the same numeric `subjectId` attempt query/key. Rework the
  existing membership-removal effect to normalize the URL, while leaving the
  log-dialog subject/component reset and all Slice 2 attempts/component
  read-state handling unchanged.
- **Tests:** default All, explicit `all`, valid numeric selection and query,
  click synchronization, refresh/remount, malformed/non-member normalization,
  membership removal, User A -> User B membership change, membership-read
  failure, unrelated-param preservation, and Back/Forward.
- **QA:** direct-link a current subject, refresh, remove/switch membership in a
  safe test account, switch accounts, and confirm no prior-account subject
  choice is treated as current authority.

## Calendar

- **Current defect:** independent `viewMonth` and `selectedDate` state reset to
  the current local date.
- **Ownership:** C — URL-addressable.
- **Formats:** `month=YYYY-MM` and `date=YYYY-MM-DD`, parsed as local calendar
  values with strict round-trip validation. Do not use UTC parsing via
  `new Date("YYYY-MM-DD")`; construct/validate local year, month, and day so
  timezone offsets cannot move the selected date.
- **Compact derivation:** valid `date` alone derives both selected date and
  viewed month. `month` is required only when the viewed month differs from
  the selected date's month, or when a user browses a month while the default
  selected date remains today. With neither parameter, both values are today.
  Thus `?date=2026-09-14` is preferred over redundant
  `?month=2026-09&date=2026-09-14`.
- **Independent context:** when both are valid and differ, preserve both. This
  represents the current supported behavior where month navigation does not
  silently change the selected date and an adjacent grid day can be selected
  without changing the viewed month.
- **Invalid values:** discard each invalid owned value independently. A valid
  date still derives its month when `month` is invalid; a valid month remains
  while invalid `date` falls back to today. Replace-normalize only the invalid
  or redundant owned parameters and preserve unrelated parameters.
- **History:** day selection, previous/next month, Today, and exam-jump actions
  **replace the current history entry**. These are high-frequency exploratory
  controls; creating one Back stop per arrow or day click would pollute route
  history. Route-away/back and refresh still restore the final calendar
  context because it is in the current URL.
- **Implementation:** replace both local state owners with values derived from
  Wouter search params. Route every existing setter site—mobile/desktop Today,
  month arrows, day cells, and exam countdown buttons—through small page-local
  actions that update the required owned parameters atomically. Data queries
  remain unchanged.
- **Tests:** freeze local time; cover no-query today, strict leap-day/date/month
  validation, date-only month derivation, month-only browsing, differing valid
  month/date, redundant-param compaction, every navigation action, remount,
  route-away/back, replace-not-push semantics, unrelated-param preservation,
  and local-date behavior in a non-UTC timezone.
- **QA:** deep-link representative same-month and differing-month states,
  refresh, use both responsive calendar controls, jump to an exam, select an
  adjacent grid date, route away/back, and confirm no off-by-one date shift.

## Explicit no-change areas

- Dashboard: no mounted local selection/filter; server-derived.
- Subjects: no mounted local selection/filter; server-derived.
- Progress: no mounted local selection/filter; server-derived.
- Theme: existing device-local browser preference.
- Desktop sidebar: existing device-local browser preference.
- Notification preferences: existing user-scoped browser preference from
  Slice 1.
- Mobile menu and More drawer: intentionally close on route changes.
- Dialogs and unsaved forms: memory-only; auth credentials are never persisted.
- Syllabus expanded units: memory-only; no unit-ID URL/storage scheme.
- Onboarding drafts: separate deferred product decision.
- Scroll restoration: existing AppShell scroll-to-top behavior remains; no
  blocking coupling was found.

No persistence work is manufactured for these areas.

## Shared URL-state design

Use **A — a tiny reusable validated query-state helper**, built on the
installed Wouter 3 `useSearchParams` API. Wouter already supplies live search
subscription, encoded `URLSearchParams`, push/replace options, and correct
path composition; no new router or state-management abstraction is needed.

The helper should remain a small pure utility in
`src/lib/navigation-query-state.ts`, not a general framework. It should:

1. resolve a raw owned parameter with a caller-supplied validator and default;
2. report whether invalid input needs normalization;
3. clone current `URLSearchParams` before setting/deleting owned keys;
4. omit a default value when a page deliberately writes its default; and
5. rely on `URLSearchParams` for encoding while preserving every unrelated
   key and repeated unrelated value.

Settings, Subject Detail, and Study Plan provide fixed enum validators. Past
Papers provides current-membership validation once authoritative data exists.
Calendar keeps its interdependent local-date/month resolution page-local while
using the same safe query-update primitive. This is enough reuse to prevent
five subtly different destructive query writers without inventing a generic
router layer.

## Query-param composition

No page should assign `window.location.search`, call raw `pushState` or
`replaceState`, or build a query string by concatenation. Each change should
start from Wouter's current `URLSearchParams`, clone it, modify only the owned
key(s), and call `setSearchParams(next, { replace })`.

Settings and Subject Detail own `tab`; Study Plan owns `view`; Past Papers
owns `subject`; Calendar owns `month` and `date`. Unknown/unrelated parameters
must survive both user changes and automatic normalization. Existing auth
query parsing (`next`, `reason`) and auth navigation remain unchanged.

## History semantics

| Page/action | Semantics | Reason |
| --- | --- | --- |
| Settings tab selection | **PUSH** | Each tab is a meaningful settings subview |
| Subject Detail tab selection | **PUSH** | Overview/Syllabus/Tasks/Performance are meaningful subject subviews |
| Study Plan view selection | **PUSH** | Changes the primary query/result set |
| Past Papers subject filter selection | **PUSH** | Low-frequency meaningful data-scope change |
| Calendar day/month/Today/exam navigation | **REPLACE** | High-frequency exploration should not create a long Back stack |
| Any invalid/stale/redundant canonicalization | **REPLACE** | Repair the current entry without adding a broken Back stop |

This policy deliberately rejects a one-size-fits-all history rule. Browser
Forward mirrors Back. Route-away/back restores all five final URL states.

## Invalid/stale values

- Never pass an invalid controlled value to Radix or an invalid filter to a
  query hook.
- Fixed enums fall back synchronously to their safe default, then remove the
  invalid owned key with replacement.
- Past Papers waits for current-account membership authority before declaring
  a numeric ID stale; it never validates against browser storage or prior-user
  cache.
- Calendar uses strict digit shape, range, real-day, and round-trip checks;
  impossible dates, overflow dates, and malformed months are invalid.
- Normalization never crashes, never shows a blank tab panel, and never
  destroys unrelated query parameters.
- Defaults are safe when JavaScript URL APIs are unavailable in a test/SSR-like
  environment; mounted browser behavior remains authoritative.

## Auth/account-switch implications

URL navigation state is not authorization. Existing `customFetch` token
attachment, global `401` handling, distinct `403` behavior, caller-scoped API
queries, and AuthProvider identity transitions remain unchanged. AuthProvider
clears the entire TanStack cache on logout and when a resolved user ID changes,
so protected data from User A is not supplied to User B.

Fixed tab/view/date state may safely remain in the URL while protected data
re-resolves for the current account. Past Papers is the only account-relative
URL value: it remains provisional and cannot filter the query until current
memberships confirm it; a non-member subject is then replace-normalized to All.
The numeric subject ID grants no authority, and the server remains caller
scoped independently of this UI validation.

Slice 1 account-scoped notification preferences and the global 401/logout path
must not be touched. A `403` must not cause sign-out.

## Accessibility

The existing Radix Tabs primitives must remain mounted and controlled through
their documented `value`/`onValueChange` API. This preserves tablist/tab/
tabpanel roles, `aria-selected`, relationships, automatic keyboard navigation,
and focus behavior. Do not replace tabs with styled links or custom buttons.

URL changes should not programmatically move focus or announce routine query
string changes. Radix continues to expose selected state. Browser Back/Forward
updates visual selection without stealing focus from browser controls. Calendar
retains its current button/grid roles, labels, `aria-selected`, current-date
semantics, and polite selected-date announcement; only state ownership changes.
Normalization is silent because it repairs invalid input without changing the
safe view already rendered.

## Test coverage

| Surface | Current coverage | Required Slice 3 additions |
| --- | --- | --- |
| Shared URL state | No shared helper or tests | Pure validator/default/composition/encoding/normalization tests |
| Settings | `settings.read-states.test.tsx` covers catalogue states and starts at `tab=subjects`, but does not test URL synchronization | New navigation suite for defaults, four direct tabs, click, remount, invalid, Back/Forward, composition |
| Subject Detail | `subject-detail.read-states.test.tsx` covers Slice 2 states with a mocked route only | Add real Wouter search harness and four-tab URL/history cases while retaining read-state cases |
| Study Plan | `study-plan.read-states.test.tsx` covers task/membership states but mocks Wouter Link only | Add URL-selected query argument/key assertions plus direct, click, remount, invalid and history cases |
| Past Papers | `past-papers.test.ts` covers current selectors, membership removal, and Slice 2 read states | Extend/new navigation suite for numeric membership URL, account change, stale/invalid normalization and history |
| Calendar | No page test exists | Add mounted navigation-state suite with frozen time, strict local-date parsing, actions, compact URL and history |
| Auth/history harness | Existing AuthProvider/RequireAuth tests use Wouter `memoryLocation` and search probes | Reuse Wouter Router conventions; exercise actual browser history/popstate or an explicit reversible test hook for true Back/Forward assertions |

The future implementation must preserve the complete Slice 1 suite, Slice 2
page suites, full frontend suite, global-auth 33, and request-ID 10.

## Baseline validation

No hosted or Production database integration was run.

| Check | Result |
| --- | --- |
| Canonical frontend test wrapper | Known Git Bash signal-pipe launcher failure before Vitest (`Win32 error 5`, exit `3221225794`) |
| Repository-pinned frontend Vitest | **PASS — 24 files / 133 tests** |
| Canonical root typecheck wrapper | Same launcher failure before TypeScript |
| Repository-pinned repository-wide typecheck | **PASS** — root references, API server, revision platform, mockup sandbox, and scripts; no diagnostics |
| Canonical scoped build wrapper | Same launcher failure before Vite |
| Repository-pinned scoped Production build (`PORT=3000`, `BASE_PATH=/`) | **PASS — 3,273 modules** |
| Global-auth policy | **PASS — 33/33** |
| Request-ID middleware | **PASS — 10/10** |

The restricted process sandbox also initially blocked esbuild child-process
startup with `spawn EPERM`; the same repository-pinned commands passed when
run with the required process permission. The build emitted only the existing
tooltip/sheet sourcemap notices.

## Gate 0 decisions

**GATE 0 OWNER DECISIONS: NONE**

Existing browser expectations and the interaction frequency of each control
are sufficient to derive the history policy. Meaningful low-frequency tabs,
task views, and subject filters push. High-frequency Calendar exploration and
all canonicalization replace. No product fork remains before implementation.

## Exact implementation scope

1. **`artifacts/revision-platform/src/lib/navigation-query-state.ts` (new)**
   — add the tiny pure validated query resolver/updater described above.
2. **`artifacts/revision-platform/src/lib/navigation-query-state.test.ts`
   (new)** — cover allowed/default/invalid resolution, deletion of written
   defaults, encoding, repeated/unrelated parameter preservation, and atomic
   multi-key Calendar updates.
3. **`artifacts/revision-platform/src/pages/settings.tsx`** — replace the
   one-time uncontrolled `defaultTab` with validated controlled `tab` state;
   push deliberate tab changes and replace invalid normalization.
4. **Settings navigation test file (new)** — use a Wouter/browser-history
   harness for direct, remount, composition, and Back/Forward behavior; retain
   `settings.read-states.test.tsx` unchanged except minimal shared mock/harness
   adaptation if compilation requires it.
5. **`artifacts/revision-platform/src/pages/subject-detail.tsx`** — control
   only the active tab from the URL; preserve route identity, queries,
   mutations, and all Slice 2 read-state branches.
6. **Subject Detail navigation test file (new)** — add the full four-tab and
   history matrix plus a directly linked Slice 2 failure-state regression.
7. **`artifacts/revision-platform/src/pages/study-plan.tsx`** — replace
   `activeTab` component state with the validated URL view used by Radix and
   the existing task query/key; leave mutations/invalidation untouched.
8. **Study Plan navigation test file (new)** — verify exact query sync and the
   complete URL/remount/history matrix, while preserving read-state tests.
9. **`artifacts/revision-platform/src/pages/past-papers.tsx`** — make the
   current numeric filter URL-owned and current-membership-validated; adapt
   only the existing stale-filter effect, not attempts/component read states
   or form/mutation behavior.
10. **Past Papers navigation tests (new or narrowly added to the existing
    file)** — cover direct filter/query sync, membership removal, account
    change, membership error, composition, remount, and history.
11. **`artifacts/revision-platform/src/pages/calendar.tsx`** — derive strict
    local month/date state from the compact URL contract and route every
    existing navigation setter through replace-mode atomic query updates.
12. **Calendar navigation test file (new)** — freeze time and cover formats,
    derivation, invalid/redundant normalization, timezone safety, all controls,
    remount, route restoration, composition, and replace semantics.
13. **Verification and Preview QA** — focused navigation suites, full frontend
    suite, repository typecheck, scoped Production build, global-auth 33,
    request-ID 10, then immutable Preview technical and authenticated human QA.

Expected application scope is one small helper, five existing pages, helper
tests, and five focused page navigation suites. Test-harness support may be
added under `src/test` only if true Back/Forward coverage cannot be expressed
cleanly with the existing Wouter/browser utilities.

## Explicit non-goals

- No implementation during this entry audit.
- No mutation feedback, mutation semantics, cache invalidation redesign,
  optimistic updates, or task/paper/topic/profile write change.
- No Slice 2 loading/error/empty/stale/retry redesign.
- No auth, session, token, global 401, 403, AuthProvider, RequireAuth, Supabase,
  backend, API, OpenAPI, generated-client, database, schema, migration, RLS,
  RPC, environment, or Vercel change.
- No browser-storage persistence for navigation state.
- No notification preference, theme, sidebar, form/dialog draft, syllabus
  disclosure, mobile-menu, onboarding-draft, or scroll-restoration work.
- No new router, heavy state manager, generic URL framework, pagination, route
  segment redesign, visual redesign, or accessibility-primitive replacement.
- No hosted/Production database integration, Production failure injection,
  universal checkpoint, final Phase 5 reconciliation, or mutation/cache slice.

## Risk assessment

Overall implementation risk is **medium** and bounded to frontend URL
composition.

- **Query synchronization risk:** Study Plan must never render/query one view
  while the URL says another.
- **Account isolation risk:** Past Papers must validate only against current
  memberships after identity-owned cache clearing; URL input grants no access.
- **Date/timezone risk:** Calendar date-only strings must remain local calendar
  dates and reject rollover values.
- **History risk:** accidental push for Calendar can create unusable history;
  accidental replace for tabs/views can defeat expected Back traversal.
- **Composition risk:** changing one page-owned key must not delete unrelated
  search parameters.
- **Regression risk:** controlling Radix must preserve keyboard/focus semantics,
  and Slice 2 read states and mutations must remain untouched.

Each page change is independently reversible. No data/security/backend
contract changes are required.

## QA plan

Automated QA should exercise direct URLs, defaults, every valid value, invalid
and stale normalization, unrelated-param preservation, refresh-equivalent
remount, route away/back, true browser Back/Forward, push-versus-replace
records, accessibility-selected state, and page-specific query synchronization.
Calendar additionally requires strict date/month and non-UTC local-date tests;
Past Papers requires current-account membership transitions.

Preview technical QA should verify the exact source SHA, immutable Preview
deployment, public page/login load, `/api/healthz`, `/api/healthz/db`, and
anonymous `/api/tasks` 401 with request IDs. Authenticated human QA should then
exercise all five pages across direct links, refresh/remount, route away/back,
Back/Forward, responsive Calendar controls, and an account switch. It should
also regression-check Slice 2 errors/retries and normal task/paper/topic/form
mutations without altering security policy or Production data.

## Entry verdict

The canonical baseline is healthy. The five confirmed defects have exact URL
contracts, validation and composition rules, page-specific history semantics,
account-switch safeguards, accessibility constraints, tests, and QA. No owner
decision or repository/design blocker remains. Application source has not been
changed.

**PHASE 5 SLICE 3 ENTRY AUDIT: PASS — IMPLEMENTATION PLAN READY**

**PHASE 5 SLICE 3 IMPLEMENTATION: NOT STARTED**
