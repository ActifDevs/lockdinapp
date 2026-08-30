# Phase 6 Slice 4 — Release / Operational Hardening

## Baseline

- Repository: `https://github.com/ActifDevs/lockdinapp.git`
- Base / `origin/main`: `a6019cfd26e46ab7d4c0e77b7bab599b2a61a3ca`
- Branch: `phase6-slice4-release-operational-hardening`
- Report 110: Slice 3D CLOSED; Production healthy; next block 6.4
- Schema change: **NONE** (0016 not created)
- Hosted Production / Vercel env / membership pins: **not touched**

## Gap reconciliation

| Area | Prior expectation | Classification | This slice |
| --- | --- | --- | --- |
| A. Integration-suite currency | Stock HTTP suite still assumed journal 0012 / 5-arg onboarding | **OPEN** (confirmed: journal count `13`, `pronargs === 5`, onboarding omitted structured session) | Updated to committed journal head and strict-assignment contract |
| B. CI quality gates | No `.github/workflows` | **OPEN** | Added `pr-quality.yml` |
| C. Migration-drift protection | Harness listed `0000`–`0015` in source | **PARTIALLY ADDRESSED** | Generic journal/SQL integrity check; harness reads `_journal.json` |
| D. Future revision / r002 proof | None hosted; no disposable successor proof | **OPEN** | Disposable synthetic r001→r002 lifecycle proof |
| E. r001-specific operator tooling | Applicability parser required exactly nine `*-r001` keys | **OPEN** (bootstrap safeguard mixed with parser) | Parser accepts `{code}-rNNN`; canonical 9×r001 still enforced on the production write-set path |
| F. Future update / expiry runbook | Missing | **OPEN** | Added runbook + expiry table from the committed population manifest |

No schema change was required. 0016 remains **ABSENT**.

## Integration suite

- Stock suite remains loopback-only via `require-local-supabase` (fail closed on hosted URLs).
- Journal assertions now use `lib/db/migrations/meta/_journal.json` (count + latest hash/when). They will continue to work when 0016+ is legitimately added.
- Onboarding and new-membership replacements send structured `intendedExamSession`.
- Added coverage: missing session → safe 400; Feb/Mar denied; out-of-range denied; per-subject override; legacy 5-arg and strict 10-arg onboarding overloads both present; replace 1-arg and 6-arg overloads both present.
- Destructive empty-DB / r002 proofs stay on `lockdin-db-harness`, not the ordinary `lockedinapp` workdir and not hosted Production.

Local ordinary Supabase on this machine was behind 0012 before this run. After a **loopback-only** `drizzle-kit migrate` to 0015, the HTTP suite still depends on a seeded catalogue plus applicability/policy. That seed is developer-local and is **not** CI’s disposable path.

## CI

- Added `.github/workflows/pr-quality.yml`.
- Job `quality`: typecheck, API tests, frontend tests, syllabus unit tests, harness target-safety + migration-integrity tests, `check:migrations`, OpenAPI codegen diff, `git diff --check`.
- Job `disposable-db`: dedicated harness with `LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB=1`. No Production secrets. Inherited hosted `DATABASE_URL` fails the job.
- HTTP `test:integration` is **not** started in CI against an empty runner: it requires a seeded loopback catalogue. Assignment/lifecycle authority in CI is the disposable harness.
- Frontend timeouts are not globally inflated. CI (Linux) should not inherit the Windows-local contention note from Report 110.

## Migration drift

- Command: `pnpm run check:migrations` / `pnpm --filter @workspace/scripts check:migrations`.
- Invariants: sequential journal `idx`, unique tags/timestamps/hashes, strictly increasing `when`, every journal tag has a SQL file, every SQL file is journalled.
- Head is **whatever the last journal entry is**, currently `0015_silent_sentinel` (16 rows including `0000`).
- Harness `EXPECTED_MIGRATIONS` is derived from the same journal.

## Future-version tooling

- CLI already required `--revision=` and refused filename-as-identity. `--csv=` overrides the official raw-file mapping for a successor snapshot.
- Applicability parser accepts `{subjectCode}-rNNN` and one-or-more entries (needed for a single-subject r002 write-set).
- `loadApplicabilityManifest()` of the committed production file still asserts the nine `r001` write-set.
- Applicability population may write windows on **draft or published** so a successor can be published beside an already-windowed historical graph.
- Deliberate safeguards kept: Feb/Mar product policy on the parser, no automatic repin, no user-selected version, published graphs remain immutable.

## Disposable r001 → r002 proof

- Module: `scripts/src/db-harness/future-revision-lifecycle-proof.ts`.
- Wired into `pnpm --filter @workspace/scripts db-harness`.
- Fixture subject `R002X1` with explicitly synthetic outcomes (not Cambridge content).
- Demonstrates: import/publish/apply r001; pin a membership; import distinct r002; apply future window; publish without flipping DEFAULT; future session resolves r002; historical session and existing pin stay r001; DEFAULT promotion does not repin; overlapping published windows fail closed; published r001 cannot be overwritten; fixture deleted.

## Runbook

`docs/reference-data/syllabus-applicability/future-syllabus-revision-runbook.md`

Covers source verification, identity, immutable import, hashes, applicability, policy, disposable validation, publish vs default, resolver, Preview/Production gates, pin preservation, rollback. No secrets.

## Applicability expiry

Verified from `docs/reference-data/syllabus-applicability/population-manifest.json`. Data was **not** altered.

- 2028 Oct/Nov: Business 9609, Economics 9708
- 2029 Oct/Nov: History 9489, Computer Science 9618
- 2030 Oct/Nov: 9231, 9700, 9701, 9702, 9709

Successor research must start before those windows end. Expiry does not repin students.

## Security

- No RLS/grant redesign.
- Integration still refuses hosted URLs and does not echo them.
- CI does not inject Production credentials.
- Internal identities remain off the public assignment API (unchanged this slice).

## Automated verification

| Gate | Command | Result |
| --- | --- | --- |
| Syllabus unit | `pnpm --filter @workspace/scripts test:unit` | **41/41 PASS** (was 39) |
| Harness unit | `pnpm --filter @workspace/scripts test:harness` | **21/21 PASS** (was 20) |
| Migration drift | `pnpm run check:migrations` | **PASS** `count=16 head=0015_silent_sentinel` |
| API unit | `pnpm --filter @workspace/api-server test` | **146/146 PASS** |
| Frontend | `pnpm --filter @workspace/revision-platform test` then serial rerun | Contention timeouts on a parallel full run; serial `--maxWorkers=1` **227/227 PASS**. Authoritative count: **227/227 PASS** |
| Typecheck | `pnpm run typecheck` | **PASS** (4 workspace projects) |
| OpenAPI/codegen | `pnpm run check:codegen` | **PASS** (no generated diff) |
| `git diff --check` | `git diff --check` | **PASS** |
| Production-equivalent build | `pnpm --filter @workspace/revision-platform run build:vercel` | **PASS** |
| HTTP integration | `pnpm --filter @workspace/api-server test:integration` | Loopback guard **11/11 PASS**. Ordinary local suite **22 passed / 18 failed / 5 skipped** after loopback migrate to 0015 (catalogue seed / applicability / service shape). **Not labeled PASS.** |
| Disposable harness | `LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB=1 pnpm --filter @workspace/scripts db-harness` | **PASS** including empty→head migrate, journal match, C2B2 strict assignment, disposable r001→r002 lifecycle, and stack cleanup |

Do not treat skipped/failed HTTP integration as PASS.

## Diff review

- **Blocker:** none in-scope for merge-to-main (merge still owner-gated).
- **High:** ordinary local HTTP integration is still environment-dependent; CI relies on the disposable harness for lifecycle/migration proof.
- **Medium:** DEFAULT promotion for an already-published successor is still a constrained SQL/admin step (`publish` only publishes drafts). Documented in the runbook.
- **Low:** frontend full-suite timeouts under parallel load remain a local resource note, not a product defect.

## Hosted-state safety

- Production DB mutation: **NONE**
- Hosted schema change: **NONE**
- Vercel env change: **NONE**
- Production deployment: **NONE**
- Existing membership pins: **NONE**
- Real r002: **NOT CREATED**
- Slice 3D Preview `DATABASE_URL` override: **left alone**

## Remaining risks

- HTTP integration against a developer `lockedinapp` stack can fail if applicability/policy or catalogue seed is incomplete even after journal 0015.
- Disposable harness duration/Docker availability on CI.
- No owner final signoff. No Phase 6 close.

## Merge readiness

Ready for **owner review** on the feature branch. Not merged. Not pushed to `main`.

## Phase 6 status

- Slice 3D: CLOSED (prior)
- Slice 6.4: implemented on the feature branch
- Phase 6: **IN PROGRESS**
- Owner final signoff: **DO NOT CLAIM**
