# LOCKDIN — PHASE 7 ROUTE SCHEMA FOUNDATION (SLICE A1)

**Report:** 123

**Date:** 2026-09-04

**Status:** SLICE A1 OWNER-APPROVED — SCHEMA FOUNDATION FROZEN

**Cross-References:**
- **Architecture (owner-approved):** Report 122 (`docs/cursor/reports/122-phase7-route-architecture-evidence-amendment.md`)
- **Cardinality amendment (owner-approved):** Report 124 (`docs/cursor/reports/124-phase7-study-option-cardinality-amendment.md`)
- **Evidence audit:** Report 121
- **Base architecture:** Report 120

**Implementation Performed by This Report:** Controlled local/repository schema foundation only. No hosted Supabase apply, no route data import.

**Final owner review:** APPROVE
**Architecture blockers:** ZERO
**Migration 0016:** APPROVED / FROZEN for repository commit
**Slice A2:** AUTHORIZED AFTER SUCCESSFUL COMMIT/PUSH

**Amendment note (Report 124):** After the first A1 draft implemented Report 122’s then-correct single-select uniqueness, owner-approved evidence from candidate subjects required generic `min_selections` / `max_selections` and multi-option selection uniqueness. The FINAL A1 schema below includes that patch inside the same migration `0016` (no `0017`).

---

## 1. Baseline

| Fact | State |
| --- | --- |
| Branch | `main` |
| Baseline HEAD | `0318a340b0577de8e4eda031d361648fd4dc979d` |
| origin/main | `0318a340b0577de8e4eda031d361648fd4dc979d` |
| Preflight note | Working tree was dirty with an incomplete Slice A1 draft. Owner authorized Option 2: continue from that draft, audit against Report 122, complete, verify. |
| Prior migration head | `0015_silent_sentinel` (16 migrations) |
| Migrations 0000–0015 | Unchanged |

---

## 2. Files Changed

### Migration / journal
- `lib/db/migrations/0016_assessment_routes_and_study_options.sql` (new)
- `lib/db/migrations/meta/_journal.json` (adds idx 16)

### Drizzle schema
- `lib/db/src/schema/assessmentRouteSets.ts` (new)
- `lib/db/src/schema/assessmentRoutes.ts` (new)
- `lib/db/src/schema/assessmentRouteComponents.ts` (new)
- `lib/db/src/schema/assessmentStudyOptionGroups.ts` (new)
- `lib/db/src/schema/assessmentStudyOptions.ts` (new)
- `lib/db/src/schema/assessmentStudyOptionUnits.ts` (new)
- `lib/db/src/schema/assessmentStudyOptionYearMappings.ts` (new)
- `lib/db/src/schema/userSubjectOptionSelections.ts` (new)
- `lib/db/src/schema/assessmentComponents.ts` — add `UNIQUE (id, syllabus_version_id)`
- `lib/db/src/schema/syllabusUnits.ts` — add `UNIQUE (id, syllabus_version_id)`
- `lib/db/src/schema/userSubjects.ts` — add nullable `assessment_route_id` + parent unique + composite FK
- `lib/db/src/schema/index.ts` — export new tables

### Tests / harness
- `scripts/src/db-harness/route-schema-foundation-proof.ts` (new)
- `scripts/src/db-harness/__tests__/route-schema-foundation.test.ts` (new)
- `scripts/src/db-harness/index.ts` — wire route-schema proof into dedicated harness
- `scripts/src/db-harness/verify.ts` — expect new tables/policies; RLS on route-reference tables; `assessment_route_id` column
- `artifacts/api-server/src/routes/profile.integration.test.ts` — membership column/constraint expectations for 0016

### Documentation
- `docs/cursor/reports/123-phase7-route-schema-foundation-slice-a1.md` (this report)
- `docs/cursor/reports/124-phase7-study-option-cardinality-amendment.md` (cardinality amendment; patches same A1 diff)

Reports 120–122 were not edited.

---

## 3. Migration

| Fact | Value |
| --- | --- |
| Created | YES |
| File | `lib/db/migrations/0016_assessment_routes_and_study_options.sql` |
| Migration count | 17 |
| Migration head | `0016_assessment_routes_and_study_options` |
| Additive only | YES |
| Hosted applied | NO |
| Commit | NONE |
| Push | NONE |

---

## 4. Table Inventory

1. **`assessment_route_sets`** — contract root (`lifecycle` draft/published/retired; `route_revision_key`; nullable draft `manifest_sha256` / `source_manifest`; `published_at`).
2. **`assessment_routes`** — canonical routes per set.
3. **`assessment_route_components`** — route↔component with `qualification_weighting_percent numeric(7,4)`.
4. **`assessment_study_option_groups`** — generic option groups (no History-specific names) with `min_selections` / `max_selections` cardinality metadata.
5. **`assessment_study_options`** — selectable options within a group.
6. **`assessment_study_option_units`** — option → syllabus unit.
7. **`assessment_study_option_year_mappings`** — year-sensitive option/unit/component allocation.
8. **`user_subjects`** — additive nullable `assessment_route_id`.
9. **`user_subject_option_selections`** — multiple distinct options per group supported; duplicate same-option selection prevented; no `is_dormant`.

Expected row counts after migration alone: all new reference/selection tables **0**; legacy memberships retain `assessment_route_id IS NULL`.

### Option-group cardinality (Report 124)

| Column | Type | Constraints |
| --- | --- | --- |
| `min_selections` | `integer NOT NULL` | `>= 1` |
| `max_selections` | `integer NOT NULL` | `>= min_selections` |

No silent `1/1` default. Manifest authoring must supply intended cardinality.

Selected-row count against min/max is **not** a database CHECK in A1; it is deferred to the atomic study-configuration RPC.

### Selection uniqueness (Report 124)

| Rule | State |
| --- | --- |
| Old one-selection-per-group uniqueness `(user_id, subject_id, option_group_id)` | **REMOVED** |
| New uniqueness / PK `(user_id, subject_id, option_group_id, option_id)` | **PRESENT** |
| Multiple distinct options in one group | **SUPPORTED** |
| Duplicate identical option | **REJECTED** |

---

## 5. Composite FK Matrix

### Parent candidate keys added/exposed

| Parent | Candidate key |
| --- | --- |
| `assessment_components` | `UNIQUE (id, syllabus_version_id)` |
| `syllabus_units` | `UNIQUE (id, syllabus_version_id)` |
| `assessment_route_sets` | `UNIQUE (id, syllabus_version_id)` |
| `assessment_routes` | `UNIQUE (id, route_set_id, syllabus_version_id)` |
| `assessment_routes` | `UNIQUE (id, syllabus_version_id)` |
| `assessment_study_option_groups` | `UNIQUE (id, route_set_id, syllabus_version_id)` |
| `assessment_study_option_groups` | `UNIQUE (id, syllabus_version_id)` |
| `assessment_study_options` | `UNIQUE (id, syllabus_version_id)` |
| `assessment_study_options` | `UNIQUE (id, group_id, syllabus_version_id)` |
| `assessment_study_option_units` | `UNIQUE (option_id, unit_id, syllabus_version_id)` (+ PK `(option_id, unit_id)`) |
| `user_subjects` | `UNIQUE (user_id, subject_id, syllabus_version_id)` |

### Composite foreign keys

| Child | Columns | Parent |
| --- | --- | --- |
| `assessment_routes` | `(route_set_id, syllabus_version_id)` | `assessment_route_sets(id, syllabus_version_id)` |
| `assessment_route_components` | `(route_id, route_set_id, syllabus_version_id)` | `assessment_routes(id, route_set_id, syllabus_version_id)` |
| `assessment_route_components` | `(component_id, syllabus_version_id)` | `assessment_components(id, syllabus_version_id)` |
| `assessment_study_option_groups` | `(route_set_id, syllabus_version_id)` | `assessment_route_sets(id, syllabus_version_id)` |
| `assessment_study_option_groups` | `(applicable_component_id, syllabus_version_id)` | `assessment_components(id, syllabus_version_id)` (nullable component) |
| `assessment_study_options` | `(group_id, route_set_id, syllabus_version_id)` | `assessment_study_option_groups(id, route_set_id, syllabus_version_id)` |
| `assessment_study_option_units` | `(option_id, syllabus_version_id)` | `assessment_study_options(id, syllabus_version_id)` |
| `assessment_study_option_units` | `(unit_id, syllabus_version_id)` | `syllabus_units(id, syllabus_version_id)` |
| `assessment_study_option_year_mappings` | `(option_id, unit_id, syllabus_version_id)` | `assessment_study_option_units(option_id, unit_id, syllabus_version_id)` |
| `assessment_study_option_year_mappings` | `(component_id, syllabus_version_id)` | `assessment_components(id, syllabus_version_id)` |
| `user_subjects` | `(assessment_route_id, syllabus_version_id)` | `assessment_routes(id, syllabus_version_id)` (nullable route) |
| `user_subject_option_selections` | `(user_id, subject_id, syllabus_version_id)` | `user_subjects(...)` **ON DELETE CASCADE** |
| `user_subject_option_selections` | `(option_id, option_group_id, syllabus_version_id)` | `assessment_study_options(id, group_id, syllabus_version_id)` |

**All enforceable:** YES — verified by fresh local migration 0000→0016 and route-schema foundation proof.

Critical keys that previously blocked architecture approval:
- `assessment_routes UNIQUE (id, syllabus_version_id)` — present
- `user_subjects UNIQUE (user_id, subject_id, syllabus_version_id)` — present

---

## 6. Exact Weighting

| Layer | Representation |
| --- | --- |
| PostgreSQL | `numeric(7,4)` |
| Range check | `NULL` allowed (draft) OR `0.0000 < value <= 100.0000` |
| Drizzle (0.45.2) | `numeric(..., { precision: 7, scale: 4, mode: "string" })` |
| Floating-point canonical use | **NONE** |
| Proven storage | `"15.5000"` round-trips exactly in local proof |

Publication total = `100.0000` is **deferred** to Slice A2 tooling (not a row-level DB constraint in A1).

---

## 7. Lifecycle Foundation

| Rule | Enforced in 0016? |
| --- | --- |
| Enums `draft` / `published` / `retired` | YES |
| Published requires `published_at` + `manifest_sha256` | YES (CHECK) |
| At most one published set per syllabus version | YES (partial unique index) |
| Non-empty `route_revision_key` | YES |
| Automatic replacement/migration of memberships | NO (deferred) |
| Immutable published/retired row trigger machinery | **NO — deferred to Slice A2** |

**Slice A2 remaining enforcement requirement:** prevent UPDATE/DELETE mutation of published and retired route-reference contract rows (and dependent route/option graph rows) except through an approved publication workflow. A1 intentionally does not invent trigger machinery.

---

## 8. RLS / Privilege Decisions

Pattern matches existing Lockdin reference/user conventions:

| Table class | RLS | Grants | Policies |
| --- | --- | --- | --- |
| Route/reference tables (7) | ENABLED | `REVOKE ALL` from PUBLIC/anon/authenticated; `GRANT SELECT` to authenticated | SELECT for authenticated (`USING (true)`) |
| `user_subject_option_selections` | ENABLED | same revoke; `GRANT SELECT` to authenticated | SELECT own: `(SELECT auth.uid()) = user_id` |
| Direct browser writes | Denied | No INSERT/UPDATE/DELETE grants to anon/authenticated | No write policies |

Privileged mutation RPCs (`lockdin_update_study_configuration`, `lockdin_complete_onboarding_v2`, `lockdin_replace_user_subjects_v2`) were **not** created in Slice A1.

---

## 9. Existing Data / Content Integrity

| Check | Result |
| --- | --- |
| Existing r001 graphs changed | NO |
| CSV files changed | NO (`git` clean under `data/syllabi`) |
| `content_sha256` of nine r001 CSVs vs population-manifest | **ALL MATCH** |
| Existing memberships repinned | NO |
| `assessment_route_id` backfilled | NO |
| New route/option/year rows inserted by migration | 0 |

Exact hash verification (local CSV → normalize → hash vs `docs/reference-data/syllabus-applicability/population-manifest.json`):

- `9231-r001` … `9709-r001`: **MATCH** (all nine)

---

## 10. Tests Run

| Suite | Result |
| --- | --- |
| `pnpm check:migrations` | PASS — count=17 head=`0016_assessment_routes_and_study_options` |
| `pnpm --filter @workspace/scripts test:harness` | PASS (21) |
| `pnpm --filter @workspace/scripts test:unit` | PASS (41) |
| `pnpm typecheck` | PASS |
| Nine r001 content-hash vs population-manifest | PASS |
| `LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB=1 pnpm --filter @workspace/scripts db-harness` | PASS |

Harness highlights:
- Fresh dedicated local stack only (ports 55421/55422, project `lockdin-db-harness`)
- Migrations 0000→0016 applied
- Route schema foundation proof (version integrity, option-group cardinality metadata, multi-selection uniqueness, numeric weighting, year mapping, cascade ownership, legacy NULL route)
- Selected-count min/max enforcement explicitly deferred (DB proves metadata bounds only)
- Syllabus DB integration + HTTP/auth/RLS integration
- Synthetic fixtures cleaned; stack disposed

---

## 11. Deferred Work (NOT DONE)

Slice A2 (authorized after successful A1 freeze) must deliver:

- Route-manifest schema/parser
- Canonical `route_manifest_sha256` hashing (exact fixed-scale weighting serialization)
- Manifest publication/import tooling
- Publication total-weight validation (= `100.0000`)
- Option/group/cardinality publication validation, including satisfiable cardinality:
  `maxSelections <= number of distinct valid options in the option group`
  (publication-time validation only — **not** a database row-level CHECK)
- Year-mapping publication validation
- Immutable published/retired contract enforcement triggers
- Actual 34 routes + History/Geography/Psychology/Sociology option/year mapping data

Still deferred beyond A2 schema tooling:

- Atomic selected-count enforcement (`min_selections <= COUNT(DISTINCT option) <= max_selections`) inside study-configuration RPC
- Route preview API
- Atomic study-configuration RPC
- Onboarding v2 / membership replacement v2
- Legacy route classification/backfill
- Frontend route UX / Past Papers filtering / Subject Detail relevance
- New seven subject adoption/import
- Hosted migration apply

---

## 12. Scope Controls

| Control | Observed |
| --- | --- |
| Hosted apply | NONE |
| Route data | NONE |
| Frontend/API product changes | NONE (test expectation update only) |
| Unexpected unrelated files | NONE |
| Commit | AUTHORIZED (this freeze) |
| Push | AUTHORIZED (this freeze) |

---

## 13. Slice Verdict

**PASS — OWNER APPROVED / SCHEMA FOUNDATION FROZEN**

**Recommendation:** BEGIN SLICE A2 — ROUTE MANIFEST SCHEMA, CANONICAL HASHING, VALIDATION, PUBLICATION TOOLING AND CONTRACT IMMUTABILITY.
