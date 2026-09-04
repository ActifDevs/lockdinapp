import { createHash } from "node:crypto";
import {
  canonicalizeRouteManifest,
  serializeCanonicalRouteManifest,
} from "./canonicalize.js";
import type { RouteManifest } from "./types.js";
import { validateRouteManifestOrThrow } from "./validate.js";

/**
 * HASHED fields (semantic contract):
 * - schemaVersion, subjectCode, syllabusRevisionKey, routeRevisionKey
 * - sources (all source metadata fields)
 * - routes (keys, labels, targets, pathway, progression, orderIndex, evidenceRefs)
 * - route components (paperCode, level, role, canonical weighting, orderIndex)
 * - studyOptionGroups (keys, labels, applicability, cardinality, options, units)
 * - yearRotationMappings (examYear, optionKey, component, unit, assessmentRole)
 *
 * NON-HASHED metadata:
 * - $schema / schema file pointer
 * - review block (status, reviewers, reviewedAt, auditReport)
 * - incidental JSON property ordering / array input ordering (normalized away)
 */
export function hashCanonicalRouteManifest(canonical: ReturnType<
  typeof canonicalizeRouteManifest
>): string {
  return createHash("sha256")
    .update(serializeCanonicalRouteManifest(canonical), "utf8")
    .digest("hex");
}

export function hashRouteManifest(manifest: RouteManifest): string {
  validateRouteManifestOrThrow(manifest);
  return hashCanonicalRouteManifest(canonicalizeRouteManifest(manifest));
}
