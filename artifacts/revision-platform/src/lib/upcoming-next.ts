import { format } from "date-fns";
import type { ExamDate, Task } from "@workspace/api-client-react";
import { parseLocalCalendarDate } from "@/lib/navigation-query-state";

export type WhatsNextKind = "deadline" | "exam";

export type WhatsNextItem = {
  id: string;
  kind: WhatsNextKind;
  dateKey: string;
  title: string;
  detail: string;
  subjectColor: string;
  whenLabel: string;
};

export function localDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.split("T")[0] ?? "";
  return parseLocalCalendarDate(key) ? key : null;
}

export function formatWhatsNextWhen(dateKeyValue: string, todayKey: string): string {
  const date = parseLocalCalendarDate(dateKeyValue);
  if (!date) return dateKeyValue;
  if (dateKeyValue === todayKey) return "Today";
  const today = parseLocalCalendarDate(todayKey);
  if (today) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateKeyValue === localDateKey(tomorrow)) return "Tomorrow";
  }
  return format(date, "MMM d");
}

/**
 * Upcoming deadlines from the summary already include today (deadline >= server
 * today, max 5). Today's Mission owns due-today work, so this list keeps only
 * deadlines after `todayKey`. Exams stay date >= today, capped at 4.
 */
export function buildWhatsNextItems(
  deadlines: Task[],
  exams: ExamDate[],
  todayKey: string,
): WhatsNextItem[] {
  const items: WhatsNextItem[] = [];

  for (const task of deadlines) {
    const key = dateKey(task.deadline);
    if (!key || key <= todayKey) continue;
    items.push({
      id: `deadline-${task.id}`,
      kind: "deadline",
      dateKey: key,
      title: task.title,
      detail: task.subjectName,
      subjectColor: task.subjectColor,
      whenLabel: formatWhatsNextWhen(key, todayKey),
    });
  }

  for (const exam of exams.slice(0, 4)) {
    const key = dateKey(exam.date);
    if (!key) continue;
    items.push({
      id: `exam-${exam.id}`,
      kind: "exam",
      dateKey: key,
      title: `${exam.subjectName} ${exam.paperCode}`,
      detail: exam.subjectName,
      subjectColor: exam.subjectColor,
      whenLabel: formatWhatsNextWhen(key, todayKey),
    });
  }

  items.sort((a, b) => {
    const byDate = a.dateKey.localeCompare(b.dateKey);
    if (byDate !== 0) return byDate;
    if (a.kind === b.kind) return a.title.localeCompare(b.title);
    return a.kind === "deadline" ? -1 : 1;
  });

  return items;
}
