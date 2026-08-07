import { pgTable, serial, text, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";

/**
 * A specific Cambridge syllabus specification for a subject (e.g. "9702 current spec").
 * Shared reference data. Syllabus content (units/topics/learning outcomes/components)
 * hangs off a version, not directly off a subject, so a future syllabus update never
 * silently reshapes content that existing selections/progress already point at.
 */
export const syllabusVersionsTable = pgTable(
  "syllabus_versions",
  {
    id: serial("id").primaryKey(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "cascade" }),
    examBoard: text("exam_board").notNull(),
    qualification: text("qualification").notNull(),
    label: text("label").notNull(),
    // Nullable on purpose: exact Cambridge syllabus validity windows are not guessed.
    // Populate from the import manifest once the team confirms them.
    validFrom: text("valid_from"),
    validTo: text("valid_to"),
    isCurrent: boolean("is_current").notNull().default(true),
    sourceFile: text("source_file").notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("syllabus_versions_subject_source_unique").on(table.subjectId, table.sourceFile),
    // Supports the composite user_subjects FK that prevents cross-subject
    // syllabus-version pins (for example Physics + a Chemistry version).
    unique("syllabus_versions_subject_id_id_unique").on(table.subjectId, table.id),
  ],
);

export const insertSyllabusVersionSchema = createInsertSchema(syllabusVersionsTable).omit({
  id: true,
  importedAt: true,
});
export type InsertSyllabusVersion = z.infer<typeof insertSyllabusVersionSchema>;
export type SyllabusVersion = typeof syllabusVersionsTable.$inferSelect;
