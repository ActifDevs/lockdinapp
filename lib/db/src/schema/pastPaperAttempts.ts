import {
  pgTable,
  serial,
  text,
  integer,
  real,
  date,
  timestamp,
  check,
  index,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";
import { assessmentComponentsTable } from "./assessmentComponents";

export const PAST_PAPER_SESSIONS = [
  "May/June",
  "Oct/Nov",
  "Feb/Mar",
  "Specimen",
] as const;

/**
 * A student's logged attempt at a past paper. Identity is structured as
 * Subject + Component + Variant + Session rather than a free-text paper code —
 * `component_id` points at the shared `assessment_components` reference row, and a
 * display string like "9700/42" is derived at read time, never stored or typed by hand.
 *
 * Each attempt is owned by one authenticated user. The auth.users foreign key is
 * migration-managed because Drizzle does not own Supabase's auth schema.
 * `year` identifies the exam paper; `date_attempted` records when the student sat it.
 */
export const pastPaperAttemptsTable = pgTable(
  "past_paper_attempts",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjectsTable.id, { onDelete: "cascade" }),
    componentId: integer("component_id").references(
      () => assessmentComponentsTable.id,
      { onDelete: "set null" },
    ),
    variant: integer("variant"),
    session: text("session", { enum: PAST_PAPER_SESSIONS }).notNull(),
    year: integer("year").notNull(),
    score: real("score").notNull(),
    totalMarks: integer("total_marks").notNull(),
    percentage: real("percentage").notNull(),
    dateAttempted: date("date_attempted", { mode: "string" }).notNull(),
    timeTakenMinutes: integer("time_taken_minutes"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("past_paper_attempts_user_date_id_idx").on(
      table.userId,
      table.dateAttempted.desc(),
      table.id.desc(),
    ),
    index("past_paper_attempts_user_subject_date_id_idx").on(
      table.userId,
      table.subjectId,
      table.dateAttempted.desc(),
      table.id.desc(),
    ),
    check(
      "past_paper_attempts_variant_range",
      sql`${table.variant} is null or ${table.variant} between 1 and 5`,
    ),
    check(
      "past_paper_attempts_year_four_digit",
      sql`${table.year} between 1000 and 9999`,
    ),
    check("past_paper_attempts_score_nonnegative", sql`${table.score} >= 0`),
    check(
      "past_paper_attempts_total_marks_positive",
      sql`${table.totalMarks} > 0`,
    ),
    check(
      "past_paper_attempts_score_le_total",
      sql`${table.score} <= ${table.totalMarks}`,
    ),
  ],
);

export const insertPastPaperAttemptSchema = createInsertSchema(
  pastPaperAttemptsTable,
).omit({
  id: true,
  userId: true,
  percentage: true,
  createdAt: true,
});
export type InsertPastPaperAttempt = z.infer<
  typeof insertPastPaperAttemptSchema
>;
export type PastPaperAttempt = typeof pastPaperAttemptsTable.$inferSelect;
