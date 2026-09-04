import { describe, expect, it } from "vitest";
import { parseRouteManifestOrThrow } from "../parse.js";
import { resolveRouteManifestAgainstCatalog } from "../resolve.js";
import {
  baseStaticManifest,
  syntheticReferenceCatalog,
  yearSensitiveManifest,
} from "./fixtures/synthetic.js";

describe("route-manifest read-only reference resolution", () => {
  it("resolves a valid synthetic manifest against an exact catalog", () => {
    const manifest = parseRouteManifestOrThrow(baseStaticManifest());
    expect(
      resolveRouteManifestAgainstCatalog(manifest, syntheticReferenceCatalog()),
    ).toEqual([]);
  });

  it("fails closed on subject/version mismatch and unknown revision", () => {
    const wrongSubject = parseRouteManifestOrThrow({
      ...baseStaticManifest(),
      subjectCode: "8888",
      syllabusRevisionKey: "8888-r001",
    });
    expect(
      resolveRouteManifestAgainstCatalog(
        wrongSubject,
        syntheticReferenceCatalog(),
      ).some((issue) => issue.code === "unknown_syllabus_revision"),
    ).toBe(true);

    const unknownKey = parseRouteManifestOrThrow({
      ...baseStaticManifest(),
      syllabusRevisionKey: "9999-r099",
    });
    expect(
      resolveRouteManifestAgainstCatalog(
        unknownKey,
        syntheticReferenceCatalog(),
      ).some((issue) => issue.code === "unknown_syllabus_revision"),
    ).toBe(true);
  });

  it("fails closed on unknown/ambiguous components and units", () => {
    const unknownComponent = parseRouteManifestOrThrow(baseStaticManifest());
    unknownComponent.routes[0]!.components[0]!.paperCode = "9999/9";
    // Fix total still 100 after changing identity only — weights unchanged
    expect(
      resolveRouteManifestAgainstCatalog(
        unknownComponent,
        syntheticReferenceCatalog(),
      ).some((issue) => issue.code === "unknown_component"),
    ).toBe(true);

    const ambiguousCatalog = syntheticReferenceCatalog();
    ambiguousCatalog.versions[0]!.components.push({
      paperCode: "9999/1",
      level: "AS Level",
    });
    expect(
      resolveRouteManifestAgainstCatalog(
        parseRouteManifestOrThrow(baseStaticManifest()),
        ambiguousCatalog,
      ).some((issue) => issue.code === "ambiguous_component"),
    ).toBe(true);

    const unknownUnit = parseRouteManifestOrThrow(baseStaticManifest());
    unknownUnit.studyOptionGroups[0]!.options[0]!.units = [
      { unitTitle: "Missing Unit" },
    ];
    expect(
      resolveRouteManifestAgainstCatalog(
        unknownUnit,
        syntheticReferenceCatalog(),
      ).some((issue) => issue.code === "unknown_unit"),
    ).toBe(true);

    const ambiguousUnits = syntheticReferenceCatalog();
    ambiguousUnits.versions[0]!.units.push({ unitTitle: "Unit Alpha" });
    expect(
      resolveRouteManifestAgainstCatalog(
        parseRouteManifestOrThrow(baseStaticManifest()),
        ambiguousUnits,
      ).some((issue) => issue.code === "ambiguous_unit"),
    ).toBe(true);
  });

  it("rejects unsupported exam years outside applicability", () => {
    const manifest = parseRouteManifestOrThrow(yearSensitiveManifest());
    for (const mapping of manifest.yearRotationMappings) {
      if (mapping.examYear === 2027) {
        mapping.examYear = 2030;
      }
    }
    const issues = resolveRouteManifestAgainstCatalog(
      manifest,
      syntheticReferenceCatalog(),
    );
    expect(issues.some((issue) => issue.code === "unsupported_exam_year")).toBe(
      true,
    );
  });
});
