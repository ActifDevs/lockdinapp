import { describe, expect, it } from "vitest";
import {
  buildMembershipSessionRpcArgs,
  hasStructuredSessionInput,
  mapMembershipAssignmentRpcError,
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

  it("maps resolver failures to safe client errors", () => {
    expect(
      mapMembershipAssignmentRpcError("22023", "intended_exam_session_required"),
    ).toEqual({ status: 400, error: "Choose a supported exam session." });
    expect(
      mapMembershipAssignmentRpcError("P0001", "no_applicable_syllabus_version"),
    ).toEqual({ status: 400, error: "No syllabus matches that exam session." });
    expect(
      mapMembershipAssignmentRpcError(
        "P0001",
        "ambiguous_applicable_syllabus_version",
      ),
    ).toEqual({
      status: 409,
      error: "That exam session cannot be assigned right now.",
    });
    expect(
      mapMembershipAssignmentRpcError("P0001", "lockdin_resolve_applicable_syllabus_version"),
    ).toBeNull();
  });
});
