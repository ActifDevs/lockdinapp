import { describe, expect, it } from "vitest";
import {
  selectionModeForRouteCount,
  validateOptionCardinality,
} from "./assessment-routes";

describe("assessment route helpers", () => {
  it("fail-closes, auto-selects, or requires explicit choice", () => {
    expect(selectionModeForRouteCount(0)).toBe("none_available");
    expect(selectionModeForRouteCount(1)).toBe("auto");
    expect(selectionModeForRouteCount(3)).toBe("explicit");
  });

  it("validates study-option cardinality generically", () => {
    expect(
      validateOptionCardinality({
        minSelections: 1,
        maxSelections: 1,
        selectedCount: 1,
      }),
    ).toBe(true);
    expect(
      validateOptionCardinality({
        minSelections: 2,
        maxSelections: 2,
        selectedCount: 1,
      }),
    ).toBe(false);
    expect(
      validateOptionCardinality({
        minSelections: 2,
        maxSelections: 3,
        selectedCount: 3,
      }),
    ).toBe(true);
  });
});
