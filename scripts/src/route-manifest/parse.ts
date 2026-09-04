import { RouteManifestError, type RouteManifestIssue } from "./errors.js";
import {
  COMPONENT_ROLES,
  OPTION_GROUP_QUALIFICATION_TARGETS,
  PATHWAY_TYPES,
  PROGRESSION_ELIGIBILITIES,
  QUALIFICATION_TARGETS,
  ROUTE_MANIFEST_SCHEMA_VERSION,
  type ComponentRef,
  type RouteManifest,
  type RouteManifestComponent,
  type RouteManifestOption,
  type RouteManifestOptionGroup,
  type RouteManifestReview,
  type RouteManifestRoute,
  type RouteManifestSource,
  type RouteManifestYearMapping,
  type UnitRef,
} from "./types.js";
import { canonicalizeWeightText } from "./weighting.js";

const SUBJECT_CODE_RE = /^\d{4}$/;
const REVISION_KEY_RE = /^(\d{4})-r\d{3}$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function unexpectedKeys(
  obj: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: RouteManifestIssue[],
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      issues.push({
        code: "unknown_field",
        path: `${path}.${key}`,
        message: `unknown contract field "${key}"`,
      });
    }
  }
}

function requireNonEmptyString(
  value: unknown,
  path: string,
  issues: RouteManifestIssue[],
): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({
      code: "invalid_string",
      path,
      message: "must be a non-empty string",
    });
    return null;
  }
  return value;
}

function requireNonNegativeInt(
  value: unknown,
  path: string,
  issues: RouteManifestIssue[],
): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    issues.push({
      code: "invalid_integer",
      path,
      message: "must be a non-negative integer",
    });
    return null;
  }
  return value;
}

function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  issues: RouteManifestIssue[],
): T | null {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    issues.push({
      code: "invalid_enum",
      path,
      message: `must be one of: ${allowed.join(", ")}`,
    });
    return null;
  }
  return value as T;
}

function parseComponentRef(
  raw: unknown,
  path: string,
  issues: RouteManifestIssue[],
): ComponentRef | null {
  if (!isPlainObject(raw)) {
    issues.push({
      code: "invalid_component_ref",
      path,
      message: "component reference must be an object with paperCode and level",
    });
    return null;
  }
  unexpectedKeys(raw, ["paperCode", "level"], path, issues);
  const paperCode = requireNonEmptyString(raw.paperCode, `${path}.paperCode`, issues);
  const level = requireNonEmptyString(raw.level, `${path}.level`, issues);
  if (!paperCode || !level) return null;
  return { paperCode, level };
}

function parseUnitRef(
  raw: unknown,
  path: string,
  issues: RouteManifestIssue[],
): UnitRef | null {
  if (typeof raw === "string") {
    // Accept bare title strings for author convenience; normalize to object.
    if (raw.trim().length === 0) {
      issues.push({
        code: "invalid_unit_ref",
        path,
        message: "unitTitle must be non-empty",
      });
      return null;
    }
    return { unitTitle: raw };
  }
  if (!isPlainObject(raw)) {
    issues.push({
      code: "invalid_unit_ref",
      path,
      message: "unit reference must be a non-empty title string or { unitTitle }",
    });
    return null;
  }
  unexpectedKeys(raw, ["unitTitle"], path, issues);
  const unitTitle = requireNonEmptyString(raw.unitTitle, `${path}.unitTitle`, issues);
  if (!unitTitle) return null;
  return { unitTitle };
}

function parseSource(
  raw: unknown,
  path: string,
  issues: RouteManifestIssue[],
): RouteManifestSource | null {
  if (!isPlainObject(raw)) {
    issues.push({ code: "invalid_source", path, message: "source must be an object" });
    return null;
  }
  unexpectedKeys(
    raw,
    ["sourceKey", "documentId", "title", "validity", "locator", "url"],
    path,
    issues,
  );
  const sourceKey = requireNonEmptyString(raw.sourceKey, `${path}.sourceKey`, issues);
  const documentId = requireNonEmptyString(raw.documentId, `${path}.documentId`, issues);
  const title = requireNonEmptyString(raw.title, `${path}.title`, issues);
  const validity = requireNonEmptyString(raw.validity, `${path}.validity`, issues);
  const locator = requireNonEmptyString(raw.locator, `${path}.locator`, issues);
  const url = requireNonEmptyString(raw.url, `${path}.url`, issues);
  if (!sourceKey || !documentId || !title || !validity || !locator || !url) return null;
  return { sourceKey, documentId, title, validity, locator, url };
}

function parseRouteComponent(
  raw: unknown,
  path: string,
  issues: RouteManifestIssue[],
): RouteManifestComponent | null {
  if (!isPlainObject(raw)) {
    issues.push({
      code: "invalid_component",
      path,
      message: "route component must be an object",
    });
    return null;
  }
  unexpectedKeys(
    raw,
    ["paperCode", "level", "role", "qualificationWeightingPercent", "orderIndex"],
    path,
    issues,
  );
  const paperCode = requireNonEmptyString(raw.paperCode, `${path}.paperCode`, issues);
  const level = requireNonEmptyString(raw.level, `${path}.level`, issues);
  const role = requireEnum(raw.role, COMPONENT_ROLES, `${path}.role`, issues);
  const orderIndex = requireNonNegativeInt(raw.orderIndex, `${path}.orderIndex`, issues);
  let qualificationWeightingPercent: string | null = null;
  if (typeof raw.qualificationWeightingPercent !== "string") {
    issues.push({
      code: "invalid_weight",
      path: `${path}.qualificationWeightingPercent`,
      message: "must be exact decimal text",
    });
  } else {
    try {
      qualificationWeightingPercent = canonicalizeWeightText(
        raw.qualificationWeightingPercent,
        `${path}.qualificationWeightingPercent`,
      );
    } catch (error) {
      if (error instanceof RouteManifestError) {
        issues.push({
          code: error.code,
          path: error.path ?? `${path}.qualificationWeightingPercent`,
          message: error.message.replace(/^[^:]+:\s*/, ""),
        });
      } else {
        throw error;
      }
    }
  }
  if (!paperCode || !level || !role || orderIndex === null || !qualificationWeightingPercent) {
    return null;
  }
  return {
    paperCode,
    level,
    role,
    qualificationWeightingPercent,
    orderIndex,
  };
}

function parseRoute(
  raw: unknown,
  path: string,
  issues: RouteManifestIssue[],
): RouteManifestRoute | null {
  if (!isPlainObject(raw)) {
    issues.push({ code: "invalid_route", path, message: "route must be an object" });
    return null;
  }
  unexpectedKeys(
    raw,
    [
      "key",
      "label",
      "qualificationTarget",
      "pathwayType",
      "progressionEligibility",
      "orderIndex",
      "evidenceRefs",
      "components",
    ],
    path,
    issues,
  );
  const key = requireNonEmptyString(raw.key, `${path}.key`, issues);
  const label = requireNonEmptyString(raw.label, `${path}.label`, issues);
  const qualificationTarget = requireEnum(
    raw.qualificationTarget,
    QUALIFICATION_TARGETS,
    `${path}.qualificationTarget`,
    issues,
  );
  const pathwayType = requireEnum(
    raw.pathwayType,
    PATHWAY_TYPES,
    `${path}.pathwayType`,
    issues,
  );
  const progressionEligibility = requireEnum(
    raw.progressionEligibility,
    PROGRESSION_ELIGIBILITIES,
    `${path}.progressionEligibility`,
    issues,
  );
  const orderIndex = requireNonNegativeInt(raw.orderIndex, `${path}.orderIndex`, issues);

  if (!Array.isArray(raw.evidenceRefs)) {
    issues.push({
      code: "invalid_evidence_refs",
      path: `${path}.evidenceRefs`,
      message: "evidenceRefs must be an array of strings",
    });
  }
  const evidenceRefs: string[] = [];
  if (Array.isArray(raw.evidenceRefs)) {
    raw.evidenceRefs.forEach((ref, index) => {
      const value = requireNonEmptyString(
        ref,
        `${path}.evidenceRefs[${index}]`,
        issues,
      );
      if (value) evidenceRefs.push(value);
    });
  }

  if (!Array.isArray(raw.components) || raw.components.length < 1) {
    issues.push({
      code: "missing_components",
      path: `${path}.components`,
      message: "route must contain at least one component",
    });
  }
  const components: RouteManifestComponent[] = [];
  if (Array.isArray(raw.components)) {
    raw.components.forEach((component, index) => {
      const parsed = parseRouteComponent(
        component,
        `${path}.components[${index}]`,
        issues,
      );
      if (parsed) components.push(parsed);
    });
  }

  if (
    !key ||
    !label ||
    !qualificationTarget ||
    !pathwayType ||
    !progressionEligibility ||
    orderIndex === null ||
    components.length < 1
  ) {
    return null;
  }
  return {
    key,
    label,
    qualificationTarget,
    pathwayType,
    progressionEligibility,
    orderIndex,
    evidenceRefs,
    components,
  };
}

function parseOption(
  raw: unknown,
  path: string,
  issues: RouteManifestIssue[],
): RouteManifestOption | null {
  if (!isPlainObject(raw)) {
    issues.push({ code: "invalid_option", path, message: "option must be an object" });
    return null;
  }
  unexpectedKeys(
    raw,
    ["key", "label", "description", "orderIndex", "units", "unitTitles"],
    path,
    issues,
  );
  const key = requireNonEmptyString(raw.key, `${path}.key`, issues);
  const label = requireNonEmptyString(raw.label, `${path}.label`, issues);
  const orderIndex = requireNonNegativeInt(raw.orderIndex, `${path}.orderIndex`, issues);
  let description: string | null = null;
  if (raw.description !== undefined && raw.description !== null) {
    if (typeof raw.description !== "string") {
      issues.push({
        code: "invalid_description",
        path: `${path}.description`,
        message: "description must be a string or null",
      });
    } else {
      description = raw.description;
    }
  }

  const unitRaw = raw.units ?? raw.unitTitles;
  if (!Array.isArray(unitRaw) || unitRaw.length < 1) {
    issues.push({
      code: "missing_units",
      path: `${path}.units`,
      message: "option must map at least one unit",
    });
  }
  const units: UnitRef[] = [];
  if (Array.isArray(unitRaw)) {
    unitRaw.forEach((unit, index) => {
      const parsed = parseUnitRef(unit, `${path}.units[${index}]`, issues);
      if (parsed) units.push(parsed);
    });
  }

  if (!key || !label || orderIndex === null || units.length < 1) return null;
  return { key, label, description, orderIndex, units };
}

function parseOptionGroup(
  raw: unknown,
  path: string,
  issues: RouteManifestIssue[],
): RouteManifestOptionGroup | null {
  if (!isPlainObject(raw)) {
    issues.push({
      code: "invalid_option_group",
      path,
      message: "study option group must be an object",
    });
    return null;
  }
  unexpectedKeys(
    raw,
    [
      "key",
      "label",
      "qualificationTarget",
      "applicableComponent",
      "applicablePaperCode",
      "applicableLevel",
      "orderIndex",
      "minSelections",
      "maxSelections",
      "options",
    ],
    path,
    issues,
  );
  const key = requireNonEmptyString(raw.key, `${path}.key`, issues);
  const label = requireNonEmptyString(raw.label, `${path}.label`, issues);
  const qualificationTarget = requireEnum(
    raw.qualificationTarget,
    OPTION_GROUP_QUALIFICATION_TARGETS,
    `${path}.qualificationTarget`,
    issues,
  );
  const orderIndex = requireNonNegativeInt(raw.orderIndex, `${path}.orderIndex`, issues);

  let minSelections: number | null = null;
  let maxSelections: number | null = null;
  if (typeof raw.minSelections !== "number" || !Number.isInteger(raw.minSelections)) {
    issues.push({
      code: "invalid_cardinality",
      path: `${path}.minSelections`,
      message: "minSelections must be an integer",
    });
  } else {
    minSelections = raw.minSelections;
  }
  if (typeof raw.maxSelections !== "number" || !Number.isInteger(raw.maxSelections)) {
    issues.push({
      code: "invalid_cardinality",
      path: `${path}.maxSelections`,
      message: "maxSelections must be an integer",
    });
  } else {
    maxSelections = raw.maxSelections;
  }

  let applicableComponent: ComponentRef | null = null;
  if (raw.applicableComponent !== undefined && raw.applicableComponent !== null) {
    applicableComponent = parseComponentRef(
      raw.applicableComponent,
      `${path}.applicableComponent`,
      issues,
    );
  } else if (
    raw.applicablePaperCode !== undefined &&
    raw.applicablePaperCode !== null
  ) {
    // Report 122 authoring convenience: paperCode + optional level.
    if (typeof raw.applicablePaperCode !== "string" || raw.applicablePaperCode.length === 0) {
      issues.push({
        code: "invalid_component_ref",
        path: `${path}.applicablePaperCode`,
        message: "applicablePaperCode must be a non-empty string when set",
      });
    } else if (
      raw.applicableLevel !== undefined &&
      raw.applicableLevel !== null &&
      (typeof raw.applicableLevel !== "string" || raw.applicableLevel.length === 0)
    ) {
      issues.push({
        code: "invalid_component_ref",
        path: `${path}.applicableLevel`,
        message: "applicableLevel must be a non-empty string when set",
      });
    } else if (
      typeof raw.applicableLevel === "string" &&
      raw.applicableLevel.length > 0
    ) {
      applicableComponent = {
        paperCode: raw.applicablePaperCode,
        level: raw.applicableLevel,
      };
    } else {
      issues.push({
        code: "invalid_component_ref",
        path: `${path}.applicableComponent`,
        message:
          "applicable component must include paperCode and level (use applicableComponent or applicablePaperCode+applicableLevel)",
      });
    }
  }

  if (!Array.isArray(raw.options) || raw.options.length < 1) {
    issues.push({
      code: "missing_options",
      path: `${path}.options`,
      message: "option group must contain at least one option",
    });
  }
  const options: RouteManifestOption[] = [];
  if (Array.isArray(raw.options)) {
    raw.options.forEach((option, index) => {
      const parsed = parseOption(option, `${path}.options[${index}]`, issues);
      if (parsed) options.push(parsed);
    });
  }

  if (
    !key ||
    !label ||
    !qualificationTarget ||
    orderIndex === null ||
    minSelections === null ||
    maxSelections === null ||
    options.length < 1
  ) {
    return null;
  }
  return {
    key,
    label,
    qualificationTarget,
    applicableComponent,
    orderIndex,
    minSelections,
    maxSelections,
    options,
  };
}

function parseYearMapping(
  raw: unknown,
  path: string,
  issues: RouteManifestIssue[],
): RouteManifestYearMapping | null {
  if (!isPlainObject(raw)) {
    issues.push({
      code: "invalid_year_mapping",
      path,
      message: "year mapping must be an object",
    });
    return null;
  }
  unexpectedKeys(
    raw,
    [
      "examYear",
      "optionKey",
      "component",
      "paperCode",
      "level",
      "unit",
      "unitTitle",
      "assessmentRole",
    ],
    path,
    issues,
  );

  if (
    typeof raw.examYear !== "number" ||
    !Number.isInteger(raw.examYear) ||
    raw.examYear < 1000 ||
    raw.examYear > 9999
  ) {
    issues.push({
      code: "invalid_exam_year",
      path: `${path}.examYear`,
      message: "examYear must be a four-digit integer year",
    });
  }
  const optionKey = requireNonEmptyString(raw.optionKey, `${path}.optionKey`, issues);
  const assessmentRole = requireNonEmptyString(
    raw.assessmentRole,
    `${path}.assessmentRole`,
    issues,
  );

  let component: ComponentRef | null = null;
  if (raw.component !== undefined) {
    component = parseComponentRef(raw.component, `${path}.component`, issues);
  } else if (typeof raw.paperCode === "string" && typeof raw.level === "string") {
    component = parseComponentRef(
      { paperCode: raw.paperCode, level: raw.level },
      path,
      issues,
    );
  } else {
    issues.push({
      code: "invalid_component_ref",
      path: `${path}.component`,
      message: "year mapping requires component { paperCode, level }",
    });
  }

  let unit: UnitRef | null = null;
  if (raw.unit !== undefined) {
    unit = parseUnitRef(raw.unit, `${path}.unit`, issues);
  } else if (raw.unitTitle !== undefined) {
    unit = parseUnitRef(raw.unitTitle, `${path}.unitTitle`, issues);
  } else {
    issues.push({
      code: "invalid_unit_ref",
      path: `${path}.unit`,
      message: "year mapping requires unit / unitTitle",
    });
  }

  if (
    typeof raw.examYear !== "number" ||
    !Number.isInteger(raw.examYear) ||
    raw.examYear < 1000 ||
    raw.examYear > 9999 ||
    !optionKey ||
    !assessmentRole ||
    !component ||
    !unit
  ) {
    return null;
  }
  return {
    examYear: raw.examYear,
    optionKey,
    component,
    unit,
    assessmentRole,
  };
}

function parseReview(
  raw: unknown,
  path: string,
  issues: RouteManifestIssue[],
): RouteManifestReview | undefined {
  if (raw === undefined) return undefined;
  if (!isPlainObject(raw)) {
    issues.push({ code: "invalid_review", path, message: "review must be an object" });
    return undefined;
  }
  unexpectedKeys(
    raw,
    ["status", "reviewers", "reviewedAt", "auditReport"],
    path,
    issues,
  );
  const status = requireNonEmptyString(raw.status, `${path}.status`, issues);
  const reviewedAt = requireNonEmptyString(raw.reviewedAt, `${path}.reviewedAt`, issues);
  const auditReport = requireNonEmptyString(
    raw.auditReport,
    `${path}.auditReport`,
    issues,
  );
  if (!Array.isArray(raw.reviewers)) {
    issues.push({
      code: "invalid_review",
      path: `${path}.reviewers`,
      message: "reviewers must be an array of strings",
    });
  }
  const reviewers: string[] = [];
  if (Array.isArray(raw.reviewers)) {
    raw.reviewers.forEach((item, index) => {
      const value = requireNonEmptyString(
        item,
        `${path}.reviewers[${index}]`,
        issues,
      );
      if (value) reviewers.push(value);
    });
  }
  if (!status || !reviewedAt || !auditReport) return undefined;
  return { status, reviewers, reviewedAt, auditReport };
}

/**
 * Strict structural parse of a route/reference manifest.
 * Normalizes weight texts and unitTitles sugar; rejects unknown fields.
 */
export function parseRouteManifest(raw: unknown): {
  manifest: RouteManifest | null;
  issues: RouteManifestIssue[];
} {
  const issues: RouteManifestIssue[] = [];
  if (!isPlainObject(raw)) {
    return {
      manifest: null,
      issues: [
        {
          code: "invalid_manifest",
          path: "$",
          message: "manifest must be a JSON object",
        },
      ],
    };
  }

  unexpectedKeys(
    raw,
    [
      "$schema",
      "schema",
      "schemaVersion",
      "subjectCode",
      "syllabusRevisionKey",
      "routeRevisionKey",
      "sources",
      "routes",
      "studyOptionGroups",
      "yearRotationMappings",
      "review",
    ],
    "$",
    issues,
  );

  if (raw.schemaVersion !== ROUTE_MANIFEST_SCHEMA_VERSION) {
    issues.push({
      code: "unsupported_schema_version",
      path: "$.schemaVersion",
      message: `schemaVersion must be ${ROUTE_MANIFEST_SCHEMA_VERSION}`,
    });
  }

  const subjectCode = requireNonEmptyString(raw.subjectCode, "$.subjectCode", issues);
  if (subjectCode && !SUBJECT_CODE_RE.test(subjectCode)) {
    issues.push({
      code: "invalid_subject_code",
      path: "$.subjectCode",
      message: "subjectCode must be a four-digit Cambridge code",
    });
  }

  const syllabusRevisionKey = requireNonEmptyString(
    raw.syllabusRevisionKey,
    "$.syllabusRevisionKey",
    issues,
  );
  if (
    subjectCode &&
    syllabusRevisionKey &&
    (!REVISION_KEY_RE.test(syllabusRevisionKey) ||
      !syllabusRevisionKey.startsWith(`${subjectCode}-`))
  ) {
    issues.push({
      code: "invalid_syllabus_revision_key",
      path: "$.syllabusRevisionKey",
      message: `syllabusRevisionKey must be ${subjectCode}-rNNN`,
    });
  }

  const routeRevisionKey = requireNonEmptyString(
    raw.routeRevisionKey,
    "$.routeRevisionKey",
    issues,
  );

  if (!Array.isArray(raw.sources) || raw.sources.length < 1) {
    issues.push({
      code: "missing_sources",
      path: "$.sources",
      message: "sources must contain at least one entry",
    });
  }
  const sources: RouteManifestSource[] = [];
  if (Array.isArray(raw.sources)) {
    raw.sources.forEach((source, index) => {
      const parsed = parseSource(source, `$.sources[${index}]`, issues);
      if (parsed) sources.push(parsed);
    });
  }

  if (!Array.isArray(raw.routes) || raw.routes.length < 1) {
    issues.push({
      code: "missing_routes",
      path: "$.routes",
      message: "routes must contain at least one route",
    });
  }
  const routes: RouteManifestRoute[] = [];
  if (Array.isArray(raw.routes)) {
    raw.routes.forEach((route, index) => {
      const parsed = parseRoute(route, `$.routes[${index}]`, issues);
      if (parsed) routes.push(parsed);
    });
  }

  const studyOptionGroups: RouteManifestOptionGroup[] = [];
  if (raw.studyOptionGroups === undefined) {
    // Optional empty groups allowed.
  } else if (!Array.isArray(raw.studyOptionGroups)) {
    issues.push({
      code: "invalid_option_groups",
      path: "$.studyOptionGroups",
      message: "studyOptionGroups must be an array",
    });
  } else {
    raw.studyOptionGroups.forEach((group, index) => {
      const parsed = parseOptionGroup(
        group,
        `$.studyOptionGroups[${index}]`,
        issues,
      );
      if (parsed) studyOptionGroups.push(parsed);
    });
  }

  const yearRotationMappings: RouteManifestYearMapping[] = [];
  if (raw.yearRotationMappings === undefined) {
    // Optional.
  } else if (!Array.isArray(raw.yearRotationMappings)) {
    issues.push({
      code: "invalid_year_mappings",
      path: "$.yearRotationMappings",
      message: "yearRotationMappings must be an array",
    });
  } else {
    raw.yearRotationMappings.forEach((mapping, index) => {
      const parsed = parseYearMapping(
        mapping,
        `$.yearRotationMappings[${index}]`,
        issues,
      );
      if (parsed) yearRotationMappings.push(parsed);
    });
  }

  let schema: string | undefined;
  if (raw.$schema !== undefined || raw.schema !== undefined) {
    const schemaValue = raw.$schema ?? raw.schema;
    if (typeof schemaValue !== "string" || schemaValue.length === 0) {
      issues.push({
        code: "invalid_schema_pointer",
        path: "$.$schema",
        message: "$schema must be a non-empty string when present",
      });
    } else {
      schema = schemaValue;
    }
  }

  const review = parseReview(raw.review, "$.review", issues);

  if (
    issues.length > 0 ||
    raw.schemaVersion !== ROUTE_MANIFEST_SCHEMA_VERSION ||
    !subjectCode ||
    !SUBJECT_CODE_RE.test(subjectCode) ||
    !syllabusRevisionKey ||
    !routeRevisionKey ||
    sources.length < 1 ||
    routes.length < 1
  ) {
    return { manifest: null, issues };
  }

  return {
    manifest: {
      schemaVersion: ROUTE_MANIFEST_SCHEMA_VERSION,
      subjectCode,
      syllabusRevisionKey,
      routeRevisionKey,
      sources,
      routes,
      studyOptionGroups,
      yearRotationMappings,
      schema,
      review,
    },
    issues,
  };
}

export function parseRouteManifestOrThrow(raw: unknown): RouteManifest {
  const { manifest, issues } = parseRouteManifest(raw);
  if (!manifest || issues.length > 0) {
    throw new RouteManifestError(
      "invalid_manifest",
      issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ") ||
        "invalid manifest",
    );
  }
  return manifest;
}
