import { readFileSync } from "node:fs";
import { RouteManifestError, RouteManifestValidationError } from "./errors.js";
import { hashRouteManifest } from "./hash.js";
import { parseRouteManifest } from "./parse.js";
import {
  canonicalizeRouteManifest,
  serializeCanonicalRouteManifest,
} from "./canonicalize.js";
import type { RouteManifest } from "./types.js";
import { validateRouteManifestSemantics } from "./validate.js";
import {
  resolveRouteManifestAgainstCatalog,
  type ReferenceCatalog,
} from "./resolve.js";

export function loadRouteManifestJson(filePath: string): unknown {
  try {
    const text = readFileSync(filePath, "utf8");
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new RouteManifestError(
      "manifest_read_failed",
      error instanceof Error ? error.message : String(error),
      filePath,
    );
  }
}

export type ValidateRouteManifestResult =
  | { ok: true; manifest: RouteManifest }
  | { ok: false; issues: ReturnType<typeof validateRouteManifestSemantics> };

export function validateRouteManifestDocument(
  raw: unknown,
): ValidateRouteManifestResult {
  const { manifest, issues: parseIssues } = parseRouteManifest(raw);
  if (!manifest) {
    return { ok: false, issues: parseIssues };
  }
  const semanticIssues = validateRouteManifestSemantics(manifest);
  const issues = [...parseIssues, ...semanticIssues];
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, manifest };
}

export function validateAndHashRouteManifest(raw: unknown): {
  manifest: RouteManifest;
  hash: string;
  canonicalJson: string;
} {
  const result = validateRouteManifestDocument(raw);
  if (!result.ok) {
    throw new RouteManifestValidationError(result.issues);
  }
  const canonical = canonicalizeRouteManifest(result.manifest);
  return {
    manifest: result.manifest,
    hash: hashRouteManifest(result.manifest),
    canonicalJson: serializeCanonicalRouteManifest(canonical),
  };
}

export function validateRouteManifestAgainstCatalogDocument(
  raw: unknown,
  catalog: ReferenceCatalog,
): ValidateRouteManifestResult {
  const base = validateRouteManifestDocument(raw);
  if (!base.ok) return base;
  const issues = resolveRouteManifestAgainstCatalog(base.manifest, catalog);
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return base;
}
