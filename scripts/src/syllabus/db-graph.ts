import { eq, inArray } from "drizzle-orm";
import {
  assessmentComponentsTable,
  learningOutcomeComponentsTable,
  syllabusLearningOutcomesTable,
  syllabusTopicsTable,
  syllabusUnitsTable,
  syllabusVersionsTable,
  type db,
} from "@workspace/db";
import type { CanonicalGraph } from "./canonical-graph.js";
import { sortCanonicalGraph } from "./canonical-graph.js";

export type GraphTx = Pick<typeof db, "select">;

export async function loadCanonicalGraphForVersion(
  tx: GraphTx,
  syllabusVersionId: number,
): Promise<CanonicalGraph | null> {
  const [version] = await tx
    .select()
    .from(syllabusVersionsTable)
    .where(eq(syllabusVersionsTable.id, syllabusVersionId));
  if (!version) return null;

  const components = await tx
    .select()
    .from(assessmentComponentsTable)
    .where(eq(assessmentComponentsTable.syllabusVersionId, syllabusVersionId));

  const units = await tx
    .select()
    .from(syllabusUnitsTable)
    .where(eq(syllabusUnitsTable.syllabusVersionId, syllabusVersionId));

  const unitIds = units.map((unit) => unit.id);
  const topics =
    unitIds.length > 0
      ? await tx
          .select()
          .from(syllabusTopicsTable)
          .where(inArray(syllabusTopicsTable.unitId, unitIds))
      : [];

  const topicIds = topics.map((topic) => topic.id);
  const outcomes =
    topicIds.length > 0
      ? await tx
          .select()
          .from(syllabusLearningOutcomesTable)
          .where(inArray(syllabusLearningOutcomesTable.topicId, topicIds))
      : [];

  const outcomeIds = outcomes.map((outcome) => outcome.id);
  const junctions =
    outcomeIds.length > 0
      ? await tx
          .select()
          .from(learningOutcomeComponentsTable)
          .where(inArray(learningOutcomeComponentsTable.learningOutcomeId, outcomeIds))
      : [];

  const componentKeyById = new Map(
    components.map((component) => [
      component.id,
      `${component.paperCode}|${component.level}`,
    ]),
  );

  const topicsByUnit = new Map<number, typeof topics>();
  for (const topic of topics) {
    const list = topicsByUnit.get(topic.unitId) ?? [];
    list.push(topic);
    topicsByUnit.set(topic.unitId, list);
  }

  const outcomesByTopic = new Map<number, typeof outcomes>();
  for (const outcome of outcomes) {
    const list = outcomesByTopic.get(outcome.topicId) ?? [];
    list.push(outcome);
    outcomesByTopic.set(outcome.topicId, list);
  }

  const junctionsByOutcome = new Map<number, typeof junctions>();
  for (const junction of junctions) {
    const list = junctionsByOutcome.get(junction.learningOutcomeId) ?? [];
    list.push(junction);
    junctionsByOutcome.set(junction.learningOutcomeId, list);
  }

  return sortCanonicalGraph({
    examBoard: version.examBoard,
    qualification: version.qualification,
    units: units.map((unit) => ({
      title: unit.title,
      orderIndex: unit.orderIndex,
      topics: (topicsByUnit.get(unit.id) ?? []).map((topic) => ({
        title: topic.title,
        orderIndex: topic.orderIndex,
        learningOutcomes: (outcomesByTopic.get(topic.id) ?? []).map((outcome) => ({
          outcome: outcome.outcome,
          orderIndex: outcome.orderIndex,
          occurrences: (junctionsByOutcome.get(outcome.id) ?? []).map((junction) => ({
            componentKey: junction.componentId
              ? (componentKeyById.get(junction.componentId) ?? null)
              : null,
            level: junction.level,
          })),
        })),
      })),
    })),
    components: components.map((component) => ({
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
