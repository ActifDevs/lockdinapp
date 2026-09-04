/**
 * Explicit, version-controlled mapping from Cambridge subject code -> validated CSV
 * source file -> syllabus version metadata.
 *
 * `validFrom` / `validTo` are intentionally left `null`: the exact official Cambridge
 * syllabus validity window for each of these specifications was not reliably
 * determinable from repository sources at import time, and the task explicitly says
 * not to guess it. Each subject currently has exactly one (current) syllabus version,
 * so `isCurrent: true` with unknown bounds is safe — there is no ambiguity to resolve
 * between competing versions yet. Fill in `validFrom`/`validTo` here (and re-run the
 * importer, which will UPDATE the existing version row rather than duplicate it) once
 * the team confirms the official dates.
 */

export type SyllabusManifestEntry = {
  /** Canonical Cambridge subject code, must match the CSV filename prefix. */
  subjectCode: string;
  /** Display name used only when a subjects row does not already exist for this code. */
  subjectName: string;
  /** Accent color used only when a subjects row does not already exist for this code. */
  color: string;
  /** Filename relative to data/syllabi/raw/. */
  csvFile: string;
  versionLabel: string;
  validFrom: string | null;
  validTo: string | null;
  isCurrent: boolean;
};

export const SYLLABUS_IMPORT_MANIFEST: SyllabusManifestEntry[] = [
  {
    subjectCode: "9231",
    subjectName: "Further Mathematics",
    color: "#DC2626",
    csvFile: "9231_further_mathematics.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
  {
    subjectCode: "9489",
    subjectName: "History",
    color: "#A855F7",
    csvFile: "9489_history.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
  {
    subjectCode: "9609",
    subjectName: "Business",
    color: "#F97316",
    csvFile: "9609_business.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
  {
    subjectCode: "9618",
    subjectName: "Computer Science",
    color: "#10B981",
    csvFile: "9618_computer_science.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
  {
    subjectCode: "9700",
    subjectName: "Biology",
    color: "#84CC16",
    csvFile: "9700_biology.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
  {
    subjectCode: "9701",
    subjectName: "Chemistry",
    color: "#F59E0B",
    csvFile: "9701_chemistry.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
  {
    subjectCode: "9702",
    subjectName: "Physics",
    color: "#3B82F6",
    csvFile: "9702_physics.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
  {
    subjectCode: "9708",
    subjectName: "Economics",
    color: "#F43F5E",
    csvFile: "9708_economics.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
  {
    subjectCode: "9709",
    subjectName: "Mathematics",
    color: "#7C5CFC",
    csvFile: "9709_mathematics.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
];

/**
 * New-seven subject metadata for Phase 7 adoption.
 * Not part of the default raw-CSV import loop (those files live under
 * data/syllabi/candidates/new-seven/ and are selected via --csv=).
 */
export const SYLLABUS_NEW_SEVEN_SUBJECTS: SyllabusManifestEntry[] = [
  {
    subjectCode: "8021",
    subjectName: "English General Paper",
    color: "#0D9488",
    csvFile: "8021_english_general_paper.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
  {
    subjectCode: "9093",
    subjectName: "English Language",
    color: "#0369A1",
    csvFile: "9093_english_language.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
  {
    subjectCode: "9626",
    subjectName: "Information Technology",
    color: "#4D7C0F",
    csvFile: "9626_information_technology.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
  {
    subjectCode: "9696",
    subjectName: "Geography",
    color: "#B45309",
    csvFile: "9696_geography.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
  {
    subjectCode: "9699",
    subjectName: "Sociology",
    color: "#BE123C",
    csvFile: "9699_sociology.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
  {
    subjectCode: "9706",
    subjectName: "Accounting",
    color: "#1D4ED8",
    csvFile: "9706_accounting.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
  {
    subjectCode: "9990",
    subjectName: "Psychology",
    color: "#9F1239",
    csvFile: "9990_psychology.csv",
    versionLabel: "Current syllabus",
    validFrom: null,
    validTo: null,
    isCurrent: true,
  },
];

/** All catalogue subjects known to Lockdin import tooling. */
export const SYLLABUS_SUBJECT_REGISTRY: SyllabusManifestEntry[] = [
  ...SYLLABUS_IMPORT_MANIFEST,
  ...SYLLABUS_NEW_SEVEN_SUBJECTS,
];

export function findSyllabusSubject(
  subjectCode: string,
): SyllabusManifestEntry | undefined {
  return SYLLABUS_SUBJECT_REGISTRY.find((entry) => entry.subjectCode === subjectCode);
}
