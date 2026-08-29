# Syllabus applicability research

This folder holds **research and provenance only**.

It is not an import source. It must not be applied to hosted `syllabus_versions` until the owner approves identity keys and a later operator workstream.

## Files

- `current-version-research.json` — per-subject mapping from Lockdin graphs to official Cambridge International syllabus PDFs.
- Schema version **3** records the owner identity policy: `logical_revision_key` is `{subjectCode}-rNNN` (internal snapshot). Cambridge edition stays in this artifact. Year-span and year-span-plus-official-version key proposals are superseded, not erased.
- Schema version **2** added the forensic edition-identification pass. Previous `matchStatus` values remain as `previousMatchStatus`.

Companion reports: 97 (edition identification), 98 (legacy adoption readiness; membership count corrected to 12/12 valid pins).

## Status vocabulary

- `VERIFIED` — official Cambridge source + repository graph evidence + no material contradiction about **which** specification edition the graph is.
- `PROBABLE` — official sources and graph structure align, but the examination-year edition is not uniquely determined from repository content.
- `AMBIGUOUS` — more than one official edition could fit, or official editions diverge in ways the graph cannot settle.
- `UNRESOLVED` — official Cambridge evidence was not obtained.

Search-engine snippets and third-party sites are not authority. Every factual claim in the JSON points at an official Cambridge URL.

## Retrieval

Research dates recorded in the JSON: **2026-08-29** (Report 96 inventory + Report 97 forensic pass).

## Do not

- run `syllabus:adopt`, `import`, or `publish` from this folder
- write `logical_revision_key` or `applicable_*` on hosted data from this file
- treat proposed keys or windows as applied
