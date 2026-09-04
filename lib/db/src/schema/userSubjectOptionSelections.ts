import {
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { assessmentStudyOptionsTable } from "./assessmentStudyOptions";
import { userSubjectsTable } from "./userSubjects";

/**
 * Normalized student study option selections per subject membership and option group.
 *
 * Dormancy is derived dynamically at runtime based on the membership's active route,
 * contract, and option group applicability; no boolean dormant column is persisted.
 */
export const userSubjectOptionSelectionsTable = pgTable(
  "user_subject_option_selections",
  {
    userId: uuid("user_id").notNull(),
    subjectId: integer("subject_id").notNull(),
    optionGroupId: integer("option_group_id").notNull(),
    optionId: integer("option_id").notNull(),
    syllabusVersionId: integer("syllabus_version_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "user_subject_option_selections_pk",
      columns: [
        table.userId,
        table.subjectId,
        table.optionGroupId,
        table.optionId,
      ],
    }),
    foreignKey({
      name: "user_subject_option_selections_membership_fk",
      columns: [table.userId, table.subjectId, table.syllabusVersionId],
      foreignColumns: [
        userSubjectsTable.userId,
        userSubjectsTable.subjectId,
        userSubjectsTable.syllabusVersionId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "user_subject_option_selections_option_fk",
      columns: [table.optionId, table.optionGroupId, table.syllabusVersionId],
      foreignColumns: [
        assessmentStudyOptionsTable.id,
        assessmentStudyOptionsTable.groupId,
        assessmentStudyOptionsTable.syllabusVersionId,
      ],
    }).onDelete("restrict"),
    index("user_subject_option_selections_user_subject_idx").on(
      table.userId,
      table.subjectId,
    ),
    index("user_subject_option_selections_option_idx").on(
      table.optionId,
      table.optionGroupId,
      table.syllabusVersionId,
    ),
  ],
);

export const insertUserSubjectOptionSelectionSchema = createInsertSchema(
  userSubjectOptionSelectionsTable,
).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertUserSubjectOptionSelection = z.infer<
  typeof insertUserSubjectOptionSelectionSchema
>;
export type UserSubjectOptionSelection =
  typeof userSubjectOptionSelectionsTable.$inferSelect;
