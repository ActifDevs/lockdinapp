# Phase 6 Slice 2 — Dedicated Disposable DB Harness

## Git baseline

- Branch: `phase6-slice2-disposable-db-harness`
- Base: `a1582d13eabf0009da6d28c6ebedfb161ad2792a`
- Previous implementation: `7ace6fceb53950e759c16a270ba727d2f5c04ba4`
- Entry working tree: clean
- Historical migrations modified: no

## Dedicated environment

- Test workdir: `scripts/fixtures/db-harness`
- Test config: `scripts/fixtures/db-harness/supabase/config.toml`
- Dedicated project ID: `lockdin-db-harness`
- Normal development project ID: `lockedinapp`
- Normal development identity reused: no
- Supabase CLI: repository dependency, version `2.109.1`
- Active API port: `55421`
- Active database port: `55422`
- Configured but disabled auxiliary ports: shadow `55420`, Studio `55423`, mail `55424`, analytics `55427`, pooler `55429`, edge inspector `55483`
- Port `54322` required: no

Listener inspection found the active dedicated ports free before startup, and
Windows' TCP exclusion tables did not reserve them. No process was stopped.

The CLI was run with its supported `--workdir` option. The normal
`supabase/config.toml` was neither rewritten nor used by the harness. The
`SUPABASE_PROJECT_ID` child-process override is removed so it cannot supersede
the dedicated config.

The live stack reported API and database endpoints on `127.0.0.1`. Before any
destructive SQL, the harness also read the database container's
`com.supabase.cli.project` Docker label and required the exact value
`lockdin-db-harness`.

Supabase CLI 2.109.1 publishes Docker ports on host interfaces by design. The
harness only consumes the exact loopback endpoints returned by `supabase
status`, and excludes Studio, mail, storage, image proxy, Realtime, analytics,
vector, and Edge Runtime from this test stack.

## Destructive safety

Destructive cleanup now requires all three independent checks:

1. API and database endpoints use exact loopback hostnames.
2. The running Docker project's label exactly matches `lockdin-db-harness`.
3. `LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB=1` is present.

Any failed check stops before public-schema cleanup and reports only its safety
category. Unit coverage proves:

- the correct dedicated identity is accepted;
- `lockedinapp` is rejected even with explicit opt-in;
- absent explicit opt-in is rejected;
- hosted API and database targets are rejected without credential echo;
- dedicated identity plus loopback plus explicit opt-in is accepted.

Result: pass.

## Ownership and cleanup contract

If no dedicated stack is running, the harness verifies its active ports are
available, starts the stack, records ownership, and stops it with project-scoped
`--project-id lockdin-db-harness --no-backup` cleanup. It then verifies that no
dedicated containers, network, volume, `.temp`, or `.branches` state remains.

If the dedicated identity already exists, the harness verifies its label before
reuse, disposes the application public schema, and preserves infrastructure it
did not start. It never calls `stop --all` and never stops `lockedinapp`.

Final observed cleanup:

- synthetic `TEST9998` / `TEST9997` fixtures: removed;
- test application public schema: disposed;
- dedicated containers: none;
- dedicated network: none;
- dedicated volume: none;
- generated fixture `.temp` / `.branches`: none;
- normal `lockedinapp` containers before and after: none;

Result: pass.

## Bootstrap static fidelity

`lib/db/bootstrap/pre-0000.sql` remains a non-journaled test artifact outside
the Drizzle migrations directory. It reconstructs the historical state required
by migration 0000 from commit `f271bef`, including the legacy table names and
column differences documented in the artifact.

No migration file or Drizzle journal metadata was edited.

Result: pass.

## Bootstrap execution

On a fresh dedicated Postgres 17 stack, the harness reset only `public`, kept
Supabase system schemas intact, executed `lib/db/bootstrap/pre-0000.sql`, and
queried the resulting legacy tables and critical columns before migration.

Result: pass.

## Migration and journal proof

The actual committed Drizzle migrator applied:

- `0000_syllabus_reference_and_paper_attempts`
- `0001_chilly_randall_flagg`
- `0002_phase2_atomic_onboarding`
- `0003_stormy_mongu`
- `0004_colossal_pixie`
- `0005_restrict_user_subject_writes`
- `0006_slippery_squirrel_girl`
- `0007_eager_squadron_supreme`
- `0008_uneven_mojo`
- `0009_dear_mathemanic`

The verifier queried `drizzle.__drizzle_migrations.created_at` and required the
exact ten timestamps from committed `meta/_journal.json`, in order. No
`drizzle-kit push`, `supabase db push`, manual journal insertion, or migration
edit was used.

Migrations: pass. Journal: pass.

## Final schema and security proof

Database queries verified:

- all seven shared/reference tables;
- all six user-owned tables;
- six required foreign-key relationships to `auth.users`;
- RLS enabled on every user-owned table;
- all expected ownership policies across profiles, user subjects, topic
  progress, tasks, past-paper attempts, and exam dates;
- `past_paper_attempts.id` ownership through
  `pg_get_serial_sequence('public.past_paper_attempts', 'id')`.

Schema: pass. Auth relationships: pass. RLS/security: pass. Serial ownership:
pass.

## Database integration

`scripts/src/syllabus/__tests__/db-upsert.test.ts` ran inside the owned
dedicated lifecycle.

- Tests: 3/3 pass
- Synthetic fixture query after the suite: zero rows

Result: pass.

## Regression

- Harness target-safety tests: 20/20 pass
- Existing loopback guard: 11/11 pass
- Syllabus unit/CLI: 22/22 pass on immediate unchanged rerun; the first combined
  cold invocation had one 5-second module-load timeout rather than an assertion
  failure
- Full workspace typecheck: pass

## Safety

- Production connection: none
- Hosted Supabase mutation: none
- Production mutation: none
- Hosted login/link command: none
- Secrets printed or committed: none
- Normal development config mutation: none
- Normal development stack operation: none

## Scope

Slice 6.2 now owns and contains the first real local E2E migration proof. Slice
6.4 may add CI automation, but this proof is not deferred to Slice 6.4. Slice
6.3 was not started.

## Verdict

**SLICE 6.2 IMPLEMENTATION:** PASS

**READY FOR INDEPENDENT VERIFICATION:** YES

**SLICE 6.3:** NOT STARTED
