import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { EXPECTED_HEADER, type FileValidationResult, type ParsedRow, type ValidationIssue } from "./types.js";

const ALLOWED_LEVELS = new Set(["AS Level", "A Level", "AS & A Level"]);
const PAPER_CODE_RE = /^\d{4}\/\d+$/;

function isNumeric(value: string): boolean {
  return value.trim() !== "" && Number.isFinite(Number(value));
}

/**
 * Runtime/import-safety validation. This intentionally does not re-run the full
 * semantic audit (duplicate detection, editorial-artifact heuristics, etc.) that
 * already happened in the pre-import review — it re-checks the things that would
 * make a database write unsafe or malformed if the source file ever changed.
 */
export function parseAndValidateCsv(filePath: string): FileValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const fileName = filePath.split("/").pop()!;

  let raw: Buffer;
  try {
    raw = fs.readFileSync(filePath);
  } catch (err) {
    errors.push({ row: "file", column: "-", message: `could not read file: ${(err as Error).message}` });
    return { file: fileName, errors, warnings, rows: [] };
  }

  const text = raw.toString("utf-8");
  if (text.includes("\ufffd")) {
    errors.push({ row: "file", column: "-", message: "file contains the Unicode replacement character (invalid UTF-8)" });
    return { file: fileName, errors, warnings, rows: [] };
  }

  let records: string[][];
  try {
    records = parse(text, {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: false,
    }) as string[][];
  } catch (err) {
    errors.push({ row: "file", column: "-", message: `CSV parser error: ${(err as Error).message}` });
    return { file: fileName, errors, warnings, rows: [] };
  }

  if (records.length === 0) {
    errors.push({ row: "file", column: "-", message: "file is empty" });
    return { file: fileName, errors, warnings, rows: [] };
  }

  const [header, ...dataRows] = records;
  if (header.length !== EXPECTED_HEADER.length || header.some((h, i) => h !== EXPECTED_HEADER[i])) {
    errors.push({
      row: "header",
      column: "-",
      message: `header does not exactly match the required 12-column schema/order (got: ${JSON.stringify(header)})`,
    });
    return { file: fileName, errors, warnings, rows: [] };
  }

  const rows: ParsedRow[] = [];
  const subjectValues = new Set<string>();
  const examBoardValues = new Set<string>();
  const qualificationValues = new Set<string>();
  const componentKeyToMetadata = new Map<string, string>();

  dataRows.forEach((raw, idx) => {
    const rowNum = idx + 2; // header is row 1
    if (raw.length === 1 && raw[0] === "") return; // trailing blank line from parser
    if (raw.length !== EXPECTED_HEADER.length) {
      errors.push({ row: rowNum, column: "-", message: `row has ${raw.length} fields, expected 12` });
      return;
    }
    if (raw.every((cell) => cell.trim() === "")) {
      warnings.push({ row: rowNum, column: "ALL", message: "completely blank row, skipped" });
      return;
    }

    const [
      mainTopic,
      subtopic,
      learningOutcome,
      subject,
      examBoard,
      qualification,
      level,
      componentName,
      paperCode,
      durationRaw,
      totalMarksRaw,
      weightingRaw,
    ] = raw;

    let rowHasError = false;
    for (const [col, value] of [
      ["Main Topic", mainTopic],
      ["Learning Outcome", learningOutcome],
      ["Subject", subject],
      ["Exam Board", examBoard],
      ["Qualification", qualification],
      ["Level", level],
    ] as const) {
      if (value.trim() === "") {
        errors.push({ row: rowNum, column: col, message: `missing required ${col}` });
        rowHasError = true;
      }
    }

    for (const [col, value] of [
      ["Duration (min)", durationRaw],
      ["Total Marks", totalMarksRaw],
      ["Weighting (%)", weightingRaw],
    ] as const) {
      if (value.trim() !== "" && !isNumeric(value)) {
        errors.push({ row: rowNum, column: col, message: `non-numeric value: ${JSON.stringify(value)}` });
        rowHasError = true;
      }
    }

    if (level.trim() !== "" && !ALLOWED_LEVELS.has(level.trim())) {
      warnings.push({ row: rowNum, column: "Level", message: `unexpected Level value: ${JSON.stringify(level)}` });
    }

    if (paperCode.trim() !== "" && !PAPER_CODE_RE.test(paperCode.trim())) {
      warnings.push({ row: rowNum, column: "Paper Code", message: `Paper Code does not match ####/# pattern: ${JSON.stringify(paperCode)}` });
    }

    if (rowHasError) return;

    if (subject.trim()) subjectValues.add(subject.trim());
    if (examBoard.trim()) examBoardValues.add(examBoard.trim());
    if (qualification.trim()) qualificationValues.add(qualification.trim());

    if (paperCode.trim() && level.trim()) {
      const key = `${paperCode.trim()}|${level.trim()}`;
      const metadata = JSON.stringify([componentName.trim(), durationRaw.trim(), totalMarksRaw.trim(), weightingRaw.trim()]);
      const existing = componentKeyToMetadata.get(key);
      if (existing !== undefined && existing !== metadata) {
        errors.push({
          row: rowNum,
          column: "Paper Code",
          message: `Paper Code ${paperCode.trim()} + Level ${level.trim()} has contradictory component metadata elsewhere in this file`,
        });
        return;
      }
      componentKeyToMetadata.set(key, metadata);
    }

    rows.push({
      sourceRow: rowNum,
      mainTopic: mainTopic.trim(),
      subtopic: subtopic.trim(),
      learningOutcome: learningOutcome.trim(),
      subject: subject.trim(),
      examBoard: examBoard.trim(),
      qualification: qualification.trim(),
      level: level.trim(),
      componentName: componentName.trim(),
      paperCode: paperCode.trim(),
      durationMinutes: durationRaw.trim() ? Number(durationRaw) : null,
      totalMarks: totalMarksRaw.trim() ? Number(totalMarksRaw) : null,
      weightingPercent: weightingRaw.trim() ? Number(weightingRaw) : null,
    });
  });

  if (subjectValues.size > 1) {
    errors.push({ row: "file", column: "Subject", message: `multiple distinct Subject values in one file: ${[...subjectValues].join(", ")}` });
  }
  if (examBoardValues.size > 1) {
    errors.push({ row: "file", column: "Exam Board", message: `multiple distinct Exam Board values in one file: ${[...examBoardValues].join(", ")}` });
  }
  if (qualificationValues.size > 1) {
    errors.push({ row: "file", column: "Qualification", message: `multiple distinct Qualification values in one file: ${[...qualificationValues].join(", ")}` });
  }

  return { file: fileName, errors, warnings, rows };
}
