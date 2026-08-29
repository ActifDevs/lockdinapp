import path from "node:path";
import { fileURLToPath } from "node:url";
import { SYLLABUS_IMPORT_MANIFEST } from "./manifest.js";
import { parseAndValidateCsv } from "./parse-csv.js";
import { normalizeSyllabus } from "./normalize.js";
import { hashNormalizedSyllabus } from "./canonical-graph.js";
import { SyllabusOperatorError } from "./errors.js";
import type { ImportResult } from "./db-upsert.js";
import type { AdoptResult } from "./adopt.js";
import type { PublishResult } from "./publish.js";
import type { NormalizedSyllabus } from "./normalize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_DIR = path.resolve(__dirname, "../../../data/syllabi/raw");

type Mode = "validate" | "import" | "adopt" | "publish";

export type SyllabusImporter = {
  importSyllabusRevision(
    syllabus: NormalizedSyllabus,
    logicalRevisionKey: string,
  ): Promise<ImportResult>;
  adoptLegacyIdentity(options: {
    subjectCode: string;
    sourceFile: string;
    logicalRevisionKey: string;
    syllabus: NormalizedSyllabus;
  }): Promise<AdoptResult>;
  publishSyllabusRevision(options: {
    subjectCode: string;
    logicalRevisionKey: string;
    makeDefault: boolean;
    retireRevisionKey?: string;
  }): Promise<PublishResult>;
  close(): Promise<void>;
};

type CliOutput = Pick<Console, "log" | "error" | "warn">;

export type RunSyllabusCliOptions = {
  loadImporter?: () => Promise<SyllabusImporter>;
  output?: CliOutput;
};

function parseArgs(args: string[]): {
  mode: Mode;
  dryRun: boolean;
  files: string[] | null;
  revision: string | null;
  makeDefault: boolean;
  retireRevision: string | null;
} {
  const modeArg = args.find((a) => a.startsWith("--mode="))?.split("=")[1];
  const dryRun = args.includes("--dry-run");
  const filesArg = args.find((a) => a.startsWith("--files="))?.split("=")[1];
  const revisionArg = args.find((a) => a.startsWith("--revision="))?.split("=")[1];
  const retireArg = args.find((a) => a.startsWith("--retire-revision="))?.split("=")[1];
  const allowed: Mode[] = ["validate", "import", "adopt", "publish"];
  const mode: Mode = allowed.includes(modeArg as Mode)
    ? (modeArg as Mode)
    : "validate";
  return {
    mode,
    dryRun,
    files: filesArg ? filesArg.split(",") : null,
    revision: revisionArg?.trim() || null,
    makeDefault: args.includes("--make-default"),
    retireRevision: retireArg?.trim() || null,
  };
}

function countOutcomes(
  units: { topics: { learningOutcomes: unknown[] }[] }[],
): number {
  return units.reduce(
    (sum, u) =>
      sum + u.topics.reduce((s, t) => s + t.learningOutcomes.length, 0),
    0,
  );
}
function countTopics(units: { topics: unknown[] }[]): number {
  return units.reduce((sum, u) => sum + u.topics.length, 0);
}
function countRelationships(
  units: { topics: { learningOutcomes: { occurrences: unknown[] }[] }[] }[],
): number {
  return units.reduce(
    (sum, u) =>
      sum +
      u.topics.reduce(
        (s, t) =>
          s +
          t.learningOutcomes.reduce((s2, lo) => s2 + lo.occurrences.length, 0),
        0,
      ),
    0,
  );
}

async function loadDatabaseImporter(): Promise<SyllabusImporter> {
  const [{ importSyllabusRevision }, { adoptLegacyIdentity }, { publishSyllabusRevision }, { getPool }] =
    await Promise.all([
      import("./db-upsert.js"),
      import("./adopt.js"),
      import("./publish.js"),
      import("@workspace/db"),
    ]);
  const pool = getPool();

  return {
    importSyllabusRevision,
    adoptLegacyIdentity,
    publishSyllabusRevision,
    close: () => pool.end(),
  };
}

type PreparedEntry = {
  entry: (typeof SYLLABUS_IMPORT_MANIFEST)[number];
  normalized: NormalizedSyllabus;
};

export async function runSyllabusCli(
  args: string[],
  options: RunSyllabusCliOptions = {},
): Promise<number> {
  const { mode, dryRun, files, revision, makeDefault, retireRevision } =
    parseArgs(args);
  const output = options.output ?? console;
  const loadImporter = options.loadImporter ?? loadDatabaseImporter;
  const entries = files
    ? SYLLABUS_IMPORT_MANIFEST.filter((e) => files.includes(e.subjectCode))
    : SYLLABUS_IMPORT_MANIFEST;

  const needsDb = (mode === "import" && !dryRun) || mode === "adopt" || mode === "publish";
  if (needsDb) {
    if (!revision) {
      throw new SyllabusOperatorError(
        "missing_logical_revision_key",
        "logical revision key is required (--revision=); do not infer it from the filename",
      );
    }
    if (!files || files.length !== 1) {
      throw new SyllabusOperatorError(
        "subject_scope",
        "import, adopt, and publish require exactly one subject via --files=<subject-code>",
      );
    }
    const selected = SYLLABUS_IMPORT_MANIFEST.find((entry) => entry.subjectCode === files[0]);
    if (!selected) {
      throw new SyllabusOperatorError(
        "subject_scope",
        `unknown subject code "${files[0]}"`,
      );
    }
  }

  output.log(
    `Syllabus ${mode}${mode === "import" && dryRun ? " (dry run — zero database writes)" : ""}`,
  );
  output.log(
    `Manifest entries: ${entries.length} / ${SYLLABUS_IMPORT_MANIFEST.length}\n`,
  );

  if (mode === "publish") {
    const importer = await loadImporter();
    try {
      const published = await importer.publishSyllabusRevision({
        subjectCode: files![0]!,
        logicalRevisionKey: revision!,
        makeDefault,
        retireRevisionKey: retireRevision ?? undefined,
      });
      output.log("\n--- RESULTS ---");
      output.log(
        `${files![0]!.padEnd(35)} PUBLISHED — default=${published.isCurrent} retired=${published.retiredRevisionKey ?? "none"}`,
      );
      output.log("\nOverall: OK");
      return 0;
    } catch (err) {
      const message =
        err instanceof SyllabusOperatorError
          ? `${err.code}: ${err.message}`
          : (err as Error).message;
      output.log("\n--- RESULTS ---");
      output.log(`${files![0]!.padEnd(35)} PUBLISH FAILED — ${message}`);
      output.log("\nOverall: FAILED");
      return 1;
    } finally {
      await importer.close();
    }
  }

  let anyFailed = false;
  const results: Array<string | PreparedEntry> = [];

  for (const entry of SYLLABUS_IMPORT_MANIFEST) {
    if (files && !files.includes(entry.subjectCode)) {
      results.push(
        `${entry.csvFile.padEnd(35)} SKIPPED (not in --files filter)`,
      );
      continue;
    }

    const filePath = path.join(CSV_DIR, entry.csvFile);
    const result = parseAndValidateCsv(filePath);

    if (result.errors.length > 0) {
      anyFailed = true;
      results.push(
        `${entry.csvFile.padEnd(35)} FAILED — ${result.errors.length} error(s), ${result.warnings.length} warning(s)`,
      );
      for (const e of result.errors.slice(0, 10)) {
        output.error(
          `  [${entry.csvFile}] row=${e.row} col=${e.column}: ${e.message}`,
        );
      }
      if (result.errors.length > 10)
        output.error(`  ...and ${result.errors.length - 10} more error(s)`);
      continue;
    }

    const normalized = normalizeSyllabus(entry, result.rows);
    for (const notice of normalized.notices) {
      output.warn(`  [${entry.csvFile}] NOTICE: ${notice}`);
    }

    const topicsCount = countTopics(normalized.units);
    const outcomesCount = countOutcomes(normalized.units);
    const relationshipsCount = countRelationships(normalized.units);
    const contentSha256 = hashNormalizedSyllabus(normalized);
    const revisionLabel = revision ?? "(unset)";

    if (mode === "validate") {
      results.push(
        `${entry.csvFile.padEnd(35)} OK — ${result.rows.length} rows, ${result.warnings.length} warning(s) ` +
          `revision=${revisionLabel} sha256=${contentSha256.slice(0, 12)}… ` +
          `(would produce ${normalized.units.length} units / ${topicsCount} topics / ${outcomesCount} outcomes / ${normalized.components.length} components / ${relationshipsCount} relationships)`,
      );
      continue;
    }

    if (mode === "import" && dryRun) {
      results.push(
        `${entry.csvFile.padEnd(35)} DRY RUN — revision=${revisionLabel} sha256=${contentSha256} ` +
          `would import ${normalized.units.length} units / ${topicsCount} topics / ` +
          `${outcomesCount} learning outcomes / ${normalized.components.length} components / ${relationshipsCount} relationships`,
      );
      continue;
    }

    results.push({ entry, normalized });
  }

  const rows: string[] = [];
  if (needsDb) {
    const importer = await loadImporter();
    try {
      for (const result of results) {
        if (typeof result === "string") {
          rows.push(result);
          continue;
        }

        const { entry, normalized } = result;
        try {
          if (mode === "import") {
            const counts = await importer.importSyllabusRevision(
              normalized,
              revision!,
            );
            rows.push(
              `${entry.csvFile.padEnd(35)} ${counts.operation.toUpperCase()} — subject:${counts.subject} ` +
                `sha256=${counts.contentSha256.slice(0, 12)}… ` +
                `units=${counts.units} topics=${counts.topics} outcomes=${counts.learningOutcomes} ` +
                `components=${counts.components} relationships=${counts.relationships}`,
            );
          } else if (mode === "adopt") {
            const adopted = await importer.adoptLegacyIdentity({
              subjectCode: entry.subjectCode,
              sourceFile: entry.csvFile,
              logicalRevisionKey: revision!,
              syllabus: normalized,
            });
            rows.push(
              `${entry.csvFile.padEnd(35)} ${adopted.operation.toUpperCase()} — key=${adopted.logicalRevisionKey} sha256=${adopted.contentSha256.slice(0, 12)}…`,
            );
          }
        } catch (err) {
          anyFailed = true;
          const message =
            err instanceof SyllabusOperatorError
              ? `${err.code}: ${err.message}`
              : (err as Error).message;
          rows.push(
            `${entry.csvFile.padEnd(35)} ${mode.toUpperCase()} FAILED — ${message}`,
          );
        }
      }
    } finally {
      await importer.close();
    }
  } else {
    rows.push(...(results as string[]));
  }

  output.log("\n--- RESULTS ---");
  for (const row of rows) output.log(row);
  output.log(`\nOverall: ${anyFailed ? "FAILED" : "OK"}`);

  return anyFailed ? 1 : 0;
}

async function main(): Promise<void> {
  try {
    process.exitCode = await runSyllabusCli(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

const isDirectExecution =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  void main();
}
