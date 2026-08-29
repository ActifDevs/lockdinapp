import { describe, expect, it, vi } from "vitest";
import { aggregateUserSubjectProgress } from "./user-subject-progress";

vi.mock("@workspace/db", () => ({
  db: {},
  subjectsTable: {},
  syllabusTopicsTable: {},
  syllabusVersionsTable: {},
}));

describe("aggregateUserSubjectProgress", () => {
  const subjects = [
    { id: 1, name: "Physics", color: "#111111" },
    { id: 2, name: "Chemistry", color: "#222222" },
    { id: 3, name: "Mathematics", color: "#333333" },
  ];
  const topics = [
    { id: 11, subjectId: 1 },
    { id: 12, subjectId: 1 },
    { id: 21, subjectId: 2 },
  ];

  it("preserves membership ordering and counts only completed caller topics", () => {
    const result = aggregateUserSubjectProgress([2, 1], subjects, topics, [
      { topic_id: 11, status: "completed", notes: null },
      { topic_id: 12, status: "in_progress", notes: null },
      { topic_id: 21, status: "completed", notes: null },
    ]);

    expect(result.syllabusCompletion).toEqual([
      {
        subjectId: 2,
        subjectName: "Chemistry",
        subjectColor: "#222222",
        syllabusProgress: 100,
      },
      {
        subjectId: 1,
        subjectName: "Physics",
        subjectColor: "#111111",
        syllabusProgress: 50,
      },
    ]);
    expect(result.overallSyllabusProgress).toBe(67);
  });

  it("ignores completed progress outside the current topic universe", () => {
    const result = aggregateUserSubjectProgress([1], subjects, topics, [
      { topic_id: 11, status: "completed", notes: null },
      { topic_id: 999, status: "completed", notes: null },
    ]);
    expect(result.syllabusCompletion[0]?.syllabusProgress).toBe(50);
    expect(result.overallSyllabusProgress).toBe(50);
  });

  it("returns zero for a membership with no syllabus topics", () => {
    expect(
      aggregateUserSubjectProgress([3], subjects, topics, [])
        .syllabusCompletion[0]?.syllabusProgress,
    ).toBe(0);
    expect(
      aggregateUserSubjectProgress([3], subjects, topics, [])
        .overallSyllabusProgress,
    ).toBe(0);
  });
});
