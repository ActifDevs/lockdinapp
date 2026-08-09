import { Router, type IRouter } from "express";
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  subjectsTable,
  syllabusUnitsTable,
  syllabusTopicsTable,
  syllabusLearningOutcomesTable,
  syllabusVersionsTable,
  assessmentComponentsTable,
} from "@workspace/db";
import {
  ListSubjectsResponse,
  GetSubjectParams,
  GetSubjectResponse,
  GetSubjectSyllabusParams,
  GetSubjectSyllabusResponse,
  GetSubjectPerformanceParams,
  GetSubjectPerformanceResponse,
  ListAssessmentComponentsParams,
  ListAssessmentComponentsResponse,
} from "@workspace/api-zod";
import { temporarilyUnavailableBody } from "../lib/feature-quarantine";

const router: IRouter = Router();

/**
 * Shared subject catalogue — public and read-only.
 *
 * Subjects are importer/admin-managed reference data. Ordinary users must not
 * create or delete catalogue rows. Syllabus topic status/notes are shared
 * student-progress fields and are NOT treated as per-user data: catalogue
 * responses use neutral placeholders (progress 0, status not_started, notes null).
 */
function catalogueEnrichment(subject: typeof subjectsTable.$inferSelect, topicsTotal: number) {
  return {
    ...subject,
    // Neutral placeholders — do not derive from shared syllabus_topics.status.
    syllabusProgress: 0,
    topicsTotal,
    topicsCompleted: 0,
    topicsInProgress: 0,
    upcomingTasksCount: 0,
    recentPaperScore: null,
    recentPaperLabel: null,
  };
}

/**
 * Reference columns only. Hosted DB no longer has syllabus_topics.status/notes;
 * never use an unprojected select() against this table on the live request path.
 */
const syllabusTopicReferenceColumns = {
  id: syllabusTopicsTable.id,
  unitId: syllabusTopicsTable.unitId,
  subjectId: syllabusTopicsTable.subjectId,
  title: syllabusTopicsTable.title,
  orderIndex: syllabusTopicsTable.orderIndex,
} as const;

router.get("/subjects", async (_req, res): Promise<void> => {
  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.id);

  const topicCounts = await db
    .select({ subjectId: syllabusTopicsTable.subjectId })
    .from(syllabusTopicsTable);
  const topicsBySubjectId = new Map<number, number>();
  for (const topic of topicCounts) {
    topicsBySubjectId.set(
      topic.subjectId,
      (topicsBySubjectId.get(topic.subjectId) ?? 0) + 1,
    );
  }

  const result = subjects.map((subject) =>
    catalogueEnrichment(subject, topicsBySubjectId.get(subject.id) ?? 0),
  );

  res.json(ListSubjectsResponse.parse(result));
});

/**
 * Disabled: subjects are shared reference data populated by the syllabus importer.
 * Ordinary users must not insert into the global catalogue. No admin role in Slice 2.
 */
router.post("/subjects", async (_req, res): Promise<void> => {
  res.status(403).json({
    error: "Subject catalogue is read-only shared reference data (importer/admin managed)",
  });
});

router.get("/subjects/:subjectId", async (req, res): Promise<void> => {
  const params = GetSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, params.data.subjectId));

  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  const topics = await db
    .select({ id: syllabusTopicsTable.id })
    .from(syllabusTopicsTable)
    .where(eq(syllabusTopicsTable.subjectId, subject.id));

  res.json(GetSubjectResponse.parse(catalogueEnrichment(subject, topics.length)));
});

/**
 * Disabled: subjects are shared reference data. Ordinary users must not delete
 * catalogue rows. No Drizzle delete is performed.
 */
router.delete("/subjects/:subjectId", async (_req, res): Promise<void> => {
  res.status(403).json({
    error: "Subject catalogue is read-only shared reference data (importer/admin managed)",
  });
});

router.get("/subjects/:subjectId/syllabus", async (req, res): Promise<void> => {
  const params = GetSubjectSyllabusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const units = await db
    .select()
    .from(syllabusUnitsTable)
    .where(eq(syllabusUnitsTable.subjectId, params.data.subjectId))
    .orderBy(syllabusUnitsTable.orderIndex);

  const unitIds = units.map((u) => u.id);
  const topics = unitIds.length
    ? await db
        .select(syllabusTopicReferenceColumns)
        .from(syllabusTopicsTable)
        .where(inArray(syllabusTopicsTable.unitId, unitIds))
        .orderBy(syllabusTopicsTable.orderIndex)
    : [];

  const topicIds = topics.map((t) => t.id);
  const outcomes = topicIds.length
    ? await db
        .select()
        .from(syllabusLearningOutcomesTable)
        .where(inArray(syllabusLearningOutcomesTable.topicId, topicIds))
        .orderBy(syllabusLearningOutcomesTable.orderIndex)
    : [];

  const outcomesByTopicId = new Map<number, string[]>();
  for (const outcome of outcomes) {
    const list = outcomesByTopicId.get(outcome.topicId) ?? [];
    list.push(outcome.outcome);
    outcomesByTopicId.set(outcome.topicId, list);
  }

  // Neutral placeholders — do not read status/notes from the DB row.
  const result = units.map((unit) => ({
    ...unit,
    topics: topics
      .filter((t) => t.unitId === unit.id)
      .map((topic) => ({
        id: topic.id,
        unitId: topic.unitId,
        subjectId: topic.subjectId,
        title: topic.title,
        orderIndex: topic.orderIndex,
        status: "not_started" as const,
        notes: null,
        learningOutcomes: outcomesByTopicId.get(topic.id) ?? [],
      })),
  }));

  res.json(GetSubjectSyllabusResponse.parse(result));
});

router.get("/subjects/:subjectId/assessment-components", async (req, res): Promise<void> => {
  const params = ListAssessmentComponentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [currentVersion] = await db
    .select()
    .from(syllabusVersionsTable)
    .where(
      and(
        eq(syllabusVersionsTable.subjectId, params.data.subjectId),
        eq(syllabusVersionsTable.isCurrent, true),
      ),
    );

  if (!currentVersion) {
    res.json(ListAssessmentComponentsResponse.parse([]));
    return;
  }

  const components = await db
    .select()
    .from(assessmentComponentsTable)
    .where(eq(assessmentComponentsTable.syllabusVersionId, currentVersion.id))
    .orderBy(assessmentComponentsTable.orderIndex);

  res.json(
    ListAssessmentComponentsResponse.parse(
      components.map((c) => ({ ...c, subjectId: params.data.subjectId })),
    ),
  );
});

/**
 * Quarantined: past_paper_attempts are not multi-tenant yet.
 * No query of pastPaperAttemptsTable. Contract-safe empty performance payload.
 */
router.get("/subjects/:subjectId/performance", async (req, res): Promise<void> => {
  const params = GetSubjectPerformanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, params.data.subjectId));

  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  // Intentionally empty — do not leak global past-paper attempts.
  res.json(
    GetSubjectPerformanceResponse.parse({
      subjectId: subject.id,
      subjectName: subject.name,
      latestScore: null,
      averageScore: null,
      bestScore: null,
      papersCompleted: 0,
      trend: [],
      componentBreakdown: [],
      insight: null,
    }),
  );
});

export default router;
