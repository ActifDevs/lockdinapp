import { describe, expect, it, vi } from "vitest";
import { enrichTasks, type EnrichedTask } from "./enrich-task";
import type { MappedTaskCore } from "./task-row";

function task(
  overrides: Partial<MappedTaskCore> & Pick<MappedTaskCore, "id" | "subjectId">,
): MappedTaskCore {
  return {
    title: `Task ${overrides.id}`,
    topicId: null,
    deadline: null,
    priority: "medium",
    estimatedMinutes: null,
    completed: false,
    completedAt: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("enrichTasks bulk enrichment", () => {
  it("performs zero database queries for an empty list", async () => {
    const fetchSubjects = vi.fn(async () => []);
    const fetchTopics = vi.fn(async () => []);

    const result = await enrichTasks([], { fetchSubjects, fetchTopics });

    expect(result).toEqual([]);
    expect(fetchSubjects).not.toHaveBeenCalled();
    expect(fetchTopics).not.toHaveBeenCalled();
  });

  it("fetches subjects and topics once for multiple tasks sharing IDs", async () => {
    const fetchSubjects = vi.fn(async (ids: number[]) => {
      expect(ids.sort()).toEqual([1, 2]);
      return [
        { id: 1, name: "Maths", color: "#111" },
        { id: 2, name: "Physics", color: "#222" },
      ];
    });
    const fetchTopics = vi.fn(async (ids: number[]) => {
      expect(ids.sort()).toEqual([10, 20]);
      return [
        { id: 10, title: "Algebra" },
        { id: 20, title: "Forces" },
      ];
    });

    const input = [
      task({ id: 1, subjectId: 1, topicId: 10 }),
      task({ id: 2, subjectId: 1, topicId: 10 }),
      task({ id: 3, subjectId: 2, topicId: 20 }),
    ];

    const result = await enrichTasks(input, { fetchSubjects, fetchTopics });

    expect(fetchSubjects).toHaveBeenCalledTimes(1);
    expect(fetchTopics).toHaveBeenCalledTimes(1);
    expect(result.map((t: EnrichedTask) => t.id)).toEqual([1, 2, 3]);
    expect(result[0]).toMatchObject({
      subjectName: "Maths",
      subjectColor: "#111",
      topicTitle: "Algebra",
    });
    expect(result[2]).toMatchObject({
      subjectName: "Physics",
      topicTitle: "Forces",
    });
  });

  it("uses approved fallbacks for missing subject/topic references", async () => {
    const result = await enrichTasks([task({ id: 9, subjectId: 99, topicId: 999 })], {
      fetchSubjects: async () => [],
      fetchTopics: async () => [],
    });

    expect(result[0]).toMatchObject({
      subjectName: "Unknown",
      subjectColor: "#6366f1",
      topicTitle: null,
    });
  });

  it("skips the topics query when no task has a topicId", async () => {
    const fetchSubjects = vi.fn(async () => [
      { id: 1, name: "Maths", color: "#111" },
    ]);
    const fetchTopics = vi.fn(async () => []);

    await enrichTasks([task({ id: 1, subjectId: 1, topicId: null })], {
      fetchSubjects,
      fetchTopics,
    });

    expect(fetchSubjects).toHaveBeenCalledTimes(1);
    expect(fetchTopics).not.toHaveBeenCalled();
  });

  it("preserves original task order", async () => {
    const result = await enrichTasks(
      [
        task({ id: 30, subjectId: 1 }),
        task({ id: 10, subjectId: 1 }),
        task({ id: 20, subjectId: 1 }),
      ],
      {
        fetchSubjects: async () => [{ id: 1, name: "Maths", color: "#111" }],
        fetchTopics: async () => [],
      },
    );

    expect(result.map((t) => t.id)).toEqual([30, 10, 20]);
  });
});
