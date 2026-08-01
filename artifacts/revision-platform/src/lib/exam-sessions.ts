/**
 * Derive the next four Cambridge-style exam session windows from a reference date.
 * Labels: "May/June YYYY" and "Oct/Nov YYYY", chronologically upcoming.
 */
export function getUpcomingExamSessions(
  referenceDate: Date = new Date(),
): string[] {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth(); // 0-based
  const day = referenceDate.getUTCDate();

  type Window = { label: string; sortKey: number };
  const candidates: Window[] = [];

  for (let y = year; y <= year + 3; y++) {
    candidates.push({ label: `May/June ${y}`, sortKey: y * 100 + 6 });
    candidates.push({ label: `Oct/Nov ${y}`, sortKey: y * 100 + 11 });
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
    .map((w) => w.label);
}

export const LEVEL_OPTIONS = [
  "AS Level (Year 12)",
  "A2 Level (Year 13)",
] as const;
