import type { SupabaseClient } from "@supabase/supabase-js";
import { inArray } from "drizzle-orm";
import { db, subjectsTable } from "@workspace/db";

export const EXAM_DATE_SELECT =
  "id, user_id, subject_id, paper_code, date, notes";

export type ExamDateRow = {
  id: number;
  user_id: string;
  subject_id: number;
  paper_code: string;
  date: string;
  notes: string | null;
};

export type EnrichedExamDate = {
  id: number;
  subjectId: number;
  subjectName: string;
  subjectColor: string;
  paperCode: string;
  date: string;
  notes: string | null;
};

type SupabaseError = { code?: string; message?: string; status?: number };

/** Calendar upcoming window: today through +60 days (matches Calendar page). */
export const UPCOMING_EXAM_WINDOW_DAYS = 60;

/** Load only the verified caller's exam dates. RLS independently enforces the same boundary. */
export async function listUserExamDateRows(
  client: SupabaseClient,
  userId: string,
): Promise<{ data: ExamDateRow[]; error: SupabaseError | null }> {
  const { data, error } = await client
    .from("exam_dates")
    .select(EXAM_DATE_SELECT)
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .order("id", { ascending: true });

  if (error) return { data: [], error };
  return {
    data: (data ?? []) as unknown as ExamDateRow[],
    error: null,
  };
}

export function filterUpcomingExamRows(
  rows: ExamDateRow[],
  todayIso: string,
  windowDays = UPCOMING_EXAM_WINDOW_DAYS,
): ExamDateRow[] {
  const today = new Date(`${todayIso}T00:00:00.000Z`);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + windowDays);
  const endIso = end.toISOString().slice(0, 10);

  return rows.filter((row) => row.date >= todayIso && row.date <= endIso);
}

export async function enrichExamDateRows(
  rows: ExamDateRow[],
): Promise<EnrichedExamDate[]> {
  if (rows.length === 0) return [];

  const subjectIds = [...new Set(rows.map((row) => row.subject_id))];
  const subjects = await db
    .select({
      id: subjectsTable.id,
      name: subjectsTable.name,
      color: subjectsTable.color,
    })
    .from(subjectsTable)
    .where(inArray(subjectsTable.id, subjectIds));

  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));

  return rows.map((row) => {
    const subject = subjectById.get(row.subject_id);
    return {
      id: row.id,
      subjectId: row.subject_id,
      subjectName: subject?.name ?? "Unknown subject",
      subjectColor: subject?.color ?? "#64748b",
      paperCode: row.paper_code,
      date: row.date,
      notes: row.notes,
    };
  });
}
