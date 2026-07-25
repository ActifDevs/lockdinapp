import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, subjectsTable, syllabusTopicsTable, tasksTable, pastPapersTable, examDatesTable } from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.id);

  // Subject progress summary
  const subjectProgressSummary = await Promise.all(
    subjects.map(async (subject) => {
      const topics = await db
        .select()
        .from(syllabusTopicsTable)
        .where(eq(syllabusTopicsTable.subjectId, subject.id));
      const topicsTotal = topics.length;
      const topicsCompleted = topics.filter((t) => t.status === "completed").length;
      const syllabusProgress = topicsTotal > 0 ? Math.round((topicsCompleted / topicsTotal) * 100) : 0;
      return {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectColor: subject.color,
        syllabusProgress,
      };
    })
  );

  // Today's tasks
  const allTasks = await db
    .select()
    .from(tasksTable)
    .orderBy(tasksTable.deadline, tasksTable.createdAt);

  const enrichTask = async (task: typeof tasksTable.$inferSelect) => {
    const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, task.subjectId));
    const [topic] = task.topicId
      ? await db.select().from(syllabusTopicsTable).where(eq(syllabusTopicsTable.id, task.topicId))
      : [null];
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

  const todayTasks = await Promise.all(
    allTasks.filter((t) => !t.completed && t.deadline === today).map(enrichTask)
  );

  const upcomingDeadlines = await Promise.all(
    allTasks
      .filter((t) => !t.completed && t.deadline && t.deadline >= today)
      .slice(0, 5)
      .map(enrichTask)
  );

  // Recent performance
  const recentPerformance = await Promise.all(
    subjects.map(async (subject) => {
      const papers = await db
        .select()
        .from(pastPapersTable)
        .where(eq(pastPapersTable.subjectId, subject.id))
        .orderBy(pastPapersTable.dateAttempted);

      if (papers.length === 0) return null;

      const latestPaper = papers[papers.length - 1];
      const previousPaper = papers.length >= 2 ? papers[papers.length - 2] : null;
      const change = previousPaper ? latestPaper.percentage - previousPaper.percentage : null;

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectColor: subject.color,
        paperCode: latestPaper.paperCode,
        previousPercentage: previousPaper?.percentage ?? null,
        latestPercentage: latestPaper.percentage,
        change,
      };
    })
  );

  // Upcoming exams
  const upcomingExams = await db
    .select()
    .from(examDatesTable)
    .orderBy(examDatesTable.date);

  const enrichedExams = await Promise.all(
    upcomingExams.slice(0, 5).map(async (exam) => {
      const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, exam.subjectId));
      return {
        ...exam,
        subjectName: subject?.name ?? "Unknown",
        subjectColor: subject?.color ?? "#6366f1",
        notes: exam.notes ?? null,
      };
    })
  );

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
      studentName: "Alex",
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
