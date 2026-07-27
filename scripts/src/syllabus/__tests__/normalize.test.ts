import { describe, it, expect } from "vitest";
import { normalizeSyllabus } from "../normalize.js";
import type { ParsedRow } from "../types.js";
import type { SyllabusManifestEntry } from "../manifest.js";

const ENTRY: SyllabusManifestEntry = {
  subjectCode: "9700",
  subjectName: "Biology",
  color: "#84CC16",
  csvFile: "9700_biology.csv",
  versionLabel: "Current syllabus",
  validFrom: null,
  validTo: null,
  isCurrent: true,
};

function makeRow(overrides: Partial<ParsedRow>): ParsedRow {
  return {
    sourceRow: 2,
    mainTopic: "Unit 1",
    subtopic: "Topic A",
    learningOutcome: "Explain the thing",
    subject: "Biology",
    examBoard: "Cambridge International",
    qualification: "Cambridge International AS & A Level",
    level: "AS Level",
    componentName: "Paper 1 Multiple Choice",
    paperCode: "9700/1",
    durationMinutes: 75,
    totalMarks: 40,
    weightingPercent: 31,
    ...overrides,
  };
}

describe("normalizeSyllabus", () => {
  it("collapses a repeated Learning Outcome across multiple papers into ONE outcome row with multiple occurrences (no duplicate LO rows)", () => {
    const rows = [
      makeRow({ paperCode: "9700/1", level: "AS Level" }),
      makeRow({ paperCode: "9700/2", level: "AS Level" }), // same outcome text, different paper
    ];
    const result = normalizeSyllabus(ENTRY, rows);

    expect(result.units).toHaveLength(1);
    expect(result.units[0].topics).toHaveLength(1);
    const outcomes = result.units[0].topics[0].learningOutcomes;
    expect(outcomes).toHaveLength(1); // normalized once, not duplicated
    expect(outcomes[0].occurrences).toHaveLength(2); // but linked to both papers
    expect(outcomes[0].occurrences.map((o) => o.componentKey)).toEqual(
      expect.arrayContaining(["9700/1|AS Level", "9700/2|AS Level"]),
    );
  });

  it("does not create a duplicate occurrence when the exact same (paper, level) repeats for the same outcome", () => {
    const rows = [makeRow({}), makeRow({})]; // fully identical row twice
    const result = normalizeSyllabus(ENTRY, rows);
    const outcomes = result.units[0].topics[0].learningOutcomes;
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].occurrences).toHaveLength(1);
  });

  it("treats the same Paper Code at AS Level and A Level as two DISTINCT components, never deduplicated by Paper Code alone", () => {
    const rows = [
      makeRow({ paperCode: "9700/1", level: "AS Level", weightingPercent: 31 }),
      makeRow({ paperCode: "9700/1", level: "A Level", weightingPercent: 15.5, learningOutcome: "A different outcome" }),
    ];
    const result = normalizeSyllabus(ENTRY, rows);

    expect(result.components).toHaveLength(2);
    const asComponent = result.components.find((c) => c.level === "AS Level");
    const aComponent = result.components.find((c) => c.level === "A Level");
    expect(asComponent?.paperCode).toBe("9700/1");
    expect(aComponent?.paperCode).toBe("9700/1");
    expect(asComponent?.weightingPercent).toBe(31);
    expect(aComponent?.weightingPercent).toBe(15.5);
  });

  it("preserves the Biology-style syllabus-wide row with a blank Paper Code as a component-less occurrence", () => {
    const rows = [
      makeRow({
        mainTopic: "Mathematical requirements",
        subtopic: "At AS Level and A Level",
        paperCode: "",
        level: "AS & A Level",
        componentName: "",
        durationMinutes: null,
        totalMarks: null,
        weightingPercent: null,
      }),
    ];
    const result = normalizeSyllabus(ENTRY, rows);

    expect(result.components).toHaveLength(0); // no component created for a blank Paper Code
    const outcome = result.units[0].topics[0].learningOutcomes[0];
    expect(outcome.occurrences).toEqual([{ componentKey: null, level: "AS & A Level" }]);
  });

  it("preserves original CSV row ordering via orderIndex for units, topics, and learning outcomes", () => {
    const rows = [
      makeRow({ mainTopic: "Unit B", subtopic: "Topic 1", learningOutcome: "First" }),
      makeRow({ mainTopic: "Unit B", subtopic: "Topic 1", learningOutcome: "Second" }),
      makeRow({ mainTopic: "Unit A", subtopic: "Topic 2", learningOutcome: "Third" }),
    ];
    const result = normalizeSyllabus(ENTRY, rows);

    // Units keep first-seen order (Unit B before Unit A), not alphabetical.
    expect(result.units.map((u) => u.title)).toEqual(["Unit B", "Unit A"]);
    expect(result.units[0].orderIndex).toBe(0);
    expect(result.units[1].orderIndex).toBe(1);

    const topic1 = result.units[0].topics[0];
    expect(topic1.learningOutcomes.map((o) => o.outcome)).toEqual(["First", "Second"]);
    expect(topic1.learningOutcomes[0].orderIndex).toBe(0);
    expect(topic1.learningOutcomes[1].orderIndex).toBe(1);
  });

  it("assigns components sequential orderIndex in first-seen order", () => {
    const rows = [
      makeRow({ paperCode: "9700/3", level: "AS Level", learningOutcome: "A" }),
      makeRow({ paperCode: "9700/1", level: "AS Level", learningOutcome: "B" }),
    ];
    const result = normalizeSyllabus(ENTRY, rows);
    expect(result.components[0].paperCode).toBe("9700/3");
    expect(result.components[0].orderIndex).toBe(0);
    expect(result.components[1].paperCode).toBe("9700/1");
    expect(result.components[1].orderIndex).toBe(1);
  });
});
