import {
  RouteManifestValidationError,
  type RouteManifestIssue,
} from "./errors.js";
import type { ComponentRef, RouteManifest, UnitRef } from "./types.js";
import { validateRouteManifestSemantics } from "./validate.js";

export type ReferenceComponent = ComponentRef & {
  id?: number;
};

export type ReferenceUnit = UnitRef & {
  id?: number;
};

export type ReferenceSyllabusVersion = {
  subjectCode: string;
  logicalRevisionKey: string;
  /** Inclusive applicability years when known; null window means unknown/unset. */
  applicableFromYear: number | null;
  applicableToYear: number | null;
  components: ReferenceComponent[];
  units: ReferenceUnit[];
};

export type ReferenceCatalog = {
  versions: ReferenceSyllabusVersion[];
};

function componentIdentity(ref: ComponentRef): string {
  return `${ref.paperCode}|${ref.level}`;
}

function resolveComponents(
  version: ReferenceSyllabusVersion,
  ref: ComponentRef,
): ReferenceComponent[] {
  return version.components.filter(
    (component) =>
      component.paperCode === ref.paperCode && component.level === ref.level,
  );
}

function resolveUnits(
  version: ReferenceSyllabusVersion,
  ref: UnitRef,
): ReferenceUnit[] {
  return version.units.filter((unit) => unit.unitTitle === ref.unitTitle);
}

function yearSupported(
  version: ReferenceSyllabusVersion,
  examYear: number,
): boolean {
  if (version.applicableFromYear === null || version.applicableToYear === null) {
    return false;
  }
  return (
    examYear >= version.applicableFromYear &&
    examYear <= version.applicableToYear
  );
}

/** Inclusive integer years from the authoritative applicability window. */
export function requiredApplicabilityYears(
  version: ReferenceSyllabusVersion,
): number[] | null {
  if (version.applicableFromYear === null || version.applicableToYear === null) {
    return null;
  }
  if (version.applicableToYear < version.applicableFromYear) {
    return null;
  }
  const years: number[] = [];
  for (
    let year = version.applicableFromYear;
    year <= version.applicableToYear;
    year += 1
  ) {
    years.push(year);
  }
  return years;
}

/**
 * Read-only resolution of a candidate manifest against an exact syllabus version catalog.
 * Exact/fail-closed: never uses DEFAULT/latest/current-year guesses.
 *
 * Year-sensitive coverage uses the AUTHORITATIVE applicability window of the
 * exact syllabus version — not merely years present in mapping rows.
 */
export function resolveRouteManifestAgainstCatalog(
  manifest: RouteManifest,
  catalog: ReferenceCatalog,
): RouteManifestIssue[] {
  const issues = validateRouteManifestSemantics(manifest);

  const matches = catalog.versions.filter(
    (version) =>
      version.subjectCode === manifest.subjectCode &&
      version.logicalRevisionKey === manifest.syllabusRevisionKey,
  );

  if (matches.length === 0) {
    issues.push({
      code: "unknown_syllabus_revision",
      path: "$.syllabusRevisionKey",
      message: `no syllabus version "${manifest.syllabusRevisionKey}" for subject ${manifest.subjectCode}`,
    });
    return issues;
  }
  if (matches.length > 1) {
    issues.push({
      code: "ambiguous_syllabus_revision",
      path: "$.syllabusRevisionKey",
      message: `multiple syllabus versions matched "${manifest.syllabusRevisionKey}"`,
    });
    return issues;
  }

  const version = matches[0]!;

  const requireExactComponent = (ref: ComponentRef, path: string): void => {
    const found = resolveComponents(version, ref);
    if (found.length === 0) {
      issues.push({
        code: "unknown_component",
        path,
        message: `component "${componentIdentity(ref)}" not found in ${version.logicalRevisionKey}`,
      });
    } else if (found.length > 1) {
      issues.push({
        code: "ambiguous_component",
        path,
        message: `component "${componentIdentity(ref)}" resolves ambiguously in ${version.logicalRevisionKey}`,
      });
    }
  };

  const requireExactUnit = (ref: UnitRef, path: string): void => {
    const found = resolveUnits(version, ref);
    if (found.length === 0) {
      issues.push({
        code: "unknown_unit",
        path,
        message: `unitTitle "${ref.unitTitle}" not found in ${version.logicalRevisionKey}`,
      });
    } else if (found.length > 1) {
      issues.push({
        code: "ambiguous_unit",
        path,
        message: `unitTitle "${ref.unitTitle}" resolves ambiguously in ${version.logicalRevisionKey}`,
      });
    }
  };

  for (const [routeIndex, route] of manifest.routes.entries()) {
    for (const [compIndex, component] of route.components.entries()) {
      requireExactComponent(
        component,
        `$.routes[${routeIndex}].components[${compIndex}]`,
      );
    }
  }

  const optionByKey = new Map<
    string,
    { units: UnitRef[] }
  >();
  for (const [groupIndex, group] of manifest.studyOptionGroups.entries()) {
    if (group.applicableComponent) {
      requireExactComponent(
        group.applicableComponent,
        `$.studyOptionGroups[${groupIndex}].applicableComponent`,
      );
    }
    for (const [optionIndex, option] of group.options.entries()) {
      optionByKey.set(option.key, { units: option.units });
      for (const [unitIndex, unit] of option.units.entries()) {
        requireExactUnit(
          unit,
          `$.studyOptionGroups[${groupIndex}].options[${optionIndex}].units[${unitIndex}]`,
        );
      }
    }
  }

  const yearLogical = new Set<string>();
  const governedOptions = new Set<string>();

  for (const [mapIndex, mapping] of manifest.yearRotationMappings.entries()) {
    requireExactComponent(
      mapping.component,
      `$.yearRotationMappings[${mapIndex}].component`,
    );
    requireExactUnit(mapping.unit, `$.yearRotationMappings[${mapIndex}].unit`);
    if (!yearSupported(version, mapping.examYear)) {
      issues.push({
        code: "unsupported_exam_year",
        path: `$.yearRotationMappings[${mapIndex}].examYear`,
        message: `examYear ${mapping.examYear} is outside applicability for ${version.logicalRevisionKey}`,
      });
    }
    yearLogical.add(
      `${mapping.optionKey}::${mapping.examYear}::${mapping.unit.unitTitle}`,
    );
    governedOptions.add(mapping.optionKey);
  }

  if (manifest.yearRotationMappings.length > 0) {
    const requiredYears = requiredApplicabilityYears(version);
    if (requiredYears === null) {
      issues.push({
        code: "missing_applicability_window",
        path: "$.syllabusRevisionKey",
        message: `year-sensitive mappings require an exact applicability window on ${version.logicalRevisionKey}`,
      });
    } else {
      for (const optionKey of governedOptions) {
        const option = optionByKey.get(optionKey);
        if (!option) continue;
        for (const year of requiredYears) {
          for (const unit of option.units) {
            const logicalKey = `${optionKey}::${year}::${unit.unitTitle}`;
            if (!yearLogical.has(logicalKey)) {
              issues.push({
                code: "missing_year_mapping_coverage",
                path: "$.yearRotationMappings",
                message: `missing mapping for option "${optionKey}" examYear ${year} unit "${unit.unitTitle}" (required by applicability ${version.applicableFromYear}-${version.applicableToYear})`,
              });
            }
          }
        }
      }
    }
  }

  return issues;
}

export function resolveRouteManifestOrThrow(
  manifest: RouteManifest,
  catalog: ReferenceCatalog,
): void {
  const issues = resolveRouteManifestAgainstCatalog(manifest, catalog);
  if (issues.length > 0) {
    throw new RouteManifestValidationError(issues);
  }
}
