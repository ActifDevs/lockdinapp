import { Router, type IRouter } from "express";
import { eq, and, lte, gte } from "drizzle-orm";
import { db, tasksTable, subjectsTable, syllabusTopicsTable } from "@workspace/db";
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

const router: IRouter = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  const queryParams = ListTasksQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const { filter, subjectId } = queryParams.data;
  const today = new Date().toISOString().split("T")[0];

  let rawTasks = await db
    .select()
    .from(tasksTable)
    .orderBy(tasksTable.deadline, tasksTable.createdAt);

  if (subjectId) {
    rawTasks = rawTasks.filter((t) => t.subjectId === subjectId);
  }

  if (filter === "today") {
    rawTasks = rawTasks.filter((t) => !t.completed && t.deadline === today);
  } else if (filter === "upcoming") {
    rawTasks = rawTasks.filter((t) => !t.completed);
  } else if (filter === "completed") {
    rawTasks = rawTasks.filter((t) => t.completed);
  }

  const enriched = await Promise.all(
    rawTasks.map(async (task) => {
      const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, task.subjectId));
      const topic = task.topicId
        ? (await db.select().from(syllabusTopicsTable).where(eq(syllabusTopicsTable.id, task.topicId)))[0]
        : null;

      return {
        ...task,
        subjectName: subject?.name ?? "Unknown",
        subjectColor: subject?.color ?? "#6366f1",
        topicTitle: topic?.title ?? null,
        deadline: task.deadline ?? null,
        estimatedMinutes: task.estimatedMinutes ?? null,
        completedAt: task.completedAt ? task.completedAt.toISOString() : null,
        createdAt: task.createdAt.toISOString(),
      };
    })
  );

  res.json(ListTasksResponse.parse(enriched));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const body = CreateTaskBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [task] = await db
    .insert(tasksTable)
    .values({
      title: body.data.title,
      subjectId: body.data.subjectId,
      topicId: body.data.topicId ?? null,
      deadline: body.data.deadline ?? null,
      priority: body.data.priority,
      estimatedMinutes: body.data.estimatedMinutes ?? null,
      completed: false,
    })
    .returning();

  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, task.subjectId));
  const topic = task.topicId
    ? (await db.select().from(syllabusTopicsTable).where(eq(syllabusTopicsTable.id, task.topicId)))[0]
    : null;

  res.status(201).json(
    CreateTaskResponse.parse({
      ...task,
      subjectName: subject?.name ?? "Unknown",
      subjectColor: subject?.color ?? "#6366f1",
      topicTitle: topic?.title ?? null,
      deadline: task.deadline ?? null,
      estimatedMinutes: task.estimatedMinutes ?? null,
      completedAt: null,
      createdAt: task.createdAt.toISOString(),
    })
  );
});

router.patch("/tasks/:taskId", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateTaskBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (body.data.title !== undefined) updateData.title = body.data.title;
  if (body.data.deadline !== undefined) updateData.deadline = body.data.deadline;
  if (body.data.priority !== undefined) updateData.priority = body.data.priority;
  if (body.data.estimatedMinutes !== undefined) updateData.estimatedMinutes = body.data.estimatedMinutes;
  if (body.data.completed !== undefined) {
    updateData.completed = body.data.completed;
    updateData.completedAt = body.data.completed ? new Date() : null;
  }

  const [task] = await db
    .update(tasksTable)
    .set(updateData)
    .where(eq(tasksTable.id, params.data.taskId))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, task.subjectId));
  const topic = task.topicId
    ? (await db.select().from(syllabusTopicsTable).where(eq(syllabusTopicsTable.id, task.topicId)))[0]
    : null;

  res.json(
    UpdateTaskResponse.parse({
      ...task,
      subjectName: subject?.name ?? "Unknown",
      subjectColor: subject?.color ?? "#6366f1",
      topicTitle: topic?.title ?? null,
      deadline: task.deadline ?? null,
      estimatedMinutes: task.estimatedMinutes ?? null,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
    })
  );
});

router.delete("/tasks/:taskId", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .delete(tasksTable)
    .where(eq(tasksTable.id, params.data.taskId))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
