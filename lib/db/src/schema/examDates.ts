import { pgTable, serial, text, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";

export const examDatesTable = pgTable("exam_dates", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  paperCode: text("paper_code").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  notes: text("notes"),
});

export const insertExamDateSchema = createInsertSchema(examDatesTable).omit({ id: true });
export type InsertExamDate = z.infer<typeof insertExamDateSchema>;
export type ExamDate = typeof examDatesTable.$inferSelect;
