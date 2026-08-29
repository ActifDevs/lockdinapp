import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";
import { examSittingSeriesEnum, syllabusVersionsTable } from "./syllabusVersions";

/**
 * Durable, user-owned subject membership with a pinned syllabus version.
 * Canonical subjects and syllabus content remain shared reference data.
 *
 * `intended_exam_*` is authoritative membership session metadata (Model C).
 * 6.3C2A stores it when the client supplies structured session data.
 * New pins still use DEFAULT (`is_current`) until the later C2B cutover.
 */
export const userSubjectsTable = pgTable(
  "user_subjects",
  {
    userId: uuid("user_id").notNull(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "restrict" }),
    syllabusVersionId: integer("syllabus_version_id").notNull(),
    intendedExamYear: integer("intended_exam_year"),
    intendedExamSeries: examSittingSeriesEnum("intended_exam_series"),
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
    check(
      "user_subjects_intended_session_complete",
      sql`(
        ${table.intendedExamYear} is null
        and ${table.intendedExamSeries} is null
      ) or (
        ${table.intendedExamYear} is not null
        and ${table.intendedExamSeries} is not null
      )`,
    ),
    check(
      "user_subjects_intended_exam_year_four_digit",
      sql`${table.intendedExamYear} is null or ${table.intendedExamYear} between 1000 and 9999`,
    ),
  ],
);

export const insertUserSubjectSchema = createInsertSchema(userSubjectsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertUserSubject = z.infer<typeof insertUserSubjectSchema>;
export type UserSubject = typeof userSubjectsTable.$inferSelect;
