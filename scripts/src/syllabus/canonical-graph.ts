import { createHash } from "node:crypto";
import type { NormalizedSyllabus } from "./normalize.js";

/**
 * Semantic syllabus graph fingerprint payload.
 *
 * Included: exam board, qualification, ordered units/topics/outcomes,
 * component definitions, and outcome↔component relationships (levels).
 *
 * Excluded: subject code/name/color (catalogue identity), source filename,
 * CSV representation, is_current, lifecycle, timestamps, applicability,
 * version label, valid_from/valid_to.
 */
export type CanonicalOccurrence = {
  componentKey: string | null;
  level: string;
};

export type CanonicalOutcome = {
  outcome: string;
  orderIndex: number;
  occurrences: CanonicalOccurrence[];
};

export type CanonicalTopic = {
  title: string;
  orderIndex: number;
  learningOutcomes: CanonicalOutcome[];
};

export type CanonicalUnit = {
  title: string;
  orderIndex: number;
  topics: CanonicalTopic[];
};

export type CanonicalComponent = {
  paperCode: string;
  level: string;
  componentName: string;
  durationMinutes: number | null;
  totalMarks: number | null;
  weightingPercent: number | null;
  orderIndex: number;
};

export type CanonicalGraph = {
  examBoard: string;
  qualification: string;
  units: CanonicalUnit[];
  components: CanonicalComponent[];
};

function byOrderThen<T>(
  a: T,
  b: T,
  order: (row: T) => number,
  key: (row: T) => string,
): number {
  const orderDiff = order(a) - order(b);
  if (orderDiff !== 0) return orderDiff;
  return key(a).localeCompare(key(b));
}

function sortOccurrences(occurrences: CanonicalOccurrence[]): CanonicalOccurrence[] {
  return [...occurrences].sort((a, b) =>
    `${a.componentKey ?? ""}|${a.level}`.localeCompare(`${b.componentKey ?? ""}|${b.level}`),
  );
}

export function sortCanonicalGraph(graph: CanonicalGraph): CanonicalGraph {
  return {
    examBoard: graph.examBoard,
    qualification: graph.qualification,
    units: [...graph.units]
      .sort((a, b) => byOrderThen(a, b, (u) => u.orderIndex, (u) => u.title))
      .map((unit) => ({
        title: unit.title,
        orderIndex: unit.orderIndex,
        topics: [...unit.topics]
          .sort((a, b) => byOrderThen(a, b, (t) => t.orderIndex, (t) => t.title))
          .map((topic) => ({
            title: topic.title,
            orderIndex: topic.orderIndex,
            learningOutcomes: [...topic.learningOutcomes]
              .sort((a, b) =>
                byOrderThen(a, b, (o) => o.orderIndex, (o) => o.outcome),
              )
              .map((outcome) => ({
                outcome: outcome.outcome,
                orderIndex: outcome.orderIndex,
                occurrences: sortOccurrences(outcome.occurrences),
              })),
          })),
      })),
    components: [...graph.components]
      .sort((a, b) =>
        byOrderThen(
          a,
          b,
          (c) => c.orderIndex,
          (c) => `${c.paperCode}|${c.level}`,
        ),
      )
      .map((component) => ({
        paperCode: component.paperCode,
        level: component.level,
        componentName: component.componentName,
        durationMinutes: component.durationMinutes,
        totalMarks: component.totalMarks,
        weightingPercent: component.weightingPercent,
        orderIndex: component.orderIndex,
      })),
  };
}

export function canonicalGraphFromNormalized(
  syllabus: NormalizedSyllabus,
): CanonicalGraph {
  return sortCanonicalGraph({
    examBoard: syllabus.examBoard,
    qualification: syllabus.qualification,
    units: syllabus.units.map((unit) => ({
      title: unit.title,
      orderIndex: unit.orderIndex,
      topics: unit.topics.map((topic) => ({
        title: topic.title,
        orderIndex: topic.orderIndex,
        learningOutcomes: topic.learningOutcomes.map((outcome) => ({
          outcome: outcome.outcome,
          orderIndex: outcome.orderIndex,
          occurrences: outcome.occurrences.map((occurrence) => ({
            componentKey: occurrence.componentKey,
            level: occurrence.level,
          })),
        })),
      })),
    })),
    components: syllabus.components.map((component) => ({
      paperCode: component.paperCode,
      level: component.level,
      componentName: component.componentName,
      durationMinutes: component.durationMinutes,
      totalMarks: component.totalMarks,
      weightingPercent: component.weightingPercent,
      orderIndex: component.orderIndex,
    })),
  });
}

export function serializeCanonicalGraph(graph: CanonicalGraph): string {
  return JSON.stringify(sortCanonicalGraph(graph));
}

export function hashCanonicalGraph(graph: CanonicalGraph): string {
  return createHash("sha256")
    .update(serializeCanonicalGraph(graph), "utf8")
    .digest("hex");
}

export function hashNormalizedSyllabus(syllabus: NormalizedSyllabus): string {
  return hashCanonicalGraph(canonicalGraphFromNormalized(syllabus));
}
