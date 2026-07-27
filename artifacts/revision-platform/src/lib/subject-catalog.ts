export type SubjectCatalogItem = {
  /** Cambridge syllabus code — used as the stable identity for create/upsert */
  code: string;
  name: string;
  /** Hex color for subject accent (bars, dots, badges — not full cards) */
  color: string;
  /** Tailwind swatch class for picker UI */
  swatchClass: string;
};

/**
 * Distinct subject identities — restrained chroma, readable on light and dark.
 * Used for progress bars, icons, accent lines, badges, and charts only.
 */
export const SUBJECT_CATALOG: SubjectCatalogItem[] = [
  {
    code: "9709",
    name: "Mathematics",
    color: "#7C5CFC",
    swatchClass: "bg-[hsl(252_96%_68%)]",
  },
  {
    code: "9231",
    name: "Further Mathematics",
    color: "#DC2626",
    swatchClass: "bg-[hsl(0_72%_51%)]",
  },
  {
    code: "9702",
    name: "Physics",
    color: "#3B82F6",
    swatchClass: "bg-[hsl(217_91%_60%)]",
  },
  {
    code: "9701",
    name: "Chemistry",
    color: "#F59E0B",
    swatchClass: "bg-[hsl(38_92%_50%)]",
  },
  {
    code: "9618",
    name: "Computer Science",
    color: "#10B981",
    swatchClass: "bg-[hsl(160_84%_39%)]",
  },
  {
    code: "9700",
    name: "Biology",
    color: "#84CC16",
    swatchClass: "bg-[hsl(85_85%_45%)]",
  },
  {
    code: "9708",
    name: "Economics",
    color: "#F43F5E",
    swatchClass: "bg-[hsl(347_89%_60%)]",
  },
  {
    code: "9609",
    name: "Business",
    color: "#F97316",
    swatchClass: "bg-[hsl(25_95%_53%)]",
  },
  {
    code: "9489",
    name: "History",
    color: "#A855F7",
    swatchClass: "bg-[hsl(271_91%_65%)]",
  },
];

export function catalogByCode(code: string): SubjectCatalogItem | undefined {
  return SUBJECT_CATALOG.find((s) => s.code === code);
}
