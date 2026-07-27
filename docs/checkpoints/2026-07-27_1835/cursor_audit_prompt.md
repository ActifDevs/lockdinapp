# Syllabus CSV Pre-Import Verification

You are QA-checking 9 syllabus CSVs before they're imported into our app's database.

**Do not manually read through the CSVs row by row and eyeball them.** With ~4,300 rows
across 9 files, that approach silently samples instead of checking everything, and tends
to produce false "looks fine" confidence. Instead:

1. Run `python3 audit_syllabi.py <directory>` against the folder containing the CSVs.
   This deterministically checks every row of every file for: header/schema correctness,
   field-count per row, blank/malformed rows, numeric validity of Duration/Total Marks/
   Weighting, Subject/Exam Board/Qualification/Level consistency, Paper Code conflicts,
   and exact/near duplicate detection. It classifies every finding as CRITICAL / HIGH /
   MEDIUM / LOW and prints a verdict per file plus an overall summary.

2. Read the full `_audit_report.json` it writes (not just the printed summary) — it
   contains every individual finding, not a truncated sample.

3. For anything flagged MEDIUM or LOW, don't assume it's an error. In particular:
   - The same Paper Code legitimately appears with two different weightings when a paper
     counts differently toward an AS-only route vs. the full A-Level (this is real Cambridge
     structure, not a data bug).
   - The same (Main Topic, Subtopic, Learning Outcome) can legitimately repeat when a
     learning outcome is examined at both AS Level and A Level.
   Only flag these as real problems if the repetition/conflict doesn't fit one of those
   explanations — check the actual rows before concluding.

4. For anything flagged CRITICAL or HIGH, treat these as blockers. Report them back to me
   with file, row, column, and the actual problem — do not attempt to fix the source CSVs
   yourself unless I ask you to.

5. Give me a final summary: which files are READY FOR IMPORT, which need review, and
   which (if any) are blocked, with the specific reason for anything not fully clean.
