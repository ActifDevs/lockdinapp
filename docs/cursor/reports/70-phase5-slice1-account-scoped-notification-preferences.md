# Phase 5 Slice 1 — Account-Scoped Notification Preferences

- **Date:** 2026-08-25
- **Baseline:** `391a62c37e0ff92aaa882747fdfd044a7e8485d8`
- **Branch:** `phase5-slice1-account-scoped-notification-prefs`
- **Status:** Implementation complete; automated validation complete; Preview and human QA as recorded below
- **Merge status:** **NOT MERGED TO MAIN**

## Baseline

- Canonical branch: `main`
- Expected / actual `origin/main`: `391a62c37e0ff92aaa882747fdfd044a7e8485d8`
- Local `main` was behind `origin/main` (fast-forward only; working tree clean). No local uncommitted work.
- Feature branch created from that SHA.
- Phase 4: COMPLETE
- Universal post-Phase-4 checkpoint: COMPLETE
- Phase 5 entry audit: COMPLETE (`docs/cursor/reports/69-phase5-entry-audit-and-frontend-cutover-reconciliation.md`)
- Phase 5 implementation before this slice: NOT STARTED

## Gate 0 owner decision

**OPTION B APPROVED**

- **SERVER PERSISTENCE:** DEFERRED
- **DEVICE-LOCAL USER-SCOPED PREFERENCES:** APPROVED
- **AMBIGUOUS LEGACY GLOBAL VALUE:** NOT MIGRATED TO ANY USER

Notification preferences remain browser-local. The authenticated Supabase user ID is part of the storage key. The legacy global `lockdin_notification_prefs` value is discarded/ignored, never attributed.

## Prior behavior

- Type: `{ morningSummary: boolean; deadlineReminders: boolean; examAlerts: boolean }`
- Defaults: morning summary on, deadline reminders on, exam alerts off
- Key: global `lockdin_notification_prefs`
- `useNotificationPrefs` initialized from that key on first render and wrote the same key on toggle
- The hook had no current-user identity
- Settings and Reminder Runner both consumed the same hook, so they agreed with each other, but both inherited whichever account last wrote the global key
- Auth loading/logout did not reset personal preference state
- User A → User B in one browser could apply A's reminder toggles to B's reminder loop
- Theme (`vite-ui-theme`) and sidebar (`lockdin_sidebar_collapsed`) were already device-global presentation settings and were left unchanged

## Final storage contract

Authoritative key uses the existing helper:

`userScopedStorageKey("lockdin_notification_prefs", userId)` → `lockdin_notification_prefs:<userId>`

- Current-user identity: `useAuth().user.id` after `isLoading` is false
- While auth is loading or signed out: documented defaults only; no user-owned read or write
- Missing / invalid JSON / wrong shape / non-boolean fields: documented defaults
- No token, email, or display name in the key or value
- Theme and sidebar keys are not user-scoped

`lockdin_notification_prefs` was added to `LEGACY_PERSONAL_STORAGE_KEYS` so AuthProvider's existing obsolete-key cleanup removes the ambiguous global value. The preference hook also removes that global key on resolve and never reads it.

## Auth lifecycle behavior

| Stage | Behavior |
| --- | --- |
| Auth loading | Defaults; do not resolve a guessed owner's storage |
| User A authenticated | Load A-scoped value or defaults |
| A updates a toggle | Write only `lockdin_notification_prefs:<A>` |
| Logout / signed-out | In-memory prefs return to defaults; A's scoped key remains for later restore |
| User B authenticated | Load B-scoped value or defaults; A key untouched |
| Return to A | Restore A's scoped value |

No AuthProvider architecture change. The hook consumes existing `useAuth()`.

## Legacy cleanup behavior

The global key is never used as a source of truth. It is removed:

1. On AuthProvider obsolete-key cleanup (same path as other unqualified personal keys)
2. When the preference hook resolves (authenticated or signed-out)

Tests prove a valid legacy object is not assigned to User A or User B.

## Files changed

- `artifacts/revision-platform/src/hooks/use-notification-prefs.ts`
- `artifacts/revision-platform/src/hooks/use-notification-prefs.test.tsx` (new)
- `artifacts/revision-platform/src/lib/user-scoped-storage.ts`
- `artifacts/revision-platform/src/lib/user-scoped-storage.test.ts`
- `artifacts/revision-platform/src/components/auth-provider.test.tsx`
- `artifacts/revision-platform/src/components/reminder-runner.test.tsx`
- `docs/cursor/reports/70-phase5-slice1-account-scoped-notification-preferences.md`

Settings and Reminder Runner still import `useNotificationPrefs` only; no consumer rewrite was required.

## Focused tests

`use-notification-prefs.test.tsx`: defaults, A persistence, remount restore, A → logout → B → A isolation, legacy global non-attribution, malformed scoped JSON, auth-loading non-guess, theme/sidebar unchanged.

`reminder-runner.test.tsx`: existing A/B suppression still passes against real prefs (defaults); additional test that A's scoped-off prefs skip reminders while B receives defaults, and that a tempting global legacy object does not enable A's reminders.

`user-scoped-storage.test.ts` / `auth-provider.test.tsx`: legacy key list includes `lockdin_notification_prefs`; AuthProvider still strips unqualified personal keys and keeps user-qualified keys.

## A → B → A isolation evidence

Automated sequence in `use-notification-prefs.test.tsx` (`isolates A from B and restores A after account switch`):

1. A disables morning summary and enables exam alerts (written to A's key)
2. Signed-out probe shows defaults, not A's values
3. B receives defaults, then disables morning summary (written only to B's key)
4. Return to A restores morning off + exam on
5. Both scoped keys remain distinct

## Malformed/legacy-value evidence

- Legacy global object with exam alerts on: A and B still receive defaults; global key is removed; no scoped write from that value
- Malformed A-scoped JSON: defaults; no crash

## Reminder behavior

Reminder Runner still reads `prefs` from `useNotificationPrefs`. With the hook now user-scoped, morning/deadline/exam gates follow the current account. Suppression markers were already `lockdin_*_ping:<userId>`. The real hook is used in Reminder Runner tests (the previous always-on mock was removed so preference isolation is not mocked away).

## Automated validation

This session ran on macOS. Canonical `pnpm` wrappers executed successfully. The Windows Git Bash signal-pipe launcher failure documented in Report 69 did **not** occur here. No pinned-binary fallback was required.

| Check | Result |
| --- | --- |
| Focused Slice 1 Vitest | PASS (4 files, 28 tests including shared auth/storage files) |
| `pnpm --filter "@workspace/revision-platform" test` | PASS: 20 files, 98 tests |
| `pnpm run typecheck` | PASS |
| `PORT=3000 BASE_PATH=/ pnpm --filter "@workspace/revision-platform" run build` | PASS: 3,272 modules; existing non-fatal tooltip/sheet sourcemap warnings |
| Global auth policy | PASS: 33 tests |
| Request-ID | PASS: 10 tests |
| Hosted/Production DB integration | Not run (out of scope) |

## Security review

**ACCOUNT-SCOPED PREFERENCE SECURITY REVIEW: PASS**

- No access token or session credential in preference JSON
- Storage key uses stable authenticated user ID, not email or display name
- No new Supabase data query, API route, or RLS change
- Browser storage is local reminder UX state only; the API ownership model is unchanged
- Local storage is not treated as server trust
- Theme/sidebar remain device presentation settings

## Diff/scope review

Implementation is limited to the notification preference hook, the shared user-scoped key list (justified by existing architecture), tests, and this report. No backend, database, migration, RLS, RPC, generated API, Supabase config, AuthProvider architecture, global auth/request-ID middleware, Vercel config, environment files, or syllabus data changes.

## Preview

Initially: PENDING (filled after deployment)

## Human QA

Initially: PENDING — checklist is in the Slice 1 closeout response for two authorized accounts (A → B → A, reminder regression, legacy policy).

## Merge status

**NOT MERGED TO MAIN**
