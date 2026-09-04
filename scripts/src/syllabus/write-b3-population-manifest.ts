import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "@workspace/db";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const SERIES = {
  "Feb/Mar": false,
  "May/June": true,
  "Oct/Nov": true,
} as const;

const WINDOWS: Record<string, [number, number]> = {
  "9231-r001": [2023, 2030],
  "8021-r001": [2025, 2027],
  "8021-r002": [2028, 2030],
  "9093-r001": [2027, 2028],
  "9489-r002": [2027, 2029],
  "9609-r002": [2026, 2028],
  "9618-r002": [2027, 2029],
  "9626-r001": [2025, 2027],
  "9626-r002": [2028, 2030],
  "9696-r001": [2025, 2026],
  "9696-r002": [2027, 2029],
  "9699-r001": [2027, 2028],
  "9700-r002": [2025, 2027],
  "9701-r002": [2025, 2027],
  "9701-r003": [2028, 2030],
  "9702-r002": [2025, 2027],
  "9706-r001": [2026, 2028],
  "9708-r002": [2026, 2028],
  "9709-r002": [2026, 2030],
  "9990-r001": [2027, 2027],
  "9990-r002": [2028, 2030],
};

async function main(): Promise<void> {
  const pool = getPool();
  try {
    const { rows } = await pool.query<{
      code: string;
      logical_revision_key: string;
      content_sha256: string;
      lifecycle: string;
    }>(
      `SELECT s.code, sv.logical_revision_key, sv.content_sha256, sv.lifecycle
       FROM syllabus_versions sv
       JOIN subjects s ON s.id = sv.subject_id
       WHERE sv.logical_revision_key = ANY($1)
       ORDER BY sv.logical_revision_key`,
      [Object.keys(WINDOWS)],
    );
    const versions = rows.map((row) => {
      const window = WINDOWS[row.logical_revision_key]!;
      return {
        subjectCode: row.code,
        logicalRevisionKey: row.logical_revision_key,
        expectedContentSha256: row.content_sha256,
        applicability: {
          from: { year: window[0], series: "May/June" },
          to: { year: window[1], series: "Oct/Nov" },
        },
        seriesPolicy: SERIES,
        lifecycleAtB3: row.lifecycle,
      };
    });
    const out = path.join(
      ROOT,
      "docs/reference-data/syllabus-applicability/b3-local-population-manifest.json",
    );
    writeFileSync(
      out,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          kind: "b3_local_population_manifest",
          status: "LOCAL_APPLIED",
          provenance: {
            report:
              "docs/cursor/reports/129-phase7-local-16-subject-adoption-publication-b3.md",
            researchArtifact:
              "new-seven-population-proposal.json + Report 102/127",
            ownerDecision:
              "B3 local adoption windows; Feb/Mar false; superseded r001 retired for assignment",
          },
          versions,
        },
        null,
        2,
      )}\n`,
    );
    console.log(`wrote ${versions.length} versions -> ${out}`);
  } finally {
    await pool.end();
  }
}

void main();
