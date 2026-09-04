import { describe, expect, it } from "vitest";
import {
  projectAssignmentSessionAvailability,
  type AssignmentAvailabilityRow,
} from "./assignment-session-availability";

const base: AssignmentAvailabilityRow = {
  subjectId: 1,
  syllabusVersionId: 10,
  lifecycle: "published",
  applicableFromYear: 2026,
  applicableFromSeries: "May/June",
  applicableToYear: 2028,
  applicableToSeries: "Oct/Nov",
  series: "May/June",
  productAutoAssign: true,
};

describe("projectAssignmentSessionAvailability", () => {
  it("returns upcoming May/June and Oct/Nov choices within applicability", () => {
    const result = projectAssignmentSessionAvailability(
      [1],
      [base, { ...base, series: "Oct/Nov" }],
      new Date("2026-08-30T00:00:00Z"),
    );

    expect(result[0]?.sessions).toEqual([
      {
        year: 2026,
        series: "Oct/Nov",
        label: "Oct/Nov 2026",
        syllabusVersionId: 10,
      },
      {
        year: 2027,
        series: "May/June",
        label: "May/June 2027",
        syllabusVersionId: 10,
      },
      {
        year: 2027,
        series: "Oct/Nov",
        label: "Oct/Nov 2027",
        syllabusVersionId: 10,
      },
      {
        year: 2028,
        series: "May/June",
        label: "May/June 2028",
        syllabusVersionId: 10,
      },
      {
        year: 2028,
        series: "Oct/Nov",
        label: "Oct/Nov 2028",
        syllabusVersionId: 10,
      },
    ]);
  });

  it("models History: excludes Oct/Nov 2026 and includes May/June 2027", () => {
    const history = {
      ...base,
      subjectId: 9489,
      applicableFromYear: 2027,
      applicableFromSeries: "May/June" as const,
      applicableToYear: 2029,
      applicableToSeries: "Oct/Nov" as const,
    };
    const sessions = projectAssignmentSessionAvailability(
      [9489],
      [history, { ...history, series: "Oct/Nov" }],
      new Date("2026-08-30T00:00:00Z"),
    )[0]?.sessions;

    expect(sessions).toContainEqual({
      year: 2027,
      series: "May/June",
      label: "May/June 2027",
      syllabusVersionId: 10,
    });
    expect(sessions).not.toContainEqual(
      expect.objectContaining({ year: 2026 }),
    );
  });

  it("excludes Feb/Mar, false policy, incomplete applicability, and non-published versions", () => {
    const result = projectAssignmentSessionAvailability(
      [1, 2, 3, 4],
      [
        { ...base, series: "Feb/Mar" },
        { ...base, subjectId: 2, productAutoAssign: false },
        { ...base, subjectId: 3, applicableToYear: null },
        { ...base, subjectId: 4, lifecycle: "retired" },
      ],
      new Date("2026-01-01T00:00:00Z"),
    );

    expect(result.every(({ sessions }) => sessions.length === 0)).toBe(true);
  });

  it("excludes an ambiguous choice but keeps unambiguous choices", () => {
    const duplicateCandidate = { ...base, syllabusVersionId: 11 };
    const sessions = projectAssignmentSessionAvailability(
      [1],
      [base, duplicateCandidate, { ...base, series: "Oct/Nov" }],
      new Date("2026-01-01T00:00:00Z"),
    )[0]?.sessions;

    expect(sessions).not.toContainEqual(
      expect.objectContaining({ year: 2026, series: "May/June" }),
    );
    expect(sessions).toContainEqual(
      expect.objectContaining({ year: 2026, series: "Oct/Nov" }),
    );
  });

  it("returns an explicit empty projection for a catalogue subject with no safe choice", () => {
    expect(projectAssignmentSessionAvailability([99], [], new Date())).toEqual([
      { subjectId: 99, sessions: [] },
    ]);
  });

  it("keeps long applicability ranges within a finite upcoming projection", () => {
    const longRange = { ...base, applicableToYear: 9999 };
    const sessions = projectAssignmentSessionAvailability(
      [1],
      [longRange, { ...longRange, series: "Oct/Nov" }],
      new Date("2026-01-01T00:00:00Z"),
    )[0]?.sessions;

    expect(sessions).toHaveLength(12);
    expect(
      Math.max(...(sessions ?? []).map(({ year }) => year)),
    ).toBeLessThanOrEqual(2032);
  });
});
