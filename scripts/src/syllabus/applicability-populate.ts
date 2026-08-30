import { and, eq, sql } from "drizzle-orm";
import {
  db,
  subjectsTable,
  syllabusVersionExamSeriesTable,
  syllabusVersionsTable,
} from "@workspace/db";
import { SyllabusOperatorError } from "./errors.js";
import {
  EXAM_SITTING_SERIES,
  type ApplicabilityManifest,
  type ApplicabilityManifestEntry,
  windowIsNull,
  windowsEqual,
} from "./applicability-manifest.js";

export type ApplicabilityPopulateOperation =
  | "populated"
  | "already-applied"
  | "validated";

export type ApplicabilityPopulateResult = {
  operation: ApplicabilityPopulateOperation;
  targets: Array<{
    subjectCode: string;
    logicalRevisionKey: string;
    versionId: number;
    status: "populated" | "already-applied" | "validated";
  }>;
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type VersionRow = typeof syllabusVersionsTable.$inferSelect;

async function lockAndLoadTarget(
  tx: Tx,
  entry: ApplicabilityManifestEntry,
): Promise<{ subjectId: number; version: VersionRow }> {
  const subjects = await tx
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.code, entry.subjectCode));
  if (subjects.length !== 1) {
    throw new SyllabusOperatorError(
      "ambiguous_applicability_target",
      `subject ${entry.subjectCode} must exist exactly once`,
    );
  }
  const subject = subjects[0]!;
  await tx.execute(sql`SELECT pg_advisory_xact_lock(872315, ${subject.id})`);

  const versions = await tx
    .select()
    .from(syllabusVersionsTable)
    .where(
      and(
        eq(syllabusVersionsTable.subjectId, subject.id),
        eq(syllabusVersionsTable.logicalRevisionKey, entry.logicalRevisionKey),
      ),
    );
  if (versions.length !== 1) {
    throw new SyllabusOperatorError(
      "ambiguous_applicability_target",
      `${entry.logicalRevisionKey} must exist exactly once for ${entry.subjectCode}`,
    );
  }
  const version = versions[0]!;
  if (version.subjectId !== subject.id) {
    throw new SyllabusOperatorError(
      "applicability_target_mismatch",
      `${entry.logicalRevisionKey} is not owned by ${entry.subjectCode}`,
    );
  }
  if (version.lifecycle !== "published" && version.lifecycle !== "draft") {
    throw new SyllabusOperatorError(
      "applicability_requires_published",
      `${entry.logicalRevisionKey} must be draft or published`,
    );
  }
  if (version.contentSha256 !== entry.expectedContentSha256) {
    throw new SyllabusOperatorError(
      "published_identity_mismatch",
      `${entry.logicalRevisionKey} content_sha256 does not match the researched snapshot`,
    );
  }
  return { subjectId: subject.id, version };
}

async function loadPolicy(
  tx: Tx,
  versionId: number,
): Promise<Array<{ series: string; productAutoAssign: boolean }>> {
  return tx
    .select({
      series: syllabusVersionExamSeriesTable.series,
      productAutoAssign: syllabusVersionExamSeriesTable.productAutoAssign,
    })
    .from(syllabusVersionExamSeriesTable)
    .where(eq(syllabusVersionExamSeriesTable.syllabusVersionId, versionId));
}

function policyMatchesDesired(
  rows: Array<{ series: string; productAutoAssign: boolean }>,
  desired: ApplicabilityManifestEntry["seriesPolicy"],
): boolean {
  if (rows.length !== 3) return false;
  return EXAM_SITTING_SERIES.every((series) => {
    const row = rows.find((item) => item.series === series);
    return row?.productAutoAssign === desired[series];
  });
}

async function assertNoOverlap(
  tx: Tx,
  subjectId: number,
  versionId: number,
  entry: ApplicabilityManifestEntry,
): Promise<void> {
  const conflicts = await tx.execute(sql`
    SELECT other.id
    FROM public.syllabus_versions AS other
    WHERE other.subject_id = ${subjectId}
      AND other.id <> ${versionId}
      AND other.lifecycle = 'published'
      AND other.applicable_session_range IS NOT NULL
      AND other.applicable_session_range && int4range(
        public.lockdin_exam_session_ordinal(
          ${entry.applicability.from.year},
          ${entry.applicability.from.series}::public.exam_sitting_series
        ),
        public.lockdin_exam_session_ordinal(
          ${entry.applicability.to.year},
          ${entry.applicability.to.series}::public.exam_sitting_series
        ),
        '[]'
      )
  `);
  if ((conflicts.rows?.length ?? 0) > 0) {
    throw new SyllabusOperatorError(
      "applicability_window_overlap",
      `${entry.logicalRevisionKey} would overlap another published applicability window`,
    );
  }
}

async function classifyTarget(
  tx: Tx,
  entry: ApplicabilityManifestEntry,
): Promise<{
  version: VersionRow;
  status: "needs-write" | "already-applied";
}> {
  const { subjectId, version } = await lockAndLoadTarget(tx, entry);
  const policy = await loadPolicy(tx, version.id);
  const desiredWindow = windowsEqual(version, entry.applicability);
  const nullWindow = windowIsNull(version);
  const desiredPolicy = policyMatchesDesired(policy, entry.seriesPolicy);
  const emptyPolicy = policy.length === 0;

  if (desiredWindow && desiredPolicy) {
    return { version, status: "already-applied" };
  }

  if (
    (nullWindow || desiredWindow) &&
    (emptyPolicy || desiredPolicy) &&
    !(desiredWindow && desiredPolicy)
  ) {
    if (!nullWindow && !desiredWindow) {
      throw new SyllabusOperatorError(
        "applicability_conflict",
        `${entry.logicalRevisionKey} has conflicting applicability metadata`,
      );
    }
    if (!emptyPolicy && !desiredPolicy) {
      throw new SyllabusOperatorError(
        "series_policy_conflict",
        `${entry.logicalRevisionKey} has conflicting series policy rows`,
      );
    }
    await assertNoOverlap(tx, subjectId, version.id, entry);
    return { version, status: "needs-write" };
  }

  if (!nullWindow && !desiredWindow) {
    throw new SyllabusOperatorError(
      "applicability_conflict",
      `${entry.logicalRevisionKey} has conflicting applicability metadata`,
    );
  }
  throw new SyllabusOperatorError(
    "series_policy_conflict",
    `${entry.logicalRevisionKey} has conflicting series policy rows`,
  );
}

async function writeTarget(
  tx: Tx,
  entry: ApplicabilityManifestEntry,
  versionId: number,
): Promise<void> {
  await tx
    .update(syllabusVersionsTable)
    .set({
      applicableFromYear: entry.applicability.from.year,
      applicableFromSeries: entry.applicability.from.series,
      applicableToYear: entry.applicability.to.year,
      applicableToSeries: entry.applicability.to.series,
    })
    .where(eq(syllabusVersionsTable.id, versionId));

  const [written] = await tx
    .select({
      applicableFromYear: syllabusVersionsTable.applicableFromYear,
      applicableFromSeries: syllabusVersionsTable.applicableFromSeries,
      applicableToYear: syllabusVersionsTable.applicableToYear,
      applicableToSeries: syllabusVersionsTable.applicableToSeries,
      applicableSessionRange: syllabusVersionsTable.applicableSessionRange,
    })
    .from(syllabusVersionsTable)
    .where(eq(syllabusVersionsTable.id, versionId));
  if (!written || !windowsEqual(written, entry.applicability)) {
    throw new SyllabusOperatorError(
      "applicability_write_failed",
      `${entry.logicalRevisionKey} applicability was not stored`,
    );
  }
  if (!written.applicableSessionRange) {
    throw new SyllabusOperatorError(
      "applicability_range_missing",
      `${entry.logicalRevisionKey} generated session range is missing`,
    );
  }

  const rangeCheck = await tx.execute(sql`
    SELECT
      ${written.applicableSessionRange}::int4range
      = int4range(
        public.lockdin_exam_session_ordinal(
          ${entry.applicability.from.year},
          ${entry.applicability.from.series}::public.exam_sitting_series
        ),
        public.lockdin_exam_session_ordinal(
          ${entry.applicability.to.year},
          ${entry.applicability.to.series}::public.exam_sitting_series
        ),
        '[]'
      ) AS matches
  `);
  const matches = (rangeCheck.rows[0] as { matches?: boolean } | undefined)
    ?.matches;
  if (!matches) {
    throw new SyllabusOperatorError(
      "applicability_range_mismatch",
      `${entry.logicalRevisionKey} generated session range does not match the inclusive window`,
    );
  }

  for (const series of EXAM_SITTING_SERIES) {
    await tx
      .insert(syllabusVersionExamSeriesTable)
      .values({
        syllabusVersionId: versionId,
        series,
        productAutoAssign: entry.seriesPolicy[series],
      })
      .onConflictDoNothing();
  }

  const policy = await loadPolicy(tx, versionId);
  if (!policyMatchesDesired(policy, entry.seriesPolicy)) {
    throw new SyllabusOperatorError(
      "series_policy_conflict",
      `${entry.logicalRevisionKey} series policy is incomplete or conflicting after write`,
    );
  }
}

export async function validateApplicabilityPopulation(
  manifest: ApplicabilityManifest,
): Promise<ApplicabilityPopulateResult> {
  return db.transaction(async (tx) => {
    const targets = [];
    for (const entry of manifest.versions) {
      const classified = await classifyTarget(tx, entry);
      targets.push({
        subjectCode: entry.subjectCode,
        logicalRevisionKey: entry.logicalRevisionKey,
        versionId: classified.version.id,
        status: "validated" as const,
      });
    }
    return { operation: "validated" as const, targets };
  });
}

export async function applyApplicabilityPopulation(
  manifest: ApplicabilityManifest,
): Promise<ApplicabilityPopulateResult> {
  return db.transaction(async (tx) => {
    const classified = [];
    for (const entry of manifest.versions) {
      classified.push({
        entry,
        result: await classifyTarget(tx, entry),
      });
    }

    const targets = [];
    let wrote = false;
    for (const item of classified) {
      if (item.result.status === "needs-write") {
        await writeTarget(tx, item.entry, item.result.version.id);
        wrote = true;
        targets.push({
          subjectCode: item.entry.subjectCode,
          logicalRevisionKey: item.entry.logicalRevisionKey,
          versionId: item.result.version.id,
          status: "populated" as const,
        });
      } else {
        targets.push({
          subjectCode: item.entry.subjectCode,
          logicalRevisionKey: item.entry.logicalRevisionKey,
          versionId: item.result.version.id,
          status: "already-applied" as const,
        });
      }
    }

    return {
      operation: wrote ? "populated" : "already-applied",
      targets,
    };
  });
}

