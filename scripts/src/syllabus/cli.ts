import path from "node:path";
import { fileURLToPath } from "node:url";
import { SYLLABUS_IMPORT_MANIFEST } from "./manifest.js";
import { parseAndValidateCsv } from "./parse-csv.js";
import { normalizeSyllabus } from "./normalize.js";
import { upsertSyllabus } from "./db-upsert.js";
import { pool } from "@workspace/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_DIR = path.resolve(__dirname, "../../../data/syllabi/raw");

type Mode = "validate" | "import";

function parseArgs(): { mode: Mode; dryRun: boolean; files: string[] | null } {
  const args = process.argv.slice(2);
  const modeArg = args.find((a) => a.startsWith("--mode="))?.split("=")[1];
  const dryRun = args.includes("--dry-run");
  const filesArg = args.find((a) => a.startsWith("--files="))?.split("=")[1];
  const mode: Mode = modeArg === "import" ? "import" : "validate";
  return { mode, dryRun, files: filesArg ? filesArg.split(",") : null };
}

function countOutcomes(units: { topics: { learningOutcomes: unknown[] }[] }[]): number {
  return units.reduce((sum, u) => sum + u.topics.reduce((s, t) => s + t.learningOutcomes.length, 0), 0);
}
function countTopics(units: { topics: unknown[] }[]): number {
  return units.reduce((sum, u) => sum + u.topics.length, 0);
}
function countRelationships(units: { topics: { learningOutcomes: { occurrences: unknown[] }[] }[] }[]): number {
  return units.reduce(
    (sum, u) => sum + u.topics.reduce((s, t) => s + t.learningOutcomes.reduce((s2, lo) => s2 + lo.occurrences.length, 0), 0),
    0,
  );
}

async function main() {
  const { mode, dryRun, files } = parseArgs();
  const entries = files ? SYLLABUS_IMPORT_MANIFEST.filter((e) => files.includes(e.subjectCode)) : SYLLABUS_IMPORT_MANIFEST;

  console.log(`Syllabus ${mode}${mode === "import" && dryRun ? " (dry run — zero database writes)" : ""}`);
  console.log(`Manifest entries: ${entries.length} / ${SYLLABUS_IMPORT_MANIFEST.length}\n`);

  let anyFailed = false;
  const rows: string[] = [];

  for (const entry of SYLLABUS_IMPORT_MANIFEST) {
    if (files && !files.includes(entry.subjectCode)) {
      rows.push(`${entry.csvFile.padEnd(35)} SKIPPED (not in --files filter)`);
      continue;
    }

    const filePath = path.join(CSV_DIR, entry.csvFile);
    const result = parseAndValidateCsv(filePath);

    if (result.errors.length > 0) {
      anyFailed = true;
      rows.push(`${entry.csvFile.padEnd(35)} FAILED — ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
      for (const e of result.errors.slice(0, 10)) {
        console.error(`  [${entry.csvFile}] row=${e.row} col=${e.column}: ${e.message}`);
      }
      if (result.errors.length > 10) console.error(`  ...and ${result.errors.length - 10} more error(s)`);
      continue;
    }

    const normalized = normalizeSyllabus(entry, result.rows);
    for (const notice of normalized.notices) {
      console.warn(`  [${entry.csvFile}] NOTICE: ${notice}`);
    }

    const topicsCount = countTopics(normalized.units);
    const outcomesCount = countOutcomes(normalized.units);
    const relationshipsCount = countRelationships(normalized.units);

    if (mode === "validate") {
      rows.push(
        `${entry.csvFile.padEnd(35)} OK — ${result.rows.length} rows, ${result.warnings.length} warning(s) ` +
          `(would produce ${normalized.units.length} units / ${topicsCount} topics / ${outcomesCount} outcomes / ${normalized.components.length} components / ${relationshipsCount} relationships)`,
      );
      continue;
    }

    if (dryRun) {
      rows.push(
        `${entry.csvFile.padEnd(35)} DRY RUN — would upsert ${normalized.units.length} units / ${topicsCount} topics / ` +
          `${outcomesCount} learning outcomes / ${normalized.components.length} components / ${relationshipsCount} relationships`,
      );
      continue;
    }

    try {
      const counts = await upsertSyllabus(normalized);
      rows.push(
        `${entry.csvFile.padEnd(35)} IMPORTED — subject:${counts.subject} version:${counts.version} ` +
          `units[+${counts.units.created}/~${counts.units.updated}/=${counts.units.unchanged}] ` +
          `topics[+${counts.topics.created}/~${counts.topics.updated}/=${counts.topics.unchanged}] ` +
          `outcomes[+${counts.learningOutcomes.created}/~${counts.learningOutcomes.updated}/=${counts.learningOutcomes.unchanged}] ` +
          `components[+${counts.components.created}/~${counts.components.updated}/=${counts.components.unchanged}] ` +
          `relationships[+${counts.relationships.created}]`,
      );
    } catch (err) {
      anyFailed = true;
      rows.push(`${entry.csvFile.padEnd(35)} IMPORT FAILED — ${(err as Error).message} (transaction rolled back, no partial data)`);
    }
  }

  console.log("\n--- RESULTS ---");
  for (const r of rows) console.log(r);
  console.log(`\nOverall: ${anyFailed ? "FAILED" : "OK"}`);

  await pool.end();
  process.exit(anyFailed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
