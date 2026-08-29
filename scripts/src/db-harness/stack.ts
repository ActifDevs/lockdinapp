import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = join(moduleDirectory, "../../..");
export const HARNESS_WORKDIR = join(
  REPO_ROOT,
  "scripts",
  "fixtures",
  "db-harness",
);
export const HARNESS_CONFIG_PATH = join(
  HARNESS_WORKDIR,
  "supabase",
  "config.toml",
);
export const HARNESS_PROJECT_ID = "lockdin-db-harness";
export const HARNESS_API_PORT = 55421;
export const HARNESS_DB_PORT = 55422;

const SUPABASE_CLI = join(
  REPO_ROOT,
  "node_modules",
  "supabase",
  "dist",
  "supabase.js",
);
const EXCLUDED_SERVICES = [
  "studio",
  "inbucket",
  "storage",
  "imgproxy",
  "realtime",
  "analytics",
  "vector",
  "edge-runtime",
].join(",");
const CLI_STATE_PATHS = [
  join(HARNESS_WORKDIR, "supabase", ".temp"),
  join(HARNESS_WORKDIR, "supabase", ".branches"),
];

export interface LocalStackStatus {
  apiUrl: string;
  dbUrl: string;
}

function childEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  // The CLI gives this environment variable precedence over config.toml.
  delete env.SUPABASE_PROJECT_ID;
  return env;
}

function runSupabase(args: string[]): string {
  return execFileSync(
    process.execPath,
    [SUPABASE_CLI, "--workdir", HARNESS_WORKDIR, ...args],
    {
      cwd: REPO_ROOT,
      env: childEnvironment(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    },
  );
}

export async function verifyDedicatedConfig(): Promise<void> {
  const config = await readFile(HARNESS_CONFIG_PATH, "utf8");
  const projectMatch = config.match(/^project_id\s*=\s*"([^"]+)"/m);
  const apiMatch = config.match(/\[api\][\s\S]*?^port\s*=\s*(\d+)/m);
  const dbMatch = config.match(/\[db\][\s\S]*?^port\s*=\s*(\d+)/m);

  if (
    projectMatch?.[1] !== HARNESS_PROJECT_ID ||
    Number(apiMatch?.[1]) !== HARNESS_API_PORT ||
    Number(dbMatch?.[1]) !== HARNESS_DB_PORT
  ) {
    throw new Error(
      "[db-harness] Dedicated test configuration identity or ports are invalid.",
    );
  }
}

function canBind(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

export async function assertDedicatedPortsAvailable(): Promise<void> {
  const results = await Promise.all(
    [HARNESS_API_PORT, HARNESS_DB_PORT].map(async (port) => ({
      port,
      available: await canBind(port),
    })),
  );
  if (results.some((result) => !result.available)) {
    throw new Error(
      "[db-harness] Dedicated port availability check failed; no process was stopped.",
    );
  }
}

export function getLocalStackStatus(): LocalStackStatus | undefined {
  try {
    const raw = runSupabase(["status", "-o", "json"]);
    const status = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof status.API_URL !== "string" ||
      typeof status.DB_URL !== "string"
    ) {
      return undefined;
    }
    return { apiUrl: status.API_URL, dbUrl: status.DB_URL };
  } catch {
    return undefined;
  }
}

export function startDedicatedStack(): void {
  try {
    runSupabase(["start", "--exclude", EXCLUDED_SERVICES]);
  } catch {
    throw new Error("[db-harness] Dedicated Supabase stack failed to start.");
  }
}

export function getRunningProjectIdentity(): string {
  try {
    return execFileSync(
      "docker",
      [
        "inspect",
        `supabase_db_${HARNESS_PROJECT_ID}`,
        "--format",
        '{{index .Config.Labels "com.supabase.cli.project"}}',
      ],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    ).trim();
  } catch {
    throw new Error(
      "[db-harness] Dedicated project identity could not be verified from Docker.",
    );
  }
}

export function stopDedicatedStack(): void {
  try {
    runSupabase(["stop", "--project-id", HARNESS_PROJECT_ID, "--no-backup"]);
    for (const statePath of CLI_STATE_PATHS) {
      rmSync(statePath, { recursive: true, force: true });
    }
  } catch {
    throw new Error(
      `[db-harness] Dedicated stack cleanup failed. Manual cleanup: node node_modules/supabase/dist/supabase.js --workdir scripts/fixtures/db-harness stop --project-id ${HARNESS_PROJECT_ID} --no-backup`,
    );
  }
}

function dockerResourceNames(
  kind: "container" | "network" | "volume",
): string[] {
  const args =
    kind === "container" ? ["ps", "-a", "--filter"] : [kind, "ls", "--filter"];
  const output = execFileSync(
    "docker",
    [
      ...args,
      `label=com.supabase.cli.project=${HARNESS_PROJECT_ID}`,
      "--format",
      kind === "container" ? "{{.Names}}" : "{{.Name}}",
    ],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  return output
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export function assertDedicatedStackDisposed(): void {
  try {
    const remaining = [
      ...dockerResourceNames("container"),
      ...dockerResourceNames("network"),
      ...dockerResourceNames("volume"),
    ];
    const cliStateRemaining = CLI_STATE_PATHS.some((statePath) =>
      existsSync(statePath),
    );
    if (remaining.length === 0 && !cliStateRemaining) return;
  } catch {
    // Report the same credential-free cleanup category below.
  }

  throw new Error(
    `[db-harness] Dedicated stack cleanup verification failed. Manual cleanup: node node_modules/supabase/dist/supabase.js --workdir scripts/fixtures/db-harness stop --project-id ${HARNESS_PROJECT_ID} --no-backup`,
  );
}
