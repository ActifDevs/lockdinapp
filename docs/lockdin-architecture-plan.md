# Lockdin: Architecture Plan — Prototype to Production

**Author's framing:** senior eng review of `ActifDevs/lockdinapp` against the deep-research product report. Written 28 Jul 2026, against commit `009634d` on `main`.

---

## 0. Correcting the record before planning

Two documents already live in the repo and disagree with each other, and both are slightly wrong about *today*:

- `docs/README.md` / the `2026-07-27_1835` checkpoint says the CSV import pipeline is **NOT IMPLEMENTED** and past-paper storage is a flat string like `"9702/42"`.
- Reality at HEAD (`009634d`) is further along than that checkpoint claims: a real import pipeline exists (`scripts/src/syllabus/{parse-csv,normalize,db-upsert,cli}.ts`, with tests), a migration file exists (`lib/db/migrations/0000_syllabus_reference_and_paper_attempts.sql`), and `past_paper_attempts` is already atomized into subject + `assessment_components` + variant + session rather than a raw string. The checkpoint was generated against an earlier commit (`14b2c75`) but filed under a timestamp *after* three more commits landed, including "csv imports done."
- `docs/scholr-database-architecture-audit.md` is more current and more useful — it's a read-only audit that already designs the target Supabase/RLS schema (`profiles`, `user_subjects`, `topic_progress`, RLS policy matrix, etc.). Nothing in it has been executed yet, but it's the right target model and I'm adopting most of it below rather than re-deriving it.

Practical implication: **don't trust the checkpoint's feature table blindly.** I verified current state by reading the schema files, migrations, and scripts directly rather than the prose. This plan is grounded in that direct read. First action item at the end is to regenerate the checkpoint so this drift doesn't happen again.

---

## 1. Where "current" and "target" actually sit

**Target (from the deep-research report):** the report converges on one product — a gamified A-Level revision planner (syllabus tracking + task deadlines + past-paper analytics + light gamification), explicitly *not* a standalone focus-blocker, with peer/community and AI as later layers, and a hard instruction to validate with real users before over-building (Part 19).

**Current (from the repo):** the team didn't stop at a landing page — they built the actual product. Frontend has all the report's MVP screens (dashboard, subjects, syllabus detail, tasks, past papers, calendar, progress, settings, onboarding) plus gamification UI (XP/streaks). Backend has a matching Express+Drizzle API. Reference data (9 Cambridge subjects, ~3,700 syllabus rows) is captured, validated, and has a working import pipeline into a schema that already models shared reference data (`subjects`, `syllabus_versions`, `assessment_components`, `syllabus_topics`, `syllabus_learning_outcomes`) versus user-facing data (`tasks`, `past_paper_attempts`, `exam_dates`).

So the gap isn't "build the app" — it's **"turn a well-shaped single-player prototype into a real multi-tenant product,"** plus reconcile a couple of go-to-market questions the report raised that the team appears to have skipped (Part 18: user interviews, landing-page demand test). I'll flag that as a parallel-track risk, not a blocker to the technical plan.

### The actual gap, concretely

| Layer | Current | Target |
|---|---|---|
| Auth | `localStorage` fake session, accepts any input, never touches DB | Real auth (Supabase Auth recommended — a project has reportedly already been created) with `auth.users` + `profiles` |
| Multi-tenancy | Zero `user_id` columns anywhere; single implicit global user | Every user-owned table scoped by `user_id`, enforced by Postgres RLS, not just app-layer checks |
| Database | Schema + migration exist locally; **no verified deployed connection** | Deployed Postgres (Supabase), migrations run, RLS on |
| Reference data | CSVs validated, import pipeline exists in code, **not yet executed against a real DB** | 9 subjects / ~3,700 topics live in `subjects` / `syllabus_versions` / `syllabus_units` / `syllabus_topics` |
| API security | No auth middleware; all `/api/*` routes open | JWT/session validated middleware; every user-scoped route reads `user_id` from verified session, never from the request body |
| Past papers | Already atomized (component/variant/session) — ahead of the report's ask | Keep as-is, just add ownership |
| Gamification | Client-only, `localStorage` | Fine to leave client-computed per the audit's own recommendation — don't build `achievements`/`xp` tables prematurely |
| AI assistant | Not built (report correctly called this high-risk/defer) | Stays deferred; no schema debt to pay down here since nothing was built |
| Focus/distraction blocking | Not built (report correctly recommended killing this as a standalone product) | Correctly out of scope; if anything, a lightweight "focus mode" toggle inside StudyPlanner later, per report Part 19 §4 |

---

## 2. Sequencing principle

Everything downstream depends on **one user column existing and being trustworthy**. Auth and multi-tenancy are not "a phase" among equals — they're the load-bearing wall. I'm sequencing so that a single vertical slice (one table, real auth, real RLS, real deployed DB) proves the pattern before it's copy-pasted across six more tables. This avoids the common failure mode of writing six near-identical migrations, discovering the auth integration was wrong, and redoing all six.

Rough shape:

```
Phase 0  Environment truth        (deploy DB, verify connection, regenerate checkpoint)
Phase 1  Reference data live      (run the import pipeline for real, against the real DB)
Phase 2  Real auth, one table     (Supabase Auth + profiles + RLS proven on ONE table)
Phase 3  Multi-tenancy rollout    (apply the proven pattern to tasks/past_papers/exam_dates/progress)
Phase 4  API hardening            (auth middleware everywhere, remove trust-the-client patterns)
Phase 5  Frontend cutover         (kill localStorage auth, wire real sessions, protect routes)
Phase 6  Quality gate             (tests, CI, error handling — currently zero test suite in the app itself)
Phase 7  Ship gate                (the report's own pre-launch checklist: analytics, beta group)
```

---

## 3. Phase 0 — Environment truth (½–1 day)

Before writing any code: confirm the Supabase project that's "reportedly already been created" actually exists and get its connection string into a real `.env`. Nothing else in this plan is safe to start until `DATABASE_URL` points at something real, because right now every "not implemented" claim in the docs is actually "implemented but never run against a database," and that distinction matters — a migration that's never been applied can still be silently wrong.

1. Confirm the Supabase project, grab `DATABASE_URL` (pooled, for the app) and the direct connection string (for migrations).
2. `pnpm --filter @workspace/db push` (or `migrate`, once you've decided which — see Phase 0 gotcha below) against that DB.
3. Run `scripts/src/syllabus/cli.ts --mode=validate` then `--mode=import` for real, and confirm row counts land (~3,700 rows across the 9 subjects).
4. Hit `/healthz` and `/api/subjects` against the deployed API and confirm non-empty responses.
5. Regenerate the checkpoint doc (`docs/checkpoints/`) against this actually-verified state so the next person — human or model — doesn't repeat my step 0 archaeology.

**Gotcha to resolve explicitly:** `lib/db/package.json` has both `push` (drizzle-kit push, schema-diffing, no migration history) and `migrate` (applies the tracked `.sql` files in `lib/db/migrations/`). A migration file already exists (`0000_syllabus_reference_and_paper_attempts.sql`). Once that's true, **stop using `push` for anything except fast local iteration** — `migrate` needs to become the source of truth from Phase 0 onward, or the migration history and live schema will silently diverge the first time someone runs `push` against prod. Decide this now, write it down in `docs/README.md`, and enforce it (a CI check that fails if `drizzle-kit generate` produces an undiffed migration is cheap insurance for Phase 6).

---

## 4. Phase 1 — Reference data becomes real (already-built pipeline, just needs to run)

This phase is mostly done in code; it's an execution + verification gap, not a design gap.

- `scripts/src/syllabus/parse-csv.ts` → `normalize.ts` → `db-upsert.ts` → `cli.ts` is a legitimate three-stage pipeline (parse/validate → normalize into unit/topic/learning-outcome tree → idempotent upsert), and it has unit tests already (`__tests__/parse-csv.test.ts`, `db-upsert.test.ts`, `normalize.test.ts`). Read `manifest.ts` to confirm all 9 subjects are wired in before trusting `cli.ts`'s default run.
- Run `--mode=validate` first (side-effect-free), inspect the row/topic/outcome counts it prints, cross-check against `docs/checkpoints/.../_audit_report.json` expectations (e.g. 9700_biology.csv ≈ 758 rows).
- Then `--mode=import` (add `--dry-run` first if you want a zero-write preview — check whether `db-upsert.ts` actually respects that flag before relying on it; verify, don't assume, since I haven't traced that code path myself).
- **Verify idempotency for real**, not just in the unit tests: run the import twice back-to-back against the same DB and confirm row counts don't double. This is the single most important property of an import script that will get re-run every time Cambridge tweaks a syllabus.
- Once data is live, delete/deprecate the frontend's hardcoded `SUBJECT_CATALOG` fallback path as the *only* source, but don't rip it out yet — keep it as an offline/loading fallback until Phase 5 wires the frontend fully off local state.

**Exit criteria:** `/api/subjects` and `/api/subjects/:id/syllabus` return real DB-backed data for all 9 subjects, hierarchy intact, learning outcomes attached.

---

## 5. Phase 2 — Real auth, proven on one table (the load-bearing phase)

Pick `tasks` as the pilot table — it's simple, fully CRUD, and already has a matching route file, schema, and generated client. Don't touch `past_paper_attempts` or `syllabus_topics` progress yet.

1. **Add Supabase Auth to the frontend.** Replace `use-auth.ts`'s localStorage read/write with `supabase.auth.*` calls. Keep the hook's *interface* the same where possible (`useAuth()` returning `{ user, login, logout, ... }`) so downstream components don't need mass edits yet — swap the implementation, not every call site.
2. **Add `profiles` table**, 1:1 with `auth.users`, per the audit doc's spec (`docs/scholr-database-architecture-audit.md` §"profiles"). This is where app-specific fields (exam session, level) that `use-auth.ts` currently fakes actually live.
3. **Add `user_id uuid references auth.users(id)`** to `tasks` only, `not null`, with `on delete cascade`.
4. **Write the RLS policy for `tasks`**: authenticated users can `select/insert/update/delete` where `user_id = auth.uid()`. Test it with two different logged-in test users against the same DB via `psql`/Supabase SQL editor before trusting the app layer at all — RLS bugs are the kind of thing that silently leak data rather than throwing errors, so verify at the database level directly, not just "the UI looked right."
5. **Add auth middleware to the Express layer** for the `tasks` routes specifically: extract and verify the Supabase JWT from the `Authorization` header, attach `req.userId`, reject unauthenticated requests with 401. Every query in `routes/tasks.ts` must pass `userId` from the verified session — never from the request body or query params, or RLS becomes theater the app layer can bypass.
6. **Update the Orval-generated client usage** so the frontend passes the session's access token as a bearer header on every request (an Axios/fetch interceptor is the natural spot — check what `lib/api-client-react`'s generated mutator function currently does and extend it there rather than per-call).

**Exit criteria:** two different real accounts can log in, and each sees only their own tasks — verified by manual test with two browser profiles, not just code review. This is the pattern every other table in Phase 3 will copy exactly.

---

## 6. Phase 3 — Multi-tenancy rollout (mechanical, once Phase 2 is proven)

Apply the exact `tasks` pattern to the remaining user-owned tables the audit doc already scoped:

- `past_paper_attempts` — add `user_id`, RLS, middleware. No structural changes needed; the atomization work is already done.
- `exam_dates` — same. Note the audit doc flags an open question worth resolving here: are exam dates *shared reference data* (the actual Cambridge exam timetable) or *user-owned* (a student's personal exam entries)? The current schema treats them as user-owned/unscoped; confirm that's actually the product intent before blindly adding `user_id` — if some exam dates should be shared canonical dates (official Cambridge exam-day calendar) while others are personal, that's two different tables, not one with a nullable owner.
- `syllabus_topics.status` / `.notes` — this is the trickiest one, because `syllabus_topics` itself is *shared reference data* (the Cambridge syllabus structure), but `status`/`notes` are *per-user progress on shared data*. Don't add `user_id` to `syllabus_topics` directly — that would fork the shared syllabus tree per user, which is wrong. Instead, split into a new `topic_progress` table (`user_id`, `topic_id`, `status`, `notes`), exactly as the audit doc's Data Domain Map already specifies, and leave `syllabus_topics` itself untouched as pure shared data.
- `user_subjects` (new) — currently subject enrollment is implicit/global; needs its own junction table so "which subjects is this student taking" is per-user, not derived from "every subject exists so show them all."

Each of these is a small, boring migration once the `tasks` pattern is proven — resist the temptation to batch them into one giant migration; land them as separate PRs so a bad RLS policy on one table doesn't block or corrupt the others.

**Exit criteria:** every user-owned table has RLS, and a fresh signup sees an empty dashboard (not another user's data, not a 500).

---

## 7. Phase 4 — API hardening

**Current status (2026-08-24): COMPLETE.** Reports 64–67 preserve the two
implementation slices and their Production verification; Report 68 contains
the final requirement-by-requirement reconciliation. Existing caller-derived
ownership, RLS, generated-Zod validation, structured errors, and Pino logging
were verified; Slice 1 made reviewed auth classification global and
fail-secure, and Slice 2 added server-authoritative request IDs with verified
Production response/log correlation. The local integration rerun remained
Docker-environment-blocked but is not an application blocker. No additional
Phase 4 implementation slice is required. The separately delegated universal
post-phase checkpoint has not been run, and Phase 5 has not started.

- Auth middleware becomes global for all `/api/*` routes except `/healthz` and any explicitly public endpoints (subject catalog / syllabus structure can plausibly stay readable by any authenticated user without per-row ownership, per the audit's "shared reference data" model — decide whether *unauthenticated* reads should be allowed at all, or gated behind "must be logged in but see everything").
- Remove any remaining "trust user_id from the request" code paths from Phase 2/3 migrations that were left in for convenience during testing.
- Add request-level input validation consistently — `lib/api-zod` already has generated schemas from the OpenAPI spec; make sure every route actually validates against them rather than trusting Drizzle to fail loudly.
- Structured error responses + real logging correlation (Pino is already wired; add request IDs if not already present) so Phase 6/7 debugging isn't done blind.

---

## 8. Phase 5 — Frontend cutover

- Fully remove `lockdin_user` / `lockdin_auth` / `onboarded` localStorage reads as sources of truth; they can stay as *cache* for perceived performance if you want optimistic UI on reload, but the session must be re-verified against Supabase on load, not trusted from storage.
- `require-auth.tsx` needs to gate on a real session check, not presence of a localStorage key.
- Onboarding flow (`onboarding.tsx`) currently seeds a starter task per subject against the mock/global model — needs to write against the now-real `user_subjects` + `tasks` tables for the newly created account.
- Settings (`use-notification-prefs.ts`) — audit doc flags this as "worth persisting once real accounts exist." Decide now whether it moves server-side in this phase or stays client-only a bit longer; it's low-risk either way, don't let it block the auth cutover.

---

## 9. Phase 6 — Quality gate

The checkpoint is right that this is currently zero: no test suite at the application level (the syllabus import scripts are the one exception with real tests). Before calling this production-ready:

- Integration tests for the RLS boundary specifically — this is the one class of bug that's invisible until it leaks another student's data, so it deserves dedicated automated coverage, not just manual two-browser testing from Phase 2.
- API route tests for the now-protected endpoints (401 without token, 200 + correct scoping with token).
- CI wiring: run typecheck (already scripted at the root), the existing syllabus pipeline tests, and the new integration tests on every PR.
- Decide and enforce the migration workflow from Phase 0 (`migrate`, not `push`) in CI so schema drift can't sneak in.

---

## 10. Phase 7 — Ship gate (borrowing directly from the report's own checklist)

The report's Part 18 "Before launching publicly" is still the right checklist and doesn't need reinvention:

- Beta test with a small real group — and this is where I'd push back gently on the team: the report was explicit that **user interviews and a landing-page demand test should happen before heavy build investment** (Part 19 §10), and it looks like the team went straight to building the full product instead. That's a completed-but-unvalidated risk, not a technical one — worth a real conversation before spending more calendar time on Phase 6/7 polish, in case the interviews surface that deadlines/notifications matter far more than syllabus tracking, or vice versa. Cheap to check now, expensive to discover after launch.
- Analytics from day one (Mixpanel/PostHog/Supabase's own analytics) — none currently wired.
- The report's suggestion to fold PastPaperTracker functionality *into* StudyPlanner rather than ship it separately (Part 19 §8) is already the repo's actual shape — no action needed, just confirming the architecture already matches the report's strongest recommendation.

---

## 11. What I'd explicitly *not* build right now

Both the report and the audit doc agree, and I agree with them:

- No AI assistant tables/integration (report: "big assumption," "defer"; audit: "zero evidence of any AI feature beyond a static string template")
- No standalone FocusBuddy/distraction-blocker (report Part 19 explicitly recommends killing this as a separate product; nothing in the repo suggests it was ever started, which is the correct call)
- No `achievements`/`xp`/gamification persistence tables — current client-side computation from real fields (streak, progress, scores) is architecturally the right call per the audit; don't add server storage until there's a concrete reason (e.g., cross-device streak sync request from real users)
- No notification delivery-history tables, no Calendar OAuth token storage — no send mechanism or OAuth flow exists yet to justify them

---

## 12. Immediate next actions (this week)

1. Get the real `DATABASE_URL` into hands, run Phase 0 steps 1–4.
2. Regenerate the checkpoint doc against verified state (kills the doc-drift problem this plan opened with).
3. Decide `push` vs `migrate` as the permanent workflow and write it down.
4. Start Phase 2 on `tasks` only — don't parallelize auth work across multiple tables until the pilot is proven with two real logged-in accounts.
5. In parallel (different people, doesn't block engineering): resolve the validation gap from Part 18/19 of the report — a handful of real student interviews now is far cheaper than finding out post-launch that gamified deadlines aren't the thing that gets used.
