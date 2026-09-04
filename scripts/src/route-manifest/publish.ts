import { and, eq, sql } from "drizzle-orm";
import {
  assessmentRouteComponentsTable,
  assessmentRouteSetsTable,
  assessmentRoutesTable,
  assessmentStudyOptionGroupsTable,
  assessmentStudyOptionUnitsTable,
  assessmentStudyOptionYearMappingsTable,
  assessmentStudyOptionsTable,
  db,
  subjectsTable,
  syllabusVersionsTable,
} from "@workspace/db";
import {
  canonicalizeRouteManifest,
  serializeCanonicalRouteManifest,
} from "./canonicalize.js";
import { RouteManifestError, RouteManifestValidationError } from "./errors.js";
import { hashRouteManifest } from "./hash.js";
import { validateRouteManifestDocument } from "./load.js";
import {
  resolveRouteManifestAgainstCatalog,
  type ReferenceCatalog,
  type ReferenceSyllabusVersion,
} from "./resolve.js";
import type { CanonicalRouteManifest, RouteManifest } from "./types.js";
import {
  formatWeightScaled,
  parseWeightText,
  sumWeightsScaled,
  WEIGHT_TOTAL,
} from "./weighting.js";
import { loadReferenceCatalogFromDatabase } from "./catalog-loader.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | Tx;
export type RoutePublicationCounts = {
  routes: number;
  routeComponents: number;
  optionGroups: number;
  options: number;
  optionUnits: number;
  yearMappings: number;
};

export type RoutePublicationResult = {
  operation: "published" | "noop_existing";
  subjectCode: string;
  syllabusRevisionKey: string;
  routeRevisionKey: string;
  manifestSha256: string;
  routeSetId: number;
  previousPublishedRouteSetId: number | null;
  lifecycle: "published";
  counts: RoutePublicationCounts;
  dryRun: boolean;
};

export type RoutePublicationDryRunResult = {
  operation: "dry_run";
  subjectCode: string;
  syllabusRevisionKey: string;
  routeRevisionKey: string;
  manifestSha256: string;
  syllabusVersionId: number;
  currentPublishedRouteSetId: number | null;
  currentPublishedRouteRevisionKey: string | null;
  plannedCounts: RoutePublicationCounts;
  wouldReplace: boolean;
  wouldNoop: boolean;
};

export type PublishRouteManifestOptions = {
  dryRun?: boolean;
  /** Test-only hook invoked after retiring the old published set, before publishing the new set. */
  afterRetireBeforePublish?: () => void | Promise<void>;
  catalogLoader?: (
    subjectCode: string,
    syllabusRevisionKey: string,
  ) => Promise<ReferenceCatalog>;
  database?: DbClient;
};

function countManifest(manifest: RouteManifest): RoutePublicationCounts {
  let routeComponents = 0;
  for (const route of manifest.routes) {
    routeComponents += route.components.length;
  }
  let options = 0;
  let optionUnits = 0;
  for (const group of manifest.studyOptionGroups) {
    options += group.options.length;
    for (const option of group.options) {
      optionUnits += option.units.length;
    }
  }
  return {
    routes: manifest.routes.length,
    routeComponents,
    optionGroups: manifest.studyOptionGroups.length,
    options,
    optionUnits,
    yearMappings: manifest.yearRotationMappings.length,
  };
}

function requireExactComponent(
  version: ReferenceSyllabusVersion,
  paperCode: string,
  level: string,
  path: string,
): number {
  const matches = version.components.filter(
    (component) => component.paperCode === paperCode && component.level === level,
  );
  if (matches.length !== 1 || matches[0]!.id == null) {
    throw new RouteManifestError(
      "component_resolution_failed",
      `expected exactly one component ${paperCode}|${level} with database id`,
      path,
    );
  }
  return matches[0]!.id;
}

function requireExactUnit(
  version: ReferenceSyllabusVersion,
  unitTitle: string,
  path: string,
): number {
  const matches = version.units.filter((unit) => unit.unitTitle === unitTitle);
  if (matches.length !== 1 || matches[0]!.id == null) {
    throw new RouteManifestError(
      "unit_resolution_failed",
      `expected exactly one unit "${unitTitle}" with database id`,
      path,
    );
  }
  return matches[0]!.id;
}

function assertRouteTotals(manifest: RouteManifest): void {
  for (const [index, route] of manifest.routes.entries()) {
    const total = sumWeightsScaled(
      route.components.map((component) =>
        parseWeightText(
          component.qualificationWeightingPercent,
          `routes[${index}].components`,
        ),
      ),
    );
    if (total !== WEIGHT_TOTAL) {
      throw new RouteManifestError(
        "route_weight_total_invalid",
        `route weight total must be 100.0000, got ${formatWeightScaled(total)}`,
        `routes[${index}]`,
      );
    }
  }
}

function sourceManifestForStorage(
  canonical: CanonicalRouteManifest,
): CanonicalRouteManifest {
  // Persist the A2A canonical semantic manifest (hashed field set only).
  // Excludes $schema/review and any machine-local metadata.
  return JSON.parse(serializeCanonicalRouteManifest(canonical)) as CanonicalRouteManifest;
}

async function resolveSyllabusVersionId(
  tx: DbClient,
  subjectCode: string,
  syllabusRevisionKey: string,
): Promise<number> {
  const rows = await tx
    .select({
      id: syllabusVersionsTable.id,
    })
    .from(syllabusVersionsTable)
    .innerJoin(subjectsTable, eq(subjectsTable.id, syllabusVersionsTable.subjectId))
    .where(
      and(
        eq(subjectsTable.code, subjectCode),
        eq(syllabusVersionsTable.logicalRevisionKey, syllabusRevisionKey),
      ),
    );

  if (rows.length === 0) {
    throw new RouteManifestError(
      "unknown_syllabus_revision",
      `no syllabus version "${syllabusRevisionKey}" for subject ${subjectCode}`,
    );
  }
  if (rows.length > 1) {
    throw new RouteManifestError(
      "ambiguous_syllabus_revision",
      `multiple syllabus versions matched "${syllabusRevisionKey}"`,
    );
  }
  return rows[0]!.id;
}

async function insertDraftGraph(
  tx: DbClient,
  args: {
    syllabusVersionId: number;
    manifest: RouteManifest;
    canonical: CanonicalRouteManifest;
    hash: string;
    version: ReferenceSyllabusVersion;
  },
): Promise<number> {
  const { syllabusVersionId, manifest, canonical, hash, version } = args;

  const [routeSet] = await tx
    .insert(assessmentRouteSetsTable)
    .values({
      syllabusVersionId,
      routeRevisionKey: manifest.routeRevisionKey,
      lifecycle: "draft",
      manifestSha256: hash,
      sourceManifest: sourceManifestForStorage(canonical),
    })
    .returning({ id: assessmentRouteSetsTable.id });

  if (!routeSet) {
    throw new RouteManifestError(
      "route_set_insert_failed",
      "failed to insert draft route set",
    );
  }

  const optionIdByKey = new Map<string, number>();

  for (const route of manifest.routes) {
    const [routeRow] = await tx
      .insert(assessmentRoutesTable)
      .values({
        routeSetId: routeSet.id,
        syllabusVersionId,
        routeKey: route.key,
        displayLabel: route.label,
        qualificationTarget: route.qualificationTarget,
        pathwayType: route.pathwayType,
        progressionEligibility: route.progressionEligibility,
        orderIndex: route.orderIndex,
      })
      .returning({ id: assessmentRoutesTable.id });

    if (!routeRow) {
      throw new RouteManifestError("route_insert_failed", `failed to insert route ${route.key}`);
    }

    for (const component of route.components) {
      const componentId = requireExactComponent(
        version,
        component.paperCode,
        component.level,
        `routes.${route.key}.components`,
      );
      await tx.insert(assessmentRouteComponentsTable).values({
        routeId: routeRow.id,
        routeSetId: routeSet.id,
        componentId,
        syllabusVersionId,
        role: component.role,
        qualificationWeightingPercent: component.qualificationWeightingPercent,
        orderIndex: component.orderIndex,
      });
    }
  }

  for (const group of manifest.studyOptionGroups) {
    const applicableComponentId = group.applicableComponent
      ? requireExactComponent(
          version,
          group.applicableComponent.paperCode,
          group.applicableComponent.level,
          `studyOptionGroups.${group.key}.applicableComponent`,
        )
      : null;

    const [groupRow] = await tx
      .insert(assessmentStudyOptionGroupsTable)
      .values({
        routeSetId: routeSet.id,
        syllabusVersionId,
        groupKey: group.key,
        displayLabel: group.label,
        applicableQualificationTarget: group.qualificationTarget,
        applicableComponentId,
        minSelections: group.minSelections,
        maxSelections: group.maxSelections,
        orderIndex: group.orderIndex,
      })
      .returning({ id: assessmentStudyOptionGroupsTable.id });

    if (!groupRow) {
      throw new RouteManifestError(
        "option_group_insert_failed",
        `failed to insert option group ${group.key}`,
      );
    }

    for (const option of group.options) {
      const [optionRow] = await tx
        .insert(assessmentStudyOptionsTable)
        .values({
          groupId: groupRow.id,
          routeSetId: routeSet.id,
          syllabusVersionId,
          optionKey: option.key,
          displayLabel: option.label,
          description: option.description,
          orderIndex: option.orderIndex,
        })
        .returning({ id: assessmentStudyOptionsTable.id });

      if (!optionRow) {
        throw new RouteManifestError(
          "option_insert_failed",
          `failed to insert option ${option.key}`,
        );
      }
      if (optionIdByKey.has(option.key)) {
        throw new RouteManifestError(
          "duplicate_option_key",
          `option key ${option.key} is not unique across groups`,
        );
      }
      optionIdByKey.set(option.key, optionRow.id);

      for (const unit of option.units) {
        const unitId = requireExactUnit(
          version,
          unit.unitTitle,
          `studyOptionGroups.${group.key}.options.${option.key}`,
        );
        await tx.insert(assessmentStudyOptionUnitsTable).values({
          optionId: optionRow.id,
          unitId,
          syllabusVersionId,
        });
      }
    }
  }

  for (const [index, mapping] of manifest.yearRotationMappings.entries()) {
    const optionId = optionIdByKey.get(mapping.optionKey);
    if (optionId == null) {
      throw new RouteManifestError(
        "year_mapping_option_missing",
        `optionKey ${mapping.optionKey} not found`,
        `yearRotationMappings[${index}]`,
      );
    }
    const componentId = requireExactComponent(
      version,
      mapping.component.paperCode,
      mapping.component.level,
      `yearRotationMappings[${index}].component`,
    );
    const unitId = requireExactUnit(
      version,
      mapping.unit.unitTitle,
      `yearRotationMappings[${index}].unit`,
    );
    await tx.insert(assessmentStudyOptionYearMappingsTable).values({
      optionId,
      syllabusVersionId,
      examYear: mapping.examYear,
      componentId,
      unitId,
      assessmentRole: mapping.assessmentRole,
    });
  }

  return routeSet.id;
}

async function verifyDraftGraph(
  tx: DbClient,
  routeSetId: number,
  expected: RoutePublicationCounts,
  expectedHash: string,
  expectedRevisionKey: string,
): Promise<void> {
  const [routeSet] = await tx
    .select()
    .from(assessmentRouteSetsTable)
    .where(eq(assessmentRouteSetsTable.id, routeSetId));

  if (!routeSet) {
    throw new RouteManifestError("draft_missing", "draft route set missing after insert");
  }
  if (routeSet.lifecycle !== "draft") {
    throw new RouteManifestError(
      "draft_lifecycle_invalid",
      `expected draft lifecycle, got ${routeSet.lifecycle}`,
    );
  }
  if (routeSet.manifestSha256 !== expectedHash) {
    throw new RouteManifestError(
      "manifest_hash_mismatch",
      "persisted manifest_sha256 does not match validated A2A hash",
    );
  }
  if (routeSet.routeRevisionKey !== expectedRevisionKey) {
    throw new RouteManifestError(
      "route_revision_mismatch",
      "persisted route_revision_key does not match manifest",
    );
  }

  const routes = await tx
    .select()
    .from(assessmentRoutesTable)
    .where(eq(assessmentRoutesTable.routeSetId, routeSetId));
  const components = await tx
    .select()
    .from(assessmentRouteComponentsTable)
    .where(eq(assessmentRouteComponentsTable.routeSetId, routeSetId));
  const groups = await tx
    .select()
    .from(assessmentStudyOptionGroupsTable)
    .where(eq(assessmentStudyOptionGroupsTable.routeSetId, routeSetId));
  const options = await tx
    .select()
    .from(assessmentStudyOptionsTable)
    .where(eq(assessmentStudyOptionsTable.routeSetId, routeSetId));
  const units = await tx
    .select({
      optionId: assessmentStudyOptionUnitsTable.optionId,
    })
    .from(assessmentStudyOptionUnitsTable)
    .innerJoin(
      assessmentStudyOptionsTable,
      eq(assessmentStudyOptionsTable.id, assessmentStudyOptionUnitsTable.optionId),
    )
    .where(eq(assessmentStudyOptionsTable.routeSetId, routeSetId));
  const mappings = await tx
    .select({
      id: assessmentStudyOptionYearMappingsTable.id,
    })
    .from(assessmentStudyOptionYearMappingsTable)
    .innerJoin(
      assessmentStudyOptionsTable,
      eq(assessmentStudyOptionsTable.id, assessmentStudyOptionYearMappingsTable.optionId),
    )
    .where(eq(assessmentStudyOptionsTable.routeSetId, routeSetId));

  const actual: RoutePublicationCounts = {
    routes: routes.length,
    routeComponents: components.length,
    optionGroups: groups.length,
    options: options.length,
    optionUnits: units.length,
    yearMappings: mappings.length,
  };

  for (const key of Object.keys(expected) as Array<keyof RoutePublicationCounts>) {
    if (actual[key] !== expected[key]) {
      throw new RouteManifestError(
        "draft_count_mismatch",
        `draft ${key} count ${actual[key]} != expected ${expected[key]}`,
      );
    }
  }

  for (const group of groups) {
    const groupOptions = options.filter((option) => option.groupId === group.id);
    if (
      !(
        group.minSelections >= 1 &&
        group.minSelections <= group.maxSelections &&
        group.maxSelections <= groupOptions.length
      )
    ) {
      throw new RouteManifestError(
        "cardinality_unsatisfiable",
        `option group ${group.groupKey} cardinality ${group.minSelections}..${group.maxSelections} vs ${groupOptions.length} options`,
      );
    }
  }

  for (const route of routes) {
    const routeComponents = components.filter((row) => row.routeId === route.id);
    const total = sumWeightsScaled(
      routeComponents.map((row) => {
        if (row.qualificationWeightingPercent == null) {
          throw new RouteManifestError(
            "missing_weight",
            `route ${route.routeKey} has null weighting`,
          );
        }
        return parseWeightText(
          row.qualificationWeightingPercent,
          `routes.${route.routeKey}`,
        );
      }),
    );
    if (total !== WEIGHT_TOTAL) {
      throw new RouteManifestError(
        "route_weight_total_invalid",
        `persisted route ${route.routeKey} totals ${formatWeightScaled(total)}, not 100.0000`,
      );
    }
  }
}

/**
 * Trusted LOCAL transactional publication of a validated route manifest.
 * Consumes the frozen A2A parse/validate/canonicalize/hash implementation.
 */
export async function publishRouteManifest(
  raw: unknown,
  options: PublishRouteManifestOptions = {},
): Promise<RoutePublicationResult | RoutePublicationDryRunResult> {
  const database = options.database ?? db;
  const dryRun = options.dryRun === true;

  const parsed = validateRouteManifestDocument(raw);
  if (!parsed.ok) {
    throw new RouteManifestValidationError(parsed.issues);
  }
  const manifest = parsed.manifest;
  assertRouteTotals(manifest);

  const canonical = canonicalizeRouteManifest(manifest);
  const hash = hashRouteManifest(manifest);
  const plannedCounts = countManifest(manifest);

  const catalogLoader =
    options.catalogLoader ?? loadReferenceCatalogFromDatabase;
  const catalog = await catalogLoader(
    manifest.subjectCode,
    manifest.syllabusRevisionKey,
  );
  const resolveIssues = resolveRouteManifestAgainstCatalog(manifest, catalog);
  if (resolveIssues.length > 0) {
    throw new RouteManifestValidationError(resolveIssues);
  }
  const version = catalog.versions[0]!;
  if (!version) {
    throw new RouteManifestError(
      "catalog_empty",
      "reference catalog returned no matching syllabus version",
    );
  }

  if (dryRun) {
    const syllabusVersionId = await resolveSyllabusVersionId(
      database,
      manifest.subjectCode,
      manifest.syllabusRevisionKey,
    );
    const existingSets = await database
      .select()
      .from(assessmentRouteSetsTable)
      .where(eq(assessmentRouteSetsTable.syllabusVersionId, syllabusVersionId));
    const sameRevision = existingSets.find(
      (row) => row.routeRevisionKey === manifest.routeRevisionKey,
    );
    const published = existingSets.find((row) => row.lifecycle === "published");
    const wouldNoop = Boolean(
      sameRevision && sameRevision.manifestSha256 === hash,
    );
    if (sameRevision && sameRevision.manifestSha256 !== hash) {
      throw new RouteManifestError(
        "route_revision_hash_conflict",
        `routeRevisionKey "${manifest.routeRevisionKey}" already exists with a different manifest_sha256; refuse overwrite`,
      );
    }
    return {
      operation: "dry_run",
      subjectCode: manifest.subjectCode,
      syllabusRevisionKey: manifest.syllabusRevisionKey,
      routeRevisionKey: manifest.routeRevisionKey,
      manifestSha256: hash,
      syllabusVersionId,
      currentPublishedRouteSetId: published?.id ?? null,
      currentPublishedRouteRevisionKey: published?.routeRevisionKey ?? null,
      plannedCounts,
      wouldReplace: Boolean(published && !wouldNoop && !sameRevision),
      wouldNoop,
    };
  }

  return database.transaction(async (tx) => {
    const syllabusVersionId = await resolveSyllabusVersionId(
      tx,
      manifest.subjectCode,
      manifest.syllabusRevisionKey,
    );

    // Serialize publication for this exact syllabus version.
    await tx.execute(
      sql`SELECT id FROM public.syllabus_versions WHERE id = ${syllabusVersionId} FOR UPDATE`,
    );

    const existingSets = await tx
      .select()
      .from(assessmentRouteSetsTable)
      .where(eq(assessmentRouteSetsTable.syllabusVersionId, syllabusVersionId));

    const sameRevision = existingSets.find(
      (row) => row.routeRevisionKey === manifest.routeRevisionKey,
    );
    if (sameRevision) {
      if (sameRevision.manifestSha256 !== hash) {
        throw new RouteManifestError(
          "route_revision_hash_conflict",
          `routeRevisionKey "${manifest.routeRevisionKey}" already exists with a different manifest_sha256; refuse overwrite`,
        );
      }
      if (sameRevision.lifecycle === "published") {
        return {
          operation: "noop_existing" as const,
          subjectCode: manifest.subjectCode,
          syllabusRevisionKey: manifest.syllabusRevisionKey,
          routeRevisionKey: manifest.routeRevisionKey,
          manifestSha256: hash,
          routeSetId: sameRevision.id,
          previousPublishedRouteSetId: null,
          lifecycle: "published" as const,
          counts: plannedCounts,
          dryRun: false,
        };
      }
      if (sameRevision.lifecycle === "retired") {
        throw new RouteManifestError(
          "route_revision_retired",
          `routeRevisionKey "${manifest.routeRevisionKey}" is retired; use a new revision key`,
        );
      }
      // Resume incomplete draft with matching hash.
      await verifyDraftGraph(
        tx,
        sameRevision.id,
        plannedCounts,
        hash,
        manifest.routeRevisionKey,
      );
      const publishedWhileDraft = existingSets.find(
        (row) => row.lifecycle === "published",
      );
      let previousFromDraft: number | null = null;
      if (publishedWhileDraft) {
        previousFromDraft = publishedWhileDraft.id;
        await tx
          .update(assessmentRouteSetsTable)
          .set({ lifecycle: "retired" })
          .where(eq(assessmentRouteSetsTable.id, publishedWhileDraft.id));
        if (options.afterRetireBeforePublish) {
          await options.afterRetireBeforePublish();
        }
      }
      await tx
        .update(assessmentRouteSetsTable)
        .set({
          lifecycle: "published",
          publishedAt: sql`now()`,
        })
        .where(eq(assessmentRouteSetsTable.id, sameRevision.id));
      return {
        operation: "published" as const,
        subjectCode: manifest.subjectCode,
        syllabusRevisionKey: manifest.syllabusRevisionKey,
        routeRevisionKey: manifest.routeRevisionKey,
        manifestSha256: hash,
        routeSetId: sameRevision.id,
        previousPublishedRouteSetId: previousFromDraft,
        lifecycle: "published" as const,
        counts: plannedCounts,
        dryRun: false,
      };
    }

    const published = existingSets.find((row) => row.lifecycle === "published");
    const routeSetId = await insertDraftGraph(tx, {
      syllabusVersionId,
      manifest,
      canonical,
      hash,
      version,
    });
    await verifyDraftGraph(
      tx,
      routeSetId,
      plannedCounts,
      hash,
      manifest.routeRevisionKey,
    );

    let previousPublishedRouteSetId: number | null = null;
    if (published) {
      previousPublishedRouteSetId = published.id;
      await tx
        .update(assessmentRouteSetsTable)
        .set({ lifecycle: "retired" })
        .where(eq(assessmentRouteSetsTable.id, published.id));
      if (options.afterRetireBeforePublish) {
        await options.afterRetireBeforePublish();
      }
    }

    await tx
      .update(assessmentRouteSetsTable)
      .set({
        lifecycle: "published",
        publishedAt: sql`now()`,
      })
      .where(eq(assessmentRouteSetsTable.id, routeSetId));

    const [persisted] = await tx
      .select({
        lifecycle: assessmentRouteSetsTable.lifecycle,
        hash: assessmentRouteSetsTable.manifestSha256,
      })
      .from(assessmentRouteSetsTable)
      .where(eq(assessmentRouteSetsTable.id, routeSetId));

    if (
      !persisted ||
      persisted.lifecycle !== "published" ||
      persisted.hash !== hash
    ) {
      throw new RouteManifestError(
        "publish_transition_failed",
        "publish transition did not persist expected lifecycle/hash",
      );
    }

    return {
      operation: "published" as const,
      subjectCode: manifest.subjectCode,
      syllabusRevisionKey: manifest.syllabusRevisionKey,
      routeRevisionKey: manifest.routeRevisionKey,
      manifestSha256: hash,
      routeSetId,
      previousPublishedRouteSetId,
      lifecycle: "published" as const,
      counts: plannedCounts,
      dryRun: false,
    };
  });
}
