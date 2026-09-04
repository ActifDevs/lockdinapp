import type { RouteManifest } from "../../types.js";
import type { ReferenceCatalog } from "../../resolve.js";

const SOURCE = {
  sourceKey: "synthetic_source_v1",
  documentId: "SYN-001",
  title: "Synthetic Route Manifest Fixture",
  validity: "2027-2029",
  locator: "pp. 1-2",
  url: "https://example.test/synthetic-route-manifest.pdf",
};

/** Minimal valid static single-select contract (no year mappings). */
export function baseStaticManifest(
  overrides: Partial<RouteManifest> = {},
): RouteManifest {
  return {
    schemaVersion: 1,
    subjectCode: "9999",
    syllabusRevisionKey: "9999-r001",
    routeRevisionKey: "9999-routes-v1",
    sources: [SOURCE],
    routes: [
      {
        key: "as_single_series",
        label: "AS Level",
        qualificationTarget: "as_level",
        pathwayType: "single_series",
        progressionEligibility: "eligible",
        orderIndex: 0,
        evidenceRefs: ["synthetic_source_v1#as"],
        components: [
          {
            paperCode: "9999/1",
            level: "AS Level",
            role: "current_sitting",
            qualificationWeightingPercent: "40.0000",
            orderIndex: 0,
          },
          {
            paperCode: "9999/2",
            level: "AS Level",
            role: "current_sitting",
            qualificationWeightingPercent: "60.0000",
            orderIndex: 1,
          },
        ],
      },
      {
        key: "a_full_same_series",
        label: "Full A Level",
        qualificationTarget: "a_level",
        pathwayType: "full_same_series",
        progressionEligibility: "not_applicable",
        orderIndex: 1,
        evidenceRefs: ["synthetic_source_v1#a"],
        components: [
          {
            paperCode: "9999/1",
            level: "AS Level",
            role: "current_sitting",
            qualificationWeightingPercent: "20.0000",
            orderIndex: 0,
          },
          {
            paperCode: "9999/2",
            level: "AS Level",
            role: "current_sitting",
            qualificationWeightingPercent: "30.0000",
            orderIndex: 1,
          },
          {
            paperCode: "9999/3",
            level: "A Level",
            role: "current_sitting",
            qualificationWeightingPercent: "20.0000",
            orderIndex: 2,
          },
          {
            paperCode: "9999/4",
            level: "A Level",
            role: "current_sitting",
            qualificationWeightingPercent: "30.0000",
            orderIndex: 3,
          },
        ],
      },
    ],
    studyOptionGroups: [
      {
        key: "as_option",
        label: "AS Option",
        qualificationTarget: "both",
        applicableComponent: null,
        orderIndex: 0,
        minSelections: 1,
        maxSelections: 1,
        options: [
          {
            key: "option_alpha",
            label: "Option Alpha",
            description: null,
            orderIndex: 0,
            units: [{ unitTitle: "Unit Alpha" }],
          },
          {
            key: "option_beta",
            label: "Option Beta",
            description: null,
            orderIndex: 1,
            units: [{ unitTitle: "Unit Beta" }],
          },
        ],
      },
    ],
    yearRotationMappings: [],
    ...overrides,
  };
}

/** Exactly 2-of-4 multi-select group representation. */
export function multiSelectExactManifest(): RouteManifest {
  const base = baseStaticManifest();
  return {
    ...base,
    studyOptionGroups: [
      {
        key: "paper_3_options",
        label: "Paper 3 Options",
        qualificationTarget: "a_level",
        applicableComponent: { paperCode: "9999/3", level: "A Level" },
        orderIndex: 0,
        minSelections: 2,
        maxSelections: 2,
        options: [
          {
            key: "opt_a",
            label: "A",
            description: null,
            orderIndex: 0,
            units: [{ unitTitle: "Unit A" }],
          },
          {
            key: "opt_b",
            label: "B",
            description: null,
            orderIndex: 1,
            units: [{ unitTitle: "Unit B" }],
          },
          {
            key: "opt_c",
            label: "C",
            description: null,
            orderIndex: 2,
            units: [{ unitTitle: "Unit C" }],
          },
          {
            key: "opt_d",
            label: "D",
            description: null,
            orderIndex: 3,
            units: [{ unitTitle: "Unit D" }],
          },
        ],
      },
    ],
  };
}

/** At-least 2-of-3 multi-select representation. */
export function multiSelectAtLeastManifest(): RouteManifest {
  const base = baseStaticManifest();
  return {
    ...base,
    studyOptionGroups: [
      {
        key: "paper_4_areas",
        label: "Paper 4 Areas",
        qualificationTarget: "a_level",
        applicableComponent: { paperCode: "9999/4", level: "A Level" },
        orderIndex: 0,
        minSelections: 2,
        maxSelections: 3,
        options: [
          {
            key: "area_1",
            label: "Area 1",
            description: null,
            orderIndex: 0,
            units: [{ unitTitle: "Area Unit 1" }],
          },
          {
            key: "area_2",
            label: "Area 2",
            description: null,
            orderIndex: 1,
            units: [{ unitTitle: "Area Unit 2" }],
          },
          {
            key: "area_3",
            label: "Area 3",
            description: null,
            orderIndex: 2,
            units: [{ unitTitle: "Area Unit 3" }],
          },
        ],
      },
    ],
  };
}

/** Year-sensitive AS option rotation covering full applicability 2027–2029. */
export function yearSensitiveManifest(): RouteManifest {
  const base = baseStaticManifest({
    studyOptionGroups: [
      {
        key: "as_option",
        label: "AS Option",
        qualificationTarget: "both",
        applicableComponent: null,
        orderIndex: 0,
        minSelections: 1,
        maxSelections: 1,
        options: [
          {
            key: "option_alpha",
            label: "Option Alpha",
            description: null,
            orderIndex: 0,
            units: [
              { unitTitle: "Unit Alpha One" },
              { unitTitle: "Unit Alpha Two" },
            ],
          },
        ],
      },
    ],
    yearRotationMappings: [
      {
        examYear: 2027,
        optionKey: "option_alpha",
        component: { paperCode: "9999/1", level: "AS Level" },
        unit: { unitTitle: "Unit Alpha One" },
        assessmentRole: "source_paper",
      },
      {
        examYear: 2027,
        optionKey: "option_alpha",
        component: { paperCode: "9999/2", level: "AS Level" },
        unit: { unitTitle: "Unit Alpha Two" },
        assessmentRole: "outline_paper",
      },
      {
        examYear: 2028,
        optionKey: "option_alpha",
        component: { paperCode: "9999/1", level: "AS Level" },
        unit: { unitTitle: "Unit Alpha Two" },
        assessmentRole: "source_paper",
      },
      {
        examYear: 2028,
        optionKey: "option_alpha",
        component: { paperCode: "9999/2", level: "AS Level" },
        unit: { unitTitle: "Unit Alpha One" },
        assessmentRole: "outline_paper",
      },
      {
        examYear: 2029,
        optionKey: "option_alpha",
        component: { paperCode: "9999/1", level: "AS Level" },
        unit: { unitTitle: "Unit Alpha One" },
        assessmentRole: "source_paper",
      },
      {
        examYear: 2029,
        optionKey: "option_alpha",
        component: { paperCode: "9999/2", level: "AS Level" },
        unit: { unitTitle: "Unit Alpha Two" },
        assessmentRole: "outline_paper",
      },
    ],
  });
  return base;
}

/** Staged route with carried-forward components and exact 15.5-style weights. */
export function stagedDecimalManifest(): RouteManifest {
  return {
    schemaVersion: 1,
    subjectCode: "9999",
    syllabusRevisionKey: "9999-r001",
    routeRevisionKey: "9999-routes-staged-v1",
    sources: [SOURCE],
    routes: [
      {
        key: "a_staged_completion",
        label: "Complete A Level — staged",
        qualificationTarget: "a_level",
        pathwayType: "staged_completion",
        progressionEligibility: "not_applicable",
        orderIndex: 0,
        evidenceRefs: ["synthetic_source_v1#staged"],
        components: [
          {
            paperCode: "9999/1",
            level: "AS Level",
            role: "carried_forward",
            qualificationWeightingPercent: "15.5",
            orderIndex: 0,
          },
          {
            paperCode: "9999/2",
            level: "AS Level",
            role: "carried_forward",
            qualificationWeightingPercent: "23",
            orderIndex: 1,
          },
          {
            paperCode: "9999/3",
            level: "A Level",
            role: "current_sitting",
            qualificationWeightingPercent: "11.5",
            orderIndex: 2,
          },
          {
            paperCode: "9999/4",
            level: "A Level",
            role: "current_sitting",
            qualificationWeightingPercent: "38.5",
            orderIndex: 3,
          },
          {
            paperCode: "9999/5",
            level: "A Level",
            role: "current_sitting",
            qualificationWeightingPercent: "11.5",
            orderIndex: 4,
          },
        ],
      },
    ],
    studyOptionGroups: [],
    yearRotationMappings: [],
  };
}

export function syntheticReferenceCatalog(): ReferenceCatalog {
  return {
    versions: [
      {
        subjectCode: "9999",
        logicalRevisionKey: "9999-r001",
        applicableFromYear: 2027,
        applicableToYear: 2029,
        components: [
          { paperCode: "9999/1", level: "AS Level" },
          { paperCode: "9999/2", level: "AS Level" },
          { paperCode: "9999/3", level: "A Level" },
          { paperCode: "9999/4", level: "A Level" },
          { paperCode: "9999/5", level: "A Level" },
        ],
        units: [
          { unitTitle: "Unit Alpha" },
          { unitTitle: "Unit Beta" },
          { unitTitle: "Unit A" },
          { unitTitle: "Unit B" },
          { unitTitle: "Unit C" },
          { unitTitle: "Unit D" },
          { unitTitle: "Area Unit 1" },
          { unitTitle: "Area Unit 2" },
          { unitTitle: "Area Unit 3" },
          { unitTitle: "Unit Alpha One" },
          { unitTitle: "Unit Alpha Two" },
        ],
      },
    ],
  };
}
