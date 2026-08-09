import { pgTable, serial, text, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { syllabusUnitsTable } from "./syllabusUnits";
import { subjectsTable } from "./subjects";

/**
 * Shared Cambridge syllabus subtopic (reference data only).
 *
 * Per-user progress lives in `topic_progress` (Phase 3 Slice 2A). Legacy
 * `status`/`notes` columns on this table were removed in Slice 2B.
 */
export const syllabusTopicsTable = pgTable(
  "syllabus_topics",
  {
    id: serial("id").primaryKey(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => syllabusUnitsTable.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (table) => [unique("syllabus_topics_unit_title_unique").on(table.unitId, table.title)],
);

export const insertSyllabusTopicSchema = createInsertSchema(syllabusTopicsTable).omit({ id: true });
export type InsertSyllabusTopic = z.infer<typeof insertSyllabusTopicSchema>;
export type SyllabusTopic = typeof syllabusTopicsTable.$inferSelect;
