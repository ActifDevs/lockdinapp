/** Approximate Cambridge A-Level grade from percentage (UI estimate only). */
export function percentageToGrade(pct: number): string {
  if (pct >= 90) return "A*";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  if (pct >= 40) return "E";
  return "U";
}

/** Typical A-grade boundary display for past-paper context. */
export function gradeBoundaryHint(pct: number): number {
  if (pct >= 85) return 72;
  if (pct >= 75) return 67;
  if (pct >= 65) return 62;
  return 58;
}

export function gradeTone(grade: string): "gold" | "green" | "blue" | "amber" | "muted" {
  if (grade.startsWith("A")) return "gold";
  if (grade === "B") return "green";
  if (grade === "C") return "blue";
  if (grade === "D" || grade === "E") return "amber";
  return "muted";
}
