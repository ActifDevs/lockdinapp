/**
 * B3R — fresh disposable harness DB reproducibility proof.
 *
 * Uses the dedicated db-harness Supabase stack (ports 55421/55422), NOT the
 * developer's already-repaired B3 local DB on 54322.
 *
 * Requires: LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB=1
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { applyBootstrap, verifyBootstrapPrerequisites } from "../db-harness/bootstrap.js";
import { ensureCleanPublicSchema } from "../db-harness/cleanup.js";
import { executeMigrations, verifyMigrationJournal } from "../db-harness/migrate.js";
import {
  HARNESS_PROJECT_ID,
  assertDedicatedPortsAvailable,
  assertDedicatedStackDisposed,
  getLocalStackStatus,
  getRunningProjectIdentity,
  startDedicatedStack,
  stopDedicatedStack,
  verifyDedicatedConfig,
} from "../db-harness/stack.js";
import {
  assertDestructiveTarget,
  checkInheritedDbUrls,
  isLoopbackUrl,
} from "../db-harness/target-safety.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function runTsx(relativeScript: string, env: NodeJS.ProcessEnv): void {
  const result = spawnSync(
    "pnpm",
    ["--filter", "@workspace/scripts", "exec", "tsx", relativeScript],
    { cwd: ROOT, env, encoding: "utf8" },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`failed: tsx ${relativeScript}`);
  }
}

function run(
  script: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): void {
  const result = spawnSync(
    "pnpm",
    ["--filter", "@workspace/scripts", script, ...args],
    { cwd: ROOT, env, encoding: "utf8" },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`failed: ${script} ${args.join(" ")}`);
  }
}

async function assertSchemaContract(pool: Pool): Promise<void> {
  const cols = await pool.query<{ column_name: string; is_nullable: string }>(`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'assessment_study_option_groups'
      AND column_name IN ('min_selections', 'max_selections')
    ORDER BY column_name
  `);
  const names = cols.rows.map((row) => row.column_name);
  if (!names.includes("min_selections") || !names.includes("max_selections")) {
    throw new Error("TRACKED MIGRATION REPRODUCIBILITY BLOCKER: min/max_selections missing");
  }
  if (cols.rows.some((row) => row.is_nullable !== "NO")) {
    throw new Error("TRACKED MIGRATION REPRODUCIBILITY BLOCKER: min/max must be NOT NULL");
  }

  const constraints = await pool.query<{ conname: string }>(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.assessment_study_option_groups'::regclass
      AND conname IN (
        'assessment_study_option_groups_min_selections_positive',
        'assessment_study_option_groups_max_gte_min'
      )
  `);
  if (constraints.rows.length !== 2) {
    throw new Error("TRACKED MIGRATION REPRODUCIBILITY BLOCKER: cardinality constraints missing");
  }

  const selectionPk = await pool.query<{ present: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'user_subject_option_selections_pk'
    ) AS present
  `);
  if (!selectionPk.rows[0]?.present) {
    throw new Error("TRACKED MIGRATION REPRODUCIBILITY BLOCKER: selection PK missing");
  }

  // PK includes option_id → multiple options per group allowed (no obsolete
  // unique on user+subject+group alone).
  const obsolete = await pool.query<{ present: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'user_subject_option_selections'
        AND c.contype IN ('u', 'p')
        AND pg_get_constraintdef(c.oid) ILIKE '%option_group_id%'
        AND pg_get_constraintdef(c.oid) NOT ILIKE '%option_id%'
    ) AS present
  `);
  if (obsolete.rows[0]?.present) {
    throw new Error("TRACKED MIGRATION REPRODUCIBILITY BLOCKER: obsolete one-option-per-group uniqueness");
  }

  for (const table of [
    "assessment_route_sets",
    "assessment_routes",
    "assessment_route_components",
    "assessment_study_option_groups",
    "assessment_study_options",
    "assessment_study_option_units",
    "assessment_study_option_year_mappings",
  ]) {
    const exists = await pool.query<{ present: boolean }>(
      `SELECT to_regclass($1) IS NOT NULL AS present`,
      [`public.${table}`],
    );
    if (!exists.rows[0]?.present) {
      throw new Error(`TRACKED MIGRATION REPRODUCIBILITY BLOCKER: missing ${table}`);
    }
  }
}

async function assertCatalogueCounts(pool: Pool): Promise<void> {
  const q = async (sql: string) =>
    Number((await pool.query<{ n: string }>(sql)).rows[0]?.n ?? -1);

  const expected: Record<string, number> = {
    subjects: 16,
    syllabus_versions: 29,
    published_versions: 21,
    retired_versions: 8,
    route_sets_published: 29,
    routes: 95,
    option_groups: 13,
    options: 45,
    option_units: 72,
    year_mappings: 54,
    history_r002_year_maps: 27,
    history_as_null: 448,
    feb_mar_enabled: 0,
  };

  const actual = {
    subjects: await q(`SELECT count(*)::text AS n FROM subjects`),
    syllabus_versions: await q(`SELECT count(*)::text AS n FROM syllabus_versions`),
    published_versions: await q(
      `SELECT count(*)::text AS n FROM syllabus_versions WHERE lifecycle='published'`,
    ),
    retired_versions: await q(
      `SELECT count(*)::text AS n FROM syllabus_versions WHERE lifecycle='retired'`,
    ),
    route_sets_published: await q(
      `SELECT count(*)::text AS n FROM assessment_route_sets WHERE lifecycle='published'`,
    ),
    routes: await q(`SELECT count(*)::text AS n FROM assessment_routes`),
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
    history_r002_year_maps: await q(`
      SELECT count(*)::text AS n
      FROM assessment_study_option_year_mappings ym
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
    feb_mar_enabled: await q(`
      SELECT count(*)::text AS n
      FROM syllabus_version_exam_series
      WHERE series = 'Feb/Mar' AND product_auto_assign = true
    `),
  };

  console.log(JSON.stringify({ expected, actual }, null, 2));
  for (const [key, want] of Object.entries(expected)) {
    if (actual[key as keyof typeof actual] !== want) {
      throw new Error(
        `fresh B3 count mismatch for ${key}: expected ${want} got ${actual[key as keyof typeof actual]}`,
      );
    }
  }
}

async function main(): Promise<void> {
  const inherited = checkInheritedDbUrls(
    process.env.DATABASE_URL,
    process.env.DIRECT_DATABASE_URL,
  );
  if (!inherited.isSafe) {
    throw new Error(inherited.error);
  }

  await verifyDedicatedConfig();
  let ownsStack = false;
  let status = getLocalStackStatus();
  if (!status) {
    assertDedicatedPortsAvailable();
    startDedicatedStack();
    ownsStack = true;
    status = getLocalStackStatus();
  }
  if (!status) throw new Error("harness stack unavailable");

  const databaseUrl = status.dbUrl;
  if (!isLoopbackUrl(databaseUrl)) {
    throw new Error("LOCAL DATABASE SAFETY NOT PROVEN");
  }
  assertDestructiveTarget({
    apiUrl: status.apiUrl,
    dbUrl: databaseUrl,
    runningProjectId: getRunningProjectIdentity(),
    expectedProjectId: HARNESS_PROJECT_ID,
    destructiveAuthorization: process.env.LOCKDIN_ALLOW_DESTRUCTIVE_LOCAL_DB,
  });

  const pool = new Pool({ connectionString: databaseUrl });
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_DATABASE_URL: databaseUrl,
    SUPABASE_URL: status.apiUrl,
    LOCKDIN_ALLOW_LOCAL_ROUTE_PUBLICATION: "1",
  };

  try {
    console.log("=== B3R fresh schema wipe + bootstrap + migrate ===");
    await ensureCleanPublicSchema(pool);
    // Public wipe does not clear drizzle.__drizzle_migrations. Reset the journal
    // so the tracked chain is applied from scratch against the bootstrap baseline.
    await pool.query(`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    await pool.query(`CREATE SCHEMA drizzle AUTHORIZATION postgres`);
    await applyBootstrap(pool);
    const bootstrap = await verifyBootstrapPrerequisites(pool);
    if (!bootstrap.success) {
      throw new Error(bootstrap.error ?? "bootstrap verification failed");
    }
    executeMigrations(databaseUrl);
    const journal = await verifyMigrationJournal(pool);
    if (!journal.success) {
      throw new Error(journal.error ?? "journal verification failed");
    }
    if (journal.expected.length !== 18) {
      throw new Error(`expected 18 migrations, got ${journal.expected.length}`);
    }
    if (journal.expected.at(-1) !== "0017_route_reference_immutability") {
      throw new Error(`unexpected migration head ${journal.expected.at(-1)}`);
    }
    console.log("Migration journal PASS count=18 head=0017_route_reference_immutability");

    console.log("=== Schema contract (no manual repair) ===");
    await assertSchemaContract(pool);
    console.log("TRACKED 0016 FINAL CONTRACT: PASS (fresh)");

    console.log("=== B3 local adoption on fresh harness DB ===");
    run("syllabus:b3-local-adopt", [], env);
    // Content publish is included in b3-local-adopt; resume is idempotent if needed.
    runTsx("./src/syllabus/b3-local-publish-resume.ts", env);
    runTsx("./src/route-manifest/b3-local-publish-all.ts", env);

    // Annotate historical r001 windows is NOT needed for route publish after
    // sources-validity fallback; publish-all already ran.

    console.log("=== Catalogue counts ===");
    await assertCatalogueCounts(pool);

    // Resolver: retired r001 never assignable; successor selected
    const resolve = await pool.query<{ key: string | null }>(`
      SELECT sv.logical_revision_key AS key
      FROM subjects s
      JOIN LATERAL (
        SELECT public.lockdin_resolve_applicable_syllabus_version(
          s.id, 2027, 'May/June'::public.exam_sitting_series
        ) AS vid
      ) r ON true
      JOIN syllabus_versions sv ON sv.id = r.vid
      WHERE s.code = '9489'
    `);
    if (resolve.rows[0]?.key !== "9489-r002") {
      throw new Error(`expected 9489 2027 → r002, got ${resolve.rows[0]?.key}`);
    }

    let retiredAssignable = false;
    try {
      await pool.query(`
        SELECT public.lockdin_resolve_applicable_syllabus_version(
          (SELECT id FROM subjects WHERE code='9489'),
          2027,
          'Feb/Mar'::public.exam_sitting_series
        )
      `);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("no_applicable_syllabus_version")) {
        throw error;
      }
    }
    const retiredPublished = await pool.query<{ n: string }>(`
      SELECT count(*)::text AS n
      FROM syllabus_versions
      WHERE logical_revision_key = '9489-r001' AND lifecycle = 'published'
    `);
    if (retiredPublished.rows[0]?.n !== "0") retiredAssignable = true;
    if (retiredAssignable) {
      throw new Error("retired r001 still published");
    }

    console.log("\nB3R FRESH REPRODUCTION: PASS");
    console.log("Classification: HISTORICAL LOCAL DATABASE DRIFT ONLY");
    console.log("NO NEW MIGRATION REQUIRED FOR THIS DRIFT");
  } finally {
    await pool.end().catch(() => undefined);
    if (ownsStack) {
      stopDedicatedStack();
      assertDedicatedStackDisposed();
    }
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
