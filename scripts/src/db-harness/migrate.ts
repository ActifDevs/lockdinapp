/**
 * Execute Drizzle migrations and verify the journal.
 *
 * Note: This module documents the migration execution strategy.
 * The actual execution uses the Drizzle CLI via the package script.
 */

import { Pool } from "pg";

export interface MigrationExecutionResult {
  success: boolean;
  error?: string;
  journalEntries?: string[];
}

export async function executeMigrations(
  pool: Pool
): Promise<MigrationExecutionResult> {
  // The actual migration execution should use:
  // pnpm --filter @workspace/db migrate
  //
  // This is called from the harness CLI entry point which can spawn
  // the migration command as a child process.
  //
  // For the harness implementation, we'll call this from the CLI
  // using execFileSync for cross-platform compatibility.

  return { success: true };
}

export interface JournalVerificationResult {
  success: boolean;
  expected: string[];
  actual: string[];
  missing?: string[];
  extra?: string[];
  error?: string;
}

export async function verifyMigrationJournal(
  pool: Pool
): Promise<JournalVerificationResult> {
  const expectedMigrations = [
    "0000_syllabus_reference_and_paper_attempts",
    "0001_chilly_randall_flagg",
    "0002_phase2_atomic_onboarding",
    "0003_stormy_mongu",
    "0004_colossal_pixie",
    "0005_restrict_user_subject_writes",
    "0006_slippery_squirrel_girl",
    "0007_eager_squadron_supreme",
    "0008_uneven_mojo",
    "0009_dear_mathemanic",
  ];

  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT tag
      FROM "drizzle"."__drizzle_migrations"
      ORDER BY "when"
    `);

    const actual = result.rows.map((r) => r.tag);

    const missing = expectedMigrations.filter((m) => !actual.includes(m));
    const extra = actual.filter((m) => !expectedMigrations.includes(m));

    if (missing.length > 0 || extra.length > 0) {
      return {
        success: false,
        expected: expectedMigrations,
        actual,
        missing,
        extra,
        error: `Journal mismatch. Missing: ${missing.join(", ")}. Extra: ${extra.join(", ")}`,
      };
    }

    return {
      success: true,
      expected: expectedMigrations,
      actual,
    };
  } catch (error) {
    return {
      success: false,
      expected: expectedMigrations,
      actual: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    client.release();
  }
}
