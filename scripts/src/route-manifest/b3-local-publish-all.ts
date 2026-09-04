/**
 * Validate + dry-run/publish all route manifests against the local DB catalog.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isLoopbackUrl } from "../db-harness/target-safety.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DIR = path.join(ROOT, "docs/reference-data/route-manifests");

function runPublish(file: string, dryRun: boolean): string {
  const args = [
    "--filter",
    "@workspace/scripts",
    "route-manifest:publish",
    "--",
    `--file=${file}`,
  ];
  if (dryRun) args.push("--dry-run");
  const result = spawnSync("pnpm", args, {
    cwd: ROOT,
    env: {
      ...process.env,
      LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION: "1",
    },
    encoding: "utf8",
  });
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status !== 0) {
    throw new Error(`publish failed for ${path.basename(file)}\n${out}`);
  }
  return out;
}

function runValidate(file: string): void {
  const result = spawnSync(
    "pnpm",
    [
      "--filter",
      "@workspace/scripts",
      "route-manifest:validate",
      "--",
      `--file=${file}`,
    ],
    { cwd: ROOT, env: process.env, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `validate failed for ${path.basename(file)}\n${result.stdout}${result.stderr}`,
    );
  }
}

function runHash(file: string): string {
  const result = spawnSync(
    "pnpm",
    [
      "--filter",
      "@workspace/scripts",
      "route-manifest:hash",
      "--",
      `--file=${file}`,
    ],
    { cwd: ROOT, env: process.env, encoding: "utf8" },
  );
  const out = (result.stdout ?? "").trim();
  if (result.status !== 0 || !/^[a-f0-9]{64}$/.test(out.split("\n").pop() ?? "")) {
    throw new Error(`hash failed for ${path.basename(file)}\n${result.stdout}${result.stderr}`);
  }
  return out.split("\n").pop()!;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_DATABASE_URL;
  if (!databaseUrl || !isLoopbackUrl(databaseUrl)) {
    throw new Error("LOCAL DATABASE SAFETY NOT PROVEN");
  }
  if (process.env.LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION !== "1") {
    throw new Error("set LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION=1");
  }

  const files = readdirSync(DIR)
    .filter((name) => name.endsWith(".route-manifest.json"))
    .map((name) => path.join(DIR, name))
    .sort();

  if (files.length !== 29) {
    throw new Error(`expected 29 manifests, found ${files.length}`);
  }

  let structural = 0;
  let hashOk = 0;
  let dryOk = 0;
  let published = 0;
  let noop = 0;

  for (const file of files) {
    const base = path.basename(file);
    runValidate(file);
    structural += 1;
    runHash(file);
    hashOk += 1;
    const dry = runPublish(file, true);
    if (!dry.includes("DRY-RUN")) {
      throw new Error(`expected dry-run for ${base}\n${dry}`);
    }
    if (dry.includes("wouldNoop=false") || dry.includes("wouldNoop=true")) {
      dryOk += 1;
    } else {
      throw new Error(`dry-run missing wouldNoop for ${base}\n${dry}`);
    }
    console.log(`RESOLVE OK ${base}`);
  }

  console.log(`\nStructural PASS ${structural}/29`);
  console.log(`Hash PASS ${hashOk}/29`);
  console.log(`DB dry-run resolve PASS ${dryOk}/29`);

  for (const file of files) {
    const out = runPublish(file, false);
    if (out.includes("NO-OP EXISTING")) noop += 1;
    else if (out.includes("PUBLISH: PASS")) published += 1;
    else throw new Error(`unexpected publish result for ${path.basename(file)}\n${out}`);
    console.log(`PUBLISHED ${path.basename(file)}`);
  }

  console.log(`\nFirst publish: published=${published} noop=${noop}`);

  let secondNoop = 0;
  for (const file of files) {
    const out = runPublish(file, false);
    if (!out.includes("NO-OP EXISTING")) {
      throw new Error(`expected NO-OP republish for ${path.basename(file)}\n${out}`);
    }
    secondNoop += 1;
  }
  console.log(`Identical republish NO-OP ${secondNoop}/29`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
