import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";
import {
  assessmentComponentsTable,
  db,
  subjectsTable,
  syllabusUnitsTable,
  syllabusVersionsTable,
} from "@workspace/db";
import { loadApplicabilityManifest } from "../syllabus/applicability-manifest.js";
import { SYLLABUS_IMPORT_MANIFEST } from "../syllabus/manifest.js";
import { normalizeSyllabus } from "../syllabus/normalize.js";
import { parseAndValidateCsv } from "../syllabus/parse-csv.js";
import { RouteManifestError } from "./errors.js";
import type {
  ReferenceCatalog,
  ReferenceSyllabusVersion,
} from "./resolve.js";

const CSV_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../data/syllabi/raw",
);

export type DbReader = Pick<typeof db, "select">;

/**
 * Read-only catalog loader from committed Lockdin repository reference files:
 * - population-manifest applicability window
 * - syllabus CSV → normalized components/units
 *
 * No database writes. Exact subjectCode + syllabusRevisionKey only.
 */
export function loadReferenceCatalogFromRepositoryFiles(
  subjectCode: string,
  syllabusRevisionKey: string,
): ReferenceCatalog {
  const applicability = loadApplicabilityManifest();
  const entry = applicability.versions.find(
    (row) =>
      row.subjectCode === subjectCode &&
      row.logicalRevisionKey === syllabusRevisionKey,
  );
  if (!entry) {
    throw new RouteManifestError(
      "unknown_syllabus_revision",
      `no population-manifest entry for ${syllabusRevisionKey}`,
    );
  }

  const manifestEntry = SYLLABUS_IMPORT_MANIFEST.find(
    (row) => row.subjectCode === subjectCode,
  );
  if (!manifestEntry) {
    throw new RouteManifestError(
      "unknown_subject",
      `subjectCode ${subjectCode} is not in the syllabus import manifest`,
    );
  }

  const csvPath = path.join(CSV_DIR, manifestEntry.csvFile);
  const parsed = parseAndValidateCsv(csvPath);
  if (parsed.errors.length > 0) {
    throw new RouteManifestError(
      "csv_parse_failed",
      `${manifestEntry.csvFile} has ${parsed.errors.length} parse error(s)`,
    );
  }
  const normalized = normalizeSyllabus(manifestEntry, parsed.rows);

  const version: ReferenceSyllabusVersion = {
    subjectCode,
    logicalRevisionKey: syllabusRevisionKey,
    applicableFromYear: entry.applicability.from.year,
    applicableToYear: entry.applicability.to.year,
    components: normalized.components.map((component) => ({
      paperCode: component.paperCode,
      level: component.level,
    })),
    units: normalized.units.map((unit) => ({
      unitTitle: unit.title,
    })),
  };

  return { versions: [version] };
}

/**
 * Read-only catalog loader from a live Lockdin Postgres reference database.
 * SELECT only — never inserts/updates/deletes.
 * Exact subjectCode + logical_revision_key; no DEFAULT/latest guessing.
 */
export async function loadReferenceCatalogFromDatabase(
  subjectCode: string,
  syllabusRevisionKey: string,
  reader: DbReader = db,
): Promise<ReferenceCatalog> {
  const rows = await reader
    .select({
      versionId: syllabusVersionsTable.id,
      subjectCode: subjectsTable.code,
      logicalRevisionKey: syllabusVersionsTable.logicalRevisionKey,
      applicableFromYear: syllabusVersionsTable.applicableFromYear,
      applicableToYear: syllabusVersionsTable.applicableToYear,
    })
    .from(syllabusVersionsTable)
    .innerJoin(
      subjectsTable,
      eq(subjectsTable.id, syllabusVersionsTable.subjectId),
    )
    .where(
      and(
        eq(subjectsTable.code, subjectCode),
        eq(syllabusVersionsTable.logicalRevisionKey, syllabusRevisionKey),
      ),
    );

  if (rows.length === 0) {
    throw new RouteManifestError(
      "unknown_syllabus_revision",
      `no database syllabus version "${syllabusRevisionKey}" for subject ${subjectCode}`,
    );
  }
  if (rows.length > 1) {
    throw new RouteManifestError(
      "ambiguous_syllabus_revision",
      `multiple database syllabus versions matched "${syllabusRevisionKey}"`,
    );
  }

  const versionRow = rows[0]!;
  const components = await reader
    .select({
      paperCode: assessmentComponentsTable.paperCode,
      level: assessmentComponentsTable.level,
      id: assessmentComponentsTable.id,
    })
    .from(assessmentComponentsTable)
    .where(
      eq(assessmentComponentsTable.syllabusVersionId, versionRow.versionId),
    );

  const units = await reader
    .select({
      title: syllabusUnitsTable.title,
      id: syllabusUnitsTable.id,
    })
    .from(syllabusUnitsTable)
    .where(eq(syllabusUnitsTable.syllabusVersionId, versionRow.versionId));

  const version: ReferenceSyllabusVersion = {
    subjectCode: versionRow.subjectCode,
    logicalRevisionKey: versionRow.logicalRevisionKey ?? syllabusRevisionKey,
    applicableFromYear: versionRow.applicableFromYear,
    applicableToYear: versionRow.applicableToYear,
    components: components.map((component) => ({
      paperCode: component.paperCode,
      level: component.level,
      id: component.id,
    })),
    units: units.map((unit) => ({
      unitTitle: unit.title,
      id: unit.id,
    })),
  };

  return { versions: [version] };
}
