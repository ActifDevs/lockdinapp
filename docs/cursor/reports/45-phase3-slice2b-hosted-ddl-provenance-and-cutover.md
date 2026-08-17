# Phase 3 Slice 2B — Hosted DDL Provenance & Cutover Verification

## Executive Summary

**Production is not healthy right now.** Against
`https://lockedin-study.vercel.app`, `GET /api/subjects` still returns
**HTTP 500** with the same root cause Report 44 identified: Production
application code (unchanged `main` / Vercel Production deploy
`dpl_AoqvR84…`) still `SELECT`s `syllabus_topics.status` and
`syllabus_topics.notes`, which no longer exist on the shared hosted
database. Health and auth pages respond 200; the catalogue path that
powers onboarding subject selection does not. This contradicts any belief
that the user-facing Production outage is already cleared by means outside
this branch — `origin/main` has not moved past the Phase 2 checkpoint
`d25aa0a`, and Production has not been redeployed with Slice 2B-compatible
code.

**Confirmed provenance of the out-of-process hosted `0007` apply:** the
reviewed Migration `0007` executable body (both `DROP COLUMN` statements,
including `--> statement-breakpoint` markers) was run manually through the
Supabase Dashboard SQL Editor on project `hazvcdrcvsxmuwdfiucx` at
**2026-08-09 19:47:27–29 UTC** under `application_name =
supabase/dashboard-query-editor`, `user_name = postgres`, with Dashboard
footer `-- source: dashboard` / `-- date: 2026-08-09T19:47:27.536Z`. A
saved SQL snippet owned by `GidiProgrammer` was created at
`2026-08-09T19:47:24.4998Z` with the same executable SQL (header comments
from the committed file omitted; statement body strip-identical).

This is the **second** instance of the same out-of-process hosted-DDL
pattern documented in Report 41 (Dashboard SQL Editor bypassing
`drizzle-kit migrate`). **Outcome contrast:** Slice 2A’s incident was
benign (schema matched the reviewed migration; Production was not yet
dependent on the new table). Slice 2B’s incident caused a **Production
outage** because Production still selected the dropped columns. The process
gap flagged in Report 41 can no longer be treated as a documentation-only
note.

**Slice 2B Preview cutover matrix (formal):** PASS against Preview
`https://lockedinapp-kop3k2ju1-gidiprogrammers-projects.vercel.app`
(`phase3-s2b-legacy-topic-cleanup` @ `31b1dec`). Catalogue, onboarding
completion, topic-progress merge/reset isolation, tasks, and
user-subjects all succeeded with disposable real Auth sessions. Disposable
users were fully cleaned up to the pre-E2E owned-row baseline.

This session did **not** apply, reapply, or roll back any migration; did
**not** modify Production; did **not** merge; and does **not** render a
merge-clearance verdict on the incident-response code changes in
`31b1dec` (that belongs to the next gate).

## Git Baseline

| Ref | SHA | Note |
| --- | --- | --- |
| `origin/main` | `d25aa0a09ca390ea1f1e94f3538ae74a2f8df7f8` | Phase 2 checkpoint; **has not moved** |
| `origin/phase3-multitenancy` | `9a4df7ddb38785c660214d4f116efdf17728d87a` | Integration head |
| `origin/phase3-s2b-legacy-topic-cleanup` | `31b1dec6c72ef1decd745f054a85d108bdb83ea8` | Slice 2B tip (includes Report 44 + incident fix) |

Commits on `phase3-s2b-legacy-topic-cleanup` since
`phase3-multitenancy` (exactly five; nothing further since `31b1dec`):

1. `658e8fb` — `feat(phase3): drop legacy syllabus_topics status and notes`
2. `f73464f` — `chore(phase3): clear dead legacy topic progress references`
3. `5485a83` — `test(phase3): assert syllabus_topics legacy columns are gone`
4. `44760f3` — `docs(phase3): record slice 2B legacy topic column removal` (Report 43)
5. `31b1dec` — `fix(phase3): surface onboarding catalogue load failures` (Report 44 + incident UX/query hardening)

Repository journal on this branch: exactly `0000`–`0007`, last tag
`0007_eager_squadron_supreme`.

Vercel Production alias `lockedin-study.vercel.app` still points at
`dpl_AoqvR84Sxd4777ADZ87fMuT5vzXG` (created 2026-08-07; meta commit
`7d7cedb`, an ancestor of `d25aa0a` — no Production redeploy since Report
44).

## Relationship to Reports 43 and 44

- **Report 43** correctly records that the *implementation* session applied
  `0007` only to local loopback and did not use hosted connections for
  cutover. That claim is about the implementation task, not about later
  out-of-process Dashboard activity. This report does not conflate the two.
- **Report 44** correctly identified hosted `0007` presence, Production
  500, and Preview functional recovery as an *incident investigation*. It
  explicitly left provenance unresolved. This report re-verifies those
  technical facts with fresh checks and supplies the missing provenance
  from direct Postgres log evidence (Report 41 method).

## Pattern acknowledgment (second occurrence)

| | Slice 2A (Report 41) | Slice 2B (this report) |
| --- | --- | --- |
| Mechanism | Dashboard SQL Editor paste of migration SQL | Same |
| `application_name` | `supabase/dashboard-query-editor` | Same |
| Actor signal | `GidiProgrammer` snippet ownership | Same |
| Content | Byte-identical (modulo newline) to `0006` | Executable body strip-identical to `0007` (file header comments omitted in paste) |
| Outcome | Benign — journal lag only | **Production outage** — dropped columns still selected by Production |

Report 41’s forward-looking rule — hosted DDL only via reviewed
`drizzle-kit migrate` cutover tasks; stop-and-report if DDL precedes the
journal — was not followed for `0007`. The material cost this time is the
ongoing Production catalogue failure.

## Provenance evidence

### Direct confirmation — hosted Postgres logs

`postgres_logs` for project `hazvcdrcvsxmuwdfiucx`, window
`2026-08-09T19:47:20.000Z`–`2026-08-09T19:47:30.000Z` (exactly one event):

| Field | Value |
| --- | --- |
| Log event id | `0201eeac-3100-4aea-870e-5c9777d1cb82` |
| `event_message` | `statement:` + both `ALTER TABLE "syllabus_topics" DROP COLUMN …` lines with `--> statement-breakpoint`, plus Dashboard footer |
| Dashboard footer | `-- source: dashboard` / `-- user: session:033b5701-7686-4256-8d87-fe073b75e022` / `-- date: 2026-08-09T19:47:27.536Z` |
| `metadata.parsed.application_name` | `supabase/dashboard-query-editor` |
| `metadata.parsed.user_name` | `postgres` |
| `metadata.parsed.timestamp` | `2026-08-09 19:47:29.224 UTC` |
| `metadata.parsed.session_start_time` | `2026-08-09 19:47:28 UTC` |
| Host | `db-hazvcdrcvsxmuwdfiucx` |

Executable SQL in the log is strip-identical to the committed
`0007_eager_squadron_supreme.sql` body from the first `ALTER TABLE` through
EOF. The migration’s leading comment block (document-then-discard narrative)
was not included in the Dashboard paste; the destructive statements and
breakpoint marker match.

### Supporting evidence — SQL snippet

| Field | Value |
| --- | --- |
| Snippet id | `f0af510c-d7b3-44ec-9962-b6d070ddc6a7` |
| Created | `2026-08-09T19:47:24.4998+00:00` |
| Owner / updated_by | `GidiProgrammer` (id `1191350`) |
| Project | `hazvcdrcvsxmuwdfiucx` / Lockdin-app |
| Content | Same two `DROP COLUMN` statements + `statement-breakpoint` (no header comments) |

Snippet creation precedes the logged statement by ~3 seconds — consistent
with save-then-run in the SQL Editor.

### Journal vs DDL wall-clock

| Clock | Value | Meaning |
| --- | --- | --- |
| Hosted journal row 8 `created_at` | `1786302770787` → `2026-08-09T19:12:50.787Z` | Equals the migration file’s Drizzle `when` stamp in `_journal.json`, **not** the wall-clock apply time |
| Hosted journal row 8 `hash` | `4eab521214bf0b5c…` | **Byte-identical** SHA-256 of committed `0007_eager_squadron_supreme.sql` |
| Actual DDL (logs) | `2026-08-09T19:47:27.536Z` (dashboard date) / `19:47:29.224 UTC` (parsed) | ~35 minutes after the journal `when` stamp |

Hosted journal length: exactly eight rows (`0000`–`0007`). No later entries.

Logflare queries for an `__drizzle_migrations` insert in the same evening
did not return usable rows under rate limits / backend errors during this
session. The journal hash match proves the recorded migration content is
the committed `0007` file; the Dashboard log proves the DDL mechanism and
wall-clock. Whether the journal row was inserted by a later
`drizzle-kit migrate` bookkeeping step or a separate insert was **not**
fully recovered from logs here — it is **not** required to establish that
the destructive DDL itself was Dashboard SQL Editor, out of process.

### Ruled out

- Accidental `drizzle-kit push` / schema-diff rewrite as the DDL source —
  would not emit hand-written `statement-breakpoint` markers or
  `supabase/dashboard-query-editor` application_name.
- Report 43’s implementation session as the hosted applier — that session’s
  “no hosted connection” claim remains about implementation; this Dashboard
  event is a separate later action.

## Hosted schema / orphaned-row formality (read-only)

Observed `public.syllabus_topics` columns (read-only transaction):

`id, unit_id, subject_id, title, order_index`

- `status`: **absent**
- `notes`: **absent**

Shape matches Migration `0007`’s intended end state.

Topic `id=1` still exists as reference data
(`title='Roots of polynomial equations'`, …). The formerly recorded orphaned
legacy values (`status='in_progress'`, `notes=NULL` per Reports 34/40) are
gone with the columns — consistent with the Owner’s document-then-discard
decision; no special-case row delete was required or observed.

`topic_progress` remains present with columns
`user_id, topic_id, status, notes, created_at, updated_at` (untouched by
`0007`).

Shared catalogue counts at verification time: subjects `9`, syllabus_topics
`520`, syllabus_versions `9`.

## Production health verification (urgent)

| Request | Observed |
| --- | ---: |
| `GET /api/healthz` | **200** `{"status":"ok"}` |
| `GET /api/healthz/db` | **200** `{"status":"ok","database":"ok"}` |
| `GET /api/subjects` | **500** `{"error":"Internal server error"}` |
| `GET /login` | **200** |
| `GET /signup` | **200** |

Production Vercel log (fresh, this session):

```text
Failed query: select "id", "unit_id", "subject_id", "title", "status", "notes", "order_index"
from "syllabus_topics"
params: : column "status" does not exist
```

### Mechanism check — why is it still broken?

| Hypothesis | Evidence |
| --- | --- |
| `main` / Production code updated | **No** — `origin/main` still `d25aa0a`; Production deploy still `dpl_AoqvR84…` from 2026-08-07 |
| Hosted columns re-added to match old Production | **No** — hosted columns remain without `status`/`notes` |
| Vercel rollback to a Slice 2B-compatible build | **No** — Production meta remains pre–Phase 3 application code selecting legacy columns |
| Out-of-git hotfix promoted | **No evidence** — same failing SQL shape as Report 44 |

**Conclusion:** Production catalogue/onboarding subject selection remains
broken. Immediate Operator action is required outside this task (authorized
Production deploy of code that does not select the dropped columns, or an
authorized temporary schema strategy — **not** performed here).

## Section 9 — Hosted cutover test matrix (Slice 2B Preview only)

Preview under test:

| Field | Value |
| --- | --- |
| URL | `https://lockedinapp-kop3k2ju1-gidiprogrammers-projects.vercel.app` |
| Branch | `phase3-s2b-legacy-topic-cleanup` |
| Commit | `31b1dec6c72ef1decd745f054a85d108bdb83ea8` |
| Environment | Preview (`target` null / preview) |

Disposable users: two Auth users provisioned with
`admin.createUser({ email_confirm: true })` (service-role only for
provision/delete); all API sessions via `signInWithPassword` with the
publishable key. A third short-lived user was used solely to confirm
`/api/progress/overview` after the main pair was cleaned up.

| Check | Result | Observed |
| --- | --- | --- |
| Preview smoke | **PASS** | `/`, `/login`, `/signup`, `/api/healthz`, `/api/healthz/db` all **200** |
| Catalogue list | **PASS** | `GET /api/subjects` → **200**, **9** subjects |
| Catalogue detail | **PASS** | `GET /api/subjects/6` → **200**, Chemistry, `topicsTotal=104` |
| Unauth topic-progress gate | **PASS** | PATCH/DELETE `/api/syllabus-topics/247` → **401** |
| Onboarding subject selection (API path) | **PASS** | A onboarded with subjects `[6,7,8]` → **200**; B with `[9]` → **200** |
| Syllabus GET merged `topic_progress` | **PASS** | Topic `247`: A `in_progress`/`A notes s2b`; B `completed`/`B notes s2b` |
| Reset isolation | **PASS** | A DELETE → **204**; A defaults to `not_started`/null; B still `completed`/`B notes s2b` |
| Tasks enrichment | **PASS** | `GET /api/tasks` for A → **200**, **3** starter tasks |
| User-subjects | **PASS** | `GET /api/user-subjects` for A → **200**, **3** memberships |
| Progress overview | **PASS** | `GET /api/progress/overview` → **200**; Chemistry `syllabusProgress: 1` after one completed topic |
| Onboarding catalogue failure UX | **NOT RUN** | Not safely simulable without injecting a client-side failure or breaking the live catalogue for other testers |

Shared `syllabus_topics` count remained **520** throughout.

## Disposable cleanup

Pre-E2E owned-table baseline (pre-existing non-disposable rows left untouched):

| Relation | Pre-E2E | Post-cleanup |
| --- | ---: | ---: |
| `auth.users` | 1 | 1 |
| `profiles` | 1 | 1 |
| `user_subjects` | 3 | 3 |
| `tasks` | 3 | 3 |
| `topic_progress` | 2 | 2 |
| `subjects` | 9 | 9 |
| `syllabus_topics` | 520 | 520 |

All three disposable Auth users created in this session were deleted.
`BASELINE_RESTORED_FOR_DISPOSABLES = true` for the counts above. No
disposable emails, passwords, or tokens are recorded here.

## Recommendation

1. **Production:** treat as an open Severity-1 outage until an *authorized*
   Production code path that does not select dropped columns is deployed (or
   another Owner-approved recovery). This task must not perform that deploy.
2. **Merge clearance for `phase3-s2b-legacy-topic-cleanup`:** functionally,
   hosted schema + Slice 2B Preview cutover matrix are in a state that can
   proceed to the merge-clearance gate **after** Production recovery is
   planned/owned — clearance should not pretend Production is fine.
3. **Incident-response commit `31b1dec`:** do **not** treat it as
   pre-approved. Merge clearance should review the catalogue projection
   hardening and onboarding error UX with the same scrutiny as the rest of
   the slice; this report only records that they exist and that Preview
   matrix passed with them present.
4. **Process:** ban Dashboard SQL Editor application of migration files for
   this project. Two occurrences in one day, second causing Production
   breakage, is enough evidence.

## Final Safety Verification Checklist

- [x] Fresh provenance from hosted Postgres logs (not citation of Report 44)
- [x] Second-occurrence pattern + benign-vs-outage contrast stated
- [x] Hosted `syllabus_topics` shape confirmed (`status`/`notes` absent)
- [x] Hosted journal ends at `0007` with hash matching committed file; journal
      `created_at` vs DDL wall-clock divergence recorded
- [x] Orphaned legacy values confirmed gone with column drop; topic `id=1`
      reference row remains
- [x] Production health independently checked — **not healthy** (`/api/subjects` 500)
- [x] Production mechanism: no code/schema/deploy recovery found
- [x] Slice 2B Preview formal matrix executed with real Auth sessions
- [x] Disposable users cleaned; pre-existing non-disposable baseline preserved
- [x] No migration apply/revert; no Production modification; no merge
- [x] Incident-response code not approved here (deferred to merge clearance)
