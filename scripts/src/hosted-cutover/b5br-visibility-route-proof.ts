/**
 * B5BR local proof: visibility fail-safe + new-membership route fail-closed.
 * Runs against a migrated loopback database (harness or developer local).
 */
import type { Pool, PoolClient } from "pg";

const CURRENT_NINE = [
  "9231",
  "9489",
  "9609",
  "9618",
  "9700",
  "9701",
  "9702",
  "9708",
  "9709",
] as const;

const FUTURE_CODES = [
  "8021",
  "9093",
  "9626",
  "9696",
  "9699",
  "9706",
  "9990",
] as const;

/** Exact backfill statement from migration 0018 (bounded to catalogue codes). */
const CURRENT_NINE_BACKFILL_SQL = `
UPDATE subjects
SET selectable_for_new_memberships = true
WHERE code IN (
  '9231','9489','9609','9618','9700','9701','9702','9708','9709'
)
`;

export async function assertVisibilityColumnContract(pool: Pool): Promise<void> {
  const col = await pool.query<{
    column_default: string | null;
    is_nullable: string;
  }>(`
    SELECT column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subjects'
      AND column_name = 'selectable_for_new_memberships'
  `);
  if (col.rowCount !== 1) {
    throw new Error("selectable_for_new_memberships missing");
  }
  if (col.rows[0]!.is_nullable !== "NO") {
    throw new Error("selectable_for_new_memberships must be NOT NULL");
  }
  const def = (col.rows[0]!.column_default ?? "").toLowerCase();
  if (!def.includes("false")) {
    throw new Error(
      `selectable_for_new_memberships default must be false, got: ${col.rows[0]!.column_default}`,
    );
  }
}

export async function assertCurrentNineBackfillSql(
  client: PoolClient,
): Promise<void> {
  // Simulate rows that exist when 0018 is applied to a populated catalogue.
  for (const code of CURRENT_NINE) {
    await client.query(
      `
      INSERT INTO subjects (name, code, color)
      VALUES ($1, $2, '#111111')
      ON CONFLICT (code) DO UPDATE
        SET selectable_for_new_memberships = false
      `,
      [`Current ${code}`, code],
    );
  }

  const before = await client.query<{ selectable: boolean }>(`
    SELECT selectable_for_new_memberships AS selectable
    FROM subjects
    WHERE code = ANY($1::text[])
  `, [CURRENT_NINE]);
  if (before.rows.some((row) => row.selectable !== false)) {
    throw new Error("pre-backfill current-nine rows must be false");
  }

  await client.query(CURRENT_NINE_BACKFILL_SQL);

  const after = await client.query<{ code: string; selectable: boolean }>(`
    SELECT code, selectable_for_new_memberships AS selectable
    FROM subjects
    WHERE code = ANY($1::text[])
    ORDER BY code
  `, [CURRENT_NINE]);
  if (after.rowCount !== CURRENT_NINE.length) {
    throw new Error("current-nine backfill row count mismatch");
  }
  for (const row of after.rows) {
    if (row.selectable !== true) {
      throw new Error(`expected ${row.code} selectable=true after backfill`);
    }
  }
}

export async function assertFutureInsertDefaultsHidden(
  client: PoolClient,
): Promise<void> {
  for (const code of FUTURE_CODES) {
    const inserted = await client.query<{ selectable: boolean }>(
      `
      INSERT INTO subjects (name, code, color)
      VALUES ($1, $2, '#111111')
      RETURNING selectable_for_new_memberships AS selectable
      `,
      [`Future ${code}`, code],
    );
    if (inserted.rows[0]?.selectable !== false) {
      throw new Error(`future insert ${code} must default selectable=false`);
    }
  }
  await client.query(`DELETE FROM subjects WHERE code = ANY($1::text[])`, [
    FUTURE_CODES,
  ]);
}

export async function assertRouteAssignmentFunctionsPresent(
  pool: Pool,
): Promise<void> {
  const fns = await pool.query<{ proname: string }>(`
    SELECT p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'lockdin_published_route_set_id',
        'lockdin_resolve_route_assignment',
        'lockdin_assign_membership_route'
      )
  `);
  if (fns.rowCount !== 3) {
    throw new Error("0018 route assignment functions missing");
  }
}

async function insertPublishedVersion(
  client: PoolClient,
  subjectId: number,
  key: string,
): Promise<number> {
  const version = await client.query<{ id: number }>(
    `
    INSERT INTO syllabus_versions (
      subject_id, label, exam_board, qualification, lifecycle, is_current,
      source_file, logical_revision_key, content_sha256
    )
    VALUES (
      $1, $2, 'CAIE', 'A Level', 'published', true,
      $3, $4, repeat('b', 64)
    )
    RETURNING id
    `,
    [subjectId, key, `${key}.csv`, `${key}-r001`],
  );
  return version.rows[0]!.id;
}

export async function assertNewMembershipZeroRouteFailClosed(
  client: PoolClient,
): Promise<void> {
  const subject = await client.query<{ id: number }>(`
    INSERT INTO subjects (name, code, color, selectable_for_new_memberships)
    VALUES ('B5BR Zero Route', 'B5BRZR', '#222222', true)
    RETURNING id
  `);
  const subjectId = subject.rows[0]!.id;
  const versionId = await insertPublishedVersion(client, subjectId, "b5br-zero");

  try {
    await client.query("SAVEPOINT b5br_zero_route");
    await client.query(
      `SELECT * FROM lockdin_resolve_route_assignment($1, $2, NULL, ARRAY[]::integer[])`,
      [subjectId, versionId],
    );
    throw new Error("expected assessment_route_unavailable");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "expected assessment_route_unavailable") throw error;
    if (!message.includes("assessment_route_unavailable")) {
      throw new Error(`unexpected error: ${message}`);
    }
    await client.query("ROLLBACK TO SAVEPOINT b5br_zero_route");
  }
}

export async function assertSingleRouteAutoResolve(
  client: PoolClient,
): Promise<void> {
  const subject = await client.query<{ id: number }>(`
    INSERT INTO subjects (name, code, color, selectable_for_new_memberships)
    VALUES ('B5BR Single', 'B5BR1', '#333333', true)
    RETURNING id
  `);
  const subjectId = subject.rows[0]!.id;
  const versionId = await insertPublishedVersion(client, subjectId, "b5br-one");
  const routeSet = await client.query<{ id: number }>(`
    INSERT INTO assessment_route_sets (
      syllabus_version_id, route_revision_key, lifecycle, manifest_sha256
    )
    VALUES ($1, 'b5br-one-routes', 'draft', repeat('c', 64))
    RETURNING id
  `, [versionId]);
  const route = await client.query<{ id: number }>(`
    INSERT INTO assessment_routes (
      route_set_id, syllabus_version_id, route_key, display_label,
      qualification_target, pathway_type, progression_eligibility, order_index
    )
    VALUES (
      $1, $2, 'al', 'A Level',
      'a_level', 'full_same_series', 'not_applicable', 0
    )
    RETURNING id
  `, [routeSet.rows[0]!.id, versionId]);
  await client.query(`
    UPDATE assessment_route_sets
    SET lifecycle = 'published', published_at = now()
    WHERE id = $1
  `, [routeSet.rows[0]!.id]);

  const resolved = await client.query<{ assessment_route_id: number }>(
    `SELECT assessment_route_id FROM lockdin_resolve_route_assignment($1, $2, NULL, ARRAY[]::integer[])`,
    [subjectId, versionId],
  );
  if (resolved.rows[0]?.assessment_route_id !== route.rows[0]!.id) {
    throw new Error("single-route auto resolve failed");
  }
}

export async function assertMultiRouteRequiresExplicit(
  client: PoolClient,
): Promise<void> {
  const subject = await client.query<{ id: number }>(`
    INSERT INTO subjects (name, code, color, selectable_for_new_memberships)
    VALUES ('B5BR Multi', 'B5BR2', '#444444', true)
    RETURNING id
  `);
  const subjectId = subject.rows[0]!.id;
  const versionId = await insertPublishedVersion(client, subjectId, "b5br-multi");
  const routeSet = await client.query<{ id: number }>(`
    INSERT INTO assessment_route_sets (
      syllabus_version_id, route_revision_key, lifecycle, manifest_sha256
    )
    VALUES ($1, 'b5br-multi-routes', 'draft', repeat('d', 64))
    RETURNING id
  `, [versionId]);
  await client.query(`
    INSERT INTO assessment_routes (
      route_set_id, syllabus_version_id, route_key, display_label,
      qualification_target, pathway_type, progression_eligibility, order_index
    )
    VALUES
      ($1, $2, 'as', 'AS Level', 'as_level', 'single_series', 'eligible', 0),
      ($1, $2, 'al', 'A Level', 'a_level', 'full_same_series', 'not_applicable', 1)
  `, [routeSet.rows[0]!.id, versionId]);
  await client.query(`
    UPDATE assessment_route_sets
    SET lifecycle = 'published', published_at = now()
    WHERE id = $1
  `, [routeSet.rows[0]!.id]);

  try {
    await client.query("SAVEPOINT b5br_multi_route");
    await client.query(
      `SELECT * FROM lockdin_resolve_route_assignment($1, $2, NULL, ARRAY[]::integer[])`,
      [subjectId, versionId],
    );
    throw new Error("expected assessment_route_required");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "expected assessment_route_required") throw error;
    if (!message.includes("assessment_route_required")) {
      throw new Error(`unexpected error: ${message}`);
    }
    await client.query("ROLLBACK TO SAVEPOINT b5br_multi_route");
  }
}

export async function assertOptionCardinalityRollback(
  client: PoolClient,
): Promise<void> {
  const subject = await client.query<{ id: number }>(`
    INSERT INTO subjects (name, code, color, selectable_for_new_memberships)
    VALUES ('B5BR Opts', 'B5BR3', '#555555', true)
    RETURNING id
  `);
  const subjectId = subject.rows[0]!.id;
  const versionId = await insertPublishedVersion(client, subjectId, "b5br-opts");
  const routeSet = await client.query<{ id: number }>(`
    INSERT INTO assessment_route_sets (
      syllabus_version_id, route_revision_key, lifecycle, manifest_sha256
    )
    VALUES ($1, 'b5br-opts-routes', 'draft', repeat('e', 64))
    RETURNING id
  `, [versionId]);
  const route = await client.query<{ id: number }>(`
    INSERT INTO assessment_routes (
      route_set_id, syllabus_version_id, route_key, display_label,
      qualification_target, pathway_type, progression_eligibility, order_index
    )
    VALUES (
      $1, $2, 'al', 'A Level',
      'a_level', 'full_same_series', 'not_applicable', 0
    )
    RETURNING id
  `, [routeSet.rows[0]!.id, versionId]);
  const group = await client.query<{ id: number }>(`
    INSERT INTO assessment_study_option_groups (
      route_set_id, syllabus_version_id, group_key, display_label,
      min_selections, max_selections, order_index
    )
    VALUES ($1, $2, 'topics', 'Topics', 2, 2, 0)
    RETURNING id
  `, [routeSet.rows[0]!.id, versionId]);
  const options = await client.query<{ id: number }>(`
    INSERT INTO assessment_study_options (
      group_id, route_set_id, syllabus_version_id, option_key, display_label, order_index
    )
    VALUES
      ($1, $2, $3, 'a', 'A', 0),
      ($1, $2, $3, 'b', 'B', 1),
      ($1, $2, $3, 'c', 'C', 2)
    RETURNING id
  `, [group.rows[0]!.id, routeSet.rows[0]!.id, versionId]);
  await client.query(`
    UPDATE assessment_route_sets
    SET lifecycle = 'published', published_at = now()
    WHERE id = $1
  `, [routeSet.rows[0]!.id]);
  const onlyOne = [options.rows[0]!.id];

  try {
    await client.query("SAVEPOINT b5br_opts_card");
    await client.query(
      `SELECT * FROM lockdin_resolve_route_assignment($1, $2, $3, $4::integer[])`,
      [subjectId, versionId, route.rows[0]!.id, onlyOne],
    );
    throw new Error("expected invalid_option_cardinality");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "expected invalid_option_cardinality") throw error;
    if (!message.includes("invalid_option_cardinality")) {
      throw new Error(`unexpected error: ${message}`);
    }
    await client.query("ROLLBACK TO SAVEPOINT b5br_opts_card");
  }
}

export async function proveB5brVisibilityAndRouteContract(
  pool: Pool,
): Promise<void> {
  await assertVisibilityColumnContract(pool);
  await assertRouteAssignmentFunctionsPresent(pool);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertCurrentNineBackfillSql(client);
    await assertFutureInsertDefaultsHidden(client);
    await assertNewMembershipZeroRouteFailClosed(client);
    await assertSingleRouteAutoResolve(client);
    await assertMultiRouteRequiresExplicit(client);
    await assertOptionCardinalityRollback(client);
    // Disposable proof only — never leave fixtures; also avoids 0017 immutability
    // blocking deletes of published route-set rows mid-transaction.
    await client.query("ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
