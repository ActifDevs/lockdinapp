/**
 * B5BR — fresh disposable harness: migrate 0000→0018 and prove visibility + route fail-closed.
 *
 * Requires: LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB=1
 * Uses dedicated db-harness stack (NOT developer 54322 unless already harness).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { applyBootstrap, verifyBootstrapPrerequisites } from "../db-harness/bootstrap.js";
import { ensureCleanPublicSchema } from "../db-harness/cleanup.js";
import { executeMigrations, verifyMigrationJournal } from "../db-harness/migrate.js";
import {
  assertDedicatedPortsAvailable,
  assertDedicatedStackDisposed,
  getLocalStackStatus,
  getRunningProjectIdentity,
  HARNESS_PROJECT_ID,
  startDedicatedStack,
  stopDedicatedStack,
  verifyDedicatedConfig,
} from "../db-harness/stack.js";
import {
  assertDestructiveTarget,
  checkInheritedDbUrls,
} from "../db-harness/target-safety.js";
import { proveB5brVisibilityAndRouteContract } from "./b5br-visibility-route-proof.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function main(): Promise<void> {
  void ROOT;
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
    throw new Error("[b5br] Dedicated Supabase status unavailable");
  }

  assertDestructiveTarget({
    apiUrl: status.apiUrl,
    dbUrl: status.dbUrl,
    runningProjectId: getRunningProjectIdentity(),
    expectedProjectId: HARNESS_PROJECT_ID,
    destructiveAuthorization: process.env.LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB,
  });

  process.env.DATABASE_URL = status.dbUrl;
  process.env.DIRECT_DATABASE_URL = status.dbUrl;
  const pool = new Pool({ connectionString: status.dbUrl });

  try {
    if (ownsStack) {
      await ensureCleanPublicSchema(pool);
      await verifyBootstrapPrerequisites(pool);
      await applyBootstrap(pool);
    } else {
      await ensureCleanPublicSchema(pool);
      await applyBootstrap(pool);
    }

    executeMigrations(status.dbUrl);
    const journal = await verifyMigrationJournal(pool);
    if (!journal.success) {
      throw new Error(journal.error ?? "migration journal mismatch");
    }
    if (journal.expected.length !== 19) {
      throw new Error(`expected 19 migrations, got ${journal.expected.length}`);
    }
    const head = journal.expected[journal.expected.length - 1];
    if (head !== "0018_subject_visibility_and_route_assignment") {
      throw new Error(`unexpected head ${head}`);
    }

    await proveB5brVisibilityAndRouteContract(pool);
    console.log("[b5br] PASS fresh 0000→0018 + visibility/route fail-closed contract");
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
