import type { AssessmentComponent } from "@workspace/db";

/**
 * Derives a compact display string like "9700/42 — May/June" from the structured
 * Subject + Component + Variant + Session identity. This is computed at read time —
 * never stored, never typed by hand — per the Component/Variant/Session redesign.
 */
export function computePaperLabel(params: {
  subjectCode: string;
  component: AssessmentComponent | null;
  variant: number | null;
  session: string;
}): string {
  const { subjectCode, component, variant, session } = params;
  const base = component ? `${component.paperCode}${variant ?? ""}` : subjectCode;
  return `${base} — ${session}`;
}
