import { Router, type IRouter } from "express";
import { db, subjectsTable, syllabusTopicsTable } from "@workspace/db";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { createUserScopedSupabaseClient } from "../lib/supabase-user-client";
import { listUserTaskRows, mappedUserTasks } from "../lib/user-tasks";
import { enrichTasks } from "../lib/enrich-task";
import { sendSupabaseError } from "../lib/supabase-errors";

const router: IRouter = Router();

/**
 * Dashboard mixes task-derived values (now Auth-scoped) with past-paper and
 * exam sections that are NOT multi-tenant in Slice 2. Those unsafe mixed
 * sections are temporarily returned empty rather than leaking global rows.
 * Syllabus subject progress still comes from shared reference topic status.
 */
router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
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

  const subjectProgressSummary = subjects.map((subject) => {
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

  res.json(
    GetDashboardSummaryResponse.parse({
      studentName: "Student",
      studyStreakDays: streakDays,
      todayTasksTotal: todayTasks.length,
      todayTasksCompleted: allTasks.filter(
        (t) => t.completed && t.deadline === today,
      ).length,
      todayTasks,
      upcomingDeadlines,
      subjectProgressSummary,
      // Slice 2: past-paper / exam ownership is not implemented — do not leak globals.
      recentPerformance: [],
      upcomingExams: [],
    }),
  );
});

export default router;
