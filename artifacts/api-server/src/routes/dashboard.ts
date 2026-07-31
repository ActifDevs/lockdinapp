import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, subjectsTable, syllabusTopicsTable, tasksTable, pastPaperAttemptsTable, assessmentComponentsTable, examDatesTable } from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { computePaperLabel } from "../lib/paper-label";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.id);
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const topics = await db.select().from(syllabusTopicsTable);
  const topicsBySubjectId = new Map<number, typeof topics>();
  for (const topic of topics) {
    const list = topicsBySubjectId.get(topic.subjectId) ?? [];
    list.push(topic);
    topicsBySubjectId.set(topic.subjectId, list);
  }

  // Subject progress summary
  const subjectProgressSummary = subjects.map((subject) => {
      const subjectTopics = topicsBySubjectId.get(subject.id) ?? [];
      const topicsTotal = subjectTopics.length;
      const topicsCompleted = subjectTopics.filter((t) => t.status === "completed").length;
      const syllabusProgress = topicsTotal > 0 ? Math.round((topicsCompleted / topicsTotal) * 100) : 0;
      return {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectColor: subject.color,
        syllabusProgress,
      };
  });

  // Today's tasks
  const allTasks = await db
    .select()
    .from(tasksTable)
    .orderBy(tasksTable.deadline, tasksTable.createdAt);
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));

  const enrichTask = (task: typeof tasksTable.$inferSelect) => {
    const subject = subjectById.get(task.subjectId) ?? null;
    const topic = task.topicId ? topicById.get(task.topicId) ?? null : null;
    return {
      ...task,
      subjectName: subject?.name ?? "Unknown",
      subjectColor: subject?.color ?? "#6366f1",
      topicTitle: (topic as { title: string } | null)?.title ?? null,
      deadline: task.deadline ?? null,
      estimatedMinutes: task.estimatedMinutes ?? null,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
    };
  };

  const todayTasks = (
    allTasks.filter((t) => !t.completed && t.deadline === today).map(enrichTask)
  );

  const upcomingDeadlines = (
    allTasks
      .filter((t) => !t.completed && t.deadline && t.deadline >= today)
      .slice(0, 5)
      .map(enrichTask)
  );

  // Recent performance
  const allPapers = await db
    .select()
    .from(pastPaperAttemptsTable)
    .orderBy(pastPaperAttemptsTable.subjectId, pastPaperAttemptsTable.dateAttempted);
  const papersBySubjectId = new Map<number, typeof allPapers>();
  for (const paper of allPapers) {
    const list = papersBySubjectId.get(paper.subjectId) ?? [];
    list.push(paper);
    papersBySubjectId.set(paper.subjectId, list);
  }
  const latestComponentIds = [...new Set(
    subjects
      .map((subject) => {
        const papers = papersBySubjectId.get(subject.id) ?? [];
        return papers.length > 0 ? papers[papers.length - 1]?.componentId ?? null : null;
      })
      .filter((id): id is number => id !== null)
  )];
  const latestComponents = latestComponentIds.length > 0
    ? await db.select().from(assessmentComponentsTable).where(inArray(assessmentComponentsTable.id, latestComponentIds))
    : [];
  const componentById = new Map(latestComponents.map((component) => [component.id, component]));

  const recentPerformance = subjects.map((subject) => {
      const papers = papersBySubjectId.get(subject.id) ?? [];
      if (papers.length === 0) return null;

      const latestPaper = papers[papers.length - 1];
      const previousPaper = papers.length >= 2 ? papers[papers.length - 2] : null;
      const change = previousPaper ? latestPaper.percentage - previousPaper.percentage : null;
      const latestComponent = latestPaper.componentId !== null
        ? componentById.get(latestPaper.componentId) ?? null
        : null;

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectColor: subject.color,
        paperLabel: computePaperLabel({
          subjectCode: subject.code,
          component: latestComponent ?? null,
          variant: latestPaper.variant,
          session: latestPaper.session,
        }),
        previousPercentage: previousPaper?.percentage ?? null,
        latestPercentage: latestPaper.percentage,
        change,
      };
  });

  // Upcoming exams
  const upcomingExams = await db
    .select()
    .from(examDatesTable)
    .orderBy(examDatesTable.date);

  const enrichedExams = upcomingExams.slice(0, 5).map((exam) => {
    const subject = subjectById.get(exam.subjectId) ?? null;
    return {
      ...exam,
      subjectName: subject?.name ?? "Unknown",
      subjectColor: subject?.color ?? "#6366f1",
      notes: exam.notes ?? null,
    };
  });

  // Study streak: count consecutive days with completed tasks
  const completedTasks = allTasks
    .filter((t) => t.completed && t.completedAt)
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));

  const uniqueDays = new Set(
    completedTasks.map((t) => t.completedAt?.toISOString().split("T")[0] ?? "")
  );

  let streakDays = 0;
  const checkDate = new Date();
  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (uniqueDays.has(dateStr)) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  res.json(
    GetDashboardSummaryResponse.parse({
      studentName: "Student",
      studyStreakDays: streakDays,
      todayTasksTotal: todayTasks.length,
      todayTasksCompleted: allTasks.filter((t) => t.completed && t.deadline === today).length,
      todayTasks,
      upcomingDeadlines,
      subjectProgressSummary,
      recentPerformance: recentPerformance.filter(Boolean),
      upcomingExams: enrichedExams,
    })
  );
});

export default router;
