# Phase 6 Slice 3C2B2 — Preview and Cutover Clearance

- **Date:** 2026-08-30
- **Feature branch:** `phase6-slice3c2b2-strict-assignment`
- **Implementation HEAD:** `b87b14f26c5a330894e9fc81c3d7f2ce8703b1e8`
- **Base `origin/main`:** `08c777f08d330bd2adec6451332e52f59e687e16`
- **Hosted mutation:** none
- **Hosted 0015 / merge:** not performed

## Feature baseline

Tracked 0015 is `0015_silent_sentinel` (function-body cutover of `lockdin_complete_onboarding_apply` and `lockdin_replace_user_subjects_apply`). Resolver/policy/applicability data are unchanged. Production remains `0014_perpetual_nighthawk`, applicability 9/9, policy 27, strict assignment OFF.

Current Production app (`origin/main`) already sends optional structured session when a known picker label matches. Assignment RPCs on 0014 still pin **DEFAULT / `is_current`**.

## 0015 behavioral effect

Traced from deployed `origin/main` request construction, not inferred.

**Onboarding (Production UI)**

- Body always includes `fullName`, `username`, `level`, `examSession`, `subjectIds`.
- `intendedExamSession` is `structuredSessionFromPickerLabel(examSession)` (May/June or Oct/Nov label → `{ year, series }`; `"Other"` → omitted).
- API: if structured input present → `lockdin_complete_onboarding` with `p_intended_exam_year/series` (+ empty overrides). Else 5-arg signature only.

If 0015 were applied **now** with this app still live:

- Known May/June or Oct/Nov onboarding would **succeed** but pin via the resolver, not DEFAULT.
- `"Other"` onboarding would **fail closed** (`intended_exam_session_required`). Today it succeeds with a DEFAULT pin and NULL session.
- First current picker option on 2026-08-30 is **Oct/Nov 2026**. History `9489-r001` applicability starts **2027 May/June**. History + that option would fail `no_applicable_syllabus_version`. The **old** API maps that `P0001` to **500 Internal server error** (it only special-cases `22023` / `invalid_*`).

**Settings (Production UI)**

- `PUT` body: `subjectIds` plus `intendedExamSession` when the profile picker label is a known sitting; omitted for `"Other"` / unmatched text.
- API: structured → `lockdin_replace_user_subjects` with session args; else 1-arg `p_subject_ids` only.

After 0015:

- Retained-only / removal-only without structured session: **unchanged success**.
- New-add with known sitting: **strict resolve**.
- New-add with `"Other"`: **fail closed**. Today it succeeds with DEFAULT.

**Profile PATCH:** still `fullName` / `level` / `examSession` only. No membership RPC. Unchanged.

**Existing membership GET / syllabus / components:** still exact `user_subjects.syllabus_version_id`. Unchanged.

**Public catalogue:** C1 DEFAULT. 0015 does not change those selectors.

## Old-app + 0015 compatibility

| Current Production action | Request contains structured session? | 0015 result |
| --- | --- | --- |
| Onboarding known May/June or Oct/Nov (in-window subject) | Yes | PASS WITH STRICT RESOLUTION (pin may differ from DEFAULT; for most r001 windows it is the same r001) |
| Onboarding History + Oct/Nov 2026 (current first picker option) | Yes | BREAKING FOR CURRENT UI (fail closed; old API 500) |
| Onboarding `"Other"` | No | BREAKING FOR CURRENT UI (today succeeds; 0015 fail closed; old API 400 `Invalid request`) |
| Settings retained-only, any picker | Optional | PASS UNCHANGED (pin + stored session preserved) |
| Settings removal-only, any picker | Optional | PASS UNCHANGED |
| Settings add + known sitting (in-window) | Yes | PASS WITH STRICT RESOLUTION |
| Settings add + `"Other"` / no structured session | No | BREAKING FOR CURRENT UI (today DEFAULT add; 0015 fail closed) |
| Profile update | N/A | PASS UNCHANGED |
| Existing membership reads | N/A | PASS UNCHANGED |
| Public catalogue | N/A | PASS UNCHANGED |

**Conclusion:** 0015 **must not** be applied before the feature app is deployed. Ordinary supported flows (`Other` create; History + current Oct/Nov 2026 picker) break, and one path 500s.

## Feature-app + 0014 compatibility

Feature frontend/API **functions** against hosted 0014.

- Known sittings still send `{ year, series }`. 0014 RPCs **ignore them for pin selection** and still write DEFAULT.
- `"Other"` create is blocked in the UI (onboarding step/finish; Settings new-add toast). That is stricter UX than 0014 requires, and is safe.
- UI does not show a version picker or claim a resolved edition before save.

A Vercel Preview pointed at current hosted 0014 can test:

| Layer | Testable? |
| --- | --- |
| UI validation | YES |
| Safe API error mapping | YES (unit + code; live resolver errors need 0015) |
| Actual strict assignment | NO |

Do not treat Preview writes against 0014 as C2B2 assignment proof.

## Preview deployment

Git integration created Previews for implementation SHA `b87b14f26c5a330894e9fc81c3d7f2ce8703b1e8` without changing Production env.

| Project | GitHub deployment | Vercel inspect | Immutable URL | State |
| --- | --- | --- | --- | --- |
| lockdinapp-web | 6161815868 | `im8H9Q5b8ohovhyZydcP9jZnqxBN` | https://lockdinapp-dlv20fsyk-actif-devs.vercel.app | READY |
| lockdinapp (sibling) | 6161817301 | `iPQF7y5ptifyfq7tUfWBPEVTtnEG` | https://lockdinapp-1lmu5nta1-actif-devs.vercel.app | READY |

Source SHA confirmed. Preview uses the same hosted DB as Production (0014). **No authenticated membership writes** were performed.

## Preview QA

Non-destructive: public routes + downloaded Preview chunks `onboarding-DwMBBjjG.js`, `exam-sessions-Bnl1IF0b.js`, `settings-CIJ-FNox.js`.

| Check | Result | Evidence |
| --- | --- | --- |
| Structured May/June / Oct/Nov payload | PASS | exam-sessions chunk emits those labels only; onboarding/settings include `intendedExamSession` |
| `"Other"` create blocked | PASS | onboarding: “Other cannot create subjects”; Settings: “Adding a subject needs May/June…” |
| Retained-only Settings | PASS | new-add guard is `addsSubjects && !intendedExamSession`; retain/remove omit session |
| Removal-only Settings | PASS | same guard; 0014/0015 1-arg retain/remove succeeds |
| New-add session requirement | PASS | Settings toast + omit unstructured payload |
| No version selector | PASS | no `syllabusVersionId` / Feb/Mar picker in chunks |
| Safe errors | PASS | API allowlists product strings; UI does not render SQL/function names. Onboarding still wraps unknown failures as “Onboarding could not be completed.” Settings generic toast. Live 0015 error paths were not exercised on hosted. |

`/onboarding` on Preview redirects to login. Authenticated click-through was skipped to avoid Production writes.

## Strict integration evidence

**Layer A (disposable `lockdin-db-harness` through 0015):** PASS (Report 105). DEFAULT A / resolver B → B; retain; new-add; missing session; Feb/Mar; outside range; atomicity; public DEFAULT; pin reads; publish does not repin.

**Layer B:** Preview UI/API validation above. PASS for static/bundle QA.

**Layer C:** Preview strict assignment **NOT TESTABLE** (DB still 0014). No isolated Preview DB exists in-repo. Options B/C (dedicated remote Preview DB) were **not invented**. Option D (Production 0015) is unauthorized.

Safest isolated method remains **A**: local disposable stack + feature app.

## Authenticated Production QA plan

Do **not** run until owner authorizes hosted 0015 and merge/deploy of the feature app.

Smallest reversible proof on a **controlled** account (existing user, no second graph):

1. Record current `GET /user-subjects` (ids, pins, intended sessions).
2. Settings: add **one** catalogue subject not already held, with a **supported in-window** structured sitting (avoid History + Oct/Nov 2026; prefer May/June 2027+ for 9489, or any in-window science sitting).
3. Assert the new row stores that `{ year, series }` and `syllabus_version_id` equals hosted `lockdin_resolve_applicable_syllabus_version` for that subject/session (operator/read-only SQL).
4. Settings save **retain-only** (same subject set, any/no session).
5. Assert pin and intended session unchanged.
6. Settings remove the temporary subject (restore the recorded set).
7. Re-read: original memberships identical (pin fingerprint unchanged).

No import/publish/repin. No 0016.

## Cutover matrix

| State | Assignment | Ordinary UI | Risk |
| --- | --- | --- | --- |
| OLD APP + 0014 (today) | DEFAULT | All current flows work | Baseline |
| FEATURE APP + 0014 | DEFAULT | `"Other"` create blocked locally; known sittings still succeed | Low |
| OLD APP + 0015 | STRICT | `"Other"` create breaks; History + Oct/Nov 2026 500s | High |
| FEATURE APP + 0015 | STRICT | Intended end state; in-window known sittings work; out-of-window fail with safe 400 | Target |

**OPTION A** (0015 → old-app verify → merge): **rejected**. Old-app + 0015 is breaking.

**OPTION B** (merge/deploy feature → apply 0015): **recommended**. Feature+0014 stays compatible. Then 0015 enables strict assignment while error mapping and `"Other"` guards are already live.

**OPTION C** (coordinated window): acceptable if owner wants History Oct/Nov 2026 DEFAULT→reject to change in one moment. Still deploy **feature first or simultaneously**, never 0015-only.

## Recommended deployment order

1. Owner review + merge feature to `main` (Production deploy). Hosted DB stays 0014.
2. Smoke: login, Settings retain-only, public catalogue. Do not require 0015.
3. Owner-authorized hosted `pnpm --filter @workspace/db migrate` to 0015 only (tracked Drizzle; no Dashboard SQL).
4. Controlled authenticated QA (section above).
5. If History Oct/Nov 2026 is a live picker concern, treat fail-closed as **intentional** (2026 History is not in 9489-r001). Feature UI/API will show a safe 400, not 500.

Transition risk after this order: **MEDIUM** (product pin selector changes; History 2026 sitting becomes reject) but **not** an unexpected old-app break.

## Rollback model

Repository policy: no destructive down-migration of 0015.

- **Feature deploy fails while still on 0014:** redeploy previous Production app. Safe. Assignment unchanged.
- **0015 applied, feature app live, assignment too strict:** keep the feature app (safe errors / `"Other"` guard). Recovery is a later **forward** tracked RPC change if owner authorizes — not a down-migration.
- **Roll application back to old main while 0015 remains hosted:** **not safe**. Restores BREAKING old-app + 0015 (Other create, History 2026 500).
- **0015 cannot be “turned off”** without a new migration. Do not apply 0015 until the feature app is Production.

## Production state

Unchanged by this clearance:

- Head `0014_perpetual_nighthawk`
- Applicability 9/9
- Policy 27
- Identities r001 9/9
- Pins / graphs / DEFAULT / lifecycle untouched
- Strict assignment OFF
- No 0016

## Automated regression (Report 105; not re-run)

API 139/139. Frontend 213/213. Syllabus 39/39. Harness 20/20. Disposable through 0015 PASS. Typecheck PASS.

## Owner gates

- HOSTED 0015: **not** authorized by this report.
- MERGE: ready for owner authorization **after** accepting OPTION B (feature first).
- PRODUCTION CUTOVER (0015): ready for owner authorization **only after** feature is Production.

## Final verdict

C2B2 feature implementation remains PASS. Preview READY for UI/0014 QA. Strict Preview assignment is NOT TESTABLE. Applying 0015 before the feature app is **not ready**. Merge is ready for owner review. Production cutover is **not** ready until that deploy lands.
