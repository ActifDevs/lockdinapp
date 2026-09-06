import {
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { subjectsTable } from "./subjects";

/**
 * Explicit per-user access to subjects that remain hidden from the global
 * new-membership catalogue. Grant rows authorize selection only: they never
 * create or mutate a membership.
 *
 * Auth-user foreign keys are added in migration SQL so schema generation does
 * not attempt to manage Supabase's platform-owned `auth` schema.
 */
export const subjectVisibilityGrantsTable = pgTable(
  "subject_visibility_grants",
  {
    userId: uuid("user_id").notNull(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "cascade" }),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    grantedBy: uuid("granted_by"),
  },
  (table) => [
    primaryKey({
      name: "subject_visibility_grants_user_id_subject_id_pk",
      columns: [table.userId, table.subjectId],
    }),
    index("subject_visibility_grants_subject_id_idx").on(table.subjectId),
    index("subject_visibility_grants_granted_by_idx").on(table.grantedBy),
  ],
);

export type SubjectVisibilityGrant =
  typeof subjectVisibilityGrantsTable.$inferSelect;
