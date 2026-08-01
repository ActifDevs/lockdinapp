/**
 * Fail clearly unless local Supabase is running on localhost/127.0.0.1.
 * Never falls back to hosted Supabase. Used by `pnpm test:integration`.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

function fail(message) {
  console.error(`\n[test:integration] ${message}\n`);
  process.exit(1);
}

let raw;
try {
  raw = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "json"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch {
  fail(
    "Local Supabase is unavailable. Start it with `pnpm supabase:start` " +
      "(or `pnpm exec supabase start`) and re-run `pnpm test:integration`. " +
      "This command never falls back to hosted Supabase.",
  );
}

let status;
try {
  status = JSON.parse(raw);
} catch {
  fail("Could not parse `supabase status -o json` output.");
}

const apiUrl = status.API_URL ?? "";
const isLocal =
  apiUrl.includes("127.0.0.1") || apiUrl.includes("localhost");

if (!apiUrl || !isLocal) {
  fail(
    `Supabase API URL is not local (got ${JSON.stringify(apiUrl)}). ` +
      "Refuse to run integration tests against a non-local project. " +
      "Never use hosted Supabase for this suite.",
  );
}

if (!status.PUBLISHABLE_KEY && !status.ANON_KEY) {
  fail("Local Supabase status is missing PUBLISHABLE_KEY / ANON_KEY.");
}
if (!status.SERVICE_ROLE_KEY) {
  fail("Local Supabase status is missing SERVICE_ROLE_KEY.");
}
if (!status.DB_URL) {
  fail("Local Supabase status is missing DB_URL.");
}

console.log(`[test:integration] Local Supabase OK at ${apiUrl}`);
process.exit(0);
