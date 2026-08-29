export const EXAM_SITTING_SERIES = ["Feb/Mar", "May/June", "Oct/Nov"] as const;

export type ExamSittingSeries = (typeof EXAM_SITTING_SERIES)[number];

export type IntendedExamSessionInput = {
  year: number;
  series: ExamSittingSeries;
};

export type SubjectSessionOverrideInput = {
  subjectId: number;
  year: number;
  series: ExamSittingSeries;
};

export type MembershipSessionRpcArgs = {
  p_intended_exam_year: number | null;
  p_intended_exam_series: ExamSittingSeries | null;
  p_override_subject_ids: number[] | null;
  p_override_years: number[] | null;
  p_override_series: ExamSittingSeries[] | null;
};

export function mapStoredIntendedExamSession(
  year: number | null | undefined,
  series: string | null | undefined,
): IntendedExamSessionInput | null {
  if (year == null && series == null) return null;
  if (
    year == null ||
    series == null ||
    !EXAM_SITTING_SERIES.includes(series as ExamSittingSeries)
  ) {
    return null;
  }
  return { year, series: series as ExamSittingSeries };
}

export function buildMembershipSessionRpcArgs(
  subjectIds: number[],
  intendedExamSession: IntendedExamSessionInput | undefined,
  overrides: SubjectSessionOverrideInput[] | undefined,
): { ok: true; args: MembershipSessionRpcArgs } | { ok: false } {
  const defaultSession = intendedExamSession ?? null;
  const suppliedOverrides = overrides ?? [];
  const seen = new Set<number>();
  const subjectSet = new Set(subjectIds);

  for (const override of suppliedOverrides) {
    if (seen.has(override.subjectId) || !subjectSet.has(override.subjectId)) {
      return { ok: false };
    }
    seen.add(override.subjectId);
  }

  if (!defaultSession && suppliedOverrides.length === 0) {
    return {
      ok: true,
      args: {
        p_intended_exam_year: null,
        p_intended_exam_series: null,
        p_override_subject_ids: null,
        p_override_years: null,
        p_override_series: null,
      },
    };
  }

  return {
    ok: true,
    args: {
      p_intended_exam_year: defaultSession?.year ?? null,
      p_intended_exam_series: defaultSession?.series ?? null,
      p_override_subject_ids: suppliedOverrides.map((row) => row.subjectId),
      p_override_years: suppliedOverrides.map((row) => row.year),
      p_override_series: suppliedOverrides.map((row) => row.series),
    },
  };
}

export function hasStructuredSessionInput(
  intendedExamSession: IntendedExamSessionInput | undefined,
  overrides: SubjectSessionOverrideInput[] | undefined,
): boolean {
  return Boolean(intendedExamSession) || (overrides?.length ?? 0) > 0;
}
