import { describe, expect, it } from "vitest";
import {
  canProceedWithSubjects,
  filterSubjectsByQuery,
  mapOnboardingConflictError,
  MAX_SELECTED_SUBJECTS,
  normaliseUsernameInput,
  toggleSubjectSelection,
  validateUsername,
} from "./onboarding-logic";

const subjects = [
  { id: 1, name: "Chemistry", code: "9701" },
  { id: 2, name: "Physics", code: "9702" },
  { id: 3, name: "Mathematics", code: "9709" },
  { id: 4, name: "Biology", code: "9700" },
];

describe("onboarding logic", () => {
  it("fetches are represented by catalogue IDs not codes in selection", () => {
    const selected = toggleSubjectSelection([], 1);
    expect(selected).toEqual([1]);
    expect(selected).not.toContain("9701");
  });

  it("filters by code or name", () => {
    expect(filterSubjectsByQuery(subjects, "9701").map((s) => s.id)).toEqual([1]);
    expect(filterSubjectsByQuery(subjects, "phys").map((s) => s.id)).toEqual([2]);
  });

  it("enforces the complete 1–5 subject boundary", () => {
    expect(canProceedWithSubjects([])).toMatch(/at least one/i);
    for (const selected of [[1], [1, 2], [1, 2, 3], [1, 2, 3, 4], [1, 2, 3, 4, 5]]) {
      expect(canProceedWithSubjects(selected)).toBeUndefined();
    }
    expect(canProceedWithSubjects([1, 2, 3, 4, 5, 6])).toMatch(/at most five/i);
    expect(toggleSubjectSelection([1, 2, 3, 4, 5], 6)).toEqual([1, 2, 3, 4, 5]);
    expect(MAX_SELECTED_SUBJECTS).toBe(5);
  });

  it("rejects duplicate and malformed subject IDs", () => {
    expect(canProceedWithSubjects([1, 1])).toMatch(/only once/i);
    expect(canProceedWithSubjects([0])).toMatch(/valid catalogue/i);
    expect(canProceedWithSubjects([1.5])).toMatch(/valid catalogue/i);
  });

  it("lowercases and strips invalid username characters", () => {
    expect(normaliseUsernameInput("Ada_Chem!")).toBe("ada_chem");
  });

  it("rejects invalid usernames", () => {
    expect(validateUsername("ab")).toBeTruthy();
    expect(validateUsername("a".repeat(25))).toBeTruthy();
    expect(validateUsername("Ada")).toBeTruthy();
    expect(validateUsername("good_user_1")).toBeUndefined();
  });

  it("maps username 409 safely", () => {
    expect(mapOnboardingConflictError(409, "Username is unavailable.")).toEqual({
      usernameTaken: true,
      generic: false,
    });
  });
});
