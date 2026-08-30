# Syllabus applicability research

This folder holds the applicability **research, provenance, validated population write-set, and future-revision runbook**.

It is not a syllabus graph import source. The Phase 6 owner-authorized applicability operator used the validated `population-manifest.json` write-set to populate hosted `syllabus_versions` and series policy; that hosted population is complete and verified. The files here do not provide standing authorization to repeat or extend hosted writes.

## Files

- `current-version-research.json` — per-subject mapping from Lockdin graphs to official Cambridge International syllabus PDFs.
- `population-manifest.json` — version-controlled, validated write set used for the completed Phase 6 hosted applicability population. Retained as operator input and evidence; do not reapply or extend it without separate owner authorization.
- `future-syllabus-revision-runbook.md` — workflow for validating, importing, publishing, and assigning a future logical revision without overwriting a published graph or automatically repinning memberships.
- Schema version **4** records the owner **content-family** model (Report 102): applicability is material equivalence of r001 across contiguous official editions, not a 1:1 snapshot-to-PDF identity. The previous “exact edition required for applicability” assumption is superseded, not erased.
- Schema version **3** records the owner identity policy: `logical_revision_key` is `{subjectCode}-rNNN` (internal snapshot). Cambridge edition stays in this artifact. Year-span and year-span-plus-official-version key proposals are superseded, not erased.
- Schema version **2** added the forensic edition-identification pass. Previous `matchStatus` values remain as `previousMatchStatus`.

Companion reports: 97 (edition identification), 98 (legacy adoption readiness; membership count corrected to 12/12 valid pins), 99 (hosted r001 adopt), 100–101 (C2B1 series-policy foundation), 102 (content-family applicability).

## Hosted population status

Phase 6 hosted-closeout evidence records the applicability/policy population as **completed and verified**:

- Applicability windows: **9/9**
- Series-policy rows: **27**
- May/June: **enabled where applicable**
- Oct/Nov: **enabled where applicable**
- Feb/Mar: **disabled**
- Current real graphs: **9 published `r001`**
- Real `r002`: **NONE**

This is the current hosted state documented by `docs/cursor/reports/112-phase6-final-closeout.md`. The research artifacts explain how the r001 applicability decisions were reached; the validation/operator tooling checks and applies an authorized write-set; and the future-revision runbook governs later revision work. A future `r002` requires its own reviewed workflow and authorization.

## Status vocabulary

- `VERIFIED` — official Cambridge source + repository graph evidence + no material contradiction about **which** specification edition the graph is.
- `PROBABLE` — official sources and graph structure align, but the examination-year edition is not uniquely determined from repository content.
- `AMBIGUOUS` — more than one official edition could fit, or official editions diverge in ways the graph cannot settle.
- `UNRESOLVED` — official Cambridge evidence was not obtained.

Search-engine snippets and third-party sites are not authority. Every factual claim in the JSON points at an official Cambridge URL.

## Retrieval

Research dates recorded in the JSON: **2026-08-29** (Report 96 inventory + Report 97 forensic pass + Report 102 content-family pass).

## Do not

- run `syllabus:adopt`, `import`, or `publish` from this folder
- treat the research JSON or this README as a hosted write instruction
- repeat or change hosted applicability/policy values without separate owner authorization
- treat the completed r001 population as authorization for a future revision or automatic repin
