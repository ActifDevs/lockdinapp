import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";

export const syllabusUnitsTable = pgTable("syllabus_units", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

export const insertSyllabusUnitSchema = createInsertSchema(syllabusUnitsTable).omit({ id: true });
export type InsertSyllabusUnit = z.infer<typeof insertSyllabusUnitSchema>;
export type SyllabusUnit = typeof syllabusUnitsTable.$inferSelect;
