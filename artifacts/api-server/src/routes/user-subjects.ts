import { Router, type IRouter } from "express";
import { inArray } from "drizzle-orm";
import {
  db,
  subjectsTable,
  syllabusVersionsTable,
} from "@workspace/db";
import { countTopicsForSyllabusVersions } from "../lib/syllabus-topic-counts";
import {
  REFERENCE_CONTEXT_UNAVAILABLE,
} from "../lib/resolve-reference-syllabus-version";
import {
  ListCurrentUserSubjectsResponse,
  ReplaceCurrentUserSubjectsBody,
  ReplaceCurrentUserSubjectsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/require-auth";
import { createUserScopedSupabaseClient } from "../lib/supabase-user-client";
import {
  buildMembershipSessionRpcArgs,
  hasStructuredSessionInput,
  mapStoredIntendedExamSession,
} from "../lib/intended-exam-session";
import { logger } from "../lib/logger";

const router: IRouter = Router();

type MembershipRow = {
  user_id: string;
  subject_id: number;
  syllabus_version_id: number;
  intended_exam_year: number | null;
  intended_exam_series: string | null;
  created_at: string;
  updated_at: string;
};

type MembershipSubject = typeof subjectsTable.$inferSelect;
type MembershipVersion = typeof syllabusVersionsTable.$inferSelect;

export function buildMembershipResponse(
  memberships: MembershipRow[],
  subjects: MembershipSubject[],
  versions: MembershipVersion[],
  topicsBySubject: Map<number, number>,
) {
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const versionById = new Map(versions.map((version) => [version.id, version]));

  return memberships.map((membership) => {
    const subject = subjectById.get(membership.subject_id);
    const version = versionById.get(membership.syllabus_version_id);
    if (!subject || !version || version.subjectId !== membership.subject_id) {
      throw new Error("Membership reference data is inconsistent");
    }
    return {
      subject: {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        color: subject.color,
        topicsTotal: topicsBySubject.get(subject.id) ?? 0,
      },
      syllabusVersion: {
        id: version.id,
        label: version.label,
        examBoard: version.examBoard,
        qualification: version.qualification,
      },
      intendedExamSession: mapStoredIntendedExamSession(
        membership.intended_exam_year,
        membership.intended_exam_series,
      ),
      createdAt: membership.created_at,
      updatedAt: membership.updated_at,
    };
  });
}

class MembershipPinInvariantError extends Error {
  constructor() {
    super(REFERENCE_CONTEXT_UNAVAILABLE);
    this.name = "MembershipPinInvariantError";
  }
}

const MEMBERSHIP_SELECT =
  "user_id, subject_id, syllabus_version_id, intended_exam_year, intended_exam_series, created_at, updated_at";

function hasForbiddenMembershipField(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  return [
    "userId",
    "user_id",
    "ownerId",
    "owner_id",
    "syllabusVersionId",
    "syllabus_version_id",
  ].some((key) => Object.prototype.hasOwnProperty.call(body, key));
}

async function listMemberships(
  client: ReturnType<typeof createUserScopedSupabaseClient>,
  userId: string,
) {
  const { data, error } = await client
    .from("user_subjects")
    .select(MEMBERSHIP_SELECT)
    .eq("user_id", userId)
    .order("subject_id");

  if (error) throw error;
  const memberships = (data ?? []) as MembershipRow[];
  if (memberships.length === 0) return [];

  const subjectIds = memberships.map((row) => row.subject_id);
  const versionIds = memberships.map((row) => row.syllabus_version_id);
  const [subjects, versions, versionTopicCounts] = await Promise.all([
    db
      .select()
      .from(subjectsTable)
      .where(inArray(subjectsTable.id, subjectIds)),
    db
      .select()
      .from(syllabusVersionsTable)
      .where(inArray(syllabusVersionsTable.id, versionIds)),
    countTopicsForSyllabusVersions(versionIds),
  ]);

  const topicsBySubject = new Map<number, number>();
  for (const membership of memberships) {
    const version = versions.find(
      (row) => row.id === membership.syllabus_version_id,
    );
    if (
      !version ||
      version.subjectId !== membership.subject_id ||
      version.lifecycle === "draft"
    ) {
      throw new MembershipPinInvariantError();
    }
    topicsBySubject.set(
      membership.subject_id,
      versionTopicCounts.get(membership.syllabus_version_id) ?? 0,
    );
  }

  return buildMembershipResponse(
    memberships,
    subjects,
    versions,
    topicsBySubject,
  );
}

router.get("/user-subjects", requireAuth, async (req, res): Promise<void> => {
  const client = createUserScopedSupabaseClient(req.accessToken!);
  try {
    const memberships = await listMemberships(client, req.userId!);
    res.json(ListCurrentUserSubjectsResponse.parse(memberships));
  } catch (error) {
    if (error instanceof MembershipPinInvariantError) {
      res.status(409).json({ error: REFERENCE_CONTEXT_UNAVAILABLE });
      return;
    }
    logger.error({ context: "list_user_subjects" }, "membership fetch failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/user-subjects", requireAuth, async (req, res): Promise<void> => {
  if (hasForbiddenMembershipField(req.body)) {
    res.status(400).json({ error: "One or more fields are not allowed" });
    return;
  }

  const body = ReplaceCurrentUserSubjectsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid subject selection" });
    return;
  }

  const subjectIds = body.data.subjectIds;
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
    res.status(400).json({ error: "Invalid subject selection" });
    return;
  }

  const client = createUserScopedSupabaseClient(req.accessToken!);
  const replaceParams = {
    p_subject_ids: subjectIds,
    ...(hasStructuredSessionInput(
      body.data.intendedExamSession,
      body.data.subjectSessionOverrides,
    )
      ? sessionArgs.args
      : {}),
  };
  const { error } = await client.rpc(
    "lockdin_replace_user_subjects",
    replaceParams,
  );

  if (error) {
    const message = error.message ?? "";
    if (
      error.code === "22023" ||
      message.includes("invalid_subject_selection")
    ) {
      res.status(400).json({ error: "Invalid subject selection" });
      return;
    }
    if (error.code === "42501" || message.includes("authentication_required")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    logger.error(
      { context: "replace_user_subjects", supabaseCode: error.code },
      "membership replacement failed",
    );
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  try {
    const memberships = await listMemberships(client, req.userId!);
    res.json(ReplaceCurrentUserSubjectsResponse.parse(memberships));
  } catch (error) {
    if (error instanceof MembershipPinInvariantError) {
      res.status(409).json({ error: REFERENCE_CONTEXT_UNAVAILABLE });
      return;
    }
    logger.error(
      { context: "replace_user_subjects_readback" },
      "membership readback failed",
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
