import { describe, expect, it } from "vitest";
import {
  assignmentPayloadSessions,
  availableSessionOptions,
  effectiveSessionLabel,
  invalidSessionSubjectIds,
} from "./membership-session-selection";

const availability = [
  {
    subjectId: 1,
    sessions: [
      { year: 2026, series: "Oct/Nov" as const, label: "Oct/Nov 2026" },
      { year: 2027, series: "May/June" as const, label: "May/June 2027" },
    ],
  },
  {
    subjectId: 2,
    sessions: [
      { year: 2027, series: "May/June" as const, label: "May/June 2027" },
    ],
  },
];
const options = availableSessionOptions(availability);

describe("membership session selection", () => {
  it("applies the global default to every un-overridden subject", () => {
    expect(effectiveSessionLabel(1, "May/June 2027", {})).toBe("May/June 2027");
    expect(effectiveSessionLabel(2, "May/June 2027", {})).toBe("May/June 2027");
  });

  it("keeps explicit overrides stable when the global default changes", () => {
    const overrides = { 1: "Oct/Nov 2026" };
    expect(effectiveSessionLabel(1, "May/June 2027", overrides)).toBe(
      "Oct/Nov 2026",
    );
    expect(effectiveSessionLabel(1, "Oct/Nov 2027", overrides)).toBe(
      "Oct/Nov 2026",
    );
  });

  it("restores inheritance when an override is removed", () => {
    expect(effectiveSessionLabel(1, "May/June 2027", {})).toBe("May/June 2027");
  });

  it("builds mixed-session payloads without a syllabus version id", () => {
    const payload = assignmentPayloadSessions(
      [1, 2],
      "Oct/Nov 2026",
      { 2: "May/June 2027" },
      options,
    );
    expect(payload).toEqual({
      intendedExamSession: { year: 2026, series: "Oct/Nov" },
      subjectSessionOverrides: [
        { subjectId: 2, year: 2027, series: "May/June" },
      ],
    });
    expect(payload).not.toHaveProperty("syllabusVersionId");
  });

  it("identifies a mixed global choice that needs an explicit correction", () => {
    expect(
      invalidSessionSubjectIds([1, 2], "Oct/Nov 2026", {}, availability),
    ).toEqual([2]);
    expect(
      invalidSessionSubjectIds(
        [1, 2],
        "Oct/Nov 2026",
        { 2: "May/June 2027" },
        availability,
      ),
    ).toEqual([]);
  });
});
