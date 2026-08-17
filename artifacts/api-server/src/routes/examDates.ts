import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, subjectsTable } from "@workspace/db";
import {
  CreateExamDateBody,
  CreateExamDateResponse,
  DeleteExamDateParams,
  ListExamDatesResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { createUserScopedSupabaseClient } from "../lib/supabase-user-client";
import { sendSupabaseError } from "../lib/supabase-errors";
import { hasOwnershipField } from "../lib/topic-progress";
import {
  enrichExamDateRows,
  EXAM_DATE_SELECT,
  listUserExamDateRows,
  type ExamDateRow,
} from "../lib/exam-dates";

const router: IRouter = Router();

function validPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function normaliseExamDate(value: string): string | null {
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

router.get("/exam-dates", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const client = createUserScopedSupabaseClient(req.accessToken!);
  const { data, error } = await listUserExamDateRows(client, userId);
  if (error) {
    sendSupabaseError(res, error, "list_exam_dates", "Exam date");
    return;
  }

  const exams = await enrichExamDateRows(data);
  res.json(ListExamDatesResponse.parse(exams));
});

router.post("/exam-dates", requireAuth, async (req, res): Promise<void> => {
  if (hasOwnershipField(req.body)) {
    res.status(400).json({
      error: "Ownership fields are not allowed in the request body",
    });
    return;
  }

  const body = CreateExamDateBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const input = body.data;
  if (!validPositiveInteger(input.subjectId)) {
    res.status(400).json({ error: "subjectId must be a positive integer" });
    return;
  }

  const paperCode = input.paperCode.trim();
  if (!paperCode) {
    res.status(400).json({ error: "paperCode is required" });
    return;
  }

  const examDate = normaliseExamDate(input.date);
  if (!examDate) {
    res.status(400).json({ error: "date must be a valid date" });
    return;
  }

  const [subject] = await db
    .select({ id: subjectsTable.id })
    .from(subjectsTable)
    .where(eq(subjectsTable.id, input.subjectId));

  if (!subject) {
    res.status(400).json({ error: "Subject not found" });
    return;
  }

  const userId = req.userId!;
  const client = createUserScopedSupabaseClient(req.accessToken!);
  const { data, error } = await client
    .from("exam_dates")
    .insert({
      user_id: userId,
      subject_id: input.subjectId,
      paper_code: paperCode,
      date: examDate,
      notes: input.notes?.trim() || null,
    })
    .select(EXAM_DATE_SELECT)
    .single();

  if (error || !data) {
    sendSupabaseError(
      res,
      error ?? { code: "PGRST116" },
      "create_exam_date",
      "Exam date",
    );
    return;
  }

  const row = data as unknown as ExamDateRow;
  if (row.user_id !== userId) {
    res.status(404).json({ error: "Exam date not found" });
    return;
  }

  const [exam] = await enrichExamDateRows([row]);
  res.status(201).json(CreateExamDateResponse.parse(exam));
});

router.delete(
  "/exam-dates/:examDateId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeleteExamDateParams.safeParse(req.params);
    if (!params.success || !validPositiveInteger(params.data.examDateId)) {
      res.status(400).json({ error: "examDateId must be a positive integer" });
      return;
    }

    const userId = req.userId!;
    const client = createUserScopedSupabaseClient(req.accessToken!);
    const { data, error } = await client
      .from("exam_dates")
      .delete()
      .eq("id", params.data.examDateId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      sendSupabaseError(res, error, "delete_exam_date", "Exam date");
      return;
    }
    if (!data) {
      res.status(404).json({ error: "Exam date not found" });
      return;
    }

    res.sendStatus(204);
  },
);

export default router;
