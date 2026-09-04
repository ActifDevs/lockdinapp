import { boolean, pgTable, serial, text, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subjectsTable = pgTable(
  "subjects",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    color: text("color").notNull(),
    /**
     * Catalogue enrollment gate. Existing memberships remain accessible when false.
     * New subjects should be inserted as false until cutover intentionally opens them.
     */
    selectableForNewMemberships: boolean("selectable_for_new_memberships")
      .notNull()
      .default(false),
  },
  (table) => [unique("subjects_code_unique").on(table.code)],
);

export const insertSubjectSchema = createInsertSchema(subjectsTable).omit({ id: true });
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjectsTable.$inferSelect;
