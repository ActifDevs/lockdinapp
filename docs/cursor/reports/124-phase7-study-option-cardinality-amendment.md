# LOCKDIN — PHASE 7 STUDY-OPTION CARDINALITY AMENDMENT

**Report:** 124

**Date:** 2026-09-04

**Status:** OWNER-APPROVED ARCHITECTURE AMENDMENT — FINAL OWNER REVIEW PASSED — INCLUDED IN A1 FREEZE

**Cross-References:**
- **Architecture (owner-approved):** Report 122 (`docs/cursor/reports/122-phase7-route-architecture-evidence-amendment.md`)
- **Slice A1 implementation:** Report 123 (`docs/cursor/reports/123-phase7-route-schema-foundation-slice-a1.md`)
- **Evidence:** seven-subject syllabus-family pre-import review (Geography 9696, Psychology 9990, Sociology 9699, and remaining candidates)

**Implementation Performed by This Report:** Additive patch to Slice A1 migration `0016`, matching Drizzle schema, focused local proofs, and Report 123 final description. No hosted apply, no migration `0017`.

**Final owner review:** APPROVE (together with Slice A1 freeze)

---

## 1. Why This Amendment Exists

Report 122's single-select constraint was correct for the evidence available at the time of approval. Across the nine current subjects, all identified persistent study-option groups were single-select, so v1 was constrained conceptually to:

```text
minSelections = 1
maxSelections = 1
```

Slice A1 faithfully implemented that architecture using:

```sql
UNIQUE (user_id, subject_id, option_group_id)
```

Subsequent completed pre-import evidence for the seven candidate subjects now proves the pre-beta catalogue requires generic multi-selection cardinality.

### Authoritative newly established examples

| Subject | Group | Cardinality |
| --- | --- | --- |
| History 9489 | AS option / Paper 3 / Paper 4 (existing) | **1 / 1** |
| Geography 9696 | Paper 3 | **2 / 2** (choose exactly 2 of 4) |
| Geography 9696 | Paper 4 | **2 / 2** (choose exactly 2 of 4) |
| Psychology 9990 | Specialist options | **2 / 2** (choose exactly 2 of 4) |
| Sociology 9699 | Paper 4 areas | **2 / 3** (choose at least 2 of 3) |

Therefore the generic model is extended from fixed 1-of-N to:

```text
min_selections
max_selections
```

This is an **additive generalization**, not a replacement of the option model.

---

## 2. Explicit Non-Changes

This amendment does **not** change:

- syllabus-version pinning;
- route architecture;
- route-set lifecycle;
- qualification weighting;
- option-to-unit relationships;
- year-sensitive mappings;
- derived dormancy;
- immutable retired contracts;
- progress semantics;
- regional beta scope.

Explicitly:

- **No new table is required.**
- **No persisted dormant flag is introduced.**
- **No route architecture changes are required.**
- **No content CSV structure changes are required.**
- **No hosted migration is authorized.**

---

## 3. Schema Amendment (Migration 0016 Patch)

### 3.1 `assessment_study_option_groups`

Add:

| Column | Type | Nullability | Constraints |
| --- | --- | --- | --- |
| `min_selections` | `integer` | NOT NULL | `CHECK (min_selections >= 1)` |
| `max_selections` | `integer` | NOT NULL | `CHECK (max_selections >= min_selections)` |

No client-side or database default silently coerces missing cardinality to `1/1`. Manifest/reference-data authoring must supply intended cardinality explicitly.

No arbitrary unsupported global maximum is added.

Because no reference option-group rows exist yet, no data migration/backfill is required.

Supported representations include:

- History: `1 / 1`
- Geography Paper 3: `2 / 2`
- Geography Paper 4: `2 / 2`
- Psychology specialist options: `2 / 2`
- Sociology Paper 4: `2 / 3`

### 3.2 `user_subject_option_selections`

Replace one-selection-per-group uniqueness:

```sql
-- REMOVED
PRIMARY KEY (user_id, subject_id, option_group_id)
```

with duplicate-option uniqueness:

```sql
-- ADDED
PRIMARY KEY (user_id, subject_id, option_group_id, option_id)
```

Goal:

- allow multiple **different** options inside one group;
- reject duplicate selection of the **same** option.

Preserved:

- `(user_id, subject_id, syllabus_version_id) → user_subjects(...)` with membership deletion **CASCADE**;
- `(option_id, option_group_id, syllabus_version_id) → assessment_study_options(...)`;
- same-version and same-group integrity.

---

## 4. Cardinality Enforcement Boundary

### Database responsibilities in Slice A1

- valid min/max bounds on option-group metadata;
- no duplicate identical option selection;
- correct membership;
- correct syllabus version;
- correct option group;
- correct option identity.

### Deferred to atomic study-configuration mutation

Do **not** enforce selected-row count with a row-level CHECK constraint.

For every applicable option group, the later atomic configuration transaction must require:

```text
min_selections
  <= COUNT(DISTINCT selected option)
  <= max_selections
```

Examples:

| Group | Rule |
| --- | --- |
| History `1/1` | exactly one selection required |
| Geography `2/2` | exactly two distinct selections required |
| Psychology `2/2` | exactly two distinct selections required |
| Sociology `2/3` | two or three distinct selections permitted |

Selected-count validation evaluates only **ACTIVE/applicable** selections under the derived dormancy contract.

---

## 5. Dormancy Remains Derived

No `is_dormant`, `active`, `inactive`, or `selection_status` column is added to selection rows.

Multiple stored selections follow the same approved dormancy contract:

A selection is active only when:

1. its option/group belongs to the exact matching route-reference contract; and
2. its group applies to the membership's current route.

Otherwise it is dormant by derivation.

Changing route does not delete otherwise valid stored options merely to force cardinality.

---

## 6. Manifest Model Consequence (Not Implemented Yet)

Future option groups in the unified route manifest will carry semantic cardinality equivalent to:

```json
{
  "minSelections": 2,
  "maxSelections": 2
}
```

or:

```json
{
  "minSelections": 2,
  "maxSelections": 3
}
```

Slice A2 must validate these fields.

A2 publication validation must also verify satisfiable cardinality:

```text
maxSelections <= number of distinct valid options in the option group
```

so every published option-group cardinality can be satisfied. This is **not** a database row-level CHECK.

There is **no subject-specific manifest schema**.

Manifest tooling, parser, and hash canonicalization remain deferred.

---

## 7. Slice A1 Implementation Authorization

| Fact | State |
| --- | --- |
| Owner-approved | **YES** |
| Final owner review | **APPROVE** |
| Patch target | Migration `0016` (not `0017`) |
| Hosted apply | **NOT AUTHORIZED** |
| A1 freeze commit/push | **AUTHORIZED** (this freeze task) |
| Reports 120–122 | Unchanged |

**Recommendation after freeze:** BEGIN SLICE A2 — ROUTE MANIFEST SCHEMA, CANONICAL HASHING, VALIDATION, PUBLICATION TOOLING AND CONTRACT IMMUTABILITY.
