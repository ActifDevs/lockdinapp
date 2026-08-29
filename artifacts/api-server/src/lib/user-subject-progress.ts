import { inArray } from "drizzle-orm";
import { db, subjectsTable, syllabusVersionsTable } from "@workspace/db";
import { listTopicIdsForSyllabusVersions } from "./syllabus-topic-counts";
import { REFERENCE_CONTEXT_UNAVAILABLE } from "./resolve-reference-syllabus-version";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import {
  computeSyllabusProgressPercent,
  listCallerTopicProgress,
  type TopicProgressRow,
} from "./topic-progress";

type MembershipRow = {
  subject_id: number;
  syllabus_version_id: number;
};

type SubjectReferenceRow = {
  id: number;
  name: string;
  color: string;
};

type TopicReferenceRow = {
  id: number;
  subjectId: number;
};

export type UserSubjectProgressItem = {
  subjectId: number;
  subjectName: string;
  subjectColor: string;
  syllabusProgress: number;
};

export type UserSubjectProgressSummary = {
  syllabusCompletion: UserSubjectProgressItem[];
  overallSyllabusProgress: number;
};

type SupabaseError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  status?: number;
};

export type UserSubjectProgressResult =
  | { data: UserSubjectProgressSummary; error: null; context: null }
  | { data: null; error: SupabaseError; context: string };

export const PIN_INVARIANT_PROGRESS_ERROR: SupabaseError = {
  code: "PIN_INVARIANT",
  message: REFERENCE_CONTEXT_UNAVAILABLE,
  status: 409,
};

/** Pure aggregation shared by the API routes and unit tests. */
export function aggregateUserSubjectProgress(
  enrolledSubjectIds: number[],
  subjects: SubjectReferenceRow[],
  topics: TopicReferenceRow[],
  progressRows: TopicProgressRow[],
): UserSubjectProgressSummary {
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const topicsBySubject = new Map<number, number[]>();
  for (const topic of topics) {
    const subjectTopics = topicsBySubject.get(topic.subjectId) ?? [];
    subjectTopics.push(topic.id);
    topicsBySubject.set(topic.subjectId, subjectTopics);
  }

  const completedTopicIds = new Set(
    progressRows
      .filter((row) => row.status === "completed")
      .map((row) => row.topic_id),
  );
  let enrolledTopicTotal = 0;
  let enrolledTopicCompleted = 0;

  const syllabusCompletion = enrolledSubjectIds.flatMap((subjectId) => {
    const subject = subjectById.get(subjectId);
    if (!subject) {
      logger.error(
        { context: "user_subject_progress", subjectId },
        "enrolled subject missing from catalogue",
      );
      return [];
    }

    const subjectTopicIds = topicsBySubject.get(subjectId) ?? [];
    const completed = subjectTopicIds.filter((id) =>
      completedTopicIds.has(id),
    ).length;
    enrolledTopicTotal += subjectTopicIds.length;
    enrolledTopicCompleted += completed;

    return [
      {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectColor: subject.color,
        syllabusProgress: computeSyllabusProgressPercent(
          subjectTopicIds.length,
          completed,
        ),
      },
    ];
  });

  return {
    syllabusCompletion,
    overallSyllabusProgress: computeSyllabusProgressPercent(
      enrolledTopicTotal,
      enrolledTopicCompleted,
    ),
  };
}

/** Read the caller's memberships/progress while using Drizzle only for shared metadata. */
export async function getUserSubjectProgress(
  client: SupabaseClient,
  userId: string,
): Promise<UserSubjectProgressResult> {
  const { data: membershipData, error: membershipError } = await client
    .from("user_subjects")
    .select("subject_id, syllabus_version_id")
    .eq("user_id", userId)
    .order("subject_id");

  if (membershipError) {
    return { data: null, error: membershipError, context: "user_subjects" };
  }

  const memberships = (membershipData ?? []) as MembershipRow[];
  const enrolledSubjectIds = memberships.map((row) => row.subject_id);
  if (enrolledSubjectIds.length === 0) {
    return {
      data: { syllabusCompletion: [], overallSyllabusProgress: 0 },
      error: null,
      context: null,
    };
  }

  const versionIds = memberships.map((row) => row.syllabus_version_id);
  const [subjects, versions, topics] = await Promise.all([
    db
      .select({
        id: subjectsTable.id,
        name: subjectsTable.name,
        color: subjectsTable.color,
      })
      .from(subjectsTable)
      .where(inArray(subjectsTable.id, enrolledSubjectIds)),
    db
      .select({
        id: syllabusVersionsTable.id,
        subjectId: syllabusVersionsTable.subjectId,
        lifecycle: syllabusVersionsTable.lifecycle,
      })
      .from(syllabusVersionsTable)
      .where(inArray(syllabusVersionsTable.id, versionIds)),
    listTopicIdsForSyllabusVersions(versionIds),
  ]);

  const versionById = new Map(versions.map((version) => [version.id, version]));
  for (const membership of memberships) {
    const version = versionById.get(membership.syllabus_version_id);
    if (
      !version ||
      version.subjectId !== membership.subject_id ||
      version.lifecycle === "draft"
    ) {
      return {
        data: null,
        error: PIN_INVARIANT_PROGRESS_ERROR,
        context: "syllabus_pin",
      };
    }
  }

  const { data: progressRows, error: progressError } =
    await listCallerTopicProgress(
      client,
      topics.map((topic) => topic.id),
    );
  if (progressError) {
    return { data: null, error: progressError, context: "topic_progress" };
  }

  return {
    data: aggregateUserSubjectProgress(
      enrolledSubjectIds,
      subjects,
      topics,
      progressRows,
    ),
    error: null,
    context: null,
  };
}
