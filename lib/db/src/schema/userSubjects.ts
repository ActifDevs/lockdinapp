import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { assessmentRoutesTable } from "./assessmentRoutes";
import { subjectsTable } from "./subjects";
import { examSittingSeriesEnum, syllabusVersionsTable } from "./syllabusVersions";

/**
 * Durable, user-owned subject membership with a pinned syllabus version.
 * Canonical subjects and syllabus content remain shared reference data.
 *
 * `intended_exam_*` is authoritative membership session metadata (Model C).
 * `assessment_route_id` is nullable for legacy memberships and references a
 * canonical route within the exact pinned syllabus version.
 */
export const userSubjectsTable = pgTable(
  "user_subjects",
  {
    userId: uuid("user_id").notNull(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "restrict" }),
    syllabusVersionId: integer("syllabus_version_id").notNull(),
    assessmentRouteId: integer("assessment_route_id"),
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
    unique("user_subjects_user_id_subject_id_syllabus_version_id_unique").on(
      table.userId,
      table.subjectId,
      table.syllabusVersionId,
    ),
    foreignKey({
      name: "user_subjects_subject_version_fk",
      columns: [table.subjectId, table.syllabusVersionId],
      foreignColumns: [syllabusVersionsTable.subjectId, syllabusVersionsTable.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "user_subjects_assessment_route_fk",
      columns: [table.assessmentRouteId, table.syllabusVersionId],
      foreignColumns: [
        assessmentRoutesTable.id,
        assessmentRoutesTable.syllabusVersionId,
      ],
    }).onDelete("restrict"),
    index("user_subjects_subject_version_idx").on(
      table.subjectId,
      table.syllabusVersionId,
    ),
    index("user_subjects_assessment_route_version_idx").on(
      table.assessmentRouteId,
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
