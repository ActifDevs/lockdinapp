import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  assessmentComponentsTable,
  db,
  subjectsTable,
  syllabusVersionsTable,
} from "@workspace/db";
import {
  CreatePastPaperAttemptBody,
  CreatePastPaperAttemptResponse,
  DeletePastPaperAttemptParams,
  ListPastPaperAttemptsQueryParams,
  ListPastPaperAttemptsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { createUserScopedSupabaseClient } from "../lib/supabase-user-client";
import { sendSupabaseError } from "../lib/supabase-errors";
import { hasOwnershipField } from "../lib/topic-progress";
import {
  enrichPastPaperRows,
  listUserPastPaperRows,
  PAST_PAPER_ATTEMPT_SELECT,
  type PastPaperAttemptRow,
} from "../lib/past-paper-attempts";

const router: IRouter = Router();

function validPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function normaliseAttemptDate(value: string): string | null {
  const trimmed = value.trim();
  const calendarDate = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(trimmed);
  if (!calendarDate) return null;

  const year = Number(calendarDate[1]);
  const month = Number(calendarDate[2]);
  const day = Number(calendarDate[3]);
  const calendarCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarCheck.getUTCFullYear() !== year ||
    calendarCheck.getUTCMonth() !== month - 1 ||
    calendarCheck.getUTCDate() !== day
  ) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${calendarDate[1]}-${calendarDate[2]}-${calendarDate[3]}`;
}

router.get(
  "/past-paper-attempts",
  requireAuth,
  async (req, res): Promise<void> => {
    const queryParams = ListPastPaperAttemptsQueryParams.safeParse(req.query);
    if (!queryParams.success) {
      res.status(400).json({ error: queryParams.error.message });
      return;
    }

    const subjectId = queryParams.data.subjectId;
    if (subjectId !== undefined && !validPositiveInteger(subjectId)) {
      res.status(400).json({ error: "subjectId must be a positive integer" });
      return;
    }

    const userId = req.userId!;
    const client = createUserScopedSupabaseClient(req.accessToken!);
    const { data, error } = await listUserPastPaperRows(
      client,
      userId,
      subjectId,
    );
    if (error) {
      sendSupabaseError(res, error, "list_past_paper_attempts");
      return;
    }

    const attempts = await enrichPastPaperRows(data);
    res.json(ListPastPaperAttemptsResponse.parse(attempts));
  },
);

router.post(
  "/past-paper-attempts",
  requireAuth,
  async (req, res): Promise<void> => {
    if (hasOwnershipField(req.body)) {
      res
        .status(400)
        .json({
          error: "Ownership fields are not allowed in the request body",
        });
      return;
    }

    const body = CreatePastPaperAttemptBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const input = body.data;
    if (
      !validPositiveInteger(input.subjectId) ||
      !validPositiveInteger(input.componentId)
    ) {
      res
        .status(400)
        .json({ error: "subjectId and componentId must be positive integers" });
      return;
    }
    if (
      !Number.isInteger(input.year) ||
      input.year < 1000 ||
      input.year > 9999
    ) {
      res.status(400).json({ error: "year must be a four-digit integer" });
      return;
    }
    if (!Number.isFinite(input.score) || input.score < 0) {
      res.status(400).json({ error: "score must be a non-negative number" });
      return;
    }
    if (!Number.isInteger(input.totalMarks) || input.totalMarks <= 0) {
      res.status(400).json({ error: "totalMarks must be a positive integer" });
      return;
    }
    if (input.score > input.totalMarks) {
      res.status(400).json({ error: "score cannot exceed totalMarks" });
      return;
    }
    if (
      input.timeTakenMinutes !== undefined &&
      (!Number.isInteger(input.timeTakenMinutes) || input.timeTakenMinutes <= 0)
    ) {
      res
        .status(400)
        .json({ error: "timeTakenMinutes must be a positive integer" });
      return;
    }

    const dateAttempted = normaliseAttemptDate(input.dateAttempted);
    if (!dateAttempted) {
      res.status(400).json({ error: "dateAttempted must be a valid date" });
      return;
    }

    const [[subject], [component]] = await Promise.all([
      db
        .select({ id: subjectsTable.id })
        .from(subjectsTable)
        .where(eq(subjectsTable.id, input.subjectId)),
      db
        .select({
          id: assessmentComponentsTable.id,
          subjectId: syllabusVersionsTable.subjectId,
        })
        .from(assessmentComponentsTable)
        .innerJoin(
          syllabusVersionsTable,
          eq(
            assessmentComponentsTable.syllabusVersionId,
            syllabusVersionsTable.id,
          ),
        )
        .where(eq(assessmentComponentsTable.id, input.componentId)),
    ]);

    if (!subject) {
      res.status(400).json({ error: "Subject not found" });
      return;
    }
    if (!component) {
      res.status(400).json({ error: "Assessment component not found" });
      return;
    }
    if (component.subjectId !== input.subjectId) {
      res
        .status(400)
        .json({ error: "Assessment component does not belong to subject" });
      return;
    }

    const userId = req.userId!;
    const client = createUserScopedSupabaseClient(req.accessToken!);
    const percentage = (input.score / input.totalMarks) * 100;
    const { data, error } = await client
      .from("past_paper_attempts")
      .insert({
        user_id: userId,
        subject_id: input.subjectId,
        component_id: input.componentId,
        variant: input.variant ?? null,
        session: input.session,
        year: input.year,
        score: input.score,
        total_marks: input.totalMarks,
        percentage,
        date_attempted: dateAttempted,
        time_taken_minutes: input.timeTakenMinutes ?? null,
        notes: input.notes?.trim() || null,
      })
      .select(PAST_PAPER_ATTEMPT_SELECT)
      .single();

    if (error || !data) {
      sendSupabaseError(
        res,
        error ?? { code: "PGRST116" },
        "create_past_paper_attempt",
      );
      return;
    }

    const row = data as unknown as PastPaperAttemptRow;
    if (row.user_id !== userId) {
      res.status(404).json({ error: "Past-paper attempt not found" });
      return;
    }

    const [attempt] = await enrichPastPaperRows([row]);
    res.status(201).json(CreatePastPaperAttemptResponse.parse(attempt));
  },
);

router.delete(
  "/past-paper-attempts/:pastPaperAttemptId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeletePastPaperAttemptParams.safeParse(req.params);
    if (
      !params.success ||
      !validPositiveInteger(params.data.pastPaperAttemptId)
    ) {
      res
        .status(400)
        .json({ error: "pastPaperAttemptId must be a positive integer" });
      return;
    }

    const userId = req.userId!;
    const client = createUserScopedSupabaseClient(req.accessToken!);
    const { data, error } = await client
      .from("past_paper_attempts")
      .delete()
      .eq("id", params.data.pastPaperAttemptId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      sendSupabaseError(res, error, "delete_past_paper_attempt");
      return;
    }
    if (!data) {
      res.status(404).json({ error: "Past-paper attempt not found" });
      return;
    }

    res.sendStatus(204);
  },
);

export default router;
