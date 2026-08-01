import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";
import { syllabusTopicsTable } from "./syllabusTopics";

/**
 * Student tasks. `user_id` is added nullable in Phase 2 Slice 1 pending a
 * hosted-row audit; the FK to `auth.users(id)` lives in migration SQL (not
 * `.references()` here) so drizzle-kit cannot manage the Auth schema.
 * NOT NULL + full multi-tenant cutover remain blocked on that audit.
 */
export const tasksTable = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id"),
    title: text("title").notNull(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "cascade" }),
    topicId: integer("topic_id").references(() => syllabusTopicsTable.id, { onDelete: "set null" }),
    deadline: date("deadline", { mode: "string" }),
    priority: text("priority", { enum: ["low", "medium", "high"] }).notNull().default("medium"),
    estimatedMinutes: integer("estimated_minutes"),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("tasks_user_id_idx").on(table.userId)],
);

// userId is never client-controlled: omitted so no request body derived from
// this schema can choose its own owner. Server code that must insert a row
// with a known userId (e.g. from an authenticated session) should use the
// full inferred row type below, not this schema, to set it explicitly.
export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  userId: true,
  createdAt: true,
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
