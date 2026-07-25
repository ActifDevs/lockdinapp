import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { syllabusUnitsTable } from "./syllabusUnits";
import { subjectsTable } from "./subjects";

export const syllabusTopicsTable = pgTable("syllabus_topics", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id")
    .notNull()
    .references(() => syllabusUnitsTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status", { enum: ["not_started", "in_progress", "completed"] })
    .notNull()
    .default("not_started"),
  notes: text("notes"),
  orderIndex: integer("order_index").notNull().default(0),
});

export const insertSyllabusTopicSchema = createInsertSchema(syllabusTopicsTable).omit({ id: true });
export type InsertSyllabusTopic = z.infer<typeof insertSyllabusTopicSchema>;
export type SyllabusTopic = typeof syllabusTopicsTable.$inferSelect;
