import { describe, expect, it } from "vitest";
import { loadReferenceCatalogFromRepositoryFiles } from "../catalog-loader.js";
import { resolveRouteManifestAgainstCatalog } from "../resolve.js";
import { parseRouteManifestOrThrow } from "../parse.js";
import { baseStaticManifest } from "./fixtures/synthetic.js";

describe("route-manifest repository-file reference adapter", () => {
  it("loads exact 9702-r001 applicability, components, and units from Lockdin files", () => {
    const catalog = loadReferenceCatalogFromRepositoryFiles("9702", "9702-r001");
    expect(catalog.versions).toHaveLength(1);
    const version = catalog.versions[0]!;
    expect(version.subjectCode).toBe("9702");
    expect(version.logicalRevisionKey).toBe("9702-r001");
    expect(version.applicableFromYear).toBe(2025);
    expect(version.applicableToYear).toBe(2030);
    expect(
      version.components.filter(
        (component) =>
          component.paperCode === "9702/1" && component.level === "AS Level",
      ),
    ).toHaveLength(1);
    expect(version.units.length).toBeGreaterThan(0);
    expect(
      version.components.filter(
        (component) => component.paperCode === "9702/99",
      ),
    ).toHaveLength(0);
  });

  it("fails closed when a synthetic manifest targets the wrong syllabus revision", () => {
    const catalog = loadReferenceCatalogFromRepositoryFiles("9702", "9702-r001");
    const manifest = parseRouteManifestOrThrow(baseStaticManifest());
    const issues = resolveRouteManifestAgainstCatalog(manifest, catalog);
    expect(
      issues.some((issue) => issue.code === "unknown_syllabus_revision"),
    ).toBe(true);
  });

  it("resolves real component/unit identities when subject/version match", () => {
    const catalog = loadReferenceCatalogFromRepositoryFiles("9702", "9702-r001");
    const version = catalog.versions[0]!;
    const paper1 = version.components.find(
      (component) =>
        component.paperCode === "9702/1" && component.level === "AS Level",
    );
    const unit = version.units[0]!;
    expect(paper1).toBeDefined();
    expect(unit.unitTitle.length).toBeGreaterThan(0);

    const manifest = parseRouteManifestOrThrow({
      schemaVersion: 1,
      subjectCode: "9702",
      syllabusRevisionKey: "9702-r001",
      routeRevisionKey: "9702-routes-test-only-v1",
      sources: [
        {
          sourceKey: "synthetic_9702_test",
          documentId: "TEST",
          title: "Synthetic adapter test only",
          validity: "2025-2030",
          locator: "test",
          url: "https://example.test/9702",
        },
      ],
      routes: [
        {
          key: "as_single_series",
          label: "AS Level",
          qualificationTarget: "as_level",
          pathwayType: "single_series",
          progressionEligibility: "eligible",
          orderIndex: 0,
          evidenceRefs: ["synthetic_9702_test"],
          components: [
            {
              paperCode: paper1!.paperCode,
              level: paper1!.level,
              role: "current_sitting",
              qualificationWeightingPercent: "100.0000",
              orderIndex: 0,
            },
          ],
        },
      ],
      studyOptionGroups: [
        {
          key: "adapter_option",
          label: "Adapter Option",
          qualificationTarget: "both",
          applicableComponent: null,
          orderIndex: 0,
          minSelections: 1,
          maxSelections: 1,
          options: [
            {
              key: "opt_one",
              label: "One",
              description: null,
              orderIndex: 0,
              units: [{ unitTitle: unit.unitTitle }],
            },
          ],
        },
      ],
      yearRotationMappings: [],
    });

    expect(resolveRouteManifestAgainstCatalog(manifest, catalog)).toEqual([]);
  });
});
