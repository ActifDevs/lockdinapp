import { pgTable, serial, text, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";
import { syllabusVersionsTable } from "./syllabusVersions";

/** Main Topic in the syllabus CSVs. */
export const syllabusUnitsTable = pgTable(
  "syllabus_units",
  {
    id: serial("id").primaryKey(),
    // Denormalized for query convenience (existing API filters by subjectId directly);
    // syllabusVersionId is the authoritative link maintained by the importer.
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "cascade" }),
    syllabusVersionId: integer("syllabus_version_id")
      .notNull()
      .references(() => syllabusVersionsTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (table) => [unique("syllabus_units_version_title_unique").on(table.syllabusVersionId, table.title)],
);

export const insertSyllabusUnitSchema = createInsertSchema(syllabusUnitsTable).omit({ id: true });
export type InsertSyllabusUnit = z.infer<typeof insertSyllabusUnitSchema>;
export type SyllabusUnit = typeof syllabusUnitsTable.$inferSelect;
