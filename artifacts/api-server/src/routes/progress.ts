import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, subjectsTable, syllabusTopicsTable, tasksTable, pastPaperAttemptsTable } from "@workspace/db";
import { GetProgressOverviewResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/progress/overview", async (req, res): Promise<void> => {
  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.id);

  // Syllabus completion per subject
  const syllabusCompletion = await Promise.all(
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

  const overallSyllabusProgress =
    syllabusCompletion.length > 0
      ? Math.round(syllabusCompletion.reduce((acc, s) => acc + s.syllabusProgress, 0) / syllabusCompletion.length)
      : 0;

  // Weekly tasks completed (last 7 days)
  const allTasks = await db.select().from(tasksTable);
  const weeklyTasksCompleted: { date: string; tasksCompleted: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const count = allTasks.filter(
      (t) => t.completed && t.completedAt && t.completedAt.toISOString().split("T")[0] === dateStr
    ).length;
    weeklyTasksCompleted.push({ date: dateStr, tasksCompleted: count });
  }

  // Subject attention needed
  const subjectAttentionNeeded = await Promise.all(
    subjects.map(async (subject) => {
      const papers = await db
        .select()
        .from(pastPaperAttemptsTable)
        .where(eq(pastPaperAttemptsTable.subjectId, subject.id))
        .orderBy(pastPaperAttemptsTable.dateAttempted);

      const topics = await db
        .select()
        .from(syllabusTopicsTable)
        .where(eq(syllabusTopicsTable.subjectId, subject.id));
      const topicsTotal = topics.length;
      const topicsCompleted = topics.filter((t) => t.status === "completed").length;
      const syllabusProgress = topicsTotal > 0 ? Math.round((topicsCompleted / topicsTotal) * 100) : 0;

      let recentScoreTrend: number | null = null;
      if (papers.length >= 2) {
        const last2 = papers.slice(-2);
        recentScoreTrend = last2[1].percentage - last2[0].percentage;
      }

      const needsAttention =
        syllabusProgress < 40 ||
        (recentScoreTrend !== null && recentScoreTrend < -5) ||
        (papers.length > 0 && papers[papers.length - 1].percentage < 55);

      const reason =
        syllabusProgress < 40
          ? "Low syllabus coverage — many topics still not started."
          : recentScoreTrend !== null && recentScoreTrend < -5
          ? "Recent paper scores are declining."
          : "Latest paper score below 55%.";

      return needsAttention
        ? { subjectId: subject.id, subjectName: subject.name, subjectColor: subject.color, reason, syllabusProgress, recentScoreTrend }
        : null;
    })
  );

  const totalTasksCompleted = allTasks.filter((t) => t.completed).length;
  const allPapers = await db.select().from(pastPaperAttemptsTable);
  const totalPapersLogged = allPapers.length;

  res.json(
    GetProgressOverviewResponse.parse({
      syllabusCompletion,
      weeklyTasksCompleted,
      subjectAttentionNeeded: subjectAttentionNeeded.filter(Boolean),
      totalTasksCompleted,
      totalPapersLogged,
      overallSyllabusProgress,
    })
  );
});

export default router;
