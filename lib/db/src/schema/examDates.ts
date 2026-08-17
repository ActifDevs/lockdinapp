import {
  pgTable,
  serial,
  text,
  integer,
  date,
  index,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";

/**
 * A student's personal exam date entry.
 *
 * Each row is owned by one authenticated user. The auth.users foreign key is
 * migration-managed because Drizzle does not own Supabase's auth schema.
 * Authenticated privileges are SELECT/INSERT/DELETE only — no UPDATE.
 */
export const examDatesTable = pgTable(
  "exam_dates",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "cascade" }),
    paperCode: text("paper_code").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    notes: text("notes"),
  },
  (table) => [
    index("exam_dates_user_date_id_idx").on(
      table.userId,
      table.date,
      table.id,
    ),
  ],
);

export const insertExamDateSchema = createInsertSchema(examDatesTable).omit({
  id: true,
  userId: true,
});
export type InsertExamDate = z.infer<typeof insertExamDateSchema>;
export type ExamDate = typeof examDatesTable.$inferSelect;
