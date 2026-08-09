import { Router, type IRouter } from "express";
import { inArray } from "drizzle-orm";
import { db, subjectsTable, syllabusTopicsTable } from "@workspace/db";
import { GetProgressOverviewResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { createUserScopedSupabaseClient } from "../lib/supabase-user-client";
import { listUserTaskRows, mappedUserTasks } from "../lib/user-tasks";
import { sendSupabaseError } from "../lib/supabase-errors";
import {
  computeSyllabusProgressPercent,
  listCallerTopicProgress,
} from "../lib/topic-progress";
import { logger } from "../lib/logger";

const router: IRouter = Router();

type MembershipRow = {
  subject_id: number;
};

/**
 * Progress overview: Auth-scoped task metrics + enrolled-subject syllabus
 * completion from the caller's topic_progress. Past-paper sections remain empty.
 */
router.get("/progress/overview", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const accessToken = req.accessToken!;
  const client = createUserScopedSupabaseClient(accessToken);

  const { data: membershipData, error: membershipError } = await client
    .from("user_subjects")
    .select("subject_id")
    .eq("user_id", userId)
    .order("subject_id");

  if (membershipError) {
    sendSupabaseError(res, membershipError, "progress_user_subjects");
    return;
  }

  const memberships = (membershipData ?? []) as MembershipRow[];
  const enrolledSubjectIds = memberships.map((row) => row.subject_id);

  let syllabusCompletion: {
    subjectId: number;
    subjectName: string;
    subjectColor: string;
    syllabusProgress: number;
  }[] = [];
  let overallSyllabusProgress = 0;

  if (enrolledSubjectIds.length > 0) {
    const [subjects, topics] = await Promise.all([
      db
        .select()
        .from(subjectsTable)
        .where(inArray(subjectsTable.id, enrolledSubjectIds)),
      db
        .select({
          id: syllabusTopicsTable.id,
          subjectId: syllabusTopicsTable.subjectId,
        })
        .from(syllabusTopicsTable)
        .where(inArray(syllabusTopicsTable.subjectId, enrolledSubjectIds)),
    ]);

    const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
    const topicIds = topics.map((topic) => topic.id);
    const topicsBySubject = new Map<number, number[]>();
    for (const topic of topics) {
      const list = topicsBySubject.get(topic.subjectId) ?? [];
      list.push(topic.id);
      topicsBySubject.set(topic.subjectId, list);
    }

    const { data: progressRows, error: progressError } = await listCallerTopicProgress(
      client,
      topicIds,
    );
    if (progressError) {
      sendSupabaseError(res, progressError, "progress_topic_progress");
      return;
    }

    const completedTopicIds = new Set(
      progressRows
        .filter((row) => row.status === "completed")
        .map((row) => row.topic_id),
    );

    let enrolledTopicTotal = 0;
    let enrolledTopicCompleted = 0;

    syllabusCompletion = enrolledSubjectIds.flatMap((subjectId) => {
      const subject = subjectById.get(subjectId);
      if (!subject) {
        logger.error(
          { context: "progress_overview", subjectId },
          "enrolled subject missing from catalogue",
        );
        return [];
      }
      const subjectTopicIds = topicsBySubject.get(subjectId) ?? [];
      const completed = subjectTopicIds.filter((id) => completedTopicIds.has(id)).length;
      enrolledTopicTotal += subjectTopicIds.length;
      enrolledTopicCompleted += completed;
      return [
        {
          subjectId: subject.id,
          subjectName: subject.name,
          subjectColor: subject.color,
          syllabusProgress: computeSyllabusProgressPercent(
            subjectTopicIds.length,
            completed,
          ),
        },
      ];
    });

    overallSyllabusProgress = computeSyllabusProgressPercent(
      enrolledTopicTotal,
      enrolledTopicCompleted,
    );
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
