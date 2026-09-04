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
import { assessmentComponentsTable } from "./assessmentComponents";
import { assessmentStudyOptionUnitsTable } from "./assessmentStudyOptionUnits";

/**
 * Year-sensitive dynamic assessment paper allocation for study options (e.g. Cambridge 9489 yearly rotations).
 */
export const assessmentStudyOptionYearMappingsTable = pgTable(
  "assessment_study_option_year_mappings",
  {
    id: serial("id").primaryKey(),
    optionId: integer("option_id").notNull(),
    syllabusVersionId: integer("syllabus_version_id").notNull(),
    examYear: integer("exam_year").notNull(),
    componentId: integer("component_id").notNull(),
    unitId: integer("unit_id").notNull(),
    assessmentRole: text("assessment_role").notNull(),
  },
  (table) => [
    foreignKey({
      name: "assessment_study_option_year_mappings_option_unit_version_fk",
      columns: [table.optionId, table.unitId, table.syllabusVersionId],
      foreignColumns: [
        assessmentStudyOptionUnitsTable.optionId,
        assessmentStudyOptionUnitsTable.unitId,
        assessmentStudyOptionUnitsTable.syllabusVersionId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "assessment_study_option_year_mappings_component_fk",
      columns: [table.componentId, table.syllabusVersionId],
      foreignColumns: [
        assessmentComponentsTable.id,
        assessmentComponentsTable.syllabusVersionId,
      ],
    }).onDelete("restrict"),
    unique("assessment_study_option_year_mappings_logical_unique").on(
      table.optionId,
      table.examYear,
      table.unitId,
    ),
    check(
      "assessment_study_option_year_mappings_exam_year_range",
      sql`${table.examYear} between 1000 and 9999`,
    ),
    check(
      "assessment_study_option_year_mappings_non_empty_role",
      sql`char_length(${table.assessmentRole}) > 0`,
    ),
  ],
);

export const insertAssessmentStudyOptionYearMappingSchema = createInsertSchema(
  assessmentStudyOptionYearMappingsTable,
).omit({
  id: true,
});
export type InsertAssessmentStudyOptionYearMapping = z.infer<
  typeof insertAssessmentStudyOptionYearMappingSchema
>;
export type AssessmentStudyOptionYearMapping =
  typeof assessmentStudyOptionYearMappingsTable.$inferSelect;
