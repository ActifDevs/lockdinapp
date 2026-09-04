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
  /**
   * Syllabus version lifecycle from the reference catalog (DB).
   * Required for sources[].validity fallback gating: only `retired`
   * historical versions may use manifest source validity when DB
   * applicability is intentionally null.
   */
  lifecycle?: "draft" | "published" | "retired" | "archived" | null;
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

export type ApplicabilityWindow = { from: number; to: number };

export type EffectiveApplicabilityResult =
  | { ok: true; window: ApplicabilityWindow; source: "db" | "retired_manifest_validity" }
  | {
      ok: false;
      code:
        | "missing_applicability_window"
        | "missing_source_validity"
        | "conflicting_source_validity"
        | "unparseable_source_validity";
      message: string;
    };

function parseOneValidity(raw: string): ApplicabilityWindow | "unparseable" {
  const validity = raw.trim();
  const multi = /^(\d{4})\s*[-–]\s*(\d{4})$/.exec(validity);
  if (multi) {
    const from = Number(multi[1]);
    const to = Number(multi[2]);
    if (to < from) return "unparseable";
    return { from, to };
  }
  const single = /^(\d{4})$/.exec(validity);
  if (single) {
    const year = Number(single[1]);
    return { from: year, to: year };
  }
  return "unparseable";
}

/**
 * Parse manifest sources[].validity into exactly one deterministic window.
 * Multiple distinct ranges, empty/unparseable entries → fail closed.
 */
export function parseSourceValidityYears(
  manifest: RouteManifest,
): EffectiveApplicabilityResult {
  const ranges: ApplicabilityWindow[] = [];
  for (const [index, source] of manifest.sources.entries()) {
    const raw = source.validity;
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      return {
        ok: false,
        code: "missing_source_validity",
        message: `sources[${index}].validity is required for historical year-map fallback`,
      };
    }
    const parsed = parseOneValidity(String(raw));
    if (parsed === "unparseable") {
      return {
        ok: false,
        code: "unparseable_source_validity",
        message: `sources[${index}].validity ${JSON.stringify(raw)} is not a deterministic year or year-year window`,
      };
    }
    ranges.push(parsed);
  }
  if (ranges.length === 0) {
    return {
      ok: false,
      code: "missing_source_validity",
      message: "no sources[].validity available for historical year-map fallback",
    };
  }
  const first = ranges[0]!;
  for (const range of ranges.slice(1)) {
    if (range.from !== first.from || range.to !== first.to) {
      return {
        ok: false,
        code: "conflicting_source_validity",
        message: `sources[].validity windows disagree (${first.from}-${first.to} vs ${range.from}-${range.to})`,
      };
    }
  }
  return {
    ok: true,
    window: first,
    source: "retired_manifest_validity",
  };
}

/**
 * Route-manifest / reference resolution only.
 *
 * - Published/draft/archived: DB applicability is REQUIRED for year-mapped
 *   manifests. sources[].validity must NEVER substitute.
 * - Retired historical: when DB applicability is intentionally null (overlap
 *   exclusion vs published successor), sources[].validity MAY supply the
 *   historical coverage window for year-map validation only.
 *
 * Runtime student assignment never calls this function.
 */
export function effectiveApplicabilityYears(
  version: ReferenceSyllabusVersion,
  manifest: RouteManifest,
): EffectiveApplicabilityResult {
  if (
    version.applicableFromYear !== null &&
    version.applicableToYear !== null
  ) {
    return {
      ok: true,
      window: {
        from: version.applicableFromYear,
        to: version.applicableToYear,
      },
      source: "db",
    };
  }

  if (version.lifecycle === "retired") {
    return parseSourceValidityYears(manifest);
  }

  return {
    ok: false,
    code: "missing_applicability_window",
    message: `year-sensitive mappings require DB applicability on ${version.logicalRevisionKey} (lifecycle=${version.lifecycle ?? "unknown"}); sources[].validity is not a forward-assignment substitute`,
  };
}

function yearSupported(
  window: ApplicabilityWindow | null,
  examYear: number,
): boolean {
  if (!window) return false;
  return examYear >= window.from && examYear <= window.to;
}

/** Inclusive integer years from an effective applicability window. */
export function requiredApplicabilityYears(
  window: ApplicabilityWindow | null,
): number[] | null {
  if (!window) return null;
  if (window.to < window.from) return null;
  const years: number[] = [];
  for (let year = window.from; year <= window.to; year += 1) {
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
  const applicability = effectiveApplicabilityYears(version, manifest);
  const applicabilityWindow = applicability.ok ? applicability.window : null;

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
    if (applicability.ok && !yearSupported(applicabilityWindow, mapping.examYear)) {
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
    if (!applicability.ok) {
      issues.push({
        code: applicability.code,
        path:
          applicability.code === "missing_applicability_window"
            ? "$.syllabusRevisionKey"
            : "$.sources",
        message: applicability.message,
      });
    } else {
      const requiredYears = requiredApplicabilityYears(applicability.window);
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
                  message: `missing mapping for option "${optionKey}" examYear ${year} unit "${unit.unitTitle}" (required by applicability ${applicability.window.from}-${applicability.window.to})`,
                });
              }
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
