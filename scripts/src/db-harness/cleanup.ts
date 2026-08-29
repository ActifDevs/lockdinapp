/**
 * Cleanup utilities for the disposable DB harness.
 */

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../../../..");
const supabaseCliScript = join(
  repoRoot,
  "node_modules",
  "supabase",
  "dist",
  "supabase.js"
);

export interface CleanupResult {
  success: boolean;
  error?: string;
  manualInstructions?: string;
}

export async function stopLocalSupabase(): Promise<CleanupResult> {
  try {
    execFileSync(process.execPath, [supabaseCliScript, "stop"], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      manualInstructions:
        "Manual cleanup: run `pnpm supabase:stop` from the repository root",
    };
  }
}

export async function ensureCleanPublicSchema(pool: import("pg").Pool): Promise<void> {
  const client = await pool.connect();
  try {
    // Drop all tables in public schema
    await client.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    // Drop all sequences in public schema
    await client.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequencename);
        END LOOP;
      END $$;
    `);
  } finally {
    client.release();
  }
}
