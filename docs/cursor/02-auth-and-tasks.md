# Phase 2 — Real auth, proven on `tasks` only

**Precedes:** Phase 3 (which is mechanical repetition of this phase's
pattern). **Depends on:** Phases 0-1 complete.

This is the phase that matters most. Everything before it is verification;
everything after it is applying this exact pattern to five more tables. Get
this one right, deliberately slowly, and the rest of the migration is
low-risk. Get it wrong, and you'll copy the mistake six times before anyone
notices — because RLS bugs and auth bugs don't crash, they just quietly leak
or lose data.

## The good news: two things are already built for this

I traced the actual code rather than assuming, and two pieces of this phase
already exist, unused:

1. **`lib/api-client-react/src/custom-fetch.ts` already has bearer-token
   plumbing.** There's a module-level `setAuthTokenGetter(getter)` function
   whose whole job is: register a function that returns a token, and every
   outgoing request automatically gets `Authorization: Bearer <token>`
   attached if no explicit header is already present. You do not need to
   write an Axios interceptor or touch every call site — you need to call
   `setAuthTokenGetter(() => supabase.auth.getSession().then(s =>
   s.data.session?.access_token ?? null))` once, near where the app
   initializes Supabase. Read the file's own doc-comment: it explicitly says
   this getter path is for token-gated calls and *not* meant for browsers
   using cookie-based sessions — decide up front whether you're doing
   bearer-token auth (use this) or cookie-session auth (don't use this,
   wire cookies + a different check server-side instead), and don't mix the
   two half-heartedly.

2. **`artifacts/api-server/src/middlewares/` already exists as an empty
   directory** — someone already scaffolded the spot where auth middleware
   is supposed to live. Put it there; don't invent a new location.

## The exact pattern for `tasks`

### 1. Auth swap in the frontend — preserve the interface, replace the guts

`hooks/use-auth.ts` currently does this (read the actual file before
editing — this is a summary, not a spec):

```ts
const AUTH_KEY = "lockdin_auth";
const USER_KEY = "lockdin_user";
const ONBOARDED_KEY = "onboarded";
// login() accepts ANY name/email and just writes it to localStorage
```

It exposes `{ isAuthenticated, isOnboarded, user, firstName, login, logout,
completeOnboarding, updateUser }`. Downstream components (and
`require-auth.tsx`'s `RequireAuth` / `RedirectIfAuthenticated`) consume this
shape. The right move is: **keep this exact return shape**, swap the
internals to read from a real Supabase session (`supabase.auth.
onAuthStateChange`, `supabase.auth.getSession()`), and make `login` actually
call `supabase.auth.signInWithPassword` (or magic link / OAuth — a product
decision, ask before assuming) instead of accepting arbitrary input.

Concretely: `isAuthenticated` should reflect a real, non-expired Supabase
session, not a `"true"` string in localStorage. `user` should be sourced from
`profiles` (see step 2) joined with `auth.users`, not from whatever the
caller passed to `login()`.

**Selected authentication route:** Google OAuth through Supabase Auth as primary,
with email/password available as a secondary or development option.

`onboarded` deserves a real decision: is it a `profiles.onboarded_at
timestamp` column, or inferred from whether `user_subjects` has any rows for
this user? Either works; pick one, don't leave it half-migrated with
onboarding status split across localStorage and the DB.

### 2. `profiles` table

Per `docs/scholr-database-architecture-audit.md`'s existing spec (read it —
this repo already designed this, don't redesign it from scratch):

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  level text,
  exam_session text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);
```

A profile row should be created automatically on signup — either via a
Postgres trigger on `auth.users` insert, or explicitly in application code
right after `supabase.auth.signUp` succeeds. A trigger is more robust (can't
be skipped by a code path that forgets to call it); confirm this project's
appetite for DB-level triggers before choosing, since it's a bit more to
reason about than app-level code for a small team.

### 3. `tasks.user_id` migration

`lib/db/src/schema/tasks.ts` currently has no `user_id`. Add it:

```ts
userId: uuid("user_id")
  .notNull()
  .references(() => /* auth.users is not a Drizzle-managed table —
    see note below */),
```

**Gotcha:** `auth.users` is managed by Supabase, not by this repo's Drizzle
schema. Drizzle can still reference it by raw SQL in the migration even if
there's no local Drizzle table object for it — write the FK constraint by
hand in the generated migration SQL if `drizzle-kit generate` doesn't know
how to express a cross-schema reference cleanly. Check what `drizzle-kit
generate` actually produces before assuming it "just works" against a schema
Drizzle doesn't own.

```bash
cd lib/db
pnpm generate   # inspect the generated SQL file before applying it
pnpm migrate
```

### 4. RLS policy for `tasks`

```sql
alter table tasks enable row level security;

create policy "tasks_select_own" on tasks
  for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on tasks
  for update using (auth.uid() = user_id);
create policy "tasks_delete_own" on tasks
  for delete using (auth.uid() = user_id);
```

Test this **at the database level**, not through the app first. Open the
Supabase SQL editor (or `psql`), `set role authenticated; set request.jwt.
claim.sub = '<user-a-uuid>';` and confirm a `select * from tasks` only
returns user A's rows. Then swap to user B's UUID and confirm the reverse.
If you only ever test this through the app UI, a bug in the app-layer query
(e.g. still filtering by a hardcoded value) can mask a broken or missing RLS
policy and you won't find out until real data leaks.

### 5. Express middleware

**Authentication flow clarification:**

1. **JWT verification:** The Express server verifies the supplied Supabase session
   token server-side, for example through `auth.getUser(token)`, and attaches the
   verified user identity to the request. This confirms the token is valid and
   not expired.
2. **Express request attachment:** The verified user identity is attached to the
   Express request as `req.userId`. This is the middleware's primary output.
3. **Database query context:** Executing user-owned database queries in a context
   that actually enforces ownership or RLS requires explicit propagation of the
   authenticated database role/claims. Token verification alone does not
   automatically cause later Drizzle queries through an administrative connection
   to obey RLS.

**Important:** A service-role client must not be used as the execution context for
ordinary user-owned queries because it can bypass RLS. The recommended runtime
path is user-scoped Supabase queries carrying the user's JWT to leverage built-in
RLS enforcement at the database level.

If direct Drizzle is retained for runtime user-owned queries, require an
explicit, tested method for propagating the authenticated database role/claims
within the same transaction (e.g., via `SET LOCAL` or session variables that RLS
policies reference).

New file, `artifacts/api-server/src/middlewares/auth.ts` (the directory
already exists, empty — use it):

```ts
import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

// service-role client, server-side only, never shipped to the browser
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  (req as Request & { userId: string }).userId = data.user.id;
  next();
}
```

Mount it in `routes/tasks.ts` (or centrally in `routes/index.ts` scoped just
to the tasks router for this phase — don't make it global yet, that's Phase
4). `@supabase/supabase-js` isn't in any `package.json` in this repo yet per
my check — it needs adding to `artifacts/api-server`'s dependencies.

**The rule that actually matters here:** every query in `routes/tasks.ts`
currently has no concept of a user at all — `db.select().from(tasksTable)`
with no filter. Once middleware sets `req.userId`, every one of those queries
must add `.where(eq(tasksTable.userId, req.userId))` (or the `and(...)`
equivalent alongside existing filters), reading `userId` **only** from
`req.userId` set by the verified middleware — never from `req.body.userId`
or `req.query.userId`, even if it would be convenient for testing. If a
client can supply their own `user_id` and the server trusts it, RLS is your
only real protection and the API layer is decorative.

## Common failure modes (seen this exact class of bug before)

- **Policy exists, but the app-layer query still doesn't filter by user** →
  RLS saves you, but every query does a full table scan across all users'
  rows before Postgres filters it — works, but slow and wasteful at scale.
  Filter at both layers.
- **Middleware runs, but a route was added/edited without going through it**
  → the single most common way multi-tenant apps leak data. This is exactly
  why the two-user integration test in the Definition of Done isn't
  optional.
- **Service-role key ends up in frontend code** because someone reached for
  it to "just make the RLS-blocked request work" during debugging. The
  service-role key bypasses RLS entirely — it must never leave the server
  process. If you ever find yourself using it to fix a permission error from
  the frontend, the actual bug is in your RLS policy or your session token,
  not something to route around.
- **Session token expires mid-session and the app just starts silently
  401ing** — confirm `custom-fetch.ts`'s error path surfaces this
  meaningfully to the UI (it throws `ApiError` with `status: 401` — make
  sure something upstream catches that and redirects to `/login` rather than
  showing a blank state).

## Cursor prompt

```
Read docs/lockdin-architecture-plan.md section 5, .cursor/rules/
lockdin-architecture.mdc, and this entire file
(docs/cursor/02-auth-and-tasks.md) before starting. This is the most
important phase in the whole migration — go slowly.

Scope: ONLY the tasks table, hooks/use-auth.ts, components/require-auth.tsx,
and the auth middleware. Do not touch past_paper_attempts, exam_dates, or
syllabus_topics in this phase.

Step 1 — plan only, no code yet:
- Read hooks/use-auth.ts and components/require-auth.tsx in full.
- Propose how to swap use-auth.ts's internals to real Supabase Auth while
  preserving its external interface (isAuthenticated, isOnboarded, user,
  firstName, login, logout, completeOnboarding, updateUser).
- Propose whether "onboarded" becomes a profiles.onboarded_at column or is
  derived from user_subjects having rows, and tell me the tradeoff.
- Propose whether we're doing bearer-token auth (using custom-fetch.ts's
  existing setAuthTokenGetter) or cookie-session auth, and why — read
  custom-fetch.ts's doc comment on setAuthTokenGetter before deciding.
Show me this plan and wait for my approval before writing any code.

Step 2 — once approved:
1. Add the profiles table per docs/scholr-database-architecture-audit.md's
   spec, with RLS (select/update own row only). Decide and tell me whether
   you're using a Postgres trigger or app-code to create the profile row on
   signup, with reasoning.
2. Write the migration adding user_id uuid not null (references auth.users,
   on delete cascade) to tasks. Use `pnpm generate` then show me the
   generated SQL before running `pnpm migrate` — auth.users isn't a
   Drizzle-managed table in this repo, so check what drizzle-kit actually
   produces for the FK and fix it by hand in the migration file if needed.
3. Write the RLS policy for tasks (select/insert/update/delete scoped to
   auth.uid() = user_id). Show me the SQL before applying it.
4. Test the RLS policy directly in the Supabase SQL editor / psql with two
   different fake user UUIDs BEFORE wiring any app code — paste me the
   query and result showing isolation at the database level.
5. Create artifacts/api-server/src/middlewares/auth.ts implementing bearer
   token verification via @supabase/supabase-js's service-role client (add
   the dependency — it's not currently in any package.json). Never let the
   service-role key be referenced from any frontend-reachable code.
6. Wire the middleware onto the tasks router only. Update every query in
   routes/tasks.ts to scope by req.userId (set by the middleware) — never
   from req.body or req.query.
7. Wire supabase.auth into the frontend per the approved Step 1 plan, and
   call setAuthTokenGetter once at app init so custom-fetch.ts's existing
   bearer-token plumbing picks it up automatically.
8. Write an integration test: create two real test users, log in as each,
   confirm neither can read/write the other's tasks via the actual API (not
   just the DB). This must pass and be shown to me before you say this
   phase is done — a passing manual UI check is not sufficient per the RLS
   rule in .cursor/rules/lockdin-architecture.mdc.

Stop after step 1 and wait for my go-ahead. Stop again after step 4's RLS
proof and wait for confirmation before touching the Express layer.
```

## Definition of done

- [ ] Step-1 plan reviewed and approved before any code was written
- [ ] `profiles` table exists, RLS'd, auto-populated on signup
- [ ] `tasks.user_id` added via a real migration (not `push`), FK verified
      to actually reference `auth.users` correctly
- [ ] RLS policy tested directly against Postgres with two different UUIDs,
      output pasted/shown, before any app-layer testing
- [ ] Middleware sets `req.userId` from a verified JWT; zero routes trust a
      client-supplied `user_id`
- [ ] Service-role key confirmed absent from any frontend bundle/code path
- [ ] Two-real-user integration test passes and was shown, not just
      claimed
- [ ] `use-auth.ts`'s external interface unchanged (or changes are
      deliberate and reviewed, not incidental)

## Rollback

If the RLS policy or migration turns out wrong after real signups exist,
fixing a policy is a cheap `alter policy` / `drop policy` + recreate — but
if bad rows already leaked to the wrong session before the fix, that's a
real incident, not a rollback. This is exactly why the DB-level test in step
4 happens before any app code, every time.
