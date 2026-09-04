import { describe, expect, it } from "vitest";
import { parseRouteManifest, parseRouteManifestOrThrow } from "../parse.js";
import { validateRouteManifestSemantics } from "../validate.js";
import { resolveRouteManifestAgainstCatalog } from "../resolve.js";
import {
  syntheticReferenceCatalog,
  yearSensitiveManifest,
} from "./fixtures/synthetic.js";

function structuralCodes(raw: unknown): string[] {
  const parsed = parseRouteManifest(raw);
  if (!parsed.manifest) return parsed.issues.map((issue) => issue.code);
  return validateRouteManifestSemantics(parsed.manifest).map(
    (issue) => issue.code,
  );
}

function resolveCodes(manifest: ReturnType<typeof yearSensitiveManifest>): string[] {
  return resolveRouteManifestAgainstCatalog(
    manifest,
    syntheticReferenceCatalog(),
  ).map((issue) => issue.code);
}

describe("route-manifest year-mapping validation", () => {
  it("accepts complete 2027–2029 coverage against applicability", () => {
    expect(resolveCodes(parseRouteManifestOrThrow(yearSensitiveManifest()))).toEqual(
      [],
    );
  });

  it("rejects unknown option, unit outside option, and duplicates/conflicts", () => {
    const unknownOption = yearSensitiveManifest();
    unknownOption.yearRotationMappings[0]!.optionKey = "missing_option";
    expect(structuralCodes(unknownOption)).toContain("unknown_year_mapping_option");

    const outside = yearSensitiveManifest();
    outside.yearRotationMappings[0]!.unit = { unitTitle: "Unit Beta" };
    expect(structuralCodes(outside)).toContain("year_mapping_unit_outside_option");

    const duplicate = yearSensitiveManifest();
    duplicate.yearRotationMappings.push({
      ...duplicate.yearRotationMappings[0]!,
    });
    expect(structuralCodes(duplicate)).toContain("duplicate_year_mapping");

    const conflict = yearSensitiveManifest();
    conflict.yearRotationMappings.push({
      ...conflict.yearRotationMappings[0]!,
      component: { paperCode: "9999/2", level: "AS Level" },
    });
    expect(structuralCodes(conflict)).toContain("conflicting_year_mapping");
  });

  it("rejects entire required year omission (2029)", () => {
    const omitted = yearSensitiveManifest();
    omitted.yearRotationMappings = omitted.yearRotationMappings.filter(
      (mapping) => mapping.examYear !== 2029,
    );
    expect(resolveCodes(parseRouteManifestOrThrow(omitted))).toContain(
      "missing_year_mapping_coverage",
    );
  });

  it("rejects one unit missing in a required year", () => {
    const partial = yearSensitiveManifest();
    partial.yearRotationMappings = partial.yearRotationMappings.filter(
      (mapping) =>
        !(
          mapping.examYear === 2029 &&
          mapping.unit.unitTitle === "Unit Alpha Two"
        ),
    );
    expect(resolveCodes(parseRouteManifestOrThrow(partial))).toContain(
      "missing_year_mapping_coverage",
    );
  });

  it("rejects unsupported years 2026 and 2030", () => {
    const y2026 = yearSensitiveManifest();
    y2026.yearRotationMappings = y2026.yearRotationMappings.map((mapping) =>
      mapping.examYear === 2027 ? { ...mapping, examYear: 2026 } : mapping,
    );
    expect(resolveCodes(parseRouteManifestOrThrow(y2026))).toContain(
      "unsupported_exam_year",
    );

    const y2030 = yearSensitiveManifest();
    y2030.yearRotationMappings = y2030.yearRotationMappings.map((mapping) =>
      mapping.examYear === 2029 ? { ...mapping, examYear: 2030 } : mapping,
    );
    expect(resolveCodes(parseRouteManifestOrThrow(y2030))).toContain(
      "unsupported_exam_year",
    );
  });
});
