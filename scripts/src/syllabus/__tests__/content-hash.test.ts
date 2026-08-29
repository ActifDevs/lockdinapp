import { describe, expect, it } from "vitest";
import {
  canonicalGraphFromNormalized,
  hashNormalizedSyllabus,
} from "../canonical-graph.js";
import type { NormalizedSyllabus } from "../normalize.js";

function sample(overrides: Partial<NormalizedSyllabus> = {}): NormalizedSyllabus {
  return {
    subjectCode: "9702",
    subjectName: "Physics",
    color: "#000000",
    csvFile: "9702_physics.csv",
    examBoard: "Cambridge International",
    qualification: "Cambridge International AS & A Level",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
    units: [
      {
        title: "Unit 1",
        orderIndex: 0,
        topics: [
          {
            title: "Topic A",
            orderIndex: 0,
            learningOutcomes: [
              {
                outcome: "Explain motion",
                orderIndex: 0,
                occurrences: [{ componentKey: "9702/1|AS Level", level: "AS Level" }],
              },
            ],
          },
        ],
      },
    ],
    components: [
      {
        paperCode: "9702/1",
        level: "AS Level",
        componentName: "Paper 1",
        durationMinutes: 75,
        totalMarks: 40,
        weightingPercent: 31,
        orderIndex: 0,
      },
    ],
    notices: [],
    ...overrides,
  };
}

describe("canonical content fingerprint", () => {
  it("hashes the same normalized graph identically", () => {
    expect(hashNormalizedSyllabus(sample())).toBe(hashNormalizedSyllabus(sample()));
  });

  it("is independent of unit array order when order_index is unchanged", () => {
    const a = sample();
    const b = sample({
      units: [
        { title: "Unit 2", orderIndex: 1, topics: [] },
        { title: "Unit 1", orderIndex: 0, topics: a.units[0]!.topics },
      ],
    });
    const c = sample({
      units: [
        { title: "Unit 1", orderIndex: 0, topics: a.units[0]!.topics },
        { title: "Unit 2", orderIndex: 1, topics: [] },
      ],
    });
    expect(hashNormalizedSyllabus(b)).toBe(hashNormalizedSyllabus(c));
  });

  it("is independent of filename", () => {
    expect(hashNormalizedSyllabus(sample({ csvFile: "a.csv" }))).toBe(
      hashNormalizedSyllabus(sample({ csvFile: "b.csv" })),
    );
  });

  it("does not include line-ending or quoting representation (normalized objects only)", () => {
    const left = sample();
    const right = structuredClone(left);
    expect(hashNormalizedSyllabus(left)).toBe(hashNormalizedSyllabus(right));
  });

  it("changes when a topic title changes", () => {
    const changed = sample();
    changed.units[0]!.topics[0]!.title = "Topic B";
    expect(hashNormalizedSyllabus(changed)).not.toBe(hashNormalizedSyllabus(sample()));
  });

  it("changes when an outcome-component relationship changes", () => {
    const changed = sample();
    changed.units[0]!.topics[0]!.learningOutcomes[0]!.occurrences = [
      { componentKey: "9702/2|AS Level", level: "AS Level" },
    ];
    expect(hashNormalizedSyllabus(changed)).not.toBe(hashNormalizedSyllabus(sample()));
  });

  it("changes when semantic order_index changes", () => {
    const changed = sample({
      units: [
        {
          title: "Unit 1",
          orderIndex: 5,
          topics: sample().units[0]!.topics,
        },
      ],
    });
    expect(hashNormalizedSyllabus(changed)).not.toBe(hashNormalizedSyllabus(sample()));
  });

  it("excludes publication metadata from the canonical payload", () => {
    const graph = canonicalGraphFromNormalized(sample({ isCurrent: false }));
    expect(JSON.stringify(graph)).not.toContain("isCurrent");
    expect(JSON.stringify(graph)).not.toContain("lifecycle");
    expect(JSON.stringify(graph)).not.toContain("csvFile");
  });
});
