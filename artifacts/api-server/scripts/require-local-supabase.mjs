/**
 * Fail clearly unless local Supabase is running on an exact loopback hostname.
 * Never falls back to hosted Supabase. Used by `pnpm test:integration`.
 *
 * Helpers are exported for unit tests; status validation runs only on direct execution.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const supabaseCliScript = path.join(
  repoRoot,
  "node_modules",
  "supabase",
  "dist",
  "supabase.js",
);

const LOOPBACK_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

export function isLoopbackUrl(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return false;
  }

  try {
    const parsed = new URL(value);
    return LOOPBACK_HOSTNAMES.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function assertLoopbackUrl(name, value) {
  if (!isLoopbackUrl(value)) {
    throw new Error(
      `[test:integration] ${name} must use an exact loopback hostname`,
    );
  }
}

async function main() {
  let raw;
  try {
    raw = execFileSync(process.execPath, [supabaseCliScript, "status", "-o", "json"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(
      "[test:integration] Local Supabase is unavailable. Start it with " +
        "`pnpm supabase:start` (or `pnpm exec supabase start`) and re-run " +
        "`pnpm test:integration`. This command never falls back to hosted Supabase.",
    );
  }

  let status;
  try {
    status = JSON.parse(raw);
  } catch {
    throw new Error(
      "[test:integration] Could not parse `supabase status -o json` output.",
    );
  }

  const apiUrl = status.API_URL ?? "";
  const dbUrl = status.DB_URL ?? "";

  assertLoopbackUrl("API_URL", apiUrl);
  assertLoopbackUrl("DB_URL", dbUrl);

  if (!status.PUBLISHABLE_KEY && !status.ANON_KEY) {
    throw new Error(
      "[test:integration] Local Supabase status is missing PUBLISHABLE_KEY / ANON_KEY.",
    );
  }
  if (!status.SERVICE_ROLE_KEY) {
    throw new Error(
      "[test:integration] Local Supabase status is missing SERVICE_ROLE_KEY.",
    );
  }

  console.log("[test:integration] Local Supabase loopback URLs verified");
}

const isDirectExecution =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  main().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "[test:integration] Local Supabase validation failed",
    );
    process.exit(1);
  });
}
