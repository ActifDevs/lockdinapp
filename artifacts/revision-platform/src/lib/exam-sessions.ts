/**
 * Derive the next four Cambridge-style exam session windows from a reference date.
 * Labels: "May/June YYYY" and "Oct/Nov YYYY", chronologically upcoming.
 * Feb/Mar is a supported series in the API enum; picker coverage is 6.3D.
 */

export const EXAM_SITTING_SERIES = ["Feb/Mar", "May/June", "Oct/Nov"] as const;

export type ExamSittingSeries = (typeof EXAM_SITTING_SERIES)[number];

export type UpcomingExamSessionOption = {
  label: string;
  year: number;
  series: Extract<ExamSittingSeries, "May/June" | "Oct/Nov">;
};

export function getUpcomingExamSessionOptions(
  referenceDate: Date = new Date(),
): UpcomingExamSessionOption[] {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth(); // 0-based
  const day = referenceDate.getUTCDate();

  type Window = UpcomingExamSessionOption & { sortKey: number };
  const candidates: Window[] = [];

  for (let y = year; y <= year + 3; y++) {
    candidates.push({
      label: `May/June ${y}`,
      year: y,
      series: "May/June",
      sortKey: y * 100 + 6,
    });
    candidates.push({
      label: `Oct/Nov ${y}`,
      year: y,
      series: "Oct/Nov",
      sortKey: y * 100 + 11,
    });
  }

  // May/June window is considered upcoming until end of June;
  // Oct/Nov until end of November.
  const currentKey =
    month < 5 || (month === 5 && day <= 30)
      ? year * 100 + 6
      : month < 10 || (month === 10 && day <= 30)
        ? year * 100 + 11
        : (year + 1) * 100 + 6;

  return candidates
    .filter((w) => w.sortKey >= currentKey)
    .slice(0, 4)
    .map(({ label, year: optionYear, series }) => ({
      label,
      year: optionYear,
      series,
    }));
}

export function getUpcomingExamSessions(
  referenceDate: Date = new Date(),
): string[] {
  return getUpcomingExamSessionOptions(referenceDate).map((option) => option.label);
}

export function structuredSessionFromPickerLabel(
  label: string | null | undefined,
  referenceDate: Date = new Date(),
): { year: number; series: ExamSittingSeries } | undefined {
  if (!label) return undefined;
  const match = getUpcomingExamSessionOptions(referenceDate).find(
    (option) => option.label === label,
  );
  if (!match) return undefined;
  return { year: match.year, series: match.series };
}

export const LEVEL_OPTIONS = [
  "AS Level (Year 12)",
  "A2 Level (Year 13)",
] as const;
