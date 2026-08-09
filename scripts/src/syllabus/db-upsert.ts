import { and, eq, inArray } from "drizzle-orm";
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
import type { NormalizedSyllabus } from "./normalize.js";

export type UpsertCounts = {
  subject: "created" | "existing";
  version: "created" | "updated" | "unchanged";
  units: { created: number; updated: number; unchanged: number };
  topics: { created: number; updated: number; unchanged: number };
  learningOutcomes: { created: number; updated: number; unchanged: number };
  components: { created: number; updated: number; unchanged: number };
  relationships: { created: number };
};

function bump(bucket: { created: number; updated: number; unchanged: number }, kind: "created" | "updated" | "unchanged") {
  bucket[kind] += 1;
}

/**
 * Upserts one subject's full normalized syllabus inside a single transaction: if
 * anything fails, nothing for this subject is left partially written. Every write is
 * keyed by a deterministic natural key (subject code; (subjectId, sourceFile);
 * (versionId, paperCode, level); (versionId, title); (unitId, title); (topicId,
 * outcome)) so re-running this function against the same CSV is a no-op beyond
 * touching `imported_at`.
 *
 * Performance note: existing rows for the whole version are loaded with one bulk
 * SELECT per table and diffed in memory, and new rows are written with one bulk
 * multi-row INSERT per table — a naive per-row SELECT-then-INSERT loop was measured
 * to take minutes per file against a hosted Postgres instance (network round-trip
 * bound), which this avoids.
 *
 * Per-user progress lives in `topic_progress` and is never written here.
 * This function only upserts shared reference fields (titles, order, subject).
 */
export async function upsertSyllabus(syllabus: NormalizedSyllabus): Promise<UpsertCounts> {
  return db.transaction(async (tx) => {
    const counts: UpsertCounts = {
      subject: "existing",
      version: "unchanged",
      units: { created: 0, updated: 0, unchanged: 0 },
      topics: { created: 0, updated: 0, unchanged: 0 },
      learningOutcomes: { created: 0, updated: 0, unchanged: 0 },
      components: { created: 0, updated: 0, unchanged: 0 },
      relationships: { created: 0 },
    };

    // ---- subject ----
    let [subject] = await tx.select().from(subjectsTable).where(eq(subjectsTable.code, syllabus.subjectCode));
    if (!subject) {
      [subject] = await tx
        .insert(subjectsTable)
        .values({ code: syllabus.subjectCode, name: syllabus.subjectName, color: syllabus.color })
        .returning();
      counts.subject = "created";
    }

    // ---- syllabus version ----
    let [version] = await tx
      .select()
      .from(syllabusVersionsTable)
      .where(and(eq(syllabusVersionsTable.subjectId, subject.id), eq(syllabusVersionsTable.sourceFile, syllabus.csvFile)));

    if (!version) {
      [version] = await tx
        .insert(syllabusVersionsTable)
        .values({
          subjectId: subject.id,
          examBoard: syllabus.examBoard,
          qualification: syllabus.qualification,
          label: syllabus.versionLabel,
          validFrom: syllabus.validFrom,
          validTo: syllabus.validTo,
          isCurrent: syllabus.isCurrent,
          sourceFile: syllabus.csvFile,
        })
        .returning();
      counts.version = "created";
    } else {
      const changed =
        version.examBoard !== syllabus.examBoard ||
        version.qualification !== syllabus.qualification ||
        version.label !== syllabus.versionLabel ||
        version.validFrom !== syllabus.validFrom ||
        version.validTo !== syllabus.validTo ||
        version.isCurrent !== syllabus.isCurrent;
      if (changed) {
        [version] = await tx
          .update(syllabusVersionsTable)
          .set({
            examBoard: syllabus.examBoard,
            qualification: syllabus.qualification,
            label: syllabus.versionLabel,
            validFrom: syllabus.validFrom,
            validTo: syllabus.validTo,
            isCurrent: syllabus.isCurrent,
            importedAt: new Date(),
          })
          .where(eq(syllabusVersionsTable.id, version.id))
          .returning();
        counts.version = "updated";
      }
    }

    // ================= assessment components (bulk) =================
    const existingComponents = await tx
      .select()
      .from(assessmentComponentsTable)
      .where(eq(assessmentComponentsTable.syllabusVersionId, version.id));
    const existingComponentByKey = new Map(existingComponents.map((c) => [`${c.paperCode}|${c.level}`, c]));

    const componentIdByKey = new Map<string, number>();
    const componentsToInsert: (typeof assessmentComponentsTable.$inferInsert)[] = [];
    const componentUpdates: { id: number; values: Partial<typeof assessmentComponentsTable.$inferInsert> }[] = [];

    for (const component of syllabus.components) {
      const key = `${component.paperCode}|${component.level}`;
      const existing = existingComponentByKey.get(key);
      if (!existing) {
        componentsToInsert.push({
          syllabusVersionId: version.id,
          paperCode: component.paperCode,
          level: component.level,
          componentName: component.componentName,
          durationMinutes: component.durationMinutes,
          totalMarks: component.totalMarks,
          weightingPercent: component.weightingPercent,
          orderIndex: component.orderIndex,
        });
      } else {
        const changed =
          existing.componentName !== component.componentName ||
          existing.durationMinutes !== component.durationMinutes ||
          existing.totalMarks !== component.totalMarks ||
          existing.weightingPercent !== component.weightingPercent ||
          existing.orderIndex !== component.orderIndex;
        if (changed) {
          componentUpdates.push({
            id: existing.id,
            values: {
              componentName: component.componentName,
              durationMinutes: component.durationMinutes,
              totalMarks: component.totalMarks,
              weightingPercent: component.weightingPercent,
              orderIndex: component.orderIndex,
            },
          });
          bump(counts.components, "updated");
        } else {
          bump(counts.components, "unchanged");
        }
        componentIdByKey.set(key, existing.id);
      }
    }

    if (componentsToInsert.length > 0) {
      const inserted = await tx.insert(assessmentComponentsTable).values(componentsToInsert).returning();
      for (const row of inserted) {
        componentIdByKey.set(`${row.paperCode}|${row.level}`, row.id);
        bump(counts.components, "created");
      }
    }
    for (const update of componentUpdates) {
      await tx.update(assessmentComponentsTable).set(update.values).where(eq(assessmentComponentsTable.id, update.id));
    }

    // ================= units (bulk) =================
    const existingUnits = await tx.select().from(syllabusUnitsTable).where(eq(syllabusUnitsTable.syllabusVersionId, version.id));
    const existingUnitByTitle = new Map(existingUnits.map((u) => [u.title, u]));

    const unitIdByTitle = new Map<string, number>();
    const unitsToInsert: (typeof syllabusUnitsTable.$inferInsert)[] = [];
    const unitUpdates: { id: number; orderIndex: number }[] = [];

    for (const unit of syllabus.units) {
      const existing = existingUnitByTitle.get(unit.title);
      if (!existing) {
        unitsToInsert.push({ subjectId: subject.id, syllabusVersionId: version.id, title: unit.title, orderIndex: unit.orderIndex });
      } else {
        unitIdByTitle.set(unit.title, existing.id);
        if (existing.orderIndex !== unit.orderIndex || existing.subjectId !== subject.id) {
          unitUpdates.push({ id: existing.id, orderIndex: unit.orderIndex });
          bump(counts.units, "updated");
        } else {
          bump(counts.units, "unchanged");
        }
      }
    }
    if (unitsToInsert.length > 0) {
      const inserted = await tx.insert(syllabusUnitsTable).values(unitsToInsert).returning();
      for (const row of inserted) {
        unitIdByTitle.set(row.title, row.id);
        bump(counts.units, "created");
      }
    }
    for (const update of unitUpdates) {
      await tx.update(syllabusUnitsTable).set({ orderIndex: update.orderIndex, subjectId: subject.id }).where(eq(syllabusUnitsTable.id, update.id));
    }

    // ================= topics (bulk) =================
    const allUnitIds = [...unitIdByTitle.values()];
    const existingTopics = allUnitIds.length > 0 ? await tx.select().from(syllabusTopicsTable).where(inArray(syllabusTopicsTable.unitId, allUnitIds)) : [];
    const existingTopicByUnitAndTitle = new Map(existingTopics.map((t) => [`${t.unitId}|${t.title}`, t]));

    const topicIdByUnitAndTitle = new Map<string, number>();
    const topicsToInsert: (typeof syllabusTopicsTable.$inferInsert & { __key: string })[] = [];
    const topicUpdates: { id: number; orderIndex: number }[] = [];

    for (const unit of syllabus.units) {
      const unitId = unitIdByTitle.get(unit.title)!;
      for (const topic of unit.topics) {
        const key = `${unitId}|${topic.title}`;
        const existing = existingTopicByUnitAndTitle.get(key);
        if (!existing) {
          topicsToInsert.push({ unitId, subjectId: subject.id, title: topic.title, orderIndex: topic.orderIndex, __key: key } as any);
        } else {
          topicIdByUnitAndTitle.set(key, existing.id);
          // Shared reference fields only — per-user progress is in topic_progress.
          if (existing.orderIndex !== topic.orderIndex || existing.subjectId !== subject.id) {
            topicUpdates.push({ id: existing.id, orderIndex: topic.orderIndex });
            bump(counts.topics, "updated");
          } else {
            bump(counts.topics, "unchanged");
          }
        }
      }
    }
    if (topicsToInsert.length > 0) {
      const toInsert = topicsToInsert.map(({ __key, ...rest }) => rest);
      const inserted = await tx.insert(syllabusTopicsTable).values(toInsert).returning();
      inserted.forEach((row, idx) => {
        topicIdByUnitAndTitle.set(topicsToInsert[idx].__key, row.id);
        bump(counts.topics, "created");
      });
    }
    for (const update of topicUpdates) {
      await tx.update(syllabusTopicsTable).set({ orderIndex: update.orderIndex, subjectId: subject.id }).where(eq(syllabusTopicsTable.id, update.id));
    }

    // ================= learning outcomes (bulk) =================
    const allTopicIds = [...topicIdByUnitAndTitle.values()];
    const existingOutcomes =
      allTopicIds.length > 0 ? await tx.select().from(syllabusLearningOutcomesTable).where(inArray(syllabusLearningOutcomesTable.topicId, allTopicIds)) : [];
    const existingOutcomeByTopicAndText = new Map(existingOutcomes.map((o) => [`${o.topicId}|${o.outcome}`, o]));

    const outcomeIdByTopicAndText = new Map<string, number>();
    const outcomesToInsert: (typeof syllabusLearningOutcomesTable.$inferInsert & { __key: string })[] = [];
    const outcomeUpdates: { id: number; orderIndex: number }[] = [];

    // Track, per learning-outcome key, which (componentKey, level) occurrences it needs —
    // built alongside so the junction table can be recomputed after IDs are known.
    const occurrencesByOutcomeKey = new Map<string, { componentKey: string | null; level: string }[]>();

    for (const unit of syllabus.units) {
      const unitId = unitIdByTitle.get(unit.title)!;
      for (const topic of unit.topics) {
        const topicId = topicIdByUnitAndTitle.get(`${unitId}|${topic.title}`)!;
        for (const lo of topic.learningOutcomes) {
          const key = `${topicId}|${lo.outcome}`;
          occurrencesByOutcomeKey.set(key, lo.occurrences);

          const existing = existingOutcomeByTopicAndText.get(key);
          if (!existing) {
            outcomesToInsert.push({ topicId, outcome: lo.outcome, orderIndex: lo.orderIndex, __key: key } as any);
          } else {
            outcomeIdByTopicAndText.set(key, existing.id);
            if (existing.orderIndex !== lo.orderIndex) {
              outcomeUpdates.push({ id: existing.id, orderIndex: lo.orderIndex });
              bump(counts.learningOutcomes, "updated");
            } else {
              bump(counts.learningOutcomes, "unchanged");
            }
          }
        }
      }
    }
    if (outcomesToInsert.length > 0) {
      const toInsert = outcomesToInsert.map(({ __key, ...rest }) => rest);
      const inserted = await tx.insert(syllabusLearningOutcomesTable).values(toInsert).returning();
      inserted.forEach((row, idx) => {
        outcomeIdByTopicAndText.set(outcomesToInsert[idx].__key, row.id);
        bump(counts.learningOutcomes, "created");
      });
    }
    for (const update of outcomeUpdates) {
      await tx.update(syllabusLearningOutcomesTable).set({ orderIndex: update.orderIndex }).where(eq(syllabusLearningOutcomesTable.id, update.id));
    }

    // ================= relationships: recompute for this version's outcomes =================
    const allLearningOutcomeIds = [...outcomeIdByTopicAndText.values()];
    const junctionRowsToInsert: { learningOutcomeId: number; componentId: number | null; level: string }[] = [];
    for (const [key, occurrences] of occurrencesByOutcomeKey) {
      const loId = outcomeIdByTopicAndText.get(key)!;
      for (const occurrence of occurrences) {
        junctionRowsToInsert.push({
          learningOutcomeId: loId,
          componentId: occurrence.componentKey ? componentIdByKey.get(occurrence.componentKey) ?? null : null,
          level: occurrence.level,
        });
      }
    }

    if (allLearningOutcomeIds.length > 0) {
      await tx.delete(learningOutcomeComponentsTable).where(inArray(learningOutcomeComponentsTable.learningOutcomeId, allLearningOutcomeIds));
    }
    if (junctionRowsToInsert.length > 0) {
      await tx.insert(learningOutcomeComponentsTable).values(junctionRowsToInsert);
      counts.relationships.created = junctionRowsToInsert.length;
    }

    return counts;
  });
}
