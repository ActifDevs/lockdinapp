import type { ExamDate } from "@workspace/api-client-react";

export type WriteCalendarState = (nextMonth: Date, nextDate: Date) => void;

export type CalendarExamWithDate = ExamDate & { _date: Date };
