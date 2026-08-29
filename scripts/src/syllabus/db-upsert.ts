import { and, eq, sql } from "drizzle-orm";
import {
  db,
  subjectsTable,
  syllabusVersionsTable,
  assessmentComponentsTable,
  syllabusUnitsTable,
  syllabusTopicsTable,
  syllabusLearningOutcomesTable,
  learningOutcomeComponentsTable,
} from "@workspace/db";
import { hashCanonicalGraph, hashNormalizedSyllabus } from "./canonical-graph.js";
import { loadCanonicalGraphForVersion } from "./db-graph.js";
import { SyllabusOperatorError } from "./errors.js";
import type { NormalizedSyllabus } from "./normalize.js";

export type ImportOperation =
  | "draft-created"
  | "draft-rebuilt"
  | "already-imported"
  | "provenance-updated";

export type ImportResult = {
  operation: ImportOperation;
  subject: "created" | "existing";
  contentSha256: string;
  units: number;
  topics: number;
  learningOutcomes: number;
  components: number;
  relationships: number;
};

/** @deprecated counts shape kept for CLI mocks during 6.3B */
export type UpsertCounts = ImportResult;

const TERMINAL = new Set(["published", "retired", "archived"]);

async function lockSubject(
  tx: { execute: typeof db.execute },
  subjectId: number,
): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(872314, ${subjectId})`);
}

function graphCounts(syllabus: NormalizedSyllabus) {
  const units = syllabus.units.length;
  const topics = syllabus.units.reduce((sum, unit) => sum + unit.topics.length, 0);
  const learningOutcomes = syllabus.units.reduce(
    (sum, unit) =>
      sum + unit.topics.reduce((inner, topic) => inner + topic.learningOutcomes.length, 0),
    0,
  );
  const relationships = syllabus.units.reduce(
    (sum, unit) =>
      sum +
      unit.topics.reduce(
        (inner, topic) =>
          inner +
          topic.learningOutcomes.reduce(
            (acc, outcome) => acc + outcome.occurrences.length,
            0,
          ),
        0,
      ),
    0,
  );
  return {
    units,
    topics,
    learningOutcomes,
    components: syllabus.components.length,
    relationships,
  };
}

async function insertCompleteGraph(
  tx: any,
  subjectId: number,
  versionId: number,
  syllabus: NormalizedSyllabus,
): Promise<void> {
  const componentIdByKey = new Map<string, number>();
  if (syllabus.components.length > 0) {
    const inserted = await tx
      .insert(assessmentComponentsTable)
      .values(
        syllabus.components.map((component) => ({
          syllabusVersionId: versionId,
          paperCode: component.paperCode,
          level: component.level,
          componentName: component.componentName,
          durationMinutes: component.durationMinutes,
          totalMarks: component.totalMarks,
          weightingPercent: component.weightingPercent,
          orderIndex: component.orderIndex,
        })),
      )
      .returning();
    for (const row of inserted) {
      componentIdByKey.set(`${row.paperCode}|${row.level}`, row.id);
    }
  }

  const unitIdByTitle = new Map<string, number>();
  if (syllabus.units.length > 0) {
    const inserted = await tx
      .insert(syllabusUnitsTable)
      .values(
        syllabus.units.map((unit) => ({
          subjectId,
          syllabusVersionId: versionId,
          title: unit.title,
          orderIndex: unit.orderIndex,
        })),
      )
      .returning();
    for (const row of inserted) unitIdByTitle.set(row.title, row.id);
  }

  const topicIdByUnitAndTitle = new Map<string, number>();
  const topicsToInsert: {
    unitId: number;
    subjectId: number;
    title: string;
    orderIndex: number;
    key: string;
  }[] = [];
  for (const unit of syllabus.units) {
    const unitId = unitIdByTitle.get(unit.title)!;
    for (const topic of unit.topics) {
      const key = `${unitId}|${topic.title}`;
      topicsToInsert.push({
        unitId,
        subjectId,
        title: topic.title,
        orderIndex: topic.orderIndex,
        key,
      });
    }
  }
  if (topicsToInsert.length > 0) {
    const inserted = await tx
      .insert(syllabusTopicsTable)
      .values(
        topicsToInsert.map(({ key: _key, ...rest }) => rest),
      )
      .returning();
    inserted.forEach((row: { id: number }, index: number) => {
      topicIdByUnitAndTitle.set(topicsToInsert[index]!.key, row.id);
    });
  }

  const outcomeIdByKey = new Map<string, number>();
  const outcomesToInsert: {
    topicId: number;
    outcome: string;
    orderIndex: number;
    key: string;
  }[] = [];
  const occurrencesByOutcomeKey = new Map<
    string,
    { componentKey: string | null; level: string }[]
  >();

  for (const unit of syllabus.units) {
    const unitId = unitIdByTitle.get(unit.title)!;
    for (const topic of unit.topics) {
      const topicId = topicIdByUnitAndTitle.get(`${unitId}|${topic.title}`)!;
      for (const outcome of topic.learningOutcomes) {
        const key = `${topicId}|${outcome.outcome}`;
        occurrencesByOutcomeKey.set(key, outcome.occurrences);
        outcomesToInsert.push({
          topicId,
          outcome: outcome.outcome,
          orderIndex: outcome.orderIndex,
          key,
        });
      }
    }
  }
  if (outcomesToInsert.length > 0) {
    const inserted = await tx
      .insert(syllabusLearningOutcomesTable)
      .values(outcomesToInsert.map(({ key: _key, ...rest }) => rest))
      .returning();
    inserted.forEach((row: { id: number }, index: number) => {
      outcomeIdByKey.set(outcomesToInsert[index]!.key, row.id);
    });
  }

  const junctionRows: {
    learningOutcomeId: number;
    componentId: number | null;
    level: string;
  }[] = [];
  for (const [key, occurrences] of occurrencesByOutcomeKey) {
    const learningOutcomeId = outcomeIdByKey.get(key)!;
    for (const occurrence of occurrences) {
      junctionRows.push({
        learningOutcomeId,
        componentId: occurrence.componentKey
          ? (componentIdByKey.get(occurrence.componentKey) ?? null)
          : null,
        level: occurrence.level,
      });
    }
  }
  if (junctionRows.length > 0) {
    await tx.insert(learningOutcomeComponentsTable).values(junctionRows);
  }
}

async function deleteVersionGraph(tx: any, versionId: number): Promise<void> {
  await tx
    .delete(syllabusUnitsTable)
    .where(eq(syllabusUnitsTable.syllabusVersionId, versionId));
  await tx
    .delete(assessmentComponentsTable)
    .where(eq(assessmentComponentsTable.syllabusVersionId, versionId));
}

export async function importSyllabusRevision(
  syllabus: NormalizedSyllabus,
  logicalRevisionKey: string,
): Promise<ImportResult> {
  const trimmedKey = logicalRevisionKey.trim();
  if (!trimmedKey) {
    throw new SyllabusOperatorError(
      "missing_logical_revision_key",
      "logical revision key is required for Model D import; do not infer it from the filename",
    );
  }

  const contentSha256 = hashNormalizedSyllabus(syllabus);
  const counts = graphCounts(syllabus);

  return db.transaction(async (tx) => {
    let subjectStatus: "created" | "existing" = "existing";
    let [subject] = await tx
      .select()
      .from(subjectsTable)
      .where(eq(subjectsTable.code, syllabus.subjectCode));
    if (!subject) {
      [subject] = await tx
        .insert(subjectsTable)
        .values({
          code: syllabus.subjectCode,
          name: syllabus.subjectName,
          color: syllabus.color,
        })
        .returning();
      subjectStatus = "created";
    }

    await lockSubject(tx as { execute: typeof db.execute }, subject.id);

    const [version] = await tx
      .select()
      .from(syllabusVersionsTable)
      .where(
        and(
          eq(syllabusVersionsTable.subjectId, subject.id),
          eq(syllabusVersionsTable.logicalRevisionKey, trimmedKey),
        ),
      );

    if (!version) {
      const [created] = await tx
        .insert(syllabusVersionsTable)
        .values({
          subjectId: subject.id,
          examBoard: syllabus.examBoard,
          qualification: syllabus.qualification,
          label: syllabus.versionLabel,
          validFrom: syllabus.validFrom,
          validTo: syllabus.validTo,
          isCurrent: false,
          sourceFile: syllabus.csvFile,
          lifecycle: "draft",
          logicalRevisionKey: trimmedKey,
        })
        .returning();
      await insertCompleteGraph(tx, subject.id, created.id, syllabus);
      await tx
        .update(syllabusVersionsTable)
        .set({ contentSha256 })
        .where(eq(syllabusVersionsTable.id, created.id));
      return {
        operation: "draft-created",
        subject: subjectStatus,
        contentSha256,
        ...counts,
      };
    }

    if (version.contentSha256 === contentSha256) {
      if (version.sourceFile !== syllabus.csvFile) {
        await tx
          .update(syllabusVersionsTable)
          .set({ sourceFile: syllabus.csvFile })
          .where(eq(syllabusVersionsTable.id, version.id));
        return {
          operation: "provenance-updated",
          subject: subjectStatus,
          contentSha256,
          ...counts,
        };
      }
      return {
        operation: "already-imported",
        subject: subjectStatus,
        contentSha256,
        ...counts,
      };
    }

    if (TERMINAL.has(version.lifecycle)) {
      throw new SyllabusOperatorError(
        "published_content_mismatch",
        `logical revision "${trimmedKey}" is ${version.lifecycle}; its graph is immutable. Provide a new logical_revision_key for the replacement snapshot`,
      );
    }

    if (version.lifecycle !== "draft") {
      throw new SyllabusOperatorError(
        "published_content_mismatch",
        `logical revision "${trimmedKey}" cannot be rebuilt in lifecycle ${version.lifecycle}`,
      );
    }

    await deleteVersionGraph(tx, version.id);
    await insertCompleteGraph(tx, subject.id, version.id, syllabus);
    await tx
      .update(syllabusVersionsTable)
      .set({
        examBoard: syllabus.examBoard,
        qualification: syllabus.qualification,
        label: syllabus.versionLabel,
        validFrom: syllabus.validFrom,
        validTo: syllabus.validTo,
        sourceFile: syllabus.csvFile,
        contentSha256,
      })
      .where(eq(syllabusVersionsTable.id, version.id));

    return {
      operation: "draft-rebuilt",
      subject: subjectStatus,
      contentSha256,
      ...counts,
    };
  });
}

/** Backward-compatible name used by existing tests; requires logicalRevisionKey on the object. */
export async function upsertSyllabus(
  syllabus: NormalizedSyllabus & { logicalRevisionKey?: string },
): Promise<ImportResult> {
  const key = syllabus.logicalRevisionKey;
  if (!key) {
    throw new SyllabusOperatorError(
      "missing_logical_revision_key",
      "logical revision key is required for Model D import; do not infer it from the filename",
    );
  }
  return importSyllabusRevision(syllabus, key);
}

export { hashCanonicalGraph, loadCanonicalGraphForVersion };
