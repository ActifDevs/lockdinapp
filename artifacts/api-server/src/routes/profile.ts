import { Router, type IRouter } from "express";
import {
  GetCurrentProfileResponse,
  UpdateCurrentProfileBody,
  UpdateCurrentProfileResponse,
  CompleteCurrentUserOnboardingBody,
  CompleteCurrentUserOnboardingResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { createUserScopedSupabaseClient } from "../lib/supabase-user-client";
import {
  buildMembershipSessionRpcArgs,
  hasStructuredSessionInput,
} from "../lib/intended-exam-session";
import { logger } from "../lib/logger";

const router: IRouter = Router();

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  level: string | null;
  exam_session: string | null;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
};

const PROFILE_SELECT =
  "id, full_name, username, level, exam_session, onboarded_at, created_at, updated_at";

function mapProfile(row: ProfileRow) {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    level: row.level,
    examSession: row.exam_session,
    onboardedAt: row.onboarded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const FORBIDDEN_PROFILE_KEYS = [
  "id",
  "userId",
  "user_id",
  "email",
  "username",
  "onboardedAt",
  "onboarded_at",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
] as const;

function hasForbiddenKey(body: unknown, keys: readonly string[]): boolean {
  if (!body || typeof body !== "object") return false;
  return keys.some((key) => Object.prototype.hasOwnProperty.call(body, key));
}

function trimRequired(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) return null;
  return trimmed;
}

router.get("/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const client = createUserScopedSupabaseClient(req.accessToken!);

  const { data, error } = await client
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logger.error({ context: "get_profile", supabaseCode: error.code }, "profile fetch failed");
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  if (!data) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(GetCurrentProfileResponse.parse(mapProfile(data as ProfileRow)));
});

router.patch("/profile", requireAuth, async (req, res): Promise<void> => {
  if (hasForbiddenKey(req.body, FORBIDDEN_PROFILE_KEYS)) {
    res.status(400).json({ error: "One or more fields are not allowed" });
    return;
  }

  const body = UpdateCurrentProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const updateData: Record<string, string> = {};

  if (body.data.fullName !== undefined) {
    const fullName = trimRequired(body.data.fullName, 2, 100);
    if (!fullName) {
      res.status(400).json({ error: "Invalid full name" });
      return;
    }
    updateData.full_name = fullName;
  }

  if (body.data.level !== undefined) {
    const level = trimRequired(body.data.level, 1, 80);
    if (!level) {
      res.status(400).json({ error: "Invalid level" });
      return;
    }
    updateData.level = level;
  }

  if (body.data.examSession !== undefined) {
    const examSession = trimRequired(body.data.examSession, 1, 80);
    if (!examSession) {
      res.status(400).json({ error: "Invalid exam session" });
      return;
    }
    updateData.exam_session = examSession;
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "At least one field is required" });
    return;
  }

  const userId = req.userId!;
  const client = createUserScopedSupabaseClient(req.accessToken!);

  const { data, error } = await client
    .from("profiles")
    .update(updateData)
    .eq("id", userId)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error) {
    logger.error({ context: "patch_profile", supabaseCode: error.code }, "profile update failed");
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  if (!data) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json(UpdateCurrentProfileResponse.parse(mapProfile(data as ProfileRow)));
});

router.post("/profile/complete-onboarding", requireAuth, async (req, res): Promise<void> => {
  if (
    hasForbiddenKey(req.body, [
      "id",
      "userId",
      "user_id",
      "onboardedAt",
      "onboarded_at",
      "email",
      "syllabusVersionId",
      "syllabus_version_id",
    ])
  ) {
    res.status(400).json({ error: "One or more fields are not allowed" });
    return;
  }

  // Normalise username before schema parse so clients may send mixed case.
  const incoming =
    req.body && typeof req.body === "object"
      ? {
          ...req.body,
          username:
            typeof (req.body as { username?: unknown }).username === "string"
              ? (req.body as { username: string }).username.trim().toLowerCase()
              : (req.body as { username?: unknown }).username,
        }
      : req.body;

  const body = CompleteCurrentUserOnboardingBody.safeParse(incoming);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const fullName = trimRequired(body.data.fullName, 2, 100);
  const usernameRaw = body.data.username.trim().toLowerCase();
  const level = trimRequired(body.data.level, 1, 80);
  const examSession = trimRequired(body.data.examSession, 1, 80);
  const subjectIds = body.data.subjectIds;

  if (!fullName) {
    res.status(400).json({ error: "Invalid full name" });
    return;
  }
  if (!/^[a-z0-9_]{3,24}$/.test(usernameRaw)) {
    res.status(400).json({ error: "Invalid username" });
    return;
  }
  if (!level) {
    res.status(400).json({ error: "Invalid level" });
    return;
  }
  if (!examSession) {
    res.status(400).json({ error: "Invalid exam session" });
    return;
  }
  if (
    !Array.isArray(subjectIds) ||
    subjectIds.length < 1 ||
    subjectIds.length > 5 ||
    new Set(subjectIds).size !== subjectIds.length ||
    subjectIds.some((id) => !Number.isInteger(id) || id < 1)
  ) {
    res.status(400).json({ error: "Invalid subject selection" });
    return;
  }

  const sessionArgs = buildMembershipSessionRpcArgs(
    subjectIds,
    body.data.intendedExamSession,
    body.data.subjectSessionOverrides,
  );
  if (!sessionArgs.ok) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const client = createUserScopedSupabaseClient(req.accessToken!);
  const onboardingParams = {
    p_full_name: fullName,
    p_username: usernameRaw,
    p_level: level,
    p_exam_session: examSession,
    p_subject_ids: subjectIds,
    ...(hasStructuredSessionInput(
      body.data.intendedExamSession,
      body.data.subjectSessionOverrides,
    )
      ? sessionArgs.args
      : {}),
  };
  const { data, error } = await client.rpc(
    "lockdin_complete_onboarding",
    onboardingParams,
  );

  if (error) {
    const message = error.message ?? "";
    const code = error.code ?? "";

    if (code === "23505" || message.includes("username_unavailable")) {
      res.status(409).json({ error: "Username is unavailable." });
      return;
    }
    if (message.includes("onboarding_already_completed")) {
      res.status(409).json({ error: "Onboarding has already been completed." });
      return;
    }
    if (
      code === "22023" ||
      message.includes("invalid_") ||
      message.includes("authentication_required")
    ) {
      if (message.includes("authentication_required") || code === "42501") {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    logger.error(
      { context: "complete_onboarding", supabaseCode: error.code },
      "onboarding RPC failed",
    );
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  if (!data) {
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  res.json(
    CompleteCurrentUserOnboardingResponse.parse(mapProfile(data as ProfileRow)),
  );
});

export default router;
