/**
 * Verify final schema and security objects after migrations.
 */

import { Pool } from "pg";

export interface SchemaVerificationResult {
  success: boolean;
  missingTables?: string[];
  missingRls?: string[];
  error?: string;
}

export async function verifyFinalSchema(
  pool: Pool
): Promise<SchemaVerificationResult> {
  const client = await pool.connect();
  try {
    // Verify all expected current tables exist
    const expectedTables = [
      "subjects",
      "syllabus_versions",
      "syllabus_units",
      "syllabus_topics",
      "syllabus_learning_outcomes",
      "assessment_components",
      "learning_outcome_components",
      "profiles",
      "user_subjects",
      "topic_progress",
      "tasks",
      "past_paper_attempts",
      "exam_dates",
    ];

    const missingTables: string[] = [];

    for (const table of expectedTables) {
      const result = await client.query(
        `SELECT to_regclass('public.${table}') AS exists`
      );
      if (!result.rows[0].exists) {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      return {
        success: false,
        missingTables,
        error: `Missing final schema tables: ${missingTables.join(", ")}`,
      };
    }

    // Verify RLS is enabled on user-owned tables
    const rlsRequiredTables = [
      "profiles",
      "user_subjects",
      "topic_progress",
      "tasks",
      "past_paper_attempts",
      "exam_dates",
    ];

    const missingRls: string[] = [];

    for (const table of rlsRequiredTables) {
      const result = await client.query(`
        SELECT relrowsecurity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = '${table}'
      `);

      if (result.rows.length === 0 || !result.rows[0].relrowsecurity) {
        missingRls.push(table);
      }
    }

    if (missingRls.length > 0) {
      return {
        success: false,
        missingRls,
        error: `RLS not enabled on: ${missingRls.join(", ")}`,
      };
    }

    // Verify past_paper_attempts sequence exists (migration 0008 correction)
    const sequenceResult = await client.query(`
      SELECT pg_get_serial_sequence('public.past_paper_attempts', 'id') AS sequence
    `);

    if (!sequenceResult.rows[0].sequence) {
      return {
        success: false,
        error: "past_paper_attempts.id sequence not found",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    client.release();
  }
}
