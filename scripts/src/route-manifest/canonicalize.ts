import type {
  CanonicalRouteManifest,
  RouteManifest,
} from "./types.js";
import { byOrderThenOrdinalKey, compareOrdinal } from "./ordering.js";

/**
 * Deterministic canonicalization for hashing.
 *
 * String ordering: ordinal JavaScript code-unit comparison (`compareOrdinal`),
 * never localeCompare / ICU / process-locale collation.
 *
 * Collection ordering:
 * - sources: sourceKey
 * - routes: orderIndex then route key
 * - route components: orderIndex then paperCode|level
 * - evidenceRefs: ordinal
 * - option groups: orderIndex then group key
 * - options: orderIndex then option key
 * - units: unitTitle
 * - year mappings: examYear, optionKey, unitTitle, paperCode|level
 *
 * Weight texts must already be four-fractional-digit canonical form
 * (parser normalizes on ingest).
 */
export function canonicalizeRouteManifest(
  manifest: RouteManifest,
): CanonicalRouteManifest {
  return {
    schemaVersion: manifest.schemaVersion,
    subjectCode: manifest.subjectCode,
    syllabusRevisionKey: manifest.syllabusRevisionKey,
    routeRevisionKey: manifest.routeRevisionKey,
    sources: [...manifest.sources]
      .sort((a, b) => compareOrdinal(a.sourceKey, b.sourceKey))
      .map((source) => ({
        sourceKey: source.sourceKey,
        documentId: source.documentId,
        title: source.title,
        validity: source.validity,
        locator: source.locator,
        url: source.url,
      })),
    routes: [...manifest.routes]
      .sort((a, b) => byOrderThenOrdinalKey(a, b, (r) => r.orderIndex, (r) => r.key))
      .map((route) => ({
        key: route.key,
        label: route.label,
        qualificationTarget: route.qualificationTarget,
        pathwayType: route.pathwayType,
        progressionEligibility: route.progressionEligibility,
        orderIndex: route.orderIndex,
        evidenceRefs: [...route.evidenceRefs].sort(compareOrdinal),
        components: [...route.components]
          .sort((a, b) =>
            byOrderThenOrdinalKey(
              a,
              b,
              (c) => c.orderIndex,
              (c) => `${c.paperCode}|${c.level}`,
            ),
          )
          .map((component) => ({
            paperCode: component.paperCode,
            level: component.level,
            role: component.role,
            qualificationWeightingPercent: component.qualificationWeightingPercent,
            orderIndex: component.orderIndex,
          })),
      })),
    studyOptionGroups: [...manifest.studyOptionGroups]
      .sort((a, b) => byOrderThenOrdinalKey(a, b, (g) => g.orderIndex, (g) => g.key))
      .map((group) => ({
        key: group.key,
        label: group.label,
        qualificationTarget: group.qualificationTarget,
        applicableComponent: group.applicableComponent
          ? {
              paperCode: group.applicableComponent.paperCode,
              level: group.applicableComponent.level,
            }
          : null,
        orderIndex: group.orderIndex,
        minSelections: group.minSelections,
        maxSelections: group.maxSelections,
        options: [...group.options]
          .sort((a, b) =>
            byOrderThenOrdinalKey(a, b, (o) => o.orderIndex, (o) => o.key),
          )
          .map((option) => ({
            key: option.key,
            label: option.label,
            description: option.description,
            orderIndex: option.orderIndex,
            units: [...option.units]
              .sort((a, b) => compareOrdinal(a.unitTitle, b.unitTitle))
              .map((unit) => ({ unitTitle: unit.unitTitle })),
          })),
      })),
    yearRotationMappings: [...manifest.yearRotationMappings]
      .sort((a, b) => {
        if (a.examYear !== b.examYear) return a.examYear - b.examYear;
        const optionCmp = compareOrdinal(a.optionKey, b.optionKey);
        if (optionCmp !== 0) return optionCmp;
        const unitCmp = compareOrdinal(a.unit.unitTitle, b.unit.unitTitle);
        if (unitCmp !== 0) return unitCmp;
        return compareOrdinal(
          `${a.component.paperCode}|${a.component.level}`,
          `${b.component.paperCode}|${b.component.level}`,
        );
      })
      .map((mapping) => ({
        examYear: mapping.examYear,
        optionKey: mapping.optionKey,
        component: {
          paperCode: mapping.component.paperCode,
          level: mapping.component.level,
        },
        unit: { unitTitle: mapping.unit.unitTitle },
        assessmentRole: mapping.assessmentRole,
      })),
  };
}

export function serializeCanonicalRouteManifest(
  canonical: CanonicalRouteManifest,
): string {
  return JSON.stringify(canonical);
}
