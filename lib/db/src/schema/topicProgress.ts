import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";
import { syllabusTopicsTable } from "./syllabusTopics";

export const TOPIC_PROGRESS_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
] as const;

/**
 * Per-user progress against a shared syllabus topic.
 *
 * Canonical topic rows remain shared reference data. Absence of a progress row
 * means default state (not_started, no note). Auth FK is enforced in migration
 * SQL so drizzle-kit never emits DDL against auth.users.
 */
export const topicProgressTable = pgTable(
  "topic_progress",
  {
    userId: uuid("user_id").notNull(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => syllabusTopicsTable.id, { onDelete: "cascade" }),
    status: text("status", { enum: TOPIC_PROGRESS_STATUSES })
      .notNull()
      .default("not_started"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "topic_progress_user_id_topic_id_pk",
      columns: [table.userId, table.topicId],
    }),
    index("topic_progress_topic_id_idx").on(table.topicId),
    check(
      "topic_progress_status_check",
      sql`${table.status} in ('not_started', 'in_progress', 'completed')`,
    ),
    check(
      "topic_progress_notes_length_check",
      sql`${table.notes} is null or char_length(${table.notes}) <= 2000`,
    ),
  ],
);

export const insertTopicProgressSchema = createInsertSchema(topicProgressTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertTopicProgress = z.infer<typeof insertTopicProgressSchema>;
export type TopicProgress = typeof topicProgressTable.$inferSelect;
