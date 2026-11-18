import { format } from "date-fns";

export function formatExamChip(date: string, paperCode: string, daysAway: number): string {
  const when = format(new Date(date), "EEE d MMM");
  return daysAway <= 7 ? `${paperCode} · ${when} · this week` : `${paperCode} · ${when}`;
}
