import { describe, expect, it } from "vitest";
import {
  filterComponentsByRouteDefault,
  initialRouteDraft,
  optionGroupValid,
  routeAssignmentsPayload,
  routeDraftValidationError,
  selectionModeForRoutes,
  toggleStudyOptionSelection,
} from "./route-selection";

const group12 = {
  id: 1,
  displayLabel: "Options",
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

  it("supports deselect and max cap", () => {
    expect(toggleStudyOptionSelection([10], 10, 1)).toEqual([]);
    expect(toggleStudyOptionSelection([20, 21], 22, 2)).toEqual([20, 21]);
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
