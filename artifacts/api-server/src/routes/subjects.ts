import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  subjectsTable,
  syllabusUnitsTable,
  syllabusTopicsTable,
  tasksTable,
  pastPapersTable,
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
} from "@workspace/api-zod";

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

  const papers = await db
    .select()
    .from(pastPapersTable)
    .where(eq(pastPapersTable.subjectId, subject.id))
    .orderBy(pastPapersTable.dateAttempted);

  const recentPaper = papers[papers.length - 1] ?? null;

  return {
    ...subject,
    syllabusProgress,
    topicsTotal,
    topicsCompleted,
    topicsInProgress,
    upcomingTasksCount,
    recentPaperScore: recentPaper ? recentPaper.percentage : null,
    recentPaperLabel: recentPaper ? recentPaper.paperCode : null,
  };
}

async function seedStarterSyllabus(subjectId: number, subjectName: string) {
  const [unit] = await db
    .insert(syllabusUnitsTable)
    .values({
      subjectId,
      title: `${subjectName} foundations`,
      orderIndex: 0,
    })
    .returning();

  await db.insert(syllabusTopicsTable).values([
    {
      unitId: unit.id,
      subjectId,
      title: "Syllabus overview & exam format",
      status: "not_started",
      orderIndex: 0,
    },
    {
      unitId: unit.id,
      subjectId,
      title: "Core topic review",
      status: "not_started",
      orderIndex: 1,
    },
    {
      unitId: unit.id,
      subjectId,
      title: "Past paper technique",
      status: "not_started",
      orderIndex: 2,
    },
  ]);
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

  const [created] = await db
    .insert(subjectsTable)
    .values({ name, code, color })
    .returning();

  await seedStarterSyllabus(created.id, created.name);

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

  const result = await Promise.all(
    units.map(async (unit) => {
      const topics = await db
        .select()
        .from(syllabusTopicsTable)
        .where(eq(syllabusTopicsTable.unitId, unit.id))
        .orderBy(syllabusTopicsTable.orderIndex);

      return { ...unit, topics };
    })
  );

  res.json(GetSubjectSyllabusResponse.parse(result));
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
    .from(pastPapersTable)
    .where(eq(pastPapersTable.subjectId, params.data.subjectId))
    .orderBy(pastPapersTable.dateAttempted);

  const latestScore = papers.length > 0 ? papers[papers.length - 1].percentage : null;
  const averageScore =
    papers.length > 0 ? Math.round(papers.reduce((acc, p) => acc + p.percentage, 0) / papers.length) : null;
  const bestScore = papers.length > 0 ? Math.max(...papers.map((p) => p.percentage)) : null;

  const trend = papers.map((p, idx) => ({
    label: `Paper ${idx + 1}`,
    percentage: p.percentage,
    session: p.session,
  }));

  const componentMap = new Map<string, { percentages: number[] }>();
  for (const p of papers) {
    const parts = p.paperCode.split("/");
    const component = parts.length >= 2 ? `Paper ${parts[1][0]}` : p.paperCode;
    if (!componentMap.has(component)) componentMap.set(component, { percentages: [] });
    componentMap.get(component)!.percentages.push(p.percentage);
  }

  const componentBreakdown = Array.from(componentMap.entries()).map(([component, data]) => ({
    component,
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
