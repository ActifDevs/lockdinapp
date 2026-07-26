export type SubjectCatalogItem = {
  /** Cambridge syllabus code — used as the stable identity for create/upsert */
  code: string;
  name: string;
  /** Hex color for subject accent */
  color: string;
  /** Tailwind swatch class for picker UI */
  swatchClass: string;
};

/** Subject accents drawn from the brand palette (deep / teal / coral / amber) */
export const SUBJECT_CATALOG: SubjectCatalogItem[] = [
  {
    code: "9709",
    name: "Mathematics",
    color: "#006D77",
    swatchClass: "bg-[hsl(185_100%_23%)]",
  },
  {
    code: "9702",
    name: "Physics",
    color: "#00B8A9",
    swatchClass: "bg-[hsl(175_100%_36%)]",
  },
  {
    code: "9701",
    name: "Chemistry",
    color: "#FF5A6E",
    swatchClass: "bg-[hsl(353_100%_68%)]",
  },
  {
    code: "9618",
    name: "Computer Science",
    color: "#005964",
    swatchClass: "bg-[hsl(185_100%_20%)]",
  },
  {
    code: "9700",
    name: "Biology",
    color: "#149C8E",
    swatchClass: "bg-[hsl(175_75%_35%)]",
  },
  {
    code: "9708",
    name: "Economics",
    color: "#FFB703",
    swatchClass: "bg-[hsl(43_100%_51%)]",
  },
  {
    code: "9609",
    name: "Business",
    color: "#E89A00",
    swatchClass: "bg-[hsl(40_100%_45%)]",
  },
  {
    code: "9489",
    name: "History",
    color: "#E8485A",
    swatchClass: "bg-[hsl(353_80%_60%)]",
  },
];

export function catalogByCode(code: string): SubjectCatalogItem | undefined {
  return SUBJECT_CATALOG.find((s) => s.code === code);
}
