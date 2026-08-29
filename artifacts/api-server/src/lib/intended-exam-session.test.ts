import { describe, expect, it } from "vitest";
import {
  buildMembershipSessionRpcArgs,
  hasStructuredSessionInput,
  mapStoredIntendedExamSession,
} from "./intended-exam-session";

describe("intended exam session helpers", () => {
  it("maps a stored pair and leaves a null pair absent", () => {
    expect(mapStoredIntendedExamSession(2027, "May/June")).toEqual({
      year: 2027,
      series: "May/June",
    });
    expect(mapStoredIntendedExamSession(null, null)).toBeNull();
  });

  it("rejects duplicate or foreign overrides", () => {
    expect(
      buildMembershipSessionRpcArgs(
        [1],
        { year: 2027, series: "May/June" },
        [{ subjectId: 2, year: 2028, series: "Oct/Nov" }],
      ).ok,
    ).toBe(false);
    expect(
      buildMembershipSessionRpcArgs(
        [1],
        undefined,
        [
          { subjectId: 1, year: 2027, series: "May/June" },
          { subjectId: 1, year: 2028, series: "Oct/Nov" },
        ],
      ).ok,
    ).toBe(false);
  });

  it("treats missing structured input as a legacy null payload", () => {
    const built = buildMembershipSessionRpcArgs([1, 2], undefined, undefined);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.args.p_intended_exam_year).toBeNull();
    expect(hasStructuredSessionInput(undefined, undefined)).toBe(false);
    expect(
      hasStructuredSessionInput({ year: 2027, series: "May/June" }, undefined),
    ).toBe(true);
  });
});
