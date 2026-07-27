# Documentation Index

This directory contains technical documentation for the Lockdin project.

## Checkpoints

Timestamped technical snapshots documenting the project state at specific points in time. Each checkpoint provides a comprehensive view of the architecture, data model, and implementation status.

| Checkpoint | Date & Time | Commit | Summary |
|------------|-------------|--------|---------|
| [2026-07-27_1835](./checkpoints/2026-07-27_1835/2026-07-27_1835_CURRENT_STATE.md) | 27 Jul 2026 18:35 | `14b2c75` | Initial baseline checkpoint - Lockdin rebrand, complete frontend/backend architecture, validated syllabus data, database schema defined but not deployed |

## Checkpoint Files

Each checkpoint directory contains:

- **CURRENT_STATE.md** - Primary technical snapshot with feature status, database state, and known limitations
- **ARCHITECTURE.md** - Technical architecture documentation with system diagrams and data models
- **DATA_PIPELINE.md** - Reference data ingestion architecture and CSV import process
- **CHANGES.md** - Material changes since the previous checkpoint

## Other Documentation

- **audit_syllabi_v2.py** - Python script for validating CSV syllabus data
- **cursor_audit_prompt_v2.md** - Audit prompt documentation
- **scholr-database-architecture-audit.md** - Detailed database architecture audit (note: references planned Supabase integration, not current state)

## Documentation Guidelines

- Checkpoints are immutable historical records
- Each checkpoint represents the repository state at a specific commit
- New checkpoints should be created after major development milestones
- Previous checkpoints should never be modified
- Always verify current repository state before documenting
