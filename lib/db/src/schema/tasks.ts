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
 * Student tasks are fully user-owned after the Phase 2 cutover.
 * The auth.users foreign key remains migration-managed because Drizzle's
 * TypeScript schema does not manage Supabase's auth schema.
 * user_id is required for every task.
 */
export const tasksTable = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull(),
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
