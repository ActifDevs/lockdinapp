#!/usr/bin/env python3
"""Deterministic pre-import validator for Cambridge A-Level syllabus CSVs.

Usage:
    python3 audit_syllabi_v2.py <directory-containing-csvs>

Writes:
    _audit_report.json

The script is read-only with respect to source CSVs.
"""
from __future__ import annotations

import collections
import csv
import json
import os
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any

EXPECTED_HEADER = [
    "Main Topic",
    "Subtopic",
    "Learning Outcome",
    "Subject",
    "Exam Board",
    "Qualification",
    "Level",
    "Component Name",
    "Paper Code",
    "Duration (min)",
    "Total Marks",
    "Weighting (%)",
]

SEVERITIES = ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL")
CORE_REQUIRED = ("Main Topic", "Learning Outcome", "Subject", "Exam Board", "Qualification", "Level")
NUMERIC_COLS = ("Duration (min)", "Total Marks", "Weighting (%)")
COMPONENT_COLS = ("Component Name", "Paper Code", "Duration (min)", "Total Marks", "Weighting (%)")
ALLOWED_LEVELS = {"AS Level", "A Level", "AS & A Level"}
PAPER_CODE_RE = re.compile(r"^\d{4}/\d+$")
EDITORIAL_PATTERNS = (
    re.compile(r"^\*\*"),
    re.compile(r"refer to (?:the )?(?:list|section|above)", re.I),
    re.compile(r"(?:structure|content|completeness) validation", re.I),
    re.compile(r"^\):\*\*"),
)


def add_issue(issues: dict[str, list[dict[str, Any]]], severity: str, row: Any, col: str,
              value: Any, problem: str) -> None:
    issues[severity].append({
        "row": row,
        "col": col,
        "value": value,
        "problem": problem,
    })


def is_number(value: str) -> bool:
    try:
        float(value)
        return True
    except ValueError:
        return False


def normalized_text(value: str) -> str:
    # Conservative normalization for likely duplicate detection.
    value = unicodedata.normalize("NFKC", value)
    value = re.sub(r"\s+", " ", value.strip()).casefold()
    return value


def audit_file(path: Path) -> dict[str, Any]:
    fname = path.name
    issues: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)

    # Parse robustly: utf-8-sig accepts both plain UTF-8 and UTF-8 with BOM.
    # newline='' allows csv.reader to preserve valid quoted embedded newlines.
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as fh:
            reader = csv.reader(fh, strict=True)
            rows = list(reader)
    except UnicodeDecodeError as exc:
        add_issue(issues, "CRITICAL", "file", "-", "", f"UTF-8 decoding failed: {exc}")
        return finalize_report(fname, [], [], issues)
    except csv.Error as exc:
        add_issue(issues, "CRITICAL", "file", "-", "", f"CSV parser error: {exc}")
        return finalize_report(fname, [], [], issues)

    if not rows:
        add_issue(issues, "CRITICAL", "file", "-", "", "file is empty")
        return finalize_report(fname, [], [], issues)

    header, data = rows[0], rows[1:]

    # Header/schema checks.
    if header != EXPECTED_HEADER:
        add_issue(
            issues, "CRITICAL", "header", "-", header,
            "header does not exactly match the required 12-column schema/order",
        )
    if len(header) != 12:
        add_issue(issues, "CRITICAL", "header", "-", len(header), "header does not contain exactly 12 columns")
    if len(header) != len(set(header)):
        add_issue(issues, "CRITICAL", "header", "-", header, "duplicate header names")
    for h in header:
        if h != h.strip():
            add_issue(issues, "LOW", "header", h, repr(h), "leading/trailing whitespace in header")

    # Record-shape checks first. Semantic checks only use 12-field rows.
    valid_rows: list[tuple[int, list[str]]] = []
    for row_num, row in enumerate(data, start=2):
        if len(row) != 12:
            add_issue(
                issues, "CRITICAL", row_num, "-", f"{len(row)} fields",
                "row does not contain exactly 12 logical CSV fields",
            )
            continue
        if all(cell.strip() == "" for cell in row):
            add_issue(issues, "HIGH", row_num, "ALL", "", "completely blank row")
            continue
        valid_rows.append((row_num, row))

    # Per-cell formatting and required-field checks.
    for row_num, row in valid_rows:
        for idx, value in enumerate(row):
            col = EXPECTED_HEADER[idx]
            if value != value.strip():
                add_issue(issues, "LOW", row_num, col, repr(value)[:200], "leading/trailing whitespace in field")
            if "\t" in value:
                add_issue(issues, "LOW", row_num, col, repr(value)[:200], "tab character in field")
            if "\ufffd" in value:
                add_issue(issues, "HIGH", row_num, col, repr(value)[:200], "Unicode replacement character suggests encoding corruption")
            if any(unicodedata.category(ch) == "Cf" for ch in value):
                add_issue(issues, "LOW", row_num, col, repr(value)[:200], "invisible Unicode format character in field")
            if re.search(r" {2,}", value):
                add_issue(issues, "LOW", row_num, col, repr(value)[:200], "repeated spaces in field")

        row_map = dict(zip(EXPECTED_HEADER, row))
        for col in CORE_REQUIRED:
            if row_map[col].strip() == "":
                sev = "CRITICAL" if col in ("Main Topic", "Learning Outcome") else "HIGH"
                add_issue(issues, sev, row_num, col, "", f"missing required {col}")

        level = row_map["Level"].strip()
        if level and level not in ALLOWED_LEVELS:
            add_issue(issues, "MEDIUM", row_num, "Level", level, "unexpected Level value")

        paper_code = row_map["Paper Code"].strip()
        if paper_code:
            if not PAPER_CODE_RE.fullmatch(paper_code):
                add_issue(issues, "MEDIUM", row_num, "Paper Code", paper_code, "Paper Code does not match expected ####/# pattern")
            # If a paper code exists, its component metadata should be populated.
            for col in ("Component Name", "Duration (min)", "Total Marks", "Weighting (%)"):
                if row_map[col].strip() == "":
                    add_issue(issues, "MEDIUM", row_num, col, "", f"{col} is blank despite populated Paper Code")
        elif all(row_map[col].strip() == "" for col in COMPONENT_COLS):
            add_issue(
                issues, "INFORMATIONAL", row_num, "Component metadata", "",
                "all component-specific fields are blank; may be legitimate syllabus-wide content",
            )

        # Numeric validation.
        for col in NUMERIC_COLS:
            value = row_map[col].strip()
            if not value:
                continue
            if not is_number(value):
                add_issue(issues, "HIGH", row_num, col, value, f"non-numeric value in {col}")
                continue
            number = float(value)
            if col in ("Duration (min)", "Total Marks") and number <= 0:
                add_issue(issues, "HIGH", row_num, col, value, f"{col} must be greater than zero")
            if col == "Duration (min)" and not number.is_integer():
                add_issue(issues, "MEDIUM", row_num, col, value, "duration contains fractional minutes")
            if col == "Weighting (%)" and not (0 <= number <= 100):
                add_issue(issues, "HIGH", row_num, col, value, "weighting outside 0-100 range")

        lo = row_map["Learning Outcome"]
        for pattern in EDITORIAL_PATTERNS:
            if pattern.search(lo):
                add_issue(issues, "HIGH", row_num, "Learning Outcome", lo[:250], "possible editorial/Markdown/extraction artifact in Learning Outcome")
                break

    # File-level identity consistency. Blank values are handled per row above.
    def counter_at(index: int) -> collections.Counter[str]:
        return collections.Counter(row[index].strip() for _, row in valid_rows if row[index].strip())

    for col, idx in (("Subject", 3), ("Exam Board", 4), ("Qualification", 5)):
        values = counter_at(idx)
        if len(values) > 1:
            add_issue(issues, "HIGH", "ALL", col, dict(values), f"multiple distinct nonblank {col} values in one file")

    # Component consistency: compare within the same paper code AND level.
    by_component_key: dict[tuple[str, str], dict[tuple[str, str, str, str], list[int]]] = collections.defaultdict(lambda: collections.defaultdict(list))
    cross_level: dict[str, set[tuple[str, str, str, str, str]]] = collections.defaultdict(set)
    for row_num, row in valid_rows:
        row_map = dict(zip(EXPECTED_HEADER, row))
        pc = row_map["Paper Code"].strip()
        level = row_map["Level"].strip()
        if not pc:
            continue
        metadata = (
            row_map["Component Name"].strip(),
            row_map["Duration (min)"].strip(),
            row_map["Total Marks"].strip(),
            row_map["Weighting (%)"].strip(),
        )
        by_component_key[(pc, level)][metadata].append(row_num)
        cross_level[pc].add((level,) + metadata)

    for (pc, level), variants in by_component_key.items():
        if len(variants) > 1:
            add_issue(
                issues, "HIGH", "ALL", "Paper Code",
                {"paper_code": pc, "level": level, "variants": {str(k): v for k, v in variants.items()}},
                "same Paper Code and Level has contradictory component metadata",
            )

    for pc, variants in cross_level.items():
        weightings = {(v[0], v[4]) for v in variants}
        if len(weightings) > 1 and len({v[0] for v in variants}) > 1:
            add_issue(
                issues, "INFORMATIONAL", "ALL", "Paper Code",
                {"paper_code": pc, "variants": sorted(variants)},
                "paper metadata/weighting differs across levels; often legitimate AS-route vs full-A-Level structure",
            )

    # Exact duplicate rows with exact row numbers.
    exact_groups: dict[tuple[str, ...], list[int]] = collections.defaultdict(list)
    normalized_groups: dict[tuple[str, ...], list[int]] = collections.defaultdict(list)
    lo_groups: dict[tuple[str, str, str], list[dict[str, Any]]] = collections.defaultdict(list)

    for row_num, row in valid_rows:
        exact_groups[tuple(row)].append(row_num)
        normalized_groups[tuple(normalized_text(v) for v in row)].append(row_num)
        lo_groups[(row[0].strip(), row[1].strip(), row[2].strip())].append({
            "row": row_num,
            "level": row[6].strip(),
            "component": row[7].strip(),
            "paper_code": row[8].strip(),
        })

    exact_dupes = {rows[0]: rows for rows in exact_groups.values() if len(rows) > 1}
    for first_row, rows in exact_dupes.items():
        add_issue(issues, "MEDIUM", rows, "ALL", f"duplicate of row {first_row}", "exact duplicate rows")

    exact_row_sets = {tuple(v) for v in exact_groups.values() if len(v) > 1}
    for rows in normalized_groups.values():
        if len(rows) > 1 and tuple(rows) not in exact_row_sets:
            add_issue(
                issues, "LOW", rows, "ALL", rows,
                "near-duplicate rows after case/Unicode/whitespace normalization; inspect before deduplication",
            )

    for key, entries in lo_groups.items():
        if len(entries) > 1:
            add_issue(
                issues, "INFORMATIONAL", [e["row"] for e in entries], "Learning Outcome",
                {"topic": key[0], "subtopic": key[1], "outcome": key[2], "occurrences": entries},
                "same topic/subtopic/learning outcome repeats; may be legitimate across levels/components",
            )

    # Ordering signal: disconnected blocks of the same Main Topic.
    topic_blocks: dict[str, list[int]] = collections.defaultdict(list)
    previous = object()
    for row_num, row in valid_rows:
        topic = row[0].strip()
        if topic != previous:
            topic_blocks[topic].append(row_num)
            previous = topic
    for topic, starts in topic_blocks.items():
        if topic and len(starts) > 1:
            add_issue(
                issues, "INFORMATIONAL", starts, "Main Topic", topic,
                "Main Topic appears in multiple disconnected blocks; verify this is explained by level/component structure",
            )

    return finalize_report(fname, header, data, issues)


def finalize_report(fname: str, header: list[str], data: list[list[str]],
                    issues: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    counts = {severity: len(issues.get(severity, [])) for severity in SEVERITIES}

    # HIGH is a blocker, matching the review prompt.
    if counts["CRITICAL"] or counts["HIGH"]:
        verdict = "FAIL"
    elif counts["MEDIUM"] or counts["LOW"]:
        verdict = "PASS WITH WARNINGS"
    else:
        verdict = "PASS"

    col_stats: dict[str, dict[str, Any]] = {}
    if header:
        for idx, col in enumerate(header):
            populated = sum(1 for row in data if len(row) > idx and row[idx].strip())
            total = len(data)
            col_stats[col] = {
                "total": total,
                "populated": populated,
                "blank": total - populated,
                "blank_pct": round((total - populated) * 100 / total, 2) if total else 0,
            }

    return {
        "file": fname,
        "rows": len(data),
        "columns": len(header),
        "counts": counts,
        "verdict": verdict,
        "col_stats": col_stats,
        "issues": {severity: issues.get(severity, []) for severity in SEVERITIES},
    }


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python3 audit_syllabi_v2.py <directory-containing-csvs>")
        return 2

    directory = Path(sys.argv[1])
    if not directory.is_dir():
        print(f"Error: directory not found: {directory}")
        return 2

    csv_files = sorted(p for p in directory.iterdir() if p.is_file() and p.suffix.lower() == ".csv")
    if not csv_files:
        print("No CSV files found.")
        return 2

    reports: dict[str, Any] = {}
    for path in csv_files:
        report = audit_file(path)
        reports[path.name] = report
        c = report["counts"]
        print(
            f"{path.name:45s} rows={report['rows']:5d} "
            f"CRITICAL={c['CRITICAL']:3d} HIGH={c['HIGH']:3d} "
            f"MEDIUM={c['MEDIUM']:3d} LOW={c['LOW']:3d} INFO={c['INFORMATIONAL']:3d} "
            f"-> {report['verdict']}"
        )

    report_path = directory / "_audit_report.json"
    with report_path.open("w", encoding="utf-8") as fh:
        json.dump(reports, fh, indent=2, ensure_ascii=False)

    ready = [name for name, r in reports.items() if r["verdict"] == "PASS"]
    warn = [name for name, r in reports.items() if r["verdict"] == "PASS WITH WARNINGS"]
    fail = [name for name, r in reports.items() if r["verdict"] == "FAIL"]

    print("\n--- SUMMARY ---")
    print("PASS:", ready)
    print("PASS WITH WARNINGS:", warn)
    print("FAIL:", fail)
    print("\nOverall:", "NOT READY FOR IMPORT" if fail else ("READY AFTER REVIEW" if warn else "READY FOR IMPORT"))
    print(f"\nFull machine-readable report written to {report_path}")
    return 1 if fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
