import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseAndValidateCsv } from "../parse-csv.js";
import { EXPECTED_HEADER } from "../types.js";

const HEADER = EXPECTED_HEADER.join(",");

let tmpFiles: string[] = [];

function writeTempCsv(content: string): string {
  const file = path.join(os.tmpdir(), `syllabus-test-${Date.now()}-${Math.random().toString(36).slice(2)}.csv`);
  fs.writeFileSync(file, content, "utf-8");
  tmpFiles.push(file);
  return file;
}

afterEach(() => {
  for (const f of tmpFiles) fs.rmSync(f, { force: true });
  tmpFiles = [];
});

function row(fields: Partial<Record<(typeof EXPECTED_HEADER)[number], string>> = {}): string {
  const defaults: Record<(typeof EXPECTED_HEADER)[number], string> = {
    "Main Topic": "Unit 1",
    Subtopic: "Topic A",
    "Learning Outcome": "Explain the thing",
    Subject: "Physics",
    "Exam Board": "Cambridge International",
    Qualification: "Cambridge International AS & A Level",
    Level: "AS Level",
    "Component Name": "Paper 1 Multiple Choice",
    "Paper Code": "9700/1",
    "Duration (min)": "75",
    "Total Marks": "40",
    "Weighting (%)": "31",
  };
  const merged = { ...defaults, ...fields };
  return EXPECTED_HEADER.map((h) => merged[h]).join(",");
}

describe("parseAndValidateCsv", () => {
  it("case 1: valid CSV parses cleanly with no errors", () => {
    const file = writeTempCsv([HEADER, row()].join("\n") + "\n");
    const result = parseAndValidateCsv(file);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      mainTopic: "Unit 1",
      subtopic: "Topic A",
      learningOutcome: "Explain the thing",
      paperCode: "9700/1",
      level: "AS Level",
      durationMinutes: 75,
      totalMarks: 40,
      weightingPercent: 31,
    });
  });

  it("case 2: missing/incorrect header is a fatal error and yields zero rows", () => {
    const badHeader = EXPECTED_HEADER.filter((h) => h !== "Weighting (%)").join(","); // one column short
    const file = writeTempCsv([badHeader, row()].join("\n") + "\n");
    const result = parseAndValidateCsv(file);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].row).toBe("header");
    expect(result.rows).toHaveLength(0);
  });

  it("case 3: invalid (non-numeric) numeric field is rejected and the row is dropped", () => {
    const file = writeTempCsv([HEADER, row({ "Duration (min)": "not-a-number" })].join("\n") + "\n");
    const result = parseAndValidateCsv(file);
    expect(result.errors.some((e) => e.column === "Duration (min)")).toBe(true);
    expect(result.rows).toHaveLength(0);
  });

  it("case 4: blank optional component fields (e.g. Biology-style syllabus-wide row) are accepted, not errors", () => {
    const file = writeTempCsv(
      [
        HEADER,
        row({
          "Component Name": "",
          "Paper Code": "",
          "Duration (min)": "",
          "Total Marks": "",
          "Weighting (%)": "",
          Level: "AS & A Level",
        }),
      ].join("\n") + "\n",
    );
    const result = parseAndValidateCsv(file);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      paperCode: "",
      componentName: "",
      durationMinutes: null,
      totalMarks: null,
      weightingPercent: null,
    });
  });

  it("case 5: missing a required field (e.g. Learning Outcome) is a row-level error", () => {
    const file = writeTempCsv([HEADER, row({ "Learning Outcome": "" })].join("\n") + "\n");
    const result = parseAndValidateCsv(file);
    expect(result.errors.some((e) => e.column === "Learning Outcome")).toBe(true);
    expect(result.rows).toHaveLength(0);
  });

  it("case 6: a row with the wrong number of fields is rejected", () => {
    // one fewer comma than the header expects
    const malformed = "Unit 1,Topic A,Explain the thing,Physics,Cambridge International,Cambridge International AS & A Level,AS Level,Paper 1,9700/1,75,40";
    const file = writeTempCsv([HEADER, malformed].join("\n") + "\n");
    const result = parseAndValidateCsv(file);
    expect(result.errors.some((e) => e.message.includes("fields, expected 12"))).toBe(true);
    expect(result.rows).toHaveLength(0);
  });

  it("case 7: file containing the Unicode replacement character (invalid UTF-8) is rejected outright", () => {
    const file = writeTempCsv([HEADER, row({ "Learning Outcome": "Explain the th\ufffding" })].join("\n") + "\n");
    const result = parseAndValidateCsv(file);
    expect(result.errors.some((e) => e.message.includes("invalid UTF-8"))).toBe(true);
    expect(result.rows).toHaveLength(0);
  });

  it("case 8: more than one distinct Subject value in a single file is a fatal error", () => {
    const file = writeTempCsv([HEADER, row({ Subject: "Physics" }), row({ Subject: "Chemistry" })].join("\n") + "\n");
    const result = parseAndValidateCsv(file);
    expect(result.errors.some((e) => e.column === "Subject")).toBe(true);
  });

  it("case 9: the same Paper Code + Level with contradictory component metadata elsewhere in the file is rejected", () => {
    const file = writeTempCsv(
      [
        HEADER,
        row({ "Paper Code": "9700/1", Level: "AS Level", "Total Marks": "40" }),
        row({ "Paper Code": "9700/1", Level: "AS Level", "Total Marks": "999" }),
      ].join("\n") + "\n",
    );
    const result = parseAndValidateCsv(file);
    expect(result.errors.some((e) => e.message.includes("contradictory component metadata"))).toBe(true);
  });

  it("does not flag the legitimate AS/A Level split: same Paper Code, different Level, different weighting", () => {
    const file = writeTempCsv(
      [
        HEADER,
        row({ "Paper Code": "9700/1", Level: "AS Level", "Weighting (%)": "31" }),
        row({ "Paper Code": "9700/1", Level: "A Level", "Weighting (%)": "15.5" }),
      ].join("\n") + "\n",
    );
    const result = parseAndValidateCsv(file);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
  });
});
