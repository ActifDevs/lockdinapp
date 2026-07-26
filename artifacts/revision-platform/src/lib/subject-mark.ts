import { Atom, Binary, BookOpen, Calculator, Dna, FlaskConical, Landmark, LineChart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Lucide marks for Cambridge subjects — recognition, not decoration */
export function subjectMark(nameOrCode: string): LucideIcon {
  const key = nameOrCode.toLowerCase();
  if (key.includes("9709") || key.includes("math")) return Calculator;
  if (key.includes("9702") || key.includes("physics")) return Atom;
  if (key.includes("9701") || key.includes("chem")) return FlaskConical;
  if (key.includes("9618") || key.includes("computer") || key.includes("comp sci")) return Binary;
  if (key.includes("9700") || key.includes("bio")) return Dna;
  if (key.includes("9708") || key.includes("econ")) return LineChart;
  if (key.includes("9609") || key.includes("business")) return LineChart;
  if (key.includes("9489") || key.includes("history")) return Landmark;
  return BookOpen;
}

export function priorityDifficulty(priority: "low" | "medium" | "high"): 1 | 2 | 3 {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}
