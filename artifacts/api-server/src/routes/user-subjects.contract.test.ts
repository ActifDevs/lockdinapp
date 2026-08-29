import { describe, expect, it, vi } from "vitest";
import { buildMembershipResponse } from "./user-subjects";

vi.mock("@workspace/db", () => ({
  db: {},
  subjectsTable: {},
  syllabusVersionsTable: {},
}));

describe("user-subject membership response", () => {
  it("contains shared subject metadata and no personal placeholder fields", () => {
    const [membership] = buildMembershipResponse(
      [
        {
          user_id: "02444f79-c2bb-4596-ae99-d5d6877f1001",
          subject_id: 1,
          syllabus_version_id: 10,
          intended_exam_year: null,
          intended_exam_series: null,
          created_at: "2026-08-01T00:00:00.000Z",
          updated_at: "2026-08-02T00:00:00.000Z",
        },
      ],
      [
        {
          id: 1,
          name: "Physics",
          code: "9702",
          color: "#111111",
        } as never,
      ],
      [
        {
          id: 10,
          subjectId: 1,
          label: "2025–2027",
          examBoard: "CAIE",
          qualification: "A Level",
        } as never,
      ],
      new Map([[1, 14]]),
    );

    expect(membership.subject).toEqual({
      id: 1,
      name: "Physics",
      code: "9702",
      color: "#111111",
      topicsTotal: 14,
    });
    expect(membership.subject).not.toHaveProperty("syllabusProgress");
    expect(membership.subject).not.toHaveProperty("topicsCompleted");
    expect(membership.subject).not.toHaveProperty("upcomingTasksCount");
    expect(membership.subject).not.toHaveProperty("recentPaperScore");
    expect(membership.intendedExamSession).toBeNull();
  });
});
