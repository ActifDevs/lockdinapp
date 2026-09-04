import { and, asc, eq, inArray } from "drizzle-orm";
import {
  db,
  assessmentRouteSetsTable,
  assessmentRoutesTable,
  assessmentRouteComponentsTable,
  assessmentStudyOptionGroupsTable,
  assessmentStudyOptionsTable,
  assessmentComponentsTable,
  syllabusVersionsTable,
} from "@workspace/db";

export type RouteSelectionMode = "none_available" | "auto" | "explicit";

export function selectionModeForRouteCount(count: number): RouteSelectionMode {
  if (count <= 0) return "none_available";
  if (count === 1) return "auto";
  return "explicit";
}

export function validateOptionCardinality(args: {
  minSelections: number;
  maxSelections: number;
  selectedCount: number;
}): boolean {
  return (
    args.selectedCount >= args.minSelections &&
    args.selectedCount <= args.maxSelections
  );
}

/**
 * Load published assessment route catalogue for a subject version.
 * Empty catalogue when no published route set exists (pre-publication compatible).
 */
export async function loadPublishedRouteCatalogue(
  subjectId: number,
  syllabusVersionId: number,
) {
  const [version] = await db
    .select({
      id: syllabusVersionsTable.id,
      subjectId: syllabusVersionsTable.subjectId,
    })
    .from(syllabusVersionsTable)
    .where(eq(syllabusVersionsTable.id, syllabusVersionId))
    .limit(1);

  if (!version || version.subjectId !== subjectId) {
    return { kind: "not_found" as const };
  }

  const sets = await db
    .select()
    .from(assessmentRouteSetsTable)
    .where(
      and(
        eq(assessmentRouteSetsTable.syllabusVersionId, syllabusVersionId),
        eq(assessmentRouteSetsTable.lifecycle, "published"),
      ),
    )
    .orderBy(asc(assessmentRouteSetsTable.id));

  if (sets.length > 1) {
    return { kind: "ambiguous" as const };
  }

  if (sets.length === 0) {
    return {
      kind: "ok" as const,
      catalogue: {
        subjectId,
        syllabusVersionId,
        routeSetId: null,
        routeRevisionKey: null,
        selectionMode: "none_available" as const,
        routes: [],
        optionGroups: [],
      },
    };
  }

  const routeSet = sets[0]!;
  const routes = await db
    .select()
    .from(assessmentRoutesTable)
    .where(
      and(
        eq(assessmentRoutesTable.routeSetId, routeSet.id),
        eq(assessmentRoutesTable.syllabusVersionId, syllabusVersionId),
      ),
    )
    .orderBy(asc(assessmentRoutesTable.orderIndex), asc(assessmentRoutesTable.id));

  const routeIds = routes.map((r) => r.id);
  const components =
    routeIds.length === 0
      ? []
      : await db
          .select({
            routeId: assessmentRouteComponentsTable.routeId,
            componentId: assessmentRouteComponentsTable.componentId,
            role: assessmentRouteComponentsTable.role,
            orderIndex: assessmentRouteComponentsTable.orderIndex,
            paperCode: assessmentComponentsTable.paperCode,
            componentLabel: assessmentComponentsTable.componentName,
          })
          .from(assessmentRouteComponentsTable)
          .innerJoin(
            assessmentComponentsTable,
            and(
              eq(
                assessmentComponentsTable.id,
                assessmentRouteComponentsTable.componentId,
              ),
              eq(
                assessmentComponentsTable.syllabusVersionId,
                syllabusVersionId,
              ),
            ),
          )
          .where(inArray(assessmentRouteComponentsTable.routeId, routeIds))
          .orderBy(asc(assessmentRouteComponentsTable.orderIndex));

  const groups = await db
    .select()
    .from(assessmentStudyOptionGroupsTable)
    .where(
      and(
        eq(assessmentStudyOptionGroupsTable.routeSetId, routeSet.id),
        eq(assessmentStudyOptionGroupsTable.syllabusVersionId, syllabusVersionId),
      ),
    )
    .orderBy(
      asc(assessmentStudyOptionGroupsTable.orderIndex),
      asc(assessmentStudyOptionGroupsTable.id),
    );

  const groupIds = groups.map((g) => g.id);
  const options =
    groupIds.length === 0
      ? []
      : await db
          .select()
          .from(assessmentStudyOptionsTable)
          .where(
            and(
              inArray(assessmentStudyOptionsTable.groupId, groupIds),
              eq(assessmentStudyOptionsTable.syllabusVersionId, syllabusVersionId),
            ),
          )
          .orderBy(
            asc(assessmentStudyOptionsTable.orderIndex),
            asc(assessmentStudyOptionsTable.id),
          );

  return {
    kind: "ok" as const,
    catalogue: {
      subjectId,
      syllabusVersionId,
      routeSetId: routeSet.id,
      routeRevisionKey: routeSet.routeRevisionKey,
      selectionMode: selectionModeForRouteCount(routes.length),
      routes: routes.map((route) => ({
        id: route.id,
        routeKey: route.routeKey,
        displayLabel: route.displayLabel,
        qualificationTarget: route.qualificationTarget,
        pathwayType: route.pathwayType,
        progressionEligibility: route.progressionEligibility,
        orderIndex: route.orderIndex,
        components: components
          .filter((c) => c.routeId === route.id)
          .map((c) => ({
            componentId: c.componentId,
            paperCode: c.paperCode,
            componentLabel: c.componentLabel,
            role: c.role,
            orderIndex: c.orderIndex,
          })),
      })),
      optionGroups: groups.map((group) => ({
        id: group.id,
        groupKey: group.groupKey,
        displayLabel: group.displayLabel,
        minSelections: group.minSelections,
        maxSelections: group.maxSelections,
        orderIndex: group.orderIndex,
        options: options
          .filter((o) => o.groupId === group.id)
          .map((o) => ({
            id: o.id,
            optionKey: o.optionKey,
            displayLabel: o.displayLabel,
            orderIndex: o.orderIndex,
          })),
      })),
    },
  };
}
