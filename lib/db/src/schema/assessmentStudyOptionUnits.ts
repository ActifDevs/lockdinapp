import {
  foreignKey,
  integer,
  pgTable,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { assessmentStudyOptionsTable } from "./assessmentStudyOptions";
import { syllabusUnitsTable } from "./syllabusUnits";

/**
 * Mapping of study options to syllabus units.
 */
export const assessmentStudyOptionUnitsTable = pgTable(
  "assessment_study_option_units",
  {
    optionId: integer("option_id").notNull(),
    unitId: integer("unit_id").notNull(),
    syllabusVersionId: integer("syllabus_version_id").notNull(),
  },
  (table) => [
    primaryKey({
      name: "assessment_study_option_units_pk",
      columns: [table.optionId, table.unitId],
    }),
    foreignKey({
      name: "assessment_study_option_units_option_fk",
      columns: [table.optionId, table.syllabusVersionId],
      foreignColumns: [
        assessmentStudyOptionsTable.id,
        assessmentStudyOptionsTable.syllabusVersionId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "assessment_study_option_units_unit_fk",
      columns: [table.unitId, table.syllabusVersionId],
      foreignColumns: [
        syllabusUnitsTable.id,
        syllabusUnitsTable.syllabusVersionId,
      ],
    }).onDelete("cascade"),
    unique("assessment_study_option_units_option_unit_version_unique").on(
      table.optionId,
      table.unitId,
      table.syllabusVersionId,
    ),
  ],
);

export const insertAssessmentStudyOptionUnitSchema = createInsertSchema(
  assessmentStudyOptionUnitsTable,
);
export type InsertAssessmentStudyOptionUnit = z.infer<
  typeof insertAssessmentStudyOptionUnitSchema
>;
export type AssessmentStudyOptionUnit =
  typeof assessmentStudyOptionUnitsTable.$inferSelect;
