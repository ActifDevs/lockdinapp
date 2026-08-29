/** Dedicated disposable Supabase proof for Phase 6 Slice 2. */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { applyBootstrap, verifyBootstrapPrerequisites } from "./bootstrap.js";
import { ensureCleanPublicSchema } from "./cleanup.js";
import {
  executeMigrations,
  executeSyllabusDbTests,
  verifyMigrationJournal,
} from "./migrate.js";
import {
  HARNESS_API_PORT,
  HARNESS_DB_PORT,
  HARNESS_PROJECT_ID,
  assertDedicatedPortsAvailable,
  assertDedicatedStackDisposed,
  getLocalStackStatus,
  getRunningProjectIdentity,
  startDedicatedStack,
  stopDedicatedStack,
  verifyDedicatedConfig,
} from "./stack.js";
import {
  assertDestructiveTarget,
  checkInheritedDbUrls,
} from "./target-safety.js";
import { verifyFinalSchema, verifySyntheticFixturesRemoved } from "./verify.js";

interface HarnessStep {
  name: string;
  success: boolean;
  error?: string;
}

export interface HarnessResult {
  success: boolean;
  steps: HarnessStep[];
  error?: string;
  projectId: string;
  startedStack: boolean;
  cleanupVerified: boolean;
}

export async function runHarness(): Promise<HarnessResult> {
  const steps: HarnessStep[] = [];
  const inheritedDatabaseUrl = process.env.DATABASE_URL;
  const inheritedDirectDatabaseUrl = process.env.DIRECT_DATABASE_URL;
  let pool: Pool | undefined;
  let ownsStack = false;
  let destructiveTargetVerified = false;
  let cleanupVerified = false;
  let failure: string | undefined;

  async function step(name: string, operation: () => void | Promise<void>) {
    try {
      await operation();
      steps.push({ name, success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      steps.push({ name, success: false, error: message });
      throw error;
    }
  }

  try {
    await step("Inherited target safety", () => {
      const result = checkInheritedDbUrls(
        inheritedDatabaseUrl,
        inheritedDirectDatabaseUrl,
      );
      if (!result.isSafe) throw new Error(result.error);
    });

    await step("Dedicated configuration", verifyDedicatedConfig);

    let status = getLocalStackStatus();
    if (!status) {
      await step("Dedicated port availability", assertDedicatedPortsAvailable);
      ownsStack = true;
      await step("Start dedicated Supabase stack", startDedicatedStack);
      status = getLocalStackStatus();
    } else {
      steps.push({ name: "Reuse dedicated Supabase stack", success: true });
    }

    if (!status) {
      throw new Error("[db-harness] Dedicated Supabase status is unavailable.");
    }

    const verifiedStatus = status;
    const runningProjectId = getRunningProjectIdentity();

    await step("Dedicated destructive target guard", () => {
      const apiPort = Number(new URL(verifiedStatus.apiUrl).port);
      const dbPort = Number(new URL(verifiedStatus.dbUrl).port);
      if (apiPort !== HARNESS_API_PORT || dbPort !== HARNESS_DB_PORT) {
        throw new Error(
          "[db-harness] Target safety rejected: dedicated endpoint port mismatch.",
        );
      }
      assertDestructiveTarget({
        apiUrl: verifiedStatus.apiUrl,
        dbUrl: verifiedStatus.dbUrl,
        runningProjectId,
        expectedProjectId: HARNESS_PROJECT_ID,
        destructiveAuthorization:
          process.env.LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB,
      });
      destructiveTargetVerified = true;
    });

    process.env.DATABASE_URL = verifiedStatus.dbUrl;
    process.env.DIRECT_DATABASE_URL = verifiedStatus.dbUrl;
    pool = new Pool({ connectionString: verifiedStatus.dbUrl });

    await step("Clean pre-0000 public schema", () =>
      ensureCleanPublicSchema(pool!),
    );
    await step("Execute pre-0000 bootstrap", () => applyBootstrap(pool!));
    await step("Verify pre-0000 bootstrap state", async () => {
      const result = await verifyBootstrapPrerequisites(pool!);
      if (!result.success) {
        throw new Error("[db-harness] Executed bootstrap state is invalid.");
      }
    });
    await step("Execute committed migrations 0000-0009", () =>
      executeMigrations(verifiedStatus.dbUrl),
    );
    await step("Verify Drizzle journal 0000-0009", async () => {
      const result = await verifyMigrationJournal(pool!);
      if (!result.success) throw new Error(result.error);
    });
    await step(
      "Verify final schema, auth relationships, RLS, and serial",
      async () => {
        const result = await verifyFinalSchema(pool!);
        if (!result.success) throw new Error(result.error);
      },
    );
    await step("Run syllabus DB integration 3/3", () =>
      executeSyllabusDbTests(verifiedStatus.dbUrl),
    );
    await step("Verify synthetic fixture cleanup", () =>
      verifySyntheticFixturesRemoved(pool!),
    );
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  } finally {
    if (pool && destructiveTargetVerified) {
      try {
        await ensureCleanPublicSchema(pool);
        steps.push({ name: "Dispose test application schema", success: true });
      } catch {
        const message = "[db-harness] Test application schema cleanup failed.";
        steps.push({
          name: "Dispose test application schema",
          success: false,
          error: message,
        });
        failure ??= message;
      }
    }

    if (pool) {
      await pool.end().catch(() => {
        failure ??= "[db-harness] Database connection cleanup failed.";
      });
    }

    if (inheritedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = inheritedDatabaseUrl;
    if (inheritedDirectDatabaseUrl === undefined) {
      delete process.env.DIRECT_DATABASE_URL;
    } else {
      process.env.DIRECT_DATABASE_URL = inheritedDirectDatabaseUrl;
    }

    if (ownsStack) {
      try {
        stopDedicatedStack();
        assertDedicatedStackDisposed();
        cleanupVerified = true;
        steps.push({
          name: "Stop and remove owned dedicated stack",
          success: true,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        steps.push({
          name: "Stop and remove owned dedicated stack",
          success: false,
          error: message,
        });
        failure ??= message;
      }
    } else if (destructiveTargetVerified) {
      cleanupVerified = true;
      steps.push({
        name: "Preserve unowned dedicated infrastructure",
        success: true,
      });
    }
  }

  return {
    success: failure === undefined,
    steps,
    error: failure,
    projectId: HARNESS_PROJECT_ID,
    startedStack: ownsStack,
    cleanupVerified,
  };
}

async function main(): Promise<void> {
  const result = await runHarness();
  for (const harnessStep of result.steps) {
    const marker = harnessStep.success ? "PASS" : "FAIL";
    console.log(`[db-harness] ${marker}: ${harnessStep.name}`);
  }

  if (!result.success) {
    console.error(`[db-harness] FAILED: ${result.error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `[db-harness] SUCCESS: ${result.projectId}; cleanup contract verified=${result.cleanupVerified}`,
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
