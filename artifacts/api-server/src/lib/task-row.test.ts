import { describe, expect, it } from "vitest";
import { mapTaskRow, type TaskRow } from "./task-row";

describe("mapTaskRow", () => {
  it("maps snake_case Data API rows to camelCase without exposing userId", () => {
    const row: TaskRow = {
      id: 7,
      user_id: "02444f79-c2bb-4596-ae99-d5d6877f1001",
      title: "Revise kinematics",
      subject_id: 3,
      topic_id: 12,
      deadline: "2026-08-10",
      priority: "high",
      estimated_minutes: 45,
      completed: false,
      completed_at: null,
      created_at: "2026-08-01T12:00:00.000Z",
    };

    const mapped = mapTaskRow(row);

    expect(mapped).toEqual({
      id: 7,
      title: "Revise kinematics",
      subjectId: 3,
      topicId: 12,
      deadline: "2026-08-10",
      priority: "high",
      estimatedMinutes: 45,
      completed: false,
      completedAt: null,
      createdAt: "2026-08-01T12:00:00.000Z",
    });
    expect(mapped).not.toHaveProperty("userId");
    expect(mapped).not.toHaveProperty("user_id");
  });
});
