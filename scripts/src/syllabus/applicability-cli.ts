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

type Mode = "validate" | "apply";

export type ApplicabilityCliOptions = {
  loadManifest?: () => ApplicabilityManifest;
  validate?: typeof validateApplicabilityPopulation;
  apply?: typeof applyApplicabilityPopulation;
  output?: Pick<Console, "log" | "error">;
};

function parseMode(args: string[]): Mode {
  const modeArg = args.find((item) => item.startsWith("--mode="))?.split("=")[1];
  if (modeArg === "apply") return "apply";
  return "validate";
}

export async function runApplicabilityCli(
  args: string[],
  options: ApplicabilityCliOptions = {},
): Promise<number> {
  const output = options.output ?? console;
  const mode = parseMode(args);
  try {
    const manifest = (options.loadManifest ?? loadApplicabilityManifest)();
    if (mode === "validate") {
      const result = await (options.validate ?? validateApplicabilityPopulation)(
        manifest,
      );
      output.log(
        `APPLICABILITY VALIDATE: ${result.targets.length}/9 targets OK`,
      );
      output.log("Overall: OK");
      return 0;
    }

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
