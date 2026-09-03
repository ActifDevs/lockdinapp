# LOCKDIN — PHASE 7 ROUTE ARCHITECTURE EVIDENCE AMENDMENT

**Report:** 122

**Date:** 2026-09-03

**Status:** OWNER-APPROVED PHASE 7 ROUTE ARCHITECTURE — IMPLEMENTATION AUTHORIZED

**Cross-References:**
- **Evidence Source:** Report 121 (`docs/cursor/reports/121-phase7-study-route-official-evidence-audit.md`)
- **Approved Base Architecture:** Report 120 (`docs/cursor/reports/120-phase7-pre-beta-product-reconciliation.md`)

**Implementation Performed by This Report:** NONE. This documentation-freeze task did not change application code, tests, Drizzle schema, migrations, route manifests, syllabus CSVs, reference data, Supabase, Vercel, or Production. The final owner gate in this report authorizes subsequent controlled local/repository implementation only; it does not authorize hosted application, publication, import, or beta-invitation actions.

---

## Final Authorization Review Corrections

This final documentation-only correction pass resolves the four remaining material authorization-review items while preserving the approved base architecture from Reports 120 and 121:

1. **Exact qualification weighting:** `assessment_route_components.qualification_weighting_percent` is `numeric(7,4)`; publication requires exact canonical decimals in range and an exact `100.0000` sum, with fixed-scale manifest hashing.
2. **History evidence:** Cambridge 9489 option labels, 2027–2029 rotations, manifest examples, repository-discrepancy language, and acceptance tests now match Publication 718292 v2 and the actual static CSV occurrences.
3. **Derived dormancy:** The persisted dormant-state column and mutation-time dormancy toggles are removed. Active versus dormant state is derived from the membership's current route, exact route-reference contract, group applicability, and component membership.
4. **Composite integrity:** The conceptual model now states the same-version and same-contract composite keys, foreign keys, publication checks, lifecycle rules, and immutable-retired-contract behavior required before migration `0016` can be authorized.

---

## 2. Executive Summary & Purpose

Report 120 established and owner-approved the base architecture for Lockdin Phase 7 study routes:
- Removal of the global AS/A Level onboarding question, with `profiles.level` retained temporarily as non-authoritative legacy metadata.
- Introduction of canonical, syllabus-version-scoped assessment routes with one persistent route per subject membership.
- Server-authoritative syllabus-version resolution without client authority over `syllabus_version_id`.
- Preservation of immutable syllabus content graphs and existing `content_sha256` hashes.
- Separation of route-reference contracts, independently versioned and hashed via `route_manifest_sha256`.
- Whole-syllabus topic progress remaining the authoritative continuity metric.

Report 121 conducted an exhaustive official evidence audit across all nine current Cambridge AS & A Level subjects, enumerating **34 canonical qualification routes** and validating that paper combinations do not vary by exam series across the `r001` families. However, Report 121 identified two critical structural findings that prevented immediate publication of route contracts for six subjects:
1. **Finding A — Qualification-Context Weighting:** Assessment weighting is not an invariant property of a component record. The same physical exam paper (e.g., Business Paper 1, Chemistry Paper 1) contributes one percentage to an AS Level qualification (e.g., 40% or 31%) and a different percentage to a full A Level qualification (e.g., 20% or 15.5%). In six current `r001` content graphs, Papers 1–2 or 1–3 were ingested only under `AS Level` component records with AS weightings.
2. **Finding B — History Study Options & Year Rotation:** In History 9489, the official qualification route (Papers 1+2, Papers 1–4, or staged) is distinct from a student's study content choices. History incorporates three independent option choices (AS Option, Paper 3 Topic, Paper 4 Depth Study) and an official Cambridge three-year rotation where Paper 1 / Paper 2 topic assignments change by examination year (2027, 2028, 2029). The existing `9489-r001` graph contains static, incomplete source occurrences rather than an authoritative year allocation.

This report delivers the **definitive architectural amendment** to resolve both findings generically, cleanly, and without breaking established invariants:
- **Qualification Weighting** is normalized onto the route-component relationship (`assessment_route_components.qualification_weighting_percent`), preserving existing `content_sha256` hashes while making qualification-appropriate weighting available to all routes.
- **Study Options and Year Rotations** are modeled as generic, syllabus-version-scoped reference entities (`assessment_study_option_groups`, `assessment_study_options`, `assessment_study_option_units`, `assessment_study_option_year_mappings`) paired with normalized student selections (`user_subject_option_selections`), allowing dynamic focus evaluation driven by `user_subjects.intended_exam_year` without altering content graphs or repinning versions.

---

## 3. Verified Git Preflight & Working Tree Baseline

| Fact | Verified State |
| --- | --- |
| Branch | `main` |
| HEAD | `263e07b63b92b3adb81d1572934e3bdf9b1fddbf` |
| Remote (`origin/main`) | `263e07b63b92b3adb81d1572934e3bdf9b1fddbf` |
| Working tree | Clean before documentation task; Report 122 untracked only |
| Migration head | `0015_silent_sentinel` (16 migrations total) |
| Migration `0016` | **ABSENT** |
| Canonical host | `https://lockdinapp-web.vercel.app` |

---

## 4. Preserved Architecture Invariants (from Report 120)

This amendment strictly maintains all approved invariants from Report 120:
1. **Immutable Syllabus Content Graphs:** Existing `syllabus_versions.content_sha256` values for all nine `r001` versions remain byte-for-byte unchanged.
2. **Independently Versioned Route Contracts:** Route contracts attach to immutable syllabus versions and carry their own `route_manifest_sha256`.
3. **Strict Server-Side Syllabus Resolution:** Clients submit only subject and structured intended exam session; clients never supply `syllabus_version_id` or route set IDs.
4. **No Arbitrary Component Sets:** Students select validated canonical routes and defined study options; they do not assemble ad hoc paper checklists.
5. **No Automatic Repinning:** Syllabus version pins and route selections never repin automatically on DEFAULT changes or series changes.
6. **Qualification Derived from Route:** Qualification target (`as_level` or `a_level`) is derived from the canonical route, not stored as an independently editable membership field.
7. **Single Current Route per Membership:** Exactly one canonical route per active subject membership.
8. **Route-Set Lifecycle Distinction:** Current selectable routes come from the active `published` route set; existing memberships referencing a `retired` route set continue to resolve and read their historical route safely.
9. **Authoritative Progress Continuity:** Whole-syllabus topic progress (completed topics / all topics in pinned version) remains the primary continuity metric; route relevance provides focus filtering without changing the progress denominator.
10. **Preservation of Historical User Data:** Past paper attempts, tasks, notes, and exam dates are preserved across route changes or option updates.
11. **Legacy `profiles.level` Posture:** Nullable legacy metadata with zero product, routing, or assignment authority, deprecated from active UI/API writes.
12. **Deferrable Legacy Route Confirmation:** Memberships lacking an assigned route may defer route selection; legacy reading remains backwards-compatible.

---

## 5. Finding A — Qualification-Context Weighting Architecture

### 5.1 Current Implementation Audit

An exhaustive code and data audit was conducted across all repository layers:
- **`assessment_components` Table:** Defines `weighting_percent real` as a column on each component row. In the current Drizzle schema and database migrations (`0000` through `0015`), components are identified by natural key `(syllabus_version_id, paper_code, level)`.
- **12-Column Syllabus CSV Contract:** Column 11 is `Weighting (%)`. During CSV parsing (`scripts/src/syllabus/parse-csv.ts`), this is parsed as a nullable float.
- **Normalization & Ingestion (`normalize.ts`, `db-upsert.ts`):** Components are extracted from CSV rows; where the same paper appears under multiple levels in the CSV, distinct component rows are generated with their respective weightings.
- **Canonical Content Hashing (`canonical-graph.ts`):** `CanonicalComponent` explicitly includes `weightingPercent`. The canonical hash `content_sha256` commits to the exact `weightingPercent` values of all component records in that syllabus version graph.
- **API Server (`artifacts/api-server/src/routes/subjects.ts`):** `GET /api/subjects/{subjectId}/components` returns `ListAssessmentComponentsResponse` containing `AssessmentComponent.weightingPercent`.
- **Past Papers & Subject UI (`artifacts/revision-platform`):** `weightingPercent` is serialized in API responses and tested in fixtures, but is **not** currently displayed in the Past Papers dropdown or Subject Detail cards. Past paper options are formatted as `${component.paperCode} — ${component.componentName} — ${component.level}`.
- **Current Data Discrepancy in `r001` Graphs:**
  - In Further Mathematics (9231), Biology (9700), and Mathematics (9709), separate AS and A Level component rows exist for shared papers (e.g., Biology has `9700/1 AS` at 31% and `9700/1 A` at 15.5%).
  - In Business (9609), History (9489), Computer Science (9618), Chemistry (9701), Physics (9702), and Economics (9708), Papers 1–2 or 1–3 exist **only** as AS Level component records with AS weightings (e.g., Chemistry has only `9701/1 AS` at 31%, with no `9701/1 A` at 15.5%).

### 5.2 Evaluation of Structural Options

| Evaluation Criterion | Option A: Weighting on Route-Component Relation (`assessment_route_components.qualification_weighting_percent`) | Option B: Separate Component-Qualification Weighting Relation (`component + qual_context -> weighting`) | Option C: Add Duplicate A-Level Component Records to r001 Graphs | Option D: Weighting Map JSON on Route Entity |
| --- | --- | --- | --- | --- |
| **Correctness** | **EXCELLENT:** Weighting is an exact property of how a component functions in a specific route/qualification context. | **GOOD:** Normalizes component by qualification target, but disconnects weighting from route role. | **FATAL DEFECT:** Modifies already-published immutable content graphs. | **WEAK:** Unstructured JSON bypasses database type safety and referential integrity. |
| **Immutability Impact** | **ZERO:** `syllabus_versions.content_sha256` is 100% preserved; weighting is hashed in the route manifest. | **ZERO:** `content_sha256` preserved if placed in route layer. | **HIGH RISK / REJECTED:** Recomputes `content_sha256` for 6 published graphs, breaking Phase 6 evidence. | **ZERO:** `content_sha256` preserved. |
| **Existing r001 Compatibility** | **EXCELLENT:** All existing component rows remain untouched; routes map to existing component IDs and provide qualification weightings. | **MODERATE:** Requires extra joining table and extra resolution logic. | **REJECTED:** Violates immutable graph invariant. | **MODERATE:** Requires custom client/server JSON parsing. |
| **Manifest Complexity** | **LOW:** Cleanly nested: `components: [{ paperCode, level, role, qualificationWeightingPercent }]`. | **MEDIUM:** Requires separate top-level weightings block in manifest. | **N/A:** Requires CSV rebuild and re-import. | **LOW:** Raw JSON map. |
| **Route Hashing** | **DETERMINISTIC:** Included directly in canonical route graph hash `route_manifest_sha256`. | **DETERMINISTIC:** Hashed via separate junction. | **N/A** | **FRAGILE:** Object key ordering in JSON. |
| **API Clarity** | **EXCELLENT:** Route responses directly provide the exact component with its applicable qualification weighting. | **MODERATE:** API must join or merge weighting relation at runtime. | **CONFUSING:** Creates redundant component IDs for identical physical papers. | **POOR:** Client must extract weightings from route dictionary. |
| **Future-Subject Compatibility** | **EXCELLENT:** Handles standard AS/A, staged, full, and non-standard weighting splits across any syllabus. | **GOOD:** Handles standard AS/A splits. | **POOR:** Requires CSV duplication for every subject. | **MODERATE:** Unstructured. |
| **Staged Routes Support** | **EXCELLENT:** Carried-forward components carry their A Level contribution (e.g. 15.5%) or AS contribution depending on route definition. | **MODERATE:** May require route-stage disambiguation. | **CONFUSING:** Requires dual component references. | **POOR:** Complex mapping. |
| **Full Same-Series Routes** | **EXCELLENT:** All papers carry their full A Level weighting directly. | **GOOD:** Maps via `a_level` target. | **CONFUSING** | **MODERATE** |
| **AS Routes Support** | **EXCELLENT:** AS papers carry their AS weighting directly. | **GOOD:** Maps via `as_level` target. | **GOOD** | **MODERATE** |
| **Maintenance Burden** | **MINIMAL:** Single declarative field on the existing junction table. | **HIGH:** Additional table, migration, RLS policies, and index maintenance. | **EXTREME:** Invalidates historical verification. | **HIGH:** Schema drift in JSON payloads. |

### 5.3 Recommended Design: Option A & Publication Validation Rules

**Recommendation:** Adopt **Option A**.

Add `qualification_weighting_percent numeric(7,4)` to `assessment_route_components`:

```text
assessment_route_components
├── route_id (FK -> assessment_routes.id)
├── route_set_id (part of exact route-contract composite FK)
├── component_id (FK -> assessment_components.id)
├── syllabus_version_id (FK -> syllabus_versions.id, composite consistency)
├── role ('current_sitting' | 'carried_forward')
├── qualification_weighting_percent (numeric(7,4), nullable in draft, required when published)
└── order_index (integer)
```

**Publication Validation Rules for Route Weighting:**
For every route set moving to `published` status:
1. **Mandatory Weighting:** Every route component in a published route must have a non-null `qualification_weighting_percent`.
2. **Range Constraint:** Every component weighting must satisfy the exact NUMERIC constraint `0.0000 < qualification_weighting_percent <= 100.0000`.
3. **Exact Sum Equality:** The exact NUMERIC sum of all component weightings in a route must equal `100.0000`. Canonical publication validation uses exact PostgreSQL NUMERIC arithmetic. Manifest ingestion parses numeric text into an exact canonical decimal before validation, persistence, or hashing.
4. **Context Consistency Check:** Repeated use of the same physical paper under the same qualification target across different routes of the same syllabus version must have consistent qualification weighting, unless explicit reviewed official syllabus evidence justifies a difference.
5. **Draft State Allowance:** Draft route sets may temporarily contain null or incomplete weightings during authoring, but the database and manifest ingestion pipeline will reject transition to `published` if any validation fails.

### 5.4 Legacy Component Weighting & Component Level Semantics

1. **Legacy Source-Graph Weighting:**
   - The existing column `assessment_components.weighting_percent` is inside the immutable `r001` content graphs and is locked by `content_sha256`. It MUST NOT be modified or dropped.
   - For all route-aware application logic, it is classified as **LEGACY SOURCE-GRAPH WEIGHTING METADATA**.
   - **API Deprecation Strategy:** In API responses, the generic field `weightingPercent` on component objects is deprecated. Transition semantically to `sourceWeightingPercent` (non-authoritative provenance). Route-aware endpoints expose `qualificationWeightingPercent` as the authoritative qualification contribution for the student's selected route. Frontend components must never use raw component weighting once routes are active.

2. **Component Level Semantics:**
   - `assessment_components.level` is part of component natural-key identity (`syllabus_version_id, paper_code, level`) and represents content occurrence context in the source graph. It is NOT the student's qualification target.
   - In route-aware APIs, student-facing exposure of raw `component.level` is deprecated in favor of semantically explicit fields such as `componentContextLevel` or `sourceLevel`.
   - The student's actual qualification target is derived strictly from `route.qualificationTarget`. Frontend UI must never present an AS component's source-level field as an indicator that the student is pursuing an AS qualification when the selected route target is `a_level`.

---

## 6. Weighting Semantics & Pathway Types

### 6.1 Semantics by Pathway Type

| Pathway Context | Component Role | Applicable Weighting Semantics | Example (Biology 9700 / Chemistry 9701) | Example (Business 9609 / Economics 9708) | Example (History 9489) |
| --- | --- | --- | --- | --- | --- |
| **AS Level Route (`single_series`)** | `current_sitting` | Contribution of the component to the **AS Level** qualification. Sum of components in route = 100%. | Paper 1: 31%<br>Paper 2: 46%<br>Paper 3: 23%<br>**Total: 100%** | Paper 1: 40%<br>Paper 2: 60%<br>**Total: 100%** | Paper 1: 40%<br>Paper 2: 60%<br>**Total: 100%** |
| **Complete A Level (`staged_completion`)** | `carried_forward` | Contribution of the carried AS components to the **completed A Level** award (50% in aggregate). | Carried Papers 1, 2, 3: 15.5%, 23%, 11.5%<br>**Subtotal: 50%** | Carried Papers 1, 2: 20%, 30%<br>**Subtotal: 50%** | Carried Papers 1, 2: 20%, 30%<br>**Subtotal: 50%** |
| **Complete A Level (`staged_completion`)** | `current_sitting` | Contribution of the current-sitting completion components to the **completed A Level** award (50% in aggregate). | Current Papers 4, 5: 38.5%, 11.5%<br>**Subtotal: 50%**<br>**Total A Level: 100%** | Current Papers 3, 4: 30%, 20%<br>**Subtotal: 50%**<br>**Total A Level: 100%** | Current Papers 3, 4: 20%, 30%<br>**Subtotal: 50%**<br>**Total A Level: 100%** |
| **Full A Level (`full_same_series`)** | `current_sitting` (all papers) | Contribution of each paper taken in the single series to the **completed A Level** award. Sum = 100%. | Papers 1–5: 15.5%, 23%, 11.5%, 38.5%, 11.5%<br>**Total: 100%** | Papers 1–4: 20%, 30%, 30%, 20%<br>**Total: 100%** | Papers 1–4: 20%, 30%, 20%, 30%<br>**Total: 100%** |

### 6.2 Critical Boundary Distinction

- **Qualification Component Weighting (In Scope):** The percentage that an examinable paper contributes toward the final qualification grade. This is what Lockdin models.
- **Assessment Objective (AO) Weighting (Out of Scope):** The internal percentage allocation of assessment objectives within a paper or overall syllabus. Lockdin does **not** model AO breakdowns.

### 6.3 Staged A Level & Carried-Forward AS Posture

In a staged A Level pathway, `membership.intended_exam_year` represents the student's **current completion examination year**. It does NOT identify the examination year in which the student previously sat the carried AS papers.
- In subjects with static component relationships, carried AS papers contribute their standard 50% A Level qualification subtotal without ambiguity.
- In subjects with yearly content rotations (such as History 9489 AS papers), the system MUST NOT apply the current completion year's rotation rules to historical carried AS content.
- **Minimal Safe V1 Posture:** Historical carried-stage Paper 1 / Paper 2 allocation is NOT reconstructed in v1 without explicit, validated prior AS sitting data. The carried AS option remains known and is labelled `priorStage` in the syllabus view, but the precise historical Paper 1 vs Paper 2 allocation is not claimed.

---

## 7. Official Cambridge Evidence Verification (History 9489)

### 7.1 Authoritative 2027–2029 Syllabus Evidence vs Repository Reality

Before finalizing the study option and year-mapping model, official Cambridge syllabus 9489 for examinations in 2027, 2028, and 2029 (Publication 718292 Version 2, September 2024) was re-verified against the repository's `9489_history.csv` (`9489-r001`).

**Verified Structure:**
1. **Qualification Routes (3 Canonical Routes):**
   - `as_single_series`: Paper 1 (Historical Sources, 75m, 40mks, AS 40%) + Paper 2 (Outline Study, 105m, 60mks, AS 60%)
   - `a_staged_completion`: Carried Papers 1 + 2 (A Level 50% total: 20% + 30%) + Current Paper 3 (Historical Interpretations, 75m, 40mks, A Level 20%) + Current Paper 4 (Depth Study, 105m, 60mks, A Level 30%)
   - `a_full_same_series`: Current Papers 1, 2, 3, 4 (20%, 30%, 20%, 30% = 100%)

2. **AS History Options (1 of 3 Options):**
   The official 2027–2029 syllabus establishes three AS options, each with **three specific topics**:
   - **Option 1: Modern Europe, 1774–1924** (Note: 2026 was 1750–1921; 2027–2029 is 1774–1924)
     - Topic 1: *France, 1774–1814*
     - Topic 2: *Liberalism and nationalism in Germany, 1815–71*
     - Topic 3: *Russia from autocracy to revolution, 1881–1924*
   - **Option 2: The History of the USA, 1820–1941**
     - Topic 1: *The Civil War and Reconstruction, 1820–77*
     - Topic 2: *The Gilded Age and the Progressive Era, 1870–1920*
     - Topic 3: *The Great Crash, the Great Depression and the New Deal, 1920–41*
   - **Option 3: International History, 1870–1939**
     - Topic 1: *Imperialism and the emergence of world powers, c.1870–1918*
     - Topic 2: *International relations, 1919–29*
     - Topic 3: *International history, 1929–39*

3. **Official Paper 1 / Paper 2 Exam Year Rotation (Official pp. 37–38):**
   For each AS option, one topic is assessed on Paper 1 (Historical Sources) and the remaining two topics are assessed on Paper 2 (Outline Study). The topic assigned to Paper 1 rotates annually:

| Option | Exam Year | Paper 1 Topic (Source Paper) | Paper 2 Topics (Outline Study) |
| --- | --- | --- | --- |
| **Modern Europe, 1774–1924** | **2027** | France, 1774–1814 | Liberalism and nationalism in Germany, 1815–71<br>Russia from autocracy to revolution, 1881–1924 |
| **Modern Europe, 1774–1924** | **2028** | Liberalism and nationalism in Germany, 1815–71 | France, 1774–1814<br>Russia from autocracy to revolution, 1881–1924 |
| **Modern Europe, 1774–1924** | **2029** | Russia from autocracy to revolution, 1881–1924 | France, 1774–1814<br>Liberalism and nationalism in Germany, 1815–71 |
| **The History of the USA, 1820–1941** | **2027** | The Gilded Age and the Progressive Era, 1870–1920 | The Civil War and Reconstruction, 1820–77<br>The Great Crash, the Great Depression and the New Deal, 1920–41 |
| **The History of the USA, 1820–1941** | **2028** | The Great Crash, the Great Depression and the New Deal, 1920–41 | The Civil War and Reconstruction, 1820–77<br>The Gilded Age and the Progressive Era, 1870–1920 |
| **The History of the USA, 1820–1941** | **2029** | The Civil War and Reconstruction, 1820–77 | The Gilded Age and the Progressive Era, 1870–1920<br>The Great Crash, the Great Depression and the New Deal, 1920–41 |
| **International History, 1870–1939** | **2027** | Imperialism and the emergence of world powers, c.1870–1918 | International relations, 1919–29<br>International history, 1929–39 |
| **International History, 1870–1939** | **2028** | International relations, 1919–29 | Imperialism and the emergence of world powers, c.1870–1918<br>International history, 1929–39 |
| **International History, 1870–1939** | **2029** | International history, 1929–39 | Imperialism and the emergence of world powers, c.1870–1918<br>International relations, 1919–29 |

4. **Paper 3 Prescribed Topics (1 of 3 for A Level):**
   - Topic 1: *The origins of the First World War*
   - Topic 2: *The Holocaust*
   - Topic 3: *The origins and development of the Cold War*

5. **Paper 4 Depth Study Options (1 of 3 for A Level):**
   In the official syllabus and `9489_history.csv`, Paper 4 contains 3 depth studies, each comprising 3 specific topics:
   - **Depth Study 1: European History in the interwar years, 1919–41**
     - Mussolini's Italy, 1919–41
     - Stalin's Russia, 1924–41
     - Hitler's Germany, 1929–41
   - **Depth Study 2: The USA, 1945–93** (CSV titles: Truman Eisenhower 1945–61; A time of challenges: the USA 1961–74; The USA 1974–93)
   - **Depth Study 3: International History, 1909–94** (CSV titles: The Soviet Empire in Eastern Europe 1953–91; End of minority rule in South Africa and Zimbabwe 1948–94; The route to independence: Malaysia and Indonesia c.1909–67)

### 7.2 Discrepancy Recording

The initial draft of Report 122 contained several erroneous examples derived from obsolete 2026 syllabus drafts or corrupted copy (e.g., citing "Modern Europe, 1750–1921", "Industrialisation in Britain, 1750–1850" which is not in the 2027–2029 syllabus, "Regional tensions 1820–61", and an incorrect 2028/2029 rotation sequence). Furthermore, Report 121’s text referenced these general dimensions without tabulating the exact verified unit titles from `9489_history.csv`.
- **Resolution:** In accordance with the instructions, Report 121 is NOT rewritten; this discrepancy is officially recorded here in Report 122, and the verified official 2027–2029 evidence is used exclusively.

---

## 8. Generic Study-Option & Year-Sensitive Reference Model

### 8.1 Repository Hierarchy Alignment: Units vs Outcomes

In the Lockdin repository schema (`scripts/src/syllabus/normalize.ts`), syllabus content is ingested as:
$$\text{Unit (Main Topic)} \longrightarrow \text{Topic (Subtopic)} \longrightarrow \text{Learning Outcomes}$$

In History 9489 and similar subjects:
- Selectable AS options correspond to **complete syllabus units** (e.g., Option 1 is the unit "France 1774-1814" plus "Liberalism and nationalism in Germany 1815-71" plus "Russia from autocracy to revolution 1881-1924").
- Selectable Paper 3 topics correspond to individual syllabus units.
- Selectable Paper 4 depth studies correspond to groups of 3 syllabus units.

Therefore, modeling elective options by forcing manual enumeration of every single learning outcome (`assessment_study_option_outcomes`) is unnecessarily granular and brittle. We introduce a clean, layered model:
1. **Primary Relation:** `assessment_study_option_units` maps an option to one or more syllabus units. All descendant topics and learning outcomes automatically inherit option relevance.
2. **Optional Granular Extension:** `assessment_study_option_outcomes` is retained conceptually only if future official subject evidence genuinely splits a unit at the individual outcome level.

```text
syllabus_versions (pinned curriculum)
  │
  ├── assessment_route_sets (published route-reference contract)
  │     │
  │     ├── assessment_routes (qualification target, pathway, progression)
  │     │     └── assessment_route_components (component, role, qual_weighting_percent)
  │     │
  │     ├── assessment_study_option_groups (group_key, display_label, qual_target, applicable_component_id)
  │     │     │
  │     │     └── assessment_study_options (option_key, display_label, order_index)
  │     │           │
  │     │           ├── assessment_study_option_units (maps option -> unit_id)
  │     │           └── assessment_study_option_year_mappings (exam_year -> component_id -> unit_id)
  │
  └── user_subjects (membership with pin and intended_exam_year)
        │
        ├── assessment_route_id (FK -> assessment_routes)
        └── user_subject_option_selections (dormant-aware student choices)
```

### 8.2 Entity Definitions

#### 1. `assessment_study_option_groups`
Represents an elective choice category within a syllabus version.
- `id`: integer, primary key.
- `route_set_id`: integer, FK to `assessment_route_sets(id)`.
- `syllabus_version_id`: integer, FK to `syllabus_versions(id)`.
- `group_key`: string (e.g., `as_history_option`, `paper_3_topic`, `paper_4_depth_study`).
- `display_label`: string.
- `applicable_qualification_target`: enum (`as_level`, `a_level`, `both`).
- `applicable_component_id`: integer, nullable FK to `assessment_components(id)`.
- `order_index`: integer.

**Applicability Conjunction Rule:**
An option group applies to a user's membership if and only if:
$$\text{route.qualificationTarget} \text{ matches } \text{group.applicable\_qualification\_target}$$
$$\mathbf{AND}$$
$$(\text{group.applicable\_component\_id IS NULL} \;\mathbf{OR}\; \text{group.applicable\_component\_id} \in \text{route.components})$$
This conjunction cleanly evaluates without needing an extra route-option junction table.

**Cardinality Constraint for v1:**
All current audited option groups across all nine subjects are strictly single-select. For v1, cardinality is constrained conceptually to:
$$\text{minSelections} = 1, \quad \text{maxSelections} = 1$$
Multi-select support is documented as a future schema extension if official subject evidence requires it.

#### 2. `assessment_study_options`
Represents a selectable choice within an option group.
- `id`: integer, primary key.
- `group_id`: integer, FK to `assessment_study_option_groups(id)`.
- `route_set_id`: integer, part of the composite FK to the exact option-group contract.
- `syllabus_version_id`: integer, FK to `syllabus_versions(id)`.
- `option_key`: string (e.g., `european_history`, `usa_history`, `international_history`).
- `display_label`: string.
- `description`: string, nullable.
- `order_index`: integer.

#### 3. `assessment_study_option_units`
Maps which syllabus units belong to an elective option.
- `option_id`: integer, FK to `assessment_study_options(id)`.
- `unit_id`: integer, FK to `syllabus_units(id)`.
- `syllabus_version_id`: integer, FK to `syllabus_versions(id)`.
- Primary key: `(option_id, unit_id)`.

#### 4. `assessment_study_option_year_mappings`
Encodes official year-specific assessment paper allocations.
- `id`: integer, primary key.
- `option_id`: integer, FK to `assessment_study_options(id)`.
- `syllabus_version_id`: integer, FK to `syllabus_versions(id)`.
- `exam_year`: integer (e.g., 2027, 2028, 2029).
- `component_id`: integer, FK to `assessment_components(id)` (e.g., Paper 1 or Paper 2).
- `unit_id`: integer, FK to `syllabus_units(id)`.
- `assessment_role`: string (e.g., `source_paper`, `outline_paper`).

### 8.3 Static Occurrence vs Dynamic Overlay Precedence

The existing `9489-r001` content graph contains static, incomplete CSV component occurrences: France 1774–1814 is linked to Paper 1 while the other AS units are linked to Paper 2. It does not reproduce the complete official 2027 allocation. The occurrences remain immutable provenance locked by `content_sha256`; they are not authoritative for year-sensitive Paper 1/Paper 2 focus, and the reviewed published dynamic mapping overrides them in every governed year, including 2027.

**Precedence & Evaluation Contract:**
1. Load the immutable content graph.
2. Determine whether a content node (unit/topic) is governed by a published year-sensitive mapping for the membership's exact pinned syllabus version, selected study option, and relevant examination year (`intended_exam_year`).
3. **Precedence Rule:** If a published year-sensitive mapping exists:
   - **THE YEAR-SENSITIVE MAPPING IS AUTHORITATIVE FOR CURRENT PAPER FOCUS.**
   - The runtime MUST NOT union the static CSV occurrence with the dynamic year mapping into two conflicting current-focus assignments. The static component occurrence is ignored for current Paper 1 vs Paper 2 focus semantics.
4. Resolve the dynamically mapped component against the membership's route components.
5. Derive focus:
   - If the mapped component has role `current_sitting` $\rightarrow$ `currentFocus = true`.
   - If the mapped component has role `carried_forward` $\rightarrow$ `priorStage = true`.
6. **Fail-Closed Precision Rule:** If a required year mapping is missing, duplicated, or ambiguous for the student's exam year:
   - The system **FAILS CLOSED** for precise Paper 1 vs Paper 2 focus claims.
   - It does NOT invent a fallback or guess an allocation.
   - Whole-syllabus content remains available, but paper-specific focus indicators are withheld.

---

## 9. Student Study Configuration & Lifecycle

### 9.1 Storage Design: `user_subject_option_selections`

User selections are stored in a normalized, generic table:

```text
user_subject_option_selections
├── user_id (FK -> auth.users / profiles.id)
├── subject_id (FK -> subjects.id)
├── option_group_id (FK -> assessment_study_option_groups.id)
├── option_id (FK -> assessment_study_options.id)
├── syllabus_version_id (FK -> syllabus_versions.id, composite consistency)
├── created_at (timestamp)
└── updated_at (timestamp)
```

**Constraints & Invariants:**
- Unique Constraint: `(user_id, subject_id, option_group_id)`. Ensures at most one option per group.
- Composite Foreign Key: `(user_id, subject_id, syllabus_version_id) -> user_subjects(user_id, subject_id, syllabus_version_id)`. Guarantees option selections match the membership's pinned syllabus version.
- Composite Option Foreign Key: `(option_id, option_group_id, syllabus_version_id) -> assessment_study_options(id, group_id, syllabus_version_id)`. Prevents cross-group or cross-version option selections.
- RLS: Enabled; authenticated users can read their own selections; direct writes revoked.

### 9.2 Inapplicable Selections: Dormancy Is Derived

When a user's route or qualification target changes such that an option group is temporarily inapplicable:
- **Rule:** The user's selection row is retained, not deleted. There is no persisted dormant-state flag and no mutation toggles dormancy.
- **Active derivation:** A stored selection is active if and only if (A) its option and group belong to the exact same syllabus-version-scoped route-reference contract as the membership's currently stored route, and (B) the group applies to that route by qualification target and, when present, `applicable_component_id` membership. Otherwise it is dormant by derivation.
- **Dormant behavior:** Dormant rows are excluded from active relevance, current-selection API output, and configuration-completion checks. They remain stored for continuity.
- **Reactivation boundary:** A dormant row may reactivate only when the membership returns to the same matching, still-valid contract and route applicability becomes true. A selection from another contract or syllabus version never reactivates against the current route.
- **Example:**
  1. Student selects A Level History with AS Option (Modern Europe), Paper 3 Topic (Cold War), and Paper 4 Depth Study (European Depth Study).
  2. Student temporarily switches route to AS Level History.
  3. Under AS Level, Paper 3 and Paper 4 groups become inapplicable.
  4. The Paper 3 and Paper 4 rows remain stored but are derived as dormant. They are not shown as active, used for relevance filtering, or returned as current selections.
  5. If the student switches back to an applicable A Level History route within that exact route-set contract, the still-valid selections reactivate without requiring re-entry.
  6. Standard account or membership deletion removes selections under normal cascade cleanup.

---

## 10. Unified Route and Study-Options Manifest Design

Rather than maintaining separate fragmented manifests, all route-reference metadata for a syllabus version is consolidated into **one unified, version-controlled JSON manifest** attached to the syllabus version via `route_manifest_sha256`.

### 10.1 Verified History 9489 Manifest Example (`route-manifest.json`)

```json
{
  "$schema": "./route-manifest.schema.json",
  "schemaVersion": 1,
  "subjectCode": "9489",
  "syllabusRevisionKey": "9489-r001",
  "routeRevisionKey": "9489-routes-v1",
  "sources": [
    {
      "sourceKey": "cambridge_9489_2027_2029",
      "documentId": "718292",
      "title": "Cambridge International AS & A Level History 9489 Syllabus for 2027, 2028 and 2029 (Version 2)",
      "validity": "2027-2029",
      "locator": "Assessment overview pp. 10-11, Yearly rotation pp. 37-38",
      "url": "https://www.cambridgeinternational.org/Images/718292-2027-2029-syllabus.pdf"
    }
  ],
  "routes": [
    {
      "key": "as_single_series",
      "label": "AS Level (Papers 1 + 2 in one exam series)",
      "qualificationTarget": "as_level",
      "pathwayType": "single_series",
      "progressionEligibility": "eligible",
      "orderIndex": 0,
      "evidenceRefs": ["cambridge_9489_2027_2029#pp10-11"],
      "components": [
        {
          "paperCode": "9489/1",
          "level": "AS Level",
          "role": "current_sitting",
          "qualificationWeightingPercent": "40.0000",
          "orderIndex": 0
        },
        {
          "paperCode": "9489/2",
          "level": "AS Level",
          "role": "current_sitting",
          "qualificationWeightingPercent": "60.0000",
          "orderIndex": 1
        }
      ]
    },
    {
      "key": "a_staged_completion",
      "label": "Complete A Level — carry forward AS, take Papers 3 + 4",
      "qualificationTarget": "a_level",
      "pathwayType": "staged_completion",
      "progressionEligibility": "not_applicable",
      "orderIndex": 1,
      "evidenceRefs": ["cambridge_9489_2027_2029#pp10-11"],
      "components": [
        {
          "paperCode": "9489/1",
          "level": "AS Level",
          "role": "carried_forward",
          "qualificationWeightingPercent": "20.0000",
          "orderIndex": 0
        },
        {
          "paperCode": "9489/2",
          "level": "AS Level",
          "role": "carried_forward",
          "qualificationWeightingPercent": "30.0000",
          "orderIndex": 1
        },
        {
          "paperCode": "9489/3",
          "level": "A Level",
          "role": "current_sitting",
          "qualificationWeightingPercent": "20.0000",
          "orderIndex": 2
        },
        {
          "paperCode": "9489/4",
          "level": "A Level",
          "role": "current_sitting",
          "qualificationWeightingPercent": "30.0000",
          "orderIndex": 3
        }
      ]
    },
    {
      "key": "a_full_same_series",
      "label": "Full A Level — all four papers in one exam series",
      "qualificationTarget": "a_level",
      "pathwayType": "full_same_series",
      "progressionEligibility": "not_applicable",
      "orderIndex": 2,
      "evidenceRefs": ["cambridge_9489_2027_2029#pp10-11"],
      "components": [
        {
          "paperCode": "9489/1",
          "level": "AS Level",
          "role": "current_sitting",
          "qualificationWeightingPercent": "20.0000",
          "orderIndex": 0
        },
        {
          "paperCode": "9489/2",
          "level": "AS Level",
          "role": "current_sitting",
          "qualificationWeightingPercent": "30.0000",
          "orderIndex": 1
        },
        {
          "paperCode": "9489/3",
          "level": "A Level",
          "role": "current_sitting",
          "qualificationWeightingPercent": "20.0000",
          "orderIndex": 2
        },
        {
          "paperCode": "9489/4",
          "level": "A Level",
          "role": "current_sitting",
          "qualificationWeightingPercent": "30.0000",
          "orderIndex": 3
        }
      ]
    }
  ],
  "studyOptionGroups": [
    {
      "key": "as_history_option",
      "label": "AS History Option",
      "qualificationTarget": "both",
      "applicablePaperCode": null,
      "orderIndex": 0,
      "options": [
        {
          "key": "modern_europe_1774_1924",
          "label": "Modern Europe, 1774–1924",
          "orderIndex": 0,
          "unitTitles": [
            "France 1774-1814",
            "Liberalism and nationalism in Germany 1815-71",
            "Russia from autocracy to revolution 1881-1924"
          ]
        },
        {
          "key": "the_history_of_the_usa_1820_1941",
          "label": "The History of the USA, 1820–1941",
          "orderIndex": 1,
          "unitTitles": [
            "The Civil War and Reconstruction 1820-77",
            "The Gilded Age and the Progressive Era 1870-1920",
            "The Great Crash the Great Depression and the New Deal 1920-41"
          ]
        },
        {
          "key": "international_history_1870_1939",
          "label": "International History, 1870–1939",
          "orderIndex": 2,
          "unitTitles": [
            "Imperialism and the emergence of world powers c.1870-1918",
            "International relations 1919-29",
            "International history 1929-39"
          ]
        }
      ]
    },
    {
      "key": "paper_3_topic",
      "label": "Paper 3 Prescribed Topic",
      "qualificationTarget": "a_level",
      "applicablePaperCode": "9489/3",
      "orderIndex": 1,
      "options": [
        {
          "key": "origins_first_world_war",
          "label": "The origins of the First World War",
          "orderIndex": 0,
          "unitTitles": ["The origins of the First World War"]
        },
        {
          "key": "the_holocaust",
          "label": "The Holocaust",
          "orderIndex": 1,
          "unitTitles": ["The Holocaust"]
        },
        {
          "key": "cold_war",
          "label": "The origins and development of the Cold War",
          "orderIndex": 2,
          "unitTitles": ["The origins and development of the Cold War"]
        }
      ]
    },
    {
      "key": "paper_4_depth_study",
      "label": "Paper 4 Depth Study Option",
      "qualificationTarget": "a_level",
      "applicablePaperCode": "9489/4",
      "orderIndex": 2,
      "options": [
        {
          "key": "european_depth_study",
          "label": "Depth Study 1: European History in the interwar years, 1919–41",
          "orderIndex": 0,
          "unitTitles": [
            "Mussolini's Italy 1919-41",
            "Stalin's Russia 1924-41",
            "Hitler's Germany 1929-41"
          ]
        },
        {
          "key": "american_depth_study",
          "label": "Depth Study 2: The USA, 1945–93",
          "orderIndex": 1,
          "unitTitles": [
            "Truman Eisenhower and post-war USA 1945-61",
            "A time of challenges: the USA 1961-74",
            "The USA 1974-93"
          ]
        },
        {
          "key": "international_depth_study",
          "label": "Depth Study 3: International History, 1909–94",
          "orderIndex": 2,
          "unitTitles": [
            "The Soviet Empire in Eastern Europe 1953-91",
            "End of minority rule in South Africa and Zimbabwe 1948-94",
            "The route to independence: Malaysia and Indonesia c.1909-67"
          ]
        }
      ]
    }
  ],
  "yearRotationMappings": [
    {
      "examYear": 2027,
      "optionKey": "modern_europe_1774_1924",
      "paperCode": "9489/1",
      "unitTitle": "France 1774-1814",
      "assessmentRole": "source_paper"
    },
    {
      "examYear": 2027,
      "optionKey": "modern_europe_1774_1924",
      "paperCode": "9489/2",
      "unitTitle": "Liberalism and nationalism in Germany 1815-71",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2027,
      "optionKey": "modern_europe_1774_1924",
      "paperCode": "9489/2",
      "unitTitle": "Russia from autocracy to revolution 1881-1924",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2028,
      "optionKey": "modern_europe_1774_1924",
      "paperCode": "9489/1",
      "unitTitle": "Liberalism and nationalism in Germany 1815-71",
      "assessmentRole": "source_paper"
    },
    {
      "examYear": 2028,
      "optionKey": "modern_europe_1774_1924",
      "paperCode": "9489/2",
      "unitTitle": "France 1774-1814",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2028,
      "optionKey": "modern_europe_1774_1924",
      "paperCode": "9489/2",
      "unitTitle": "Russia from autocracy to revolution 1881-1924",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2029,
      "optionKey": "modern_europe_1774_1924",
      "paperCode": "9489/1",
      "unitTitle": "Russia from autocracy to revolution 1881-1924",
      "assessmentRole": "source_paper"
    },
    {
      "examYear": 2029,
      "optionKey": "modern_europe_1774_1924",
      "paperCode": "9489/2",
      "unitTitle": "France 1774-1814",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2029,
      "optionKey": "modern_europe_1774_1924",
      "paperCode": "9489/2",
      "unitTitle": "Liberalism and nationalism in Germany 1815-71",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2027,
      "optionKey": "the_history_of_the_usa_1820_1941",
      "paperCode": "9489/1",
      "unitTitle": "The Gilded Age and the Progressive Era 1870-1920",
      "assessmentRole": "source_paper"
    },
    {
      "examYear": 2027,
      "optionKey": "the_history_of_the_usa_1820_1941",
      "paperCode": "9489/2",
      "unitTitle": "The Civil War and Reconstruction 1820-77",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2027,
      "optionKey": "the_history_of_the_usa_1820_1941",
      "paperCode": "9489/2",
      "unitTitle": "The Great Crash the Great Depression and the New Deal 1920-41",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2028,
      "optionKey": "the_history_of_the_usa_1820_1941",
      "paperCode": "9489/1",
      "unitTitle": "The Great Crash the Great Depression and the New Deal 1920-41",
      "assessmentRole": "source_paper"
    },
    {
      "examYear": 2028,
      "optionKey": "the_history_of_the_usa_1820_1941",
      "paperCode": "9489/2",
      "unitTitle": "The Civil War and Reconstruction 1820-77",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2028,
      "optionKey": "the_history_of_the_usa_1820_1941",
      "paperCode": "9489/2",
      "unitTitle": "The Gilded Age and the Progressive Era 1870-1920",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2029,
      "optionKey": "the_history_of_the_usa_1820_1941",
      "paperCode": "9489/1",
      "unitTitle": "The Civil War and Reconstruction 1820-77",
      "assessmentRole": "source_paper"
    },
    {
      "examYear": 2029,
      "optionKey": "the_history_of_the_usa_1820_1941",
      "paperCode": "9489/2",
      "unitTitle": "The Gilded Age and the Progressive Era 1870-1920",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2029,
      "optionKey": "the_history_of_the_usa_1820_1941",
      "paperCode": "9489/2",
      "unitTitle": "The Great Crash the Great Depression and the New Deal 1920-41",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2027,
      "optionKey": "international_history_1870_1939",
      "paperCode": "9489/1",
      "unitTitle": "Imperialism and the emergence of world powers c.1870-1918",
      "assessmentRole": "source_paper"
    },
    {
      "examYear": 2027,
      "optionKey": "international_history_1870_1939",
      "paperCode": "9489/2",
      "unitTitle": "International relations 1919-29",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2027,
      "optionKey": "international_history_1870_1939",
      "paperCode": "9489/2",
      "unitTitle": "International history 1929-39",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2028,
      "optionKey": "international_history_1870_1939",
      "paperCode": "9489/1",
      "unitTitle": "International relations 1919-29",
      "assessmentRole": "source_paper"
    },
    {
      "examYear": 2028,
      "optionKey": "international_history_1870_1939",
      "paperCode": "9489/2",
      "unitTitle": "Imperialism and the emergence of world powers c.1870-1918",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2028,
      "optionKey": "international_history_1870_1939",
      "paperCode": "9489/2",
      "unitTitle": "International history 1929-39",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2029,
      "optionKey": "international_history_1870_1939",
      "paperCode": "9489/1",
      "unitTitle": "International history 1929-39",
      "assessmentRole": "source_paper"
    },
    {
      "examYear": 2029,
      "optionKey": "international_history_1870_1939",
      "paperCode": "9489/2",
      "unitTitle": "Imperialism and the emergence of world powers c.1870-1918",
      "assessmentRole": "outline_paper"
    },
    {
      "examYear": 2029,
      "optionKey": "international_history_1870_1939",
      "paperCode": "9489/2",
      "unitTitle": "International relations 1919-29",
      "assessmentRole": "outline_paper"
    }
  ],
  "review": {
    "status": "reviewed",
    "reviewers": ["Lockdin Official Review"],
    "reviewedAt": "2026-09-03",
    "auditReport": "docs/cursor/reports/121-phase7-study-route-official-evidence-audit.md"
  }
}
```

---

## 11. Hashing & Contract Integrity

### 11.1 Canonical Hashing Rules

1. **`content_sha256` Remains Byte-for-Byte Unchanged:**
   - Existing syllabus version content graphs and their hashes are 100% untouched.
2. **`route_manifest_sha256` Covers All Reference Contract Components:**
   - Hashing includes: routes, route-component qualification weightings, option groups, study options, unit mappings, year-rotation mappings, and official evidence citations.
   - Weighting input is parsed from manifest numeric text into an exact canonical decimal before validation, persistence, or hashing. The canonical hash representation always uses four fractional digits: `20` becomes `"20.0000"`, `15.5` becomes `"15.5000"`, and `23` becomes `"23.0000"`. Hashing must never depend on JavaScript floating-point formatting.
   - Student-facing labels and display copy are part of the reference contract and are hashed. A wording-only copy update produces a new attached route-reference revision (`routes-v2`), NOT a syllabus content revision.
3. **Option-Group & Year-Mapping Integrity Rules:**
   - Unique `group_key` per route set.
   - Unique `option_key` within each group.
   - All referenced components must belong to the exact `syllabus_version_id`.
   - All mapped units must belong to the exact `syllabus_version_id`.
   - All mapped examination years must fall within the official applicability window of the contract.
   - Duplicates, gaps, or unresolvable keys cause manifest validation to reject publication.

---

## 12. User Journeys & Atomic Study Configuration

### 12.1 Atomic Study-Configuration Operation

Independent separate mutations for routes and study options create inconsistent intermediate states. The architecture mandates **ONE atomic study-configuration operation**.

**Conceptual API:**
`PATCH /api/user-subjects/{subjectId}/study-configuration`

**Request Payload:**
```json
{
  "routeKey": "a_full_same_series",
  "optionSelections": [
    { "groupKey": "as_history_option", "optionKey": "modern_europe_1774_1924" },
    { "groupKey": "paper_3_topic", "optionKey": "cold_war" },
    { "groupKey": "paper_4_depth_study", "optionKey": "european_depth_study" }
  ],
  "expectedUpdatedAt": "2026-09-03T12:00:00.000Z"
}
```

**Database Execution Boundary:**
1. Derive authenticated user ID strictly from `auth.uid()`.
2. Lock in established global lock order: `profiles` first, then `user_subjects`.
3. Check `expectedUpdatedAt` against `user_subjects.updated_at` (reject stale concurrent updates with HTTP 409).
4. Load the membership's pinned `syllabus_version_id`.
5. Resolve the active `published` route-set contract for that version.
6. Validate the requested `routeKey` against published routes.
7. Determine all option groups applicable to the resolved route under the conjunction rule.
8. Validate that every applicable group has exactly one valid `optionKey` in the payload.
9. Upsert the supplied/current selections for applicable groups.
10. Retain other still-valid stored selections without toggling a dormant field; interpret active versus dormant from the resulting route, exact contract, group applicability, and component membership.
11. Update `user_subjects.assessment_route_id` and bump `updated_at`.
12. All steps execute in a single database transaction. Pinned syllabus version, progress, tasks, attempts, and notes are never modified.

A route-only change is permitted only when zero option groups apply to the new route, and still executes through this identical atomic transaction.

### 12.2 Streamlined Onboarding Flow

```text
Step 1: Welcome & Full Name
  ↓
Step 2: Subject Selection (1–5 subjects)
  ↓
Step 3: Intended Exam Session (Global default + optional per-subject override)
  ↓
Step 4: Study Route & Options (Conditional, per subject)
  ├── For standard subjects (Further Maths, Maths, Sciences, Business, CS, Econ):
  │     - Select Route: AS Level / Complete A Level / Full A Level.
  │     - If 1 route remains: auto-select.
  │     - 0 extra study option questions.
  │
  └── For subjects with study options (History 9489):
        - Select Route.
        - If AS Route: 1 question -> Select AS History Option (Modern Europe / USA / International).
        - If Complete A Level Route: 3 questions -> AS Option + Paper 3 Topic + Paper 4 Depth Study.
        - If Full A Level Route: 3 questions -> AS Option + Paper 3 Topic + Paper 4 Depth Study.
        - Paper 1 vs Paper 2 allocation is AUTOMATICALLY INFERRED from intended_exam_year.
  ↓
Step 5: Review & Confirm
  - Shows each subject: Session, Qualification Target, Route, Current Papers, Carried Papers, Selected Options.
  - Submits atomic lockdin_complete_onboarding_v2 transaction.
```

### 12.3 Exam Session Year Change Behavior

- If a user changes their `intended_exam_year` (e.g., from 2027 to 2028), and BOTH years are within the applicability range of the pinned syllabus version (`9489-r001` is valid 2027–2029):
  - Pinned syllabus version is **preserved** (no repin).
  - Selected route and study options are **preserved**.
  - Dynamic year-rotation relevance for Paper 1 vs Paper 2 is **automatically re-evaluated** on read.
- If the requested exam year is outside the pinned syllabus version's applicability:
  - The update **FAILS CLOSED**. The system does NOT silently repin the student. A dedicated syllabus migration/session-change workflow is required.

---

## 13. Comprehensive Outcome Relevance Algorithm

```text
                                  ALL SYLLABUS CONTENT
                        (All normalized units in pinned version)
                                            │
                                            ▼
                                   STUDY OPTION FILTER
                       (Filter units matching selected study options;
                        unrelated elective units excluded from default focus)
                                            │
                                            ▼
                                     ROUTE RELEVANCE
                       (Match units/outcomes against route components)
                                            │
                                            ▼
                                 DYNAMIC YEAR-ROTATION
                     (If governed by year mapping for intended_exam_year:
                      authoritative mapping overrides static CSV occurrence)
                                            │
                                            ▼
                                    DISPLAY PRESENTATION
                    ├── currentFocus: true (Current sitting focus for this year)
                    ├── priorStage: true   (Carried forward from earlier sitting)
                    ├── syllabusWide: true (Universal content, e.g. Math in Biology)
                    └── allSyllabusContent toggle: Always accessible
```

### 13.1 Step-by-Step Logic

For each unit and topic in the pinned syllabus version:
1. **Syllabus-Wide Check:** Outcomes with `component_id IS NULL` are marked `syllabusWide = true` and are always relevant.
2. **Option Filter:** If the unit belongs to an option group where the student made a selection, it is relevant only if it belongs to the selected option. Units belonging to unselected options are excluded from default focus.
3. **Dynamic Year Mapping Check:**
   - If the unit has an applicable entry in `assessment_study_option_year_mappings` for `exam_year = intended_exam_year`:
   - The dynamic mapping determines the component assignment (e.g. Paper 1 or Paper 2) and overrides any static CSV occurrence.
   - If mapped component is `current_sitting` in the route $\rightarrow$ `currentFocus = true`.
   - If mapped component is `carried_forward` in the route $\rightarrow$ `priorStage = true` (subject to §6.3 minimal safe v1 rules).
4. **Static Route Matching (Default):**
   - For units not governed by year mappings, match static component occurrences against the route components.
5. **Topic & Progress Aggregation:**
   - Topic relevance reflects its child outcomes.
   - **Progress Denominator Invariant:** Total topics in the pinned syllabus version remains the denominator. Primary progress percentage never changes when a route or option is updated.

---

## 14. Regional Beta Scope Recommendations

The following boundaries represent **Product Beta Operational Scopes**, not legal prohibitions, global exclusions, or permanent product restrictions:

1. **India February/March Exam Series:**
   - **Recommendation:** **OUT OF CONTROLLED-BETA SCOPE**.
   - Product policy: `series_policy.feb_mar = false`.
   - The controlled beta supports May/June and October/November exam series.

2. **US-School Candidates for History 9489:**
   - **Recommendation:** **OUT OF CONTROLLED-BETA SCOPE**.
   - Official Cambridge notice confirms 9489 is unavailable to US schools from 2027 (replaced by US codes 8101, 8102, 9981, 9982).
   - The controlled beta supports standard international Cambridge centres.

---

## 15. Standardized Terminology Baseline

| Context | Internal Identifier | Student-Facing Label | Supporting Copy / Helper Text |
| --- | --- | --- | --- |
| **Qualification Target** | `as_level` | **AS Level** | Standard standalone or first-stage award |
| **Qualification Target** | `a_level` | **A Level** | Full advanced level qualification |
| **Pathway Type** | `single_series` | **AS Level** | All papers taken in one exam series |
| **Pathway Type** | `staged_completion` | **Complete A Level — carry forward AS** | Carry forward your AS Level results and take final completion papers |
| **Pathway Type** | `full_same_series` | **Full A Level — all papers in one exam series** | Sit all required AS and A Level papers together in this exam series |
| **Component Role** | `current_sitting` | **Papers to take now** | Examination papers you are preparing to sit in your intended session |
| **Component Role** | `carried_forward` | **Carried-forward AS papers** | AS results and marks carried forward from an earlier exam series contributing to your A Level |
| **Mathematics 9709 Warning** | `as_pure_only` | **AS Level — Pure Mathematics only (Papers 1 + 2)** | ⚠️ *Standalone qualification: In accordance with Cambridge regulations, this route cannot be carried forward to complete an A Level.* |

---

## 16. Conceptual Database Schema (Migration 0016)

Migration `0016` remains **conceptually defined but NOT created in this documentation task**.

### 16.1 Conceptual Table Inventory

```text
1. assessment_route_sets
   (id, syllabus_version_id, route_revision_key, lifecycle, manifest_sha256, source_manifest, created_at, published_at)

2. assessment_routes
   (id, route_set_id, syllabus_version_id, route_key, display_label, qualification_target, pathway_type, progression_eligibility, order_index)

3. assessment_route_components
   (route_id, route_set_id, component_id, syllabus_version_id, role, qualification_weighting_percent numeric(7,4), order_index)

4. assessment_study_option_groups
   (id, route_set_id, syllabus_version_id, group_key, display_label, applicable_qualification_target, applicable_component_id, order_index)

5. assessment_study_options
   (id, group_id, route_set_id, syllabus_version_id, option_key, display_label, description, order_index)

6. assessment_study_option_units
   (option_id, unit_id, syllabus_version_id)

7. assessment_study_option_year_mappings
   (id, option_id, syllabus_version_id, exam_year, component_id, unit_id, assessment_role)

8. user_subjects (Alteration)
   ADD COLUMN assessment_route_id integer (nullable foreign key)

9. user_subject_option_selections
   (user_id, subject_id, option_group_id, option_id, syllabus_version_id, created_at, updated_at)
```

### 16.2 Composite Referential-Integrity Contract

Migration `0016` may add the non-partial composite `UNIQUE` parent identities required for PostgreSQL to enforce the following composite foreign keys. This includes existing parents such as `assessment_components(id, syllabus_version_id)` and `syllabus_units(id, syllabus_version_id)`, plus the new route/reference tables. No additional index or unique constraint should be added without evidence of an integrity or measured access-path requirement.

1. **`assessment_route_sets`:** Expose unique `(id, syllabus_version_id)`. At most one current `published` route/reference set is selectable for new configuration within a syllabus version.
2. **`assessment_routes`:** Expose non-partial unique `(id, route_set_id, syllabus_version_id)`, non-partial unique `(id, syllabus_version_id)`, and unique `(route_set_id, route_key)`. The three-column identity supports exact route-component references; the two-column identity supports the membership route reference. Its composite parent reference `(route_set_id, syllabus_version_id)` targets the exact route set/version.
3. **`assessment_route_components`:** Store `route_set_id`. Composite `(route_id, route_set_id, syllabus_version_id)` references the exact route parent, while `(component_id, syllabus_version_id)` references the exact component parent. Unique route-component identity and route-local `order_index` constraints prevent duplicate components or duplicate ordering within one route.
4. **`assessment_study_option_groups`:** Composite `(route_set_id, syllabus_version_id)` references the exact route set/version; `(route_set_id, group_key)` is unique. When `applicable_component_id` is non-null, `(applicable_component_id, syllabus_version_id)` references the exact component/version.
5. **`assessment_study_options`:** Store `route_set_id`. Composite `(group_id, route_set_id, syllabus_version_id)` references the exact option-group contract/version; `(group_id, option_key)` is unique. The option exposes unique `(id, syllabus_version_id)` and unique `(id, group_id, syllabus_version_id)` for its children, and the parent group exposes the matching non-partial composite unique identity.
6. **`assessment_study_option_units`:** Composite `(option_id, syllabus_version_id)` references the exact option parent and `(unit_id, syllabus_version_id)` references the exact syllabus-unit parent. `(option_id, unit_id)` is unique, preventing duplicate mappings. The option parent exposes unique `(id, syllabus_version_id)`.
7. **`assessment_study_option_year_mappings`:** Composite option/version, component/version, and unit/version references resolve inside the same option contract and syllabus version. `(option_id, exam_year, unit_id)` is unique, so one option/year/unit cannot map to multiple components. Every mapped unit must already occur in `assessment_study_option_units` for that option. The year must be supported by the exact contract and syllabus applicability. Publication rejects missing required coverage, duplicate or conflicting mappings, a component or unit outside the version, a unit outside the option, or an unsupported year.
8. **`user_subjects.assessment_route_id`:** The `user_subjects` parent exposes non-partial unique `(user_id, subject_id, syllabus_version_id)` for child selection references, while preserving its existing membership identity. `assessment_route_id` is nullable for legacy memberships and never guessed during backfill. A composite membership reference `(assessment_route_id, syllabus_version_id)` targets `assessment_routes(id, syllabus_version_id)` in the exact pinned version; the referenced route carries the preserved route-set identity.
9. **`user_subject_option_selections`:** Composite `(user_id, subject_id, syllabus_version_id)` references the exact membership. Composite `(option_id, option_group_id, syllabus_version_id)` references the exact option/group parent identity. The row uniqueness `(user_id, subject_id, option_group_id)` implements v1 single-select. Membership deletion cascades to its selection rows. These relationships prevent cross-user, cross-subject, cross-version, and cross-group references. New or updated selections must resolve within the membership route's current published contract; a retained historical cross-contract row is stored only as inactive and can never satisfy current configuration.

**Contract lifecycle:** The current `published` contract is selectable for new configuration. A `retired` contract is immutable and remains readable for memberships already referencing it, but new choices never resolve against it. A retained selection from another contract may remain stored but is inactive. Routes and options never migrate automatically between contracts; migration requires a separately approved, reviewed semantic-equivalence process.

### 16.3 Security Boundary & Privileged RPCs

Every privileged mutation RPC (`lockdin_update_study_configuration`, `lockdin_complete_onboarding_v2`, `lockdin_replace_user_subjects_v2`):
1. **Derives Caller Identity:** Directly from `auth.uid()`, never trusted from client parameters.
2. **Accepts Semantic Keys Only:** Accepts `routeKey` and `optionKey` strings, never raw database primary keys.
3. **Resolves Against Pinned Version:** Resolves keys against the user's pinned `syllabus_version_id` and active `published` route set.
4. **Enforces Strict Lock Order:** Locks `profiles` row first, then `user_subjects` row.
5. **Stale-Write Detection:** Checks and updates `expected_updated_at`.
6. **SECURITY DEFINER Requirements:**
   - Must set `SET search_path = ''`.
   - All object references must be schema-qualified (e.g. `public.user_subjects`).
   - Direct `EXECUTE` privileges revoked from `PUBLIC` and `anon`.
   - Granted strictly to `authenticated`.
   - Narrow, sanitized return types.

---

## 17. Reclassification of the Nine Current Subjects

Following the corrections to the architecture, official evidence verification, and option model:

| Subject | Code | Routes | Study Option Groups | Weighting Model | Classification | Audit Notes & Next Action |
| --- | --- | ---: | ---: | --- | --- | --- |
| **Further Mathematics** | 9231 | 5 | 0 | Route-component normalized | **MODEL READY** | Ready for manifest authoring. |
| **History** | 9489 | 3 | 3 | Route-component normalized | **MODEL READY WITH DATA AUDIT** | Model accommodates History cleanly. Manifest authoring requires complete 2027–2029 unit and year-mapping validation against `9489-r001`. |
| **Business** | 9609 | 3 | 0 | Route-component normalized | **MODEL READY** | Ready for manifest authoring. |
| **Computer Science** | 9618 | 3 | 0 | Route-component normalized | **MODEL READY** | Ready for manifest authoring. |
| **Biology** | 9700 | 3 | 0 | Route-component normalized | **MODEL READY** | Ready for manifest authoring (retains 39 syllabus-wide outcomes). |
| **Chemistry** | 9701 | 3 | 0 | Route-component normalized | **MODEL READY** | Ready for manifest authoring. |
| **Physics** | 9702 | 3 | 0 | Route-component normalized | **MODEL READY** | Ready for manifest authoring. |
| **Economics** | 9708 | 3 | 0 | Route-component normalized | **MODEL READY** | Ready for manifest authoring. |
| **Mathematics** | 9709 | 8 | 0 | Route-component normalized | **MODEL READY** | Ready for manifest authoring (includes Pure-only non-progression warning). |

**Audit Verdict:** All nine subjects fit the generic reference model. Eight subjects are **MODEL READY**; History 9489 is **MODEL READY WITH DATA AUDIT** pending actual manifest authoring and data validation before publication.

**ARCHITECTURE BLOCKERS: ZERO.** This does not mean all reference data is ready.

---

## 18. Seven Candidate Subjects Audit Checklist

When the pre-beta subject adoption workstream audits candidate subjects (Information Technology, Accounting, Psychology, Geography, Sociology, English General Paper, English Language):
1. **Qualification Weighting:** Map paper contributions to `qualificationWeightingPercent` on route components.
2. **Study Option Groups:** Identify elective options (e.g., prescribed literature texts, regional topics) and map via `assessment_study_option_units`.
3. **Year-Specific Content Rotations:** Audit whether prescribed themes rotate by exam year and map via `assessment_study_option_year_mappings`.
4. **Regional & Series Boundaries:** Audit June/November vs March availability and regional center rules.

---

## 19. Corrected Acceptance & Verification Test Cases

The test matrix for future implementation must include:
1. **Weighting Validation:**
   - Published weightings use exact `numeric(7,4)` validation and every route totals exactly `100.0000`.
   - Fixed-scale canonical hashing maps equivalent inputs `20`, `20.0`, `20.00`, and `20.0000` to `"20.0000"`; it also serializes `15.5` as `"15.5000"` and `23` as `"23.0000"`.
   - Zero, negative, and values greater than `100.0000` reject publication.
   - Totals `99.9999` and `100.0001` reject publication.
   - Inconsistent same-context weightings reject publication.
2. **Component Semantics:**
   - Route qualification target is never derived from `component.level`.
   - Raw source-graph `weighting_percent` is never displayed as route qualification weighting.
3. **Generic Study Options:**
   - Option choices from a wrong option group or wrong syllabus version reject atomically.
   - No dormant-state boolean is persisted.
   - An inactive selection is derived from the current route/reference contract and group applicability.
   - An inactive selection is excluded from active API output, relevance, and required-option completion.
   - A still-valid selection reactivates after return to a compatible route in the same contract.
   - An old-contract selection never becomes active under a different contract.
4. **Year-Sensitive Mapping:**
   - Official 2027 allocations are Europe/France, USA/Gilded Age, and International/Imperialism on Paper 1; each option's other two units are on Paper 2.
   - Official 2028 allocations are Europe/Germany, USA/Great Crash, and International/International relations on Paper 1; each option's other two units are on Paper 2.
   - Official 2029 allocations are Europe/Russia, USA/Civil War, and International/International history on Paper 1; each option's other two units are on Paper 2.
   - Dynamic year mapping completely supersedes static CSV occurrence for precise focus in every governed year, including 2027.
   - A conflicting or duplicate mapping rejects publication.
   - Missing year mapping fails closed for paper-focus claims without corrupting syllabus content.
5. **Staged Route Carried-Stage Isolation:**
   - Current completion year is never used as a guessed historical sitting year for carried AS papers.
6. **Atomic Study Configuration:**
   - Route and options update in a single transaction; invalid options roll back route change.
   - Stale updates with mismatched `expected_updated_at` reject with HTTP 409.
   - Profile-first then membership lock order prevents deadlocks under concurrent requests.
7. **Composite Integrity:**
   - A route or option linked to the wrong route set or syllabus version rejects.
   - An option linked to the wrong group rejects.
   - Cross-version option/unit linkage rejects.
   - A duplicate logical year mapping rejects.
   - A mapped unit that does not belong to its option rejects.
   - A cross-contract selection is never active and cannot satisfy current configuration.
   - Membership deletion cascades to its option selections.
8. **Progress & Telemetry Invariants:**
   - Whole-syllabus progress denominator and percentage remain identical across route/option changes.
   - No route keys, option selections, or weighting values are emitted to PostHog analytics or Sentry breadcrumbs.

---

## 20. Final Owner Decisions Register

| Decision | Final Owner Decision |
| --- | --- |
| **Report 122 Architecture Amendment** | **APPROVED** |
| **Regional Beta Scope** | **CONFIRMED OUT OF CONTROLLED-BETA SCOPE** for India February/March and US-school History 9489 candidates. These are controlled-beta product boundaries, not legal conclusions or permanent exclusions. |
| **Student-Facing Terminology Baseline** | **APPROVED** |

---

## 21. Final Owner Approval and Implementation Gate

| Approval Fact | Final State |
| --- | --- |
| **Independent authorization review** | **APPROVE** |
| **Architecture blockers** | **ZERO** |
| **Conceptual 0016 readiness** | **READY FOR IMPLEMENTATION AUTHORIZATION** |
| **Owner approval date** | **2026-09-03** |

**Owner Decisions:**
- Report 122 architecture: **APPROVED**
- India February/March controlled beta: **OUT OF SCOPE**
- US-school History 9489 controlled beta: **OUT OF SCOPE**
- Student-facing terminology baseline: **APPROVED**
- Controlled local/repository implementation: **AUTHORIZED**

This owner approval authorizes implementation work only through controlled repository/local slices. It does **not** authorize hosted Production migration application, Production reference-data publication or import, or beta invitation.

---

## 22. Recommended Next Action

**BEGIN CONTROLLED IMPLEMENTATION SLICE A FOR MIGRATION 0016 AND THE ROUTE/REFERENCE-DATA FOUNDATIONS.**

Start locally and in the repository only. Do not apply migration `0016` to hosted environments, publish or import Production reference data, or touch Production.
