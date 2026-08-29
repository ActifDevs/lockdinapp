import type { Response } from "express";
import {
  REFERENCE_CONTEXT_UNAVAILABLE,
  ReferenceContextLookupError,
  type ReferenceSyllabusResolution,
  resolvedVersionId,
} from "./resolve-reference-syllabus-version";

export function versionIdFromResolution(
  res: Response,
  resolution: ReferenceSyllabusResolution,
): number | null | undefined {
  if (resolution.kind === "invariant") {
    res.status(409).json({ error: REFERENCE_CONTEXT_UNAVAILABLE });
    return undefined;
  }
  return resolvedVersionId(resolution);
}

export function sendReferenceLookupFailure(res: Response): void {
  res.status(500).json({ error: "Internal server error" });
}

export function isReferenceLookupError(error: unknown): boolean {
  return error instanceof ReferenceContextLookupError;
}
