import { Pool } from "pg";

const SHARED_TABLES = [
  "subjects",
  "syllabus_versions",
  "syllabus_units",
  "syllabus_topics",
  "syllabus_learning_outcomes",
  "assessment_components",
  "learning_outcome_components",
  "assessment_route_sets",
  "assessment_routes",
  "assessment_route_components",
  "assessment_study_option_groups",
  "assessment_study_options",
  "assessment_study_option_units",
  "assessment_study_option_year_mappings",
];

/** Route/reference tables introduced in 0016 — RLS-protected, browser-writable denied. */
const ROUTE_REFERENCE_RLS_TABLES = [
  "assessment_route_sets",
  "assessment_routes",
  "assessment_route_components",
  "assessment_study_option_groups",
  "assessment_study_options",
  "assessment_study_option_units",
  "assessment_study_option_year_mappings",
];

const USER_TABLES = [
  "profiles",
  "user_subjects",
  "user_subject_option_selections",
  "topic_progress",
  "tasks",
  "past_paper_attempts",
  "exam_dates",
];

const EXPECTED_AUTH_FOREIGN_KEYS = [
  ["profiles", "id"],
  ["user_subjects", "user_id"],
  ["topic_progress", "user_id"],
  ["tasks", "user_id"],
  ["past_paper_attempts", "user_id"],
  ["exam_dates", "user_id"],
] as const;

const EXPECTED_POLICIES = [
  "profiles_select_own",
  "profiles_update_own",
  "user_subjects_select_own",
  "user_subject_option_selections_select_own",
  "assessment_route_sets_select_authenticated",
  "assessment_routes_select_authenticated",
  "assessment_route_components_select_authenticated",
  "assessment_study_option_groups_select_authenticated",
  "assessment_study_options_select_authenticated",
  "assessment_study_option_units_select_authenticated",
  "assessment_study_option_year_mappings_select_authenticated",
  "topic_progress_select_own",
  "tasks_select_own",
  "tasks_insert_own",
  "tasks_update_own",
  "tasks_delete_own",
  "past_paper_attempts_select_own",
  "past_paper_attempts_insert_own",
  "past_paper_attempts_delete_own",
  "exam_dates_select_own",
  "exam_dates_insert_own",
  "exam_dates_delete_own",
];

export interface SchemaVerificationResult {
  success: boolean;
  error?: string;
  serialSequence?: string;
}

export async function verifyFinalSchema(
  pool: Pool,
): Promise<SchemaVerificationResult> {
  try {
    const tables = await pool.query<{ tablename: string }>(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `);
    const actualTables = new Set(tables.rows.map((row) => row.tablename));
    const missingTables = [...SHARED_TABLES, ...USER_TABLES].filter(
      (table) => !actualTables.has(table),
    );
    if (missingTables.length > 0) {
      return {
        success: false,
        error: "Final application tables are incomplete.",
      };
    }

    const rls = await pool.query<{ relname: string; relrowsecurity: boolean }>(
      `
      SELECT c.relname, c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
    `,
      [USER_TABLES],
    );
    if (
      rls.rows.length !== USER_TABLES.length ||
      rls.rows.some((row) => !row.relrowsecurity)
    ) {
      return {
        success: false,
        error: "Required user-table RLS is incomplete.",
      };
    }

    const routeRls = await pool.query<{
      relname: string;
      relrowsecurity: boolean;
    }>(
      `
      SELECT c.relname, c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])
    `,
      [ROUTE_REFERENCE_RLS_TABLES],
    );
    if (
      routeRls.rows.length !== ROUTE_REFERENCE_RLS_TABLES.length ||
      routeRls.rows.some((row) => !row.relrowsecurity)
    ) {
      return {
        success: false,
        error: "Required route-reference-table RLS is incomplete.",
      };
    }

    const routeColumn = await pool.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_subjects'
        AND column_name = 'assessment_route_id'
    `);
    if (routeColumn.rows.length !== 1) {
      return {
        success: false,
        error: "user_subjects.assessment_route_id column is missing.",
      };
    }

    const policies = await pool.query<{ policyname: string }>(
      `
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND policyname = ANY($1::text[])
    `,
      [EXPECTED_POLICIES],
    );
    const policyNames = new Set(policies.rows.map((row) => row.policyname));
    if (EXPECTED_POLICIES.some((policy) => !policyNames.has(policy))) {
      return { success: false, error: "Required RLS policies are incomplete." };
    }

    for (const [table, column] of EXPECTED_AUTH_FOREIGN_KEYS) {
      const foreignKey = await pool.query<{ present: boolean }>(
        `
        SELECT EXISTS (
          SELECT 1
          FROM pg_constraint constraint_record
          JOIN pg_class source_table ON source_table.oid = constraint_record.conrelid
          JOIN pg_namespace source_schema ON source_schema.oid = source_table.relnamespace
          JOIN pg_class target_table ON target_table.oid = constraint_record.confrelid
          JOIN pg_namespace target_schema ON target_schema.oid = target_table.relnamespace
          JOIN unnest(constraint_record.conkey) WITH ORDINALITY AS source_key(attnum, ordinality)
            ON true
          JOIN pg_attribute source_column
            ON source_column.attrelid = source_table.oid
           AND source_column.attnum = source_key.attnum
          WHERE constraint_record.contype = 'f'
            AND source_schema.nspname = 'public'
            AND source_table.relname = $1
            AND source_column.attname = $2
            AND target_schema.nspname = 'auth'
            AND target_table.relname = 'users'
        ) AS present
      `,
        [table, column],
      );
      if (!foreignKey.rows[0]?.present) {
        return {
          success: false,
          error: "Required auth.users relationships are incomplete.",
        };
      }
    }

    const sequence = await pool.query<{ sequence: string | null }>(`
      SELECT pg_get_serial_sequence(
        'public.past_paper_attempts',
        'id'
      ) AS sequence
    `);
    if (!sequence.rows[0]?.sequence) {
      return {
        success: false,
        error: "past_paper_attempts serial ownership is missing.",
      };
    }

    const lifecycle = await pool.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'syllabus_versions'
        AND column_name IN (
          'lifecycle',
          'applicable_from_year',
          'applicable_session_range'
        )
    `);
    if (lifecycle.rows.length !== 3) {
      return {
        success: false,
        error: "syllabus_versions lifecycle/applicability columns are incomplete.",
      };
    }

    const identityIndexes = await pool.query<{ indexname: string; indisunique: boolean }>(`
      SELECT i.relname AS indexname, ix.indisunique
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'syllabus_versions'
        AND i.relname IN (
          'syllabus_versions_logical_revision_per_subject',
          'syllabus_versions_content_sha256_idx',
          'syllabus_versions_subject_source_idx',
          'syllabus_versions_content_sha256_per_subject',
          'syllabus_versions_subject_source_unique'
        )
    `);
    const byName = new Map(
      identityIndexes.rows.map((row) => [row.indexname, row.indisunique]),
    );
    if (byName.get("syllabus_versions_logical_revision_per_subject") !== true) {
      return {
        success: false,
        error: "logical_revision_key uniqueness is missing.",
      };
    }
    if (byName.get("syllabus_versions_content_sha256_idx") !== false) {
      return {
        success: false,
        error: "content_sha256 lookup index is missing or still unique.",
      };
    }
    if (byName.get("syllabus_versions_subject_source_idx") !== false) {
      return {
        success: false,
        error: "source_file lookup index is missing or still unique.",
      };
    }
    const droppedUnique = await pool.query<{ present: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'syllabus_versions_subject_source_unique'
      ) AS present
    `);
    if (droppedUnique.rows[0]?.present) {
      return {
        success: false,
        error: "source_file uniqueness constraint was not dropped.",
      };
    }

    const membershipSession = await pool.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_subjects'
        AND column_name IN ('intended_exam_year', 'intended_exam_series')
    `);
    if (membershipSession.rows.length !== 2) {
      return {
        success: false,
        error: "user_subjects intended session columns are incomplete.",
      };
    }

    const resolverExecute = await pool.query<{
      authenticated_execute: boolean;
      anon_execute: boolean;
    }>(`
      SELECT
        has_function_privilege(
          'authenticated',
          'public.lockdin_resolve_applicable_syllabus_version(integer, integer, public.exam_sitting_series)',
          'EXECUTE'
        ) AS authenticated_execute,
        has_function_privilege(
          'anon',
          'public.lockdin_resolve_applicable_syllabus_version(integer, integer, public.exam_sitting_series)',
          'EXECUTE'
        ) AS anon_execute
    `);
    if (
      resolverExecute.rows[0]?.authenticated_execute ||
      resolverExecute.rows[0]?.anon_execute
    ) {
      return {
        success: false,
        error: "Applicability resolver is executable by anon or authenticated.",
      };
    }

    const seriesPolicy = await pool.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'syllabus_version_exam_series'
        AND column_name IN ('syllabus_version_id', 'series', 'product_auto_assign')
    `);
    if (seriesPolicy.rows.length !== 3) {
      return {
        success: false,
        error: "syllabus_version_exam_series columns are incomplete.",
      };
    }
    const seriesPk = await pool.query<{ present: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'syllabus_version_exam_series_pk'
      ) AS present
    `);
    if (!seriesPk.rows[0]?.present) {
      return {
        success: false,
        error: "syllabus_version_exam_series primary key is missing.",
      };
    }

    return { success: true, serialSequence: sequence.rows[0].sequence };
  } catch {
    return { success: false, error: "Final schema verification query failed." };
  }
}

export async function verifySyntheticFixturesRemoved(
  pool: Pool,
): Promise<void> {
  const result = await pool.query<{ count: string }>(`
    SELECT count(*)::text AS count
    FROM public.subjects
    WHERE code IN ('TEST9998', 'TEST9997', 'TEST6301', 'TEST6302', 'C2A01', 'C2A02', 'C2B101', 'C2B102', 'APPX01', 'C2B201', 'C2B202', 'R002X1', 'HTTP01', 'HTTP02', 'HTTP03', 'HTTP04', 'HTTP05', 'HTTP06', 'L7A101', 'L7A102')
  `);
  if (result.rows[0]?.count !== "0") {
    throw new Error("[db-harness] Synthetic syllabus fixture cleanup failed.");
  }
}
