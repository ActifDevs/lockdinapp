# Phase 2 Stop 1 — Corrected Architecture Report

**Status:** Read-only planning complete; awaiting team approval  
**Date:** 2026-08-01  
**Baseline:** `origin/main` @ `5f1fbf4` (Production readiness Batch 1 #7)  
**Review worktree used:** `lockdinapp-phase2-review` (detached HEAD at `5f1fbf4`, clean)

This report supersedes the earlier Phase 2 Stop 1 draft that was produced from the wrong branch and allowed unresolved security/migration gaps.

**Read-only constraints observed:** no Phase 2 code, migrations, dependency installs, Supabase changes, OAuth configuration, commits, or pushes.

---

## Explicit answers

| Question | Answer |
|---|---|
| Leave global dashboard/progress/subjects task reads? | **No.** |
| Was the previous report’s repository baseline current? | **No — rechecked from current `origin/main`.** |
| Is service-role required? | **No**, unless a later narrow admin op proves otherwise. |
| Share user-scoped Supabase client globally? | **No.** |
| Freely client-update `onboarded_at`? | **No.** |
| Ownership migration first on shared prod DB? | **No.** |

---

## 1. Executive verdict

**Phase 2 is ready to implement after Stop 1 approval**, with mandatory corrections from the prior report.

Must decide / affirm first:

1. Use existing `origin/auth-and-tasks` (identical to `origin/main`) — do not create a duplicate `phase2/auth-and-tasks` remote.
2. **Every** tasks-table access path becomes Auth + user-scoped in Phase 2 (dashboard/progress/subjects included). Global task reads are rejected.
3. Per-request user-scoped Supabase Data API client (never a mutable global bearer client).
4. Atomic `POST /api/onboarding/complete` — not client-orchestrated partial success.
5. Migrations proven on local/isolated DB first — not shared production first.
6. Pre-migrate hosted task + Auth-user counts (no PII) before choosing delete vs staged backfill.

---

## 2. Current origin/main baseline

| Item | Value |
|---|---|
| Tip | `5f1fbf4` — Production readiness Batch 1 (#7) |
| Includes | `1f03305` docs: correct Phase 1 checkpoint inaccuracies |
| Review worktree | detached HEAD at `5f1fbf4`, clean |
| Primary workspace at audit time | dirty (unrelated leftovers) — **not** used for this audit |

### Baseline checks (clean worktree)

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm typecheck` | Pass (4 projects) |
| `@workspace/api-server` test | **4/4** pass |
| `@workspace/revision-platform` test | **6/6** pass |
| `pnpm build` (root) | **Fail** — `mockup-sandbox` requires `PORT` |
| Targeted `api-server` build | Pass |
| Targeted `revision-platform` build (`PORT=3000 BASE_PATH=/`) | Pass |
| DB-dependent tests | Not run (by design) |

Checkpoint `docs/checkpoints/2026-07-30_2314/` **exists** on `origin/main` (four files). Any prior “missing checkpoint” claim is obsolete.

---

## 3. Branches and recommended ownership

| Ref | Tip | Notes |
|---|---|---|
| `origin/main` | `5f1fbf4` | Canonical |
| `origin/auth-and-tasks` | `5f1fbf4` | **Identical** to main |
| `origin/phase2/auth-and-tasks` | absent | Do not create unless team renames |
| local `phase2/auth-and-tasks` | `5f1fbf4` | Exists locally; same tip; prefer aligning to `auth-and-tasks` |

**Recommendation:** implement Phase 2 on **`auth-and-tasks`** (teammate branch, identical to main). Delete or ignore local `phase2/auth-and-tasks` to avoid duplicate remotes. Do not push a second Phase 2 branch.

---

## 4. Corrected source-of-truth hierarchy

**Current state order:**

1. Current `origin/main` code
2. Current schema and migrations
3. Current package and environment templates
4. Current verified checkpoint (`2026-07-30_2314`)
5. Current route and test behaviour
6. Planning documents for intended scope
7. Official Supabase documentation for platform behaviour
8. Historical checkpoints for history only

**Target scope documents:**

- `docs/cursor/02-auth-and-tasks.md`
- `.cursor/rules/lockdin-architecture.mdc`
- `docs/lockdin-architecture-plan.md`

Conflicts with actual code or current Supabase guidance are called out below and must not be implemented blindly.

---

## 5. Verified current Auth architecture

### Fake auth today

- `use-auth.ts`: `lockdin_auth`, `lockdin_user`, `onboarded`, optional `lockdin_subject_codes` in `localStorage`.
- `login()` accepts arbitrary name/email; no password check; no network.
- `logout()` clears only `lockdin_auth` (user/onboarded keys can linger).
- No React context — **each `useAuth()` call owns independent `useState`**.

### Consumers (`useAuth(`)

| File | Uses |
|---|---|
| `require-auth.tsx` | gate + redirect |
| `app-shell.tsx` | logout, user, firstName |
| `reminder-runner.tsx` | isAuthenticated, isOnboarded → `listTasks` |
| `dashboard.tsx` | firstName, user |
| `index.tsx` | isAuthenticated |
| `login.tsx` / `signup.tsx` | login |
| `onboarding.tsx` | completeOnboarding, firstName |
| `settings.tsx` | user, updateUser |

### Routes

- Public: `/`, `/privacy`, `/terms`, `/forgot-password` (stub — no real reset).
- Auth pages: `/login`, `/signup` via `RedirectIfAuthenticated`.
- Onboarding: `/onboarding` via `RequireAuth onboardingOnly`.
- App shell routes: dashboard, subjects, study-plan, past-papers, progress, calendar, settings.
- **No** `/auth/callback` or `/update-password` today.

### Loading-state problem

Guards assume sync localStorage. Real Auth needs `isLoading` / `isInitializing` or every remount redirects before session restore. Independent hook state means two components can disagree until provider is shared.

### Interface

Preserve shape where possible, but **do not** keep sync `login(partialUser)`. Add:

- `isLoading` / `isInitializing`
- `authError`
- `signInWithGoogle`
- `signInWithPassword`
- `signUpWithPassword`
- `requestPasswordReset` / recovery helpers

Deprecate or narrow fake `login()`.

---

## 6. Approved architecture decisions (retained)

| Decision | Status |
|---|---|
| Bearer-token Auth | Approved — matches `setAuthTokenGetter` |
| Shared frontend `AuthProvider` | Required (fixes multi-state hook) |
| Browser Supabase singleton | Approved |
| `setAuthTokenGetter` | Approved |
| `getClaims(accessToken)` + `SUPABASE_URL` + publishable key | Approved (supersedes doc’s service-role `getUser` sample) |
| No service-role for ordinary Phase 2 | Approved |
| Per-request user-scoped Data API for tasks | Approved |
| RLS + API `.eq(user_id)` defense in depth | Approved |
| `profiles` 1:1 `auth.users`; `onboarded_at` | Approved |
| `user_subjects` → Phase 3 | Approved |
| Audit hosted tasks before migrate | Approved |
| Google primary; email/password secondary | Approved |

**Adjustment vs `02-auth-and-tasks.md` sample:** do **not** use service-role + `getUser` for ordinary middleware. Official guidance prefers `getClaims` for route protection; publishable/anon key is sufficient for JWT verification.

---

## 7. All task-table access paths (critical correction)

Leaving any of these global is **rejected**.

| Access path | Current behaviour | Phase 2 disposition |
|---|---|---|
| `GET/POST/PATCH/DELETE /api/tasks` | Unauthenticated; all rows | **A** requireAuth + user-scoped Data API |
| `GET /api/dashboard/summary` | `select` all tasks → today/upcoming/streak | **A** requireAuth + user’s tasks only |
| `GET /api/progress/overview` | all tasks → weekly + total completed | **A** requireAuth + user’s task metrics |
| `GET /api/subjects` list | bulk `select` all tasks → `upcomingTasksCount` | **C** shared catalogue without global counts; user counts only under Auth |
| `enrichSubject` / `GET /api/subjects/:id` | tasks by `subjectId` only | **C** same split |
| Onboarding `createTask` loop | unauthenticated inserts | **A** replace with atomic onboarding endpoint |
| `ReminderRunner` → `listTasks` | client list | **A** inherits protected list |
| Study-plan / dashboard / subject-detail mutations | CRUD via API | **A** protected CRUD |
| Tests mocking `tasksTable` | empty stubs | Update for Auth + scoping |

**No Phase 2 exit** while any server path can read another user’s tasks.

---

## 8. Revised target architecture

```text
Browser AuthProvider
  → supabase-js singleton (VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY)
  → setAuthTokenGetter(() => session.access_token)
  → custom-fetch attaches Authorization: Bearer …

Express
  → requireAuth: parse Bearer → getClaims(token) → req.userId = claims.sub
  → createUserScopedSupabaseClient(token) per request
  → tasks / onboarding / task-derived aggregates via Data API (RLS + .eq user_id)
  → shared reference (subjects/syllabus) may stay Drizzle on DATABASE_URL
  → never trust body/query/param userId
```

---

## 9. Precise request-scoped Supabase client

**Factory:** `artifacts/api-server/src/lib/supabase-user-client.ts` (new)

```ts
createUserScopedSupabaseClient(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
```

Rules:

- Created **per request** inside handlers (or middleware attaching `req.supabase`), never a module-level token that mutates.
- Concurrent A/B requests cannot swap Authorization headers.
- Startup: missing `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` → fail fast on Auth-protected boot path.
- Errors: map PostgREST/RLS failures to 401/403/404/500 without leaking claims; empty update/delete → 404.
- Map snake_case rows → existing camelCase API Zod contracts in a thin mapper (keep OpenAPI shape).
- Always `.eq("user_id", req.userId)` in addition to RLS; update/delete also `.eq("id", taskId)`.
- Reject/ignore any client-supplied `userId` / `user_id`.

**Service-role:** not used in Phase 2 ordinary path. Never in Vite/`VITE_*`.

**Placement of deps:** `@supabase/supabase-js` in `artifacts/api-server` and `artifacts/revision-platform` (or a small shared `lib/supabase` package if preferred — optional). Not present in any `package.json` today.

---

## 10. JWT middleware design

**File:** `artifacts/api-server/src/middlewares/auth.ts` (directory exists, `.gitkeep` only)

1. Require `Authorization` matching `/^Bearer\s+(\S+)$/i`; else **401** `{ error: "Unauthorized" }`.
2. Empty token → 401.
3. `const { data, error } = await verifier.auth.getClaims(token)`.
4. On error/missing claims → 401 (generic; no token/claim details in body; log server-side only).
5. Validate `claims.sub` is UUID; optionally assert `role` / `aal` as appropriate.
6. `req.userId = claims.sub` via Express type augmentation (`Request` + `userId: string`).
7. No decoded-without-verify path; no service-role.

**Revocation trade-off:** `getClaims` trusts JWT until expiry (~1h per `supabase/config.toml` `jwt_expiry = 3600`). Logout does not instantly kill outstanding access tokens. **Acceptable for this student app** at Phase 2; keep expiry short; use `getUser` later only for high-sensitivity actions if needed.

---

## 11. Corrected profiles schema and trigger

### Columns

- `id` (FK `auth.users` ON DELETE CASCADE)
- `name`
- `level`
- `exam_session`
- `onboarded_at`
- `created_at`
- `updated_at` (via trigger `BEFORE UPDATE` setting `updated_at = now()`)

### RLS / grants

- ENABLE RLS.
- SELECT own: `TO authenticated USING ((select auth.uid()) = id)`.
- **No** INSERT/DELETE policies for `authenticated` (trigger-only create; cascade delete).
- UPDATE: only `name`, `level`, `exam_session` — **not** `onboarded_at`, `id`, timestamps.

**Recommendation for `onboarded_at`:** narrow **SECURITY INVOKER** RPC `complete_onboarding(...)` called with user JWT (preferred over column-level GRANT complexity). Profile API may PATCH safe columns only; onboarding completion only via RPC / `POST /api/onboarding/complete`.

### Trigger

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
-- keep execute limited to roles that need it for the trigger owner

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Do **not** use `set search_path = public`. Fully qualify `public.profiles`.

### Auth-user audit (counts only, later)

```sql
select count(*) from auth.users;
select count(*) from public.profiles;
select count(*) from auth.users u
  left join public.profiles p on p.id = u.id
  where p.id is null;
```

Backfill missing profiles before relying on trigger-only path. **No UUIDs/emails in reports.**

Google metadata → `name` via trigger coalesce; email stays in Auth, not necessarily duplicated on profiles unless product asks later.

If Auth succeeds and trigger fails → signup incomplete; surface Auth error; do not mark onboarded. Test trigger in isolated DB with disposable users.

---

## 12. Existing Auth-user and task audit plan

**Do not run during planning.** Counts/titles only; no PII.

```sql
-- tasks
select count(*) as task_count from public.tasks;
select id, title, subject_id, completed, created_at
  from public.tasks order by id;

select conname, pg_get_constraintdef(oid)
  from pg_constraint where conrelid = 'public.tasks'::regclass;
select indexname, indexdef from pg_indexes where tablename = 'tasks';
select relrowsecurity from pg_class where oid = 'public.tasks'::regclass;
select polname, polcmd, polroles::regrole[], pg_get_expr(polqual, polrelid)
  from pg_policy where polrelid = 'public.tasks'::regclass;

-- auth (counts only)
select count(*) as auth_user_count from auth.users;
```

### Decision rules

- All tasks disposable prototype → deliberate delete before NOT NULL.
- Known legitimate owner in `auth.users` → staged nullable → backfill → NOT NULL.
- Ownership unproven → **do not** invent UUIDs; delete or quarantine until decided.
- Never assign to UUIDs absent from `auth.users`.

---

## 13. Revised migration SQL draft (not generated / not applied)

**Approach C recommended after audit:** nullable `user_id` → deliberate backfill or wipe → FK + index → NOT NULL → RLS.

```sql
-- profiles (new)
create table public.profiles ( ... );
-- trigger + backfill + RLS as above

-- tasks ownership
alter table public.tasks add column user_id uuid;
-- AFTER audit: delete disposable OR backfill known owner
alter table public.tasks
  alter column user_id set not null;
alter table public.tasks
  add constraint tasks_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
create index tasks_user_id_idx on public.tasks (user_id);

alter table public.tasks enable row level security;
create policy tasks_select_own on public.tasks for select to authenticated
  using ( (select auth.uid()) = user_id );
create policy tasks_insert_own on public.tasks for insert to authenticated
  with check ( (select auth.uid()) = user_id );
create policy tasks_update_own on public.tasks for update to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );
create policy tasks_delete_own on public.tasks for delete to authenticated
  using ( (select auth.uid()) = user_id );

grant select, insert, update, delete on public.tasks to authenticated;
grant select, update on public.profiles to authenticated;
-- no insert/delete on profiles for authenticated
```

`(select auth.uid())` per official RLS guidance (initplan caching).

### Drizzle vs hand SQL for `auth.users` FK

Catalog: `drizzle-orm ^0.45.2`, `drizzle-kit ^0.31.10`.

| Option | Pros | Cons |
|---|---|---|
| A. `pgSchema('auth').table('users',…)` stub in Drizzle | Keeps generate/journal consistent | Must verify generate output for cross-schema FK |
| B. Custom SQL only in migration | Explicit control | Snapshot drift risk if schema TS omits FK |

**Recommend:** try **A** in schema; run `pnpm --filter @workspace/db generate`; **inspect SQL**; if FK missing/wrong, amend migration SQL once and update snapshot/journal consistently. Never `drizzle-kit push` / `supabase db push` on shared DB.

**Rollback SQL (pre-user-data only):** drop policies → drop FK/index → drop column / drop profiles/trigger — only if no real user-owned data exists.

---

## 14. Atomic onboarding design (one choice)

**Chosen:** `POST /api/onboarding/complete`

Flow:

1. `requireAuth` → `req.userId`.
2. Body: `{ subjectIds: number[], level?, examSession? }` (IDs of **existing shared** subjects — never create subjects).
3. Validate IDs exist in shared `subjects` (Drizzle or Data API read of reference data).
4. Call SECURITY INVOKER RPC via user-scoped client, e.g. `complete_onboarding(p_subject_ids, p_level, p_exam_session)` which:
   - updates `profiles` set level/exam_session/`onboarded_at = now()` where `id = auth.uid()` and `onboarded_at is null` (or upsert idempotent);
   - inserts starter tasks (`user_id = auth.uid()`, titles derived from subject names) with unique natural key e.g. `(user_id, title, subject_id)` partial unique **or** check existing starter titles before insert;
   - single transaction — all commit or all roll back.
5. Idempotent retry: if already onboarded and starters exist → return success current state (no duplicate tasks).

**Prevents:** partial tasks; onboarded without tasks; client-supplied ownership; mutating shared subjects.

### While `user_subjects` deferred

- Selected subjects **only seed starter tasks** (and optional local UX).
- UI must **not** claim server-persisted enrollment.
- `lockdin_subject_codes` may remain temporary client hint only.
- Phase 3 introduces `user_subjects` and migrates real enrollment.

**Stop** client `createSubject` during onboarding (today it upserts-by-code on shared table — unique on `code` avoids dup rows for same code, but still wrong product model and can create empty subjects for unknown codes).

---

## 15. Complete Auth / recovery flows

| Flow | Design |
|---|---|
| Google OAuth | `signInWithOAuth({ provider:'google', redirectTo })` → `/auth/callback` route exchanges/session detect |
| Email signup | `signUp` → confirmation email in **production**; controlled disable only for local/test |
| Email login | `signInWithPassword` |
| Forgot password | `resetPasswordForEmail` → redirect `/update-password` |
| Recovery | handle `PASSWORD_RECOVERY` / session from URL on `/update-password` → `updateUser({ password })` |
| Session restore | `getSession` + `onAuthStateChange` in AuthProvider; cleanup unsubscribe |
| Refresh | supabase-js auto refresh; token getter always reads latest session |
| Logout | `signOut`; clear QueryClient; clear getter session |
| Profile load fail | authenticated shell with error/retry; do not fake onboarded |
| Network/Auth fail | `authError` + non-flicker loader |

**New routes needed:** `/auth/callback`, `/update-password`. Existing `/forgot-password` alone is insufficient (currently a stub).

**Secrets split:** `VITE_*` URL + publishable only; server `SUPABASE_*` same; Google client secret + service-role + DB URLs server-only / dashboard-only.

**Preview redirects:** Supabase allow-list production + localhost + documented preview pattern (or stable preview alias). No secrets in repo.

---

## 16. File-by-file implementation map (planned — not written)

| File | New/Exist | Purpose |
|---|---|---|
| `artifacts/revision-platform/src/lib/supabase.ts` | New | Browser singleton |
| `artifacts/revision-platform/src/hooks/auth-provider.tsx` | New | Shared Auth context |
| `artifacts/revision-platform/src/hooks/use-auth.ts` | Exist | Consume provider; real methods |
| `artifacts/revision-platform/src/components/require-auth.tsx` | Exist | Wait for `isLoading`; real session |
| `artifacts/revision-platform/src/main.tsx` / `App.tsx` | Exist | Wrap AuthProvider; register token getter |
| `pages/login\|signup\|forgot-password` + new callback/update-password | Exist/New | Real Auth UX |
| `pages/onboarding.tsx` | Exist | Call `/onboarding/complete`; stop createSubject |
| `artifacts/api-server/src/middlewares/auth.ts` | New | Bearer + getClaims |
| `artifacts/api-server/src/lib/supabase-user-client.ts` | New | Per-request client |
| `artifacts/api-server/src/lib/supabase-verifier.ts` | New | Publishable verifier client (stateless) |
| `routes/tasks.ts` | Exist | Auth + Data API + user filter |
| `routes/dashboard.ts` / `progress.ts` / `subjects.ts` | Exist | Auth wherever tasks touch; split catalogue |
| `routes/onboarding.ts` | New | Atomic complete |
| `routes/index.ts` | Exist | Mount protected routers |
| `lib/db/src/schema/tasks.ts` + `profiles.ts` | Exist/New | Schema |
| `lib/db/migrations/*` | New | After generate+review |
| `lib/api-zod` / OpenAPI | Exist | Omit `user_id` from public Task responses if added |
| package.json (api + web) | Exist | Add `@supabase/supabase-js` |
| `.env.example` | Exist | Already sketches Phase 2 vars — keep; no secrets |
| Tests | New/Exist | Middleware, RLS, two-user API, frontend |

---

## 17. Safe migration / deployment sequence

| Stage | Action |
|---|---|
| A | Code gen + review only |
| B | Apply migration on **local Supabase / isolated DB** |
| C | Direct RLS two-user proof (Gate B) |
| D | API integration on isolated env |
| E | Frontend Auth cutover on Preview |
| F | Preview deploy with Preview env vars + redirect URLs |
| G | **Coordinated** production: backup → migrate → deploy API+web **same window** |
| H | Post-deploy smoke: healthz, healthz/db, Auth login, task isolation |

**Avoid windows where:** `user_id` NOT NULL but old clients insert without it; RLS on but routes unauthenticated; dashboard still global; frontend sends no Bearer.

Do **not** apply ownership migration to shared production immediately after Slice 1.

---

## 18. Expanded test matrix

### Profiles

- trigger create
- backfill
- A≠B isolation
- cannot set `onboarded_at` via open PATCH
- trigger failure behaviour

### Tasks

- A CRUD A
- B cannot read/update/delete A
- cannot assign to B
- anon denied
- dashboard/progress/subjects cannot expose B
- guessed-ID fails
- body userId ignored

### Server client

- concurrent A/B no token cross-talk

### Frontend

- loading no flicker
- confirmed signup
- OAuth
- password
- recovery
- refresh
- logout
- expiry
- cache clear on user change
- no A↔B cache bleed (query keys include `userId`)

### Regression

- existing tests
- typecheck
- targeted builds
- health routes
- shared subject routes without leaking tasks

Prefer two real Supabase Auth users over spoof-only SQL.

---

## 19. Risks and post-data rollback

| Risk | Mitigation |
|---|---|
| Cross-user task leak via forgotten route | Exhaustive path list + Gate D |
| Mutable global Supabase client | Per-request factory + concurrency test |
| Onboarding partial writes | Single RPC transaction |
| Doc pushes service-role middleware | Corrected to getClaims + publishable |
| Prod migrate before API ready | Staged sequence G |
| Duplicate Phase 2 branches | Use `auth-and-tasks` only |

**Pre-user-data rollback:** reverse migration if no real owned rows.

**Post-user-data recovery:** do **not** disable RLS; do **not** drop `user_id`; do **not** merge ownership; forward-fix only; treat exposure as security incident; **require backup/export before production ownership migration**.

---

## 20. Remaining open questions (team approval)

1. Confirm implement on `auth-and-tasks` (vs rename).
2. Hosted task audit outcome: wipe vs staged backfill.
3. Production email confirmation enabled (recommended yes).
4. Google Cloud project / redirect URL ownership.
5. Whether `GET /api/subjects` remains public catalogue (without task counts) or Auth-gated entirely.
6. JWT asymmetric signing enabled on the Supabase project (affects `getClaims` local verify path).
7. Exact starter-task idempotency key design.
8. Clean primary workspace dirty files before long-lived checkout of `auth-and-tasks`.

---

## 21. Exact next prompt for Slice 1 (do not execute yet)

```text
Phase 2 Slice 1 — schema + migration generation ONLY (no apply, no Auth UI).

Work on branch auth-and-tasks (identical to origin/main tip). Do not create phase2/auth-and-tasks.

Scope:
1. Add Drizzle profiles schema + tasks.user_id (nullable first if required by generate).
2. Attempt auth.users FK via Drizzle pgSchema('auth') stub; run
   pnpm --filter @workspace/db generate
3. Show the generated SQL + snapshot/journal diff. Do not migrate.
4. Hand-amend only if FK/RLS/grants/trigger SQL is incomplete; show final SQL for approval.
5. Include: profiles RLS (select own; limited update; no client insert/delete),
   handle_new_user security definer with set search_path = '',
   tasks RLS draft with (select auth.uid()) = user_id,
   index on tasks.user_id,
   rollback SQL for pre-user-data.
6. Provide the read-only hosted audit SQL (counts/titles only; no PII) for humans to run.
7. Do not install OAuth, do not touch frontend Auth, do not apply to hosted DB,
   do not use drizzle-kit push / supabase db push.

Stop after showing generated/amended SQL and wait for Stop 2 approval.
```

---

## Documentation / code discrepancies (summary)

| Source | Issue | Correction |
|---|---|---|
| `02-auth-and-tasks.md` middleware sample | service-role + `getUser` | publishable + `getClaims` |
| Same doc RLS test | outdated `set request.jwt.claim.sub` style | Use current official JWT claim test method at implementation time |
| Same doc “preserve exact interface” | conflicts with async Auth | Add loading/OAuth/password methods deliberately |
| Same doc scope | under-emphasizes login/signup/onboarding/recovery | Full flows required |
| Prior Stop 1 report | wrong branch; allowed global task reads | This re-baseline rejects both |
| Checkpoint Multi-tenancy “Phase 3” | Phase 2 owns **tasks** tenancy first | Keep other tables for later phases |

---

## Final safety check (review worktree)

At report generation time:

- `git status --short` → empty
- `git diff --stat` → empty
- `git diff --check` → clean

No Phase 2 code, schema, migration, package, env, Supabase, DB, commit, or push changes were made by the planning pass.

**Stop for team approval of this corrected Stop 1 plan.**
