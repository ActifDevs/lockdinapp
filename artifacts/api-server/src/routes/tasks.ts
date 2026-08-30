import { Router, type IRouter } from "express";
import {
  ListTasksQueryParams,
  ListTasksResponse,
  CreateTaskBody,
  CreateTaskResponse,
  UpdateTaskParams,
  UpdateTaskBody,
  UpdateTaskResponse,
  DeleteTaskParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { createUserScopedSupabaseClient } from "../lib/supabase-user-client";
import { mapTaskRow, type TaskRow } from "../lib/task-row";
import { enrichTask, enrichTasks } from "../lib/enrich-task";
import { listUserTaskRows, mappedUserTasks } from "../lib/user-tasks";
import { sendSupabaseError } from "../lib/supabase-errors";
import { hasOwnershipField } from "../lib/topic-progress";
import { assertTopicOnCallerPin } from "../lib/pin-reference-writes";
import {
  fireAndForgetAnalytics,
  trackTaskCreated,
} from "../lib/analytics/index.js";

const router: IRouter = Router();

router.get("/tasks", requireAuth, async (req, res): Promise<void> => {
  const queryParams = ListTasksQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const userId = req.userId!;
  const accessToken = req.accessToken!;
  const client = createUserScopedSupabaseClient(accessToken);

  const { data: rows, error } = await listUserTaskRows(client, userId);
  if (error) {
    sendSupabaseError(res, error, "list_tasks", "Task");
    return;
  }

  const { filter, subjectId } = queryParams.data;
  const today = new Date().toISOString().split("T")[0];
  let tasks = mappedUserTasks(rows);

  if (subjectId) {
    tasks = tasks.filter((t) => t.subjectId === subjectId);
  }
  if (filter === "today") {
    tasks = tasks.filter((t) => !t.completed && t.deadline === today);
  } else if (filter === "upcoming") {
    tasks = tasks.filter((t) => !t.completed);
  } else if (filter === "completed") {
    tasks = tasks.filter((t) => t.completed);
  }

  const enriched = await enrichTasks(tasks);
  res.json(ListTasksResponse.parse(enriched));
});

router.post("/tasks", requireAuth, async (req, res): Promise<void> => {
  // Reject client-supplied ownership even if Zod would strip unknown keys.
  if (hasOwnershipField(req.body)) {
    res
      .status(400)
      .json({ error: "Ownership fields are not allowed in the request body" });
    return;
  }

  const body = CreateTaskBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const userId = req.userId!;
  const accessToken = req.accessToken!;
  const client = createUserScopedSupabaseClient(accessToken);

  if (body.data.topicId != null) {
    const pinCheck = await assertTopicOnCallerPin(
      userId,
      body.data.topicId,
      body.data.subjectId,
    );
    if (!pinCheck.ok) {
      res.status(pinCheck.status).json({ error: pinCheck.error });
      return;
    }
  }

  // Ownership is set only from the verified session. RLS WITH CHECK also
  // requires auth.uid() = user_id; we never accept body userId/user_id.
  const { data, error } = await client
    .from("tasks")
    .insert({
      title: body.data.title,
      subject_id: body.data.subjectId,
      topic_id: body.data.topicId ?? null,
      deadline: body.data.deadline ?? null,
      priority: body.data.priority,
      estimated_minutes: body.data.estimatedMinutes ?? null,
      completed: false,
      user_id: userId,
    })
    .select(
      "id, user_id, title, subject_id, topic_id, deadline, priority, estimated_minutes, completed, completed_at, created_at",
    )
    .single();

  if (error || !data) {
    sendSupabaseError(
      res,
      error ?? { code: "PGRST116" },
      "create_task",
      "Task",
    );
    return;
  }

  // Defence in depth: never return a row that somehow escaped ownership.
  if ((data as TaskRow).user_id !== userId) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const enriched = await enrichTask(mapTaskRow(data as TaskRow));
  res.status(201).json(CreateTaskResponse.parse(enriched));
  await fireAndForgetAnalytics(() => trackTaskCreated({ userId }));
});
router.patch("/tasks/:taskId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (hasOwnershipField(req.body)) {
    res
      .status(400)
      .json({ error: "Ownership fields are not allowed in the request body" });
    return;
  }

  const body = UpdateTaskBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const userId = req.userId!;
  const accessToken = req.accessToken!;
  const client = createUserScopedSupabaseClient(accessToken);

  const updateData: Record<string, unknown> = {};
  if (body.data.title !== undefined) updateData.title = body.data.title;
  if (body.data.deadline !== undefined)
    updateData.deadline = body.data.deadline;
  if (body.data.priority !== undefined)
    updateData.priority = body.data.priority;
  if (body.data.estimatedMinutes !== undefined) {
    updateData.estimated_minutes = body.data.estimatedMinutes;
  }
  if (body.data.completed !== undefined) {
    updateData.completed = body.data.completed;
    updateData.completed_at = body.data.completed
      ? new Date().toISOString()
      : null;
  }

  const { data, error } = await client
    .from("tasks")
    .update(updateData)
    .eq("id", params.data.taskId)
    .eq("user_id", userId)
    .select(
      "id, user_id, title, subject_id, topic_id, deadline, priority, estimated_minutes, completed, completed_at, created_at",
    )
    .maybeSingle();

  if (error) {
    sendSupabaseError(res, error, "update_task", "Task");
    return;
  }

  if (!data) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const enriched = await enrichTask(mapTaskRow(data as TaskRow));
  res.json(UpdateTaskResponse.parse(enriched));
});

router.delete(
  "/tasks/:taskId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeleteTaskParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const userId = req.userId!;
    const accessToken = req.accessToken!;
    const client = createUserScopedSupabaseClient(accessToken);

    const { data, error } = await client
      .from("tasks")
      .delete()
      .eq("id", params.data.taskId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      sendSupabaseError(res, error, "delete_task", "Task");
      return;
    }

    if (!data) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.sendStatus(204);
  },
);

export default router;
