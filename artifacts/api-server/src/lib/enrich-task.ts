import { inArray } from "drizzle-orm";
import { db, subjectsTable, syllabusTopicsTable } from "@workspace/db";
import type { MappedTaskCore } from "./task-row";

export type EnrichedTask = MappedTaskCore & {
  subjectName: string;
  subjectColor: string;
  topicTitle: string | null;
};

type SubjectLookup = { id: number; name: string; color: string };
type TopicLookup = { id: number; title: string };

export type EnrichLookup = {
  subjectsById: Map<number, SubjectLookup>;
  topicsById: Map<number, TopicLookup>;
};

/**
 * Bulk subject/topic enrichment via Drizzle (reference data, not ownership).
 *
 * - Empty input → zero database queries.
 * - Multiple tasks → one subjects query + one topics query (when IDs exist).
 * - Preserves input order.
 */
export async function enrichTasks(
  tasks: MappedTaskCore[],
  /** Optional injectable query fns for unit tests. */
  deps: {
    fetchSubjects?: (ids: number[]) => Promise<SubjectLookup[]>;
    fetchTopics?: (ids: number[]) => Promise<TopicLookup[]>;
  } = {},
): Promise<EnrichedTask[]> {
  if (tasks.length === 0) {
    return [];
  }

  const subjectIds = [...new Set(tasks.map((t) => t.subjectId))];
  const topicIds = [
    ...new Set(
      tasks
        .map((t) => t.topicId)
        .filter((id): id is number => id !== null && id !== undefined),
    ),
  ];

  const fetchSubjects =
    deps.fetchSubjects ??
    (async (ids: number[]) => {
      if (ids.length === 0) return [];
      return db
        .select({
          id: subjectsTable.id,
          name: subjectsTable.name,
          color: subjectsTable.color,
        })
        .from(subjectsTable)
        .where(inArray(subjectsTable.id, ids));
    });

  const fetchTopics =
    deps.fetchTopics ??
    (async (ids: number[]) => {
      if (ids.length === 0) return [];
      return db
        .select({
          id: syllabusTopicsTable.id,
          title: syllabusTopicsTable.title,
        })
        .from(syllabusTopicsTable)
        .where(inArray(syllabusTopicsTable.id, ids));
    });

  const [subjects, topics] = await Promise.all([
    fetchSubjects(subjectIds),
    topicIds.length > 0 ? fetchTopics(topicIds) : Promise.resolve([] as TopicLookup[]),
  ]);

  const subjectsById = new Map(subjects.map((s) => [s.id, s]));
  const topicsById = new Map(topics.map((t) => [t.id, t]));

  return tasks.map((task) => applyLookup(task, subjectsById, topicsById));
}

export async function enrichTask(task: MappedTaskCore): Promise<EnrichedTask> {
  const [enriched] = await enrichTasks([task]);
  return enriched;
}

function applyLookup(
  task: MappedTaskCore,
  subjectsById: Map<number, SubjectLookup>,
  topicsById: Map<number, TopicLookup>,
): EnrichedTask {
  const subject = subjectsById.get(task.subjectId);
  const topic = task.topicId !== null ? topicsById.get(task.topicId) : undefined;
  return {
    ...task,
    subjectName: subject?.name ?? "Unknown",
    subjectColor: subject?.color ?? "#6366f1",
    topicTitle: topic?.title ?? null,
  };
}
