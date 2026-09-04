import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseRouteManifestOrThrow } from "../parse.js";
import {
  effectiveApplicabilityYears,
  parseSourceValidityYears,
  resolveRouteManifestAgainstCatalog,
  type ReferenceCatalog,
} from "../resolve.js";
import {
  syntheticReferenceCatalog,
  yearSensitiveManifest,
} from "./fixtures/synthetic.js";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

function loadHistoryR001Manifest() {
  return parseRouteManifestOrThrow(
    JSON.parse(
      readFileSync(
        path.join(
          ROOT,
          "docs/reference-data/route-manifests/9489-r001.route-manifest.json",
        ),
        "utf8",
      ),
    ),
  );
}

function historyR001Catalog(overrides: Partial<ReferenceCatalog["versions"][0]> = {}): ReferenceCatalog {
  const manifest = loadHistoryR001Manifest();
  const units = new Map<string, true>();
  for (const mapping of manifest.yearRotationMappings) {
    units.set(mapping.unit.unitTitle, true);
  }
  for (const group of manifest.studyOptionGroups) {
    for (const option of group.options) {
      for (const unit of option.units) {
        units.set(unit.unitTitle, true);
      }
    }
  }
  return {
    versions: [
      {
        subjectCode: "9489",
        logicalRevisionKey: "9489-r001",
        lifecycle: "retired",
        applicableFromYear: null,
        applicableToYear: null,
        components: [
          { paperCode: "9489/1", level: "AS Level" },
          { paperCode: "9489/2", level: "AS Level" },
          { paperCode: "9489/3", level: "A Level" },
          { paperCode: "9489/4", level: "A Level" },
        ],
        units: [...units.keys()].map((unitTitle) => ({ unitTitle })),
        ...overrides,
      },
    ],
  };
}

describe("B3R sources[].validity fallback contract", () => {
  it("retired History r001 + null DB applicability + valid source window → year-map resolution PASS", () => {
    const manifest = loadHistoryR001Manifest();
    const issues = resolveRouteManifestAgainstCatalog(
      manifest,
      historyR001Catalog(),
    );
    expect(issues).toEqual([]);
    const effective = effectiveApplicabilityYears(
      historyR001Catalog().versions[0]!,
      manifest,
    );
    expect(effective).toEqual({
      ok: true,
      window: { from: 2027, to: 2029 },
      source: "retired_manifest_validity",
    });
  });

  it("published forward + null DB applicability + valid source window → FAIL CLOSED (no source substitute)", () => {
    const manifest = yearSensitiveManifest();
    const catalog = syntheticReferenceCatalog();
    catalog.versions[0] = {
      ...catalog.versions[0]!,
      lifecycle: "published",
      applicableFromYear: null,
      applicableToYear: null,
    };
    const issues = resolveRouteManifestAgainstCatalog(manifest, catalog);
    expect(issues.some((issue) => issue.code === "missing_applicability_window")).toBe(
      true,
    );
    expect(effectiveApplicabilityYears(catalog.versions[0]!, manifest).ok).toBe(
      false,
    );
  });

  it("draft + null DB applicability → FAIL CLOSED", () => {
    const manifest = yearSensitiveManifest();
    const catalog = syntheticReferenceCatalog();
    catalog.versions[0] = {
      ...catalog.versions[0]!,
      lifecycle: "draft",
      applicableFromYear: null,
      applicableToYear: null,
    };
    const result = effectiveApplicabilityYears(catalog.versions[0]!, manifest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("missing_applicability_window");
    }
  });

  it("published forward with DB applicability → unchanged (DB source)", () => {
    const manifest = yearSensitiveManifest();
    const catalog = syntheticReferenceCatalog();
    catalog.versions[0] = {
      ...catalog.versions[0]!,
      lifecycle: "published",
    };
    const result = effectiveApplicabilityYears(catalog.versions[0]!, manifest);
    expect(result).toEqual({
      ok: true,
      window: { from: 2027, to: 2029 },
      source: "db",
    });
    expect(resolveRouteManifestAgainstCatalog(manifest, catalog)).toEqual([]);
  });

  it("conflicting source validity windows → FAIL CLOSED", () => {
    const manifest = yearSensitiveManifest();
    manifest.sources = [
      { ...manifest.sources[0]!, validity: "2027-2029" },
      {
        ...manifest.sources[0]!,
        sourceKey: "other",
        documentId: "OTHER",
        validity: "2026-2028",
      },
    ];
    const catalog = historyR001Catalog({
      subjectCode: "9999",
      logicalRevisionKey: "9999-r001",
      components: syntheticReferenceCatalog().versions[0]!.components,
      units: syntheticReferenceCatalog().versions[0]!.units,
    });
    catalog.versions[0]!.logicalRevisionKey = "9999-r001";
    catalog.versions[0]!.subjectCode = "9999";
    const parsed = parseSourceValidityYears(manifest);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.code).toBe("conflicting_source_validity");

    const issues = resolveRouteManifestAgainstCatalog(manifest, catalog);
    expect(issues.some((issue) => issue.code === "conflicting_source_validity")).toBe(
      true,
    );
  });

  it("missing source validity for retired year-mapped version → FAIL CLOSED", () => {
    const manifest = yearSensitiveManifest();
    manifest.sources = [
      {
        ...manifest.sources[0]!,
        validity: "",
      },
    ];
    const catalog = historyR001Catalog({
      subjectCode: "9999",
      logicalRevisionKey: "9999-r001",
      components: syntheticReferenceCatalog().versions[0]!.components,
      units: syntheticReferenceCatalog().versions[0]!.units,
    });
    catalog.versions[0]!.subjectCode = "9999";
    catalog.versions[0]!.logicalRevisionKey = "9999-r001";
    const issues = resolveRouteManifestAgainstCatalog(manifest, catalog);
    expect(
      issues.some(
        (issue) =>
          issue.code === "missing_source_validity" ||
          issue.code === "unparseable_source_validity",
      ),
    ).toBe(true);
  });

  it("unknown lifecycle with null DB applicability cannot use source validity", () => {
    const manifest = yearSensitiveManifest();
    const catalog = syntheticReferenceCatalog();
    catalog.versions[0] = {
      ...catalog.versions[0]!,
      lifecycle: undefined,
      applicableFromYear: null,
      applicableToYear: null,
    };
    const result = effectiveApplicabilityYears(catalog.versions[0]!, manifest);
    expect(result.ok).toBe(false);
  });
});

describe("B3R assignment resolver isolation (SQL contract documentation)", () => {
  it("documents that lockdin_resolve_applicable_syllabus_version ignores manifests", () => {
    // Runtime assignment is entirely SQL (migration 0014). This test pins the
    // authoritative predicate text so a future edit that introduced manifest
    // coupling would fail review when the SQL body no longer matches.
    const sql = readFileSync(
      path.join(ROOT, "lib/db/migrations/0014_perpetual_nighthawk.sql"),
      "utf8",
    );
    expect(sql).toContain("lockdin_resolve_applicable_syllabus_version");
    expect(sql).toContain("version.lifecycle = 'published'");
    expect(sql).toContain("version.applicable_session_range IS NOT NULL");
    expect(sql).toContain("product_auto_assign = true");
    expect(sql).not.toMatch(/sources/i);
    expect(sql).not.toMatch(/route.manifest/i);
    expect(sql).not.toMatch(/validity/i);
  });
});
