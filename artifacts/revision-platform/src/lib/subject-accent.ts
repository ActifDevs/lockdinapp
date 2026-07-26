import { SUBJECT_CATALOG, catalogByCode } from "@/lib/subject-catalog";

const FALLBACK = "#6366F1";

/**
 * Prefer the curated catalog accent (by Cambridge code, then name) so
 * subject identity stays intentional even when stored DB colours are legacy.
 */
export function resolveSubjectAccent(opts: {
  code?: string | null;
  name?: string | null;
  color?: string | null;
}): string {
  if (opts.code) {
    const byCode = catalogByCode(opts.code);
    if (byCode) return byCode.color;
  }

  if (opts.name) {
    const needle = opts.name.trim().toLowerCase();
    const byName = SUBJECT_CATALOG.find((s) => s.name.toLowerCase() === needle);
    if (byName) return byName.color;
  }

  return opts.color?.trim() || FALLBACK;
}
