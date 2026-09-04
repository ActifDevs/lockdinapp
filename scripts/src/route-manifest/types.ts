/**
 * Unified Phase 7 route/reference manifest contract (schemaVersion 1).
 *
 * Semantic identifiers only — no database primary keys.
 * Component identity is always paperCode + source/component level.
 * Unit identity is exact syllabus unit title within the target version.
 */

export const ROUTE_MANIFEST_SCHEMA_VERSION = 1 as const;

export const QUALIFICATION_TARGETS = ["as_level", "a_level"] as const;
export type QualificationTarget = (typeof QUALIFICATION_TARGETS)[number];

export const PATHWAY_TYPES = [
  "single_series",
  "staged_completion",
  "full_same_series",
] as const;
export type PathwayType = (typeof PATHWAY_TYPES)[number];

export const PROGRESSION_ELIGIBILITIES = [
  "eligible",
  "not_eligible",
  "not_applicable",
] as const;
export type ProgressionEligibility = (typeof PROGRESSION_ELIGIBILITIES)[number];

export const COMPONENT_ROLES = ["current_sitting", "carried_forward"] as const;
export type ComponentRole = (typeof COMPONENT_ROLES)[number];

export const OPTION_GROUP_QUALIFICATION_TARGETS = [
  "as_level",
  "a_level",
  "both",
] as const;
export type OptionGroupQualificationTarget =
  (typeof OPTION_GROUP_QUALIFICATION_TARGETS)[number];

/** Semantic assessment-component reference within one syllabus version. */
export type ComponentRef = {
  paperCode: string;
  level: string;
};

/** Semantic syllabus-unit reference within one syllabus version. */
export type UnitRef = {
  unitTitle: string;
};

export type RouteManifestSource = {
  sourceKey: string;
  documentId: string;
  title: string;
  validity: string;
  locator: string;
  url: string;
};

export type RouteManifestComponent = {
  paperCode: string;
  level: string;
  role: ComponentRole;
  /** Exact decimal text; normalized to four fractional digits before hashing. */
  qualificationWeightingPercent: string;
  orderIndex: number;
};

export type RouteManifestRoute = {
  key: string;
  label: string;
  qualificationTarget: QualificationTarget;
  pathwayType: PathwayType;
  progressionEligibility: ProgressionEligibility;
  orderIndex: number;
  evidenceRefs: string[];
  components: RouteManifestComponent[];
};

export type RouteManifestOption = {
  key: string;
  label: string;
  description: string | null;
  orderIndex: number;
  units: UnitRef[];
};

export type RouteManifestOptionGroup = {
  key: string;
  label: string;
  qualificationTarget: OptionGroupQualificationTarget;
  /** When set, group applies only when this component is in the route. */
  applicableComponent: ComponentRef | null;
  orderIndex: number;
  minSelections: number;
  maxSelections: number;
  options: RouteManifestOption[];
};

export type RouteManifestYearMapping = {
  examYear: number;
  optionKey: string;
  component: ComponentRef;
  unit: UnitRef;
  assessmentRole: string;
};

export type RouteManifestReview = {
  status: string;
  reviewers: string[];
  reviewedAt: string;
  auditReport: string;
};

/**
 * Author-facing parsed manifest.
 * `$schema` and `review` are authoring/review metadata — not hashed.
 */
export type RouteManifest = {
  schemaVersion: typeof ROUTE_MANIFEST_SCHEMA_VERSION;
  subjectCode: string;
  syllabusRevisionKey: string;
  routeRevisionKey: string;
  sources: RouteManifestSource[];
  routes: RouteManifestRoute[];
  studyOptionGroups: RouteManifestOptionGroup[];
  yearRotationMappings: RouteManifestYearMapping[];
  /** Optional authoring pointer; never hashed. */
  schema?: string;
  /** Optional review block; never hashed. */
  review?: RouteManifestReview;
};

/**
 * Canonical hashed payload — deterministic field set and ordering.
 * Excludes `$schema` / `schema` and `review`.
 */
export type CanonicalRouteManifest = {
  schemaVersion: typeof ROUTE_MANIFEST_SCHEMA_VERSION;
  subjectCode: string;
  syllabusRevisionKey: string;
  routeRevisionKey: string;
  sources: RouteManifestSource[];
  routes: Array<{
    key: string;
    label: string;
    qualificationTarget: QualificationTarget;
    pathwayType: PathwayType;
    progressionEligibility: ProgressionEligibility;
    orderIndex: number;
    evidenceRefs: string[];
    components: Array<{
      paperCode: string;
      level: string;
      role: ComponentRole;
      qualificationWeightingPercent: string;
      orderIndex: number;
    }>;
  }>;
  studyOptionGroups: Array<{
    key: string;
    label: string;
    qualificationTarget: OptionGroupQualificationTarget;
    applicableComponent: ComponentRef | null;
    orderIndex: number;
    minSelections: number;
    maxSelections: number;
    options: Array<{
      key: string;
      label: string;
      description: string | null;
      orderIndex: number;
      units: UnitRef[];
    }>;
  }>;
  yearRotationMappings: Array<{
    examYear: number;
    optionKey: string;
    component: ComponentRef;
    unit: UnitRef;
    assessmentRole: string;
  }>;
};
