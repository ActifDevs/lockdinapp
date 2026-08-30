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

### Failure matrix (ordinary `lockedinapp` stack, 22/18/5)

| Class | Tests | Cause |
| --- | --- | --- |
| A. Stale Phase 6 contract | membership columns omitted `intended_exam_*`; replace-fn required pre-0015 `ON CONFLICT` only | Suite still asserted Slice 3 membership DDL |
| A+B. Strict session + missing applicability | onboarding 400, empty memberships, pin-preserve 400, topic-progress 400, mixed override 400 | Structured session against rows with no applicable window/policy |
| A. Pin-aware write contract | past-paper create 400; task topic-progress 400 | Writes require a membership pin |
| C. Cascade | past-paper list/dashboard/delete | Attempt IDs never created |
| F. Superseded SQL | replace privilege test | 0015 apply uses `NOT EXISTS`, not `ON CONFLICT` |
| E. Application regression | none | None proven |

### Authoritative path (Option A)

Same HTTP/auth/RLS files. Ordinary `lockedinapp` is no longer a valid target.

1. Dedicated `lockdin-db-harness` only (ports 55421/55422). Hosted and ordinary stacks fail closed.
2. Empty → committed journal head (currently 0015).
3. Synthetic catalogue `HTTP01`–`HTTP06` (applicability 2020–2033, Feb/Mar denied, two topics, components). Not Cambridge content.
4. Vitest HTTP suite (45 tests).
5. Seed removed; schema disposed.

Commands: `pnpm --filter @workspace/scripts db-harness` and `pnpm --filter @workspace/api-server test:integration`.

### Equivalent coverage

HTTP 45/45 plus harness proofs cover migrate 0015, catalogue, May/June, Oct/Nov, Feb/Mar deny, missing session, out-of-range, resolver, override, pin/session retain, no repin, safe errors, auth, RLS, atomic replace, no client `syllabusVersionId`.

## CI

- `.github/workflows/pr-quality.yml`
- Job `quality`: typecheck, API, frontend **serialized** (`--pool=forks --maxWorkers=1`; no global timeout inflation), syllabus units, harness unit + drift, codegen, `git diff --check`.
- Job `disposable-db`: full harness including the authoritative HTTP/auth/RLS suite. No Production secrets. Hosted `DATABASE_URL` fails closed.

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
| Frontend | `vitest run --pool=forks --maxWorkers=1` | **227/227 PASS** (CI uses the same serialization) |
| Typecheck | `pnpm run typecheck` | **PASS** (4 workspace projects) |
| OpenAPI/codegen | `pnpm run check:codegen` | **PASS** (no generated diff) |
| `git diff --check` | `git diff --check` | **PASS** |
| Production-equivalent build | `pnpm --filter @workspace/revision-platform run build:vercel` | **PASS** |
| Authoritative HTTP integration | `pnpm --filter @workspace/api-server test:integration` | Loopback guard **11/11 PASS**. HTTP **45/45 PASS** on disposable harness + seed. **0 skipped.** |
| Disposable harness | `LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB=1 pnpm --filter @workspace/scripts db-harness` | **PASS** empty→head, journal, C2B2, r001→r002, syllabus DB, **authoritative HTTP/auth/RLS**, cleanup |

## Diff review

- **Blocker:** none.
- **High:** none remaining for the integration gap.
- **Medium:** DEFAULT flip on an already-published successor remains an explicit owner SQL/admin step. `publish` only publishes drafts. Documented as sufficient Phase 6 operations; no new promotion system.
- **Low:** parallel frontend runs can still hit 5s contention locally; CI is serialized.

## Hosted-state safety

- Production DB mutation: **NONE**
- Hosted schema change: **NONE**
- Vercel env change: **NONE**
- Production deployment: **NONE**
- Existing membership pins: **NONE**
- Real r002: **NOT CREATED**
- Slice 3D Preview `DATABASE_URL` override: **left alone**

## Remaining risks

- Disposable harness needs Docker on CI (~60s locally for the full proof).
- No owner final signoff. No Phase 6 close.

## Merge readiness

Ready for **owner review** on the feature branch. Integration gap closed. Not merged. Not pushed to `main`.

## Phase 6 status

- Slice 3D: CLOSED (prior)
- Slice 6.4: implemented on the feature branch
- Phase 6: **IN PROGRESS**
- Owner final signoff: **DO NOT CLAIM**
