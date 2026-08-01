/**
 * Snake_case task row as returned by the Supabase Data API / PostgREST.
 * `user_id` is accepted internally but never exposed in API responses.
 */
export type TaskRow = {
  id: number;
  user_id: string | null;
  title: string;
  subject_id: number;
  topic_id: number | null;
  deadline: string | null;
  priority: "low" | "medium" | "high";
  estimated_minutes: number | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

export type MappedTaskCore = {
  id: number;
  title: string;
  subjectId: number;
  topicId: number | null;
  deadline: string | null;
  priority: "low" | "medium" | "high";
  estimatedMinutes: number | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
};

/** Map a Data API task row to the camelCase API contract (no userId). */
export function mapTaskRow(row: TaskRow): MappedTaskCore {
  return {
    id: row.id,
    title: row.title,
    subjectId: row.subject_id,
    topicId: row.topic_id ?? null,
    deadline: row.deadline ?? null,
    priority: row.priority,
    estimatedMinutes: row.estimated_minutes ?? null,
    completed: row.completed,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
  };
}
