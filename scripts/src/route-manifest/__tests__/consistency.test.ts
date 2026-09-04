import { describe, expect, it } from "vitest";
import { parseRouteManifest, parseRouteManifestOrThrow } from "../parse.js";
import { validateRouteManifestSemantics } from "../validate.js";
import { baseStaticManifest } from "./fixtures/synthetic.js";

describe("route-manifest qualification-weight consistency", () => {
  it("rejects same component under same qualification target with different weights", () => {
    const manifest = baseStaticManifest();
    manifest.routes.push({
      key: "a_staged_completion",
      label: "Staged",
      qualificationTarget: "a_level",
      pathwayType: "staged_completion",
      progressionEligibility: "not_applicable",
      orderIndex: 2,
      evidenceRefs: ["synthetic_source_v1#staged"],
      components: [
        {
          paperCode: "9999/1",
          level: "AS Level",
          role: "carried_forward",
          qualificationWeightingPercent: "25.0000",
          orderIndex: 0,
        },
        {
          paperCode: "9999/3",
          level: "A Level",
          role: "current_sitting",
          qualificationWeightingPercent: "75.0000",
          orderIndex: 1,
        },
      ],
    });
    const issues = validateRouteManifestSemantics(
      parseRouteManifestOrThrow(manifest),
    );
    expect(
      issues.some((issue) => issue.code === "inconsistent_qualification_weight"),
    ).toBe(true);
  });

  it("allows the same component to differ across qualification targets", () => {
    const issues = validateRouteManifestSemantics(
      parseRouteManifestOrThrow(baseStaticManifest()),
    );
    expect(
      issues.some((issue) => issue.code === "inconsistent_qualification_weight"),
    ).toBe(false);
  });
});

describe("route-manifest evidence references", () => {
  it("rejects unknown evidenceRef", () => {
    const missing = baseStaticManifest();
    missing.routes[0]!.evidenceRefs = ["not_a_source"];
    expect(
      validateRouteManifestSemantics(parseRouteManifestOrThrow(missing)).some(
        (issue) => issue.code === "missing_evidence_source",
      ),
    ).toBe(true);
  });

  it("rejects duplicate sourceKey", () => {
    const dupSource = baseStaticManifest();
    dupSource.sources.push({ ...dupSource.sources[0]! });
    const result = parseRouteManifest(
      JSON.parse(JSON.stringify(dupSource)) as unknown,
    );
    expect(result.manifest).not.toBeNull();
    expect(
      validateRouteManifestSemantics(result.manifest!).some(
        (issue) => issue.code === "duplicate_source_key",
      ),
    ).toBe(true);
  });
});
