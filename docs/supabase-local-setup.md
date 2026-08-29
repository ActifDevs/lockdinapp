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
- Apply with: `pnpm --filter @workspace/db migrate`

Connection contract:

- Application runtime `DATABASE_URL`: in hosted/serverless environments, use the Supabase Transaction pooler on port `6543`.
- Hosted migration, DDL, and administrative `DIRECT_DATABASE_URL`: use a direct connection where supported, or a supported Session-mode connection appropriate for migration tooling.
- Do not use Transaction pooling as the preferred migration or DDL connection.

Migration tooling retains a compatibility fallback from `DIRECT_DATABASE_URL` to `DATABASE_URL`. The fallback is suitable only when `DATABASE_URL` itself is valid for migration usage, such as an appropriate local or single-connection setup. A hosted serverless runtime `DATABASE_URL` using Transaction pooling is not the recommended migration connection.

Do **not**:

- Create a second app-schema history under `supabase/migrations/`
- Run or recommend `supabase db push` for Lockdin application schema changes

The Supabase CLI manages the **local service stack and Auth environment**. Drizzle manages **application tables**. Point Drizzle at local, development, or hosted Postgres as appropriate for the task — they are separate concerns.

## 5. Syllabus import (separate from local start / linking / migrate)

Validation and dry-run are offline operations. They parse, validate, normalize,
and report without loading the database importer, and neither command requires
`DATABASE_URL` or `DIRECT_DATABASE_URL`:

```bash
pnpm --filter @workspace/scripts syllabus:validate
pnpm --filter @workspace/scripts syllabus:import --dry-run
```

A real import is a database mutation and requires a verified target in
`DATABASE_URL`:

```bash
pnpm --filter @workspace/scripts syllabus:import
```

Starting local Supabase does not import Cambridge data and does not touch hosted
data. Always verify the target before running a real import.

## Separation checklist

| Action | Affects hosted project? |
|--------|-------------------------|
| `pnpm supabase:start` / `stop` / `status` | No — local Docker only |
| `supabase login` / `link` | Links **your** CLI to hosted metadata; does not migrate or import by itself |
| `pnpm --filter @workspace/db migrate` | Yes, if `DIRECT_DATABASE_URL` (or its compatible `DATABASE_URL` fallback) points at hosted |
| Syllabus `syllabus:import` | Yes, if `DATABASE_URL` points at hosted |

## 6. Disposable DB harness (Phase 6 Slice 2)

The repository includes a disposable database harness for proving the complete migration chain from a blank local Supabase instance. This enables safe local DB integration testing without touching hosted data.

### Purpose

- Reconstruct the exact historical pre-0000 schema state
- Apply migrations 0000–0009 cleanly
- Verify the full migration chain integrity
- Run syllabus DB integration tests against a fresh local target
- Provide migration-fidelity confidence for release-hardening

### Prerequisites

- Docker Desktop running
- Local Supabase stack already started: `pnpm supabase:start`
- No inherited `DATABASE_URL` or `DIRECT_DATABASE_URL` pointing to hosted Supabase

### Bootstrap artifact

The harness uses `lib/db/bootstrap/pre-0000.sql`, a historical bootstrap artifact that reconstructs the schema state immediately before migration 0000:

- **Provenance**: Reconstructed from commit `f271bef` (Initial commit) and historical migration evidence
- **Status**: NOT a migration; historical test infrastructure only
- **Location**: `lib/db/bootstrap/pre-0000.sql` (non-journaled, not in Drizzle migration directory)
- **Authority**: Drizzle migrations (0000–0009) remain the authoritative application schema history

### Usage

```bash
# Start local Supabase
pnpm supabase:start

# Run the disposable harness
pnpm --filter @workspace/scripts db-harness

# Run DB integration tests against the prepared local DB
pnpm --filter @workspace/scripts test:db

# Stop local Supabase when done
pnpm supabase:stop
```

### Safety guarantees

- **Local-only target**: Harness rejects any inherited hosted Supabase URLs
- **Loopback validation**: Validates API_URL and DB_URL are loopback addresses (localhost, 127.0.0.1, ::1)
- **No hosted fallback**: Never falls back to hosted Supabase if local is unavailable
- **Clean start**: By default, clears the public schema before applying bootstrap
- **No production access**: Cannot connect to Production; requires verified local provenance

### Lifecycle

1. Verify execution context (reject inherited hosted URLs)
2. Check local Supabase status
3. Validate API_URL and DB_URL are loopback
4. Clear inherited DB variables; set verified local variables
5. Clean public schema (optional, default: true)
6. Apply historical pre-0000 bootstrap SQL
7. Verify bootstrap prerequisites (tables, columns, historical differences)
8. Execute Drizzle migrations 0000–0009
9. Verify migration journal contains exactly 0000–0009
10. Verify final schema and security objects (RLS, sequences, FKs)
11. Local Supabase remains running for follow-up DB integration tests

### Important distinctions

- **Historical bootstrap**: Reconstructs pre-0000 state for migration fidelity testing
- **Normal migrations**: Committed Drizzle migrations (0000–0009) remain schema authority
- **No `drizzle-kit push`**: Harness never uses push; always applies committed migrations
- **No `supabase db push`**: Supabase CLI manages local services only, not application schema

### Troubleshooting

If the harness fails:

- **"Local Supabase is not running"**: Run `pnpm supabase:start` first
- **"Inherited DB URLs are not safe"**: Clear `DATABASE_URL` and `DIRECT_DATABASE_URL` from your environment
- **"Bootstrap verification failed"**: Check that `lib/db/bootstrap/pre-0000.sql` was not modified
- **"Migration execution failed"**: Check that `lib/db/migrations/` contains files 0000–0009
- **"Journal verification failed"**: Drizzle journal may be corrupted; reset local Supabase with `pnpm supabase:stop && pnpm supabase:start`

## PostgreSQL major version

`supabase/config.toml` → `[db] major_version` must match the hosted major version (`SHOW server_version;` on hosted). As of foundation setup this is **17**, matching hosted `17.6`.
