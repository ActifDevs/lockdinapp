/**
 * Resume helper: apply applicability + publish for already-imported B3 drafts.
 * Local loopback only.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "@workspace/db";
import { isLoopbackUrl } from "../db-harness/target-safety.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SERIES = {
  "Feb/Mar": false,
  "May/June": true,
  "Oct/Nov": true,
} as const;

const STEPS = [
  {
    subjectCode: "9489",
    revision: "9489-r002",
    window: {
      from: { year: 2027, series: "May/June" as const },
      to: { year: 2029, series: "Oct/Nov" as const },
    },
    retireRevision: "9489-r001",
    makeDefault: true,
  },
  {
    subjectCode: "9609",
    revision: "9609-r002",
    window: {
      from: { year: 2026, series: "May/June" as const },
      to: { year: 2028, series: "Oct/Nov" as const },
    },
    retireRevision: "9609-r001",
    makeDefault: true,
  },
  {
    subjectCode: "9618",
    revision: "9618-r002",
    window: {
      from: { year: 2027, series: "May/June" as const },
      to: { year: 2029, series: "Oct/Nov" as const },
    },
    retireRevision: "9618-r001",
    makeDefault: true,
  },
  {
    subjectCode: "9700",
    revision: "9700-r002",
    window: {
      from: { year: 2025, series: "May/June" as const },
      to: { year: 2027, series: "Oct/Nov" as const },
    },
    retireRevision: "9700-r001",
    makeDefault: true,
  },
  {
    subjectCode: "9701",
    revision: "9701-r002",
    window: {
      from: { year: 2025, series: "May/June" as const },
      to: { year: 2027, series: "Oct/Nov" as const },
    },
    retireRevision: "9701-r001",
    makeDefault: true,
  },
  {
    subjectCode: "9701",
    revision: "9701-r003",
    window: {
      from: { year: 2028, series: "May/June" as const },
      to: { year: 2030, series: "Oct/Nov" as const },
    },
    makeDefault: false,
  },
  {
    subjectCode: "9702",
    revision: "9702-r002",
    window: {
      from: { year: 2025, series: "May/June" as const },
      to: { year: 2027, series: "Oct/Nov" as const },
    },
    retireRevision: "9702-r001",
    makeDefault: true,
  },
  {
    subjectCode: "9708",
    revision: "9708-r002",
    window: {
      from: { year: 2026, series: "May/June" as const },
      to: { year: 2028, series: "Oct/Nov" as const },
    },
    retireRevision: "9708-r001",
    makeDefault: true,
  },
  {
    subjectCode: "9709",
    revision: "9709-r002",
    window: {
      from: { year: 2026, series: "May/June" as const },
      to: { year: 2030, series: "Oct/Nov" as const },
    },
    retireRevision: "9709-r001",
    makeDefault: true,
  },
  {
    subjectCode: "8021",
    revision: "8021-r001",
    window: {
      from: { year: 2025, series: "May/June" as const },
      to: { year: 2027, series: "Oct/Nov" as const },
    },
    makeDefault: true,
  },
  {
    subjectCode: "8021",
    revision: "8021-r002",
    window: {
      from: { year: 2028, series: "May/June" as const },
      to: { year: 2030, series: "Oct/Nov" as const },
    },
    makeDefault: false,
  },
  {
    subjectCode: "9093",
    revision: "9093-r001",
    window: {
      from: { year: 2027, series: "May/June" as const },
      to: { year: 2028, series: "Oct/Nov" as const },
    },
    makeDefault: true,
  },
  {
    subjectCode: "9626",
    revision: "9626-r001",
    window: {
      from: { year: 2025, series: "May/June" as const },
      to: { year: 2027, series: "Oct/Nov" as const },
    },
    makeDefault: true,
  },
  {
    subjectCode: "9626",
    revision: "9626-r002",
    window: {
      from: { year: 2028, series: "May/June" as const },
      to: { year: 2030, series: "Oct/Nov" as const },
    },
    makeDefault: false,
  },
  {
    subjectCode: "9696",
    revision: "9696-r001",
    window: {
      from: { year: 2025, series: "May/June" as const },
      to: { year: 2026, series: "Oct/Nov" as const },
    },
    makeDefault: true,
  },
  {
    subjectCode: "9696",
    revision: "9696-r002",
    window: {
      from: { year: 2027, series: "May/June" as const },
      to: { year: 2029, series: "Oct/Nov" as const },
    },
    makeDefault: false,
  },
  {
    subjectCode: "9699",
    revision: "9699-r001",
    window: {
      from: { year: 2027, series: "May/June" as const },
      to: { year: 2028, series: "Oct/Nov" as const },
    },
    makeDefault: true,
  },
  {
    subjectCode: "9706",
    revision: "9706-r001",
    window: {
      from: { year: 2026, series: "May/June" as const },
      to: { year: 2028, series: "Oct/Nov" as const },
    },
    makeDefault: true,
  },
  {
    subjectCode: "9990",
    revision: "9990-r001",
    window: {
      from: { year: 2027, series: "May/June" as const },
      to: { year: 2027, series: "Oct/Nov" as const },
    },
    makeDefault: true,
  },
  {
    subjectCode: "9990",
    revision: "9990-r002",
    window: {
      from: { year: 2028, series: "May/June" as const },
      to: { year: 2030, series: "Oct/Nov" as const },
    },
    makeDefault: false,
  },
] as const;

function run(script: string, args: string[]): void {
  const result = spawnSync(
    "pnpm",
    ["--filter", "@workspace/scripts", script, "--", ...args],
    { cwd: ROOT, env: process.env, encoding: "utf8" },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`failed: ${script} ${args.join(" ")}`);
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_DATABASE_URL;
  if (!databaseUrl || !isLoopbackUrl(databaseUrl)) {
    throw new Error("LOCAL DATABASE SAFETY NOT PROVEN");
  }

  // Explicit supersession prepare before successor applicability (B5CR).
  // Idempotent when windows already cleared / retired.
  // Prefer hosted-restore plan (with pin counts) when present on a restored
  // B5C backup; otherwise use the default pin-agnostic plan.
  console.log("=== PREPARE SUPERSESSION (explicit) ===");
  const hostedRestorePlan = path.join(
    ROOT,
    "docs/reference-data/syllabus-applicability/b5c-supersession-prepare-plan.hosted-restore.json",
  );
  const defaultPlan = path.join(
    ROOT,
    "docs/reference-data/syllabus-applicability/b5c-supersession-prepare-plan.json",
  );
  const planPath =
    process.env.LOCKDIN_SUPERSESSION_PLAN?.trim() ||
    (process.env.LOCKDIN_B5C_HOSTED_RESTORE_REHEARSAL === "1"
      ? hostedRestorePlan
      : defaultPlan);
  run("syllabus:prepare-supersession", ["--apply", `--plan=${planPath}`]);

  const pool = getPool();
  try {
    for (const step of STEPS) {
      const { rows } = await pool.query<{
        lifecycle: string;
        content_sha256: string;
        applicable_from_year: number | null;
      }>(
        `SELECT lifecycle, content_sha256, applicable_from_year
         FROM syllabus_versions WHERE logical_revision_key = $1`,
        [step.revision],
      );
      const row = rows[0];
      if (!row) throw new Error(`missing ${step.revision}`);
      if (row.lifecycle === "published") {
        console.log(`SKIP already published ${step.revision}`);
        continue;
      }

      const manifestPath = path.join(
        ROOT,
        `docs/reference-data/syllabus-applicability/.b3-tmp-${step.revision}.json`,
      );
      writeFileSync(
        manifestPath,
        `${JSON.stringify(
          {
            schemaVersion: 1,
            provenance: {
              report: "129",
              researchArtifact: "b3-local",
              ownerDecision: "local adoption resume",
            },
            versions: [
              {
                subjectCode: step.subjectCode,
                logicalRevisionKey: step.revision,
                expectedContentSha256: row.content_sha256,
                applicability: step.window,
                seriesPolicy: SERIES,
              },
            ],
          },
          null,
          2,
        )}\n`,
      );

      // If a prior apply wrote the window under a stale expected hash, lockAndLoad
      // still succeeds when the CURRENT db hash matches this manifest.
      // If window already exact + policy exact → already-applied.
      run("syllabus:applicability", [
        "--mode=apply",
        `--manifest=${manifestPath}`,
      ]);

      const pub = [
        `--files=${step.subjectCode}`,
        `--revision=${step.revision}`,
      ];
      if (step.makeDefault) pub.push("--make-default");
      if ("retireRevision" in step && step.retireRevision) {
        pub.push(`--retire-revision=${step.retireRevision}`);
      }
      console.log(`\n=== PUBLISH ${step.revision} ===`);
      run("syllabus:publish", pub);
    }
    console.log("\nPUBLISH PHASE COMPLETE");
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
