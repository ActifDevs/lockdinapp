import { pgTable, serial, text, integer, real, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";

export const pastPapersTable = pgTable("past_papers", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  paperCode: text("paper_code").notNull(),
  session: text("session").notNull(),
  score: real("score").notNull(),
  totalMarks: integer("total_marks").notNull(),
  percentage: real("percentage").notNull(),
  dateAttempted: date("date_attempted", { mode: "string" }).notNull(),
  timeTakenMinutes: integer("time_taken_minutes"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPastPaperSchema = createInsertSchema(pastPapersTable).omit({ id: true, createdAt: true });
export type InsertPastPaper = z.infer<typeof insertPastPaperSchema>;
export type PastPaper = typeof pastPapersTable.$inferSelect;
