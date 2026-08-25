# Phase 5 Slice 1 — Merge and Production Closeout

- **Closeout date:** 2026-08-25
- **Scope:** Phase 5 Slice 1 release reconciliation and documentation only
- **Canonical branch:** `main`
- **Production release:** verified

## Canonical release lineage

| Release point | Canonical value |
| --- | --- |
| Slice baseline | `391a62c37e0ff92aaa882747fdfd044a7e8485d8` |
| Implementation SHA | `3c2cdcea033de33f71798d0fdc15be528013b3d2` |
| Verified Preview implementation/docs source | `072c0b10fc45a2992eb6ad0393743f6b6d3f4f46` |
| Final QA feature SHA | `e41530fd7e88082f9c38c8d62be7778a2a94f1f7` |
| Merge SHA | `32ac5d61d9adc87db5fb0203bfd88af0715f6c20` |
| Merge first parent | `391a62c37e0ff92aaa882747fdfd044a7e8485d8` |
| Merge second parent | `e41530fd7e88082f9c38c8d62be7778a2a94f1f7` |
| Merge conflicts | None |
| Production deployment | `dpl_4G7rC3qqxY96WoCqqSFenRRaoTJQ` |
| Production source | `32ac5d61d9adc87db5fb0203bfd88af0715f6c20` |

The merge was an explicit no-fast-forward merge of the reviewed and pushed
feature branch. `main` and `origin/main` were equal to the merge SHA after the
push, with a clean working tree.

## Gate 0 decision

**OPTION B APPROVED**

- **SERVER PERSISTENCE:** DEFERRED
- **DEVICE-LOCAL USER-SCOPED PREFERENCES:** APPROVED
- **AMBIGUOUS LEGACY GLOBAL VALUE:** NOT ATTRIBUTED TO ANY USER

Slice 1 did not introduce a database table, migration, RLS/RPC change, API
contract, Supabase configuration change, or Vercel configuration change.

## Final preference contract

The authoritative browser-local key is:

`lockdin_notification_prefs:<authenticated-user-id>`

The unqualified legacy key `lockdin_notification_prefs` is not read as any
user's preference and is removed through the existing obsolete personal-key
cleanup. Missing or invalid scoped values resolve to documented defaults.

Multiple user-scoped preference entries may coexist in the same browser
profile. This is expected. Only the currently authenticated user's scoped
entry is authoritative. Logout resets in-memory authority but does not delete
another account's saved device-local preference. No token, email, display
name, or server authorization claim is stored in the preference record.

## Preview QA

- Preview: `https://lockdinapp-7irm9t4uf-actif-devs.vercel.app`
- Exact Preview source: `072c0b10fc45a2992eb6ad0393743f6b6d3f4f46`

**OWNER-PERFORMED HUMAN QA: PASS**

**QA-OWNER FINAL SIGN-OFF: NOT CLAIMED**

Owner-reported Preview results:

- User A preference persistence: PASS
- User A → User B isolation: PASS
- User B preference persistence: PASS
- User B → User A restoration: PASS
- Reminder regression: PASS
- Logout stale-state check: PASS
- Legacy global preference remained non-authoritative: PASS
- Scoped preference ownership mapping: PASS
- Unexpected authenticated 401: NO
- Auth/session loop: NO
- Blocking regression: NONE

## Merge

- Final feature SHA: `e41530fd7e88082f9c38c8d62be7778a2a94f1f7`
- Merge SHA: `32ac5d61d9adc87db5fb0203bfd88af0715f6c20`
- First parent: `391a62c37e0ff92aaa882747fdfd044a7e8485d8`
- Second parent: `e41530fd7e88082f9c38c8d62be7778a2a94f1f7`
- Conflicts: none
- Main push: PASS; `HEAD == origin/main == 32ac5d61d9adc87db5fb0203bfd88af0715f6c20`

The complete feature diff contained only the preference hook, scoped-storage
utility, focused frontend tests, and Report 70. No backend, database,
migration, RLS/RPC, generated API, Supabase/Vercel configuration,
environment, reference-data, or checkpoint change was included.

## Post-merge validation

Validation ran against the actual merge SHA
`32ac5d61d9adc87db5fb0203bfd88af0715f6c20` before `main` was pushed.

| Check | Result |
| --- | --- |
| Frontend tests | PASS — 20 files / 98 tests |
| Typecheck | PASS — root references and required workspaces, no diagnostics |
| Frontend Production build | PASS — 3,272 modules |
| Global-auth policy | PASS — 33 tests |
| Request-ID middleware | PASS — 10 tests |
| `git diff --check HEAD^1..HEAD` | PASS |
| Working tree | Clean |
| Hosted database integration | NOT RUN — out of scope for this browser-local slice |

On the Windows closeout machine, canonical pnpm wrappers encountered the
previously documented Git Bash signal-pipe launcher error before the
underlying tools executed. Repository-pinned Windows tool fallbacks passed
the complete checks above. This launcher issue is not an application
regression.

Known unchanged non-fatal build warnings were limited to the tooltip/sheet
sourcemap messages and the greater-than-500-kB chunk warning.

## Production deployment

- Vercel project: `actif-devs/lockdinapp-web`
- Deployment ID: `dpl_4G7rC3qqxY96WoCqqSFenRRaoTJQ`
- Immutable URL: `https://lockdinapp-2riu8q25p-actif-devs.vercel.app`
- Canonical URL: `https://lockdinapp-web.vercel.app`
- Source SHA: `32ac5d61d9adc87db5fb0203bfd88af0715f6c20`
- Branch: `main`
- Target: Production
- State: READY
- Canonical alias: verified against the same deployment ID

Vercel build logs confirmed the exact `main` commit, successful API and
frontend builds, deployment completion, and READY state. No new build or
runtime error occurred.

## Production technical smoke

Read-only verification against canonical Production passed:

| Request | Result | Request-ID evidence |
| --- | --- | --- |
| `GET /api/healthz` | 200; status `ok` | Valid UUID `X-Request-Id` |
| `GET /api/healthz/db` | 200; status `ok`; database `ok` | Valid UUID `X-Request-Id` |
| Anonymous `GET /api/tasks` | 401 Unauthorized | Valid UUID `X-Request-Id` |
| Landing page | 200 HTML | Not applicable |
| Login page | 200 HTML | Not applicable |

**PRODUCTION TECHNICAL SMOKE: PASS**

## Owner-performed authenticated Production QA

**OWNER-PERFORMED AUTHENTICATED PRODUCTION QA: PASS**

**QA-OWNER FINAL SIGN-OFF: NOT CLAIMED**

The project owner completed the required Production A → B → A sequence in one
browser profile.

### User A

Starting preference values:

- Morning summary: ON
- Deadline reminders: ON
- Exam approaching alerts: OFF

Changed values:

- Morning summary: OFF
- Deadline reminders: OFF
- Exam approaching alerts: ON

Refresh persistence: PASS.

### User A → User B

User B initially received the documented defaults:

- Morning summary: ON
- Deadline reminders: ON
- Exam approaching alerts: OFF

User B did not inherit User A's changed combination. Isolation: PASS.

User B then changed to:

- Morning summary: OFF
- Deadline reminders: OFF
- Exam approaching alerts: OFF

User B refresh persistence: PASS.

### User B → User A

User A's previously stored Production combination returned. User B's value
was not authoritative. Restoration: PASS.

### General Production QA

- Reminder regression: PASS
- Scoped storage behavior: PASS
- Unexpected authenticated 401: NO
- Auth/session loop: NO
- Settings crash: NO
- Logout: PASS
- Unrelated blocking regression: NO

No authenticated browser evidence is attributed to the designated QA owner,
and QA-owner final sign-off is not claimed.

## Data safety

**DATA SAFETY: PASS**

Production human verification changed browser-local notification preferences
only. It did not create or delete database rows for QA and did not change
schema, migrations, RLS/RPCs, Supabase/Auth configuration, Vercel
configuration, or environment variables.

## Secret handling

**EXPOSED QA SESSION: INVALIDATED BY OWNER**

The previously exposed Preview QA session was invalidated by the owner through
logout and establishment of a fresh session. No access token, refresh token,
session ID, email, or actual QA user ID is included in this report.

## Non-blocking follow-up

**PHASE 5 FOLLOW-UP — UI/NAVIGATION STATE PERSISTENCE AUDIT**

Observed example: selecting Settings → Alerts and refreshing `/settings`
returns the interface to Account. Returning to the browser tab can also reset
the selected Settings view.

The future audit must deliberately determine which tabs, selected views,
filters, disclosure/expanded state, and page-local navigation state should be
intentionally reset, remain memory-only, be URL-addressable, use browser
persistence, or restore from server state across refresh, direct reload,
back/forward navigation, component remount, and tab/window restoration.

**UI/NAVIGATION STATE PERSISTENCE AUDIT: DEFERRED — NON-BLOCKING FOR SLICE 1**

No navigation-state persistence behavior was implemented during Slice 1
closeout.

## Final Slice 1 disposition

PHASE 5 SLICE 1 PRODUCTION RELEASE VERIFIED

ACCOUNT-SCOPED NOTIFICATION PREFERENCES: PASS

USER A → USER B ISOLATION: PASS

USER B → USER A RESTORATION: PASS

PRODUCTION PREFERENCE PERSISTENCE: PASS

REMINDER REGRESSION: PASS

PRODUCTION HEALTH: PASS

SLICE 1 AUTH REGRESSION: NONE DETECTED

DATA SAFETY: PASS

OWNER-PERFORMED AUTHENTICATED PRODUCTION QA: PASS

QA-OWNER FINAL SIGN-OFF: NOT CLAIMED

UI/NAVIGATION STATE PERSISTENCE AUDIT:
DEFERRED — NON-BLOCKING

PHASE 5 SLICE 1: CLOSED

PHASE 5 SLICE 2: NOT STARTED
