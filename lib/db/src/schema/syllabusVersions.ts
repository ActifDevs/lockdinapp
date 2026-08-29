import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  unique,
  uniqueIndex,
  check,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";

/**
 * Real Cambridge sitting series used for syllabus applicability.
 * Distinct from past-paper `Specimen`, which is not a final exam sitting.
 */
export const examSittingSeriesEnum = pgEnum("exam_sitting_series", [
  "Feb/Mar",
  "May/June",
  "Oct/Nov",
]);

export const syllabusVersionLifecycleEnum = pgEnum(
  "syllabus_version_lifecycle",
  ["draft", "published", "retired", "archived"],
);

const int4range = customType<{ data: string; driverData: string }>({
  dataType() {
    return "int4range";
  },
});

/**
 * A specific Cambridge syllabus specification for a subject.
 * Shared reference data. Units/topics/outcomes/components hang off a version.
 *
 * Lifecycle (draft/published/retired/archived) is schema-supported here.
 * Published-graph immutability is a 6.3B importer contract, not a trigger.
 *
 * `is_current` remains the administrative DEFAULT flag (exactly one true per
 * subject). It must not be treated as “move all users”.
 *
 * Applicability windows are structured year+series; values stay NULL until
 * 6.3B+ supplies real Cambridge ranges. Overlapping non-null windows are
 * excluded only among published versions of the same subject (btree_gist).
 * DEFAULT (`is_current`) is allowed only when lifecycle is published.
 */
export const syllabusVersionsTable = pgTable(
  "syllabus_versions",
  {
    id: serial("id").primaryKey(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "cascade" }),
    examBoard: text("exam_board").notNull(),
    qualification: text("qualification").notNull(),
    label: text("label").notNull(),
    validFrom: text("valid_from"),
    validTo: text("valid_to"),
    isCurrent: boolean("is_current").notNull().default(true),
    sourceFile: text("source_file").notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lifecycle: syllabusVersionLifecycleEnum("lifecycle")
      .notNull()
      .default("published"),
    logicalRevisionKey: text("logical_revision_key"),
    contentSha256: text("content_sha256"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    applicableFromYear: integer("applicable_from_year"),
    applicableFromSeries: examSittingSeriesEnum("applicable_from_series"),
    applicableToYear: integer("applicable_to_year"),
    applicableToSeries: examSittingSeriesEnum("applicable_to_series"),
    applicableSessionRange: int4range("applicable_session_range"),
  },
  (table) => [
    unique("syllabus_versions_subject_source_unique").on(
      table.subjectId,
      table.sourceFile,
    ),
    unique("syllabus_versions_subject_id_id_unique").on(
      table.subjectId,
      table.id,
    ),
    uniqueIndex("syllabus_versions_one_default_per_subject")
      .on(table.subjectId)
      .where(sql`${table.isCurrent} = true`),
    uniqueIndex("syllabus_versions_logical_revision_per_subject")
      .on(table.subjectId, table.logicalRevisionKey)
      .where(sql`${table.logicalRevisionKey} is not null`),
    uniqueIndex("syllabus_versions_content_sha256_per_subject")
      .on(table.subjectId, table.contentSha256)
      .where(sql`${table.contentSha256} is not null`),
    check(
      "syllabus_versions_applicability_complete",
      sql`(
        ${table.applicableFromYear} is null
        and ${table.applicableFromSeries} is null
        and ${table.applicableToYear} is null
        and ${table.applicableToSeries} is null
      ) or (
        ${table.applicableFromYear} is not null
        and ${table.applicableFromSeries} is not null
        and ${table.applicableToYear} is not null
        and ${table.applicableToSeries} is not null
      )`,
    ),
    check(
      "syllabus_versions_default_must_be_published",
      sql`not ${table.isCurrent} or ${table.lifecycle} = 'published'`,
    ),
  ],
);

export const insertSyllabusVersionSchema = createInsertSchema(
  syllabusVersionsTable,
).omit({
  id: true,
  importedAt: true,
  applicableSessionRange: true,
});
export type InsertSyllabusVersion = z.infer<typeof insertSyllabusVersionSchema>;
export type SyllabusVersion = typeof syllabusVersionsTable.$inferSelect;
