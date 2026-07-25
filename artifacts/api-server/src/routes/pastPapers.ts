import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, pastPapersTable, subjectsTable } from "@workspace/db";
import {
  ListPastPapersQueryParams,
  ListPastPapersResponse,
  CreatePastPaperBody,
  CreatePastPaperResponse,
  DeletePastPaperParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/past-papers", async (req, res): Promise<void> => {
  const queryParams = ListPastPapersQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  let papers = await db
    .select()
    .from(pastPapersTable)
    .orderBy(pastPapersTable.dateAttempted);

  if (queryParams.data.subjectId) {
    papers = papers.filter((p) => p.subjectId === queryParams.data.subjectId);
  }

  const enriched = await Promise.all(
    papers.map(async (paper) => {
      const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, paper.subjectId));
      return {
        ...paper,
        subjectName: subject?.name ?? "Unknown",
        subjectColor: subject?.color ?? "#6366f1",
        timeTakenMinutes: paper.timeTakenMinutes ?? null,
        notes: paper.notes ?? null,
        createdAt: paper.createdAt.toISOString(),
      };
    })
  );

  res.json(ListPastPapersResponse.parse(enriched));
});

router.post("/past-papers", async (req, res): Promise<void> => {
  const body = CreatePastPaperBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const percentage = Math.round((body.data.score / body.data.totalMarks) * 100);

  const [paper] = await db
    .insert(pastPapersTable)
    .values({
      subjectId: body.data.subjectId,
      paperCode: body.data.paperCode,
      session: body.data.session,
      score: body.data.score,
      totalMarks: body.data.totalMarks,
      percentage,
      dateAttempted: body.data.dateAttempted,
      timeTakenMinutes: body.data.timeTakenMinutes ?? null,
      notes: body.data.notes ?? null,
    })
    .returning();

  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, paper.subjectId));

  res.status(201).json(
    CreatePastPaperResponse.parse({
      ...paper,
      subjectName: subject?.name ?? "Unknown",
      subjectColor: subject?.color ?? "#6366f1",
      timeTakenMinutes: paper.timeTakenMinutes ?? null,
      notes: paper.notes ?? null,
      createdAt: paper.createdAt.toISOString(),
    })
  );
});

router.delete("/past-papers/:pastPaperId", async (req, res): Promise<void> => {
  const params = DeletePastPaperParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [paper] = await db
    .delete(pastPapersTable)
    .where(eq(pastPapersTable.id, params.data.pastPaperId))
    .returning();

  if (!paper) {
    res.status(404).json({ error: "Past paper not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
