# Phase 2 Slice 1 — Profiles + Task Ownership Migration Draft

**Status:** Draft complete — awaiting Stop 2 review  
**Branch:** `auth-and-tasks`  
**Starting tip before Slice 1 work:** `cf91a82` (Stop 1 report cherry-pick on top of `5f1fbf4`)  
**Migration applied:** **No** (local / hosted / production all untouched)

---

## 1. Branch and starting commit

| Item | Value |
|---|---|
| Branch | `auth-and-tasks` (tracks `origin/auth-and-tasks`) |
| Pre-slice HEAD | `cf91a82` docs: Phase 2 Stop 1 corrected architecture report |
| Base | `5f1fbf4` = `origin/main` = `origin/auth-and-tasks` (before report commit) |
| Remote `phase2/auth-and-tasks` | Not created |

## 2. Working-tree safety

- Tree was cleaned before Slice 1 (leftovers moved to `lockdinapp-local-aside/`).
- Switched from local `phase2/auth-and-tasks` → `auth-and-tasks`.
- Cherry-picked Stop 1 report commit onto `auth-and-tasks`.
- Fast-forward from `origin/main`: already up to date.

## 3. Files inspected

- `lib/db/src/schema/*`
- `lib/db/src/index.ts`
- `lib/db/drizzle.config.ts`
- `lib/db/package.json`
- `lib/db/migrations/` + `meta/`
- `docs/supabase-local-setup.md`
- `docs/cursor/02-auth-and-tasks.md`
- `.cursor/rules/lockdin-architecture.mdc`
- Conventions: `timestamp with time zone` + `defaultNow()`, snake_case columns, camelCase TS, `check()` + `sql` patterns from `pastPaperAttempts.ts`, hand-amended migration style from `0000_…`.

## 4. Files created or modified

| File | Action |
|---|---|
| `lib/db/src/schema/profiles.ts` | **Created** |
| `lib/db/src/schema/tasks.ts` | Modified (`user_id` + index) |
| `lib/db/src/schema/index.ts` | Export profiles |
| `lib/db/drizzle.config.ts` | Relative paths (required for generate) |
| `lib/db/migrations/0001_chilly_randall_flagg.sql` | Generated + hand-amended |
| `lib/db/migrations/meta/0001_snapshot.json` | Generated |
| `lib/db/migrations/meta/_journal.json` | Updated |
| `lib/db/migrations/0001_profiles_and_task_ownership.rollback.sql` | **Created** (companion, not journaled) |
| `lib/db/migrations/0001_profiles_and_task_ownership.audit.sql` | **Created** (companion, not journaled) |

No frontend, API, Auth, package.json, lockfile, env, or Supabase config changes.

---

## 5. Exact profiles schema (Drizzle)

- `id` uuid PK  
- `fullName` → `full_name` text nullable  
- `username` text nullable  
- `level` text nullable  
- `examSession` → `exam_session` text nullable  
- `onboardedAt` → `onboarded_at` timestamptz nullable  
- `createdAt` / `updatedAt` timestamptz not null default now()

## 6. Username constraint and index

- CHECK `profiles_username_format`:  
  `username is null or username ~ '^[a-z0-9_]{3,24}$'`
- Partial unique index `profiles_username_unique` on `username` WHERE `username is not null`

## 7. Exact tasks.user_id schema

- `userId` → `user_id` uuid **nullable**
- Index `tasks_user_id_idx`
- **Not** NOT NULL (blocked on hosted audit)
- FK to `auth.users(id)` ON DELETE CASCADE added in **migration SQL only**

## 8. How auth.users was referenced

**Option B chosen:** no Drizzle `.references()` / no `pgSchema('auth')` in TypeScript.

Rationale: drizzle-kit would otherwise risk emitting Auth-schema DDL. FKs are hand-written:

```sql
REFERENCES "auth"."users"("id") ON DELETE cascade
```

## 9. Did generated SQL manage Auth schema?

**No.** Raw drizzle-kit output only created `public.profiles`, added `tasks.user_id`, and indexes. Zero `CREATE`/`ALTER`/`DROP` on `auth.*`.

## 10. Full generated SQL before amendments

```sql
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text,
	"username" text,
	"level" text,
	"exam_session" text,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_username_format" CHECK ("profiles"."username" is null or "profiles"."username" ~ '^[a-z0-9_]{3,24}$')
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "user_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_unique" ON "profiles" USING btree ("username") WHERE "profiles"."username" is not null;--> statement-breakpoint
CREATE INDEX "tasks_user_id_idx" ON "tasks" USING btree ("user_id");
```

## 11. Final migration SQL after amendments

See `lib/db/migrations/0001_chilly_randall_flagg.sql` (authoritative). Includes:

- profiles table + username check
- FK `profiles.id` → `auth.users`
- nullable `tasks.user_id` + FK → `auth.users`
- indexes
- `set_profiles_updated_at` trigger (`search_path = ''`)
- `handle_new_user` SECURITY DEFINER (`search_path = ''`), metadata `full_name` then `name` then NULL
- REVOKE ALL on `handle_new_user` from PUBLIC / anon / authenticated
- trigger on `auth.users` AFTER INSERT
- idempotent profile backfill `ON CONFLICT DO NOTHING`
- profiles RLS: SELECT own, UPDATE own; **no** INSERT/DELETE for authenticated
- grants: SELECT; UPDATE (`full_name`, `level`, `exam_session`) only
- tasks RLS: SELECT/INSERT/UPDATE/DELETE own with `(select auth.uid()) = user_id`
- grants on tasks + sequence to authenticated

## 12. Journal / snapshot

- Journal entry `0001_chilly_randall_flagg` added
- `0001_snapshot.json` includes profiles + tasks.user_id (no auth FKs in snapshot — intentional)

**Future generate risk:** hand FKs/RLS/triggers live only in SQL. Do not run `drizzle-kit push`. Before each future `generate`, re-check diff does not try to drop hand-amended objects that somehow entered the snapshot. Prefer appending new migrations; do not recreate `0001`.

## 13. Profiles RLS and grants

- RLS enabled
- `profiles_select_own` / `profiles_update_own` for `TO authenticated`
- No authenticated INSERT/DELETE policies
- Column UPDATE grant excludes `id`, `username`, `onboarded_at`, timestamps

## 14. Tasks RLS and grants

- RLS enabled (null `user_id` rows are not visible to `authenticated` via policies — intentional until audit/backfill)
- Full CRUD policies with USING + WITH CHECK where required
- GRANT SELECT/INSERT/UPDATE/DELETE + sequence usage

## 15. Trigger and backfill

- Signup trigger inserts `(id, full_name)` only
- No username, onboarded_at, or tasks in trigger
- Backfill mirrors trigger metadata preference; conflict-safe

## 16. updated_at mechanism

`BEFORE UPDATE` trigger `profiles_set_updated_at` sets `NEW.updated_at = now()`.

## 17. Read-only hosted audit SQL

`lib/db/migrations/0001_profiles_and_task_ownership.audit.sql`  
**Task ownership decision: unresolved until human runs this.**

## 18. user_subjects / components

**Not introduced.** Subject/component product boundaries recorded below; no syllabus table changes.

### Subject / component boundaries (approved)

- Subjects remain shared reference data
- Future onboarding subject selector must search by code and name
- `GET /api/subjects` must become pure catalogue or split shared vs user enrichment — no global task/paper/progress leakage
- Phase 2 subject selection may seed starter tasks only — not permanent enrolment
- Do not create subject rows during onboarding
- `user_subjects` / `user_subject_components` → Phase 3
- AS/A2 and paper/component choices are per-subject in Phase 3
- Do not treat localStorage selections as permanent server truth

### Phase 2 deployment limitation

Phase 2 proves Auth + ownership on **tasks** (and profiles) only.  
`past_paper_attempts`, `exam_dates`, progress/enrolment tables are **not** multi-tenant yet.  
Broad real-user production registration must stay disabled until those are secured or hidden.  
Shared catalogue responses must contain no global user activity data.

## 19. Migration applied?

**No.**

## 20. Validation results

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm --filter @workspace/api-server test` | 4/4 pass |
| `pnpm --filter @workspace/revision-platform test` | 6/6 pass |
| `PORT=5173 BASE_PATH=/ pnpm build` | Pass |
| `@workspace/db` dedicated typecheck script | Not present (covered via workspace `tsc --build`) |

## 21. Final git status / diff stat (at report time)

Modified / untracked as Slice 1 outputs only (see section 4). Not staged/committed.

## 22. Uncertainties requiring Stop 2 approval

1. Hosted task audit outcome before `NOT NULL`.
2. Confirm column-level UPDATE grants behave as intended through PostgREST/Data API for profiles.
3. Confirm `EXECUTE FUNCTION` trigger syntax on the project’s Postgres version (Supabase PG15+ expected).
4. Accept drizzle.config relative-path fix as permanent.
5. Later onboarding RPC privilege model (analysis below — not implemented).

### Later onboarding RPC (analysis only)

| Approach | Pros | Cons |
|---|---|---|
| SECURITY INVOKER | Runs as caller; RLS applies naturally | Harder to set `onboarded_at`/`username` if column grants deny those updates |
| Narrow SECURITY DEFINER | Can update reserved columns; still bind to `auth.uid()` with no user-id arg; `search_path = ''`; REVOKE from PUBLIC/anon | Must be tightly reviewed; never take a user id parameter |

**Lean for later slice:** narrow SECURITY DEFINER onboarding function that:
- uses only `auth.uid()`
- validates username + full_name
- sets username + onboarded_at + starter tasks in one transaction
- EXECUTE granted only to `authenticated`
- no arbitrary column updates from client

SECURITY INVOKER alone conflicts with “clients cannot UPDATE onboarded_at/username” unless those columns are granted — which we intentionally did not grant.

### Pre-user-data rollback

See `0001_profiles_and_task_ownership.rollback.sql`. Invalid after real user-owned data exists.

---

**Stop for Phase 2 Stop 2 review. Do not apply, commit, or push until approved.**
