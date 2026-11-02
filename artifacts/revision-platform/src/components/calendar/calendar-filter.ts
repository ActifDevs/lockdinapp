import type { ExamDate, Task } from "@workspace/api-client-react";

export type CalendarItemKind = "all" | "tasks" | "exams";

export type CalendarFilter = {
  kind: CalendarItemKind;
  subjectId: number | null;
};

export const EMPTY_CALENDAR_FILTER: CalendarFilter = {
  kind: "all",
  subjectId: null,
};

export type CalendarFilterSubject = { id: number; name: string };

export function isCalendarFilterActive(filter: CalendarFilter): boolean {
  return filter.kind !== "all" || filter.subjectId != null;
}

export function describeCalendarFilter(
  filter: CalendarFilter,
  subjects: CalendarFilterSubject[],
): string | null {
  if (!isCalendarFilterActive(filter)) return null;
  const kind =
    filter.kind === "all"
      ? "all types"
      : filter.kind === "tasks"
        ? "tasks"
        : "exams";
  const subject =
    filter.subjectId == null
      ? "all subjects"
      : (subjects.find((item) => item.id === filter.subjectId)?.name ??
        "one subject");
  return `Filters on: ${kind}, ${subject}.`;
}

export function filterCalendarTasks(
  tasks: Task[] | undefined,
  filter: CalendarFilter,
): Task[] {
  if (!tasks || filter.kind === "exams") return [];
  if (filter.subjectId == null) return tasks;
  return tasks.filter((task) => task.subjectId === filter.subjectId);
}

export function filterCalendarExams(
  exams: ExamDate[] | undefined,
  filter: CalendarFilter,
): ExamDate[] {
  if (!exams || filter.kind === "tasks") return [];
  if (filter.subjectId == null) return exams;
  return exams.filter((exam) => exam.subjectId === filter.subjectId);
}
