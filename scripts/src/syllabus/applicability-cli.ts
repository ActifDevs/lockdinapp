import path from "node:path";
import { fileURLToPath } from "node:url";
import { SyllabusOperatorError } from "./errors.js";
import {
  loadApplicabilityManifest,
  type ApplicabilityManifest,
} from "./applicability-manifest.js";
import {
  applyApplicabilityPopulation,
  validateApplicabilityPopulation,
} from "./applicability-populate.js";
import { assertCatalogueMutationAuthorized } from "../hosted-cutover/mutation-target.js";

type Mode = "validate" | "apply";

export type ApplicabilityCliOptions = {
  loadManifest?: (filePath?: string) => ApplicabilityManifest;
  validate?: typeof validateApplicabilityPopulation;
  apply?: typeof applyApplicabilityPopulation;
  output?: Pick<Console, "log" | "error">;
};

function parseArgs(args: string[]): { mode: Mode; manifestPath: string | null } {
  const modeArg = args.find((item) => item.startsWith("--mode="))?.split("=")[1];
  const manifestArg = args
    .find((item) => item.startsWith("--manifest="))
    ?.slice("--manifest=".length);
  return {
    mode: modeArg === "apply" ? "apply" : "validate",
    manifestPath: manifestArg?.trim() || null,
  };
}

export async function runApplicabilityCli(
  args: string[],
  options: ApplicabilityCliOptions = {},
): Promise<number> {
  const output = options.output ?? console;
  const { mode, manifestPath } = parseArgs(args);
  try {
    const load =
      options.loadManifest ??
      ((filePath?: string) => loadApplicabilityManifest(filePath));
    const manifest = load(manifestPath ?? undefined);
    if (mode === "validate") {
      const result = await (options.validate ?? validateApplicabilityPopulation)(
        manifest,
      );
      output.log(
        `APPLICABILITY VALIDATE: ${result.targets.length}/${manifest.versions.length} targets OK`,
      );
      output.log("Overall: OK");
      return 0;
    }

    assertCatalogueMutationAuthorized({ argv: args });

    const result = await (options.apply ?? applyApplicabilityPopulation)(
      manifest,
    );
    const populated = result.targets.filter((row) => row.status === "populated")
      .length;
    const already = result.targets.filter(
      (row) => row.status === "already-applied",
    ).length;
    output.log(
      `APPLICABILITY APPLY: ${result.operation}; populated=${populated} already-applied=${already}`,
    );
    output.log("Overall: OK");
    return 0;
  } catch (error) {
    if (error instanceof SyllabusOperatorError) {
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
  void runApplicabilityCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
