/**
 * Explicit supersession preparation for historical published revisions whose
 * applicability windows would overlap an authorized successor.
 *
 * Clears ONLY applicability-window fields on the named historical revision.
 * Never touches content, graph rows, membership pins, or routes.
 */
import { and, eq, sql } from "drizzle-orm";
import {
  db,
  subjectsTable,
  syllabusVersionsTable,
} from "@workspace/db";
import { SyllabusOperatorError } from "./errors.js";

export type ExamSeries = "Feb/Mar" | "May/June" | "Oct/Nov";

export type ApplicabilityWindow = {
  from: { year: number; series: ExamSeries };
  to: { year: number; series: ExamSeries };
};

export type SupersessionTarget = {
  subjectCode: string;
  historicalRevisionKey: string;
  expectedHistoricalContentSha256: string;
  successorRevisionKey: string;
  /** Planned successor applicability — used to prove overlap with historical window. */
  successorApplicability: ApplicabilityWindow;
  /**
   * When provided, must equal the current pin count for the historical revision.
   * Used to prove membership snapshot expectations without exposing user IDs.
   */
  expectedMembershipPinCount?: number;
};

export type SupersessionPlanRow = {
  subjectCode: string;
  historicalRevisionKey: string;
  successorRevisionKey: string;
  historicalVersionId: number;
  historicalLifecycle: string;
  historicalWindowNull: boolean;
  successorLifecycle: string | null;
  membershipPinCount: number;
  contentSha256: string;
  status:
    | "needs-clear"
    | "already-prepared"
    | "already-retired"
    | "dry-run-would-clear";
  plannedAction: "clear-applicability-window" | "none";
};

export type SupersessionPrepareResult = {
  operation: "dry_run" | "applied";
  targets: SupersessionPlanRow[];
};

type VersionRow = typeof syllabusVersionsTable.$inferSelect;

function windowIsNull(version: Pick<VersionRow, "applicableFromYear">): boolean {
  return version.applicableFromYear === null;
}

async function sessionOrdinal(
  year: number,
  series: ExamSeries,
): Promise<number> {
  const result = await db.execute(sql`
    SELECT public.lockdin_exam_session_ordinal(
      ${year},
      ${series}::public.exam_sitting_series
    ) AS ordinal
  `);
  const ordinal = Number((result.rows[0] as { ordinal?: number } | undefined)?.ordinal);
  if (!Number.isFinite(ordinal)) {
    throw new SyllabusOperatorError(
      "session_ordinal_failed",
      `could not resolve session ordinal for ${year} ${series}`,
    );
  }
  return ordinal;
}

async function rangesOverlap(
  historical: VersionRow,
  successor: ApplicabilityWindow,
): Promise<boolean> {
  if (windowIsNull(historical) || !historical.applicableSessionRange) {
    return false;
  }
  const from = await sessionOrdinal(successor.from.year, successor.from.series);
  const to = await sessionOrdinal(successor.to.year, successor.to.series);
  const result = await db.execute(sql`
    SELECT ${historical.applicableSessionRange}::int4range
      && int4range(${from}, ${to}, '[]') AS overlaps
  `);
  return Boolean((result.rows[0] as { overlaps?: boolean } | undefined)?.overlaps);
}

async function loadSubject(code: string) {
  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.code, code));
  if (!subject) {
    throw new SyllabusOperatorError(
      "unknown_subject",
      `subject ${code} not found`,
    );
  }
  return subject;
}

async function loadVersion(subjectId: number, logicalRevisionKey: string) {
  const [version] = await db
    .select()
    .from(syllabusVersionsTable)
    .where(
      and(
        eq(syllabusVersionsTable.subjectId, subjectId),
        eq(syllabusVersionsTable.logicalRevisionKey, logicalRevisionKey),
      ),
    );
  return version ?? null;
}

async function membershipPinCount(versionId: number): Promise<number> {
  const result = await db.execute(sql`
    SELECT count(*)::int AS n
    FROM public.user_subjects
    WHERE syllabus_version_id = ${versionId}
  `);
  return Number((result.rows[0] as { n?: number } | undefined)?.n ?? 0);
}

async function classifyTarget(
  target: SupersessionTarget,
): Promise<SupersessionPlanRow> {
  const subject = await loadSubject(target.subjectCode);
  const historical = await loadVersion(subject.id, target.historicalRevisionKey);
  if (!historical) {
    throw new SyllabusOperatorError(
      "unknown_revision",
      `historical revision ${target.historicalRevisionKey} not found`,
    );
  }

  if (historical.contentSha256 !== target.expectedHistoricalContentSha256) {
    throw new SyllabusOperatorError(
      "historical_content_hash_mismatch",
      `${target.historicalRevisionKey} content hash does not match expected frozen hash`,
    );
  }

  const successor = await loadVersion(subject.id, target.successorRevisionKey);
  if (!successor) {
    throw new SyllabusOperatorError(
      "successor_not_authorized",
      `successor ${target.successorRevisionKey} is not present; import/authorize it before supersession prepare`,
    );
  }

  const pins = await membershipPinCount(historical.id);
  if (
    target.expectedMembershipPinCount !== undefined &&
    pins !== target.expectedMembershipPinCount
  ) {
    throw new SyllabusOperatorError(
      "membership_pin_count_mismatch",
      `${target.historicalRevisionKey} pin count ${pins} != expected ${target.expectedMembershipPinCount}`,
    );
  }

  if (historical.lifecycle === "retired" && windowIsNull(historical)) {
    return {
      subjectCode: target.subjectCode,
      historicalRevisionKey: target.historicalRevisionKey,
      successorRevisionKey: target.successorRevisionKey,
      historicalVersionId: historical.id,
      historicalLifecycle: historical.lifecycle,
      historicalWindowNull: true,
      successorLifecycle: successor.lifecycle,
      membershipPinCount: pins,
      contentSha256: historical.contentSha256!,
      status: "already-retired",
      plannedAction: "none",
    };
  }

  if (historical.lifecycle !== "published") {
    throw new SyllabusOperatorError(
      "unexpected_historical_lifecycle",
      `${target.historicalRevisionKey} lifecycle is ${historical.lifecycle}; expected published (or already-retired null-window)`,
    );
  }

  if (windowIsNull(historical)) {
    return {
      subjectCode: target.subjectCode,
      historicalRevisionKey: target.historicalRevisionKey,
      successorRevisionKey: target.successorRevisionKey,
      historicalVersionId: historical.id,
      historicalLifecycle: historical.lifecycle,
      historicalWindowNull: true,
      successorLifecycle: successor.lifecycle,
      membershipPinCount: pins,
      contentSha256: historical.contentSha256!,
      status: "already-prepared",
      plannedAction: "none",
    };
  }

  const overlaps = await rangesOverlap(historical, target.successorApplicability);
  if (!overlaps) {
    throw new SyllabusOperatorError(
      "no_applicability_overlap",
      `${target.historicalRevisionKey} does not overlap planned ${target.successorRevisionKey}; refuse unrelated window clear`,
    );
  }

  return {
    subjectCode: target.subjectCode,
    historicalRevisionKey: target.historicalRevisionKey,
    successorRevisionKey: target.successorRevisionKey,
    historicalVersionId: historical.id,
    historicalLifecycle: historical.lifecycle,
    historicalWindowNull: false,
    successorLifecycle: successor.lifecycle,
    membershipPinCount: pins,
    contentSha256: historical.contentSha256!,
    status: "needs-clear",
    plannedAction: "clear-applicability-window",
  };
}

async function clearApplicabilityWindow(versionId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({
        id: syllabusVersionsTable.id,
        contentSha256: syllabusVersionsTable.contentSha256,
        lifecycle: syllabusVersionsTable.lifecycle,
        applicableFromYear: syllabusVersionsTable.applicableFromYear,
      })
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.id, versionId));
    if (!before || before.lifecycle !== "published") {
      throw new SyllabusOperatorError(
        "unexpected_historical_lifecycle",
        `version ${versionId} is not published at clear time`,
      );
    }

    await tx
      .update(syllabusVersionsTable)
      .set({
        applicableFromYear: null,
        applicableFromSeries: null,
        applicableToYear: null,
        applicableToSeries: null,
      })
      .where(eq(syllabusVersionsTable.id, versionId));

    const [after] = await tx
      .select({
        contentSha256: syllabusVersionsTable.contentSha256,
        applicableFromYear: syllabusVersionsTable.applicableFromYear,
        applicableSessionRange: syllabusVersionsTable.applicableSessionRange,
        lifecycle: syllabusVersionsTable.lifecycle,
      })
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.id, versionId));

    if (!after || after.contentSha256 !== before.contentSha256) {
      throw new SyllabusOperatorError(
        "content_hash_mutated",
        "supersession prepare must not change content hash",
      );
    }
    if (after.lifecycle !== "published") {
      throw new SyllabusOperatorError(
        "lifecycle_mutated",
        "supersession prepare must not change lifecycle",
      );
    }
    if (after.applicableFromYear !== null || after.applicableSessionRange !== null) {
      throw new SyllabusOperatorError(
        "applicability_clear_failed",
        "applicability window was not cleared",
      );
    }

    const pinCheck = await tx.execute(sql`
      SELECT count(*)::int AS n
      FROM public.user_subjects
      WHERE syllabus_version_id = ${versionId}
    `);
    // Pins must still reference this version id; count is informational.
    void pinCheck;
  });
}

export async function prepareSupersession(options: {
  targets: SupersessionTarget[];
  dryRun?: boolean;
}): Promise<SupersessionPrepareResult> {
  if (options.targets.length === 0) {
    throw new SyllabusOperatorError(
      "empty_supersession_plan",
      "at least one supersession target is required",
    );
  }

  const classified: SupersessionPlanRow[] = [];
  for (const target of options.targets) {
    classified.push(await classifyTarget(target));
  }

  if (options.dryRun) {
    return {
      operation: "dry_run",
      targets: classified.map((row) =>
        row.status === "needs-clear"
          ? { ...row, status: "dry-run-would-clear" as const }
          : row,
      ),
    };
  }

  const applied: SupersessionPlanRow[] = [];
  for (const row of classified) {
    if (row.status === "needs-clear") {
      await clearApplicabilityWindow(row.historicalVersionId);
      applied.push({
        ...row,
        historicalWindowNull: true,
        status: "already-prepared",
        plannedAction: "none",
      });
    } else {
      applied.push(row);
    }
  }

  return { operation: "applied", targets: applied };
}
