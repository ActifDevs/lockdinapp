import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { syllabusLearningOutcomesTable } from "./syllabusLearningOutcomes";
import { assessmentComponentsTable } from "./assessmentComponents";

/**
 * Many-to-many junction between a normalized Learning Outcome and the paper(s) that
 * examine it. `componentId` is nullable to support Biology-style syllabus-wide rows
 * (e.g. "Mathematical requirements") that carry no Paper Code at all; `level` is kept
 * here even though it usually matches `assessment_components.level`, because it is the
 * only place to preserve the CSV's Level column when componentId is null.
 *
 * Re-running the importer recomputes this table's rows for a syllabus version from
 * scratch inside the same transaction as the rest of the version's upsert, which is
 * what actually guarantees idempotency here (a plain unique constraint can't fully
 * dedupe a nullable FK column, since Postgres treats every NULL as distinct).
 */
export const learningOutcomeComponentsTable = pgTable(
  "learning_outcome_components",
  {
    id: serial("id").primaryKey(),
    learningOutcomeId: integer("learning_outcome_id")
      .notNull()
      .references(() => syllabusLearningOutcomesTable.id, { onDelete: "cascade" }),
    componentId: integer("component_id").references(() => assessmentComponentsTable.id, { onDelete: "cascade" }),
    level: text("level").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("learning_outcome_components_outcome_component_level_unique").on(
      table.learningOutcomeId,
      table.componentId,
      table.level,
    ),
  ],
);

export const insertLearningOutcomeComponentSchema = createInsertSchema(learningOutcomeComponentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertLearningOutcomeComponent = z.infer<typeof insertLearningOutcomeComponentSchema>;
export type LearningOutcomeComponent = typeof learningOutcomeComponentsTable.$inferSelect;
