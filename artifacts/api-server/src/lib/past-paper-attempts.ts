import type { SupabaseClient } from "@supabase/supabase-js";
import { inArray } from "drizzle-orm";
import { assessmentComponentsTable, db, subjectsTable } from "@workspace/db";

export const PAST_PAPER_ATTEMPT_SELECT =
  "id, user_id, subject_id, component_id, variant, session, year, score, total_marks, percentage, date_attempted, time_taken_minutes, notes, created_at";

export type PastPaperAttemptRow = {
  id: number;
  user_id: string;
  subject_id: number;
  component_id: number | null;
  variant: number | null;
  session: "May/June" | "Oct/Nov" | "Feb/Mar" | "Specimen";
  year: number;
  score: number;
  total_marks: number;
  percentage: number;
  date_attempted: string;
  time_taken_minutes: number | null;
  notes: string | null;
  created_at: string;
};

export type EnrichedPastPaperAttempt = {
  id: number;
  subjectId: number;
  subjectName: string;
  subjectColor: string;
  componentId: number | null;
  componentName: string | null;
  variant: number | null;
  session: PastPaperAttemptRow["session"];
  year: number;
  paperLabel: string;
  score: number;
  totalMarks: number;
  percentage: number;
  dateAttempted: string;
  timeTakenMinutes: number | null;
  notes: string | null;
  createdAt: string;
};

type SupabaseError = { code?: string; message?: string; status?: number };

/** Load only the verified caller's attempts. RLS independently enforces the same boundary. */
export async function listUserPastPaperRows(
  client: SupabaseClient,
  userId: string,
  subjectId?: number,
): Promise<{ data: PastPaperAttemptRow[]; error: SupabaseError | null }> {
  let query = client
    .from("past_paper_attempts")
    .select(PAST_PAPER_ATTEMPT_SELECT)
    .eq("user_id", userId);

  if (subjectId !== undefined) {
    query = query.eq("subject_id", subjectId);
  }

  const { data, error } = await query
    .order("date_attempted", { ascending: false })
    .order("id", { ascending: false });

  if (error) return { data: [], error };
  return {
    data: (data ?? []) as unknown as PastPaperAttemptRow[],
    error: null,
  };
}

export async function countUserPastPaperAttempts(
  client: SupabaseClient,
  userId: string,
): Promise<{ count: number; error: SupabaseError | null }> {
  const { count, error } = await client
    .from("past_paper_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return { count: 0, error };
  return { count: count ?? 0, error: null };
}

export async function enrichPastPaperRows(
  rows: PastPaperAttemptRow[],
): Promise<EnrichedPastPaperAttempt[]> {
  if (rows.length === 0) return [];

  const subjectIds = [...new Set(rows.map((row) => row.subject_id))];
  const componentIds = [
    ...new Set(
      rows.flatMap((row) =>
        row.component_id === null ? [] : [row.component_id],
      ),
    ),
  ];

  const [subjects, components] = await Promise.all([
    db
      .select()
      .from(subjectsTable)
      .where(inArray(subjectsTable.id, subjectIds)),
    componentIds.length > 0
      ? db
          .select()
          .from(assessmentComponentsTable)
          .where(inArray(assessmentComponentsTable.id, componentIds))
      : [],
  ]);

  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const componentById = new Map(
    components.map((component) => [component.id, component]),
  );

  return rows.map((row) => {
    const subject = subjectById.get(row.subject_id);
    if (!subject)
      throw new Error(`Missing subject reference for attempt ${row.id}`);
    const component =
      row.component_id === null
        ? undefined
        : componentById.get(row.component_id);
    const basePaperCode = component?.paperCode ?? subject.code;
    const paperCode =
      row.variant === null ? basePaperCode : `${basePaperCode}${row.variant}`;

    return {
      id: row.id,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectColor: subject.color,
      componentId: row.component_id,
      componentName: component?.componentName ?? null,
      variant: row.variant,
      session: row.session,
      year: row.year,
      paperLabel: `${paperCode} — ${row.session} ${row.year}`,
      score: row.score,
      totalMarks: row.total_marks,
      percentage: row.percentage,
      dateAttempted: row.date_attempted,
      timeTakenMinutes: row.time_taken_minutes,
      notes: row.notes,
      createdAt: row.created_at,
    };
  });
}
