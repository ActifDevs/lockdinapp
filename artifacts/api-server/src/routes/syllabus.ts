import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, syllabusTopicsTable } from "@workspace/db";
import { UpdateSyllabusTopicParams, UpdateSyllabusTopicBody, UpdateSyllabusTopicResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.patch("/syllabus-topics/:topicId", async (req, res): Promise<void> => {
  const params = UpdateSyllabusTopicParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateSyllabusTopicBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updateData: Partial<{ status: "not_started" | "in_progress" | "completed"; notes: string | null }> = {};
  if (body.data.status !== undefined) updateData.status = body.data.status;
  if (body.data.notes !== undefined) updateData.notes = body.data.notes;

  if (Object.keys(updateData).length === 0) {
    const [topic] = await db
      .select()
      .from(syllabusTopicsTable)
      .where(eq(syllabusTopicsTable.id, params.data.topicId));
    if (!topic) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }
    res.json(UpdateSyllabusTopicResponse.parse(topic));
    return;
  }

  const [topic] = await db
    .update(syllabusTopicsTable)
    .set(updateData)
    .where(eq(syllabusTopicsTable.id, params.data.topicId))
    .returning();

  if (!topic) {
    res.status(404).json({ error: "Topic not found" });
    return;
  }

  res.json(UpdateSyllabusTopicResponse.parse(topic));
});

export default router;
