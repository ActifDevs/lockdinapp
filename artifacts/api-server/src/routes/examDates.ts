import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, examDatesTable, subjectsTable } from "@workspace/db";
import {
  ListExamDatesResponse,
  CreateExamDateBody,
  CreateExamDateResponse,
  DeleteExamDateParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/exam-dates", async (req, res): Promise<void> => {
  const dates = await db.select().from(examDatesTable).orderBy(examDatesTable.date);

  const enriched = await Promise.all(
    dates.map(async (d) => {
      const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, d.subjectId));
      return {
        ...d,
        subjectName: subject?.name ?? "Unknown",
        subjectColor: subject?.color ?? "#6366f1",
        notes: d.notes ?? null,
      };
    })
  );

  res.json(ListExamDatesResponse.parse(enriched));
});

router.post("/exam-dates", async (req, res): Promise<void> => {
  const body = CreateExamDateBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [examDate] = await db
    .insert(examDatesTable)
    .values({
      subjectId: body.data.subjectId,
      paperCode: body.data.paperCode,
      date: body.data.date,
      notes: body.data.notes ?? null,
    })
    .returning();

  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, examDate.subjectId));

  res.status(201).json(
    CreateExamDateResponse.parse({
      ...examDate,
      subjectName: subject?.name ?? "Unknown",
      subjectColor: subject?.color ?? "#6366f1",
      notes: examDate.notes ?? null,
    })
  );
});

router.delete("/exam-dates/:examDateId", async (req, res): Promise<void> => {
  const params = DeleteExamDateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [examDate] = await db
    .delete(examDatesTable)
    .where(eq(examDatesTable.id, params.data.examDateId))
    .returning();

  if (!examDate) {
    res.status(404).json({ error: "Exam date not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
