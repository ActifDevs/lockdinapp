import { Router, type IRouter } from "express";
import {
  UpdateSyllabusTopicParams,
  UpdateSyllabusTopicBody,
  UpdateSyllabusTopicResponse,
  ResetSyllabusTopicProgressParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { createUserScopedSupabaseClient } from "../lib/supabase-user-client";
import {
  hasOwnershipField,
  normalizeTopicNotes,
} from "../lib/topic-progress";
import { logger } from "../lib/logger";
import { assertTopicOnCallerPin } from "../lib/pin-reference-writes";

const router: IRouter = Router();

type UpsertRow = {
  topic_id: number;
  status: "not_started" | "in_progress" | "completed";
  notes: string | null;
};

function mapRpcFailure(
  error: { code?: string; message?: string },
): { status: 400 | 401 | 404 | 500; error: string } {
  const message = error.message ?? "";
  if (error.code === "42501" || message.includes("authentication_required")) {
    return { status: 401, error: "Unauthorized" };
  }
  if (message.includes("topic_not_found")) {
    return { status: 404, error: "Topic not found" };
  }
  if (
    error.code === "22023" ||
    message.includes("invalid_topic_id") ||
    message.includes("invalid_topic_status") ||
    message.includes("invalid_topic_notes")
  ) {
    return { status: 400, error: "Invalid request" };
  }
  return { status: 500, error: "Internal server error" };
}

/**
 * Authenticated upsert of the caller's topic_progress.
 * Shared syllabus_topics rows are never mutated.
 */
router.patch("/syllabus-topics/:topicId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateSyllabusTopicParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  if (hasOwnershipField(req.body)) {
    res.status(400).json({ error: "One or more fields are not allowed" });
    return;
  }

  const body = UpdateSyllabusTopicBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const notes = normalizeTopicNotes(body.data.notes);
  const pinCheck = await assertTopicOnCallerPin(
    req.userId!,
    params.data.topicId,
  );
  if (!pinCheck.ok) {
    res.status(pinCheck.status).json({ error: pinCheck.error });
    return;
  }

  const client = createUserScopedSupabaseClient(req.accessToken!);
  const { data, error } = await client.rpc("lockdin_upsert_topic_progress", {
    p_topic_id: params.data.topicId,
    p_status: body.data.status,
    p_notes: notes,
  });

  if (error) {
    const mapped = mapRpcFailure(error);
    if (mapped.status === 500) {
      logger.error(
        { context: "upsert_topic_progress", supabaseCode: error.code },
        "topic progress upsert failed",
      );
    }
    res.status(mapped.status).json({ error: mapped.error });
    return;
  }

  const rows = (data ?? []) as UpsertRow[];
  const row = rows[0];
  const response = row
    ? {
        topicId: row.topic_id,
        status: row.status,
        notes: row.notes,
      }
    : {
        topicId: params.data.topicId,
        status: "not_started" as const,
        notes: null,
      };

  res.json(UpdateSyllabusTopicResponse.parse(response));
});

/**
 * Authenticated reset: delete only the caller's progress row for the topic.
 */
router.delete("/syllabus-topics/:topicId", requireAuth, async (req, res): Promise<void> => {
  const params = ResetSyllabusTopicProgressParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const pinCheck = await assertTopicOnCallerPin(
    req.userId!,
    params.data.topicId,
  );
  if (!pinCheck.ok) {
    res.status(pinCheck.status).json({ error: pinCheck.error });
    return;
  }

  const client = createUserScopedSupabaseClient(req.accessToken!);
  const { error } = await client.rpc("lockdin_reset_topic_progress", {
    p_topic_id: params.data.topicId,
  });

  if (error) {
    const mapped = mapRpcFailure(error);
    if (mapped.status === 500) {
      logger.error(
        { context: "reset_topic_progress", supabaseCode: error.code },
        "topic progress reset failed",
      );
    }
    res.status(mapped.status).json({ error: mapped.error });
    return;
  }

  res.status(204).send();
});

export default router;
