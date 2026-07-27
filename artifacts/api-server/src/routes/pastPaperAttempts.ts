import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, pastPaperAttemptsTable, subjectsTable, assessmentComponentsTable, syllabusVersionsTable } from "@workspace/db";
import {
  ListPastPaperAttemptsQueryParams,
  ListPastPaperAttemptsResponse,
  CreatePastPaperAttemptBody,
  CreatePastPaperAttemptResponse,
  DeletePastPaperAttemptParams,
} from "@workspace/api-zod";
import { computePaperLabel } from "../lib/paper-label";

const router: IRouter = Router();

type AttemptRow = typeof pastPaperAttemptsTable.$inferSelect;
type SubjectRow = typeof subjectsTable.$inferSelect;
type ComponentRow = typeof assessmentComponentsTable.$inferSelect;

function enrichAttempt(attempt: AttemptRow, subject: SubjectRow | null, component: ComponentRow | null) {
  return {
    ...attempt,
    subjectName: subject?.name ?? "Unknown",
    subjectColor: subject?.color ?? "#6366f1",
    componentName: component?.componentName ?? null,
    paperLabel: computePaperLabel({ subjectCode: subject?.code ?? "?", component, variant: attempt.variant, session: attempt.session }),
    timeTakenMinutes: attempt.timeTakenMinutes ?? null,
    notes: attempt.notes ?? null,
    createdAt: attempt.createdAt.toISOString(),
  };
}

router.get("/past-paper-attempts", async (req, res): Promise<void> => {
  const queryParams = ListPastPaperAttemptsQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const rows = await db
    .select({ attempt: pastPaperAttemptsTable, subject: subjectsTable, component: assessmentComponentsTable })
    .from(pastPaperAttemptsTable)
    .leftJoin(subjectsTable, eq(pastPaperAttemptsTable.subjectId, subjectsTable.id))
    .leftJoin(assessmentComponentsTable, eq(pastPaperAttemptsTable.componentId, assessmentComponentsTable.id))
    .orderBy(pastPaperAttemptsTable.dateAttempted);

  const filtered = queryParams.data.subjectId
    ? rows.filter((r) => r.attempt.subjectId === queryParams.data.subjectId)
    : rows;

  const enriched = filtered.map((r) => enrichAttempt(r.attempt, r.subject, r.component));
  res.json(ListPastPaperAttemptsResponse.parse(enriched));
});

router.post("/past-paper-attempts", async (req, res): Promise<void> => {
  const body = CreatePastPaperAttemptBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Component must belong to the selected subject's syllabus version — this is the
  // validation guardrail that prevents an arbitrary component id being logged against
  // the wrong subject.
  const [componentWithVersion] = await db
    .select({ component: assessmentComponentsTable, version: syllabusVersionsTable })
    .from(assessmentComponentsTable)
    .innerJoin(syllabusVersionsTable, eq(assessmentComponentsTable.syllabusVersionId, syllabusVersionsTable.id))
    .where(eq(assessmentComponentsTable.id, body.data.componentId));

  if (!componentWithVersion || componentWithVersion.version.subjectId !== body.data.subjectId) {
    res.status(400).json({ error: "componentId does not belong to the selected subject" });
    return;
  }

  const percentage = Math.round((body.data.score / body.data.totalMarks) * 100);

  const [attempt] = await db
    .insert(pastPaperAttemptsTable)
    .values({
      subjectId: body.data.subjectId,
      componentId: body.data.componentId,
      variant: body.data.variant ?? null,
      session: body.data.session,
      score: body.data.score,
      totalMarks: body.data.totalMarks,
      percentage,
      dateAttempted: body.data.dateAttempted,
      timeTakenMinutes: body.data.timeTakenMinutes ?? null,
      notes: body.data.notes ?? null,
    })
    .returning();

  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, attempt.subjectId));

  res.status(201).json(CreatePastPaperAttemptResponse.parse(enrichAttempt(attempt, subject ?? null, componentWithVersion.component)));
});

router.delete("/past-paper-attempts/:pastPaperAttemptId", async (req, res): Promise<void> => {
  const params = DeletePastPaperAttemptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(pastPaperAttemptsTable)
    .where(eq(pastPaperAttemptsTable.id, params.data.pastPaperAttemptId))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Past paper attempt not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
