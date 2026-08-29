import { and, eq, sql } from "drizzle-orm";
import { db, subjectsTable, syllabusVersionsTable } from "@workspace/db";
import { SyllabusOperatorError } from "./errors.js";
import { loadCanonicalGraphForVersion } from "./db-graph.js";

export type PublishResult = {
  operation: "published";
  versionId: number;
  logicalRevisionKey: string;
  isCurrent: boolean;
  retiredRevisionKey: string | null;
};

function windowIsNull(version: {
  applicableFromYear: number | null;
}): boolean {
  return version.applicableFromYear === null;
}

export async function publishSyllabusRevision(options: {
  subjectCode: string;
  logicalRevisionKey: string;
  makeDefault: boolean;
  retireRevisionKey?: string;
}): Promise<PublishResult> {
  const logicalRevisionKey = options.logicalRevisionKey.trim();
  if (!logicalRevisionKey) {
    throw new SyllabusOperatorError(
      "missing_logical_revision_key",
      "logical revision key is required to publish",
    );
  }

  return db.transaction(async (tx) => {
    const [subject] = await tx
      .select()
      .from(subjectsTable)
      .where(eq(subjectsTable.code, options.subjectCode));
    if (!subject) {
      throw new SyllabusOperatorError(
        "missing_logical_revision_key",
        `subject ${options.subjectCode} not found`,
      );
    }

    await tx.execute(sql`SELECT pg_advisory_xact_lock(872314, ${subject.id})`);

    const versions = await tx
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.subjectId, subject.id));

    const draft = versions.find(
      (version) => version.logicalRevisionKey === logicalRevisionKey,
    );
    if (!draft) {
      throw new SyllabusOperatorError(
        "missing_logical_revision_key",
        `no version with logical revision "${logicalRevisionKey}"`,
      );
    }
    if (draft.lifecycle !== "draft") {
      throw new SyllabusOperatorError(
        "published_identity_mismatch",
        `version "${logicalRevisionKey}" is ${draft.lifecycle}, not draft`,
      );
    }
    if (!draft.logicalRevisionKey || !draft.contentSha256) {
      throw new SyllabusOperatorError(
        "published_identity_mismatch",
        "draft is missing logical_revision_key or content_sha256",
      );
    }

    const graph = await loadCanonicalGraphForVersion(tx, draft.id);
    if (!graph || graph.units.length === 0) {
      throw new SyllabusOperatorError(
        "published_identity_mismatch",
        "draft graph is empty; refuse to publish",
      );
    }

    const published = versions.filter((version) => version.lifecycle === "published");
    const draftHasNullWindow = windowIsNull(draft);
    const publishedNull = published.filter((version) => windowIsNull(version));
    if (draftHasNullWindow && publishedNull.length > 0) {
      throw new SyllabusOperatorError(
        "ambiguous_null_applicability",
        "a published version already has null applicability; refuse a second null-window published version",
      );
    }

    let overlappingIds: number[] = [];
    if (draft.applicableSessionRange) {
      const overlapQuery = await tx.execute(sql`
        SELECT id
        FROM public.syllabus_versions
        WHERE subject_id = ${subject.id}
          AND lifecycle = 'published'
          AND applicable_session_range IS NOT NULL
          AND applicable_session_range && ${draft.applicableSessionRange}::int4range
          AND id <> ${draft.id}
      `);
      overlappingIds = (overlapQuery.rows as { id: number }[]).map((row) => row.id);
    }

    let retiredRevisionKey: string | null = null;
    if (overlappingIds.length > 0) {
      if (!options.retireRevisionKey) {
        throw new SyllabusOperatorError(
          "publication_overlap",
          "publishing this draft would overlap a published applicability window; pass --retire-revision for the conflicting published key",
        );
      }
      const retire = versions.find(
        (version) => version.logicalRevisionKey === options.retireRevisionKey,
      );
      if (!retire || !overlappingIds.includes(retire.id)) {
        throw new SyllabusOperatorError(
          "publication_overlap",
          "retire revision is not the overlapping published version",
        );
      }
      if (retire.isCurrent && !options.makeDefault) {
        throw new SyllabusOperatorError(
          "publication_overlap",
          "retiring the DEFAULT version requires --make-default on the replacement",
        );
      }
      await tx
        .update(syllabusVersionsTable)
        .set({
          isCurrent: false,
          lifecycle: "retired",
          retiredAt: new Date(),
        })
        .where(eq(syllabusVersionsTable.id, retire.id));
      retiredRevisionKey = retire.logicalRevisionKey;
    }

    if (options.makeDefault) {
      await tx
        .update(syllabusVersionsTable)
        .set({ isCurrent: false })
        .where(
          and(
            eq(syllabusVersionsTable.subjectId, subject.id),
            eq(syllabusVersionsTable.isCurrent, true),
          ),
        );
    }

    await tx
      .update(syllabusVersionsTable)
      .set({
        lifecycle: "published",
        publishedAt: new Date(),
        isCurrent: options.makeDefault,
      })
      .where(eq(syllabusVersionsTable.id, draft.id));

    return {
      operation: "published",
      versionId: draft.id,
      logicalRevisionKey,
      isCurrent: options.makeDefault,
      retiredRevisionKey,
    };
  });
}
