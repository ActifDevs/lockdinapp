export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
export const MAX_SELECTED_SUBJECTS = 5;

export function validateUsername(value: string): string | undefined {
  if (!value) return "Username is required.";
  if (!USERNAME_RE.test(value)) {
    return "Use 3–24 lowercase letters, numbers, or underscores.";
  }
  return undefined;
}

export function normaliseUsernameInput(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export type CatalogueSubject = {
  id: number;
  name: string;
  code: string;
};

export function filterSubjectsByQuery(
  subjects: CatalogueSubject[],
  search: string,
): CatalogueSubject[] {
  const q = search.trim().toLowerCase();
  if (!q) return subjects;
  return subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
  );
}

export function toggleSubjectSelection(
  selectedIds: number[],
  id: number,
  max = MAX_SELECTED_SUBJECTS,
): number[] {
  if (selectedIds.includes(id)) {
    return selectedIds.filter((x) => x !== id);
  }
  if (selectedIds.length >= max) return selectedIds;
  return [...selectedIds, id];
}

export function canProceedWithSubjects(selectedIds: number[]): string | undefined {
  if (selectedIds.length < 1) return "Select at least one subject.";
  if (selectedIds.length > MAX_SELECTED_SUBJECTS) return "Select at most five subjects.";
  if (new Set(selectedIds).size !== selectedIds.length) return "Select each subject only once.";
  if (selectedIds.some((id) => !Number.isInteger(id) || id < 1)) {
    return "Select valid catalogue subjects.";
  }
  return undefined;
}

export function mapOnboardingConflictError(status: number, message: string): {
  usernameTaken: boolean;
  generic: boolean;
} {
  if (status !== 409) {
    return { usernameTaken: false, generic: true };
  }
  if (message.toLowerCase().includes("username")) {
    return { usernameTaken: true, generic: false };
  }
  return { usernameTaken: false, generic: true };
}
