import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { Pool } from "pg";
import { REPO_ROOT } from "./stack.js";

export const EXPECTED_MIGRATIONS = [
  ["0000_syllabus_reference_and_paper_attempts", 1785172719598],
  ["0001_chilly_randall_flagg", 1785576300874],
  ["0002_phase2_atomic_onboarding", 1785624652661],
  ["0003_stormy_mongu", 1785690212772],
  ["0004_colossal_pixie", 1786108276313],
  ["0005_restrict_user_subject_writes", 1786112424076],
  ["0006_slippery_squirrel_girl", 1786296025143],
  ["0007_eager_squadron_supreme", 1786302770787],
  ["0008_uneven_mojo", 1786394449630],
  ["0009_dear_mathemanic", 1786547274449],
  ["0010_preserve_existing_syllabus_version_pins", 1787998795377],
  ["0011_open_sunfire", 1788003568152],
  ["0012_ordinary_penance", 1788010369454],
  ["0013_useful_husk", 1788038002411],
  ["0014_perpetual_nighthawk", 1788044465654],
  ["0015_silent_sentinel", 1788051000000],
] as const;

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
        stdio: ["ignore", "inherit", "inherit"],
      },
    );
  } catch {
    throw new Error("[db-harness] Committed Drizzle migrations failed.");
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
            "Migration journal does not exactly match committed 0000-0015.",
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
