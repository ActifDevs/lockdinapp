import { Router, type IRouter } from "express";
import { GetProgressOverviewResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { createUserScopedSupabaseClient } from "../lib/supabase-user-client";
import { listUserTaskRows, mappedUserTasks } from "../lib/user-tasks";
import { sendSupabaseError } from "../lib/supabase-errors";
import { countUserPastPaperAttempts } from "../lib/past-paper-attempts";
import { getUserSubjectProgress } from "../lib/user-subject-progress";

const router: IRouter = Router();

/**
 * Progress overview: Auth-scoped task metrics + enrolled-subject syllabus
 * completion from the caller's topic_progress and caller-owned past-paper count.
 */
router.get(
  "/progress/overview",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.userId!;
    const accessToken = req.accessToken!;
    const client = createUserScopedSupabaseClient(accessToken);

    const subjectProgress = await getUserSubjectProgress(client, userId);
    if (subjectProgress.error) {
      sendSupabaseError(
        res,
        subjectProgress.error,
        `progress_${subjectProgress.context}`,
      );
      return;
    }

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
    const { count: totalPapersLogged, error: pastPaperError } =
      await countUserPastPaperAttempts(client, userId);
    if (pastPaperError) {
      sendSupabaseError(res, pastPaperError, "progress_past_paper_attempts");
      return;
    }

    res.json(
      GetProgressOverviewResponse.parse({
        syllabusCompletion: subjectProgress.data.syllabusCompletion,
        weeklyTasksCompleted,
        subjectAttentionNeeded: [],
        totalTasksCompleted,
        totalPapersLogged,
        overallSyllabusProgress: subjectProgress.data.overallSyllabusProgress,
      }),
    );
  },
);

export default router;
