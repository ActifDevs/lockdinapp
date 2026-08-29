import { eq } from "drizzle-orm";
import {
  assessmentComponentsTable,
  db,
  syllabusTopicsTable,
  syllabusUnitsTable,
} from "@workspace/db";
import {
  REFERENCE_CONTEXT_UNAVAILABLE,
  ReferenceContextLookupError,
  resolveMembershipPin,
} from "./resolve-reference-syllabus-version";

export type PinWriteFailure = {
  ok: false;
  status: 400 | 404 | 409 | 500;
  error: string;
};

export type PinWriteResult = { ok: true } | PinWriteFailure;

function lookupFailure(): PinWriteFailure {
  return { ok: false, status: 500, error: "Internal server error" };
}

function invariantFailure(): PinWriteFailure {
  return { ok: false, status: 409, error: REFERENCE_CONTEXT_UNAVAILABLE };
}

function invalidReference(): PinWriteFailure {
  return { ok: false, status: 400, error: "Invalid request" };
}

export async function loadTopicVersionContext(topicId: number): Promise<{
  topicId: number;
  subjectId: number;
  syllabusVersionId: number;
} | null> {
  const [row] = await db
    .select({
      topicId: syllabusTopicsTable.id,
      subjectId: syllabusTopicsTable.subjectId,
      syllabusVersionId: syllabusUnitsTable.syllabusVersionId,
    })
    .from(syllabusTopicsTable)
    .innerJoin(
      syllabusUnitsTable,
      eq(syllabusTopicsTable.unitId, syllabusUnitsTable.id),
    )
    .where(eq(syllabusTopicsTable.id, topicId))
    .limit(1);
  return row ?? null;
}

async function requirePinForSubject(
  userId: string,
  subjectId: number,
): Promise<PinWriteResult & { versionId?: number }> {
  try {
    const resolution = await resolveMembershipPin(userId, subjectId);
    if (resolution.kind === "none") return invalidReference();
    if (resolution.kind === "invariant") return invariantFailure();
    return { ok: true, versionId: resolution.versionId };
  } catch (error) {
    if (error instanceof ReferenceContextLookupError) return lookupFailure();
    throw error;
  }
}

/** Progress / task topic must sit on the caller's current pin for that subject. */
export async function assertTopicOnCallerPin(
  userId: string,
  topicId: number,
  expectedSubjectId?: number,
): Promise<PinWriteResult> {
  try {
    const topic = await loadTopicVersionContext(topicId);
    if (!topic) {
      return { ok: false, status: 404, error: "Topic not found" };
    }
    if (
      expectedSubjectId !== undefined &&
      topic.subjectId !== expectedSubjectId
    ) {
      return invalidReference();
    }

    const pin = await requirePinForSubject(userId, topic.subjectId);
    if (!pin.ok) return pin;
    if (topic.syllabusVersionId !== pin.versionId) return invalidReference();
    return { ok: true };
  } catch (error) {
    if (error instanceof ReferenceContextLookupError) return lookupFailure();
    throw error;
  }
}

export async function assertComponentOnCallerPin(
  userId: string,
  subjectId: number,
  componentId: number,
): Promise<PinWriteResult> {
  try {
    const [component] = await db
      .select({
        id: assessmentComponentsTable.id,
        syllabusVersionId: assessmentComponentsTable.syllabusVersionId,
      })
      .from(assessmentComponentsTable)
      .where(eq(assessmentComponentsTable.id, componentId))
      .limit(1);

    if (!component) {
      return { ok: false, status: 400, error: "Assessment component not found" };
    }

    const pin = await requirePinForSubject(userId, subjectId);
    if (!pin.ok) return pin;
    if (component.syllabusVersionId !== pin.versionId) return invalidReference();
    return { ok: true };
  } catch (error) {
    if (error instanceof ReferenceContextLookupError) return lookupFailure();
    throw error;
  }
}
