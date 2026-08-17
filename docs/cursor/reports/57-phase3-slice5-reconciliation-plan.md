# Phase 3 Slice 5 Reconciliation Plan

## Baseline

- Branch: `phase3-s5-contract-reconciliation`
- Exact base: `b9b3ed2c93a41e4318f6ddd6c29295183e64e0d2`
- Preflight classification: `C. MATERIAL RECONCILIATION REQUIRED`
- Database migration: none; migration chain remains `0000–0009`

## Approved personal data sources

- Authenticated profile: `profiles.full_name`
- Memberships: caller-owned `user_subjects`
- Syllabus progress: caller-owned `topic_progress` over shared subject/topic metadata
- Tasks, past-paper attempts, and exam dates: existing caller-owned Supabase reads
- Shared subjects, syllabus versions, topics, and assessment components: metadata only

## Implementation plan

1. Extract the existing syllabus completion and weighted-overall calculation into a shared request-scoped helper, then reuse it in Progress and Dashboard.
2. Reconcile Dashboard profile name and membership-scoped progress without changing task, paper, exam, streak, XP, achievement, or predicted-grade formulas.
3. Narrow membership subjects to a shared `SubjectReference` contract; reject all four ownership aliases on Task writes; make Supabase errors resource-aware and nondisclosing.
4. Correct OpenAPI semantics and date formats, regenerate both contract packages twice, and audit generated changes for deterministic, spec-explained output.
5. Reconcile Dashboard, My Subjects, Subject Detail, and Past Papers with caller-owned queries and metadata-only memberships.
6. Qualify personal browser-storage keys by authenticated user, remove ambiguous legacy keys, and preserve qualified state across ordinary sign-out.
7. Invalidate the shared Task, Dashboard, and Progress query families after task mutations; update membership cache authoritatively and invalidate dependent aggregates.
8. Add API unit, frontend, and two-user integration coverage, then run the complete local validation sequence and pre-commit scope audit.

## Stop conditions

Stop before commit or push if the work requires a database/schema/RLS/grant change, Migration 0010, a new product formula, a catalogue or canonical-paper redesign, AS/A2/Both support, auth replacement, hosted changes, Production changes, unexplained codegen churn, or any substantial work outside Slice 5.
