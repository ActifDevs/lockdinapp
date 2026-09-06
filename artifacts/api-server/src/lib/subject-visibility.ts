import { sql } from "drizzle-orm";
import { subjectsTable } from "@workspace/db";

/**
 * The database predicate is shared with the atomic membership functions.
 * Passing null deliberately preserves the anonymous global-only catalogue.
 */
export function subjectSelectableForCaller(userId?: string) {
  return sql<boolean>`public.lockdin_can_select_subject(
    ${userId ?? null}::uuid,
    ${subjectsTable.id}
  )`;
}
