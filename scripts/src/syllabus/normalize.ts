import type { ParsedRow } from "./types.js";
import type { SyllabusManifestEntry } from "./manifest.js";

export type NormalizedComponent = {
  paperCode: string;
  level: string;
  componentName: string;
  durationMinutes: number | null;
  totalMarks: number | null;
  weightingPercent: number | null;
  orderIndex: number;
};

export type NormalizedOccurrence = {
  /** null when the CSV row had no Paper Code (e.g. Biology's syllabus-wide math requirements). */
  componentKey: string | null;
  level: string;
};

export type NormalizedLearningOutcome = {
  outcome: string;
  orderIndex: number;
  occurrences: NormalizedOccurrence[];
};

export type NormalizedTopic = {
  title: string;
  orderIndex: number;
  learningOutcomes: NormalizedLearningOutcome[];
};

export type NormalizedUnit = {
  title: string;
  orderIndex: number;
  topics: NormalizedTopic[];
};

export type NormalizedSyllabus = {
  subjectCode: string;
  subjectName: string;
  color: string;
  csvFile: string;
  examBoard: string;
  qualification: string;
  versionLabel: string;
  validFrom: string | null;
  validTo: string | null;
  isCurrent: boolean;
  units: NormalizedUnit[];
  components: NormalizedComponent[];
  /** Diagnostics only — not fatal, surfaced for operator awareness. */
  notices: string[];
};

function componentKey(paperCode: string, level: string): string {
  return `${paperCode}|${level}`;
}

/**
 * Collapses the flat, repeated CSV rows into the shared hierarchy: one unit per
 * distinct Main Topic, one topic per distinct Subtopic within a unit, one learning
 * outcome per distinct (topic, outcome text) — with every paper/level it's examined
 * under preserved as an "occurrence" rather than a duplicate row.
 */
export function normalizeSyllabus(entry: SyllabusManifestEntry, rows: ParsedRow[]): NormalizedSyllabus {
  const notices: string[] = [];

  const csvSubjects = new Set(rows.map((r) => r.subject));
  if (csvSubjects.size === 1) {
    const [csvSubject] = csvSubjects;
    if (csvSubject !== entry.subjectName) {
      notices.push(
        `manifest subjectName "${entry.subjectName}" differs from CSV Subject column "${csvSubject}" — using manifest name for the shared subjects row, CSV value is otherwise unused`,
      );
    }
  }

  const examBoard = rows[0]?.examBoard ?? "";
  const qualification = rows[0]?.qualification ?? "";

  const components = new Map<string, NormalizedComponent>();
  const units = new Map<string, NormalizedUnit>();

  for (const row of rows) {
    if (row.paperCode && row.level) {
      const key = componentKey(row.paperCode, row.level);
      if (!components.has(key)) {
        components.set(key, {
          paperCode: row.paperCode,
          level: row.level,
          componentName: row.componentName,
          durationMinutes: row.durationMinutes,
          totalMarks: row.totalMarks,
          weightingPercent: row.weightingPercent,
          orderIndex: components.size,
        });
      }
    }

    let unit = units.get(row.mainTopic);
    if (!unit) {
      unit = { title: row.mainTopic, orderIndex: units.size, topics: [] };
      units.set(row.mainTopic, unit);
    }

    let topic = unit.topics.find((t) => t.title === row.subtopic);
    if (!topic) {
      topic = { title: row.subtopic, orderIndex: unit.topics.length, learningOutcomes: [] };
      unit.topics.push(topic);
    }

    let outcome = topic.learningOutcomes.find((o) => o.outcome === row.learningOutcome);
    if (!outcome) {
      outcome = { outcome: row.learningOutcome, orderIndex: topic.learningOutcomes.length, occurrences: [] };
      topic.learningOutcomes.push(outcome);
    }

    const occurrenceKey = row.paperCode && row.level ? componentKey(row.paperCode, row.level) : null;
    const alreadyLinked = outcome.occurrences.some(
      (o) => o.componentKey === occurrenceKey && o.level === row.level,
    );
    if (!alreadyLinked) {
      outcome.occurrences.push({ componentKey: occurrenceKey, level: row.level });
    }
  }

  return {
    subjectCode: entry.subjectCode,
    subjectName: entry.subjectName,
    color: entry.color,
    csvFile: entry.csvFile,
    examBoard,
    qualification,
    versionLabel: entry.versionLabel,
    validFrom: entry.validFrom,
    validTo: entry.validTo,
    isCurrent: entry.isCurrent,
    units: [...units.values()],
    components: [...components.values()],
    notices,
  };
}
