import { Router, type IRouter } from "express";
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  subjectsTable,
  syllabusUnitsTable,
  syllabusTopicsTable,
  syllabusLearningOutcomesTable,
  assessmentComponentsTable,
  syllabusVersionsTable,
  syllabusVersionExamSeriesTable,
} from "@workspace/db";
import {
  ListSubjectsResponse,
  GetSubjectParams,
  GetSubjectResponse,
  GetSubjectSyllabusParams,
  GetSubjectSyllabusResponse,
  GetSubjectPerformanceParams,
  GetSubjectPerformanceResponse,
  ListAssessmentComponentsParams,
  ListAssessmentComponentsResponse,
  ListSubjectAssignmentSessionsResponse,
} from "@workspace/api-zod";
import { catalogueEnrichment } from "../lib/catalogue-subject";
import { optionalAuth } from "../middlewares/optional-auth";
import { requireAuth } from "../middlewares/require-auth";
import { createUserScopedSupabaseClient } from "../lib/supabase-user-client";
import {
  listCallerTopicProgress,
  progressMapFromRows,
} from "../lib/topic-progress";
import { sendSupabaseError } from "../lib/supabase-errors";
import {
  enrichPastPaperRows,
  listUserPastPaperRows,
} from "../lib/past-paper-attempts";
import { resolveReferenceSyllabusVersion } from "../lib/resolve-reference-syllabus-version";
import { countDefaultTopicsBySubjectId } from "../lib/syllabus-topic-counts";
import {
  isReferenceLookupError,
  sendReferenceLookupFailure,
  versionIdFromResolution,
} from "../lib/reference-context-http";
import { projectAssignmentSessionAvailability } from "../lib/assignment-session-availability";

const router: IRouter = Router();

/**
 * Reference columns only. Hosted DB no longer has syllabus_topics.status/notes;
 * never use an unprojected select() against this table on the live request path.
 */
const syllabusTopicReferenceColumns = {
  id: syllabusTopicsTable.id,
  unitId: syllabusTopicsTable.unitId,
  subjectId: syllabusTopicsTable.subjectId,
  title: syllabusTopicsTable.title,
  orderIndex: syllabusTopicsTable.orderIndex,
} as const;

/**
 * Shared subject catalogue — public and read-only.
 *
 * Subjects are importer/admin-managed reference data. Ordinary users must not
 * create or delete catalogue rows. List/detail catalogue enrichment remains
 * neutral for syllabusProgress until a dedicated owned-progress merge is added
 * on those endpoints; caller topic progress is merged only on the syllabus GET.
 */
router.get("/subjects", async (_req, res): Promise<void> => {
  const subjects = await db
    .select()
    .from(subjectsTable)
    .orderBy(subjectsTable.id);

  // Catalogue topicsTotal is the DEFAULT (`is_current`) graph only.
  const topicsBySubjectId = await countDefaultTopicsBySubjectId();

  const result = subjects.map((subject) =>
    catalogueEnrichment(subject, topicsBySubjectId.get(subject.id) ?? 0),
  );

  res.json(ListSubjectsResponse.parse(result));
});

/**
 * Disabled: subjects are shared reference data populated by the syllabus importer.
 * Ordinary users must not insert into the global catalogue. No admin role in Slice 2.
 */
router.post("/subjects", async (_req, res): Promise<void> => {
  res.status(403).json({
    error:
      "Subject catalogue is read-only shared reference data (importer/admin managed)",
  });
});

/**
 * Public, read-only product availability for new membership assignment.
 * The strict database resolver remains authoritative at write time.
 */
router.get(
  "/subjects/assignment-sessions",
  async (_req, res): Promise<void> => {
    const [subjects, rows] = await Promise.all([
      db
        .select({ id: subjectsTable.id })
        .from(subjectsTable)
        .orderBy(subjectsTable.id),
      db
        .select({
          subjectId: syllabusVersionsTable.subjectId,
          syllabusVersionId: syllabusVersionsTable.id,
          lifecycle: syllabusVersionsTable.lifecycle,
          applicableFromYear: syllabusVersionsTable.applicableFromYear,
          applicableFromSeries: syllabusVersionsTable.applicableFromSeries,
          applicableToYear: syllabusVersionsTable.applicableToYear,
          applicableToSeries: syllabusVersionsTable.applicableToSeries,
          series: syllabusVersionExamSeriesTable.series,
          productAutoAssign: syllabusVersionExamSeriesTable.productAutoAssign,
        })
        .from(syllabusVersionsTable)
        .innerJoin(
          syllabusVersionExamSeriesTable,
          eq(
            syllabusVersionExamSeriesTable.syllabusVersionId,
            syllabusVersionsTable.id,
          ),
        )
        .where(
          and(
            eq(syllabusVersionsTable.lifecycle, "published"),
            eq(syllabusVersionExamSeriesTable.productAutoAssign, true),
          ),
        ),
    ]);

    const result = projectAssignmentSessionAvailability(
      subjects.map(({ id }) => id),
      rows,
    );
    res.json(ListSubjectAssignmentSessionsResponse.parse(result));
  },
);

router.get("/subjects/:subjectId", async (req, res): Promise<void> => {
  const params = GetSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, params.data.subjectId));

  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  const topicsBySubjectId = await countDefaultTopicsBySubjectId();

  res.json(
    GetSubjectResponse.parse(
      catalogueEnrichment(subject, topicsBySubjectId.get(subject.id) ?? 0),
    ),
  );
});

/**
 * Disabled: subjects are shared reference data. Ordinary users must not delete
 * catalogue rows. No Drizzle delete is performed.
 */
router.delete("/subjects/:subjectId", async (_req, res): Promise<void> => {
  res.status(403).json({
    error:
      "Subject catalogue is read-only shared reference data (importer/admin managed)",
  });
});

router.get(
  "/subjects/:subjectId/syllabus",
  optionalAuth,
  async (req, res): Promise<void> => {
    const params = GetSubjectSyllabusParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    let resolution;
    try {
      resolution = await resolveReferenceSyllabusVersion(
        params.data.subjectId,
        req.userId,
      );
    } catch (error) {
      if (isReferenceLookupError(error)) {
        sendReferenceLookupFailure(res);
        return;
      }
      throw error;
    }

    const versionId = versionIdFromResolution(res, resolution);
    if (versionId === undefined) return;

    const units = versionId
      ? await db
          .select()
          .from(syllabusUnitsTable)
          .where(eq(syllabusUnitsTable.syllabusVersionId, versionId))
          .orderBy(syllabusUnitsTable.orderIndex)
      : [];

    const unitIds = units.map((u) => u.id);
    const topics = unitIds.length
      ? await db
          .select(syllabusTopicReferenceColumns)
          .from(syllabusTopicsTable)
          .where(inArray(syllabusTopicsTable.unitId, unitIds))
          .orderBy(syllabusTopicsTable.orderIndex)
      : [];

    const topicIds = topics.map((t) => t.id);
    const outcomes = topicIds.length
      ? await db
          .select()
          .from(syllabusLearningOutcomesTable)
          .where(inArray(syllabusLearningOutcomesTable.topicId, topicIds))
          .orderBy(syllabusLearningOutcomesTable.orderIndex)
      : [];

    const outcomesByTopicId = new Map<number, string[]>();
    for (const outcome of outcomes) {
      const list = outcomesByTopicId.get(outcome.topicId) ?? [];
      list.push(outcome.outcome);
      outcomesByTopicId.set(outcome.topicId, list);
    }

    let progressByTopicId = new Map<
      number,
      {
        status: "not_started" | "in_progress" | "completed";
        notes: string | null;
      }
    >();

    if (req.accessToken && topicIds.length > 0) {
      const client = createUserScopedSupabaseClient(req.accessToken);
      const { data, error } = await listCallerTopicProgress(client, topicIds);
      if (error) {
        sendSupabaseError(res, error, "subject_syllabus_topic_progress");
        return;
      }
      progressByTopicId = progressMapFromRows(data);
    }

    // Reconstruct field-by-field (never spread the DB row). Merge caller
    // topic_progress when authenticated; missing rows default to not_started / null.
    const result = units.map((unit) => ({
      ...unit,
      topics: topics
        .filter((t) => t.unitId === unit.id)
        .map((topic) => {
          const progress = progressByTopicId.get(topic.id) ?? {
            status: "not_started" as const,
            notes: null,
          };
          return {
            id: topic.id,
            unitId: topic.unitId,
            subjectId: topic.subjectId,
            title: topic.title,
            orderIndex: topic.orderIndex,
            status: progress.status,
            notes: progress.notes,
            learningOutcomes: outcomesByTopicId.get(topic.id) ?? [],
          };
        }),
    }));

    res.json(GetSubjectSyllabusResponse.parse(result));
  },
);

router.get(
  "/subjects/:subjectId/assessment-components",
  optionalAuth,
  async (req, res): Promise<void> => {
    const params = ListAssessmentComponentsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    let resolution;
    try {
      resolution = await resolveReferenceSyllabusVersion(
        params.data.subjectId,
        req.userId,
      );
    } catch (error) {
      if (isReferenceLookupError(error)) {
        sendReferenceLookupFailure(res);
        return;
      }
      throw error;
    }

    const versionId = versionIdFromResolution(res, resolution);
    if (versionId === undefined) return;

    if (!versionId) {
      res.json(ListAssessmentComponentsResponse.parse([]));
      return;
    }

    const components = await db
      .select()
      .from(assessmentComponentsTable)
      .where(eq(assessmentComponentsTable.syllabusVersionId, versionId))
      .orderBy(assessmentComponentsTable.orderIndex);

    res.json(
      ListAssessmentComponentsResponse.parse(
        components.map((c) => ({ ...c, subjectId: params.data.subjectId })),
      ),
    );
  },
);

router.get(
  "/subjects/:subjectId/performance",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetSubjectPerformanceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [subject] = await db
      .select()
      .from(subjectsTable)
      .where(eq(subjectsTable.id, params.data.subjectId));

    if (!subject) {
      res.status(404).json({ error: "Subject not found" });
      return;
    }

    const client = createUserScopedSupabaseClient(req.accessToken!);
    const { data, error } = await listUserPastPaperRows(
      client,
      req.userId!,
      subject.id,
    );
    if (error) {
      sendSupabaseError(res, error, "subject_past_paper_performance");
      return;
    }

    const attempts = await enrichPastPaperRows(data);
    const percentages = attempts.map((attempt) => attempt.percentage);
    const round = (value: number) => Math.round(value * 10) / 10;

    const componentGroups = new Map<
      string,
      {
        componentId: number | null;
        componentName: string;
        latestPercentage: number;
        attempts: number;
      }
    >();
    for (const attempt of attempts) {
      const key =
        attempt.componentId === null ? "removed" : String(attempt.componentId);
      const existing = componentGroups.get(key);
      if (existing) {
        existing.attempts += 1;
      } else {
        componentGroups.set(key, {
          componentId: attempt.componentId,
          componentName: attempt.componentName ?? "Component removed",
          latestPercentage: round(attempt.percentage),
          attempts: 1,
        });
      }
    }

    res.json(
      GetSubjectPerformanceResponse.parse({
        subjectId: subject.id,
        subjectName: subject.name,
        latestScore: attempts[0] ? round(attempts[0].percentage) : null,
        averageScore:
          percentages.length > 0
            ? round(
                percentages.reduce((sum, value) => sum + value, 0) /
                  percentages.length,
              )
            : null,
        bestScore:
          percentages.length > 0 ? round(Math.max(...percentages)) : null,
        papersCompleted: attempts.length,
        trend: attempts
          .slice()
          .reverse()
          .map((attempt) => ({
            label: `${attempt.session} ${attempt.year}`,
            percentage: round(attempt.percentage),
            session: attempt.session,
          })),
        componentBreakdown: [...componentGroups.values()],
        insight: null,
      }),
    );
  },
);

export default router;
