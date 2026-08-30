import { execFileSync } from "node:child_process";
import { join } from "node:path";
import type { Pool } from "pg";
import {
  removeHttpIntegrationCatalogue,
  seedHttpIntegrationCatalogue,
} from "./http-catalogue-seed.js";
import { REPO_ROOT } from "./stack.js";

export function executeHttpIntegrationTests(env: {
  apiUrl: string;
  dbUrl: string;
  publishableKey: string;
  serviceRoleKey: string;
}): void {
  try {
    execFileSync(
      process.execPath,
      [
        join(REPO_ROOT, "artifacts/api-server/node_modules/vitest/vitest.mjs"),
        "run",
        "--config",
        "vitest.integration.config.ts",
      ],
      {
        cwd: join(REPO_ROOT, "artifacts", "api-server"),
        env: {
          ...process.env,
          DATABASE_URL: env.dbUrl,
          DIRECT_DATABASE_URL: env.dbUrl,
          SUPABASE_URL: env.apiUrl,
          SUPABASE_PUBLISHABLE_KEY: env.publishableKey,
          SUPABASE_SERVICE_ROLE_KEY: env.serviceRoleKey,
          LOCKDIN_INTEGRATION_API_URL: env.apiUrl,
          LOCKDIN_INTEGRATION_DB_URL: env.dbUrl,
          LOCKDIN_INTEGRATION_PUBLISHABLE_KEY: env.publishableKey,
          LOCKDIN_INTEGRATION_SERVICE_ROLE_KEY: env.serviceRoleKey,
        },
        stdio: ["ignore", "inherit", "inherit"],
      },
    );
  } catch {
    throw new Error("[db-harness] Authoritative HTTP integration suite failed.");
  }
}

export async function proveHttpIntegration(
  pool: Pool,
  env: {
    apiUrl: string;
    dbUrl: string;
    publishableKey: string;
    serviceRoleKey: string;
  },
): Promise<void> {
  await seedHttpIntegrationCatalogue(pool);
  try {
    executeHttpIntegrationTests(env);
  } finally {
    await removeHttpIntegrationCatalogue(pool);
  }
}
