import { describe, expect, it } from "vitest";
import {
  canonicalizeWeightText,
  formatWeightScaled,
  parseWeightText,
  sumWeightsScaled,
  WEIGHT_TOTAL,
} from "../weighting.js";
import { RouteManifestError } from "../errors.js";
import { parseRouteManifest } from "../parse.js";
import { validateRouteManifestSemantics } from "../validate.js";
import { stagedDecimalManifest } from "./fixtures/synthetic.js";

describe("route-manifest exact weighting", () => {
  it('normalizes "20", "20.0", "20.00", "20.0000" to "20.0000"', () => {
    for (const input of ["20", "20.0", "20.00", "20.0000"]) {
      expect(canonicalizeWeightText(input)).toBe("20.0000");
    }
  });

  it('normalizes "15.5" to "15.5000" and "23" to "23.0000"', () => {
    expect(canonicalizeWeightText("15.5")).toBe("15.5000");
    expect(canonicalizeWeightText("23")).toBe("23.0000");
  });

  it("rejects zero, negative, >100, and >4 fractional digits", () => {
    expect(() => parseWeightText("0")).toThrow(RouteManifestError);
    expect(() => parseWeightText("0.0000")).toThrow(RouteManifestError);
    expect(() => parseWeightText("-1")).toThrow(RouteManifestError);
    expect(() => parseWeightText("100.0001")).toThrow(RouteManifestError);
    expect(() => parseWeightText("1.23456")).toThrow(RouteManifestError);
    expect(() => parseWeightText("1e2")).toThrow(RouteManifestError);
    expect(() => parseWeightText("20,0")).toThrow(RouteManifestError);
  });

  it("uses exact scaled BigInt totals with no floating point", () => {
    const parts = ["20", "30", "20", "30"].map((text) => parseWeightText(text));
    expect(sumWeightsScaled(parts)).toBe(WEIGHT_TOTAL);
    expect(formatWeightScaled(sumWeightsScaled(parts))).toBe("100.0000");

    const science = ["15.5", "23", "11.5", "38.5", "11.5"].map((text) =>
      parseWeightText(text),
    );
    expect(sumWeightsScaled(science)).toBe(WEIGHT_TOTAL);
  });

  it("accepts exact 100.0000 routes and rejects 99.9999 / 100.0001", () => {
    const ok = stagedDecimalManifest();
    const { manifest, issues } = parseRouteManifest(ok);
    expect(issues).toEqual([]);
    expect(manifest).not.toBeNull();
    expect(validateRouteManifestSemantics(manifest!)).toEqual([]);

    const low = structuredClone(ok);
    low.routes[0]!.components[0]!.qualificationWeightingPercent = "15.4999";
    const lowParsed = parseRouteManifest(low);
    expect(lowParsed.manifest).not.toBeNull();
    expect(
      validateRouteManifestSemantics(lowParsed.manifest!).some(
        (issue) => issue.code === "invalid_route_total",
      ),
    ).toBe(true);

    const high = structuredClone(ok);
    high.routes[0]!.components[0]!.qualificationWeightingPercent = "15.5001";
    const highParsed = parseRouteManifest(high);
    expect(highParsed.manifest).not.toBeNull();
    expect(
      validateRouteManifestSemantics(highParsed.manifest!).some(
        (issue) => issue.code === "invalid_route_total",
      ),
    ).toBe(true);
  });
});
