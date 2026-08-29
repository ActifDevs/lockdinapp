import { boolean, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";
import {
  examSittingSeriesEnum,
  syllabusVersionsTable,
} from "./syllabusVersions";

/**
 * Version-owned Lockdin product-series permission.
 *
 * Answers only: may Lockdin automatically assign this syllabus version for
 * this declared exam series? Not Cambridge geography or centre eligibility.
 *
 * Resolver eligibility requires a row with product_auto_assign = true.
 * FALSE and ABSENT both fail closed.
 */
export const syllabusVersionExamSeriesTable = pgTable(
  "syllabus_version_exam_series",
  {
    syllabusVersionId: integer("syllabus_version_id")
      .notNull()
      .references(() => syllabusVersionsTable.id, { onDelete: "cascade" }),
    series: examSittingSeriesEnum("series").notNull(),
    productAutoAssign: boolean("product_auto_assign").notNull().default(false),
  },
  (table) => [
    primaryKey({
      name: "syllabus_version_exam_series_pk",
      columns: [table.syllabusVersionId, table.series],
    }),
  ],
);
