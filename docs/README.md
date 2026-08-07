# Documentation Index

This directory contains technical documentation for the Lockdin project.

## Checkpoints

Timestamped technical snapshots documenting the project state at specific points in time. Each checkpoint provides a comprehensive view of the architecture, data model, and implementation status.

| Checkpoint | Date & Time | Commit | Summary |
|------------|-------------|--------|---------|
| [2026-08-07_1118](./checkpoints/2026-08-07_1118/2026-08-07_1118_CURRENT_STATE.md) | 07 Aug 2026 11:18 | `7d7cedb` | Phase 2 Technical Closeout — Supabase Auth, User Tasks & RLS verified, merged into main |
| [2026-07-30_2314](./checkpoints/2026-07-30_2314/2026-07-30_2314_CURRENT_STATE.md) | 30 Jul 2026 23:14 | `bc3f90f` | Phase 1 reference-data verification checkpoint |
| [2026-07-29_0156](./checkpoints/2026-07-29_0156/2026-07-29_0156_CURRENT_STATE.md) | 29 Jul 2026 01:56 | `3af194a` | Phase 0 verified — live Supabase schema (hand-bootstrap = migrate succeeded), syllabus import idempotent, `/api/subjects` DB-backed |
| [2026-07-28_2156](./checkpoints/2026-07-28_2156/2026-07-28_2156_CURRENT_STATE.md) | 28 Jul 2026 21:56 | `009634d` | Data infrastructure complete - syllabus import pipeline implemented, database schema expanded with versioning and component atomization, migration ready |
| [2026-07-27_1835](./checkpoints/2026-07-27_1835/2026-07-27_1835_CURRENT_STATE.md) | 27 Jul 2026 18:35 | `14b2c75` | Initial baseline checkpoint - Lockdin rebrand, complete frontend/backend architecture, validated syllabus data, database schema defined but not deployed |

## Checkpoint Files

Each checkpoint directory contains:

- **CURRENT_STATE.md** - Primary technical snapshot with feature status, database state, and known limitations
- **ARCHITECTURE.md** - Technical architecture documentation with system diagrams and data models
- **DATA_PIPELINE.md** - Reference data ingestion architecture and CSV import process
- **CHANGES.md** - Material changes since the previous checkpoint

## Other Documentation

- **[supabase-local-setup.md](./supabase-local-setup.md)** — Local Supabase CLI stack, hosted linking, Drizzle vs Supabase migration authority
- **[lockdin-architecture-plan.md](./lockdin-architecture-plan.md)** — Prototype → production plan (auth, multi-tenancy, sequencing)
- **[cursor/](./cursor/)** — Phase prompts (environment truth → ship gate)
- **audit_syllabi_v2.py** - Python script for validating CSV syllabus data
- **cursor_audit_prompt_v2.md** - Audit prompt documentation
- **scholr-database-architecture-audit.md** - Detailed database architecture audit (note: references planned Supabase integration, not current state)

**Schema changes on shared DBs:** use `pnpm --filter @workspace/db migrate` (Drizzle). Do not use `supabase db push` for application schema.

## Documentation Guidelines

- Checkpoints are immutable historical records
- Each checkpoint represents the repository state at a specific commit
- New checkpoints should be created after major development milestones
- Previous checkpoints should never be modified
- Always verify current repository state before documenting
