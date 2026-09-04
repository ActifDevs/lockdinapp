/**
 * B5CR — reproduce the B5C hosted cutover write path against a loopback DB
 * restored from the pre-B5C backup (after tracked 0018), using ONLY permanent
 * repository tooling. No ephemeral patches. No out-of-repo scripts. No manual SQL.
 *
 * Expected caller sequence:
 *   1. restore pre-B5C dump into disposable loopback Postgres
 *   2. pnpm --filter @workspace/db migrate  (18→19 / 0018)
 *   3. pnpm --filter @workspace/scripts syllabus:b5c-cutover-rehearsal
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "@workspace/db";
import { isLoopbackUrl } from "../db-harness/target-safety.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const EXPECTED_SNAP =
  "649a60a12ce103b9177272f47c9dbc5ba21d4ba3a72084b156bcbcfeb189b5b8";

function run(script: string, args: string[] = [], env: Record<string, string> = {}): void {
  const result = spawnSync(
    "pnpm",
    ["--filter", "@workspace/scripts", script, ...(args.length ? ["--", ...args] : [])],
    {
      cwd: ROOT,
      env: { ...process.env, ...env },
      encoding: "utf8",
    },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`failed: ${script} ${args.join(" ")}`);
  }
}

async function assertPost0018Baseline(pool: Awaited<ReturnType<typeof getPool>>): Promise<void> {
  const mig = await pool.query<{ n: string; tag: string }>(`
    SELECT count(*)::text AS n FROM drizzle.__drizzle_migrations
  `);
  if (mig.rows[0]?.n !== "19") {
    throw new Error(`expected 19 migrations, got ${mig.rows[0]?.n}`);
  }
  const subjects = await pool.query<{ n: string }>(`SELECT count(*)::text AS n FROM subjects`);
  const versions = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM syllabus_versions`,
  );
  if (subjects.rows[0]?.n !== "9" || versions.rows[0]?.n !== "9") {
    throw new Error(
      `expected post-0018 pre-catalogue 9/9, got subjects=${subjects.rows[0]?.n} versions=${versions.rows[0]?.n}`,
    );
  }
  const col = await pool.query<{ d: string | null }>(`
    SELECT column_default AS d FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subjects'
      AND column_name='selectable_for_new_memberships'
  `);
  if (!(col.rows[0]?.d ?? "").toLowerCase().includes("false")) {
    throw new Error("selectable_for_new_memberships default must be false");
  }
}

async function membershipSnapSha(
  pool: Awaited<ReturnType<typeof getPool>>,
): Promise<string> {
  const { createHash } = await import("node:crypto");
  const { rows } = await pool.query<{ line: string }>(`
    SELECT user_id::text || '|' || subject_id || '|' || syllabus_version_id AS line
    FROM user_subjects
    ORDER BY user_id, subject_id
  `);
  return createHash("sha256")
    .update(rows.map((r) => r.line).join("\n") + "\n")
    .digest("hex");
}

async function assertFinalCounts(pool: Awaited<ReturnType<typeof getPool>>): Promise<void> {
  const q = async (sql: string) =>
    Number((await pool.query<{ n: string }>(sql)).rows[0]?.n ?? -1);
  const expected: Record<string, number> = {
    subjects: 16,
    versions: 29,
    published: 21,
    retired: 8,
    route_sets: 29,
    routes: 95,
    route_components: 333,
    option_groups: 13,
    options: 45,
    option_units: 72,
    year_mappings: 54,
    history_r002_ym: 27,
    history_as_null: 448,
    memberships: 15,
    route_nonnull: 0,
    option_sel: 0,
    feb_mar: 0,
    new7_sel: 0,
    cur9_sel: 9,
  };
  const actual = {
    subjects: await q(`SELECT count(*)::text AS n FROM subjects`),
    versions: await q(`SELECT count(*)::text AS n FROM syllabus_versions`),
    published: await q(
      `SELECT count(*)::text AS n FROM syllabus_versions WHERE lifecycle='published'`,
    ),
    retired: await q(
      `SELECT count(*)::text AS n FROM syllabus_versions WHERE lifecycle='retired'`,
    ),
    route_sets: await q(
      `SELECT count(*)::text AS n FROM assessment_route_sets WHERE lifecycle='published'`,
    ),
    routes: await q(`SELECT count(*)::text AS n FROM assessment_routes`),
    route_components: await q(
      `SELECT count(*)::text AS n FROM assessment_route_components`,
    ),
    option_groups: await q(
      `SELECT count(*)::text AS n FROM assessment_study_option_groups`,
    ),
    options: await q(`SELECT count(*)::text AS n FROM assessment_study_options`),
    option_units: await q(
      `SELECT count(*)::text AS n FROM assessment_study_option_units`,
    ),
    year_mappings: await q(
      `SELECT count(*)::text AS n FROM assessment_study_option_year_mappings`,
    ),
    history_r002_ym: await q(`
      SELECT count(*)::text AS n FROM assessment_study_option_year_mappings ym
      JOIN syllabus_versions sv ON sv.id = ym.syllabus_version_id
      WHERE sv.logical_revision_key = '9489-r002'
    `),
    history_as_null: await q(`
      SELECT count(*)::text AS n
      FROM learning_outcome_components loc
      JOIN syllabus_learning_outcomes lo ON lo.id = loc.learning_outcome_id
      JOIN syllabus_topics t ON t.id = lo.topic_id
      JOIN syllabus_units u ON u.id = t.unit_id
      JOIN syllabus_versions sv ON sv.id = u.syllabus_version_id
      WHERE sv.logical_revision_key = '9489-r002'
        AND loc.level = 'AS Level'
        AND loc.component_id IS NULL
    `),
    memberships: await q(`SELECT count(*)::text AS n FROM user_subjects`),
    route_nonnull: await q(
      `SELECT count(*)::text AS n FROM user_subjects WHERE assessment_route_id IS NOT NULL`,
    ),
    option_sel: await q(
      `SELECT count(*)::text AS n FROM user_subject_option_selections`,
    ),
    feb_mar: await q(`
      SELECT count(*)::text AS n FROM syllabus_version_exam_series
      WHERE series = 'Feb/Mar' AND product_auto_assign = true
    `),
    new7_sel: await q(`
      SELECT count(*)::text AS n FROM subjects
      WHERE code IN ('8021','9093','9626','9696','9699','9706','9990')
        AND selectable_for_new_memberships
    `),
    cur9_sel: await q(`
      SELECT count(*)::text AS n FROM subjects
      WHERE code IN ('9231','9489','9609','9618','9700','9701','9702','9708','9709')
        AND selectable_for_new_memberships
    `),
  };
  console.log(JSON.stringify({ expected, actual }, null, 2));
  for (const [key, want] of Object.entries(expected)) {
    if (actual[key as keyof typeof actual] !== want) {
      throw new Error(
        `count mismatch ${key}: expected ${want} got ${actual[key as keyof typeof actual]}`,
      );
    }
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_DATABASE_URL;
  if (!databaseUrl || !isLoopbackUrl(databaseUrl)) {
    throw new Error("LOCAL DATABASE SAFETY NOT PROVEN");
  }
  if (process.env.LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION !== "1") {
    throw new Error("set LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION=1");
  }

  // Hosted-style gate dry proof (mocked non-loopback expectations) — does not
  // authorize this loopback write path; proves permanent env wiring loads.
  if (process.env.LOCKDIN_B5CR_MOCK_HOSTED_GATE_PROOF === "1") {
    const { checkHostedCatalogueCutoverGate, hostedCutoverGateInputFromEnv } =
      await import("../hosted-cutover/safety-gate.js");
    const input = hostedCutoverGateInputFromEnv({
      ...process.env,
      LOCKDIN_ALLOW_HOSTED_CATALOGUE_CUTOVER: "1",
      LOCKDIN_EXPECTED_PROJECT_REF: "hazvcdrcvsxmuwdfiucx",
      LOCKDIN_ACTUAL_PROJECT_REF: "hazvcdrcvsxmuwdfiucx",
      DATABASE_URL:
        "postgresql://postgres.hazvcdrcvsxmuwdfiucx:x@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
      LOCKDIN_EXPECTED_REPOSITORY_COMMIT:
        "8978d3beda7d90db6069b5783c49c047af1af3a1",
      LOCKDIN_ACTUAL_REPOSITORY_COMMIT:
        "8978d3beda7d90db6069b5783c49c047af1af3a1",
      LOCKDIN_EXPECTED_MIGRATION_HEAD:
        "0018_subject_visibility_and_route_assignment",
      LOCKDIN_ACTUAL_MIGRATION_HEAD:
        "0018_subject_visibility_and_route_assignment",
      LOCKDIN_HOSTED_BACKUP_CONFIRMED: "1",
      LOCKDIN_EXPECTED_PRECUTOVER_FINGERPRINT: "mock-fp",
      LOCKDIN_ACTUAL_PRECUTOVER_FINGERPRINT: "mock-fp",
    } as NodeJS.ProcessEnv);
    const result = checkHostedCatalogueCutoverGate(input);
    if (!result.allowed) {
      throw new Error(`mocked hosted gate proof failed: ${result.reason}`);
    }
    console.log("MOCKED HOSTED GATE WIRING PROOF: ALLOWED");
  }

  const pool = getPool();
  try {
    console.log("=== Post-0018 pre-catalogue baseline ===");
    await assertPost0018Baseline(pool);
    const beforeSnap = await membershipSnapSha(pool);
    if (beforeSnap !== EXPECTED_SNAP) {
      throw new Error(`membership snap mismatch before cutover: ${beforeSnap}`);
    }
    console.log("membership snap PASS");

    console.log("\n=== B3 local adoption (includes explicit supersession) ===");
    run("syllabus:b3-local-adopt", [], {
      LOCKDIN_B5C_HOSTED_RESTORE_REHEARSAL: "1",
      LOCKDIN_SUPERSESSION_PLAN: path.resolve(
        ROOT,
        "docs/reference-data/syllabus-applicability/b5c-supersession-prepare-plan.hosted-restore.json",
      ),
    });

    console.log("\n=== Route publication (local gate) ===");
    run("route-manifest:b3-local-publish-all", [], {
      LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION: "1",
    });

    console.log("\n=== Final counts ===");
    await assertFinalCounts(pool);
    const afterSnap = await membershipSnapSha(pool);
    if (afterSnap !== EXPECTED_SNAP) {
      throw new Error(`membership snap drifted: ${afterSnap}`);
    }
    console.log("B5C CUTOVER REHEARSAL: PASS");
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
