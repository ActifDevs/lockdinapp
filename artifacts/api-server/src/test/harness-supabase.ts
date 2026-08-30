import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const supabaseCliScript = path.join(
  repoRoot,
  "node_modules",
  "supabase",
  "dist",
  "supabase.js",
);
const HARNESS_WORKDIR = path.join(repoRoot, "scripts", "fixtures", "db-harness");
const HARNESS_API_PORT = 55421;
const HARNESS_DB_PORT = 55422;
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export type HarnessSupabaseEnv = {
  url: string;
  publishableKey: string;
  serviceRoleKey: string;
  dbUrl: string;
};

function isLoopbackUrl(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    return LOOPBACK_HOSTNAMES.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function assertHarnessEndpoint(name: string, value: string, expectedPort: number): void {
  if (!isLoopbackUrl(value)) {
    throw new Error(
      `[test:integration] ${name} must use an exact loopback hostname`,
    );
  }
  const port = Number(new URL(value).port);
  if (port !== expectedPort) {
    throw new Error(
      `[test:integration] ${name} must target the dedicated lockdin-db-harness port ${expectedPort}. The ordinary lockedinapp stack and hosted Production are not valid integration targets.`,
    );
  }
}

export function loadHarnessSupabaseEnv(): HarnessSupabaseEnv {
  const fromEnv = {
    url: process.env.LOCKDIN_INTEGRATION_API_URL,
    dbUrl: process.env.LOCKDIN_INTEGRATION_DB_URL,
    publishableKey: process.env.LOCKDIN_INTEGRATION_PUBLISHABLE_KEY,
    serviceRoleKey: process.env.LOCKDIN_INTEGRATION_SERVICE_ROLE_KEY,
  };
  if (
    fromEnv.url &&
    fromEnv.dbUrl &&
    fromEnv.publishableKey &&
    fromEnv.serviceRoleKey
  ) {
    assertHarnessEndpoint("API_URL", fromEnv.url, HARNESS_API_PORT);
    assertHarnessEndpoint("DB_URL", fromEnv.dbUrl, HARNESS_DB_PORT);
    return {
      url: fromEnv.url,
      dbUrl: fromEnv.dbUrl,
      publishableKey: fromEnv.publishableKey,
      serviceRoleKey: fromEnv.serviceRoleKey,
    };
  }

  let raw: string;
  try {
    raw = execFileSync(
      process.execPath,
      [supabaseCliScript, "--workdir", HARNESS_WORKDIR, "status", "-o", "json"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch {
    throw new Error(
      "[test:integration] Dedicated lockdin-db-harness is unavailable. Run `pnpm --filter @workspace/scripts db-harness` or `pnpm --filter @workspace/api-server test:integration`. This command never falls back to hosted Supabase or the ordinary lockedinapp stack.",
    );
  }
  const status = JSON.parse(raw) as Record<string, string>;
  const apiUrl = status.API_URL ?? "";
  const dbUrl = status.DB_URL ?? "";
  assertHarnessEndpoint("API_URL", apiUrl, HARNESS_API_PORT);
  assertHarnessEndpoint("DB_URL", dbUrl, HARNESS_DB_PORT);
  const publishableKey = status.PUBLISHABLE_KEY || status.ANON_KEY;
  const serviceRoleKey = status.SERVICE_ROLE_KEY;
  if (!publishableKey || !serviceRoleKey) {
    throw new Error("[test:integration] Dedicated stack is missing Auth keys.");
  }
  return { url: apiUrl, dbUrl, publishableKey, serviceRoleKey };
}
