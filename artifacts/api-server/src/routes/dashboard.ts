import { Router, type IRouter } from "express";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { createUserScopedSupabaseClient } from "../lib/supabase-user-client";
import { listUserTaskRows, mappedUserTasks } from "../lib/user-tasks";
import { enrichTasks } from "../lib/enrich-task";
import { sendSupabaseError } from "../lib/supabase-errors";
import {
  enrichPastPaperRows,
  listUserPastPaperRows,
} from "../lib/past-paper-attempts";
import {
  enrichExamDateRows,
  filterUpcomingExamRows,
  listUserExamDateRows,
} from "../lib/exam-dates";
import { getUserSubjectProgress } from "../lib/user-subject-progress";

const router: IRouter = Router();

/**
 * Dashboard: caller-owned task metrics and membership-scoped syllabus progress.
 * Past-paper performance and upcoming exams are caller-owned
 * (upcoming exams: date >= today; UI caps display at 4).
 *
 * Today's mission uses the due-today set (deadline === today) only:
 * - todayTasksTotal = all owned tasks due today
 * - todayTasksCompleted = completed tasks within that set
 * - todayTasks = incomplete tasks within that set
 * completedAt is used for streak only, not for mission totals.
 */
router.get(
  "/dashboard/summary",
  requireAuth,
  async (req, res): Promise<void> => {
    const today = new Date().toISOString().split("T")[0];
    const userId = req.userId!;
    const accessToken = req.accessToken!;
    const client = createUserScopedSupabaseClient(accessToken);

    const [subjectProgress, profileResult] = await Promise.all([
      getUserSubjectProgress(client, userId),
      client
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    if (subjectProgress.error) {
      sendSupabaseError(
        res,
        subjectProgress.error,
        `dashboard_${subjectProgress.context}`,
      );
      return;
    }
    if (profileResult.error) {
      sendSupabaseError(
        res,
        profileResult.error,
        "dashboard_profile",
        "Profile",
      );
      return;
    }
    if (!profileResult.data) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const { data: rows, error } = await listUserTaskRows(client, userId);
    if (error) {
      sendSupabaseError(res, error, "dashboard_tasks");
      return;
    }

    const allTasks = mappedUserTasks(rows);

    const { data: pastPaperRows, error: pastPaperError } =
      await listUserPastPaperRows(client, userId);
    if (pastPaperError) {
      sendSupabaseError(res, pastPaperError, "dashboard_past_paper_attempts");
      return;
    }
    const attempts = await enrichPastPaperRows(pastPaperRows);

    const { data: examRows, error: examError } = await listUserExamDateRows(
      client,
      userId,
    );
    if (examError) {
      sendSupabaseError(res, examError, "dashboard_exam_dates");
      return;
    }
    const upcomingExams = await enrichExamDateRows(
      filterUpcomingExamRows(examRows, today),
    );
    const attemptsBySubject = new Map<number, typeof attempts>();
    for (const attempt of attempts) {
      const list = attemptsBySubject.get(attempt.subjectId) ?? [];
      list.push(attempt);
      attemptsBySubject.set(attempt.subjectId, list);
    }
    const round = (value: number) => Math.round(value * 10) / 10;
    const recentPerformance = [...attemptsBySubject.values()].map(
      (subjectAttempts) => {
        const latest = subjectAttempts[0];
        const previous = subjectAttempts[1];
        return {
          subjectId: latest.subjectId,
          subjectName: latest.subjectName,
          subjectColor: latest.subjectColor,
          paperLabel: latest.paperLabel,
          previousPercentage: previous ? round(previous.percentage) : null,
          latestPercentage: round(latest.percentage),
          change: previous
            ? round(latest.percentage - previous.percentage)
            : null,
        };
      },
    );
    const todayDueTasks = allTasks.filter((task) => task.deadline === today);
    const todayTaskCores = todayDueTasks.filter((task) => !task.completed);
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
          new Date(b.completedAt ?? 0).getTime() -
          new Date(a.completedAt ?? 0).getTime(),
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
        studentName: profileResult.data.full_name ?? "Student",
        studyStreakDays: streakDays,
        todayTasksTotal: todayDueTasks.length,
        todayTasksCompleted: todayDueTasks.filter((task) => task.completed)
          .length,
        todayTasks,
        upcomingDeadlines,
        subjectProgressSummary: subjectProgress.data.syllabusCompletion,
        recentPerformance,
        upcomingExams,
      }),
    );
  },
);

export default router;
