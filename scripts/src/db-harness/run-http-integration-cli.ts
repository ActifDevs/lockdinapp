import { Pool } from "pg";
import { applyBootstrap } from "./bootstrap.js";
import { ensureCleanPublicSchema } from "./cleanup.js";
import { proveHttpIntegration } from "./http-integration.js";
import { executeMigrations, verifyMigrationJournal } from "./migrate.js";
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

async function main(): Promise<void> {
  const inherited = checkInheritedDbUrls(
    process.env.DATABASE_URL,
    process.env.DIRECT_DATABASE_URL,
  );
  if (!inherited.isSafe) throw new Error(inherited.error);

  await verifyDedicatedConfig();
  let status = getLocalStackStatus();
  let ownsStack = false;
  if (!status) {
    await assertDedicatedPortsAvailable();
    startDedicatedStack();
    ownsStack = true;
    status = getLocalStackStatus();
  }
  if (!status) {
    throw new Error("[db-harness] Dedicated Supabase status is unavailable.");
  }

  assertDestructiveTarget({
    apiUrl: status.apiUrl,
    dbUrl: status.dbUrl,
    runningProjectId: getRunningProjectIdentity(),
    expectedProjectId: HARNESS_PROJECT_ID,
    destructiveAuthorization: process.env.LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB,
  });

  const apiPort = Number(new URL(status.apiUrl).port);
  const dbPort = Number(new URL(status.dbUrl).port);
  if (apiPort !== HARNESS_API_PORT || dbPort !== HARNESS_DB_PORT) {
    throw new Error("[db-harness] HTTP integration refused a non-harness endpoint.");
  }

  process.env.DATABASE_URL = status.dbUrl;
  process.env.DIRECT_DATABASE_URL = status.dbUrl;
  const pool = new Pool({ connectionString: status.dbUrl });
  try {
    await ensureCleanPublicSchema(pool);
    await applyBootstrap(pool);
    executeMigrations(status.dbUrl);
    const journal = await verifyMigrationJournal(pool);
    if (!journal.success) throw new Error(journal.error);
    await proveHttpIntegration(pool, status);
  } finally {
    await pool.end().catch(() => undefined);
    if (ownsStack) {
      stopDedicatedStack();
      assertDedicatedStackDisposed();
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
