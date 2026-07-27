export const EXPECTED_HEADER = [
  "Main Topic",
  "Subtopic",
  "Learning Outcome",
  "Subject",
  "Exam Board",
  "Qualification",
  "Level",
  "Component Name",
  "Paper Code",
  "Duration (min)",
  "Total Marks",
  "Weighting (%)",
] as const;

export type ParsedRow = {
  sourceRow: number;
  mainTopic: string;
  subtopic: string;
  learningOutcome: string;
  subject: string;
  examBoard: string;
  qualification: string;
  level: string;
  componentName: string;
  paperCode: string;
  durationMinutes: number | null;
  totalMarks: number | null;
  weightingPercent: number | null;
};

export type ValidationIssue = {
  row: number | "header" | "file";
  column: string;
  message: string;
};

export type FileValidationResult = {
  file: string;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  rows: ParsedRow[];
};
