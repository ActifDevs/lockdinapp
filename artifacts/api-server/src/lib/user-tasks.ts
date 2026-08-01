import type { SupabaseClient } from "@supabase/supabase-js";
import { mapTaskRow, type TaskRow } from "./task-row";

/**
 * Load the authenticated user's tasks via the Data API.
 *
 * Filters by `user_id` explicitly in addition to RLS. Ownership is never
 * taken from the request body.
 */
export async function listUserTaskRows(
  client: SupabaseClient,
  userId: string,
): Promise<{ data: TaskRow[]; error: { code?: string; message?: string; status?: number } | null }> {
  const { data, error } = await client
    .from("tasks")
    .select(
      "id, user_id, title, subject_id, topic_id, deadline, priority, estimated_minutes, completed, completed_at, created_at",
    )
    .eq("user_id", userId)
    .order("deadline", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], error };
  }

  return { data: (data ?? []) as TaskRow[], error: null };
}

export function mappedUserTasks(rows: TaskRow[]) {
  return rows.map(mapTaskRow);
}
