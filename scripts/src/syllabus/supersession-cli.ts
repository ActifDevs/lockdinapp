/**
 * CLI: syllabus:prepare-supersession
 * Explicit dry-run / apply for historical applicability-window clearing.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "@workspace/db";
import { SyllabusOperatorError } from "./errors.js";
import {
  prepareSupersession,
  type SupersessionTarget,
} from "./supersession-prepare.js";
import { assertCatalogueMutationAuthorized } from "../hosted-cutover/mutation-target.js";

type Mode = "dry-run" | "apply";

function parseArgs(args: string[]): {
  mode: Mode;
  planPath: string | null;
} {
  const mode: Mode = args.includes("--apply") ? "apply" : "dry-run";
  const planArg = args.find((item) => item.startsWith("--plan="))?.slice("--plan=".length);
  return { mode, planPath: planArg?.trim() || null };
}

function loadPlan(filePath: string): SupersessionTarget[] {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as {
    targets?: SupersessionTarget[];
  };
  if (!Array.isArray(raw.targets) || raw.targets.length === 0) {
    throw new SyllabusOperatorError(
      "invalid_supersession_plan",
      "plan must include a non-empty targets array",
    );
  }
  return raw.targets;
}

export async function runSupersessionCli(
  args: string[],
  output: Pick<Console, "log" | "error"> = console,
): Promise<number> {
  try {
    const { mode, planPath } = parseArgs(args);
    if (!planPath) {
      output.error(
        "usage: syllabus:prepare-supersession --plan=<file.json> [--apply] [--hosted-cutover]",
      );
      return 1;
    }

    // Dry-run is read-only classification; still require local/hosted target safety
    // so a mistaken hosted DATABASE_URL cannot be probed without authorization.
    assertCatalogueMutationAuthorized({ argv: args });

    const targets = loadPlan(path.resolve(planPath));
    const result = await prepareSupersession({
      targets,
      dryRun: mode !== "apply",
    });

    output.log(`SUPERSESSION PREPARE: ${result.operation.toUpperCase()}`);
    for (const row of result.targets) {
      output.log(
        [
          `subject=${row.subjectCode}`,
          `historical=${row.historicalRevisionKey}`,
          `successor=${row.successorRevisionKey}`,
          `lifecycle=${row.historicalLifecycle}`,
          `successorLifecycle=${row.successorLifecycle ?? "none"}`,
          `windowNull=${row.historicalWindowNull}`,
          `pins=${row.membershipPinCount}`,
          `status=${row.status}`,
          `action=${row.plannedAction}`,
        ].join(" "),
      );
    }
    output.log("Overall: OK");
    return 0;
  } catch (error) {
    if (error instanceof SyllabusOperatorError) {
      output.error(`${error.code}: ${error.message}`);
      return 1;
    }
    output.error(error instanceof Error ? error.message : String(error));
    return 1;
  } finally {
    await getPool().end().catch(() => undefined);
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  void runSupersessionCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
