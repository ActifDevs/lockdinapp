import { Router, type IRouter } from "express";
import { db, subjectsTable, syllabusTopicsTable } from "@workspace/db";
import { GetProgressOverviewResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { createUserScopedSupabaseClient } from "../lib/supabase-user-client";
import { listUserTaskRows, mappedUserTasks } from "../lib/user-tasks";
import { sendSupabaseError } from "../lib/supabase-errors";

const router: IRouter = Router();

/**
 * Progress overview: task metrics are Auth-scoped. Past-paper attention /
 * totals are not multi-tenant in Slice 2, so those sections are emptied
 * rather than returning global paper rows. Syllabus completion still uses
 * shared reference topic status.
 */
router.get("/progress/overview", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const accessToken = req.accessToken!;
  const client = createUserScopedSupabaseClient(accessToken);

  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.id);
  const topics = await db.select().from(syllabusTopicsTable);
  const topicsBySubjectId = new Map<number, typeof topics>();
  for (const topic of topics) {
    const list = topicsBySubjectId.get(topic.subjectId) ?? [];
    list.push(topic);
    topicsBySubjectId.set(topic.subjectId, list);
  }

  const syllabusCompletion = subjects.map((subject) => {
    const subjectTopics = topicsBySubjectId.get(subject.id) ?? [];
    const topicsTotal = subjectTopics.length;
    const topicsCompleted = subjectTopics.filter((t) => t.status === "completed").length;
    const syllabusProgress =
      topicsTotal > 0 ? Math.round((topicsCompleted / topicsTotal) * 100) : 0;
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      subjectColor: subject.color,
      syllabusProgress,
    };
  });

  const overallSyllabusProgress =
    syllabusCompletion.length > 0
      ? Math.round(
          syllabusCompletion.reduce((acc, s) => acc + s.syllabusProgress, 0) /
            syllabusCompletion.length,
        )
      : 0;

  const { data: rows, error } = await listUserTaskRows(client, userId);
  if (error) {
    sendSupabaseError(res, error, "progress_tasks");
    return;
  }

  const allTasks = mappedUserTasks(rows);
  const weeklyTasksCompleted: { date: string; tasksCompleted: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const count = allTasks.filter(
      (t) =>
        t.completed &&
        t.completedAt &&
        t.completedAt.split("T")[0] === dateStr,
    ).length;
    weeklyTasksCompleted.push({ date: dateStr, tasksCompleted: count });
  }

  const totalTasksCompleted = allTasks.filter((t) => t.completed).length;

  res.json(
    GetProgressOverviewResponse.parse({
      syllabusCompletion,
      weeklyTasksCompleted,
      // Slice 2: paper ownership not implemented — do not leak global papers.
      subjectAttentionNeeded: [],
      totalTasksCompleted,
      totalPapersLogged: 0,
      overallSyllabusProgress,
    }),
  );
});

export default router;
