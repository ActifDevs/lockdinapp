# LOCKDIN — PHASE 7 ROUTE PUBLICATION + IMMUTABILITY (SLICE A2B)

**Report:** 126

**Date:** 2026-09-04

**Status:** FROZEN — OWNER APPROVED FOR COMMIT

**OWNER APPROVAL:** APPROVED  
**SLICE STATUS:** FROZEN  
**0017:** OWNER APPROVED  
**ROUTE REVISION IDENTITY:** PASS — `UNIQUE (syllabus_version_id, route_revision_key)` (present in frozen 0016)  
**Hosted apply:** NONE

**Cross-References:**
- Report 122 — approved route/reference architecture
- Report 123 — frozen schema foundation (migration 0016); deferred immutability triggers to A2
- Report 124 — option cardinality
- Report 125 — frozen A2A route-manifest contract / hashing / validation

---

## 0. Original Conflict Finding (Preserved)

### A2B SCHEMA CONTRACT CONFLICT (initial stop)

A2B initially stopped safely because frozen migration `0016` had no published/retired immutability triggers/functions. Report 123 deferred that machinery to Slice A2. Application-only guards cannot satisfy direct-SQL mutation rejection. Editing 0016 and smuggling triggers into test bootstrap were forbidden.

**0016 was not modified. No unauthorized 0017 was created at the conflict stop.**

---

## 1. Owner Decision

| Decision | Outcome |
| --- | --- |
| 0017 REQUIRED | **YES** |
| Narrow additive migration | **AUTHORIZED** |
| Filename | `lib/db/migrations/0017_route_reference_immutability.sql` |
| Amendments beyond original Report 126 proposal | **ACCEPTED** (see §2) |

---

## 2. Owner Amendments Implemented in 0017

Beyond the original UPDATE/DELETE-only proposal:

1. **Child immutability includes INSERT** — new dependent rows cannot be appended to published/retired contracts.
2. **Route-set INSERT only as `draft`** — reject direct INSERT of `published` or `retired`.
3. **Exact lifecycle state machine** (see §4).
4. **published → retired** may change **only** `lifecycle`; semantic/hash/source/version/`published_at`/`created_at` must remain unchanged. No invented `retired_at`.
5. **Child UPDATE** requires both OLD and NEW owning route sets to be `draft` (blocks ownership moves into/out of published/retired).
6. Ownership resolution follows frozen 0016 relationships (including option → route set for units/year mappings). Fail closed if ownership cannot be resolved.

---

## 3. Baseline

| Fact | State |
| --- | --- |
| Branch | `main` |
| Baseline HEAD | `5ee7efe39ab8ab2f63c49436a3b1c6aee774d614` |
| origin/main | `5ee7efe39ab8ab2f63c49436a3b1c6aee774d614` |
| Migration head (after 0017) | `0017_route_reference_immutability` |
| Migration count | **18** |
| 0016 modified | **NO** (hash unchanged) |
| 0017 hosted apply | **NONE** |
| Commit / push | **NONE** |

---

## 4. Route-Set Lifecycle State Machine (Enforced)

| Transition / event | Result |
| --- | --- |
| INSERT `draft` | ALLOW |
| INSERT `published` / `retired` | REJECT |
| `draft` → `draft` | ALLOW |
| `draft` → `published` | ALLOW |
| `draft` → `retired` | REJECT |
| `published` → `retired` (lifecycle only) | ALLOW |
| `published` → `draft` | REJECT |
| `published` → `published` (any mutation) | REJECT |
| `retired` → `*` | REJECT |
| DELETE `draft` | ALLOW |
| DELETE `published` / `retired` | REJECT |

---

## 5. Child-Graph Immutability

Protected tables:

- `assessment_routes`
- `assessment_route_components`
- `assessment_study_option_groups`
- `assessment_study_options`
- `assessment_study_option_units`
- `assessment_study_option_year_mappings`

| Event | Rule |
| --- | --- |
| INSERT | NEW owner lifecycle must be `draft` |
| DELETE | OLD owner lifecycle must be `draft` |
| UPDATE | OLD and NEW owner lifecycles must both be `draft` |

Ownership:

- Direct `route_set_id` where present
- Option units / year mappings → `assessment_study_options.route_set_id` via option id

Clear errors:

- `published/retired route-reference contract is immutable`
- `route-reference child rows may only be mutated while owning route set is draft`

Functions use `SET search_path = ''` and schema-qualified objects. No SECURITY DEFINER.

---

## 6. Trusted Publication Authority

| Item | Choice |
| --- | --- |
| Mechanism | Repository CLI / TypeScript operator tooling (parity with syllabus publish) |
| Safety gate | `LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION=1` |
| Database | Loopback `DATABASE_URL` / `DIRECT_DATABASE_URL` required |
| Forbidden flags | `--hosted`, `--production`, `--remote`, `--prod` |
| Student APIs | Not exposed |
| RLS | Unchanged — anon/authenticated still SELECT-only on reference tables |

Command:

```bash
LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION=1 \
  pnpm --filter @workspace/scripts route-manifest:publish -- --file=<path>
# optional: --dry-run
```

---

## 7. Publication Transaction Algorithm

1. Parse + A2A semantic validate + canonicalize + hash (single A2A implementation; no second hash algorithm).
2. Resolve exact subject/version/components/units via DB catalog (IDs required).
3. Begin transaction; `SELECT … FROM syllabus_versions WHERE id = $version FOR UPDATE`.
4. Idempotency:
   - same version + same `routeRevisionKey` + same `manifest_sha256` + published → **NO-OP / return existing**
   - same revision key + different hash → **FAIL CLOSED**
5. Insert complete **draft** graph; persist exact `manifest_sha256` and canonical `source_manifest` JSONB.
6. Re-read draft in-transaction; verify counts, route totals `100.0000`, cardinality, FKs, hash, revision key.
7. If replacing: retire previous published set, then publish new set (same transaction).
8. On any failure (including after retire before publish): **ROLL BACK** — old published set preserved.

`user_subjects` is never touched.

---

## 8. Manifest Storage Contract

| Field | Stored value |
| --- | --- |
| `manifest_sha256` | Exact A2A lowercase SHA-256 of canonical semantic JSON |
| `source_manifest` | A2A **canonical semantic manifest** (hashed field set only) |

Excluded from storage:

- `$schema` / review metadata (not hashed)
- local file paths, machine metadata, secrets, transient runtime fields

---

## 9. Replacement + Retirement Semantics

- New `routeRevisionKey` for same syllabus version: insert/verify new draft → retire old published → publish new (atomic).
- Retired remains readable for memberships already referencing its routes.
- No membership rewrite, route backfill, or syllabus repin.

---

## 10. Concurrency

Per-version serialization via `SELECT … FOR UPDATE` on the exact `syllabus_versions` row inside the publication transaction.

Harness proof: concurrent identical republish both settle as NO-OP; never two published sets.

---

## 11. Dry-Run

`--dry-run` parses, validates, resolves, hashes, reports planned counts and current published state, performs **zero writes**.

---

## 12. Tests / Proofs

| Suite | Result |
| --- | --- |
| Dedicated `db-harness` (incl. 0017 immutability + A2B publication) | **PASS** |
| `pnpm check:migrations` | PASS — count=18 head=`0017_route_reference_immutability` |
| `pnpm --filter @workspace/scripts test:route-manifest` | PASS (38) |
| `pnpm --filter @workspace/scripts test:harness` | PASS (21) |
| `pnpm --filter @workspace/scripts test:unit` | PASS (41) |
| `pnpm typecheck` | PASS |
| Synthetic fixtures after harness | **0** persistent |
| Real subject manifests published | **NONE** |
| Hosted changes | **NONE** |

---

## 12a. ROUTE REVISION IDENTITY

| Item | Value |
| --- | --- |
| Database invariant | `UNIQUE (syllabus_version_id, route_revision_key)` |
| Constraint name | `assessment_route_sets_version_revision_unique` |
| Status | **PRESENT** (frozen migration 0016; mirrored in Drizzle `assessmentRouteSets.ts`) |
| Added in 0017 | **NO** — already enforced; no schema change required |
| Proof | **PASS** |

Focused local DB proof (A2B harness):

| Case | Result |
| --- | --- |
| Same syllabus version + same `routeRevisionKey` | REJECT (`assessment_route_sets_version_revision_unique`) |
| Different syllabus version + same `routeRevisionKey` | ALLOW |
| Same syllabus version + different `routeRevisionKey` | ALLOW |
| Publication same revision + same hash | NO-OP |
| Publication same revision + different hash | REJECTED |
| Replacement with new `routeRevisionKey` | PASS |

Catalog check: `pg_constraint` confirms unique constraint on `public.assessment_route_sets`.

---

## 13. Existing Data Regression

| Check | Result |
| --- | --- |
| Nine r001 content / CSV | UNCHANGED |
| Existing memberships | UNCHANGED |
| `assessment_route_id` backfill | NONE |
| 0016 file hash | UNCHANGED |

---

## 14. Files Changed (Reviewable Diff Only)

- `lib/db/migrations/0017_route_reference_immutability.sql`
- `lib/db/migrations/meta/_journal.json`
- `scripts/src/route-manifest/publish.ts`
- `scripts/src/route-manifest/publish-safety.ts`
- `scripts/src/route-manifest/publication-proof.ts`
- `scripts/src/route-manifest/cli.ts` / `index.ts` / package scripts
- `scripts/src/db-harness/route-immutability-proof.ts`
- `scripts/src/db-harness/trigger-bypass-cleanup.ts`
- A1 foundation proof adapted for draft-first insert + trigger-aware cleanup
- Report 126 (this file)

---

## 15. Slice Verdict

**PASS — OWNER APPROVED / A2B + 0017 FROZEN**

| Freeze field | Value |
| --- | --- |
| OWNER APPROVAL | APPROVED |
| SLICE STATUS | FROZEN |
| Publication tooling | FROZEN |
| Immutability contract | FROZEN |
| Route revision identity | FROZEN / PASS |
| 0017 | OWNER APPROVED / FROZEN |
| Hosted apply | NONE |

**Recommendation:** A2B CLOSED. NEXT: BEGIN SLICE B — 16-SUBJECT ROUTE / OPTION / APPLICABILITY / YEAR-MAPPING REFERENCE-DATA ADOPTION PLANNING (separate authorization).

Do not apply 0017 to Preview/Production until separately authorized.
Do not author real subject route manifests until Slice B is authorized.
