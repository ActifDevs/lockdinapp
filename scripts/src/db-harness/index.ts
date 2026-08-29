/**
 * Disposable DB harness for Phase 6 Slice 2.
 *
 * Establishes a clean local Supabase environment, applies historical pre-0000
 * bootstrap, runs migrations 0000–0009, and verifies the full chain.
 */

import { Pool } from "pg";
import {
  checkInheritedDbUrls,
  assertLoopbackUrl,
  assertNotHostedUrl,
} from "./target-safety.js";
import {
  applyBootstrap,
  verifyBootstrapPrerequisites,
} from "./bootstrap.js";
import { executeMigrations, verifyMigrationJournal } from "./migrate.js";
import { verifyFinalSchema } from "./verify.js";
import {
  stopLocalSupabase,
  ensureCleanPublicSchema,
} from "./cleanup.js";

interface HarnessConfig {
  requireCleanStart?: boolean;
  stopAfterCompletion?: boolean;
}

interface HarnessResult {
  success: boolean;
  steps: { name: string; success: boolean; error?: string }[];
  error?: string;
}

export async function runHarness(
  config: HarnessConfig = {}
): Promise<HarnessResult> {
  const {
    requireCleanStart = true,
    stopAfterCompletion = false,
  } = config;

  const steps: HarnessResult["steps"] = [];

  async function step(
    name: string,
    fn: () => Promise<void>
  ): Promise<void> {
    try {
      await fn();
      steps.push({ name, success: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      steps.push({ name, success: false, error: errorMessage });
      throw error;
    }
  }

  const cleanupStack: Array<() => Promise<void>> = [];

  try {
    // Step 1: Verify execution context
    await step("Context verification", async () => {
      const databaseUrl = process.env.DATABASE_URL;
      const directDatabaseUrl = process.env.DIRECT_DATABASE_URL;

      const safetyCheck = checkInheritedDbUrls(
        databaseUrl,
        directDatabaseUrl
      );

      if (!safetyCheck.isSafe) {
        throw new Error(safetyCheck.error);
      }

      console.log("[db-harness] Context verification passed");
    });

    // Step 2: Check local Supabase status
    let localDbUrl: string = "";
    let localApiUrl: string = "";

    await step("Local Supabase check", async () => {
      const { execFileSync } = await import("node:child_process");
      const { fileURLToPath } = await import("node:url");
      const { dirname, join } = await import("node:path");

      const __dirname = dirname(fileURLToPath(import.meta.url));
      const repoRoot = join(__dirname, "../../../..");
      const supabaseCliScript = join(
        repoRoot,
        "node_modules",
        "supabase",
        "dist",
        "supabase.js"
      );

      let raw: string;
      try {
        raw = execFileSync(
          process.execPath,
          [supabaseCliScript, "status", "-o", "json"],
          {
            cwd: repoRoot,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          }
        ) as string;
      } catch {
        throw new Error(
          "[db-harness] Local Supabase is not running. Start it with `pnpm supabase:start`"
        );
      }

      let status;
      try {
        status = JSON.parse(raw);
      } catch {
        throw new Error(
          "[db-harness] Could not parse `supabase status -o json` output"
        );
      }

      localApiUrl = status.API_URL || "";
      localDbUrl = status.DB_URL || "";

      assertLoopbackUrl("API_URL", localApiUrl);
      assertLoopbackUrl("DB_URL", localDbUrl);

      console.log("[db-harness] Local Supabase verified on loopback");
    });

    // Step 3: Clear inherited DB variables and set local
    await step("Environment configuration", async () => {
      delete process.env.DATABASE_URL;
      delete process.env.DIRECT_DATABASE_URL;

      // Use direct connection for migrations (not transaction pooler)
      process.env.DIRECT_DATABASE_URL = localDbUrl;
      process.env.DATABASE_URL = localDbUrl;

      console.log("[db-harness] Environment configured for local DB");
    });

    // Step 4: Ensure clean public schema if required
    const pool = new Pool({ connectionString: localDbUrl });

    cleanupStack.push(async () => {
      await pool.end();
    });

    if (requireCleanStart) {
      await step("Clean public schema", async () => {
        await ensureCleanPublicSchema(pool);
        console.log("[db-harness] Public schema cleaned");
      });
    }

    // Step 5: Apply historical pre-0000 bootstrap
    await step("Apply pre-0000 bootstrap", async () => {
      await applyBootstrap(pool);
      console.log("[db-harness] Pre-0000 bootstrap applied");
    });

    // Step 6: Verify bootstrap prerequisites
    await step("Verify bootstrap prerequisites", async () => {
      const verification = await verifyBootstrapPrerequisites(pool);
      if (!verification.success) {
        throw new Error(
          `Bootstrap verification failed: ${verification.error}`
        );
      }
      console.log("[db-harness] Bootstrap prerequisites verified");
    });

    // Step 7: Execute Drizzle migrations
    await step("Execute migrations 0000–0009", async () => {
      const { execFileSync } = await import("node:child_process");
      const { dirname, join } = await import("node:path");
      const { fileURLToPath } = await import("node:url");

      const __dirname = dirname(fileURLToPath(import.meta.url));
      const repoRoot = join(__dirname, "../../../..");

      try {
        // Use pnpm - available in PATH or via node_modules/.bin
        const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

        execFileSync(pnpmCmd, ["--filter", "@workspace/db", "migrate"], {
          cwd: repoRoot,
          stdio: ["ignore", "pipe", "pipe"],
          shell: process.platform === "win32", // Windows requires shell for .cmd
        });
      } catch (error) {
        throw new Error(
          `Migration execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      console.log("[db-harness] Migrations 0000–0009 applied");
    });

    // Step 8: Verify migration journal
    await step("Verify migration journal", async () => {
      const verification = await verifyMigrationJournal(pool);
      if (!verification.success) {
        throw new Error(`Journal verification failed: ${verification.error}`);
      }
      console.log("[db-harness] Migration journal verified (0000–0009)");
    });

    // Step 9: Verify final schema
    await step("Verify final schema", async () => {
      const verification = await verifyFinalSchema(pool);
      if (!verification.success) {
        throw new Error(`Schema verification failed: ${verification.error}`);
      }
      console.log("[db-harness] Final schema verified");
    });

    return { success: true, steps };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return { success: false, steps, error: errorMessage };
  } finally {
    // Cleanup: close pool
    for (const cleanupFn of cleanupStack) {
      try {
        await cleanupFn();
      } catch (cleanupError) {
        console.error(
          "[db-harness] Cleanup error:",
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        );
      }
    }

    // Stop Supabase if requested
    if (stopAfterCompletion) {
      try {
        const result = await stopLocalSupabase();
        if (result.success) {
          console.log("[db-harness] Local Supabase stopped");
        } else {
          console.warn(
            "[db-harness] Failed to stop local Supabase:",
            result.error
          );
          if (result.manualInstructions) {
            console.log(result.manualInstructions);
          }
        }
      } catch (cleanupError) {
        console.error(
          "[db-harness] Cleanup error during Supabase stop:",
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        );
      }
    }
  }
}

// CLI entry point
async function main() {
  const result = await runHarness({
    requireCleanStart: true,
    stopAfterCompletion: false, // don't auto-stop, let developer control
  });

  if (!result.success) {
    console.error("\n[db-harness] FAILED");
    console.error("Error:", result.error);
    console.error("\nFailed steps:");
    for (const step of result.steps) {
      if (!step.success) {
        console.error(`  - ${step.name}: ${step.error}`);
      }
    }
    process.exit(1);
  }

  console.log("\n[db-harness] SUCCESS");
  console.log("All steps completed:");
  for (const step of result.steps) {
    console.log(`  ✓ ${step.name}`);
  }
  console.log("\nLocal Supabase is ready for DB integration tests.");
  console.log("Run: pnpm --filter @workspace/scripts test:db");
}

if (process.argv[1]?.includes("db-harness")) {
  main().catch((error) => {
    console.error("[db-harness] Unhandled error:", error);
    process.exit(1);
  });
}
