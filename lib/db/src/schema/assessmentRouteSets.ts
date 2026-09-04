import {
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { syllabusVersionsTable } from "./syllabusVersions";

export const assessmentRouteSetLifecycleEnum = pgEnum(
  "assessment_route_set_lifecycle",
  ["draft", "published", "retired"],
);

/**
 * Root contract for a syllabus version's assessment routes and study options.
 *
 * Lifecycle:
 * - draft: authoring state
 * - published: active selectable contract (at most ONE per syllabus version)
 * - retired: immutable historical contract (readable by existing memberships)
 */
export const assessmentRouteSetsTable = pgTable(
  "assessment_route_sets",
  {
    id: serial("id").primaryKey(),
    syllabusVersionId: integer("syllabus_version_id")
      .notNull()
      .references(() => syllabusVersionsTable.id, { onDelete: "cascade" }),
    routeRevisionKey: text("route_revision_key").notNull(),
    lifecycle: assessmentRouteSetLifecycleEnum("lifecycle")
      .notNull()
      .default("draft"),
    manifestSha256: text("manifest_sha256"),
    sourceManifest: jsonb("source_manifest"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    unique("assessment_route_sets_id_version_unique").on(
      table.id,
      table.syllabusVersionId,
    ),
    unique("assessment_route_sets_version_revision_unique").on(
      table.syllabusVersionId,
      table.routeRevisionKey,
    ),
    uniqueIndex("assessment_route_sets_one_published_per_version")
      .on(table.syllabusVersionId)
      .where(sql`${table.lifecycle} = 'published'`),
    check(
      "assessment_route_sets_non_empty_revision_key",
      sql`char_length(${table.routeRevisionKey}) > 0`,
    ),
    check(
      "assessment_route_sets_published_contract",
      sql`${table.lifecycle} <> 'published' or (${table.publishedAt} is not null and ${table.manifestSha256} is not null)`,
    ),
    check(
      "assessment_route_sets_manifest_sha256_format",
      sql`${table.manifestSha256} is null or ${table.manifestSha256} ~ '^[a-f0-9]{64}$'`,
    ),
  ],
);

export const insertAssessmentRouteSetSchema = createInsertSchema(
  assessmentRouteSetsTable,
).omit({
  id: true,
  createdAt: true,
});
export type InsertAssessmentRouteSet = z.infer<
  typeof insertAssessmentRouteSetSchema
>;
export type AssessmentRouteSet = typeof assessmentRouteSetsTable.$inferSelect;
