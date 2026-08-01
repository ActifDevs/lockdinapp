import { eq } from "drizzle-orm";
import { db, subjectsTable, syllabusTopicsTable } from "@workspace/db";
import type { MappedTaskCore } from "./task-row";

export type EnrichedTask = MappedTaskCore & {
  subjectName: string;
  subjectColor: string;
  topicTitle: string | null;
};

/** Shared subject/topic enrichment via Drizzle (reference data, not ownership). */
export async function enrichTask(task: MappedTaskCore): Promise<EnrichedTask> {
  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, task.subjectId));

  const topic = task.topicId
    ? (
        await db
          .select()
          .from(syllabusTopicsTable)
          .where(eq(syllabusTopicsTable.id, task.topicId))
      )[0]
    : null;

  return {
    ...task,
    subjectName: subject?.name ?? "Unknown",
    subjectColor: subject?.color ?? "#6366f1",
    topicTitle: topic?.title ?? null,
  };
}

export async function enrichTasks(tasks: MappedTaskCore[]): Promise<EnrichedTask[]> {
  return Promise.all(tasks.map(enrichTask));
}
