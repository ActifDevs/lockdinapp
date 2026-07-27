import { Router, type IRouter } from "express";
import { and, eq, inArray, desc } from "drizzle-orm";
import {
  db,
  subjectsTable,
  syllabusUnitsTable,
  syllabusTopicsTable,
  syllabusLearningOutcomesTable,
  syllabusVersionsTable,
  assessmentComponentsTable,
  tasksTable,
  pastPaperAttemptsTable,
} from "@workspace/db";
import {
  ListSubjectsResponse,
  CreateSubjectBody,
  CreateSubjectResponse,
  GetSubjectParams,
  GetSubjectResponse,
  DeleteSubjectParams,
  GetSubjectSyllabusParams,
  GetSubjectSyllabusResponse,
  GetSubjectPerformanceParams,
  GetSubjectPerformanceResponse,
  ListAssessmentComponentsParams,
  ListAssessmentComponentsResponse,
} from "@workspace/api-zod";
import { computePaperLabel } from "../lib/paper-label";

const router: IRouter = Router();

async function enrichSubject(subject: typeof subjectsTable.$inferSelect) {
  const topics = await db
    .select()
    .from(syllabusTopicsTable)
    .where(eq(syllabusTopicsTable.subjectId, subject.id));

  const topicsTotal = topics.length;
  const topicsCompleted = topics.filter((t) => t.status === "completed").length;
  const topicsInProgress = topics.filter((t) => t.status === "in_progress").length;
  const syllabusProgress = topicsTotal > 0 ? Math.round((topicsCompleted / topicsTotal) * 100) : 0;

  const upcomingTasks = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.subjectId, subject.id));
  const upcomingTasksCount = upcomingTasks.filter((t) => !t.completed).length;

  const [recentPaper] = await db
    .select()
    .from(pastPaperAttemptsTable)
    .where(eq(pastPaperAttemptsTable.subjectId, subject.id))
    .orderBy(desc(pastPaperAttemptsTable.dateAttempted))
    .limit(1);

  let recentPaperLabel: string | null = null;
  if (recentPaper) {
    const [component] = recentPaper.componentId
      ? await db.select().from(assessmentComponentsTable).where(eq(assessmentComponentsTable.id, recentPaper.componentId))
      : [null];
    recentPaperLabel = computePaperLabel({
      subjectCode: subject.code,
      component: component ?? null,
      variant: recentPaper.variant,
      session: recentPaper.session,
    });
  }

  return {
    ...subject,
    syllabusProgress,
    topicsTotal,
    topicsCompleted,
    topicsInProgress,
    upcomingTasksCount,
    recentPaperScore: recentPaper ? recentPaper.percentage : null,
    recentPaperLabel,
  };
}

router.get("/subjects", async (_req, res): Promise<void> => {
  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.id);
  const result = await Promise.all(subjects.map(enrichSubject));
  res.json(ListSubjectsResponse.parse(result));
});

router.post("/subjects", async (req, res): Promise<void> => {
  const body = CreateSubjectBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const code = body.data.code.trim();
  const name = body.data.name.trim();
  const color = body.data.color.trim();

  const [existing] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.code, code));

  if (existing) {
    res.status(200).json(CreateSubjectResponse.parse(await enrichSubject(existing)));
    return;
  }

  // Syllabus content (units/topics/learning outcomes/components) is populated exclusively
  // by the syllabus importer against SYLLABUS_IMPORT_MANIFEST — subject creation no longer
  // seeds placeholder syllabus content now that validated CSV data is the canonical dataset.
  const [created] = await db
    .insert(subjectsTable)
    .values({ name, code, color })
    .returning();

  res.status(201).json(CreateSubjectResponse.parse(await enrichSubject(created)));
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

  res.json(GetSubjectResponse.parse(await enrichSubject(subject)));
});

router.delete("/subjects/:subjectId", async (req, res): Promise<void> => {
  const params = DeleteSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(subjectsTable)
    .where(eq(subjectsTable.id, params.data.subjectId))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  res.status(204).send();
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
    ? await db.select().from(syllabusTopicsTable).where(inArray(syllabusTopicsTable.unitId, unitIds)).orderBy(syllabusTopicsTable.orderIndex)
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

  const result = units.map((unit) => ({
    ...unit,
    topics: topics
      .filter((t) => t.unitId === unit.id)
      .map((topic) => ({ ...topic, learningOutcomes: outcomesByTopicId.get(topic.id) ?? [] })),
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
    .where(and(eq(syllabusVersionsTable.subjectId, params.data.subjectId), eq(syllabusVersionsTable.isCurrent, true)));

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

  const papers = await db
    .select()
    .from(pastPaperAttemptsTable)
    .where(eq(pastPaperAttemptsTable.subjectId, params.data.subjectId))
    .orderBy(pastPaperAttemptsTable.dateAttempted);

  const latestScore = papers.length > 0 ? papers[papers.length - 1].percentage : null;
  const averageScore =
    papers.length > 0 ? Math.round(papers.reduce((acc, p) => acc + p.percentage, 0) / papers.length) : null;
  const bestScore = papers.length > 0 ? Math.max(...papers.map((p) => p.percentage)) : null;

  const trend = papers.map((p, idx) => ({
    label: `Paper ${idx + 1}`,
    percentage: p.percentage,
    session: p.session,
  }));

  const componentIds = [...new Set(papers.map((p) => p.componentId).filter((id): id is number => id !== null))];
  const components = componentIds.length
    ? await db.select().from(assessmentComponentsTable).where(inArray(assessmentComponentsTable.id, componentIds))
    : [];
  const componentById = new Map(components.map((c) => [c.id, c]));

  const componentMap = new Map<string, { componentId: number | null; componentName: string; percentages: number[] }>();
  for (const p of papers) {
    const key = p.componentId !== null ? String(p.componentId) : "unknown";
    const componentName = p.componentId !== null ? componentById.get(p.componentId)?.componentName ?? "Unknown component" : "Unknown component";
    if (!componentMap.has(key)) componentMap.set(key, { componentId: p.componentId, componentName, percentages: [] });
    componentMap.get(key)!.percentages.push(p.percentage);
  }

  const componentBreakdown = Array.from(componentMap.values()).map((data) => ({
    componentId: data.componentId,
    componentName: data.componentName,
    latestPercentage: data.percentages[data.percentages.length - 1] ?? null,
    attempts: data.percentages.length,
  }));

  let insight: string | null = null;
  if (papers.length >= 3) {
    const last3 = papers.slice(-3);
    const isImproving = last3[2].percentage > last3[0].percentage;
    if (isImproving) {
      insight = `${subject.name} is improving — your last three papers showed consistent growth.`;
    } else {
      insight = `${subject.name} may need extra attention — consider reviewing weak topics before the next paper.`;
    }
  }

  res.json(
    GetSubjectPerformanceResponse.parse({
      subjectId: subject.id,
      subjectName: subject.name,
      latestScore,
      averageScore,
      bestScore,
      papersCompleted: papers.length,
      trend,
      componentBreakdown,
      insight,
    })
  );
});

export default router;
