import {
  RouteManifestValidationError,
  type RouteManifestIssue,
} from "./errors.js";
import type {
  ComponentRef,
  RouteManifest,
  UnitRef,
} from "./types.js";
import {
  assertExactRouteTotal,
  parseWeightText,
} from "./weighting.js";

function componentIdentity(ref: ComponentRef): string {
  return `${ref.paperCode}|${ref.level}`;
}

function evidenceSourceKey(ref: string): string {
  const hash = ref.indexOf("#");
  return hash === -1 ? ref : ref.slice(0, hash);
}

function groupAppliesToRoute(
  groupQualification: RouteManifest["studyOptionGroups"][number]["qualificationTarget"],
  routeTarget: RouteManifest["routes"][number]["qualificationTarget"],
): boolean {
  if (groupQualification === "both") return true;
  return groupQualification === routeTarget;
}

function pushUnique(
  issues: RouteManifestIssue[],
  issue: RouteManifestIssue,
): void {
  if (
    issues.some(
      (existing) =>
        existing.code === issue.code &&
        existing.path === issue.path &&
        existing.message === issue.message,
    )
  ) {
    return;
  }
  issues.push(issue);
}

/**
 * Semantic validation for a structurally parsed manifest.
 * Does not require database resolution (see resolve.ts for that layer).
 */
export function validateRouteManifestSemantics(
  manifest: RouteManifest,
): RouteManifestIssue[] {
  const issues: RouteManifestIssue[] = [];

  // Sources uniqueness + evidence resolution
  const sourceKeys = new Set<string>();
  for (const [index, source] of manifest.sources.entries()) {
    if (sourceKeys.has(source.sourceKey)) {
      pushUnique(issues, {
        code: "duplicate_source_key",
        path: `$.sources[${index}].sourceKey`,
        message: `duplicate sourceKey "${source.sourceKey}"`,
      });
    }
    sourceKeys.add(source.sourceKey);
  }

  // Routes uniqueness
  const routeKeys = new Set<string>();
  const routeOrders = new Set<number>();
  for (const [routeIndex, route] of manifest.routes.entries()) {
    const routePath = `$.routes[${routeIndex}]`;
    if (routeKeys.has(route.key)) {
      pushUnique(issues, {
        code: "duplicate_route_key",
        path: `${routePath}.key`,
        message: `duplicate route key "${route.key}"`,
      });
    }
    routeKeys.add(route.key);

    if (routeOrders.has(route.orderIndex)) {
      pushUnique(issues, {
        code: "duplicate_route_order",
        path: `${routePath}.orderIndex`,
        message: `duplicate route orderIndex ${route.orderIndex}`,
      });
    }
    routeOrders.add(route.orderIndex);

    for (const [refIndex, ref] of route.evidenceRefs.entries()) {
      const sourceKey = evidenceSourceKey(ref);
      if (!sourceKeys.has(sourceKey)) {
        pushUnique(issues, {
          code: "missing_evidence_source",
          path: `${routePath}.evidenceRefs[${refIndex}]`,
          message: `evidence reference "${ref}" does not resolve to a declared source`,
        });
      }
    }

    const componentIds = new Set<string>();
    const componentOrders = new Set<number>();
    const scaledWeights: bigint[] = [];
    for (const [compIndex, component] of route.components.entries()) {
      const compPath = `${routePath}.components[${compIndex}]`;
      const identity = componentIdentity(component);
      if (componentIds.has(identity)) {
        pushUnique(issues, {
          code: "duplicate_route_component",
          path: compPath,
          message: `duplicate component identity "${identity}" in route`,
        });
      }
      componentIds.add(identity);

      if (componentOrders.has(component.orderIndex)) {
        pushUnique(issues, {
          code: "duplicate_component_order",
          path: `${compPath}.orderIndex`,
          message: `duplicate component orderIndex ${component.orderIndex}`,
        });
      }
      componentOrders.add(component.orderIndex);

      try {
        scaledWeights.push(
          parseWeightText(
            component.qualificationWeightingPercent,
            `${compPath}.qualificationWeightingPercent`,
          ),
        );
      } catch (error) {
        pushUnique(issues, {
          code: "invalid_weight",
          path: `${compPath}.qualificationWeightingPercent`,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (scaledWeights.length === route.components.length) {
      try {
        assertExactRouteTotal(scaledWeights, `${routePath}.components`);
      } catch (error) {
        pushUnique(issues, {
          code: "invalid_route_total",
          path: `${routePath}.components`,
          message: error instanceof Error ? error.message.replace(/^[^:]+:\s*/, "") : String(error),
        });
      }
    }
  }

  // Qualification-weight consistency across routes for same component + qualification target
  const weightByTargetComponent = new Map<string, { weight: string; path: string }>();
  for (const [routeIndex, route] of manifest.routes.entries()) {
    for (const [compIndex, component] of route.components.entries()) {
      const key = `${route.qualificationTarget}::${componentIdentity(component)}`;
      const path = `$.routes[${routeIndex}].components[${compIndex}].qualificationWeightingPercent`;
      const existing = weightByTargetComponent.get(key);
      if (existing && existing.weight !== component.qualificationWeightingPercent) {
        pushUnique(issues, {
          code: "inconsistent_qualification_weight",
          path,
          message: `component "${componentIdentity(component)}" under ${route.qualificationTarget} has conflicting weightings (${existing.weight} vs ${component.qualificationWeightingPercent})`,
        });
      } else if (!existing) {
        weightByTargetComponent.set(key, {
          weight: component.qualificationWeightingPercent,
          path,
        });
      }
    }
  }

  // Option groups
  const groupKeys = new Set<string>();
  const groupOrders = new Set<number>();
  const optionByKey = new Map<
    string,
    { groupKey: string; units: UnitRef[]; path: string }
  >();

  for (const [groupIndex, group] of manifest.studyOptionGroups.entries()) {
    const groupPath = `$.studyOptionGroups[${groupIndex}]`;
    if (groupKeys.has(group.key)) {
      pushUnique(issues, {
        code: "duplicate_group_key",
        path: `${groupPath}.key`,
        message: `duplicate group key "${group.key}"`,
      });
    }
    groupKeys.add(group.key);

    if (groupOrders.has(group.orderIndex)) {
      pushUnique(issues, {
        code: "duplicate_group_order",
        path: `${groupPath}.orderIndex`,
        message: `duplicate group orderIndex ${group.orderIndex}`,
      });
    }
    groupOrders.add(group.orderIndex);

    if (group.minSelections < 1) {
      pushUnique(issues, {
        code: "invalid_cardinality",
        path: `${groupPath}.minSelections`,
        message: "minSelections must be >= 1",
      });
    }
    if (group.maxSelections < group.minSelections) {
      pushUnique(issues, {
        code: "invalid_cardinality",
        path: `${groupPath}.maxSelections`,
        message: "maxSelections must be >= minSelections",
      });
    }

    const optionKeys = new Set<string>();
    const optionOrders = new Set<number>();
    for (const [optionIndex, option] of group.options.entries()) {
      const optionPath = `${groupPath}.options[${optionIndex}]`;
      if (optionKeys.has(option.key)) {
        pushUnique(issues, {
          code: "duplicate_option_key",
          path: `${optionPath}.key`,
          message: `duplicate option key "${option.key}" in group`,
        });
      }
      optionKeys.add(option.key);

      if (optionOrders.has(option.orderIndex)) {
        pushUnique(issues, {
          code: "duplicate_option_order",
          path: `${optionPath}.orderIndex`,
          message: `duplicate option orderIndex ${option.orderIndex}`,
        });
      }
      optionOrders.add(option.orderIndex);

      if (optionByKey.has(option.key)) {
        pushUnique(issues, {
          code: "duplicate_global_option_key",
          path: `${optionPath}.key`,
          message: `option key "${option.key}" must be unique across the manifest for year-mapping references`,
        });
      }

      const unitTitles = new Set<string>();
      for (const [unitIndex, unit] of option.units.entries()) {
        if (unitTitles.has(unit.unitTitle)) {
          pushUnique(issues, {
            code: "duplicate_option_unit",
            path: `${optionPath}.units[${unitIndex}]`,
            message: `duplicate unitTitle "${unit.unitTitle}" in option`,
          });
        }
        unitTitles.add(unit.unitTitle);
      }

      optionByKey.set(option.key, {
        groupKey: group.key,
        units: option.units,
        path: optionPath,
      });
    }

    const distinctOptions = optionKeys.size;
    if (group.maxSelections > distinctOptions) {
      pushUnique(issues, {
        code: "unsatisfiable_cardinality",
        path: `${groupPath}.maxSelections`,
        message: `maxSelections (${group.maxSelections}) exceeds distinct option count (${distinctOptions})`,
      });
    }
    if (group.minSelections > distinctOptions) {
      pushUnique(issues, {
        code: "unsatisfiable_cardinality",
        path: `${groupPath}.minSelections`,
        message: `minSelections (${group.minSelections}) exceeds distinct option count (${distinctOptions})`,
      });
    }

    // Dead group: must apply to at least one route, and if component-scoped, that route must contain it.
    const compatibleRoutes = manifest.routes.filter((route) =>
      groupAppliesToRoute(group.qualificationTarget, route.qualificationTarget),
    );
    if (compatibleRoutes.length === 0) {
      pushUnique(issues, {
        code: "dead_option_group",
        path: groupPath,
        message: `option group qualificationTarget "${group.qualificationTarget}" matches no route`,
      });
    } else if (group.applicableComponent) {
      const identity = componentIdentity(group.applicableComponent);
      const containing = compatibleRoutes.filter((route) =>
        route.components.some(
          (component) => componentIdentity(component) === identity,
        ),
      );
      if (containing.length === 0) {
        pushUnique(issues, {
          code: "dead_option_group",
          path: `${groupPath}.applicableComponent`,
          message: `applicable component "${identity}" is not present in any compatible route`,
        });
      }
    }
  }

  // Year mappings — structural/logical checks only.
  // Authoritative year-coverage uses the syllabus applicability window in resolve.ts.
  const yearLogical = new Map<string, { component: string; path: string }>();

  for (const [mapIndex, mapping] of manifest.yearRotationMappings.entries()) {
    const mapPath = `$.yearRotationMappings[${mapIndex}]`;
    const option = optionByKey.get(mapping.optionKey);
    if (!option) {
      pushUnique(issues, {
        code: "unknown_year_mapping_option",
        path: `${mapPath}.optionKey`,
        message: `unknown optionKey "${mapping.optionKey}"`,
      });
      continue;
    }

    const unitOk = option.units.some(
      (unit) => unit.unitTitle === mapping.unit.unitTitle,
    );
    if (!unitOk) {
      pushUnique(issues, {
        code: "year_mapping_unit_outside_option",
        path: `${mapPath}.unit`,
        message: `unitTitle "${mapping.unit.unitTitle}" does not belong to option "${mapping.optionKey}"`,
      });
    }

    const logicalKey = `${mapping.optionKey}::${mapping.examYear}::${mapping.unit.unitTitle}`;
    const componentId = componentIdentity(mapping.component);
    const existing = yearLogical.get(logicalKey);
    if (existing) {
      pushUnique(issues, {
        code:
          existing.component === componentId
            ? "duplicate_year_mapping"
            : "conflicting_year_mapping",
        path: mapPath,
        message: `option/year/unit mapping already declared for ${logicalKey}`,
      });
    } else {
      yearLogical.set(logicalKey, { component: componentId, path: mapPath });
    }
  }

  return issues;
}

export function validateRouteManifestOrThrow(manifest: RouteManifest): void {
  const issues = validateRouteManifestSemantics(manifest);
  if (issues.length > 0) {
    throw new RouteManifestValidationError(issues);
  }
}
