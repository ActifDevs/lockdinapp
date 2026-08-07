import {
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";
import { syllabusVersionsTable } from "./syllabusVersions";

/**
 * Durable, user-owned subject membership with a pinned syllabus version.
 * Canonical subjects and syllabus content remain shared reference data.
 */
export const userSubjectsTable = pgTable(
  "user_subjects",
  {
    userId: uuid("user_id").notNull(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "restrict" }),
    syllabusVersionId: integer("syllabus_version_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "user_subjects_user_id_subject_id_pk",
      columns: [table.userId, table.subjectId],
    }),
    foreignKey({
      name: "user_subjects_subject_version_fk",
      columns: [table.subjectId, table.syllabusVersionId],
      foreignColumns: [syllabusVersionsTable.subjectId, syllabusVersionsTable.id],
    }).onDelete("restrict"),
    index("user_subjects_subject_version_idx").on(
      table.subjectId,
      table.syllabusVersionId,
    ),
  ],
);

export const insertUserSubjectSchema = createInsertSchema(userSubjectsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertUserSubject = z.infer<typeof insertUserSubjectSchema>;
export type UserSubject = typeof userSubjectsTable.$inferSelect;
