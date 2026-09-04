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
import { assessmentRouteSetsTable } from "./assessmentRouteSets";

export const assessmentQualificationTargetEnum = pgEnum(
  "assessment_qualification_target",
  ["as_level", "a_level"],
);

export const assessmentPathwayTypeEnum = pgEnum("assessment_pathway_type", [
  "single_series",
  "staged_completion",
  "full_same_series",
]);

export const assessmentProgressionEligibilityEnum = pgEnum(
  "assessment_progression_eligibility",
  ["eligible", "not_eligible", "not_applicable"],
);

/**
 * A canonical qualification route within a published or historical route set.
 */
export const assessmentRoutesTable = pgTable(
  "assessment_routes",
  {
    id: serial("id").primaryKey(),
    routeSetId: integer("route_set_id").notNull(),
    syllabusVersionId: integer("syllabus_version_id").notNull(),
    routeKey: text("route_key").notNull(),
    displayLabel: text("display_label").notNull(),
    qualificationTarget: assessmentQualificationTargetEnum(
      "qualification_target",
    ).notNull(),
    pathwayType: assessmentPathwayTypeEnum("pathway_type").notNull(),
    progressionEligibility: assessmentProgressionEligibilityEnum(
      "progression_eligibility",
    )
      .notNull()
      .default("not_applicable"),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (table) => [
    foreignKey({
      name: "assessment_routes_route_set_version_fk",
      columns: [table.routeSetId, table.syllabusVersionId],
      foreignColumns: [
        assessmentRouteSetsTable.id,
        assessmentRouteSetsTable.syllabusVersionId,
      ],
    }).onDelete("cascade"),
    unique("assessment_routes_id_route_set_version_unique").on(
      table.id,
      table.routeSetId,
      table.syllabusVersionId,
    ),
    unique("assessment_routes_id_version_unique").on(
      table.id,
      table.syllabusVersionId,
    ),
    unique("assessment_routes_route_set_key_unique").on(
      table.routeSetId,
      table.routeKey,
    ),
    check(
      "assessment_routes_non_empty_route_key",
      sql`char_length(${table.routeKey}) > 0`,
    ),
    check(
      "assessment_routes_order_index_nonnegative",
      sql`${table.orderIndex} >= 0`,
    ),
  ],
);

export const insertAssessmentRouteSchema = createInsertSchema(
  assessmentRoutesTable,
).omit({
  id: true,
});
export type InsertAssessmentRoute = z.infer<typeof insertAssessmentRouteSchema>;
export type AssessmentRoute = typeof assessmentRoutesTable.$inferSelect;
