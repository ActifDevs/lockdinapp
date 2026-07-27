# Syllabus CSV Pre-Import Verification — Deterministic + Semantic Review

You are QA-checking the syllabus CSVs in the supplied folder before database import.

Do not modify, normalize, regenerate, or delete any source CSV unless I explicitly ask you to do so. This pass is read-only.

## 1. Run the deterministic validator first

Run:

```bash
python3 audit_syllabi_v2.py <directory-containing-csvs>
```

The script checks every record, not a sample. It validates:

- exact 12-column header/schema/order
- strict CSV parsing and logical field count per record
- UTF-8/BOM-safe decoding
- blank and malformed rows
- required Main Topic / Learning Outcome / subject metadata
- numeric Duration / Total Marks / Weighting values
- Paper Code format and component metadata completeness
- within-level component contradictions
- exact duplicate rows with row numbers
- normalized near-duplicate rows
- whitespace, tabs, invisible Unicode and common extraction/Markdown artifacts
- blank-field statistics
- repeated learning outcomes and disconnected topic blocks as informational review signals

It writes the complete machine-readable report to `_audit_report.json`.

## 2. Read the entire JSON report

Read the full `_audit_report.json`, not only the terminal summary and not only the first few issues.

Confirm that the report contains every intended input CSV and that no old/backup CSV was accidentally included in the audit folder.

## 3. Apply the severity rules correctly

### CRITICAL
Block import. Examples: schema mismatch, parser failure, wrong field count, missing Main Topic or Learning Outcome.

### HIGH
Block import. Examples: blank required identity metadata, non-numeric numeric fields, contradictory component metadata for the same Paper Code + Level, encoding corruption, or obvious editorial/extraction text stored as a Learning Outcome.

### MEDIUM
Needs review before import. Inspect every flagged row. Do not automatically treat a MEDIUM as wrong.

### LOW
Inspect every flagged row for data cleanliness or extraction damage. Do not dismiss LOW findings automatically; leading whitespace can reveal a previously split heading fragment.

### INFORMATIONAL
Does not affect the script verdict. Use these entries to reason about legitimate repetition and ordering.

## 4. Distinguish legitimate repetition from real duplicates

The same Paper Code may legitimately have different weightings at different qualification levels/routes.

The same `(Main Topic, Subtopic, Learning Outcome)` may legitimately repeat when that outcome is associated with more than one component or level.

Do not call those errors unless the actual rows contradict one another.

Exact duplicate rows with the same full 12-field record are different: review them as likely duplicate database records.

## 5. Perform a targeted semantic second pass

The script is deterministic, but some semantic extraction errors require reasoning. Use the JSON findings and programmatic searches over the CSVs to inspect all suspicious cases, especially:

- Learning Outcomes beginning with punctuation, Markdown markers, or editorial language
- Learning Outcomes with leading/trailing whitespace that may contain the continuation of a comma-containing Subtopic
- validation notes, "refer to above/list", page headers/footers, copyright text, or extraction instructions stored as syllabus content
- suspicious Subtopic fragments that appear truncated at a comma
- unexpected subject/qualification/component changes
- component metadata that is internally plausible syntactically but contradicts another row for the same Paper Code + Level

Do not skim a handful of rows and extrapolate. Query/filter the complete dataset for each suspicious pattern.

If outside syllabus knowledge is needed to decide whether a value is truly wrong, verify it against an authoritative syllabus/source. Do not invent a correction from memory.

## 6. Do not silently fix anything

For every material problem, report:

- file
- row
- column
- current value
- severity
- why it is a problem
- expected form
- recommended action

Do not alter the source CSV in this audit pass.

## 7. Final report

Give me:

1. A file-by-file table with rows, Critical, High, Medium, Low, and verdict.
2. **READY FOR IMPORT** files.
3. **REVIEW REQUIRED** files.
4. **BLOCKED** files.
5. A complete blocker/error register for all CRITICAL/HIGH findings.
6. A short explanation of every MEDIUM/LOW issue that remains after semantic review.
7. Final overall status: `READY FOR IMPORT`, `READY AFTER REVIEW`, or `NOT READY FOR IMPORT`.

The objective is reproducible full-dataset validation first, followed by targeted semantic reasoning — not manual sampling.
