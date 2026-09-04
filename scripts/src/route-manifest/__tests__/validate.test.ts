import { describe, expect, it } from "vitest";
import { parseRouteManifest } from "../parse.js";
import { validateRouteManifestSemantics } from "../validate.js";
import {
  baseStaticManifest,
  multiSelectAtLeastManifest,
  multiSelectExactManifest,
} from "./fixtures/synthetic.js";

function codes(manifest: unknown): string[] {
  const parsed = parseRouteManifest(manifest);
  if (!parsed.manifest) {
    return parsed.issues.map((issue) => issue.code);
  }
  return validateRouteManifestSemantics(parsed.manifest).map(
    (issue) => issue.code,
  );
}

describe("route-manifest structural validation", () => {
  it("accepts a valid static single-select manifest", () => {
    const { manifest, issues } = parseRouteManifest(baseStaticManifest());
    expect(issues).toEqual([]);
    expect(manifest).not.toBeNull();
    expect(validateRouteManifestSemantics(manifest!)).toEqual([]);
  });

  it("rejects duplicate route key / order and invalid enums", () => {
    const dupKey = baseStaticManifest();
    dupKey.routes[1]!.key = dupKey.routes[0]!.key;
    expect(codes(dupKey)).toContain("duplicate_route_key");

    const dupOrder = baseStaticManifest();
    dupOrder.routes[1]!.orderIndex = 0;
    expect(codes(dupOrder)).toContain("duplicate_route_order");

    const badEnum = baseStaticManifest();
    (badEnum.routes[0] as { pathwayType: string }).pathwayType = "custom";
    expect(codes(badEnum)).toContain("invalid_enum");
  });

  it("rejects duplicate components and option-group collisions", () => {
    const dupComp = baseStaticManifest();
    dupComp.routes[0]!.components[1] = {
      ...dupComp.routes[0]!.components[0]!,
      orderIndex: 1,
      qualificationWeightingPercent: "60.0000",
    };
    expect(codes(dupComp)).toContain("duplicate_route_component");

    const dupGroup = baseStaticManifest();
    dupGroup.studyOptionGroups.push({
      ...dupGroup.studyOptionGroups[0]!,
      orderIndex: 1,
      options: [
        {
          key: "other",
          label: "Other",
          description: null,
          orderIndex: 0,
          units: [{ unitTitle: "Unit Other" }],
        },
      ],
    });
    expect(codes(dupGroup)).toContain("duplicate_group_key");

    const dupGroupOrder = baseStaticManifest();
    dupGroupOrder.studyOptionGroups.push({
      ...structuredClone(dupGroupOrder.studyOptionGroups[0]!),
      key: "other_group",
      orderIndex: 0,
      options: [
        {
          key: "other_opt",
          label: "Other",
          description: null,
          orderIndex: 0,
          units: [{ unitTitle: "Unit Other" }],
        },
      ],
    });
    expect(codes(dupGroupOrder)).toContain("duplicate_group_order");
  });

  it("rejects duplicate option key/order, missing evidence, and unknown fields", () => {
    const dupOpt = baseStaticManifest();
    dupOpt.studyOptionGroups[0]!.options[1]!.key =
      dupOpt.studyOptionGroups[0]!.options[0]!.key;
    expect(codes(dupOpt)).toContain("duplicate_option_key");

    const dupOptOrder = baseStaticManifest();
    dupOptOrder.studyOptionGroups[0]!.options[1]!.orderIndex = 0;
    expect(codes(dupOptOrder)).toContain("duplicate_option_order");

    const missingEvidence = baseStaticManifest();
    missingEvidence.routes[0]!.evidenceRefs = ["missing_source#x"];
    expect(codes(missingEvidence)).toContain("missing_evidence_source");

    const unknown = {
      ...baseStaticManifest(),
      unexpectedField: true,
    };
    expect(codes(unknown)).toContain("unknown_field");
  });
});

describe("route-manifest cardinality validation", () => {
  it("accepts 1/1, 2/2 with 4, and 2/3 with 3", () => {
    expect(codes(baseStaticManifest())).toEqual([]);
    expect(codes(multiSelectExactManifest())).toEqual([]);
    expect(codes(multiSelectAtLeastManifest())).toEqual([]);
  });

  it("rejects min=0, max<min, and unsatisfiable max/min", () => {
    const minZero = baseStaticManifest();
    minZero.studyOptionGroups[0]!.minSelections = 0;
    expect(codes(minZero)).toContain("invalid_cardinality");

    const maxLtMin = baseStaticManifest();
    maxLtMin.studyOptionGroups[0]!.minSelections = 2;
    maxLtMin.studyOptionGroups[0]!.maxSelections = 1;
    expect(codes(maxLtMin)).toContain("invalid_cardinality");

    const maxTooHigh = multiSelectAtLeastManifest();
    maxTooHigh.studyOptionGroups[0]!.maxSelections = 4;
    expect(codes(maxTooHigh)).toContain("unsatisfiable_cardinality");

    const minTooHigh = multiSelectAtLeastManifest();
    minTooHigh.studyOptionGroups[0]!.options = minTooHigh.studyOptionGroups[0]!.options.slice(
      0,
      2,
    );
    // now 2 options with min=2 max=3 → max > count fails
    expect(codes(minTooHigh)).toContain("unsatisfiable_cardinality");
  });
});
