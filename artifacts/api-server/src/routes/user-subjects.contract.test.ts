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
          assessment_route_id: null,
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
          selectableForNewMemberships: true,
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
      [],
    );

    expect(membership.subject).toEqual({
      id: 1,
      name: "Physics",
      code: "9702",
      color: "#111111",
      topicsTotal: 14,
    });
    expect(membership.assessmentRouteId).toBeNull();
    expect(membership.optionIds).toEqual([]);
    expect(membership.subject).not.toHaveProperty("syllabusProgress");
    expect(membership.subject).not.toHaveProperty("topicsCompleted");
    expect(membership.subject).not.toHaveProperty("upcomingTasksCount");
    expect(membership.subject).not.toHaveProperty("recentPaperScore");
    expect(membership.intendedExamSession).toBeNull();
  });

  it("isolates and deterministically orders option IDs by user, subject, and version", () => {
    const memberships = buildMembershipResponse(
      [
        {
          user_id: "02444f79-c2bb-4596-ae99-d5d6877f1001",
          subject_id: 1,
          syllabus_version_id: 10,
          assessment_route_id: 100,
          intended_exam_year: 2027,
          intended_exam_series: "May/June",
          created_at: "2026-08-01T00:00:00.000Z",
          updated_at: "2026-08-02T00:00:00.000Z",
        },
        {
          user_id: "02444f79-c2bb-4596-ae99-d5d6877f1001",
          subject_id: 2,
          syllabus_version_id: 20,
          assessment_route_id: 200,
          intended_exam_year: 2027,
          intended_exam_series: "May/June",
          created_at: "2026-08-01T00:00:00.000Z",
          updated_at: "2026-08-02T00:00:00.000Z",
        },
      ],
      [
        { id: 1, name: "History", code: "9489", color: "#111111" } as never,
        { id: 2, name: "Geography", code: "9696", color: "#222222" } as never,
      ],
      [
        {
          id: 10,
          subjectId: 1,
          label: "r1",
          examBoard: "CAIE",
          qualification: "A Level",
        } as never,
        {
          id: 20,
          subjectId: 2,
          label: "r1",
          examBoard: "CAIE",
          qualification: "A Level",
        } as never,
      ],
      new Map([
        [1, 10],
        [2, 20],
      ]),
      [
        {
          user_id: "02444f79-c2bb-4596-ae99-d5d6877f1001",
          subject_id: 1,
          syllabus_version_id: 10,
          option_id: 7,
        },
        {
          user_id: "other-user",
          subject_id: 1,
          syllabus_version_id: 10,
          option_id: 999,
        },
        {
          user_id: "02444f79-c2bb-4596-ae99-d5d6877f1001",
          subject_id: 2,
          syllabus_version_id: 20,
          option_id: 21,
        },
        {
          user_id: "02444f79-c2bb-4596-ae99-d5d6877f1001",
          subject_id: 1,
          syllabus_version_id: 10,
          option_id: 1,
        },
        {
          user_id: "02444f79-c2bb-4596-ae99-d5d6877f1001",
          subject_id: 1,
          syllabus_version_id: 999,
          option_id: 888,
        },
      ],
    );

    expect(memberships[0]?.optionIds).toEqual([1, 7]);
    expect(memberships[1]?.optionIds).toEqual([21]);
  });

  it("fails closed when a null-route membership has option rows", () => {
    expect(() =>
      buildMembershipResponse(
        [
          {
            user_id: "02444f79-c2bb-4596-ae99-d5d6877f1001",
            subject_id: 1,
            syllabus_version_id: 10,
            assessment_route_id: null,
            intended_exam_year: null,
            intended_exam_series: null,
            created_at: "2026-08-01T00:00:00.000Z",
            updated_at: "2026-08-02T00:00:00.000Z",
          },
        ],
        [{ id: 1, name: "History", code: "9489", color: "#111111" } as never],
        [
          {
            id: 10,
            subjectId: 1,
            label: "r1",
            examBoard: "CAIE",
            qualification: "A Level",
          } as never,
        ],
        new Map([[1, 10]]),
        [
          {
            user_id: "02444f79-c2bb-4596-ae99-d5d6877f1001",
            subject_id: 1,
            syllabus_version_id: 10,
            option_id: 1,
          },
        ],
      ),
    ).toThrow("Membership option state is inconsistent");
  });
});
