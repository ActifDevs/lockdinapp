import { pgTable, serial, text, integer, real, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { syllabusVersionsTable } from "./syllabusVersions";

/**
 * A paper/component definition within a syllabus version (e.g. "9700/1 AS Level —
 * Paper 1 Multiple Choice"). Level-aware by design: the same Paper Code legitimately
 * appears once per qualification level with different weighting (AS Level vs A Level),
 * so the natural key is (syllabusVersionId, paperCode, level), never paperCode alone.
 */
export const assessmentComponentsTable = pgTable(
  "assessment_components",
  {
    id: serial("id").primaryKey(),
    syllabusVersionId: integer("syllabus_version_id")
      .notNull()
      .references(() => syllabusVersionsTable.id, { onDelete: "cascade" }),
    paperCode: text("paper_code").notNull(),
    level: text("level").notNull(),
    componentName: text("component_name").notNull(),
    durationMinutes: integer("duration_minutes"),
    totalMarks: integer("total_marks"),
    weightingPercent: real("weighting_percent"),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("assessment_components_version_paper_level_unique").on(
      table.syllabusVersionId,
      table.paperCode,
      table.level,
    ),
  ],
);

export const insertAssessmentComponentSchema = createInsertSchema(assessmentComponentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAssessmentComponent = z.infer<typeof insertAssessmentComponentSchema>;
export type AssessmentComponent = typeof assessmentComponentsTable.$inferSelect;
