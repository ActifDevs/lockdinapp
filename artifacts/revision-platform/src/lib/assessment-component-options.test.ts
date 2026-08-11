import { describe, expect, it } from "vitest";
import type { AssessmentComponent } from "@workspace/api-client-react";
import { buildAssessmentComponentOptions } from "./assessment-component-options";

function component(
  id: number,
  level: string,
  weightingPercent: number,
): AssessmentComponent {
  return {
    id,
    subjectId: 9,
    paperCode: "9709/1",
    componentName: "Paper 1 Pure Mathematics 1",
    level,
    durationMinutes: 105,
    totalMarks: 75,
    weightingPercent,
    orderIndex: id,
  };
}

describe("buildAssessmentComponentOptions", () => {
  it("keeps same-code AS and A Level records distinct with their actual IDs", () => {
    const options = buildAssessmentComponentOptions([
      component(42, "AS Level", 60),
      component(46, "A Level", 30),
    ]);

    expect(options).toHaveLength(2);
    expect(options.map((option) => option.value)).toEqual(["42", "46"]);
    expect(options[0]?.label).toBe(
      "9709/1 — Paper 1 Pure Mathematics 1 — AS Level",
    );
    expect(options[1]?.label).toBe(
      "9709/1 — Paper 1 Pure Mathematics 1 — A Level",
    );
    expect(options[0]?.label).not.toBe(options[1]?.label);
  });
});
