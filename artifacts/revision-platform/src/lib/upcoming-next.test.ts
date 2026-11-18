import { describe, expect, it } from "vitest";
import { buildWhatsNextItems } from "./upcoming-next";
import type { ExamDate, Task } from "@workspace/api-client-react";

function task(
  id: number,
  title: string,
  deadline: string,
  subjectName = "Physics",
): Task {
  return {
    id,
    title,
    completed: false,
    priority: "medium",
    subjectId: 1,
    subjectName,
    subjectColor: "#2563eb",
    deadline,
    topicId: null,
    topicTitle: null,
    estimatedMinutes: null,
    completedAt: null,
    createdAt: "2026-11-01T00:00:00.000Z",
  };
}

function exam(
  id: number,
  date: string,
  subjectName: string,
  paperCode: string,
): ExamDate {
  return {
    id,
    subjectId: id,
    subjectName,
    subjectColor: "#0f766e",
    paperCode,
    date,
    notes: null,
  };
}

describe("buildWhatsNextItems", () => {
  const today = "2026-11-18";

  it("drops today's deadlines and sorts remaining items by date", () => {
    const items = buildWhatsNextItems(
      [
        task(1, "Due today", "2026-11-18"),
        task(2, "Submit Physics assignment", "2026-11-26"),
        task(3, "Complete Mechanics revision", "2026-11-19"),
      ],
      [
        exam(10, "2026-12-02", "IT", "9626 Paper 4"),
        exam(11, "2026-11-24", "Mathematics", "9709 Paper 3"),
      ],
      today,
    );

    expect(items.map((item) => item.title)).toEqual([
      "Complete Mechanics revision",
      "Mathematics 9709 Paper 3",
      "Submit Physics assignment",
      "IT 9626 Paper 4",
    ]);
    expect(items.map((item) => item.kind)).toEqual([
      "deadline",
      "exam",
      "deadline",
      "exam",
    ]);
    expect(items.some((item) => item.title === "Due today")).toBe(false);
    expect(items[0]?.whenLabel).toBe("Tomorrow");
  });

  it("keeps an exam on today and labels it Today", () => {
    const items = buildWhatsNextItems(
      [],
      [exam(8, "2026-11-18", "Chemistry", "9701/2")],
      today,
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("exam");
    expect(items[0]?.whenLabel).toBe("Today");
  });

  it("caps exams at four after merge", () => {
    const exams = [1, 2, 3, 4, 5].map((n) =>
      exam(n, `2026-12-0${n}`, "Subject", `P${n}`),
    );
    const items = buildWhatsNextItems([], exams, today);
    expect(items).toHaveLength(4);
    expect(items.at(-1)?.title).toBe("Subject P4");
  });
});
