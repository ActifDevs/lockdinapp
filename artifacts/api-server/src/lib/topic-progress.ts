import type { SupabaseClient } from "@supabase/supabase-js";

export type TopicProgressStatus = "not_started" | "in_progress" | "completed";

export type TopicProgressRow = {
  topic_id: number;
  status: TopicProgressStatus;
  notes: string | null;
};

export const TOPIC_PROGRESS_SELECT = "topic_id, status, notes";

export function hasOwnershipField(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  return ["userId", "user_id", "ownerId", "owner_id"].some((key) =>
    Object.prototype.hasOwnProperty.call(body, key),
  );
}

/** Trim empty notes to null. Does not validate max length — Zod/RPC do that. */
export function normalizeTopicNotes(notes: string | null | undefined): string | null {
  if (notes == null) return null;
  const trimmed = notes.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function progressMapFromRows(
  rows: TopicProgressRow[] | null | undefined,
): Map<number, { status: TopicProgressStatus; notes: string | null }> {
  const map = new Map<number, { status: TopicProgressStatus; notes: string | null }>();
  for (const row of rows ?? []) {
    map.set(row.topic_id, {
      status: row.status,
      notes: row.notes,
    });
  }
  return map;
}

export async function listCallerTopicProgress(
  client: SupabaseClient,
  topicIds: number[],
): Promise<{ data: TopicProgressRow[]; error: { code?: string; message?: string } | null }> {
  if (topicIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await client
    .from("topic_progress")
    .select(TOPIC_PROGRESS_SELECT)
    .in("topic_id", topicIds);

  if (error) {
    return { data: [], error };
  }

  return { data: (data ?? []) as TopicProgressRow[], error: null };
}

export function computeSyllabusProgressPercent(
  topicsTotal: number,
  topicsCompleted: number,
): number {
  if (topicsTotal <= 0) return 0;
  return Math.round((topicsCompleted / topicsTotal) * 100);
}
