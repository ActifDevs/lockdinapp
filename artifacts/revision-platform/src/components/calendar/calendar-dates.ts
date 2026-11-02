import { isSameMonth } from "date-fns";
import { parseLocalCalendarDate } from "@/lib/navigation-query-state";

export function calendarItemDateKey(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const key = value.split("T")[0];
  return parseLocalCalendarDate(key) ? key : null;
}

export function parseCalendarItemDate(
  value: string | null | undefined,
): Date | null {
  const key = calendarItemDateKey(value);
  return key ? parseLocalCalendarDate(key) : null;
}

export function isCalendarItemInMonth(
  value: string | null | undefined,
  month: Date,
): boolean {
  const date = parseCalendarItemDate(value);
  return date != null && isSameMonth(date, month);
}
