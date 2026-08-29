import { and, eq, isNull, sql } from "drizzle-orm";
import { db, subjectsTable, syllabusVersionsTable } from "@workspace/db";
import { hashCanonicalGraph, hashNormalizedSyllabus } from "./canonical-graph.js";
import { loadCanonicalGraphForVersion } from "./db-graph.js";
import { SyllabusOperatorError } from "./errors.js";
import type { NormalizedSyllabus } from "./normalize.js";

export type AdoptOperation = "legacy-adopted" | "already-adopted";

export type AdoptResult = {
  operation: AdoptOperation;
  versionId: number;
  logicalRevisionKey: string;
  contentSha256: string;
};

export async function adoptLegacyIdentity(options: {
  subjectCode: string;
  sourceFile: string;
  logicalRevisionKey: string;
  syllabus: NormalizedSyllabus;
}): Promise<AdoptResult> {
  const logicalRevisionKey = options.logicalRevisionKey.trim();
  if (!logicalRevisionKey) {
    throw new SyllabusOperatorError(
      "missing_logical_revision_key",
      "logical revision key is required for legacy identity adoption",
    );
  }

  const sourceHash = hashNormalizedSyllabus(options.syllabus);

  return db.transaction(async (tx) => {
    const [subject] = await tx
      .select()
      .from(subjectsTable)
      .where(eq(subjectsTable.code, options.subjectCode));
    if (!subject) {
      throw new SyllabusOperatorError(
        "legacy_identity_requires_adoption",
        `no subject ${options.subjectCode} found for legacy adoption`,
      );
    }

    await tx.execute(sql`SELECT pg_advisory_xact_lock(872314, ${subject.id})`);

    const [existingByKey] = await tx
      .select()
      .from(syllabusVersionsTable)
      .where(
        and(
          eq(syllabusVersionsTable.subjectId, subject.id),
          eq(syllabusVersionsTable.logicalRevisionKey, logicalRevisionKey),
        ),
      );

    if (existingByKey) {
      if (existingByKey.lifecycle === "draft") {
        throw new SyllabusOperatorError(
          "legacy_identity_requires_adoption",
          "logical revision is a draft; legacy adoption targets a published snapshot, not a draft",
        );
      }
      if (
        existingByKey.contentSha256 === sourceHash &&
        existingByKey.logicalRevisionKey === logicalRevisionKey
      ) {
        return {
          operation: "already-adopted",
          versionId: existingByKey.id,
          logicalRevisionKey,
          contentSha256: sourceHash,
        };
      }
      throw new SyllabusOperatorError(
        "published_identity_mismatch",
        `logical revision "${logicalRevisionKey}" is already assigned to a different identity/hash`,
      );
    }

    const candidates = await tx
      .select()
      .from(syllabusVersionsTable)
      .where(
        and(
          eq(syllabusVersionsTable.subjectId, subject.id),
          eq(syllabusVersionsTable.sourceFile, options.sourceFile),
          isNull(syllabusVersionsTable.logicalRevisionKey),
        ),
      );

    if (candidates.length > 1) {
      throw new SyllabusOperatorError(
        "ambiguous_legacy_candidate",
        "multiple identity-null syllabus versions match this subject and source_file; refuse to guess",
      );
    }
    if (candidates.length === 0) {
      const [byFile] = await tx
        .select()
        .from(syllabusVersionsTable)
        .where(
          and(
            eq(syllabusVersionsTable.subjectId, subject.id),
            eq(syllabusVersionsTable.sourceFile, options.sourceFile),
          ),
        );
      if (
        byFile?.logicalRevisionKey &&
        byFile.logicalRevisionKey !== logicalRevisionKey
      ) {
        throw new SyllabusOperatorError(
          "published_identity_mismatch",
          `logical revision "${logicalRevisionKey}" is already assigned to a different identity/hash`,
        );
      }
      throw new SyllabusOperatorError(
        "legacy_identity_requires_adoption",
        "no identity-null published candidate matched this subject and source_file",
      );
    }

    const [locked] = await tx
      .select()
      .from(syllabusVersionsTable)
      .where(eq(syllabusVersionsTable.id, candidates[0]!.id));
    await tx.execute(
      sql`SELECT id FROM public.syllabus_versions WHERE id = ${candidates[0]!.id} FOR UPDATE`,
    );

    if (!locked || locked.logicalRevisionKey !== null) {
      throw new SyllabusOperatorError(
        "published_identity_mismatch",
        "legacy candidate identity changed concurrently",
      );
    }
    if (locked.lifecycle !== "published") {
      throw new SyllabusOperatorError(
        "legacy_identity_requires_adoption",
        `legacy candidate must be published (found ${locked.lifecycle})`,
      );
    }
    if (locked.contentSha256 !== null) {
      throw new SyllabusOperatorError(
        "published_identity_mismatch",
        "legacy candidate already has content_sha256; refusing overwrite",
      );
    }

    const dbGraph = await loadCanonicalGraphForVersion(tx, locked.id);
    if (!dbGraph) {
      throw new SyllabusOperatorError(
        "legacy_graph_mismatch",
        "legacy candidate graph could not be loaded",
      );
    }
    const dbHash = hashCanonicalGraph(dbGraph);
    if (dbHash !== sourceHash) {
      throw new SyllabusOperatorError(
        "legacy_graph_mismatch",
        "normalized source graph does not match the existing database graph; adoption refused",
      );
    }

    await tx
      .update(syllabusVersionsTable)
      .set({
        logicalRevisionKey,
        contentSha256: sourceHash,
      })
      .where(eq(syllabusVersionsTable.id, locked.id));

    return {
      operation: "legacy-adopted",
      versionId: locked.id,
      logicalRevisionKey,
      contentSha256: sourceHash,
    };
  });
}
