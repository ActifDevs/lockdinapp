import { Router, type IRouter } from "express";
import { db, subjectsTable, syllabusTopicsTable, tasksTable, pastPaperAttemptsTable } from "@workspace/db";
import { GetProgressOverviewResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/progress/overview", async (req, res): Promise<void> => {
  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.id);
  const topics = await db.select().from(syllabusTopicsTable);
  const topicsBySubjectId = new Map<number, typeof topics>();
  for (const topic of topics) {
    const list = topicsBySubjectId.get(topic.subjectId) ?? [];
    list.push(topic);
    topicsBySubjectId.set(topic.subjectId, list);
  }
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

  // Syllabus completion per subject
  const syllabusCompletion = subjects.map((subject) => {
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
  const subjectAttentionNeeded = subjects.map((subject) => {
      const papers = papersBySubjectId.get(subject.id) ?? [];
      const subjectTopics = topicsBySubjectId.get(subject.id) ?? [];
      const topicsTotal = subjectTopics.length;
      const topicsCompleted = subjectTopics.filter((t) => t.status === "completed").length;
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
  });

  const totalTasksCompleted = allTasks.filter((t) => t.completed).length;
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
