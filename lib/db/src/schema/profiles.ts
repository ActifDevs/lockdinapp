import {
  pgTable,
  uuid,
  text,
  timestamp,
  check,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * App profile, 1:1 with Supabase Auth `auth.users`.
 *
 * The FK to `auth.users(id)` is enforced in the migration SQL (not via
 * `.references()` here) so drizzle-kit cannot emit CREATE/ALTER against the
 * platform-managed auth schema. Username stays nullable until onboarding;
 * `onboarded_at` is set only by a later reviewed onboarding operation.
 */
export const profilesTable = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    fullName: text("full_name"),
    username: text("username"),
    level: text("level"),
    examSession: text("exam_session"),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "profiles_username_format",
      sql`${table.username} is null or ${table.username} ~ '^[a-z0-9_]{3,24}$'`,
    ),
    uniqueIndex("profiles_username_unique")
      .on(table.username)
      .where(sql`${table.username} is not null`),
  ],
);

// No client-facing insert/update schema: every writable column here
// (username, onboarded_at) is intentionally reserved for a later, reviewed
// onboarding operation, not a general-purpose insert endpoint. Do not add
// one back without also deciding how username/onboarded_at become
// client-writable.
export type NewProfileRow = typeof profilesTable.$inferInsert;
export type Profile = typeof profilesTable.$inferSelect;
