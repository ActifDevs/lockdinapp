import { eq, inArray } from "drizzle-orm";
import {
  db,
  syllabusTopicsTable,
  syllabusUnitsTable,
  syllabusVersionsTable,
} from "@workspace/db";

/** Topics whose parent unit belongs to the given syllabus version. */
export async function countTopicsForSyllabusVersion(
  syllabusVersionId: number,
): Promise<number> {
  const rows = await db
    .select({ id: syllabusTopicsTable.id })
    .from(syllabusTopicsTable)
    .innerJoin(
      syllabusUnitsTable,
      eq(syllabusTopicsTable.unitId, syllabusUnitsTable.id),
    )
    .where(eq(syllabusUnitsTable.syllabusVersionId, syllabusVersionId));
  return rows.length;
}

export async function countTopicsForSyllabusVersions(
  versionIds: number[],
): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (versionIds.length === 0) return counts;

  const rows = await db
    .select({
      syllabusVersionId: syllabusUnitsTable.syllabusVersionId,
      topicId: syllabusTopicsTable.id,
    })
    .from(syllabusTopicsTable)
    .innerJoin(
      syllabusUnitsTable,
      eq(syllabusTopicsTable.unitId, syllabusUnitsTable.id),
    )
    .where(inArray(syllabusUnitsTable.syllabusVersionId, versionIds));

  for (const row of rows) {
    counts.set(
      row.syllabusVersionId,
      (counts.get(row.syllabusVersionId) ?? 0) + 1,
    );
  }
  return counts;
}

/** Public catalogue: topics on each subject's DEFAULT (`is_current`) version. */
export async function countDefaultTopicsBySubjectId(): Promise<Map<number, number>> {
  const rows = await db
    .select({
      subjectId: syllabusVersionsTable.subjectId,
      topicId: syllabusTopicsTable.id,
    })
    .from(syllabusTopicsTable)
    .innerJoin(
      syllabusUnitsTable,
      eq(syllabusTopicsTable.unitId, syllabusUnitsTable.id),
    )
    .innerJoin(
      syllabusVersionsTable,
      eq(syllabusUnitsTable.syllabusVersionId, syllabusVersionsTable.id),
    )
    .where(eq(syllabusVersionsTable.isCurrent, true));

  const counts = new Map<number, number>();
  for (const row of rows) {
    counts.set(row.subjectId, (counts.get(row.subjectId) ?? 0) + 1);
  }
  return counts;
}

export async function listTopicIdsForSyllabusVersions(
  versionIds: number[],
): Promise<Array<{ id: number; subjectId: number }>> {
  if (versionIds.length === 0) return [];
  return db
    .select({
      id: syllabusTopicsTable.id,
      subjectId: syllabusTopicsTable.subjectId,
    })
    .from(syllabusTopicsTable)
    .innerJoin(
      syllabusUnitsTable,
      eq(syllabusTopicsTable.unitId, syllabusUnitsTable.id),
    )
    .where(inArray(syllabusUnitsTable.syllabusVersionId, versionIds));
}
