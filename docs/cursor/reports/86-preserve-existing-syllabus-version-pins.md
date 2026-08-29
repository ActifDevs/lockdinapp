# Preserve existing syllabus-version pins on Settings replace

## Owner decision

Existing memberships must never move syllabus versions as a side effect of anything.

- New membership (a subject the caller does not currently have) → pin to the current version, as today.
- Existing membership (a subject the caller already has) → must keep its existing `syllabus_version_id` untouched, even if `is_current` has since changed, and even if the caller re-saves their subject list without changing that subject.
- Publishing a new syllabus version must never mutate any existing pin.
- Moving a student from one version to another is out of scope for this change.

Implemented **unconditionally**. No new parameter, mode, or opt-in to re-pinning.

## Inspection before implementation

Live function at task start: **`0004_colossal_pixie.sql`**. Migrations `0005`–`0009` do not `CREATE OR REPLACE` `lockdin_replace_user_subjects`.

`RETURN QUERY` after the upsert selects `user_subjects` for `auth.uid()`, not `INSERT … RETURNING`. `ON CONFLICT DO NOTHING` still returns retained rows.

Callers:

| Path | RPC | Effect of this change |
| --- | --- | --- |
| `PUT /api/user-subjects` (`artifacts/api-server/src/routes/user-subjects.ts`) | `lockdin_replace_user_subjects` | Settings save (`settings.tsx` `useReplaceCurrentUserSubjects`) keeps existing pins |
| `POST /api/profile/complete-onboarding` | `lockdin_complete_onboarding` | Unchanged insert-only pins; not this function |

Other `syllabus_version_id` writes: `lockdin_complete_onboarding` inserts first-time memberships only (no conflict with existing pins). Direct Data API updates remain revoked (`0005`). Test-only SQL updates in integration tests are not production paths. **Not expanded in this task.**

This does **not** implement Slice 3 Model D (immutable snapshots, draft/publish, pin-aware reads, unique current pointer).

Hosted application of `0010` and merge to `main` were **not** performed.

## ON CONFLICT change

Before (`0004`):

```sql
ON CONFLICT (user_id, subject_id) DO UPDATE
  SET syllabus_version_id = EXCLUDED.syllabus_version_id;
```

After (`0010`):

```sql
ON CONFLICT (user_id, subject_id) DO NOTHING;
```

Function signature, `SECURITY DEFINER`, `SET search_path = ''`, validation, delete-dropped-subjects, and grants are unchanged. `0010` contains only `CREATE OR REPLACE FUNCTION` (no `REVOKE`/`GRANT`).

## Migration

- File: `lib/db/migrations/0010_preserve_existing_syllabus_version_pins.sql`
- Journal: Drizzle `generate --custom` (not hand-edited `_journal.json`)
- Local apply: `pnpm --filter @workspace/db migrate` against `127.0.0.1:54322` only
- Harness: not used; Phase 3 local-loopback integration pattern applies

## Tests

- New: existing pin preserved when current flips; new subject pins to current; dropped subject removed; onboarding insert still current
- Journal counts updated to 11 in profile / exam-dates / past-paper integration tests
- Live `pg_get_functiondef` asserts `DO NOTHING`

## Git

Branch: `fix/preserve-existing-syllabus-version-pins`  
Base: `origin/main` `20e3805047a11f45406b3b6386f3b2dd79f1650a`
