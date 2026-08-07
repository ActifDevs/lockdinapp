import { Router, type IRouter } from "express";
import { db, subjectsTable } from "@workspace/db";
import { GetProgressOverviewResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { createUserScopedSupabaseClient } from "../lib/supabase-user-client";
import { listUserTaskRows, mappedUserTasks } from "../lib/user-tasks";
import { sendSupabaseError } from "../lib/supabase-errors";

const router: IRouter = Router();

/**
 * Progress overview: Auth-scoped task metrics only.
 * Past-paper sections emptied. Syllabus completion uses neutral placeholders
 * (0) — shared syllabus_topics.status is not per-user data.
 */
router.get("/progress/overview", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const accessToken = req.accessToken!;
  const client = createUserScopedSupabaseClient(accessToken);

  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.id);

  const syllabusCompletion = subjects.map((subject) => ({
    subjectId: subject.id,
    subjectName: subject.name,
    subjectColor: subject.color,
    syllabusProgress: 0,
  }));

  const overallSyllabusProgress = 0;

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
      subjectAttentionNeeded: [],
      totalTasksCompleted,
      totalPapersLogged: 0,
      overallSyllabusProgress,
    }),
  );
});

export default router;
