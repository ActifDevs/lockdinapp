import {
  check,
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { assessmentComponentsTable } from "./assessmentComponents";
import { assessmentRouteSetsTable } from "./assessmentRouteSets";

export const assessmentOptionGroupQualificationTargetEnum = pgEnum(
  "assessment_option_group_qualification_target",
  ["as_level", "a_level", "both"],
);

/**
 * Generic elective option group within a route set (e.g. AS History Option, Paper 3 Topic).
 */
export const assessmentStudyOptionGroupsTable = pgTable(
  "assessment_study_option_groups",
  {
    id: serial("id").primaryKey(),
    routeSetId: integer("route_set_id").notNull(),
    syllabusVersionId: integer("syllabus_version_id").notNull(),
    groupKey: text("group_key").notNull(),
    displayLabel: text("display_label").notNull(),
    applicableQualificationTarget:
      assessmentOptionGroupQualificationTargetEnum(
        "applicable_qualification_target",
      )
        .notNull()
        .default("both"),
    applicableComponentId: integer("applicable_component_id"),
    minSelections: integer("min_selections").notNull(),
    maxSelections: integer("max_selections").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (table) => [
    foreignKey({
      name: "assessment_study_option_groups_route_set_version_fk",
      columns: [table.routeSetId, table.syllabusVersionId],
      foreignColumns: [
        assessmentRouteSetsTable.id,
        assessmentRouteSetsTable.syllabusVersionId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "assessment_study_option_groups_component_fk",
      columns: [table.applicableComponentId, table.syllabusVersionId],
      foreignColumns: [
        assessmentComponentsTable.id,
        assessmentComponentsTable.syllabusVersionId,
      ],
    }).onDelete("cascade"),
    unique("assessment_study_option_groups_id_route_set_version_unique").on(
      table.id,
      table.routeSetId,
      table.syllabusVersionId,
    ),
    unique("assessment_study_option_groups_id_version_unique").on(
      table.id,
      table.syllabusVersionId,
    ),
    unique("assessment_study_option_groups_route_set_key_unique").on(
      table.routeSetId,
      table.groupKey,
    ),
    check(
      "assessment_study_option_groups_non_empty_group_key",
      sql`char_length(${table.groupKey}) > 0`,
    ),
    check(
      "assessment_study_option_groups_order_index_nonnegative",
      sql`${table.orderIndex} >= 0`,
    ),
    check(
      "assessment_study_option_groups_min_selections_positive",
      sql`${table.minSelections} >= 1`,
    ),
    check(
      "assessment_study_option_groups_max_gte_min",
      sql`${table.maxSelections} >= ${table.minSelections}`,
    ),
  ],
);

export const insertAssessmentStudyOptionGroupSchema = createInsertSchema(
  assessmentStudyOptionGroupsTable,
).omit({
  id: true,
});
export type InsertAssessmentStudyOptionGroup = z.infer<
  typeof insertAssessmentStudyOptionGroupSchema
>;
export type AssessmentStudyOptionGroup =
  typeof assessmentStudyOptionGroupsTable.$inferSelect;
