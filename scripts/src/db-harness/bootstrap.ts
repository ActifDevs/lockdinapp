/**
 * Apply historical pre-0000 bootstrap SQL to a blank database.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Pool, PoolClient } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOOTSTRAP_SQL_PATH = join(
  __dirname,
  "../../../lib/db/bootstrap/pre-0000.sql"
);

export async function applyBootstrap(pool: Pool): Promise<void> {
  const sql = await readFile(BOOTSTRAP_SQL_PATH, "utf-8");

  const client = await pool.connect();
  try {
    await client.query(sql);
  } finally {
    client.release();
  }
}

export interface BootstrapVerificationResult {
  success: boolean;
  missingTables?: string[];
  unexpectedColumns?: string[];
  error?: string;
}

export async function verifyBootstrapPrerequisites(
  pool: Pool
): Promise<BootstrapVerificationResult> {
  const client = await pool.connect();
  try {
    // Check that all expected pre-0000 tables exist
    const expectedTables = [
      "subjects",
      "syllabus_units",
      "syllabus_topics",
      "tasks",
      "past_papers",
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
        error: `Missing pre-0000 tables: ${missingTables.join(", ")}`,
      };
    }

    // Verify critical historical differences
    const unexpectedColumns: string[] = [];

    // syllabus_units should NOT have syllabus_version_id
    const syllabusUnitsColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'syllabus_units'
    `);
    if (syllabusUnitsColumns.rows.some((r) => r.column_name === "syllabus_version_id")) {
      unexpectedColumns.push("syllabus_units.syllabus_version_id");
    }

    // syllabus_topics should HAVE status and notes
    const syllabusTopicsColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'syllabus_topics'
    `);
    const topicColumns = syllabusTopicsColumns.rows.map((r) => r.column_name);
    if (!topicColumns.includes("status")) {
      unexpectedColumns.push("syllabus_topics.status (missing)");
    }
    if (!topicColumns.includes("notes")) {
      unexpectedColumns.push("syllabus_topics.notes (missing)");
    }

    // tasks should NOT have user_id
    const tasksColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tasks'
    `);
    if (tasksColumns.rows.some((r) => r.column_name === "user_id")) {
      unexpectedColumns.push("tasks.user_id");
    }

    // past_papers should exist (not past_paper_attempts yet)
    const pastPapersExists = await client.query(
      `SELECT to_regclass('public.past_papers') AS exists`
    );
    if (!pastPapersExists.rows[0].exists) {
      unexpectedColumns.push("past_papers table (missing)");
    }

    // exam_dates should NOT have user_id
    const examDatesColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'exam_dates'
    `);
    if (examDatesColumns.rows.some((r) => r.column_name === "user_id")) {
      unexpectedColumns.push("exam_dates.user_id");
    }

    if (unexpectedColumns.length > 0) {
      return {
        success: false,
        unexpectedColumns,
        error: `Bootstrap schema verification failed: ${unexpectedColumns.join(", ")}`,
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
