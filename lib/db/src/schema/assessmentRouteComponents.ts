import {
  check,
  foreignKey,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { assessmentComponentsTable } from "./assessmentComponents";
import { assessmentRoutesTable } from "./assessmentRoutes";

export const assessmentComponentRoleEnum = pgEnum("assessment_component_role", [
  "current_sitting",
  "carried_forward",
]);

/**
 * Normalized route-to-component relationship with exact qualification weighting.
 *
 * `qualification_weighting_percent` is exact PostgreSQL `numeric(7,4)`:
 * - Nullable during draft authoring
 * - Must be non-null, > 0.0000 and <= 100.0000, summing to 100.0000 for publication
 */
export const assessmentRouteComponentsTable = pgTable(
  "assessment_route_components",
  {
    routeId: integer("route_id").notNull(),
    routeSetId: integer("route_set_id").notNull(),
    componentId: integer("component_id").notNull(),
    syllabusVersionId: integer("syllabus_version_id").notNull(),
    role: assessmentComponentRoleEnum("role").notNull(),
    // Exact decimal: string mode (default) — never JavaScript number / float.
    qualificationWeightingPercent: numeric("qualification_weighting_percent", {
      precision: 7,
      scale: 4,
      mode: "string",
    }),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (table) => [
    primaryKey({
      name: "assessment_route_components_pk",
      columns: [table.routeId, table.componentId],
    }),
    foreignKey({
      name: "assessment_route_components_route_fk",
      columns: [table.routeId, table.routeSetId, table.syllabusVersionId],
      foreignColumns: [
        assessmentRoutesTable.id,
        assessmentRoutesTable.routeSetId,
        assessmentRoutesTable.syllabusVersionId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "assessment_route_components_component_fk",
      columns: [table.componentId, table.syllabusVersionId],
      foreignColumns: [
        assessmentComponentsTable.id,
        assessmentComponentsTable.syllabusVersionId,
      ],
    }).onDelete("restrict"),
    unique("assessment_route_components_route_order_unique").on(
      table.routeId,
      table.orderIndex,
    ),
    check(
      "assessment_route_components_order_index_nonnegative",
      sql`${table.orderIndex} >= 0`,
    ),
    check(
      "assessment_route_components_weighting_range",
      sql`${table.qualificationWeightingPercent} is null or (${table.qualificationWeightingPercent} > 0.0000 and ${table.qualificationWeightingPercent} <= 100.0000)`,
    ),
  ],
);

export const insertAssessmentRouteComponentSchema = createInsertSchema(
  assessmentRouteComponentsTable,
);
export type InsertAssessmentRouteComponent = z.infer<
  typeof insertAssessmentRouteComponentSchema
>;
export type AssessmentRouteComponent =
  typeof assessmentRouteComponentsTable.$inferSelect;
