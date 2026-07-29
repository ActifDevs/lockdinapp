# Supabase local setup (technical)

Concise notes for developers working on Lockdin’s Supabase foundation.
This does **not** change the hosted project by itself.

## Prerequisites

- **Docker Desktop** (or another Docker engine the Supabase CLI can talk to) — required for `supabase start`
- **pnpm** (this repo rejects npm/yarn installs)
- Node.js compatible with the pinned Supabase CLI (Node 20+)

## 1. Install dependencies

```bash
pnpm install
```

This installs the **pinned** Supabase CLI as a root `devDependency`. Prefer the root scripts below over a global `supabase` install.

## 2. Local Supabase stack (Auth + local Postgres services)

```bash
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
```

- Starts **local** containers only (API, Auth, Studio, local Postgres, etc.).
- Does **not** modify the hosted Supabase project.
- Auth `site_url` / redirect allow-list point at the Vite frontend: `http://localhost:5173` (see `supabase/config.toml` and `scripts/dev.sh`).

Automatic SQL seeding is **disabled**. Syllabus CSVs are imported with the app importer, not `supabase/seed.sql`.

## 3. Hosted project linking (per developer)

`project_id = "lockedinapp"` in `supabase/config.toml` is only a **local** label for CLI projects on your machine. It is **not** proof that your CLI is linked to the hosted cloud project.

Each authorized developer links their own machine:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <project-reference>
```

Do **not** commit:

- Supabase access tokens
- Database passwords
- Locally generated link credentials under `supabase/.temp` / `.branches`
- Service-role or other secret keys

`supabase/.gitignore` already ignores `.temp` and `.branches`. Root `.gitignore` ignores `.env*`.

## 4. Application schema migrations (Drizzle — not Supabase CLI)

Lockdin’s application schema is owned by **Drizzle**:

- Definitions: `lib/db/src/schema/`
- Committed migrations: `lib/db/migrations/`
- Apply with: `pnpm --filter @workspace/db migrate` (set `DATABASE_URL`, preferably a direct or session-mode URL)

Do **not**:

- Create a second app-schema history under `supabase/migrations/`
- Run or recommend `supabase db push` for Lockdin application schema changes

The Supabase CLI manages the **local service stack and Auth environment**. Drizzle manages **application tables**. Point Drizzle at local, development, or hosted Postgres as appropriate for the task — they are separate concerns.

## 5. Syllabus import (separate from local start / linking / migrate)

Canonical path:

```bash
pnpm --filter @workspace/scripts syllabus:validate
pnpm --filter @workspace/scripts syllabus:import
```

Requires a working `DATABASE_URL`. Starting local Supabase does not import Cambridge data and does not touch hosted data.

## Separation checklist

| Action | Affects hosted project? |
|--------|-------------------------|
| `pnpm supabase:start` / `stop` / `status` | No — local Docker only |
| `supabase login` / `link` | Links **your** CLI to hosted metadata; does not migrate or import by itself |
| `pnpm --filter @workspace/db migrate` | Yes, if `DATABASE_URL` points at hosted |
| Syllabus `syllabus:import` | Yes, if `DATABASE_URL` points at hosted |

## PostgreSQL major version

`supabase/config.toml` → `[db] major_version` must match the hosted major version (`SHOW server_version;` on hosted). As of foundation setup this is **17**, matching hosted `17.6`.
