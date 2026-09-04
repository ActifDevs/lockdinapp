/**
 * Phase 7 B3 — local-only 16-subject content + reference adoption orchestrator.
 *
 * Safety: loopback DATABASE_URL required. No hosted writes. No membership repin.
 * Does not commit/push. Leaves repository + local DB ready for Report 129 proof.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isLoopbackUrl } from "../db-harness/target-safety.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SERIES = {
  "Feb/Mar": false,
  "May/June": true,
  "Oct/Nov": true,
} as const;

type Window = {
  from: { year: number; series: "May/June" | "Oct/Nov" | "Feb/Mar" };
  to: { year: number; series: "May/June" | "Oct/Nov" | "Feb/Mar" };
};

type AdoptionStep = {
  subjectCode: string;
  revision: string;
  csv: string;
  window: Window;
  /** When publishing, retire this historical key (pin-preserving). */
  retireRevision?: string;
  makeDefault?: boolean;
  /** After import, seed this component catalogue (History P1–P4). */
  componentCatalogue?: string;
  /** Skip import; only legacy-adopt identity on existing published row. */
  adoptOnly?: boolean;
};

const CURRENT_NINE_ADOPT: AdoptionStep[] = [
  {
    subjectCode: "9231",
    revision: "9231-r001",
    csv: "data/syllabi/raw/9231_further_mathematics.csv",
    window: {
      from: { year: 2023, series: "May/June" },
      to: { year: 2030, series: "Oct/Nov" },
    },
    adoptOnly: true,
    makeDefault: true,
  },
  {
    subjectCode: "9489",
    revision: "9489-r001",
    csv: "data/syllabi/raw/9489_history.csv",
    window: {
      from: { year: 2027, series: "May/June" },
      to: { year: 2029, series: "Oct/Nov" },
    },
    adoptOnly: true,
    makeDefault: true,
  },
  {
    subjectCode: "9609",
    revision: "9609-r001",
    csv: "data/syllabi/raw/9609_business.csv",
    window: {
      from: { year: 2023, series: "May/June" },
      to: { year: 2028, series: "Oct/Nov" },
    },
    adoptOnly: true,
    makeDefault: true,
  },
  {
    subjectCode: "9618",
    revision: "9618-r001",
    csv: "data/syllabi/raw/9618_computer_science.csv",
    window: {
      from: { year: 2024, series: "May/June" },
      to: { year: 2029, series: "Oct/Nov" },
    },
    adoptOnly: true,
    makeDefault: true,
  },
  {
    subjectCode: "9700",
    revision: "9700-r001",
    csv: "data/syllabi/raw/9700_biology.csv",
    window: {
      from: { year: 2025, series: "May/June" },
      to: { year: 2030, series: "Oct/Nov" },
    },
    adoptOnly: true,
    makeDefault: true,
  },
  {
    subjectCode: "9701",
    revision: "9701-r001",
    csv: "data/syllabi/raw/9701_chemistry.csv",
    window: {
      from: { year: 2025, series: "May/June" },
      to: { year: 2030, series: "Oct/Nov" },
    },
    adoptOnly: true,
    makeDefault: true,
  },
  {
    subjectCode: "9702",
    revision: "9702-r001",
    csv: "data/syllabi/raw/9702_physics.csv",
    window: {
      from: { year: 2025, series: "May/June" },
      to: { year: 2030, series: "Oct/Nov" },
    },
    adoptOnly: true,
    makeDefault: true,
  },
  {
    subjectCode: "9708",
    revision: "9708-r001",
    csv: "data/syllabi/raw/9708_economics.csv",
    window: {
      from: { year: 2023, series: "May/June" },
      to: { year: 2028, series: "Oct/Nov" },
    },
    adoptOnly: true,
    makeDefault: true,
  },
  {
    subjectCode: "9709",
    revision: "9709-r001",
    csv: "data/syllabi/raw/9709_mathematics.csv",
    window: {
      from: { year: 2023, series: "May/June" },
      to: { year: 2030, series: "Oct/Nov" },
    },
    adoptOnly: true,
    makeDefault: true,
  },
];

/** New immutable versions adopted in B3 (20 total). */
const NEW_VERSIONS: AdoptionStep[] = [
  {
    subjectCode: "9489",
    revision: "9489-r002",
    csv: "data/syllabi/candidates/current-nine-refresh/9489_history_2027-2029.csv",
    window: {
      from: { year: 2027, series: "May/June" },
      to: { year: 2029, series: "Oct/Nov" },
    },
    retireRevision: "9489-r001",
    makeDefault: true,
    componentCatalogue:
      "docs/reference-data/component-catalogues/9489-r002.component-catalogue.json",
  },
  {
    subjectCode: "9609",
    revision: "9609-r002",
    csv: "data/syllabi/candidates/current-nine-refresh/9609_business.csv",
    window: {
      from: { year: 2026, series: "May/June" },
      to: { year: 2028, series: "Oct/Nov" },
    },
    retireRevision: "9609-r001",
    makeDefault: true,
  },
  {
    subjectCode: "9618",
    revision: "9618-r002",
    csv: "data/syllabi/candidates/current-nine-refresh/9618_computer_science.csv",
    window: {
      from: { year: 2027, series: "May/June" },
      to: { year: 2029, series: "Oct/Nov" },
    },
    retireRevision: "9618-r001",
    makeDefault: true,
  },
  {
    subjectCode: "9700",
    revision: "9700-r002",
    csv: "data/syllabi/candidates/current-nine-refresh/9700_biology.csv",
    window: {
      from: { year: 2025, series: "May/June" },
      to: { year: 2027, series: "Oct/Nov" },
    },
    retireRevision: "9700-r001",
    makeDefault: true,
  },
  {
    subjectCode: "9701",
    revision: "9701-r002",
    csv: "data/syllabi/candidates/current-nine-refresh/9701_chemistry_2025-2027.csv",
    window: {
      from: { year: 2025, series: "May/June" },
      to: { year: 2027, series: "Oct/Nov" },
    },
    retireRevision: "9701-r001",
    makeDefault: true,
  },
  {
    subjectCode: "9701",
    revision: "9701-r003",
    csv: "data/syllabi/candidates/current-nine-refresh/9701_chemistry_2028-2030.csv",
    window: {
      from: { year: 2028, series: "May/June" },
      to: { year: 2030, series: "Oct/Nov" },
    },
    makeDefault: false,
  },
  {
    subjectCode: "9702",
    revision: "9702-r002",
    csv: "data/syllabi/candidates/current-nine-refresh/9702_physics.csv",
    window: {
      from: { year: 2025, series: "May/June" },
      to: { year: 2027, series: "Oct/Nov" },
    },
    retireRevision: "9702-r001",
    makeDefault: true,
  },
  {
    subjectCode: "9708",
    revision: "9708-r002",
    csv: "data/syllabi/candidates/current-nine-refresh/9708_economics.csv",
    window: {
      from: { year: 2026, series: "May/June" },
      to: { year: 2028, series: "Oct/Nov" },
    },
    retireRevision: "9708-r001",
    makeDefault: true,
  },
  {
    subjectCode: "9709",
    revision: "9709-r002",
    csv: "data/syllabi/candidates/current-nine-refresh/9709_mathematics.csv",
    window: {
      from: { year: 2026, series: "May/June" },
      to: { year: 2030, series: "Oct/Nov" },
    },
    retireRevision: "9709-r001",
    makeDefault: true,
  },
  // New seven (11)
  {
    subjectCode: "8021",
    revision: "8021-r001",
    csv: "data/syllabi/candidates/new-seven/8021_english_general_paper_2025-2027.csv",
    window: {
      from: { year: 2025, series: "May/June" },
      to: { year: 2027, series: "Oct/Nov" },
    },
    makeDefault: true,
  },
  {
    subjectCode: "8021",
    revision: "8021-r002",
    csv: "data/syllabi/candidates/new-seven/8021_english_general_paper_2028-2030.csv",
    window: {
      from: { year: 2028, series: "May/June" },
      to: { year: 2030, series: "Oct/Nov" },
    },
    makeDefault: false,
  },
  {
    subjectCode: "9093",
    revision: "9093-r001",
    csv: "data/syllabi/candidates/new-seven/9093_english_language.csv",
    window: {
      from: { year: 2027, series: "May/June" },
      to: { year: 2028, series: "Oct/Nov" },
    },
    makeDefault: true,
  },
  {
    subjectCode: "9626",
    revision: "9626-r001",
    csv: "data/syllabi/candidates/new-seven/9626_Information_Technology_2025-2027.csv",
    window: {
      from: { year: 2025, series: "May/June" },
      to: { year: 2027, series: "Oct/Nov" },
    },
    makeDefault: true,
  },
  {
    subjectCode: "9626",
    revision: "9626-r002",
    csv: "data/syllabi/candidates/new-seven/9626_Information_Technology_2028-2030.csv",
    window: {
      from: { year: 2028, series: "May/June" },
      to: { year: 2030, series: "Oct/Nov" },
    },
    makeDefault: false,
  },
  {
    subjectCode: "9696",
    revision: "9696-r001",
    csv: "data/syllabi/candidates/new-seven/9696_geography_2025-2026.csv",
    window: {
      from: { year: 2025, series: "May/June" },
      to: { year: 2026, series: "Oct/Nov" },
    },
    makeDefault: true,
  },
  {
    subjectCode: "9696",
    revision: "9696-r002",
    csv: "data/syllabi/candidates/new-seven/9696_geography_2027-2029.csv",
    window: {
      from: { year: 2027, series: "May/June" },
      to: { year: 2029, series: "Oct/Nov" },
    },
    makeDefault: false,
  },
  {
    subjectCode: "9699",
    revision: "9699-r001",
    csv: "data/syllabi/candidates/new-seven/9699_sociology_2027-2028_candidate.csv",
    window: {
      from: { year: 2027, series: "May/June" },
      to: { year: 2028, series: "Oct/Nov" },
    },
    makeDefault: true,
  },
  {
    subjectCode: "9706",
    revision: "9706-r001",
    csv: "data/syllabi/candidates/new-seven/9706_accounting.csv",
    window: {
      from: { year: 2026, series: "May/June" },
      to: { year: 2028, series: "Oct/Nov" },
    },
    makeDefault: true,
  },
  {
    subjectCode: "9990",
    revision: "9990-r001",
    csv: "data/syllabi/candidates/new-seven/9990_psychology_2027_family_candidate.csv",
    window: {
      from: { year: 2027, series: "May/June" },
      to: { year: 2027, series: "Oct/Nov" },
    },
    makeDefault: true,
  },
  {
    subjectCode: "9990",
    revision: "9990-r002",
    csv: "data/syllabi/candidates/new-seven/9990_psychology_2028-2030_family_candidate.csv",
    window: {
      from: { year: 2028, series: "May/June" },
      to: { year: 2030, series: "Oct/Nov" },
    },
    makeDefault: false,
  },
];

function assertLocalSafety(): void {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_DATABASE_URL;
  if (!databaseUrl || !isLoopbackUrl(databaseUrl)) {
    throw new Error("LOCAL DATABASE SAFETY NOT PROVEN");
  }
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  if (supabaseUrl && !isLoopbackUrl(supabaseUrl)) {
    throw new Error("LOCAL DATABASE SAFETY NOT PROVEN (SUPABASE_URL not loopback)");
  }
}

function runPnpm(
  filterScript: string,
  scriptArgs: string[],
  env: Record<string, string> = {},
): void {
  const result = spawnSync(
    "pnpm",
    ["--filter", "@workspace/scripts", filterScript, ...scriptArgs],
    {
      cwd: ROOT,
      env: { ...process.env, ...env },
      encoding: "utf8",
      shell: false,
    },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(
      `command failed: pnpm --filter @workspace/scripts ${filterScript} ${scriptArgs.join(" ")}`,
    );
  }
}

function hashFromImportDryRun(subjectCode: string, revision: string, csv: string): string {
  const result = spawnSync(
    "pnpm",
    [
      "--filter",
      "@workspace/scripts",
      "syllabus:import",
      "--",
      "--dry-run",
      `--files=${subjectCode}`,
      `--revision=${revision}`,
      `--csv=${path.resolve(ROOT, csv)}`,
    ],
    { cwd: ROOT, env: process.env, encoding: "utf8", shell: false },
  );
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status !== 0) {
    process.stdout.write(out);
    throw new Error(`dry-run failed for ${revision}`);
  }
  const match = out.match(/sha256=([a-f0-9]{64})/);
  if (!match) throw new Error(`could not parse sha256 for ${revision}\n${out}`);
  return match[1]!;
}

function writeApplicabilityManifest(
  filePath: string,
  steps: AdoptionStep[],
  hashes: Map<string, string>,
): void {
  const versions = steps.map((step) => ({
    subjectCode: step.subjectCode,
    logicalRevisionKey: step.revision,
    expectedContentSha256: hashes.get(step.revision),
    applicability: step.window,
    seriesPolicy: SERIES,
  }));
  if (versions.some((row) => !row.expectedContentSha256)) {
    throw new Error("missing content hash for applicability write-set");
  }
  const doc = {
    schemaVersion: 1,
    provenance: {
      report: "docs/cursor/reports/129-phase7-local-16-subject-adoption-publication-b3.md",
      researchArtifact:
        "docs/reference-data/syllabus-applicability/new-seven-population-proposal.json + Report 102/127 windows",
      ownerDecision:
        "B3 local adoption: official family windows; Feb/Mar product_auto_assign false; superseded r001 retired on successor publish",
    },
    versions,
  };
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(doc, null, 2)}\n`);
}

async function main(): Promise<void> {
  assertLocalSafety();
  console.log("B3 local safety: PASS (loopback DATABASE_URL)");

  const hashes = new Map<string, string>();

  // 1) Ensure current-nine r001 identities exist.
  // Prefer legacy adopt of identity-null published graphs; on a fresh DB, import
  // + publish r001 drafts instead (no manual schema repair).
  for (const step of CURRENT_NINE_ADOPT) {
    console.log(`\n=== ENSURE ${step.revision} ===`);
    const adopt = spawnSync(
      "pnpm",
      [
        "--filter",
        "@workspace/scripts",
        "syllabus:adopt",
        "--",
        `--files=${step.subjectCode}`,
        `--revision=${step.revision}`,
        `--csv=${path.resolve(ROOT, step.csv)}`,
      ],
      { cwd: ROOT, env: process.env, encoding: "utf8" },
    );
    if (adopt.stdout) process.stdout.write(adopt.stdout);
    if (adopt.stderr) process.stderr.write(adopt.stderr);
    if (adopt.status !== 0) {
      const combined = `${adopt.stdout ?? ""}${adopt.stderr ?? ""}`;
      if (
        !combined.includes("legacy_identity_requires_adoption") &&
        !combined.includes("no identity-null") &&
        !combined.includes("no subject")
      ) {
        throw new Error(`adopt failed for ${step.revision}`);
      }
      console.log(`legacy adopt unavailable — importing fresh ${step.revision}`);
      runPnpm("syllabus:import", [
        "--",
        `--files=${step.subjectCode}`,
        `--revision=${step.revision}`,
        `--csv=${path.resolve(ROOT, step.csv)}`,
      ]);
      if (step.subjectCode === "9231") {
        const sha = hashFromImportDryRun(step.subjectCode, step.revision, step.csv);
        hashes.set(step.revision, sha);
        const r001Manifest = path.resolve(
          ROOT,
          "docs/reference-data/syllabus-applicability/b3-local-r001-population.json",
        );
        writeApplicabilityManifest(r001Manifest, [step], hashes);
        runPnpm("syllabus:applicability", [
          "--",
          "--mode=apply",
          `--manifest=${r001Manifest}`,
        ]);
      }
      runPnpm("syllabus:publish", [
        "--",
        `--files=${step.subjectCode}`,
        `--revision=${step.revision}`,
        "--make-default",
      ]);
    }
    hashes.set(
      step.revision,
      hashFromImportDryRun(step.subjectCode, step.revision, step.csv),
    );
  }

  // Ensure 9231 applicability when legacy-adopt path was used (window may still
  // be null on a partially prepared DB).
  {
    const keepR001 = CURRENT_NINE_ADOPT.filter((step) => step.subjectCode === "9231");
    const r001Manifest = path.resolve(
      ROOT,
      "docs/reference-data/syllabus-applicability/b3-local-r001-population.json",
    );
    writeApplicabilityManifest(r001Manifest, keepR001, hashes);
    runPnpm("syllabus:applicability", [
      "--",
      "--mode=apply",
      `--manifest=${r001Manifest}`,
    ]);
  }

  // 2) Import 20 new versions as drafts
  for (const step of NEW_VERSIONS) {
    console.log(`\n=== IMPORT ${step.revision} ===`);
    runPnpm("syllabus:import", [
      "--",
      `--files=${step.subjectCode}`,
      `--revision=${step.revision}`,
      `--csv=${path.resolve(ROOT, step.csv)}`,
    ]);
    const sha = hashFromImportDryRun(step.subjectCode, step.revision, step.csv);
    hashes.set(step.revision, sha);
    if (step.componentCatalogue) {
      runPnpm("syllabus:component-catalogue", [
        "--",
        `--file=${path.resolve(ROOT, step.componentCatalogue)}`,
      ]);
      // Re-read post-catalogue draft hash from dry-run is wrong (CSV-only).
      // Query DB via a short node helper through applicability dry path:
      // recompute by re-running catalogue seed (idempotent) stdout, or import
      // hash from DB in write step below.
    }
  }

  // After optional catalogue seeds, refresh hashes from DB for drafts that
  // received version-scoped components beyond the CSV graph.
  const { getPool } = await import("@workspace/db");
  const pool = getPool();
  try {
    for (const step of NEW_VERSIONS) {
      const { rows } = await pool.query<{ content_sha256: string }>(
        `SELECT content_sha256 FROM syllabus_versions WHERE logical_revision_key = $1`,
        [step.revision],
      );
      if (!rows[0]?.content_sha256) {
        throw new Error(`missing DB hash for ${step.revision}`);
      }
      hashes.set(step.revision, rows[0].content_sha256);
    }
  } finally {
    await pool.end();
  }

  // Verify 9231 refresh matches r001 (no new revision)
  const refresh9231 = hashFromImportDryRun(
    "9231",
    "9231-r001",
    "data/syllabi/candidates/current-nine-refresh/9231_further_mathematics.csv",
  );
  if (refresh9231 !== hashes.get("9231-r001")) {
    throw new Error("9231 refresh hash diverges from adopted r001 — refuse silent r002");
  }
  console.log("\n9231 refresh ≡ r001:", refresh9231.slice(0, 16));

  // 2b) Explicit supersession prepare (B5CR): clear overlapping published
  // historical r001 windows before successor applicability. On a fresh B3 DB
  // where r001 windows are already null this is an idempotent already-prepared
  // NO-OP. On a hosted-from-restore baseline it clears the eight superseded
  // overlapping windows without touching content or membership pins.
  console.log("\n=== PREPARE SUPERSESSION (explicit) ===");
  const planPath =
    process.env.LOCKDIN_SUPERSESSION_PLAN?.trim() ||
    path.resolve(
      ROOT,
      process.env.LOCKDIN_B5C_HOSTED_RESTORE_REHEARSAL === "1"
        ? "docs/reference-data/syllabus-applicability/b5c-supersession-prepare-plan.hosted-restore.json"
        : "docs/reference-data/syllabus-applicability/b5c-supersession-prepare-plan.json",
    );
  runPnpm("syllabus:prepare-supersession", [
    "--",
    "--apply",
    `--plan=${planPath}`,
  ]);

  // 3) Applicability for new drafts, then publish with retire where required
  for (const step of NEW_VERSIONS) {
    const manifestPath = path.resolve(
      ROOT,
      `docs/reference-data/syllabus-applicability/.b3-tmp-${step.revision}.json`,
    );
    writeApplicabilityManifest(manifestPath, [step], hashes);
    runPnpm("syllabus:applicability", [
      "--",
      "--mode=apply",
      `--manifest=${manifestPath}`,
    ]);

    const publishArgs = [
      "--",
      `--files=${step.subjectCode}`,
      `--revision=${step.revision}`,
    ];
    if (step.makeDefault) publishArgs.push("--make-default");
    if (step.retireRevision) {
      publishArgs.push(`--retire-revision=${step.retireRevision}`);
    }
    console.log(`\n=== PUBLISH ${step.revision} ===`);
    runPnpm("syllabus:publish", publishArgs);
  }

  // Persist combined B3 write-set for Report 129
  const allSteps = [...CURRENT_NINE_ADOPT, ...NEW_VERSIONS];
  writeApplicabilityManifest(
    path.resolve(
      ROOT,
      "docs/reference-data/syllabus-applicability/b3-local-population-manifest.json",
    ),
    allSteps,
    hashes,
  );

  console.log("\nB3 CONTENT ADOPTION PHASE COMPLETE");
  console.log(`hashes recorded: ${hashes.size}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
