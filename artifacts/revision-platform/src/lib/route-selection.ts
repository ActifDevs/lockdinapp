export type RouteSelectionMode = "none_available" | "auto" | "explicit";

export type StudyOptionGroupLike = {
  id: number;
  displayLabel: string;
  applicableQualificationTarget: "as_level" | "a_level" | "both";
  minSelections: number;
  maxSelections: number;
  options: Array<{ id: number; displayLabel: string }>;
};

export function applicableOptionGroups(
  catalogue: RouteCatalogueLike,
  routeId: number | null,
): StudyOptionGroupLike[] {
  const route = catalogue.routes.find((candidate) => candidate.id === routeId);
  if (!route) return [];
  return catalogue.optionGroups.filter(
    (group) =>
      group.applicableQualificationTarget === "both" ||
      group.applicableQualificationTarget === route.qualificationTarget,
  );
}

export function applicableOptionIds(
  catalogue: RouteCatalogueLike,
  routeId: number | null,
  optionIds: number[],
): number[] {
  const allowed = new Set(
    applicableOptionGroups(catalogue, routeId).flatMap((group) =>
      group.options.map((option) => option.id),
    ),
  );
  return optionIds.filter((id) => allowed.has(id));
}

export type RouteCatalogueLike = {
  subjectId: number;
  syllabusVersionId: number;
  selectionMode: RouteSelectionMode;
  routes: Array<{
    id: number;
    routeKey: string;
    displayLabel: string;
    qualificationTarget: string;
    components?: Array<{ componentId: number }>;
  }>;
  optionGroups: StudyOptionGroupLike[];
};

export type PastPaperRouteClassification =
  | "ON_ROUTE"
  | "OFF_ROUTE_SAME_VERSION"
  | "INVALID_VERSION_OR_UNRESOLVED";

export function classifyPastPaperComponent(args: {
  membership:
    | {
        syllabusVersionId: number;
        assessmentRouteId: number | null;
      }
    | null
    | undefined;
  routeCatalogue: RouteCatalogueLike | null | undefined;
  componentId: number | null | undefined;
  componentSyllabusVersionId?: number | null;
}): PastPaperRouteClassification {
  const {
    membership,
    routeCatalogue,
    componentId,
    componentSyllabusVersionId,
  } = args;
  if (
    !membership ||
    !routeCatalogue ||
    !Number.isInteger(componentId) ||
    membership.assessmentRouteId == null ||
    membership.syllabusVersionId !== routeCatalogue.syllabusVersionId ||
    (componentSyllabusVersionId != null &&
      componentSyllabusVersionId !== membership.syllabusVersionId)
  ) {
    return "INVALID_VERSION_OR_UNRESOLVED";
  }

  const route = routeCatalogue.routes.find(
    (candidate) => candidate.id === membership.assessmentRouteId,
  );
  if (!route || !route.components) return "INVALID_VERSION_OR_UNRESOLVED";

  return route.components.some(
    (component) => component.componentId === componentId,
  )
    ? "ON_ROUTE"
    : "OFF_ROUTE_SAME_VERSION";
}

export type SubjectRouteDraft = {
  subjectId: number;
  routeId: number | null;
  optionIds: number[];
};

export type RouteDraftValidation = {
  applicableGroups: StudyOptionGroupLike[];
  applicableOptionIds: number[];
  error?: string;
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
    catalogue.selectionMode === "auto"
      ? (catalogue.routes[0]?.id ?? null)
      : null;
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

export function validateRouteDraft(
  catalogue: RouteCatalogueLike,
  draft: SubjectRouteDraft,
): RouteDraftValidation {
  if (catalogue.selectionMode === "none_available") {
    return {
      applicableGroups: [],
      applicableOptionIds: [],
      error: "Assessment routes are not available for this subject yet.",
    };
  }

  if (draft.routeId == null) {
    return {
      applicableGroups: [],
      applicableOptionIds: [],
      error: "Choose how you are taking this subject.",
    };
  }

  if (!catalogue.routes.some((route) => route.id === draft.routeId)) {
    return {
      applicableGroups: [],
      applicableOptionIds: [],
      error: "Choose a valid assessment route.",
    };
  }

  const groups = applicableOptionGroups(catalogue, draft.routeId);
  const allowed = new Set(
    groups.flatMap((group) => group.options.map((option) => option.id)),
  );
  const optionIds = draft.optionIds.filter((id) => allowed.has(id));
  const invalidOptionIds =
    optionIds.length !== draft.optionIds.length ||
    new Set(draft.optionIds).size !== draft.optionIds.length;
  if (invalidOptionIds) {
    return {
      applicableGroups: groups,
      applicableOptionIds: [...allowed],
      error: "Remove unexpected study options.",
    };
  }

  for (const group of groups) {
    if (!optionGroupValid(group, draft.optionIds)) {
      if (group.minSelections === group.maxSelections) {
        return {
          applicableGroups: groups,
          applicableOptionIds: [...allowed],
          error: `Select ${group.minSelections} option${group.minSelections === 1 ? "" : "s"} for ${group.displayLabel}.`,
        };
      }
      return {
        applicableGroups: groups,
        applicableOptionIds: [...allowed],
        error: `Select ${group.minSelections}–${group.maxSelections} options for ${group.displayLabel}.`,
      };
    }
  }

  return {
    applicableGroups: groups,
    applicableOptionIds: [...allowed],
  };
}

export function routeDraftValidationError(
  catalogue: RouteCatalogueLike,
  draft: SubjectRouteDraft,
): string | undefined {
  return validateRouteDraft(catalogue, draft).error;
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
        optionIds: applicableOptionIds(
          catalogue,
          draft.routeId,
          draft.optionIds,
        ),
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
    catalogues.every(
      (catalogue) => catalogue.selectionMode !== "none_available",
    )
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
