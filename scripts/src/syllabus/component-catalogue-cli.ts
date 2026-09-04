import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "@workspace/db";
import { SyllabusOperatorError } from "./errors.js";
import {
  loadComponentCatalogue,
  seedComponentCatalogue,
} from "./component-catalogue.js";

export async function runComponentCatalogueCli(
  args: string[],
  output: Pick<Console, "log" | "error"> = console,
): Promise<number> {
  const fileArg = args.find((item) => item.startsWith("--file="))?.slice(7);
  if (!fileArg?.trim()) {
    output.error(
      "usage: syllabus:component-catalogue --file=<component-catalogue.json>",
    );
    return 1;
  }
  try {
    const catalogue = loadComponentCatalogue(path.resolve(fileArg.trim()));
    const result = await seedComponentCatalogue(catalogue);
    output.log(
      `COMPONENT CATALOGUE: ${result.operation} subject=${catalogue.subjectCode} revision=${catalogue.syllabusRevisionKey} inserted=${result.inserted} present=${result.present}`,
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
  } finally {
    await getPool().end().catch(() => undefined);
  }
}

const isDirectExecution =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  void runComponentCatalogueCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
