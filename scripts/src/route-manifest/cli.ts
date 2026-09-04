import path from "node:path";
import { fileURLToPath } from "node:url";
import { RouteManifestError, RouteManifestValidationError } from "./errors.js";
import {
  loadRouteManifestJson,
  validateAndHashRouteManifest,
  validateRouteManifestDocument,
} from "./load.js";
import {
  canonicalizeRouteManifest,
  serializeCanonicalRouteManifest,
} from "./canonicalize.js";
import { assertLocalRoutePublicationAllowed } from "./publish-safety.js";
import { publishRouteManifest } from "./publish.js";

type Mode = "validate" | "hash" | "canonicalize" | "publish";

export type RouteManifestCliOptions = {
  output?: Pick<Console, "log" | "error">;
  readJson?: (filePath: string) => unknown;
};

function parseArgs(args: string[]): {
  mode: Mode;
  file: string | null;
  dryRun: boolean;
} {
  const modeArg = args.find((item) => item.startsWith("--mode="))?.split("=")[1];
  const fileArg =
    args.find((item) => item.startsWith("--file="))?.split("=")[1] ??
    args.find((item) => !item.startsWith("--") && !item.startsWith("-")) ??
    null;
  const dryRun = args.includes("--dry-run");

  let mode: Mode = "validate";
  if (
    modeArg === "hash" ||
    modeArg === "canonicalize" ||
    modeArg === "validate" ||
    modeArg === "publish"
  ) {
    mode = modeArg;
  } else if (modeArg) {
    throw new RouteManifestError(
      "invalid_cli_mode",
      `unsupported mode "${modeArg}" (validate|hash|canonicalize|publish)`,
    );
  }
  return { mode, file: fileArg, dryRun };
}

function printIssues(
  output: Pick<Console, "log" | "error">,
  issues: Array<{ code: string; path: string; message: string }>,
): void {
  output.error("ROUTE MANIFEST VALIDATE: FAIL");
  for (const issue of issues) {
    output.error(`[${issue.code}] ${issue.path}: ${issue.message}`);
  }
}

export async function runRouteManifestCli(
  args: string[],
  options: RouteManifestCliOptions = {},
): Promise<number> {
  const output = options.output ?? console;
  const readJson = options.readJson ?? loadRouteManifestJson;

  try {
    const { mode, file, dryRun } = parseArgs(args);
    if (!file) {
      throw new RouteManifestError(
        "missing_file",
        "usage: route-manifest --mode=validate|hash|canonicalize|publish [--dry-run] --file=<path>",
      );
    }

    const raw = readJson(path.resolve(file));

    if (mode === "validate") {
      const result = validateRouteManifestDocument(raw);
      if (!result.ok) {
        printIssues(output, result.issues);
        return 1;
      }
      output.log("ROUTE MANIFEST VALIDATE: PASS");
      output.log(
        `subject=${result.manifest.subjectCode} syllabus=${result.manifest.syllabusRevisionKey} routes=${result.manifest.routeRevisionKey}`,
      );
      return 0;
    }

    if (mode === "publish") {
      assertLocalRoutePublicationAllowed(args);
      const result = await publishRouteManifest(raw, { dryRun });
      if (result.operation === "dry_run") {
        output.log("ROUTE MANIFEST PUBLISH: DRY-RUN");
        output.log(
          [
            `subject=${result.subjectCode}`,
            `syllabus=${result.syllabusRevisionKey}`,
            `routeRevision=${result.routeRevisionKey}`,
            `hash=${result.manifestSha256}`,
            `syllabusVersionId=${result.syllabusVersionId}`,
            `currentPublished=${result.currentPublishedRouteSetId ?? "none"}`,
            `wouldNoop=${result.wouldNoop}`,
            `wouldReplace=${result.wouldReplace}`,
            `routes=${result.plannedCounts.routes}`,
            `routeComponents=${result.plannedCounts.routeComponents}`,
            `optionGroups=${result.plannedCounts.optionGroups}`,
            `options=${result.plannedCounts.options}`,
            `optionUnits=${result.plannedCounts.optionUnits}`,
            `yearMappings=${result.plannedCounts.yearMappings}`,
          ].join(" "),
        );
        return 0;
      }
      output.log(
        result.operation === "noop_existing"
          ? "ROUTE MANIFEST PUBLISH: NO-OP EXISTING"
          : "ROUTE MANIFEST PUBLISH: PASS",
      );
      output.log(
        [
          `subject=${result.subjectCode}`,
          `syllabus=${result.syllabusRevisionKey}`,
          `routeRevision=${result.routeRevisionKey}`,
          `hash=${result.manifestSha256}`,
          `routeSetId=${result.routeSetId}`,
          `previousPublished=${result.previousPublishedRouteSetId ?? "none"}`,
          `lifecycle=${result.lifecycle}`,
          `routes=${result.counts.routes}`,
          `routeComponents=${result.counts.routeComponents}`,
          `optionGroups=${result.counts.optionGroups}`,
          `options=${result.counts.options}`,
          `optionUnits=${result.counts.optionUnits}`,
          `yearMappings=${result.counts.yearMappings}`,
        ].join(" "),
      );
      return 0;
    }

    const { hash, canonicalJson, manifest } = validateAndHashRouteManifest(raw);
    if (mode === "hash") {
      output.log(hash);
      return 0;
    }

    // canonicalize
    output.log(canonicalJson);
    output.log(
      `/* subject=${manifest.subjectCode} hash=${hash} */`,
    );
    return 0;
  } catch (error) {
    if (error instanceof RouteManifestValidationError) {
      printIssues(output, error.issues);
      return 1;
    }
    if (error instanceof RouteManifestError) {
      output.error(`${error.code}: ${error.message}`);
      return 1;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("published/retired route-reference contract is immutable")) {
      output.error(`immutable_contract: ${message}`);
      return 1;
    }
    output.error(message);
    return 1;
  }
}

const isDirectExecution =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  void runRouteManifestCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}

// Re-export for tests that inspect canonicalization via CLI helpers.
export { canonicalizeRouteManifest, serializeCanonicalRouteManifest };
