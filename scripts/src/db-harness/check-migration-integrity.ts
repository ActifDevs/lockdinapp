import { checkMigrationIntegrity } from "./committed-migrations.js";

try {
  const result = checkMigrationIntegrity();
  console.log(
    `[migration-integrity] PASS count=${result.count} head=${result.head}`,
  );
} catch (error) {
  console.error(
    `[migration-integrity] FAIL ${error instanceof Error ? error.message : error}`,
  );
  process.exitCode = 1;
}
