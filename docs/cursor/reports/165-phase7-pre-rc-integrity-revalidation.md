# Report 165 — Phase 7 Pre-RC Integrity Revalidation

**Date:** 2026-09-10
**Workstation:** `/Users/gideon/Documents/web design projects/lockedinapp` (macOS). Report 164 freeze used `C:\Users\USER\lockdinapp`. After `git fetch` + fast-forward, this clone matches `origin/main`.
**Status:** **PASS** — Pre-RC integrity revalidation CLOSED / PASS. Exact RC candidate nominated. This is not full RC QA, feature freeze, or invitation authorization.

No product code, tests, migrations, Auth, Vercel configuration, deployments, catalogue flags, memberships, tasks, or attempts were changed by this slice.

---

## 1. Scope and release context

**FROZEN HISTORICAL EVIDENCE**

| Gate | Status |
| --- | --- |
| Report 159 original pre-beta scope freeze | Authoritative except catalogue visibility superseded by Report 164 |
| Report 162 support/privacy Production verification | CLOSED / PASS |
| Report 163 password-recovery E2E | CLOSED / PASS |
| Report 164 16-subject controlled-beta activation | CLOSED / PASS |
| Report 164 freeze SHA | `a68f926db9ba15347d2f6e7185ec41ae9cb376b2` |
| Expected catalogue | 16/16 globally selectable; current-nine 9/9; new-seven 7/7 |
| Visibility grants / Feb/Mar | 0 / 0 |
| PB-OPS-01 | PARTIAL |
| Google OAuth | DEFERRED / DISABLED |
| Real beta invitations | NOT AUTHORIZED |

This slice answers whether the current repository + Production system is internally consistent and ready to nominate an exact RC candidate for full risk-based RC QA. It does **not** run that QA.

---

## 2. Repository baseline

**CURRENT REPOSITORY EVIDENCE**

| Check | Result |
| --- | --- |
| `git rev-parse --show-toplevel` | `/Users/gideon/Documents/web design projects/lockedinapp` |
| Branch | `main` |
| Initial local HEAD before alignment | `e98ec27ce364bfafea774047b092cd6ae269e73c` (behind `origin/main` by 4 commits, fast-forwardable) |
| `git fetch origin --prune` | Completed |
| `origin/main` | `a68f926db9ba15347d2f6e7185ec41ae9cb376b2` |
| Alignment action | `git merge --ff-only origin/main` only (no product edit) |
| HEAD after alignment | `a68f926db9ba15347d2f6e7185ec41ae9cb376b2` |
| Working tree before Report 165 | CLEAN |

Delta `HEAD..origin/main` before fast-forward (all already on GitHub `main`):

1. `1b57d9f` `test: finalize pre-beta support route` — product/test (Help & Support card)
2. `84f74ee` Report 162 (docs)
3. `b27cb5c` Report 163 (docs)
4. `a68f926` Report 164 (docs)

No unexpected unpublished product code. Fast-forward was required so quality gates ran against the freeze SHA.

Recent log (HEAD):

```
a68f926 docs: freeze 16-subject beta catalogue activation
b27cb5c docs: freeze password recovery production proof
84f74ee docs: freeze pre-beta support production verification
1b57d9f test: finalize pre-beta support route
```

---

## 3. Product-SHA / documentation reconciliation

**CURRENT REPOSITORY EVIDENCE**

`git log --name-status 1b57d9f..HEAD` contains **only**:

- `docs/cursor/reports/162-phase7-pre-beta-support-privacy-production-verification.md`
- `docs/cursor/reports/163-phase7-password-recovery-end-to-end-proof.md`
- `docs/cursor/reports/164-phase7-controlled-beta-catalogue-scope-amendment-and-activation.md`

`git diff --stat 1b57d9f..HEAD -- . ':(exclude)docs' ':(exclude)*.md'` is empty.

**LATEST_PRODUCT_SHA:** `1b57d9fbb6aa25e61598b4f49f495848e20ed758`
**Product-tree relation:** current `main` HEAD is documentation-only descendants of that SHA. Runtime product tree is Product-equivalent to `1b57d9f`.

---

## 4. Production deployment reconciliation

**CURRENT PRODUCTION EVIDENCE**

Vercel CLI on this workstation: **not usable** (`vercel whoami` → specified token is not valid). No inspect/redeploy was attempted.

GitHub deployment API + live aliases:

| Surface | Evidence | Git SHA | State |
| --- | --- | --- | --- |
| Web `lockdinapp-web` | GitHub deployment `6360489786` (2026-09-09 22:24:04Z); unique URL `https://lockdinapp-1ql6vsq79-actif-devs.vercel.app`; canonical `https://lockdinapp-web.vercel.app` | `a68f926db9ba15347d2f6e7185ec41ae9cb376b2` | success / READY (canonical health 200) |
| API `lockdinapp` | GitHub deployment `6360479463` (2026-09-09 22:23:18Z); unique URL `https://lockdinapp-hok2x8sgx-actif-devs.vercel.app`; canonical `https://lockdinapp.vercel.app` | `a68f926db9ba15347d2f6e7185ec41ae9cb376b2` | success; canonical health 200 |

**CURRENT PRODUCTION EVIDENCE (Web bundle metadata, no secrets):**

- `VITE_VERCEL_ENV=production`
- `VITE_VERCEL_GIT_COMMIT_REF=main`
- `VITE_VERCEL_GIT_COMMIT_SHA=a68f926db9ba15347d2f6e7185ec41ae9cb376b2`
- `VITE_VERCEL_DEPLOYMENT_ID=dpl_BNggNfSijLCHNDfERJ2psdu9jUht`

HEAD is documentation-only vs Product SHA `1b57d9f`, so Production on `a68f926` is **Product-equivalent** to `1b57d9f`. Automatic docs-only deploys explain serving the report freeze SHA rather than the Product SHA. No unexpected drift. No redeploy.

The API unique hostname returned HTTP 302 on `/api/healthz` in this session; the **canonical** API alias returned HTTP 200. Unique-URL 302 is recorded as a review note, not as API unreadiness.

---

## 5. Local tests / typecheck / build

**CURRENT REPOSITORY EVIDENCE**

Established scripts (not invented):

| Gate | Exact command | Result |
| --- | --- | --- |
| Frontend tests | `pnpm --filter @workspace/revision-platform test` | **PASS** 334/334 tests, 50 files |
| API unit tests | `pnpm --filter @workspace/api-server test` | **PASS** 192/192 tests, 37 files |
| Scripts unit | `pnpm --filter @workspace/scripts test:unit` | **PASS** 44/44, 7 files |
| Harness/safety | `pnpm --filter @workspace/scripts test:harness` | **PASS** 44 passed, 1 skipped, 5 files |
| Migration integrity (repo) | `pnpm run check:migrations` | **PASS** count=21 head=`0020_subject_visibility_grants` |
| Typecheck | `pnpm run typecheck` | **PASS** |
| Frontend build | `PORT=3000 BASE_PATH=/ pnpm --filter @workspace/revision-platform run build` | **PASS** (PORT/BASE_PATH required by `vite.config.ts`; root `pnpm run build` was not required beyond this established pattern) |
| API build | `pnpm --filter @workspace/api-server run build` | **PASS** |
| Lint | no workspace `lint` script | **NOT A RELEASE GATE** |
| `git diff --check` | after tests/builds, before Report 165 | **PASS** |

No flaky-test claim. Disposable `db-harness` / `test:integration` were **not** run (destructive local DB; not required for this read-only gate).

---

## 6. CI evidence

**CURRENT REPOSITORY EVIDENCE**

`.github/workflows/pr-quality.yml` runs on `pull_request` and on push to `phase6-slice4-release-operational-hardening` only — **not on `main`**.

| Check | SHA | Result |
| --- | --- | --- |
| GitHub Actions on HEAD | `a68f926` | **NOT RUN** (docs-only; workflow does not run on `main`) |
| GitHub commit statuses HEAD | `a68f926` | **success** (`Vercel – lockdinapp`, `Vercel – lockdinapp-web`) |
| Check-runs | HEAD and `1b57d9f` | total 0 (Vercel uses commit statuses, not Checks API) |
| Product SHA Vercel statuses | `1b57d9f` | **success** both projects |

Boundary: documentation-only HEAD did not execute the PR quality workflow. Release CI evidence for product is Vercel Production deploy success on `main` plus local re-run of the same command families.

No workflow was triggered by this slice.

---

## 7. Runtime health baseline

**CURRENT PRODUCTION EVIDENCE** (2026-09-10 ~17:29 UTC)

| Endpoint | HTTP | Body |
| --- | --- | --- |
| Web `https://lockdinapp-web.vercel.app/api/healthz` | 200 | `{"status":"ok"}` |
| Web `/api/healthz/db` | 200 | `{"status":"ok","database":"ok"}` |
| API `https://lockdinapp.vercel.app/api/healthz` | 200 | `{"status":"ok"}` |
| API `/api/healthz/db` | 200 | `{"status":"ok","database":"ok"}` |

All **PASS**.

---

## 8. Production migration state

**CURRENT PRODUCTION EVIDENCE**

Canonical linked Supabase project `hazvcdrcvsxmuwdfiucx` was available. Read-only `supabase db query --linked` (SELECT-only). `current_setting('transaction_read_only')` was `off` on the Management API session (SET/BEGIN READ ONLY is not applied as a durable session by that path). **No DML/DDL.**

| Check | Result |
| --- | --- |
| `drizzle.__drizzle_migrations` count | **21** |
| Head `created_at` | `1788100000000` (matches committed journal `0020_subject_visibility_grants`) |
| Direct verification | **PASS** for count/head timestamp and 0020 schema objects |
| Head stored `hash` | `d2f7d65e25b1f2a6b14cec508558d7c22fc7a85b6db3ac575f52a9152c5da7a6` |

That hash is the SHA-256 of committed **`0019_route_option_group_applicability.sql`**, not `0020` (`870e54b44d…`). The 0019 and 0020 journal rows share the same stored hash. Schema nevertheless includes `0020` objects (`subject_visibility_grants`, `lockdin_can_select_subject`). **Do not restamp.** See §28 MEDIUM.

---

## 9. Database / catalogue counts

**FROZEN HISTORICAL EVIDENCE (Report 164 final)** vs **CURRENT PRODUCTION EVIDENCE** (this query):

| Invariant | Expected (164) | Current | Status |
| --- | ---: | ---: | --- |
| Subjects | 16 | 16 | PASS |
| Globally selectable | 16 | 16 | PASS |
| Current-nine | 9/9 | 9 | PASS |
| New-seven | 7/7 | 7 | PASS |
| Syllabus versions | 29 | 29 | PASS |
| Published / retired | 21 / 8 | 21 / 8 | PASS |
| Route sets | 29 | 29 | PASS |
| Routes | 95 | 95 | PASS |
| Route components | 333 | 333 | PASS |
| Option groups | 13 | 13 | PASS |
| Options | 45 | 45 | PASS |
| Option-unit mappings | 72 | 72 | PASS |
| Year mappings | 54 | 54 | PASS |
| Visibility grants | 0 | 0 | PASS |
| Feb/Mar `product_auto_assign` | 0 | 0 | PASS |
| Memberships | 15 | 15 | PASS |
| Route assignments | 2 | 2 | PASS |
| Option selections | 3 | 3 | PASS |
| Tasks | 16 | 16 | PASS |
| Attempts | 10 | 10 | PASS |

This session’s membership/option MD5 (`f985e212…` / `f058bb1c…`) used a local concatenation formula and **must not** be compared to Report 164’s hashes (`8941b44a…` / `71c029e1…`) as proof of change. Counts and subject-code pin inventory match the frozen historical membership set (see §11).

Anon Data API counts were **not** used: unauthenticated REST returned `*/0` or 401/400 under RLS.

---

## 10. Relational / orphan integrity

**CURRENT PRODUCTION EVIDENCE** — orphan counts all **0** for:

versions→subjects; units→versions; topics→units; outcomes→topics; components→versions; route sets→versions; routes→sets; route components→routes; route components→components; option groups→sets; options→groups; option-unit mappings→options/units; year mappings→options; `user_subjects`→subjects/versions; non-null routes→routes; option selections→memberships/options; grants→subjects.

Broken route/version references: **0**
Broken option references: **0**

---

## 11. Existing membership immutability

**FROZEN HISTORICAL EVIDENCE (164):** 15 / 2 / 3 / 16 / 10; QA held History, Economics, Mathematics; hashes captured with 164’s formula.

**CURRENT PRODUCTION EVIDENCE**

Memberships by subject code: `9489:1`, `9708:1`, `9709:3`, `9700:2`, `9701:4`, `9702:4` (total 15). New-seven codes: **0** memberships.

All 15 pins remain on **retired** `*-r001` revisions (allowed historically; Report 133: Chemistry four memberships on `9701-r001`). Route-assigned: History + Economics (2). No new-seven residue.

| Check | Result |
| --- | --- |
| Existing memberships changed due to catalogue activation | **0** (counts + code inventory unchanged vs 164) |
| Automatic syllabus-version repins | **0** (still on retired r001 pins) |
| Assessment-route drift | **0** (still 2 assigned) |
| Study-option drift | **0** (still 3) |
| Retired versions on historical memberships | **Allowed / present (15)** |

New membership selection still resolves via published versions (predicate proof §14). No memberships created/recreated.

---

## 12. All-16 structural validation

**CURRENT PRODUCTION EVIDENCE** — each code exactly one subject row, `selectable_for_new_memberships=true`, ≥1 published version, published route set/routes/components, May/June and/or Oct/Nov `product_auto_assign` rows, Feb/Mar enabled **0**.

| Code | Published versions | Published routes | Result |
| --- | ---: | ---: | --- |
| 9231 | 1 | 5 | **PASS** |
| 9489 | 1 | 3 | **PASS** |
| 9609 | 1 | 3 | **PASS** |
| 9618 | 1 | 3 | **PASS** |
| 9700 | 1 | 3 | **PASS** |
| 9701 | 2 | 6 | **PASS** |
| 9702 | 1 | 3 | **PASS** |
| 9708 | 1 | 3 | **PASS** |
| 9709 | 1 | 8 | **PASS** |
| 8021 | 2 | 2 | **PASS** |
| 9093 | 1 | 3 | **PASS** |
| 9626 | 2 | 6 | **PASS** |
| 9696 | 2 | 6 | **PASS** |
| 9699 | 1 | 3 | **PASS** |
| 9706 | 1 | 3 | **PASS** |
| 9990 | 2 | 6 | **PASS** |

No membership was created.

---

## 13. Special-subject invariants

**CURRENT PRODUCTION EVIDENCE**

**History 9489** (`logical_revision_key=9489-r002`, published):

- Routes: `as_single_series`, `a_full_same_series`, `a_staged_completion` (P1–P4 year-mapping architecture, not paper-named route keys)
- Year mappings: **27**
- AS content rows with `component_id` null: **448** (`level='AS Level'`). Not classified as broken mappings.

**Geography 9696:** two published revisions, each with A-level groups `paper_3_advanced_physical` and `paper_4_advanced_human`, min=2 max=2, 4 options each (4 groups total). Consistent with Report 164.

**Psychology 9990:** `specialist_options` min=2 max=2, `a_level`, one group per published revision (2-of-4).

**Sociology 9699:** `paper_4_globalisation_media_religion` min=2 max=3, `a_level`.

**Chemistry 9701:**

- `9701-r001` retired (historical memberships remain)
- `9701-r002` published May/June 2025–Oct/Nov 2027
- `9701-r003` published May/June 2028–Oct/Nov 2030

**Further Mathematics 9231:** `9231-r001` published; 1 route set, 5 routes, 16 route-component links.

No mutation.

---

## 14. Subject selection / visibility policy

**CURRENT PRODUCTION EVIDENCE**

`lockdin_can_select_subject('00000000-0000-0000-0000-000000000000', subject_id)` is TRUE for **16/16** subjects (no grants). Visibility grants: **0**. Grant table/indexes still present. Ordinary controlled-beta access does not require a grant.

---

## 15. Auth configuration

**CURRENT PRODUCTION EVIDENCE** (public `GET /auth/v1/settings` with publishable apikey; values are booleans only):

| Setting | Live |
| --- | --- |
| Email (`external.email`) | ENABLED |
| Email confirmation (`mailer_autoconfirm=false`) | ENABLED |
| Public signup (`disable_signup`) | DISABLED |
| Anonymous | DISABLED |
| Google | DISABLED |
| Other OAuth listed on the endpoint | DISABLED |
| CAPTCHA | not present on this public payload (deferred/off) |

**FROZEN REPOSITORY/OWNER EVIDENCE (Reports 117/163):** Site URL `https://lockdinapp-web.vercel.app`; allowed redirects only `/auth/callback` and `/update-password`; password minimum **8**. The public settings JSON does **not** currently expose `site_url`, `uri_allow_list`, or `minimum_password_length`. No Auth mutation. No evidence those hosted values changed; they are not re-printed from Dashboard here.

**CURRENT REPOSITORY/PRODUCTION EVIDENCE:** Web bundle `VITE_GOOGLE_AUTH_ENABLED=false`.

Auth drift vs last closed proofs: **NONE observed** on the live public flags.

---

## 16. Password recovery continuity

**CURRENT REPOSITORY EVIDENCE:** Product files unchanged since Report 163 (`1b57d9f` is the Product SHA; 163 was docs-only after it). Routes still exist in `App.tsx`. Production `/forgot-password` and `/update-password` return HTTP 200. Bundle contains both paths. Canonical `/update-password` redirect remains the recovery destination per frozen 163; this slice did **not** reset a password.

Product-code delta since Report 163 affecting recovery: **NONE**.
**R158-RP-004:** remains **CLOSED / PASS**.

---

## 17. Support / privacy continuity

**CURRENT PRODUCTION EVIDENCE**

- Web bundle: `VITE_SUPPORT_FORM_URL=https://forms.gle/rJwXYBhS8Qm46XVf7` **PRESENT**
- Settings chunk contains that URL
- `/privacy` chunk: one PostHog Cloud EU project + environment separation; no autocapture / Session Replay / heatmaps / advertising; Sentry described as reliability monitoring; **unproven** absent; **separate Preview** wording absent
- Help & Support is an authenticated Settings tab in product code (`help-support-card`); unauthenticated `/settings?tab=help` still HTTP 200 (SPA shell)

Google Form was **not** resubmitted.

**OWNER OPERATIONAL EVIDENCE** (unchanged from `docs/beta/operational-responsibilities.md` / Report 162): notifications enabled; Form monitoring owner = Project owner; cadence daily.

---

## 18. Observability configuration

**CURRENT PRODUCTION EVIDENCE (presence only; no secret values):**

| Item | Result |
| --- | --- |
| Sentry Web | **YES** — `VITE_SENTRY_DSN` present (len 95), `VITE_SENTRY_ENVIRONMENT=production` |
| Sentry API | **NOT DIRECTLY INSPECTED** this workstation (Vercel env list unavailable). Code still initializes from `SENTRY_DSN` when set. Frozen Production deployments remain READY with health green. |
| Session Replay | **OFF** in frontend `PRIVACY_INIT_FLAGS` (`replaysSessionSampleRate=0`); replay integrations filtered out |
| PostHog | Server-only (`POSTHOG_PROJECT_TOKEN` / `POSTHOG_HOST`); no browser SDK in privacy copy/bundle; `enableExceptionAutocapture: false` in API client |
| Environment separation | Preserved in privacy copy |
| Autocapture / replay / heatmaps / ads | OFF / none per privacy copy + code flags |

---

## 19. Production environment audit

**CURRENT PRODUCTION EVIDENCE**

Web Production (from built `import.meta.env`, names/presence only):

- Present as intended: `VITE_SUPPORT_FORM_URL` (Web only), `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, `VITE_GOOGLE_AUTH_ENABLED=false`, Vercel release/env metadata
- `VITE_SENTRY_RELEASE` not inlined (release falls back to Git SHA helper)
- No localhost URL in `VITE_SUPABASE_URL`

API Production variable **names** were not listed (CLI token invalid). Canonical API `/api/healthz/db` = ok implies runtime DB config is effective. `VITE_SUPPORT_FORM_URL` is not required on API.

Exported-localhost DATABASE_URL limitation from Report 162 is **not** treated as live runtime drift.

Unexpected configuration drift: **NONE proved**. API env-name audit: **PARTIAL**.

---

## 20. Series / Feb-Mar policy

**CURRENT PRODUCTION EVIDENCE:** Feb/Mar globally enabled **0**. Every one of the sixteen subjects has `feb_mar_on=0`. May/June and Oct/Nov `product_auto_assign` rows exist for published versions (2 or 4 or 6 depending on version count). Chemistry dual windows intact (§13).

---

## 21. Participant-surface smoke

**CURRENT PRODUCTION EVIDENCE**

This is **not** RC QA. No password was requested. No browser MCP / owner login was available on this workstation.

Unauthenticated canonical GETs (SPA `index.html`) all HTTP **200**, no 5xx:

`/`, `/login`, `/forgot-password`, `/update-password`, `/privacy`, `/dashboard`, `/progress`, `/study-plan`, `/past-papers`, `/calendar`, `/settings`, `/settings?tab=help`, `/settings?tab=subjects`.

That proves route hosting, not authenticated data. Dedicated QA session was **not** opened. No tasks, papers, subjects, or profile were mutated.

| Surface | This session |
| --- | --- |
| Dashboard / Subjects / Study Plan / Past Papers / Calendar / Settings / Help | Hosted 200; **authenticated behaviour not re-executed** (see REVIEW NOTE). Report 164 already proved authenticated Settings catalogue 16/16 on 2026-09-09. |

---

## 22. Mobile smoke

**Not executed** (no 390×844 authenticated viewport this session). Last frozen mobile proof: Report 164 §17 PASS. Carried as REVIEW NOTE for RC QA, not a catalogue failure.

---

## 23. Runtime / log evidence

**Bounded window:** 2026-09-10 17:28–17:40 UTC (this integrity check).

Vercel log query: **UNAVAILABLE** (CLI token invalid). No unlimited-history claim.

Observed in-window: four health endpoints 200 both pre and post; unauthenticated page GETs 200; no 5xx on those requests. Browser console: **not captured** (no authenticated browser).

---

## 24. Post-check health

**CURRENT PRODUCTION EVIDENCE** (after SQL + tests + route GETs):

| Endpoint | Result |
| --- | --- |
| Web health | 200 `status=ok` |
| Web DB | 200 `database=ok` |
| API health | 200 `status=ok` |
| API DB | 200 `database=ok` |

All **PASS**.

---

## 25. Zero-mutation proof

| Class | This slice |
| --- | --- |
| Subject visibility changes | **0** |
| Memberships created/changed | **0** |
| Tasks created/changed | **0** |
| Attempts created | **0** |
| Visibility grants | **0** |
| Auth mutations | **0** |
| Production environment changes | **0** |
| Deployments initiated | **0** |
| Persistent Product/database changes | **NONE** |

Git fast-forward only. SQL: SELECT aggregates. Local Vite `dist/` is gitignored / not committed.

---

## 26. Operational readiness

**OWNER OPERATIONAL EVIDENCE** (`docs/beta/operational-responsibilities.md`):

| Function | Status |
| --- | --- |
| Support-form intake | Project owner / DAILY |
| Privacy/deletion **intake** | Project owner / DAILY Form |
| Beta coordinator | OWNER ASSIGNMENT REQUIRED |
| Issue triage beyond Form | OWNER ASSIGNMENT REQUIRED |
| Privacy/deletion **fulfilment** | OWNER ASSIGNMENT REQUIRED |
| Sentry monitoring/review owner + cadence | OWNER ASSIGNMENT REQUIRED |
| Escalation path | OWNER ASSIGNMENT REQUIRED |

**PB-OPS-01:** **PARTIAL**

These are **REQUIRED BEFORE REAL BETA INVITATIONS**, not Pre-RC / internal RC QA blockers, per frozen release sequence (Reports 159/164).

---

## 27. Compliance / invitation boundary

| Item | Status |
| --- | --- |
| DPC approval | **NO** |
| Compliance/age/guardian | **UNRESOLVED** |
| Invitation authorization | **NOT AUTHORIZED** |
| Real beta invitations | **NONE** |

Technical RC readiness does not supersede these.

---

## 28. Issue classification

| Severity | Finding |
| --- | --- |
| **Blocker** | **NONE** |
| **HIGH** | **NONE** |
| **MEDIUM** | Production `drizzle.__drizzle_migrations` head row timestamp matches `0020`, but stored hash duplicates committed `0019` SHA-256. `0020` objects exist. Do not restamp in this slice. Carry into RC/ops hygiene. |
| **LOW** | GitHub Actions PR-quality workflow does not run on `main`; local suites + Vercel statuses used instead. |
| **REVIEW NOTE** | Authenticated participant + mobile smoke not repeated this session (no owner login / no browser automation). Unauthenticated SPA 200 only. |
| **REVIEW NOTE** | Vercel CLI/logs/env-name listing unavailable (invalid token). Web dpl + SHA taken from live bundle + GitHub. API unique URL `/api/healthz` 302; canonical alias 200. |
| **REVIEW NOTE** | Public Auth settings omit Site URL / redirect list / password minimum; frozen 117/163 values not Dashboard-reverified. |
| **REVIEW NOTE** | Membership MD5 formula this session ≠ Report 164 formula; counts/inventory used instead. |

Integrity PASS criteria: no Blocker/HIGH; catalogue 16/16; membership counts immutable vs 164; Auth flags preserved; recovery/support proofs remain valid; health green; tests/typecheck/build acceptable; Production/repository relationship understood.

---

## 29. RC candidate nomination

| Item | Value |
| --- | --- |
| **REPOSITORY_RC_SHA** | `a68f926db9ba15347d2f6e7185ec41ae9cb376b2` |
| **PRODUCT_TREE_SHA** | `1b57d9fbb6aa25e61598b4f49f495848e20ed758` |
| Product-tree relation | HEAD docs-only; Product-equivalent |
| Production Web | `dpl_BNggNfSijLCHNDfERJ2psdu9jUht` @ `a68f926` READY |
| Production API | GitHub `6360479463` / canonical `lockdinapp.vercel.app` @ `a68f926` READY |
| RC candidate nominated | **YES** |

No commit was created to manufacture an SHA.

---

## 30. Exact next action

**Report 165 documentation freeze:** this file only.

Then: **FULL RISK-BASED RC QA** against `a68f926` (Product-equivalent to `1b57d9f`).

Do **not**: invite real beta participants; enable Google OAuth; enable Feb/Mar; add subjects; make unrelated product changes; treat this as feature freeze complete, controlled-beta authorized, or public-release ready.

---

## 31. Documentation freeze

| Item | Value |
| --- | --- |
| Frozen | **YES** |
| Staged path | `docs/cursor/reports/165-phase7-pre-rc-integrity-revalidation.md` only |
| Product / tests / migrations / Auth / Vercel | **UNCHANGED** |
| REPOSITORY_RC_SHA | `a68f926db9ba15347d2f6e7185ec41ae9cb376b2` (unchanged) |
| PRODUCT_TREE_SHA | `1b57d9fbb6aa25e61598b4f49f495848e20ed758` (unchanged) |
| REPORT_165_FREEZE_SHA | the `docs: freeze pre-rc integrity revalidation` commit on `main` after this file lands |

No new Product SHA. No manufactured RC candidate.

---

## Release-gate update (frozen PASS)

- PRE-RC INTEGRITY REVALIDATION: **CLOSED / PASS**
- Controlled-beta catalogue: **16/16 ACTIVE**
- Password recovery: **CLOSED / PASS**
- Support/privacy: **CLOSED / PASS**
- PB-OPS-01: **PARTIAL**
- Exact RC candidate: **NOMINATED** (`a68f926`)
- Next technical gate: **FULL RISK-BASED RC QA**
