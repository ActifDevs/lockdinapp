import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { loadCommittedMigrations } from "./committed-migrations.js";
import { REPO_ROOT } from "./stack.js";

export const EXPECTED_MIGRATIONS = loadCommittedMigrations().map(
  (migration) => [migration.tag, migration.when] as const,
);

function databaseEnvironment(databaseUrl: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_DATABASE_URL: databaseUrl,
  };
}

export function executeMigrations(databaseUrl: string): void {
  try {
    execFileSync(
      process.execPath,
      [
        join(REPO_ROOT, "lib/db/node_modules/drizzle-kit/bin.cjs"),
        "migrate",
        "--config",
        "./drizzle.config.ts",
      ],
      {
        cwd: join(REPO_ROOT, "lib", "db"),
        env: databaseEnvironment(databaseUrl),
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      },
    );
  } catch (error) {
    const stdout =
      error && typeof error === "object" && "stdout" in error
        ? String((error as { stdout?: string }).stdout ?? "")
        : "";
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr?: string }).stderr ?? "")
        : "";
    const detail = [stdout, stderr].filter(Boolean).join("\n").trim();
    throw new Error(
      `[db-harness] Committed Drizzle migrations failed.${detail ? `\n${detail}` : ""}`,
    );
  }
}

/** Apply a committed prefix through `lastTag` for populated upgrade rehearsals. */
export async function executeMigrationsThrough(
  databaseUrl: string,
  lastTag: string,
): Promise<void> {
  const migrations = loadCommittedMigrations();
  const lastIndex = migrations.findIndex(
    (migration) => migration.tag === lastTag,
  );
  if (lastIndex < 0) {
    throw new Error(`[db-harness] Unknown migration cutoff ${lastTag}.`);
  }

  const selected = migrations.slice(0, lastIndex + 1);
  const tempRoot = mkdtempSync(join(tmpdir(), "lockdin-migrations-"));
  const metaDir = join(tempRoot, "meta");
  mkdirSync(metaDir);
  for (const migration of selected) {
    copyFileSync(migration.sqlPath, join(tempRoot, migration.sqlFileName));
  }
  writeFileSync(
    join(metaDir, "_journal.json"),
    JSON.stringify(
      {
        version: "7",
        dialect: "postgresql",
        entries: selected.map(({ idx, tag, when }) => ({
          idx,
          version: "7",
          when,
          tag,
          breakpoints: true,
        })),
      },
      null,
      2,
    ),
  );

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await migrate(drizzle(pool), { migrationsFolder: tempRoot });
  } finally {
    await pool.end();
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

export function executeSyllabusDbTests(databaseUrl: string): void {
  try {
    execFileSync(
      process.execPath,
      [
        join(REPO_ROOT, "scripts/node_modules/vitest/vitest.mjs"),
        "run",
        "src/syllabus/__tests__/db-upsert.test.ts",
        "src/syllabus/__tests__/db-model-d.test.ts",
      ],
      {
        cwd: join(REPO_ROOT, "scripts"),
        env: databaseEnvironment(databaseUrl),
        stdio: ["ignore", "inherit", "inherit"],
      },
    );
  } catch {
    throw new Error("[db-harness] Syllabus database integration tests failed.");
  }
}

export interface JournalVerificationResult {
  success: boolean;
  expected: string[];
  actual: string[];
  error?: string;
}

export async function verifyMigrationJournal(
  pool: Pool,
): Promise<JournalVerificationResult> {
  const expected = EXPECTED_MIGRATIONS.map(([tag]) => tag);
  try {
    const result = await pool.query<{ created_at: string }>(`
      SELECT created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY created_at
    `);
    const actualTimes = result.rows.map((row) => Number(row.created_at));
    const expectedTimes = EXPECTED_MIGRATIONS.map(([, timestamp]) => timestamp);
    const actual = actualTimes.map(
      (timestamp) =>
        EXPECTED_MIGRATIONS.find(
          ([, expectedTime]) => expectedTime === timestamp,
        )?.[0] ?? `unknown:${timestamp}`,
    );
    const matches =
      actualTimes.length === expectedTimes.length &&
      actualTimes.every(
        (timestamp, index) => timestamp === expectedTimes[index],
      );

    return matches
      ? { success: true, expected: [...expected], actual }
      : {
          success: false,
          expected: [...expected],
          actual,
          error:
            "Migration journal does not exactly match the committed Drizzle journal.",
        };
  } catch {
    return {
      success: false,
      expected: [...expected],
      actual: [],
      error: "Migration journal could not be verified.",
    };
  }
}
