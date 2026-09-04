import { describe, expect, it } from "vitest";
import { canonicalizeRouteManifest } from "../canonicalize.js";
import { hashRouteManifest } from "../hash.js";
import { parseRouteManifestOrThrow } from "../parse.js";
import { baseStaticManifest, yearSensitiveManifest } from "./fixtures/synthetic.js";

describe("route-manifest canonical hashing", () => {
  it("is stable under property reorder and equivalent decimal text", () => {
    const a = baseStaticManifest();
    const bRaw = {
      routeRevisionKey: a.routeRevisionKey,
      yearRotationMappings: [],
      schemaVersion: 1,
      studyOptionGroups: a.studyOptionGroups,
      subjectCode: a.subjectCode,
      sources: a.sources,
      syllabusRevisionKey: a.syllabusRevisionKey,
      routes: a.routes.map((route) => ({
        ...route,
        components: [...route.components].reverse().map((component) => ({
          ...component,
          qualificationWeightingPercent:
            component.qualificationWeightingPercent === "40.0000"
              ? "40"
              : component.qualificationWeightingPercent === "60.0000"
                ? "60.0"
                : component.qualificationWeightingPercent === "20.0000"
                  ? "20.00"
                  : component.qualificationWeightingPercent === "30.0000"
                    ? "30.0000"
                    : component.qualificationWeightingPercent,
        })),
      })),
    };
    const b = parseRouteManifestOrThrow(bRaw);
    expect(hashRouteManifest(a)).toBe(hashRouteManifest(b));
    expect(hashRouteManifest(a)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is stable when arrays are reordered but orderIndex defines semantics", () => {
    const a = baseStaticManifest();
    const reordered = {
      ...a,
      routes: [...a.routes].reverse(),
      studyOptionGroups: a.studyOptionGroups.map((group) => ({
        ...group,
        options: [...group.options].reverse(),
      })),
      sources: [...a.sources],
    };
    expect(hashRouteManifest(a)).toBe(hashRouteManifest(reordered));
    expect(canonicalizeRouteManifest(a)).toEqual(
      canonicalizeRouteManifest(reordered),
    );
  });

  it("changes when labels, weights, cardinality, units, years, or evidence change", () => {
    const base = baseStaticManifest();
    const baseHash = hashRouteManifest(base);

    const label = structuredClone(base);
    label.routes[0]!.label = "Changed label";
    expect(hashRouteManifest(label)).not.toBe(baseHash);

    const weight = structuredClone(base);
    weight.routes[0]!.components[0]!.qualificationWeightingPercent = "41.0000";
    weight.routes[0]!.components[1]!.qualificationWeightingPercent = "59.0000";
    expect(hashRouteManifest(weight)).not.toBe(baseHash);

    const cardinality = structuredClone(base);
    cardinality.studyOptionGroups[0]!.maxSelections = 2;
    // still satisfiable with 2 options
    expect(hashRouteManifest(cardinality)).not.toBe(baseHash);

    const units = structuredClone(base);
    units.studyOptionGroups[0]!.options[0]!.units = [
      { unitTitle: "Unit Alpha Renamed" },
    ];
    expect(hashRouteManifest(units)).not.toBe(baseHash);

    const year = yearSensitiveManifest();
    const yearHash = hashRouteManifest(year);
    const yearChanged = structuredClone(year);
    yearChanged.yearRotationMappings[0]!.assessmentRole = "changed_role";
    expect(hashRouteManifest(yearChanged)).not.toBe(yearHash);

    const evidence = structuredClone(base);
    evidence.sources[0]!.documentId = "SYN-002";
    expect(hashRouteManifest(evidence)).not.toBe(baseHash);
  });

  it("is stable under Unicode-containing labels and ordinal string ordering", () => {
    const a = baseStaticManifest();
    a.routes[0]!.label = "AS Level — Papers 1 + 2";
    a.routes[0]!.evidenceRefs = ["synthetic_source_v1#β", "synthetic_source_v1#α"];
    const b = structuredClone(a);
    b.routes[0]!.evidenceRefs = ["synthetic_source_v1#α", "synthetic_source_v1#β"];
    expect(hashRouteManifest(a)).toBe(hashRouteManifest(b));
    expect(hashRouteManifest(a)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("orders ASCII keys by deterministic ordinal comparison", () => {
    const a = baseStaticManifest();
    a.sources = [
      {
        sourceKey: "b_source",
        documentId: "B",
        title: "B",
        validity: "2027-2029",
        locator: "b",
        url: "https://example.test/b",
      },
      {
        sourceKey: "a_source",
        documentId: "A",
        title: "A",
        validity: "2027-2029",
        locator: "a",
        url: "https://example.test/a",
      },
    ];
    a.routes[0]!.evidenceRefs = ["a_source"];
    a.routes[1]!.evidenceRefs = ["b_source"];
    const reordered = structuredClone(a);
    reordered.sources = [...a.sources].reverse();
    expect(hashRouteManifest(a)).toBe(hashRouteManifest(reordered));
  });

  it("does not hash $schema or review metadata", () => {
    const a = baseStaticManifest();
    const b = {
      ...baseStaticManifest(),
      schema: "./route-manifest.schema.json",
      review: {
        status: "reviewed",
        reviewers: ["tester"],
        reviewedAt: "2026-09-04",
        auditReport: "docs/cursor/reports/125.md",
      },
    };
    expect(hashRouteManifest(a)).toBe(hashRouteManifest(b));
  });
});
