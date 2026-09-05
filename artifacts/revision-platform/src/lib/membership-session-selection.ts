export type AssignmentSessionChoice = {
  year: number;
  series: "May/June" | "Oct/Nov";
  label: string;
  syllabusVersionId: number;
};

export type SubjectAssignmentSessions = {
  subjectId: number;
  sessions: AssignmentSessionChoice[];
};

export type SubjectSessionOverrides = Record<number, string>;

export function availableSessionOptions(
  availability: readonly SubjectAssignmentSessions[],
): AssignmentSessionChoice[] {
  const unique = new Map<string, AssignmentSessionChoice>();
  for (const { sessions } of availability) {
    for (const session of sessions) unique.set(session.label, session);
  }
  return [...unique.values()].sort(
    (a, b) =>
      a.year - b.year ||
      (a.series === b.series ? 0 : a.series === "May/June" ? -1 : 1),
  );
}

export function sessionChoice(
  options: readonly AssignmentSessionChoice[],
  label: string | null | undefined,
): AssignmentSessionChoice | undefined {
  return options.find((option) => option.label === label);
}

export function effectiveSessionLabel(
  subjectId: number,
  globalLabel: string | null | undefined,
  overrides: SubjectSessionOverrides,
): string | undefined {
  return overrides[subjectId] || globalLabel || undefined;
}

export function subjectSupportsSession(
  availability: readonly SubjectAssignmentSessions[],
  subjectId: number,
  label: string | null | undefined,
): boolean {
  if (!label) return false;
  return Boolean(
    availability
      .find((entry) => entry.subjectId === subjectId)
      ?.sessions.some((session) => session.label === label),
  );
}

export function syllabusVersionIdForSubjectSession(
  availability: readonly SubjectAssignmentSessions[],
  subjectId: number,
  label: string | null | undefined,
): number | undefined {
  if (!label) return undefined;
  return availability
    .find((entry) => entry.subjectId === subjectId)
    ?.sessions.find((session) => session.label === label)?.syllabusVersionId;
}

export function invalidSessionSubjectIds(
  subjectIds: readonly number[],
  globalLabel: string | null | undefined,
  overrides: SubjectSessionOverrides,
  availability: readonly SubjectAssignmentSessions[],
): number[] {
  return subjectIds.filter((subjectId) => {
    const effective = effectiveSessionLabel(subjectId, globalLabel, overrides);
    return !subjectSupportsSession(availability, subjectId, effective);
  });
}

export function assignmentPayloadSessions(
  subjectIds: readonly number[],
  globalLabel: string | null | undefined,
  overrides: SubjectSessionOverrides,
  options: readonly AssignmentSessionChoice[],
) {
  const global = sessionChoice(options, globalLabel);
  const subjectSessionOverrides = subjectIds.flatMap((subjectId) => {
    const override = sessionChoice(options, overrides[subjectId]);
    return override
      ? [{ subjectId, year: override.year, series: override.series }]
      : [];
  });
  return {
    ...(global
      ? { intendedExamSession: { year: global.year, series: global.series } }
      : {}),
    ...(subjectSessionOverrides.length > 0 ? { subjectSessionOverrides } : {}),
  };
}

const SAFE_ASSIGNMENT_ERRORS = new Set([
  "Choose a supported exam session.",
  "No syllabus matches that exam session.",
  "That exam session cannot be assigned right now.",
  "Invalid subject session override.",
  "Choose how you are taking this subject.",
  "No assessment route is available for this subject yet.",
  "Invalid assessment route assignment.",
  "Select the required number of study options.",
]);

export function productSafeAssignmentError(
  message: string,
): string | undefined {
  return SAFE_ASSIGNMENT_ERRORS.has(message) ? message : undefined;
}
