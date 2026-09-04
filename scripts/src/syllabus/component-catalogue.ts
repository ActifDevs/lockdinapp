import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import {
  assessmentComponentsTable,
  db,
  subjectsTable,
  syllabusVersionsTable,
} from "@workspace/db";
import { hashCanonicalGraph } from "./canonical-graph.js";
import { loadCanonicalGraphForVersion } from "./db-graph.js";
import { SyllabusOperatorError } from "./errors.js";

export type ComponentCatalogueEntry = {
  paperCode: string;
  level: string;
  componentName: string;
  durationMinutes: number | null;
  marks: number | null;
};

export type ComponentCatalogueDocument = {
  schemaVersion: number;
  subjectCode: string;
  syllabusRevisionKey: string;
  components: ComponentCatalogueEntry[];
};

export type SeedComponentCatalogueResult = {
  operation: "seeded" | "already-present";
  versionId: number;
  inserted: number;
  present: number;
  contentSha256: string;
};

function parseCatalogue(raw: unknown): ComponentCatalogueDocument {
  if (!raw || typeof raw !== "object") {
    throw new SyllabusOperatorError(
      "invalid_component_catalogue",
      "component catalogue must be an object",
    );
  }
  const doc = raw as Record<string, unknown>;
  if (doc.schemaVersion !== 1) {
    throw new SyllabusOperatorError(
      "invalid_component_catalogue",
      "unsupported component catalogue schemaVersion",
    );
  }
  if (typeof doc.subjectCode !== "string" || !/^\d{4}$/.test(doc.subjectCode)) {
    throw new SyllabusOperatorError(
      "invalid_component_catalogue",
      "subjectCode must be a four-digit Cambridge code",
    );
  }
  if (
    typeof doc.syllabusRevisionKey !== "string" ||
    !new RegExp(`^${doc.subjectCode}-r\\d{3}$`).test(doc.syllabusRevisionKey)
  ) {
    throw new SyllabusOperatorError(
      "invalid_component_catalogue",
      "syllabusRevisionKey must be {code}-rNNN",
    );
  }
  if (!Array.isArray(doc.components) || doc.components.length < 1) {
    throw new SyllabusOperatorError(
      "invalid_component_catalogue",
      "components must be a non-empty array",
    );
  }

  const components = doc.components.map((row, index) => {
    if (!row || typeof row !== "object") {
      throw new SyllabusOperatorError(
        "invalid_component_catalogue",
        `components[${index}] is invalid`,
      );
    }
    const item = row as Record<string, unknown>;
    if (typeof item.paperCode !== "string" || !item.paperCode.trim()) {
      throw new SyllabusOperatorError(
        "invalid_component_catalogue",
        `components[${index}].paperCode is required`,
      );
    }
    if (typeof item.level !== "string" || !item.level.trim()) {
      throw new SyllabusOperatorError(
        "invalid_component_catalogue",
        `components[${index}].level is required`,
      );
    }
    if (typeof item.componentName !== "string" || !item.componentName.trim()) {
      throw new SyllabusOperatorError(
        "invalid_component_catalogue",
        `components[${index}].componentName is required`,
      );
    }
    const durationMinutes =
      item.durationMinutes === null || item.durationMinutes === undefined
        ? null
        : item.durationMinutes;
    const marks =
      item.marks === null || item.marks === undefined ? null : item.marks;
    if (
      durationMinutes !== null &&
      (typeof durationMinutes !== "number" || !Number.isInteger(durationMinutes))
    ) {
      throw new SyllabusOperatorError(
        "invalid_component_catalogue",
        `components[${index}].durationMinutes must be an integer or null`,
      );
    }
    if (marks !== null && (typeof marks !== "number" || !Number.isInteger(marks))) {
      throw new SyllabusOperatorError(
        "invalid_component_catalogue",
        `components[${index}].marks must be an integer or null`,
      );
    }
    return {
      paperCode: item.paperCode.trim(),
      level: item.level.trim(),
      componentName: item.componentName.trim(),
      durationMinutes,
      marks,
    } satisfies ComponentCatalogueEntry;
  });

  return {
    schemaVersion: 1,
    subjectCode: doc.subjectCode,
    syllabusRevisionKey: doc.syllabusRevisionKey,
    components,
  };
}

export function loadComponentCatalogue(filePath: string): ComponentCatalogueDocument {
  return parseCatalogue(JSON.parse(readFileSync(filePath, "utf8")) as unknown);
}

/**
 * Ensures version-scoped assessment_components exist for catalogue papers.
 * Does NOT create learning_outcome_components links — AS rows may remain
 * component-null (History invariant).
 */
export async function seedComponentCatalogue(
  catalogue: ComponentCatalogueDocument,
): Promise<SeedComponentCatalogueResult> {
  return db.transaction(async (tx) => {
    const [subject] = await tx
      .select()
      .from(subjectsTable)
      .where(eq(subjectsTable.code, catalogue.subjectCode));
    if (!subject) {
      throw new SyllabusOperatorError(
        "missing_subject",
        `subject ${catalogue.subjectCode} not found`,
      );
    }

    const [version] = await tx
      .select()
      .from(syllabusVersionsTable)
      .where(
        and(
          eq(syllabusVersionsTable.subjectId, subject.id),
          eq(
            syllabusVersionsTable.logicalRevisionKey,
            catalogue.syllabusRevisionKey,
          ),
        ),
      );
    if (!version) {
      throw new SyllabusOperatorError(
        "missing_logical_revision_key",
        `${catalogue.syllabusRevisionKey} not found`,
      );
    }
    if (version.lifecycle === "retired" || version.lifecycle === "archived") {
      throw new SyllabusOperatorError(
        "published_identity_mismatch",
        `${catalogue.syllabusRevisionKey} is ${version.lifecycle}; refuse catalogue seed`,
      );
    }

    const existing = await tx
      .select()
      .from(assessmentComponentsTable)
      .where(eq(assessmentComponentsTable.syllabusVersionId, version.id));
    const byKey = new Map<string, (typeof existing)[number]>(
      existing.map((row) => [`${row.paperCode}|${row.level}`, row]),
    );

    let inserted = 0;
    let orderIndex = existing.reduce(
      (max, row) => Math.max(max, row.orderIndex),
      -1,
    );

    for (const component of catalogue.components) {
      const key = `${component.paperCode}|${component.level}`;
      const present = byKey.get(key);
      if (present) {
        if (
          present.componentName !== component.componentName ||
          present.durationMinutes !== component.durationMinutes ||
          present.totalMarks !== component.marks
        ) {
          throw new SyllabusOperatorError(
            "component_catalogue_conflict",
            `${key} already exists with different metadata on ${catalogue.syllabusRevisionKey}`,
          );
        }
        continue;
      }
      orderIndex += 1;
      const [created] = await tx
        .insert(assessmentComponentsTable)
        .values({
          syllabusVersionId: version.id,
          paperCode: component.paperCode,
          level: component.level,
          componentName: component.componentName,
          durationMinutes: component.durationMinutes,
          totalMarks: component.marks,
          weightingPercent: null,
          orderIndex,
        })
        .returning();
      byKey.set(key, created!);
      inserted += 1;
    }

    // Catalogue papers are part of the version-scoped reference graph. For drafts,
    // recompute content_sha256 after seeding so publish fingerprint checks pass.
    // Published/retired graphs remain immutable (seed refused above for retired).
    const graph = await loadCanonicalGraphForVersion(tx, version.id);
    if (!graph) {
      throw new SyllabusOperatorError(
        "draft_graph_fingerprint_mismatch",
        `${catalogue.syllabusRevisionKey} graph could not be loaded after catalogue seed`,
      );
    }
    const contentSha256 = hashCanonicalGraph(graph);
    if (version.lifecycle === "draft" && version.contentSha256 !== contentSha256) {
      await tx
        .update(syllabusVersionsTable)
        .set({ contentSha256 })
        .where(eq(syllabusVersionsTable.id, version.id));
    } else if (
      version.lifecycle === "published" &&
      version.contentSha256 !== contentSha256
    ) {
      throw new SyllabusOperatorError(
        "published_identity_mismatch",
        `${catalogue.syllabusRevisionKey} catalogue seed would change published content hash`,
      );
    }

    return {
      operation: inserted === 0 ? "already-present" : "seeded",
      versionId: version.id,
      inserted,
      present: catalogue.components.length,
      contentSha256,
    };
  });
}
