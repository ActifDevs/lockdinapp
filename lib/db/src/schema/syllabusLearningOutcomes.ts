import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { syllabusTopicsTable } from "./syllabusTopics";

/**
 * A single Learning Outcome under a Subtopic. Normalized once per (topicId, outcome) —
 * a CSV row that repeats the same outcome text across multiple papers/components does
 * NOT create duplicate rows here; the relationship to each paper/level lives in
 * `learning_outcome_components` instead.
 */
export const syllabusLearningOutcomesTable = pgTable(
  "syllabus_learning_outcomes",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => syllabusTopicsTable.id, { onDelete: "cascade" }),
    outcome: text("outcome").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("syllabus_learning_outcomes_topic_outcome_unique").on(table.topicId, table.outcome)],
);

export const insertSyllabusLearningOutcomeSchema = createInsertSchema(syllabusLearningOutcomesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSyllabusLearningOutcome = z.infer<typeof insertSyllabusLearningOutcomeSchema>;
export type SyllabusLearningOutcome = typeof syllabusLearningOutcomesTable.$inferSelect;
