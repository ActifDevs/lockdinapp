# Phase 5 Entry Audit and Frontend Cutover Reconciliation

Audit date: 2026-08-24
Scope: documentation-only Phase 5 entry audit; no Phase 5 implementation

## Canonical baseline

| Item | Audited value |
| --- | --- |
| Branch | `main` |
| Starting SHA before update | `f76fc2191af65c067c19178e93407e84f222870e` |
| Starting `origin/main` before fetch | `f76fc2191af65c067c19178e93407e84f222870e` |
| Final updated local SHA | `2372aff2be2171f51f7290d9300881baaf6b68ec` |
| Final `origin/main` | `2372aff2be2171f51f7290d9300881baaf6b68ec` |
| Update result | `git pull --ff-only origin main` fast-forwarded to the expected checkpoint commit |
| Working tree at audit start | Clean |
| Checkpoint baseline | `docs/checkpoints/2026-08-24_1705/`; universal post-Phase-4 checkpoint complete |

The fetched canonical branch matched the prompt's expected SHA. No later application change required a moved-main stop.

## Governing sources

Read in full:

- `docs/cursor/05-frontend-cutover.md`
- `docs/lockdin-architecture-plan.md`
- `docs/cursor/04-api-hardening.md`
- `docs/cursor/reports/68-phase4-final-reconciliation-and-closeout.md`
- all four files in `docs/checkpoints/2026-08-24_1705/`
- `docs/README.md`

Related implementation and reconciliation history was also reviewed, including Phase 2 auth/onboarding reports 20, 22, 32, and 33 and Phase 3 reports 34, 39, and 58. Current mounted source and generated clients, rather than old planning assumptions, control every classification below.

## Phase 5 original requirement matrix

| Requirement | Governing source | Intended end state | Current evidence | Classification | Gap / dependency | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| Re-verify a real session and react to auth changes | `05-frontend-cutover.md`; architecture plan section 8 | Supabase session is the identity source; protected UI waits for identity resolution | `AuthProvider` subscribes to `onAuthStateChange`, bootstraps with `getSession()`, resolves the API profile, and rejects stale profile completions | A. ALREADY IMPLEMENTED BEFORE PHASE 5 | None | Low |
| Protect routes without stale booleans or storage identity | Same | Live auth/profile state gates mounted protected routes without a protected-content flash | `RequireAuth` waits for auth resolution, redirects unauthenticated users with safe `next`, and enforces onboarding state | A. ALREADY IMPLEMENTED BEFORE PHASE 5 | None | Low |
| Stop treating legacy local keys as auth/onboarding/membership truth | Same | `lockdin_user`, `lockdin_auth`, `onboarded`, and `lockdin_subject_codes` are not ownership truth | The keys are removal-only in `auth-provider.tsx`; repository search found no read path that trusts them | A. ALREADY IMPLEMENTED BEFORE PHASE 5 | None | Low |
| Create durable membership and starter tasks through the hardened boundary | Same | New signup profile exists before one atomic, caller-owned onboarding operation | Onboarding calls `POST /api/profile/complete-onboarding`; the Phase 3 RPC atomically stores `user_subjects`, starter tasks, and profile completion | A. ALREADY IMPLEMENTED BEFORE PHASE 5 | Current automated tests are mostly contract/unit; repeat Preview/human journey in final Phase 5 regression proof | Low |
| Decide notification-preference persistence | `05-frontend-cutover.md` | Either persist server-side now or explicitly defer client-only state with a reason | Preferences remain in global `lockdin_notification_prefs`; unlike reminder suppression, this key is not user-qualified | G. BLOCKED — DESIGN OR DEPENDENCY DECISION REQUIRED | Owner must approve server persistence or an explicit client-only deferral. Recommended: defer server persistence for the current local-reminder product, but scope storage by user | Medium |
| Keep `SUBJECT_CATALOG` only as reference/display configuration | `05-frontend-cutover.md` | Static catalogue may style known subjects but cannot define membership or user data | Runtime use is limited to accent resolution by code/name, then stored color/default fallback; API membership remains authoritative | D. VERIFIED EXISTING BEHAVIOR — NO IMPLEMENTATION REQUIRED | None | Low |
| Use the hardened API for application data | Architecture plan section 8; Phase 4 handoff | Browser uses Supabase for Auth only; application reads/writes use `/api` | All mounted application-data hooks come from `@workspace/api-client-react`; no `.from`, `.rpc`, Functions, or Storage call exists in frontend runtime source | A. ALREADY IMPLEMENTED BEFORE PHASE 5 | None | Low |
| Reconcile per-user cache/state on logout and account changes | Phase 5 state-reconciliation scope | User A's protected data cannot survive into User B's view | `queryClient.clear()` runs on logout, signed-out state, identity switch, and profile failure; personal gamification/reminder keys are user-qualified | B. PARTIALLY IMPLEMENTED — PHASE 5 WORK REQUIRED | Notification preferences remain unscoped; profile mutation does not invalidate dashboard summary | Medium |
| Consistent loading/error/mutation reconciliation | Phase 5 entry brief stages 10, 12, and 13 | API failure is distinguishable from real empty data and writes report failure consistently | Dashboard, Subjects, Calendar, Progress, onboarding, and membership settings have useful states; Subject Detail, Study Plan, Past Papers, and catalogue-dependent settings have silent/partial failure paths | B. PARTIALLY IMPLEMENTED — PHASE 5 WORK REQUIRED | Normalize query/mutation failure handling and dependent invalidation | Medium |
| Eliminate production runtime mocks/fake fallback data | Phase 5 entry brief stage 9 | Backend failure is never masked with demo personal data | Repository search found no production runtime mock or fake personal-data fallback | D. VERIFIED EXISTING BEHAVIOR — NO IMPLEMENTATION REQUIRED | Static marketing mock and display constants are intentional UI/reference content | Low |
| Prove end-to-end signup -> onboarding -> own dashboard | `05-frontend-cutover.md` | A real hosted/Preview human journey confirms routing, ownership, and initial data | Historically passed during Phase 2/3 release work; not rerun in this read-only entry audit | B. PARTIALLY IMPLEMENTED — PHASE 5 WORK REQUIRED | Include targeted Preview and human regression proof after implementation slices, not hosted DB integration during this audit | Medium |

## Current frontend architecture

- Entry and composition: React 18/Vite in `artifacts/revision-platform/src/main.tsx` and `App.tsx`.
- Routing: Wouter with `import.meta.env.BASE_URL`, lazy-loaded pages, a shared `PageLoader`, public routes, guarded onboarding, and guarded product pages inside `AppShell`.
- Auth: one `AuthProvider` owns the Supabase browser session, API profile, auth lifecycle methods, 401 handling, and protected-query clearing.
- API: one generated Orval/TanStack Query client (`@workspace/api-client-react`) and one `customFetch` transport; mounted pages contain no scattered runtime `fetch()` calls.
- State: TanStack Query for server state; component state for forms/transient UI; browser storage only for device presentation, reminders, and gamification markers.
- Mutations: generated hooks with page-owned success invalidation. There is no optimistic server-state update; Settings writes the authoritative replacement-membership response into cache.
- Error/loading: shared query error copy and loaders exist, but page coverage is inconsistent as detailed below.
- API path: generated same-origin `/api/...` URLs. Development proxies `/api` to `API_PROXY_TARGET` or loopback `http://localhost:3001`; Vercel rewrites preserve same-origin behavior.
- Data flow: Supabase Auth session -> current Bearer token -> Express `/api` -> request-scoped backend identity/RLS boundary -> generated response -> TanStack cache -> mounted page.
- Duplicate/dead layers: no second live API client, legacy auth provider, Axios layer, or direct frontend data client was found.

## Authentication/session architecture

1. Supabase Auth remains the identity provider. The singleton browser client is created in `src/lib/supabase-browser.ts` with session persistence, automatic token refresh, and auth-code detection.
2. `AuthProvider` registers `onAuthStateChange` once and then calls `getSession()`. Profile resolution retries at short bounded delays and is protected by request/user identity checks.
3. Password login, signup, optional Google OAuth, password recovery/update, sign-out, and user metadata updates call `supabase.auth.*` only.
4. `setAuthTokenGetter` calls the current `supabase.auth.getSession()` before every API request; authenticated and optional-auth calls therefore receive the current access token.
5. Supabase automatically refreshes tokens. `TOKEN_REFRESHED` retains the already-resolved profile; the next request retrieves the refreshed access token.
6. Any API 401 invokes the registered logout path, clears TanStack Query state, signs out, and routes to login. A 403 remains distinct and does not force logout.
7. Auth loading blocks protected query mounting. Stale User A profile work cannot replace User B after an identity switch.
8. Logout clears protected cache/state before sign-out. Login resolves the new profile and routes according to onboarding state. No manual token storage or logging exists.
9. The only duplicated persistent state is non-identity UI/preference state. No old authentication implementation remains to remove.
10. Current API calls do not rely on Phase 4 protected routes being anonymous. Public routes may receive a token when a session exists; protected routes always use one.

No auth/session implementation rewrite is justified for Phase 5. Required work is regression proof and adjacent client-state/error cleanup.

## Direct Supabase usage inventory

**FRONTEND DIRECT DATABASE ACCESS: NONE**

Intentional Auth-only calls:

| File/area | Supabase Auth operation | Purpose |
| --- | --- | --- |
| `src/components/auth-provider.tsx` | `getSession`, `onAuthStateChange` | Session bootstrap and lifecycle |
| Same | `signInWithPassword`, `signUp`, `signInWithOAuth` | Login/signup/provider flow |
| Same | `signOut` | Logout and profile-load safety stop |
| Same | `resetPasswordForEmail`, `updateUser` | Password recovery/update |
| `src/lib/supabase-browser.ts` | `createClient` | Publishable browser Auth client |

Complete production frontend search found no `supabase.from`, `supabase.rpc`, `supabase.functions`, or `supabase.storage` usage. All application database/RPC access is behind Express API routes.

## Feature/data-source matrix

| Mounted feature | Current data source | Endpoint/client | Auth behavior | Mutation behavior | Gap |
| --- | --- | --- | --- | --- | --- |
| Landing | STATIC_REFERENCE | Local marketing/UI content | Public | None | None; visual product mock is not runtime user data |
| Login / signup | DIRECT_SUPABASE_AUTH | `AuthProvider` Supabase Auth methods | Public pages; redirects resolved users | Auth provider lifecycle | No cutover gap |
| Forgot/update password and auth callback | DIRECT_SUPABASE_AUTH | Supabase recovery session + provider | Public/recovery-aware | Update password then sign out | No cutover gap |
| Onboarding | HYBRID | `GET /api/subjects`; `POST /api/profile/complete-onboarding` | Public catalogue + authenticated atomic completion | Authoritative profile/membership/task response, then invalidate all | Unsaved step state remains existing UX debt; final journey needs regression proof |
| Dashboard | HYBRID | `/api/dashboard/summary`, `/api/progress/overview`, `/api/user-subjects`; local presentation-only markers | Authenticated | Task PATCH; invalidates dashboard/progress/tasks | Profile name can remain cached after Settings update |
| My Subjects | HYBRID | Authenticated membership/progress/tasks/attempts plus optional-auth syllabus | Current token is attached | Read-only | Per-subject syllabus N+1/per-card failures are handled, but request volume is debt |
| Subject Detail | HYBRID | Public subject, optional-auth syllabus, authenticated performance/tasks/attempts | Correct per Phase 4 classification | Topic PATCH and task PATCH with broad dependent invalidation | Secondary query/mutation failures can be silent |
| Syllabus | HYBRID | `GET /api/subjects/:id/syllabus` | Optional auth; current token enriches caller progress | Topic PATCH | Correct data boundary; incomplete error feedback |
| Topic progress | REAL_API_AUTHENTICATED | `PATCH /api/syllabus-topics/:topicId` | Authenticated | Invalidate syllabus/subject/progress/dashboard | Bulk failure feedback and repeated invalidation need reconciliation |
| Study Plan / Tasks | REAL_API_AUTHENTICATED | `/api/tasks`, `/api/user-subjects` | Authenticated | POST/PATCH/DELETE; invalidates tasks/dashboard/progress | Failed reads can render empty; mutation copy is inconsistent |
| Past Paper Attempts | HYBRID | Authenticated attempts/memberships; public assessment components | Correct current token behavior | POST/DELETE; invalidates attempts/dashboard/progress/performance | Attempt/component failures can render empty or lack feedback |
| Exam Dates / Calendar | REAL_API_AUTHENTICATED | `GET /api/exam-dates`, `GET /api/tasks` | Authenticated | NOT_CONNECTED for create/delete UI | Missing edit surface is a product/UI limitation, not an API failure |
| Progress / Overview | REAL_API_AUTHENTICATED | `GET /api/progress/overview` | Authenticated | Read-only | No cutover gap |
| Profile / Settings | HYBRID | `GET/PATCH /api/profile`, `GET/PUT /api/user-subjects`, public subjects, local device/preferences | Protected | Profile PATCH; membership PUT; local preference writes | Preferences not user-scoped; public catalogue failure handling incomplete; dashboard name invalidation missing |
| User Subjects | REAL_API_AUTHENTICATED | `GET/PUT /api/user-subjects` | Authenticated | Authoritative replace response plus dashboard/progress invalidation | No ownership/cutover gap |
| Theme/sidebar | LOCAL_ONLY | Browser storage | Device-local, not identity authority | Local only | Acceptable global device preference |
| Privacy/Terms/404 | STATIC_REFERENCE | Local components | Public | None | None |

No mounted authenticated feature uses MOCK or DIRECT_SUPABASE_DATA.

## API-client inventory

- `@workspace/api-client-react` is the only live application API client.
- Generated TanStack query functions pass an `AbortSignal` into `customFetch`; unmounted/obsolete query work can be cancelled by the query layer.
- Generated URLs are relative `/api` paths; no production hostname is hard-coded.
- `customFetch` asks the registered async getter for the current session on every request and preserves an explicitly supplied Authorization header.
- Tokens are neither copied to an application storage key nor logged.
- Public calls also receive Authorization when a user is signed in. This is unnecessary for purely public responses but compatible with Phase 4 and beneficial for optional-auth syllabus enrichment.
- Errors are normalized as `ApiError` with status, body, response headers, method, and URL. 401 and 403 behavior is distinct.
- `X-Request-Id` is retained inside normalized response headers but is not read or displayed by the product UI.
- Query requests are abortable. Mutation races remain page-managed; the main genuine risk is bulk topic mutation feedback, not cross-user cache contamination.

## Phase 4 API compatibility matrix

| Frontend call(s) | Phase 4 class | Current client behavior | Result |
| --- | --- | --- | --- |
| `GET /api/subjects`; `GET /api/subjects/:id`; `GET /api/subjects/:id/assessment-components` | PUBLIC | Available without auth; token may be attached if already signed in | Compatible |
| `GET /api/subjects/:id/syllabus` | OPTIONAL AUTH | Works publicly; attaches current token when present for caller progress | Compatible |
| Subject create/delete | INTENTIONAL 403 | Generated capability exists but no production frontend consumer is mounted | Compatible |
| Subject performance and topic mutations | AUTHENTICATED | Protected pages call with current Bearer token | Compatible |
| Tasks, attempts, exam dates | AUTHENTICATED / USER-OWNED | Every mounted call gets current Bearer token; no owner ID is supplied as authority | Compatible |
| Dashboard/progress/profile/onboarding/user-subjects | AUTHENTICATED / USER-OWNED | Current Bearer token; normalized errors; 401 logout | Compatible |
| Unknown/future routes | Authenticated by default | Central getter applies a token when available; anonymous callers receive server policy | Compatible with default-deny boundary |

No stale endpoint, stale method, missing bearer, hidden per-router-auth reliance, or response-contract mismatch was found in current mounted calls.

**PHASE 4 -> PHASE 5 API CONTRACT COMPATIBILITY: PASS**

## Runtime mock/fallback inventory

**PRODUCTION RUNTIME MOCK/FALLBACK DATA: NONE**

Findings were classified as follows:

- Intentional UI copy: input placeholders, loading fallbacks, empty-state language, landing-page product mock.
- Static reference/config: `SUBJECT_CATALOG` and the final accent color fallback; neither supplies membership, progress, tasks, attempts, or profile data.
- Test-only mocks: Vitest Auth/API/component fixtures under `*.test.*`.
- Runtime fallback: profile display has approved neutral/null-safe copy and subject accent has a display-only fallback; neither masks a failed personal-data request.
- Production runtime mock, development runtime data mock, obsolete mock client: none.

## State reconciliation findings

| Severity | Finding | Evidence / impact | Phase 5 disposition |
| --- | --- | --- | --- |
| MEDIUM | Notification preferences cross account boundaries in one browser | One global `lockdin_notification_prefs` key can make User B inherit User A's local reminder choices. Reminder data and suppression markers themselves are current-user scoped, so this is not a data disclosure | Gate 0 decision, then user-scope or server-persist |
| MEDIUM | Several failed queries render empty/partial success UI | Study Plan task/membership query errors, Past Paper list/component errors, and secondary Subject Detail errors lack consistent failure branches | Required error/loading slice |
| MEDIUM | Some mutation failures lack user feedback | Subject Detail topic/task actions and Past Paper create/delete do not consistently present mutation errors; bulk topic work can reject without useful feedback | Required mutation-reconciliation slice |
| LOW | Profile display can be stale in Dashboard cache | Settings updates Auth/profile state but does not invalidate `GET /api/dashboard/summary`, whose response includes student name | Add dependent invalidation/test |
| LOW | Bulk topic completion repeats invalidations | `Promise.all` calls page mutations whose success handlers invalidate the same families repeatedly | Reconcile in mutation slice without changing the API |
| INFORMATIONAL | Query cache is correctly isolated across identities | Cache clears on logout, sign-out, profile failure, and A -> B switch; tests cover stale profile protection and query clearing | Preserve and regression-test |
| INFORMATIONAL | Personal browser markers are otherwise scoped | Gamification and reminder suppression use `<base>:<userId>`; ambiguous legacy keys are removed | Preserve |

No critical/high ownership leak, protected-content flash, or cached User A application data visible to User B was found.

## Routing/auth UX findings

- Public routes: landing, login, signup, recovery/callback, legal pages, and 404 mount without protected data.
- Protected routes: onboarding and every product page are behind `RequireAuth`; product pages also use `AppShell`.
- Auth initialization: `PageLoader` remains until session/profile resolution; protected children do not flash.
- Redirects: unauthenticated users retain a sanitized `next`; authenticated users visiting login/signup go to onboarding or their requested/dashboard destination.
- Logout: cache/state clears and the app routes to login. API 401 uses the same safety path.
- Direct URL refresh: Wouter's base path plus Vercel's non-API rewrite and session bootstrap support SPA refresh.
- Back/forward: no code-level redirect loop was found. Browser-history behavior lacks a mounted-router integration test.
- Profile-load failure: bounded retries end in sign-out and a safe reason message rather than a blank protected screen.
- Existing debt preserved: onboarding selections are page-local and are lost on refresh/navigation; current governing scope does not require draft persistence.

## Mutation inventory

| Origin | Method / endpoint | Request / response | Success reconciliation | Error handling | Status |
| --- | --- | --- | --- | --- | --- |
| Dashboard task toggle | `PATCH /api/tasks/:taskId` | `TaskUpdate` -> `Task` | Invalidates tasks, dashboard, progress | Limited feedback | Works; feedback cleanup |
| Study Plan create/update/delete | `POST /api/tasks`; `PATCH/DELETE /api/tasks/:taskId` | `TaskInput`/`TaskUpdate` -> `Task` or void | Invalidates tasks, dashboard, progress | Action error exists but is inconsistent/raw | Works; UX cleanup |
| Subject Detail task toggle | `PATCH /api/tasks/:taskId` | `TaskUpdate` -> `Task` | Invalidates tasks/dashboard/progress | No consistent visible failure | Works; feedback gap |
| Subject Detail topic status/bulk | `PATCH /api/syllabus-topics/:topicId` | `SyllabusTopicProgressUpdate` -> progress | Invalidates syllabus, subject, progress, dashboard | Bulk/individual rejection feedback is incomplete; duplicate invalidations | Works; reconciliation gap |
| Past Papers log/delete | `POST /api/past-paper-attempts`; `DELETE /api/past-paper-attempts/:id` | `PastPaperAttemptInput` -> attempt or void | Invalidates attempts, dashboard, progress, subject performance | No consistent create/delete error presentation | Works; feedback gap |
| Calendar exam dates | Backend supports POST/DELETE; no mounted write UI | `ExamDateInput` -> exam date / void | N/A | N/A | PRODUCT/UI LIMITATION, not API failure |
| Settings profile | `PATCH /api/profile` | `ProfileUpdate` -> `Profile` | Auth context updates | Toast feedback; dashboard summary not invalidated | Works; dependent-cache gap |
| Onboarding | `POST /api/profile/complete-onboarding` | `CompleteOnboardingInput` -> `Profile` | Profile update, invalidate all, dashboard redirect | Safe 409 username mapping and general feedback | Works |
| Settings user subjects | `PUT /api/user-subjects` | `UserSubjectSelectionInput` -> memberships | Sets membership response, invalidates dashboard/progress | Toast feedback | Works |
| Notification settings | Browser storage write | Preferences object | Hook state updates | Storage failures are not surfaced | Owner-decision/state gap |

All API mutations derive ownership from the verified backend identity. No frontend write sends a user ID as ownership authority.

## Error/loading behavior

- 400/404: normalized `ApiError`; pages with explicit handlers show action/query copy, but coverage is inconsistent.
- 401: global logout, protected cache clear, Supabase sign-out, login redirect.
- 403: remains an ordinary forbidden `ApiError`; it does not incorrectly log the user out.
- 409: onboarding maps username conflict to specific safe feedback.
- 500: shared `queryErrorMessage` replaces server detail with production-safe copy where the page uses it.
- Network/offline: normalized transport error; good pages expose retry, while the identified incomplete pages can show empty/partial UI.
- Timeouts: no application-level request timeout is configured. Query cancellation is supported through generated AbortSignals. Timeout UI is a future resilience enhancement, not a current Phase 5 requirement.
- Stuck loading: no permanent auth loader path was found; profile failure is bounded and signs out. Page query loading states are not uniformly composed.
- Request IDs: available in `ApiError.headers`, currently ignored. Exposing them is a useful future observability enhancement, not required for current user flows or Phase 5 entry.
- Route error boundary: lazy/page boundary labeling is inconsistent (Dashboard is explicitly labeled); broader boundary standardization is non-blocking debt.

## Environment/configuration inventory

| Variable | Purpose | Side | Required | Local / Preview / Production behavior |
| --- | --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project/Auth URL | Frontend public config | Required at runtime | Browser client fails safely if absent; configured per deployment |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon Auth key | Frontend public config | Required at runtime | Browser client fails safely if absent; never a service-role key |
| `VITE_GOOGLE_AUTH_ENABLED` | Show configured Google login option | Frontend public config | Optional; false unless exact `true` | Allows deployments to hide an unconfigured provider |
| `BASE_URL` | Vite-generated SPA base consumed by router/absolute auth URLs | Frontend build output | Generated by Vite | Follows build `BASE_PATH` |
| `BASE_PATH` | Vite base path | Build/server config | Required by repository Vite config | Audit build used `/`; deployment build supplies it |
| `PORT` | Vite server/preview config validation | Build/dev config | Required by repository Vite config | Audit build used `3000` |
| `API_PROXY_TARGET` | Local Vite `/api` proxy target | Development build config | Optional | Defaults to loopback API; not bundled as an application API hostname |

The root `.env.example` correctly labels frontend values as public and keeps database URLs, API-side Supabase configuration, and any service-role key server-only. No secret-valued environment variable is imported into browser runtime code. Vercel configuration was inspected but not modified.

## Frontend test coverage inventory

| Area | Classification | Evidence / missing work |
| --- | --- | --- |
| AuthProvider/session bootstrap/state changes | EXISTING — ADEQUATE | Initial session, onboarding states, pending profiles, stale A/B completion, token refresh, profile failure |
| Route guards/auth-loading redirects | EXISTING — ADEQUATE | Loading, unauthenticated, onboarding, authenticated redirects and no-flash behavior |
| Login/signup/logout | EXISTING — PARTIAL | Provider calls, configuration gates, confirmation copy, and cache clear exist; no real mounted browser journey |
| Password recovery/update | EXISTING — ADEQUATE | Enumeration-safe reset copy and successful/failed update behavior |
| API client/401/403 | EXISTING — PARTIAL | 401 handler, 403 distinction, handler failure, explicit auth header; missing direct assertion that async session getter adds the refreshed Bearer token |
| Identity/cache reset | EXISTING — ADEQUATE | Logout, signed-out, A -> B query clear including exam dates, stale profile protection, scoped storage |
| Dashboard | EXISTING — PARTIAL | Data composition/gamification helpers; missing mounted loading/error and profile-cache invalidation tests |
| Subjects/Syllabus | EXISTING — PARTIAL | Reconciliation contracts and mastery grid; missing query-failure and optional-auth bearer integration coverage |
| Tasks/Study Plan | EXISTING — PARTIAL | Static reconciliation asserts invalidation families; missing mounted read-failure and mutation-failure tests |
| Past Papers | EXISTING — PARTIAL | 10 behavior/identity/invalidation tests; missing mounted API failure feedback coverage |
| Progress | EXISTING — PARTIAL | Caller-owned paper count; missing full loading/error rendering coverage |
| Notification preferences | MISSING — PHASE 5 SHOULD ADD | Account-switch preference isolation after Gate 0 decision |
| Router direct refresh/back-forward | MISSING — PHASE 5 SHOULD ADD | Mounted App/router integration or browser E2E |
| Signup -> onboarding -> dashboard | MISSING — PHASE 5 SHOULD ADD | Preview/human regression proof; automated coverage where practical |
| Exam-date create/delete UI | OUT OF SCOPE | No mounted write surface; do not label backend contract failure |

## Baseline validation

No hosted or Production database integration was run.

| Required check | Exact result |
| --- | --- |
| `pnpm.cmd run typecheck` | Wrapper failed before TypeScript: Git Bash could not create a signal pipe (`Win32 error 5`, exit `3221225794`) |
| Typecheck rerun with pinned Windows `tsc.CMD` | PASS: root project references plus API server, mockup sandbox, revision platform, and scripts all completed with no diagnostics |
| `pnpm.cmd --filter "@workspace/revision-platform" test` | Wrapper failed before Vitest with the same Git Bash signal-pipe error |
| Prescribed serial pnpm fallback | pnpm could not resolve `vitest`; direct pinned serial Vitest started but stalled without executing output and was terminated after more than two minutes |
| Direct pinned normal frontend Vitest | PASS: 19 files, 88 tests; duration 46.32 s |
| Required frontend build wrapper | Failed before Vite with the same Git Bash signal-pipe error |
| Direct pinned Vite build with `PORT=3000`, `BASE_PATH=/` | PASS: 3,272 modules, 36.65 s; existing non-fatal tooltip/sheet sourcemap warnings |
| Global auth policy wrapper | Failed before Vitest with the same Git Bash signal-pipe error |
| Direct global auth policy test | PASS: 1 file, 33 tests |
| Request-ID wrapper | Failed before Vitest with the same Git Bash signal-pipe error |
| Direct request-ID test | PASS: 1 file, 10 tests |

The repeatable failure is local script-shell process startup, not a TypeScript, test, or build failure. Successful direct execution used the repository's pinned binaries and identical configs. It is documented as a tooling caveat, not hidden.

## Security/ownership findings

**PHASE 5 FRONTEND SECURITY ENTRY STATUS: PASS**

- Backend ownership is never authorized from a frontend-supplied user ID.
- No page attempts to select another user's resource through an owner parameter.
- The browser trusts Supabase's managed Auth session for identity and sends the access token to the API; Express derives the caller from verified claims.
- Bearer tokens are not manually stored, printed, or included in application logs.
- Only publishable Supabase browser configuration is referenced by `VITE_*`; database URLs and service-role capability remain server-side.
- No browser application-data table/RPC access, API ownership bypass, or direct user-table query exists.
- Query cache clearing on identity change prevents cross-account protected response reuse.
- The unscoped notification preference is a medium account-state correctness issue, not an ownership/data disclosure bypass.

## Already-complete Phase 5 requirements

1. Real Supabase session bootstrap and auth-state observation.
2. Current Bearer token lookup for every API call and automatic Supabase token refresh.
3. Protected route loading/redirect/onboarding guards with no stale storage identity.
4. Global API 401 logout/cache-clear behavior and distinct 403 handling.
5. Removal-only treatment of legacy auth/onboarding/membership keys.
6. Hardened `/api` use for all application data.
7. Zero direct frontend Supabase database/RPC/Functions/Storage access.
8. Atomic durable onboarding with user subjects and starter tasks.
9. `SUBJECT_CATALOG` limited to static presentation/reference use.
10. No production runtime mock/fake user data.
11. User-qualified gamification and reminder-suppression markers.
12. Correct same-origin `/api` and Vite base-path architecture.

## Genuine Phase 5 implementation gaps

1. Resolve and implement the notification-preference persistence/ownership decision; at minimum prevent cross-account preference inheritance.
2. Add explicit loading/error/retry semantics where Subject Detail, Study Plan, Past Papers, and Settings currently confuse failed queries with empty/partial data.
3. Add consistent mutation failure feedback for topic/task/past-paper write paths and reconcile bulk topic invalidation behavior.
4. Invalidate or update Dashboard summary after profile changes so cross-page identity display is immediate.
5. Add targeted automated regression coverage for current bearer injection, failure states, account-scoped preferences, and router history/direct-load behavior.
6. After implementation slices, perform Preview/human signup -> onboarding -> dashboard and account-switch/logout regression proof.

No auth-provider rewrite, read-path cutover, database migration, API contract change, mock removal, or direct-Supabase removal is currently required unless the owner chooses server-side notification preferences.

## Non-blocking debt

- Onboarding draft selections are intentionally page-local and lost on refresh/navigation.
- My Subjects performs a syllabus request per membership and client-filters broad task/attempt responses.
- Exam-date create/delete is supported by the API but has no mounted UI.
- Study Plan exposes create, complete, and delete but not every backend update field as a full editor.
- Public endpoints receive a Bearer token when a session exists; this is compatible but not strictly necessary.
- No application-level request timeout or user-facing request ID exists.
- Page-level error-boundary labeling is inconsistent.
- Impeccable's read-only detector reported the existing Fraunces font choice, rounded-tab border accents, and a sidebar width transition; these are visual/performance polish outside this cutover audit.
- The local pnpm/Git Bash signal-pipe launcher problem should be diagnosed separately because pinned direct validation succeeds.

## Gate 0 owner decisions

### Decision 1 — notification preference persistence

- Issue: Phase 5's governing document explicitly requires choosing server persistence now or an explicit client-only deferral. Current global browser storage is also not account-scoped.
- Current behavior: notification preferences live under `lockdin_notification_prefs`; reminder execution uses only the current user's API data and user-scoped suppression markers, but preference values can carry from User A to User B on the same browser.
- Option A: add server-side per-user preference storage and API contract. Trade-offs: cross-device consistency and durable ownership, but it expands Phase 5 into schema/migration/RLS/API/generated-client work while the product only sends in-app/browser-local reminders.
- Option B: explicitly defer server persistence, keep preferences device-local, and key them by current user ID. Trade-offs: smallest safe cutover and no backend changes, but preferences do not roam across devices and must be documented as device-local.
- Recommendation: **Option B for Phase 5**. User-scope the client key, migrate/discard the ambiguous legacy value safely, document the deferral, and revisit server persistence when notifications have a server delivery channel.

This decision must be approved before the first implementation slice. No separate Gate 0 choice is needed for API-only data access, 401 logout, request-ID display, runtime mocks, or onboarding draft persistence: current architecture/governing scope already resolves those.

## Recommended implementation slices

### Slice 1 — Account-scoped notification preference boundary

- Objective: implement the approved Gate 0 preference model and eliminate same-browser cross-account state bleed.
- Exact scope: preference key ownership, legacy ambiguous-key handling, Settings/Reminder Runner hook integration, explicit client-only deferral documentation if Option B is approved.
- Expected areas: `use-notification-prefs.ts`, Settings/Reminder Runner consumers, user-scoped storage utilities/tests, Phase 5 slice report.
- Dependencies: owner approval of Gate 0 Decision 1.
- API/database impact: none under recommended Option B; Option A would require a separately re-scoped schema/API slice and must not be silently substituted.
- Frontend impact: preference values resolve only after current user identity and never cross accounts.
- Auth/security impact: preserves Supabase/AuthProvider; improves account-state isolation.
- Tests: A -> B -> A preference isolation, legacy-key behavior, logout/login, reminder execution with current preferences.
- Preview QA: two disposable accounts in one browser profile; verify preference isolation and no reminder regression.
- Human QA: toggle each preference, refresh, log out, switch accounts, return to original account.
- Exit criteria: approved persistence choice documented; no unqualified personal preference key remains authoritative; tests/build pass.
- Rollback: revert the scoped preference adapter; no server data under Option B.
- Risk: Low.
- Non-goals: push/email notifications, service workers, reminder redesign, backend preference schema under Option B.

### Slice 2 — Read-state and error-semantic reconciliation

- Objective: ensure failed API reads are never presented as genuine empty personal data.
- Exact scope: Subject Detail secondary resources, Study Plan tasks/memberships, Past Papers attempts/components, and Settings catalogue dependency; consistent loading/error/retry/partial-data rules using existing components/copy helpers.
- Expected areas: the four page modules, shared query error/loading helpers only if evidence supports reuse, focused component tests.
- Dependencies: none after Slice 1 may run independently, but sequence after it keeps account-state behavior fixed first.
- API/database impact: none.
- Frontend impact: explicit error and retry states; no feature redesign.
- Auth/security impact: preserve global 401 behavior and distinct 403 handling.
- Tests: 400/403/404/500/network query failures, retry, loading composition, no false empty states, optional-auth syllabus failure.
- Preview QA: force/reproduce safe failed requests and verify recovery without logout except 401.
- Human QA: refresh and navigate among affected pages during loading and recovery.
- Exit criteria: every audited query has an intentional loading/error/empty policy; protected stale success UI is not left behind after identity failure.
- Rollback: page-level revert; no contract/data change.
- Risk: Medium.
- Non-goals: request-ID display, API redesign, new timeout policy, broad visual redesign.

### Slice 3 — Mutation and dependent-cache reconciliation

- Objective: make write success/failure deterministic across affected views.
- Exact scope: visible topic/task/past-paper mutation errors, bulk topic completion coordination, profile-to-dashboard invalidation, and verification of existing task/attempt/membership invalidation families.
- Expected areas: Subject Detail, Dashboard/Study Plan task actions where needed, Past Papers, Settings/profile update, query-key helpers/tests.
- Dependencies: Slice 2 establishes shared error semantics.
- API/database impact: none; use existing generated contracts.
- Frontend impact: consistent action feedback and fewer redundant invalidations; Dashboard profile display refreshes immediately.
- Auth/security impact: preserve server-derived ownership and 401 logout.
- Tests: success/error for each mutation, bulk partial/rejection behavior, exact invalidation families, profile update reflected in Dashboard, no optimistic cross-user data.
- Preview QA: perform each write and verify Dashboard/Progress/Subject/Plan/Papers consistency after navigation.
- Human QA: retry failed writes, rapid repeat actions, account switch after mutation.
- Exit criteria: no audited mutation rejects silently; dependent views converge without full reload; all generated contract inputs remain unchanged.
- Rollback: page/query invalidation revert; server state remains authoritative.
- Risk: Medium.
- Non-goals: full task editor, exam-date write UI, API method/schema changes, optimistic mutation framework.

### Slice 4 — Cutover regression proof and Phase 5 closeout candidate

- Objective: prove that already-complete auth/API cutover behavior and the three focused reconciliation slices work together.
- Exact scope: missing bearer-injection assertion, mounted router/direct-load/history tests, current-user cache/preference tests, full local validation, Preview smoke, and human signup -> onboarding -> dashboard/logout/account-switch journey.
- Expected areas: tests and Phase 5 verification documentation; source changes only if a test exposes a real in-scope defect.
- Dependencies: Slices 1-3 complete and deployed to Preview.
- API/database impact: none planned.
- Frontend impact: regression coverage, not a redesign.
- Auth/security impact: explicitly proves refreshed bearer, 401, no protected flash, destination restoration, and A/B isolation.
- Tests: full frontend suite/build; focused API global-auth/request-ID suites; route and journey coverage.
- Preview QA: direct protected URL refresh, expired/invalid session handling, optional-auth syllabus, all affected reads/writes.
- Human QA: real signup -> onboarding -> own dashboard; logout; A -> B -> A in one browser; back/forward; error recovery.
- Exit criteria: all automated checks pass, exact Preview source attribution is verified, human checklist passes, no Phase 5 implementation blocker remains.
- Rollback: test/docs revert only unless a discovered defect requires a separately reviewed fix.
- Risk: Low.
- Non-goals: Production database integration during local audit, universal checkpoint, Phase 6, unrelated frontend polish.

## Recommended implementation order

1. Gate 0: approve Option B (recommended) or explicitly re-scope for Option A.
2. Slice 1: establish the final account boundary for notification preferences.
3. Slice 2: standardize read loading/error/empty semantics.
4. Slice 3: standardize mutation feedback and dependent cache convergence.
5. Slice 4: add cutover regression proof, perform Preview/human QA, and prepare Phase 5 reconciliation.

Slices 2 and 3 should remain separate because read-failure semantics can be reviewed without changing mutation timing/invalidation. No read-path, auth-client, or mock-removal foundation slice is warranted: those foundations already exist.

## Risks

- Highest current implementation risk: turning partial query failures into a whole-page outage rather than preserving intentionally usable partial data. Slice 2 must define page-specific partial-data policy.
- Preference migration risk: applying an unscoped legacy value to the wrong signed-in account. The safest Option B migration is to discard or require reconfirmation, not guess ownership.
- Mutation risk: bulk topic updates can partially succeed. UI behavior must report and refetch the authoritative result instead of claiming all-or-nothing semantics the API does not provide.
- Auth regression risk: changing shared fetching/error code could accidentally treat 403 as 401 or mount protected queries before auth resolves. Existing behavior and tests must be preserved.
- Validation tooling risk: the current local Git Bash launcher intermittently/consistently fails to create a signal pipe; use pinned Windows executables until that environment issue is fixed, while retaining canonical commands in CI/release evidence.
- Scope risk: server-persisted preferences (Option A) would add a real schema/API/security surface and must be planned as such, not hidden inside a small frontend slice.

## Phase 5 entry verdict

**PHASE 5 ENTRY AUDIT: BLOCKED — OWNER DECISION REQUIRED**

The application-data cutover, Supabase Auth session model, bearer attachment, ownership boundary, route guards, and production mock removal are already satisfied. Phase 5 should contain only the evidence-backed state/error/mutation regression work above. Implementation must wait for the notification-preference persistence decision.

PHASE 5 IMPLEMENTATION: NOT STARTED
UNIVERSAL POST-PHASE-4 CHECKPOINT: COMPLETE
