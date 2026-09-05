import { describe, expect, it } from "vitest";
import {
  applicableOptionGroups,
  applicableOptionIds,
  filterComponentsByRouteDefault,
  initialRouteDraft,
  optionGroupValid,
  routeAssignmentsPayload,
  routeDraftValidationError,
  selectionModeForRoutes,
  toggleStudyOptionSelection,
  type RouteCatalogueLike,
  type StudyOptionGroupLike,
} from "./route-selection";

const group12 = {
  id: 1,
  displayLabel: "Options",
  applicableQualificationTarget: "both" as const,
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: 10, displayLabel: "A" },
    { id: 11, displayLabel: "B" },
  ],
};

const group22 = {
  ...group12,
  id: 2,
  minSelections: 2,
  maxSelections: 2,
  options: [
    { id: 20, displayLabel: "A" },
    { id: 21, displayLabel: "B" },
    { id: 22, displayLabel: "C" },
  ],
};

const group23 = {
  ...group12,
  id: 3,
  minSelections: 2,
  maxSelections: 3,
  options: [
    { id: 30, displayLabel: "A" },
    { id: 31, displayLabel: "B" },
    { id: 32, displayLabel: "C" },
  ],
};

/** Production-shaped History 9489 Full A Level: three required 1/1 groups. */
const historyAsOption: StudyOptionGroupLike = {
  id: 4,
  displayLabel: "AS History Option",
  applicableQualificationTarget: "both",
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: 10, displayLabel: "Modern Europe, 1774–1924" },
    { id: 11, displayLabel: "The History of the USA, 1820–1941" },
    { id: 12, displayLabel: "International History, 1870–1939" },
  ],
};

const historyPaper3: StudyOptionGroupLike = {
  id: 5,
  displayLabel: "Paper 3 Prescribed Topic",
  applicableQualificationTarget: "a_level",
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: 13, displayLabel: "The origins of the First World War" },
    { id: 14, displayLabel: "The Holocaust" },
    { id: 15, displayLabel: "The origins and development of the Cold War" },
  ],
};

const historyPaper4: StudyOptionGroupLike = {
  id: 6,
  displayLabel: "Paper 4 Depth Study Option",
  applicableQualificationTarget: "a_level",
  minSelections: 1,
  maxSelections: 1,
  options: [
    {
      id: 16,
      displayLabel:
        "Depth Study 1: European History in the interwar years, 1919–41",
    },
    { id: 17, displayLabel: "Depth Study 2: The USA, 1945–93" },
    { id: 18, displayLabel: "Depth Study 3: International History, 1909–94" },
  ],
};

const historyCatalogue: RouteCatalogueLike = {
  subjectId: 2,
  syllabusVersionId: 19,
  selectionMode: "explicit",
  routes: [
    {
      id: 14,
      routeKey: "as_single_series",
      displayLabel: "AS Level — Papers 1 + 2 this exam series",
      qualificationTarget: "as_level",
    },
    {
      id: 15,
      routeKey: "a_staged_completion",
      displayLabel: "Complete A Level — carry forward AS, take Papers 3 + 4",
      qualificationTarget: "a_level",
    },
    {
      id: 16,
      routeKey: "a_full_same_series",
      displayLabel: "Full A Level — Papers 1–4 this exam series",
      qualificationTarget: "a_level",
    },
  ],
  optionGroups: [historyAsOption, historyPaper3, historyPaper4],
};

/** Geography 9696: two independent 2/2 groups. */
const geographyPhysical: StudyOptionGroupLike = {
  id: 20,
  displayLabel: "Paper 3 Advanced Physical Geography Options",
  applicableQualificationTarget: "a_level",
  minSelections: 2,
  maxSelections: 2,
  options: [
    { id: 201, displayLabel: "Tropical environments" },
    { id: 202, displayLabel: "Coastal environments" },
    { id: 203, displayLabel: "Hazardous environments" },
  ],
};

const geographyHuman: StudyOptionGroupLike = {
  id: 21,
  displayLabel: "Paper 4 Advanced Human Geography Options",
  applicableQualificationTarget: "a_level",
  minSelections: 2,
  maxSelections: 2,
  options: [
    { id: 211, displayLabel: "Production, location and change" },
    { id: 212, displayLabel: "Environmental management" },
    { id: 213, displayLabel: "Global interdependence" },
  ],
};

const geographyCatalogue: RouteCatalogueLike = {
  subjectId: 9696,
  syllabusVersionId: 1,
  selectionMode: "explicit",
  routes: [
    {
      id: 90,
      routeKey: "a_full",
      displayLabel: "Full A Level",
      qualificationTarget: "a_level",
    },
  ],
  optionGroups: [geographyPhysical, geographyHuman],
};

/** Psychology 9990: one 2/2 group. */
const psychologyGroup: StudyOptionGroupLike = {
  id: 30,
  displayLabel: "Specialist options",
  applicableQualificationTarget: "a_level",
  minSelections: 2,
  maxSelections: 2,
  options: [
    { id: 301, displayLabel: "Psychology and abnormality" },
    { id: 302, displayLabel: "Psychology of consumer behaviour" },
    { id: 303, displayLabel: "Psychology and health" },
  ],
};

const psychologyCatalogue: RouteCatalogueLike = {
  subjectId: 9990,
  syllabusVersionId: 1,
  selectionMode: "auto",
  routes: [
    {
      id: 91,
      routeKey: "a_full",
      displayLabel: "Full A Level",
      qualificationTarget: "a_level",
    },
  ],
  optionGroups: [psychologyGroup],
};

/** Sociology 9699: one 2/3 group. */
const sociologyGroup: StudyOptionGroupLike = {
  id: 40,
  displayLabel: "Paper 4 Globalisation, Media and Religion",
  applicableQualificationTarget: "a_level",
  minSelections: 2,
  maxSelections: 3,
  options: [
    { id: 401, displayLabel: "Globalisation" },
    { id: 402, displayLabel: "Media" },
    { id: 403, displayLabel: "Religion" },
  ],
};

const sociologyCatalogue: RouteCatalogueLike = {
  subjectId: 9699,
  syllabusVersionId: 1,
  selectionMode: "auto",
  routes: [
    {
      id: 92,
      routeKey: "a_full",
      displayLabel: "Full A Level",
      qualificationTarget: "a_level",
    },
  ],
  optionGroups: [sociologyGroup],
};

const economicsNoOptionCatalogue: RouteCatalogueLike = {
  subjectId: 8,
  syllabusVersionId: 12,
  selectionMode: "explicit",
  routes: [
    {
      id: 81,
      routeKey: "as",
      displayLabel: "AS Level",
      qualificationTarget: "as_level",
    },
    {
      id: 82,
      routeKey: "al",
      displayLabel: "Full A Level",
      qualificationTarget: "a_level",
    },
  ],
  optionGroups: [],
};

describe("route selection helpers", () => {
  it("maps route counts to selection modes", () => {
    expect(selectionModeForRoutes(0)).toBe("none_available");
    expect(selectionModeForRoutes(1)).toBe("auto");
    expect(selectionModeForRoutes(2)).toBe("explicit");
  });

  it("auto-selects the single route", () => {
    const draft = initialRouteDraft({
      subjectId: 1,
      syllabusVersionId: 9,
      selectionMode: "auto",
      routes: [
        {
          id: 44,
          routeKey: "al",
          displayLabel: "A Level",
          qualificationTarget: "a_level",
        },
      ],
      optionGroups: [],
    });
    expect(draft.routeId).toBe(44);
  });

  it("validates 1/1, 2/2, and 2/3 study-option cardinality", () => {
    expect(optionGroupValid(group12, [10])).toBe(true);
    expect(optionGroupValid(group12, [])).toBe(false);
    expect(optionGroupValid(group12, [10, 11])).toBe(false);

    expect(optionGroupValid(group22, [20, 21])).toBe(true);
    expect(optionGroupValid(group22, [20])).toBe(false);

    expect(optionGroupValid(group23, [30, 31])).toBe(true);
    expect(optionGroupValid(group23, [30, 31, 32])).toBe(true);
    expect(optionGroupValid(group23, [30])).toBe(false);
  });

  it("supports deselect and per-group max cap", () => {
    expect(toggleStudyOptionSelection([10], 10, group12)).toEqual([]);
    expect(toggleStudyOptionSelection([20, 21], 22, group22)).toEqual([20, 21]);
  });

  it("requires explicit route when multi-route", () => {
    const catalogue = {
      subjectId: 1,
      syllabusVersionId: 9,
      selectionMode: "explicit" as const,
      routes: [
        {
          id: 1,
          routeKey: "as",
          displayLabel: "AS",
          qualificationTarget: "as_level",
        },
        {
          id: 2,
          routeKey: "al",
          displayLabel: "A Level",
          qualificationTarget: "a_level",
        },
      ],
      optionGroups: [],
    };
    expect(
      routeDraftValidationError(catalogue, {
        subjectId: 1,
        routeId: null,
        optionIds: [],
      }),
    ).toMatch(/taking this subject/i);
  });

  it("blocks new membership when no published routes exist", () => {
    const catalogue = {
      subjectId: 1,
      syllabusVersionId: 9,
      selectionMode: "none_available" as const,
      routes: [],
      optionGroups: [],
    };
    expect(
      routeDraftValidationError(catalogue, {
        subjectId: 1,
        routeId: null,
        optionIds: [],
      }),
    ).toMatch(/not available/i);
  });

  it("builds route assignment payload only when routes exist", () => {
    expect(
      routeAssignmentsPayload(
        [{ subjectId: 1, routeId: null, optionIds: [] }],
        [
          {
            subjectId: 1,
            syllabusVersionId: 9,
            selectionMode: "none_available",
            routes: [],
            optionGroups: [],
          },
        ],
      ),
    ).toEqual([]);
  });

  it("filters past-paper components by route default", () => {
    const components = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const filtered = filterComponentsByRouteDefault(components, [1, 3]);
    expect(filtered.defaults.map((c) => c.id)).toEqual([1, 3]);
    expect(filtered.offRoute.map((c) => c.id)).toEqual([2]);
    expect(filtered.hasRouteFilter).toBe(true);
  });
});

describe("B5D-003 History 9489 multi-group study options", () => {
  it("allows one selection in each of three 1/1 groups simultaneously", () => {
    let selected: number[] = [];
    selected = toggleStudyOptionSelection(selected, 10, historyAsOption);
    expect(selected).toEqual([10]);
    selected = toggleStudyOptionSelection(selected, 14, historyPaper3);
    expect(selected).toEqual([10, 14]);
    selected = toggleStudyOptionSelection(selected, 17, historyPaper4);
    expect(selected).toEqual([10, 14, 17]);
  });

  it("blocks same-group over-selection while preserving the original choice", () => {
    for (const group of [historyAsOption, historyPaper3, historyPaper4]) {
      const first = group.options[0]!.id;
      const second = group.options[1]!.id;
      let selected = toggleStudyOptionSelection([], first, group);
      selected = toggleStudyOptionSelection(selected, second, group);
      expect(selected).toEqual([first]);
      selected = toggleStudyOptionSelection(selected, first, group);
      selected = toggleStudyOptionSelection(selected, second, group);
      expect(selected).toEqual([second]);
    }
  });

  it("is invalid until every required History group is satisfied", () => {
    const base = {
      subjectId: 2,
      routeId: 16,
      optionIds: [] as number[],
    };
    expect(routeDraftValidationError(historyCatalogue, base)).toMatch(
      /AS History Option/i,
    );
    expect(
      routeDraftValidationError(historyCatalogue, {
        ...base,
        optionIds: [10],
      }),
    ).toMatch(/Paper 3 Prescribed Topic/i);
    expect(
      routeDraftValidationError(historyCatalogue, {
        ...base,
        optionIds: [10, 14],
      }),
    ).toMatch(/Paper 4 Depth Study Option/i);
    expect(
      routeDraftValidationError(historyCatalogue, {
        ...base,
        optionIds: [10, 14, 17],
      }),
    ).toBeUndefined();
  });

  it("builds a Full A Level payload with one option from each group", () => {
    const payload = routeAssignmentsPayload(
      [{ subjectId: 2, routeId: 16, optionIds: [10, 14, 17] }],
      [historyCatalogue],
    );
    expect(payload).toEqual([
      { subjectId: 2, routeId: 16, optionIds: [10, 14, 17] },
    ]);
  });
});

describe("B5D-005 History 9489 route applicability", () => {
  it("requires only the both-target AS group for the AS route", () => {
    expect(
      applicableOptionGroups(historyCatalogue, 14).map((group) => group.id),
    ).toEqual([historyAsOption.id]);
    expect(
      routeDraftValidationError(historyCatalogue, {
        subjectId: 2,
        routeId: 14,
        optionIds: [],
      }),
    ).toMatch(/AS History Option/i);
    expect(
      routeDraftValidationError(historyCatalogue, {
        subjectId: 2,
        routeId: 14,
        optionIds: [10],
      }),
    ).toBeUndefined();
  });

  it("requires all three applicable groups for Complete and Full A Level", () => {
    for (const routeId of [15, 16]) {
      expect(
        applicableOptionGroups(historyCatalogue, routeId).map(
          (group) => group.id,
        ),
      ).toEqual([historyAsOption.id, historyPaper3.id, historyPaper4.id]);
      expect(
        routeDraftValidationError(historyCatalogue, {
          subjectId: 2,
          routeId,
          optionIds: [10, 14],
        }),
      ).toMatch(/Paper 4/i);
      expect(
        routeDraftValidationError(historyCatalogue, {
          subjectId: 2,
          routeId,
          optionIds: [10, 14, 17],
        }),
      ).toBeUndefined();
    }
  });

  it("removes stale A-Level options from an AS draft and payload", () => {
    expect(applicableOptionIds(historyCatalogue, 14, [10, 14, 17])).toEqual([
      10,
    ]);
    expect(
      routeAssignmentsPayload(
        [{ subjectId: 2, routeId: 14, optionIds: [10, 14, 17] }],
        [historyCatalogue],
      ),
    ).toEqual([{ subjectId: 2, routeId: 14, optionIds: [10] }]);
    expect(applicableOptionIds(historyCatalogue, 16, [10])).toEqual([10]);
    expect(
      routeDraftValidationError(historyCatalogue, {
        subjectId: 2,
        routeId: 16,
        optionIds: [10],
      }),
    ).toMatch(/Paper 3/i);
  });
});

describe("B5D-003 Geography 9696 two × 2/2 groups", () => {
  it("allows four total selections across independent 2/2 groups", () => {
    let selected: number[] = [];
    selected = toggleStudyOptionSelection(selected, 201, geographyPhysical);
    selected = toggleStudyOptionSelection(selected, 202, geographyPhysical);
    selected = toggleStudyOptionSelection(selected, 211, geographyHuman);
    selected = toggleStudyOptionSelection(selected, 212, geographyHuman);
    expect(selected).toEqual([201, 202, 211, 212]);
    expect(
      routeDraftValidationError(geographyCatalogue, {
        subjectId: 9696,
        routeId: 90,
        optionIds: selected,
      }),
    ).toBeUndefined();
  });

  it("blocks a third option inside the same 2/2 group", () => {
    let selected = toggleStudyOptionSelection([], 201, geographyPhysical);
    selected = toggleStudyOptionSelection(selected, 202, geographyPhysical);
    selected = toggleStudyOptionSelection(selected, 203, geographyPhysical);
    expect(selected).toEqual([201, 202]);
  });
});

describe("B5D-003 Psychology 9990 single 2/2 group", () => {
  it("requires exactly two options and blocks a third", () => {
    expect(
      routeDraftValidationError(psychologyCatalogue, {
        subjectId: 9990,
        routeId: 91,
        optionIds: [],
      }),
    ).toBeDefined();
    expect(
      routeDraftValidationError(psychologyCatalogue, {
        subjectId: 9990,
        routeId: 91,
        optionIds: [301],
      }),
    ).toBeDefined();
    expect(
      routeDraftValidationError(psychologyCatalogue, {
        subjectId: 9990,
        routeId: 91,
        optionIds: [301, 302],
      }),
    ).toBeUndefined();

    let selected = toggleStudyOptionSelection([], 301, psychologyGroup);
    selected = toggleStudyOptionSelection(selected, 302, psychologyGroup);
    selected = toggleStudyOptionSelection(selected, 303, psychologyGroup);
    expect(selected).toEqual([301, 302]);
  });
});

describe("B5D-003 Sociology 9699 single 2/3 group", () => {
  it("accepts 2 or 3 selections and cannot exceed the catalogue", () => {
    expect(
      routeDraftValidationError(sociologyCatalogue, {
        subjectId: 9699,
        routeId: 92,
        optionIds: [],
      }),
    ).toBeDefined();
    expect(
      routeDraftValidationError(sociologyCatalogue, {
        subjectId: 9699,
        routeId: 92,
        optionIds: [401],
      }),
    ).toBeDefined();
    expect(
      routeDraftValidationError(sociologyCatalogue, {
        subjectId: 9699,
        routeId: 92,
        optionIds: [401, 402],
      }),
    ).toBeUndefined();
    expect(
      routeDraftValidationError(sociologyCatalogue, {
        subjectId: 9699,
        routeId: 92,
        optionIds: [401, 402, 403],
      }),
    ).toBeUndefined();

    let selected = toggleStudyOptionSelection([], 401, sociologyGroup);
    selected = toggleStudyOptionSelection(selected, 402, sociologyGroup);
    selected = toggleStudyOptionSelection(selected, 403, sociologyGroup);
    expect(selected).toEqual([401, 402, 403]);
    // Catalogue has only three options — fourth cannot be fabricated.
  });
});

describe("B5D-003 no-option and multi-subject independence", () => {
  it("treats no-option routes as valid after route selection", () => {
    expect(
      routeDraftValidationError(economicsNoOptionCatalogue, {
        subjectId: 8,
        routeId: 82,
        optionIds: [],
      }),
    ).toBeUndefined();
    expect(
      routeAssignmentsPayload(
        [{ subjectId: 8, routeId: 82, optionIds: [] }],
        [economicsNoOptionCatalogue],
      ),
    ).toEqual([{ subjectId: 8, routeId: 82, optionIds: [] }]);
  });

  it("keeps History and Economics drafts independent in the payload", () => {
    const payload = routeAssignmentsPayload(
      [
        { subjectId: 2, routeId: 16, optionIds: [10, 14, 17] },
        { subjectId: 8, routeId: 82, optionIds: [] },
      ],
      [historyCatalogue, economicsNoOptionCatalogue],
    );
    expect(payload).toEqual([
      { subjectId: 2, routeId: 16, optionIds: [10, 14, 17] },
      { subjectId: 8, routeId: 82, optionIds: [] },
    ]);
  });
});
