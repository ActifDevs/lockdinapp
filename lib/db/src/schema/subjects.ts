import { pgTable, serial, text, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subjectsTable = pgTable(
  "subjects",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    color: text("color").notNull(),
  },
  (table) => [unique("subjects_code_unique").on(table.code)],
);

export const insertSubjectSchema = createInsertSchema(subjectsTable).omit({ id: true });
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjectsTable.$inferSelect;
