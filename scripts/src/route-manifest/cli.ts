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

type Mode = "validate" | "hash" | "canonicalize";

export type RouteManifestCliOptions = {
  output?: Pick<Console, "log" | "error">;
  readJson?: (filePath: string) => unknown;
};

function parseArgs(args: string[]): { mode: Mode; file: string | null } {
  const modeArg = args.find((item) => item.startsWith("--mode="))?.split("=")[1];
  const fileArg =
    args.find((item) => item.startsWith("--file="))?.split("=")[1] ??
    args.find((item) => !item.startsWith("--")) ??
    null;

  let mode: Mode = "validate";
  if (modeArg === "hash" || modeArg === "canonicalize" || modeArg === "validate") {
    mode = modeArg;
  } else if (modeArg) {
    throw new RouteManifestError(
      "invalid_cli_mode",
      `unsupported mode "${modeArg}" (validate|hash|canonicalize)`,
    );
  }
  return { mode, file: fileArg };
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
    const { mode, file } = parseArgs(args);
    if (!file) {
      throw new RouteManifestError(
        "missing_file",
        "usage: route-manifest --mode=validate|hash|canonicalize --file=<path>",
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
    output.error(error instanceof Error ? error.message : String(error));
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
