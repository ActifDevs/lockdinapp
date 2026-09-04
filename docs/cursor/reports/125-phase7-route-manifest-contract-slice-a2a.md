# LOCKDIN — PHASE 7 ROUTE MANIFEST CONTRACT (SLICE A2A)

**Report:** 125

**Date:** 2026-09-04

**Status:** SLICE A2A OWNER-APPROVED — ROUTE-MANIFEST CONTRACT FROZEN

**Cross-References:**
- Report 120 — base product model
- Report 121 — official route evidence
- Report 122 — approved generic route/reference architecture
- Report 123 — frozen schema foundation (migration 0016)
- Report 124 — approved option-cardinality extension

**Implementation Performed by This Report:** Pure/read-only unified route-manifest schema, parser, exact weighting, semantic validation, canonicalization, SHA-256 hashing, in-memory + Lockdin read-only reference resolution, CLI, and synthetic tests. No publication, no DB mutation, no migration 0017.

**Final correction pass (same working tree):** Authoritative applicability-year coverage; repository-file + database read-only catalog adapters; locale-independent ordinal string ordering; explicit qualification-weight consistency and evidenceRef proofs.

**Final owner review:** APPROVE
**Architecture blockers:** ZERO
**A2A:** FROZEN
**A2B:** AUTHORIZED AFTER SUCCESSFUL COMMIT/PUSH

---

## 1. Baseline

| Fact | State |
| --- | --- |
| Branch | `main` |
| Baseline HEAD | `5523fe57fb5c46265fa3d58b503d964dd2a1818e` |
| origin/main | `5523fe57fb5c46265fa3d58b503d964dd2a1818e` |
| Working tree before A2A | CLEAN |
| Migration head | `0016_assessment_routes_and_study_options` |
| Migration count | 17 |

---

## 2. Files Changed

### Tooling (`scripts/src/route-manifest/`)
- `types.ts` — manifest / canonical types
- `errors.ts` — `RouteManifestError`, `RouteManifestValidationError`
- `weighting.ts` — exact scaled-BigInt decimal parser/formatter
- `ordering.ts` — locale-independent ordinal string comparator
- `parse.ts` — strict structural parser (unknown fields rejected)
- `validate.ts` — semantic validation (totals, cardinality, weight consistency, evidenceRefs)
- `canonicalize.ts` — deterministic ordinal ordering
- `hash.ts` — SHA-256 of canonical payload
- `resolve.ts` — catalog resolution + authoritative year coverage
- `catalog-loader.ts` — read-only Lockdin repository-file and database adapters
- `load.ts` — file load + validate/hash helpers
- `cli.ts` — validate / hash / canonicalize
- `index.ts` — public exports
- `__tests__/*` — focused suites + synthetic fixtures only

### Package wiring
- `scripts/package.json` — `route-manifest:validate|hash|canonicalize`, `test:route-manifest`

### Documentation
- `docs/cursor/reports/125-phase7-route-manifest-contract-slice-a2a.md` (this report)

Reports 120–124 were not edited. No migration / Drizzle / CSV changes.

---

## 3. Manifest Semantic Contract

Generic unified route/reference manifest (`schemaVersion: 1`):

| Field | Role |
| --- | --- |
| `subjectCode` | Four-digit Cambridge code |
| `syllabusRevisionKey` | Exact `{code}-rNNN` |
| `routeRevisionKey` | Route-reference revision identity |
| `sources[]` | Official evidence metadata (`sourceKey` unique) |
| `routes[]` | Canonical qualification routes |
| `studyOptionGroups[]` | Generic option groups with `minSelections` / `maxSelections` |
| `yearRotationMappings[]` | Optional year-sensitive overlays |
| `$schema` / `schema` | Authoring pointer only |
| `review` | Review metadata only |

No database primary IDs in author-facing manifests.

No subject-specific schema.

---

## 4. Component Reference Strategy

Semantic identity:

```text
paperCode + level
```

Matches repository natural key `(syllabus_version_id, paper_code, level)`.

Resolution is exact/fail-closed:

- 0 matches → reject
- >1 matches → reject
- never guess from qualification target
- `component.level` is source-graph occurrence context, not student qualification

Author sugar `applicablePaperCode` requires `applicableLevel` (or structured `applicableComponent`).

---

## 5. Unit Reference Strategy

Semantic identity:

```text
unitTitle
```

Matches repository natural key `(syllabus_version_id, title)`.

Resolution is exact/fail-closed:

- 0 matches → reject
- >1 matches → reject (no first-match)
- no DB IDs
- no `orderIndex` identity

Author sugar: bare title strings normalize to `{ unitTitle }`.

---

## 6. Exact Decimal Algorithm

- Input: exact decimal **text**
- Representation: scaled `BigInt` with denominator `10^4`
- Accepts equivalent forms `"20"`, `"20.0"`, `"20.00"`, `"20.0000"` → `"20.0000"`
- `"15.5"` → `"15.5000"`
- Rejects: zero, negative, `>100`, `>4` fractional digits, commas, exponents, signs
- **No JavaScript `Number` arithmetic for totals**

Route-total rule:

```text
exact sum of scaled weights == 100.0000
```

`99.9999` and `100.0001` fail. No epsilon.

---

## 7. Option Cardinality Validation (Report 124)

For every group:

```text
1 <= minSelections <= maxSelections
maxSelections <= DISTINCT(options)
minSelections <= DISTINCT(options)
```

Examples proven synthetically:

| Shape | Result |
| --- | --- |
| 1/1 with ≥1 options | PASS |
| 2/2 with 4 options | PASS |
| 2/3 with 3 options | PASS |
| 2/3 with 2 options | FAIL |
| min=0 / max&lt;min | FAIL |

User selected-row count enforcement is **not** implemented (deferred to study-configuration RPC).

---

## 8. Year-Mapping Validation / Coverage

Structural checks (`validate.ts`):

- known `optionKey`
- unit belongs to that option
- component semantic reference present
- logical uniqueness `(optionKey, examYear, unitTitle)`
- conflict detection when same logical key maps different components
- every route `evidenceRef` resolves to a declared `sourceKey` (prefix before `#`)
- duplicate `sourceKey` rejected

**Authoritative coverage** (`resolve.ts` against a `ReferenceCatalog`):

When `yearRotationMappings` is non-empty:

1. Governed options = distinct `optionKey` values appearing in mappings
2. **Required years = inclusive integers from the exact syllabus version applicability window** (`applicableFromYear`…`applicableToYear`) — **not** merely years already present in mapping rows
3. For every governed option × required applicability year × unit of that option: exactly one mapping required
4. Unset applicability windows fail closed (`missing_applicability_window`)
5. Mapping years outside the window reject (`unsupported_exam_year`)

This rejects an entirely omitted required year (e.g. applicability 2027–2029 with only 2027/2028 mappings) and partial year coverage (one unit missing in 2029).

Proven synthetically:

| Case | Result |
| --- | --- |
| Complete 2027/2028/2029 | PASS |
| Entire 2029 omitted | FAIL |
| One unit missing in 2029 | FAIL |
| 2026 mapping | FAIL |
| 2030 mapping | FAIL |

No History-specific branches. No fake yearly syllabus versions.

---

## 8b. Qualification-Weight Consistency

Within one route-reference contract, the same resolved source component under the same `qualificationTarget` must carry the same `qualificationWeightingPercent` across routes.

- AS route component X = 40.0000 and A-Level route component X = 20.0000 → **PASS** (targets differ)
- Two `a_level` routes with component X = 20.0000 vs 25.0000 → **FAIL**

No exception field is implemented.

---

## 9. Canonicalization Ordering

String keys use **ordinal JavaScript code-unit ordering** (`a < b ? -1 : a > b ? 1 : 0` via `compareOrdinal` in `ordering.ts`).

**No `localeCompare` / ICU / process-locale collation** participates in the hash contract.

| Collection | Order |
| --- | --- |
| sources | `sourceKey` (ordinal) |
| routes | `orderIndex`, then `key` (ordinal) |
| route components | `orderIndex`, then `paperCode\|level` (ordinal) |
| evidenceRefs | ordinal |
| option groups | `orderIndex`, then `key` (ordinal) |
| options | `orderIndex`, then `key` (ordinal) |
| units | `unitTitle` (ordinal) |
| year mappings | `examYear`, `optionKey`, `unitTitle`, `paperCode\|level` (ordinal) |

---

## 10. Hash Boundary

### HASHED fields
- `schemaVersion`, `subjectCode`, `syllabusRevisionKey`, `routeRevisionKey`
- entire `sources` records
- routes including student-facing labels, targets, pathway, progression, evidenceRefs
- route components including roles and canonical four-digit weightings
- option groups including labels, applicability, `minSelections`, `maxSelections`
- options including labels/descriptions and unit titles
- year mappings including assessment roles

### NON-HASHED metadata
- `$schema` / `schema` file pointer
- `review` block (`status`, `reviewers`, `reviewedAt`, `auditReport`)
- incidental JSON property / array input ordering (normalized away before hash)

Algorithm: SHA-256 over `JSON.stringify(canonicalPayload)` → 64-char lowercase hex.

---

## 11. Read-Only Resolver Design

`ReferenceCatalog` supplies exact syllabus versions with:

- `subjectCode` + `logicalRevisionKey`
- applicability year bounds
- component list (`paperCode` + `level`)
- unit list (`unitTitle`)

Never resolves via DEFAULT version, latest version, current year, or client DB IDs.

Adapters:

| Adapter | Module | Role |
| --- | --- | --- |
| Synthetic in-memory catalog | tests / `ReferenceCatalog` | retained for focused fixtures |
| Repository-file loader | `loadReferenceCatalogFromRepositoryFiles` | population-manifest applicability + CSV normalize (committed Lockdin reference files) |
| Database loader | `loadReferenceCatalogFromDatabase` | SELECT-only from subjects / syllabus_versions / assessment_components / syllabus_units |

File-adapter tests prove exact 9702-r001 resolution against real Lockdin CSVs/manifest without persistent fixture residue and without writing route/reference rows.

---

## 12. CLI Commands

```text
pnpm --filter @workspace/scripts route-manifest:validate -- --file=<path>
pnpm --filter @workspace/scripts route-manifest:hash -- --file=<path>
pnpm --filter @workspace/scripts route-manifest:canonicalize -- --file=<path>
```

Modes: `validate` | `hash` | `canonicalize`

Hash/canonicalize require successful structural+semantic validation.

Publication / import / apply / hosted commands: **NONE** in A2A.

---

## 13. Tests Run

| Suite | Result |
| --- | --- |
| `pnpm --filter @workspace/scripts test:route-manifest` | PASS (34) |
| `pnpm check:migrations` | PASS — count=17 head=`0016_...` |
| `pnpm --filter @workspace/scripts test:harness` | PASS |
| `pnpm --filter @workspace/scripts test:unit` | PASS |
| `pnpm typecheck` | PASS |
| Nine r001 content-hash vs population-manifest | PASS |

Coverage includes authoritative year omission, repository-file adapter resolution, ordinal hashing, weight consistency, and evidenceRef/source proofs.

Synthetic fixtures only for route contracts — no real 9231/9489/… or seven-candidate manifests authored as product data.

---

## 14. Database / Hosted

| Check | Result |
| --- | --- |
| Migration 0017 | ABSENT |
| Schema changes | NONE |
| Persistent route/reference inserts | 0 |
| Hosted changes | NONE |
| CSV changes | NONE |

---

## 15. Deferred A2B Work

- Transactional route-reference publication/import
- Route-set / route / option / year-mapping insertion
- Publication lifecycle transition tooling
- Immutable published/retired contract enforcement triggers
- Trusted publication authority
- Actual current-nine manifests
- Actual candidate-seven manifests
- Hosted apply

---

## 16. Slice Verdict

**PASS — OWNER APPROVED / ROUTE-MANIFEST CONTRACT FROZEN**

**Recommendation:** BEGIN SLICE A2B — TRANSACTIONAL ROUTE-REFERENCE PUBLICATION, LIFECYCLE ENFORCEMENT AND CONTRACT IMMUTABILITY.
