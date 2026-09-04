import {
  check,
  foreignKey,
  integer,
  pgTable,
  serial,
  text,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { assessmentStudyOptionGroupsTable } from "./assessmentStudyOptionGroups";

/**
 * A selectable choice within an option group.
 */
export const assessmentStudyOptionsTable = pgTable(
  "assessment_study_options",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id").notNull(),
    routeSetId: integer("route_set_id").notNull(),
    syllabusVersionId: integer("syllabus_version_id").notNull(),
    optionKey: text("option_key").notNull(),
    displayLabel: text("display_label").notNull(),
    description: text("description"),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (table) => [
    foreignKey({
      name: "assessment_study_options_group_fk",
      columns: [table.groupId, table.routeSetId, table.syllabusVersionId],
      foreignColumns: [
        assessmentStudyOptionGroupsTable.id,
        assessmentStudyOptionGroupsTable.routeSetId,
        assessmentStudyOptionGroupsTable.syllabusVersionId,
      ],
    }).onDelete("cascade"),
    unique("assessment_study_options_id_version_unique").on(
      table.id,
      table.syllabusVersionId,
    ),
    unique("assessment_study_options_id_group_version_unique").on(
      table.id,
      table.groupId,
      table.syllabusVersionId,
    ),
    unique("assessment_study_options_group_key_unique").on(
      table.groupId,
      table.optionKey,
    ),
    check(
      "assessment_study_options_non_empty_option_key",
      sql`char_length(${table.optionKey}) > 0`,
    ),
    check(
      "assessment_study_options_order_index_nonnegative",
      sql`${table.orderIndex} >= 0`,
    ),
  ],
);

export const insertAssessmentStudyOptionSchema = createInsertSchema(
  assessmentStudyOptionsTable,
).omit({
  id: true,
});
export type InsertAssessmentStudyOption = z.infer<
  typeof insertAssessmentStudyOptionSchema
>;
export type AssessmentStudyOption =
  typeof assessmentStudyOptionsTable.$inferSelect;
