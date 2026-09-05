export type RouteSelectionMode = "none_available" | "auto" | "explicit";

export type StudyOptionGroupLike = {
  id: number;
  displayLabel: string;
  minSelections: number;
  maxSelections: number;
  options: Array<{ id: number; displayLabel: string }>;
};

export type RouteCatalogueLike = {
  subjectId: number;
  syllabusVersionId: number;
  selectionMode: RouteSelectionMode;
  routes: Array<{
    id: number;
    routeKey: string;
    displayLabel: string;
    qualificationTarget: string;
  }>;
  optionGroups: StudyOptionGroupLike[];
};

export type SubjectRouteDraft = {
  subjectId: number;
  routeId: number | null;
  optionIds: number[];
};

export function selectionModeForRoutes(routeCount: number): RouteSelectionMode {
  if (routeCount <= 0) return "none_available";
  if (routeCount === 1) return "auto";
  return "explicit";
}

export function initialRouteDraft(
  catalogue: RouteCatalogueLike,
): SubjectRouteDraft {
  const autoRoute =
    catalogue.selectionMode === "auto" ? catalogue.routes[0]?.id ?? null : null;
  return {
    subjectId: catalogue.subjectId,
    routeId: autoRoute,
    optionIds: [],
  };
}

/**
 * Toggle one study option within a single option group.
 * maxSelections applies only to options that belong to that group —
 * selections in other groups do not consume this group's capacity.
 */
export function toggleStudyOptionSelection(
  selectedIds: number[],
  optionId: number,
  group: Pick<StudyOptionGroupLike, "maxSelections" | "options">,
): number[] {
  if (selectedIds.includes(optionId)) {
    return selectedIds.filter((id) => id !== optionId);
  }

  const groupOptionIds = new Set(group.options.map((option) => option.id));
  if (!groupOptionIds.has(optionId)) {
    return selectedIds;
  }

  const groupSelectedCount = selectedIds.filter((id) =>
    groupOptionIds.has(id),
  ).length;
  if (groupSelectedCount >= group.maxSelections) {
    return selectedIds;
  }

  return [...selectedIds, optionId];
}

export function optionGroupValid(
  group: StudyOptionGroupLike,
  selectedIds: number[],
): boolean {
  const count = selectedIds.filter((id) =>
    group.options.some((option) => option.id === id),
  ).length;
  return count >= group.minSelections && count <= group.maxSelections;
}

export function routeDraftValidationError(
  catalogue: RouteCatalogueLike,
  draft: SubjectRouteDraft,
): string | undefined {
  if (catalogue.selectionMode === "none_available") {
    return "Assessment routes are not available for this subject yet.";
  }

  if (draft.routeId == null) {
    return "Choose how you are taking this subject.";
  }

  if (!catalogue.routes.some((route) => route.id === draft.routeId)) {
    return "Choose a valid assessment route.";
  }

  for (const group of catalogue.optionGroups) {
    if (!optionGroupValid(group, draft.optionIds)) {
      if (group.minSelections === group.maxSelections) {
        return `Select ${group.minSelections} option${group.minSelections === 1 ? "" : "s"} for ${group.displayLabel}.`;
      }
      return `Select ${group.minSelections}–${group.maxSelections} options for ${group.displayLabel}.`;
    }
  }

  const allowed = new Set(
    catalogue.optionGroups.flatMap((group) => group.options.map((o) => o.id)),
  );
  if (draft.optionIds.some((id) => !allowed.has(id))) {
    return "Remove unexpected study options.";
  }

  return undefined;
}

export function routeAssignmentsPayload(
  drafts: SubjectRouteDraft[],
  catalogues: RouteCatalogueLike[],
): Array<{ subjectId: number; routeId: number; optionIds: number[] }> {
  const bySubject = new Map(catalogues.map((c) => [c.subjectId, c]));
  return drafts.flatMap((draft) => {
    const catalogue = bySubject.get(draft.subjectId);
    if (!catalogue || catalogue.selectionMode === "none_available") return [];
    if (draft.routeId == null) return [];
    return [
      {
        subjectId: draft.subjectId,
        routeId: draft.routeId,
        optionIds: draft.optionIds,
      },
    ];
  });
}

/** True when every selected subject has a publishable route catalogue. */
export function allSubjectsHaveSelectableRoutes(
  catalogues: RouteCatalogueLike[],
): boolean {
  return (
    catalogues.length > 0 &&
    catalogues.every((catalogue) => catalogue.selectionMode !== "none_available")
  );
}

export function filterComponentsByRouteDefault<T extends { id: number }>(
  components: T[],
  routeComponentIds: number[] | null | undefined,
): { defaults: T[]; offRoute: T[]; hasRouteFilter: boolean } {
  if (!routeComponentIds || routeComponentIds.length === 0) {
    return { defaults: components, offRoute: [], hasRouteFilter: false };
  }
  const allowed = new Set(routeComponentIds);
  const defaults = components.filter((c) => allowed.has(c.id));
  const offRoute = components.filter((c) => !allowed.has(c.id));
  return { defaults, offRoute, hasRouteFilter: true };
}
