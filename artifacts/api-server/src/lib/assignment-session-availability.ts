export type AssignmentSeries = "Feb/Mar" | "May/June" | "Oct/Nov";

export type AssignmentAvailabilityRow = {
  subjectId: number;
  syllabusVersionId: number;
  lifecycle: "draft" | "published" | "retired" | "archived";
  applicableFromYear: number | null;
  applicableFromSeries: AssignmentSeries | null;
  applicableToYear: number | null;
  applicableToSeries: AssignmentSeries | null;
  series: AssignmentSeries;
  productAutoAssign: boolean;
};

export type AssignmentSession = {
  year: number;
  series: Extract<AssignmentSeries, "May/June" | "Oct/Nov">;
  label: string;
};

const SERIES_ORDINAL: Record<AssignmentSeries, number> = {
  "Feb/Mar": 0,
  "May/June": 1,
  "Oct/Nov": 2,
};

const MAX_SESSIONS_PER_SUBJECT = 12;
const MAX_FUTURE_YEARS = 6;

function sessionOrdinal(year: number, series: AssignmentSeries): number {
  return year * 3 + SERIES_ORDINAL[series];
}

function firstUpcomingOrdinal(referenceDate: Date): number {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();
  const day = referenceDate.getUTCDate();

  if (month < 5 || (month === 5 && day <= 30)) {
    return sessionOrdinal(year, "May/June");
  }
  if (month < 10 || (month === 10 && day <= 30)) {
    return sessionOrdinal(year, "Oct/Nov");
  }
  return sessionOrdinal(year + 1, "May/June");
}

/**
 * Build product-safe choices for new membership assignment. Candidate version
 * IDs are used only to reject ambiguous choices and never leave this module.
 */
export function projectAssignmentSessionAvailability(
  subjectIds: readonly number[],
  rows: readonly AssignmentAvailabilityRow[],
  referenceDate: Date = new Date(),
): Array<{ subjectId: number; sessions: AssignmentSession[] }> {
  const upcomingOrdinal = firstUpcomingOrdinal(referenceDate);
  const finalProjectionYear = referenceDate.getUTCFullYear() + MAX_FUTURE_YEARS;
  const candidates = new Map<string, Set<number>>();

  for (const row of rows) {
    if (
      row.lifecycle !== "published" ||
      !row.productAutoAssign ||
      row.series === "Feb/Mar" ||
      row.applicableFromYear == null ||
      row.applicableFromSeries == null ||
      row.applicableToYear == null ||
      row.applicableToSeries == null
    ) {
      continue;
    }

    const start = sessionOrdinal(
      row.applicableFromYear,
      row.applicableFromSeries,
    );
    const end = sessionOrdinal(row.applicableToYear, row.applicableToSeries);

    const finalYear = Math.min(row.applicableToYear, finalProjectionYear);
    for (let year = row.applicableFromYear; year <= finalYear; year++) {
      const ordinal = sessionOrdinal(year, row.series);
      if (ordinal < start || ordinal > end || ordinal < upcomingOrdinal)
        continue;
      const key = `${row.subjectId}:${year}:${row.series}`;
      const versions = candidates.get(key) ?? new Set<number>();
      versions.add(row.syllabusVersionId);
      candidates.set(key, versions);
    }
  }

  return subjectIds.map((subjectId) => {
    const sessions: AssignmentSession[] = [];
    for (const [key, versions] of candidates) {
      if (versions.size !== 1) continue;
      const [keySubjectId, yearText, series] = key.split(":") as [
        string,
        string,
        AssignmentSession["series"],
      ];
      if (Number(keySubjectId) !== subjectId) continue;
      const year = Number(yearText);
      sessions.push({ year, series, label: `${series} ${year}` });
    }

    sessions.sort(
      (a, b) =>
        sessionOrdinal(a.year, a.series) - sessionOrdinal(b.year, b.series),
    );
    return { subjectId, sessions: sessions.slice(0, MAX_SESSIONS_PER_SUBJECT) };
  });
}
