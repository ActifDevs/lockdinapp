import { Router, type IRouter } from "express";
import { db, subjectsTable } from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { createUserScopedSupabaseClient } from "../lib/supabase-user-client";
import { listUserTaskRows, mappedUserTasks } from "../lib/user-tasks";
import { enrichTasks } from "../lib/enrich-task";
import { sendSupabaseError } from "../lib/supabase-errors";

const router: IRouter = Router();

/**
 * Dashboard: Auth-scoped task metrics only.
 * Past-paper / exam sections are emptied (not multi-tenant yet).
 * subjectProgressSummary uses neutral syllabusProgress = 0 placeholders —
 * shared syllabus_topics.status is not per-user data.
 */
router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const userId = req.userId!;
  const accessToken = req.accessToken!;
  const client = createUserScopedSupabaseClient(accessToken);

  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.id);

  const subjectProgressSummary = subjects.map((subject) => ({
    subjectId: subject.id,
    subjectName: subject.name,
    subjectColor: subject.color,
    syllabusProgress: 0,
  }));

  const { data: rows, error } = await listUserTaskRows(client, userId);
  if (error) {
    sendSupabaseError(res, error, "dashboard_tasks");
    return;
  }

  const allTasks = mappedUserTasks(rows);
  const todayTaskCores = allTasks.filter((t) => !t.completed && t.deadline === today);
  const upcomingCores = allTasks
    .filter((t) => !t.completed && t.deadline && t.deadline >= today)
    .slice(0, 5);

  const [todayTasks, upcomingDeadlines] = await Promise.all([
    enrichTasks(todayTaskCores),
    enrichTasks(upcomingCores),
  ]);

  const completedTasks = allTasks
    .filter((t) => t.completed && t.completedAt)
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime(),
    );

  const uniqueDays = new Set(
    completedTasks.map((t) => (t.completedAt ?? "").split("T")[0] ?? ""),
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

  const todayTasksCompleted = allTasks.filter(
    (t) => t.completed && t.completedAt && t.completedAt.split("T")[0] === today,
  ).length;

  res.json(
    GetDashboardSummaryResponse.parse({
      studentName: "Student",
      studyStreakDays: streakDays,
      todayTasksTotal: todayTasks.length,
      todayTasksCompleted,
      todayTasks,
      upcomingDeadlines,
      subjectProgressSummary,
      recentPerformance: [],
      upcomingExams: [],
    }),
  );
});

export default router;
