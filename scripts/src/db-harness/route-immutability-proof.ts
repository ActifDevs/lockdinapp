import type { Pool } from "pg";
import { withTriggerBypassCleanup } from "./trigger-bypass-cleanup.js";

const SUBJECT = "L7IMM01";
const HASH_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HASH_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function constraintOrMessage(error: unknown): string {
  if (error && typeof error === "object" && "constraint" in error) {
    const constraint = String((error as { constraint?: string }).constraint ?? "");
    if (constraint) return constraint;
  }
  return error instanceof Error ? error.message : String(error);
}

async function expectRejected(
  operation: () => Promise<unknown>,
  fragment: string,
  acceptedMessage: string,
): Promise<void> {
  try {
    await operation();
    throw new Error(acceptedMessage);
  } catch (error) {
    if (error instanceof Error && error.message === acceptedMessage) throw error;
    const message = constraintOrMessage(error);
    if (!message.includes(fragment)) {
      throw error instanceof Error ? error : new Error(acceptedMessage);
    }
  }
}

export async function cleanupRouteImmutabilityFixtures(pool: Pool): Promise<void> {
  await withTriggerBypassCleanup(pool, async (client) => {
    await client.query(
      `
      DELETE FROM public.assessment_route_sets
      WHERE syllabus_version_id IN (
        SELECT v.id
        FROM public.syllabus_versions v
        JOIN public.subjects s ON s.id = v.subject_id
        WHERE s.code = $1
      )
      `,
      [SUBJECT],
    );
    await client.query(`DELETE FROM public.subjects WHERE code = $1`, [SUBJECT]);
  });
}

async function seedBase(pool: Pool): Promise<{
  subjectId: number;
  versionId: number;
  componentId: number;
  unitId: number;
}> {
  await cleanupRouteImmutabilityFixtures(pool);

  const subject = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.subjects (code, name, color)
      VALUES ($1, 'Immutability Proof Subject', '#abcdef')
      RETURNING id
      `,
      [SUBJECT],
    )
  ).rows[0]!;

  const version = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.syllabus_versions (
        subject_id, exam_board, qualification, label, is_current,
        source_file, lifecycle, logical_revision_key,
        applicable_from_year, applicable_from_series,
        applicable_to_year, applicable_to_series
      ) VALUES (
        $1, 'Cambridge International', 'AS & A Level', 'Imm v1', true,
        'imm.csv', 'published', 'L7IMM01-r001',
        2027, 'May/June', 2029, 'Oct/Nov'
      )
      RETURNING id
      `,
      [subject.id],
    )
  ).rows[0]!;

  const component = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_components (
        syllabus_version_id, paper_code, level, component_name, total_marks, weighting_percent
      ) VALUES (
        $1, 'L7IMM/1', 'AS Level', 'Paper 1', 50, 50
      )
      RETURNING id
      `,
      [version.id],
    )
  ).rows[0]!;

  const unit = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.syllabus_units (
        subject_id, syllabus_version_id, title, order_index
      ) VALUES ($1, $2, 'Imm Unit', 0)
      RETURNING id
      `,
      [subject.id, version.id],
    )
  ).rows[0]!;

  return {
    subjectId: subject.id,
    versionId: version.id,
    componentId: component.id,
    unitId: unit.id,
  };
}

async function insertDraftSet(
  pool: Pool,
  versionId: number,
  revisionKey: string,
  hash: string | null = HASH_A,
): Promise<number> {
  const row = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_route_sets (
        syllabus_version_id, route_revision_key, lifecycle, manifest_sha256
      ) VALUES ($1, $2, 'draft', $3)
      RETURNING id
      `,
      [versionId, revisionKey, hash],
    )
  ).rows[0]!;
  return row.id;
}

async function publishSet(pool: Pool, routeSetId: number): Promise<void> {
  await pool.query(
    `
    UPDATE public.assessment_route_sets
    SET lifecycle = 'published', published_at = now()
    WHERE id = $1
    `,
    [routeSetId],
  );
}

async function retireSet(pool: Pool, routeSetId: number): Promise<void> {
  await pool.query(
    `
    UPDATE public.assessment_route_sets
    SET lifecycle = 'retired'
    WHERE id = $1
    `,
    [routeSetId],
  );
}

async function insertMinimalGraph(
  pool: Pool,
  routeSetId: number,
  versionId: number,
  componentId: number,
  unitId: number,
): Promise<{
  routeId: number;
  groupId: number;
  optionId: number;
}> {
  const route = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_routes (
        route_set_id, syllabus_version_id, route_key, display_label,
        qualification_target, pathway_type, progression_eligibility, order_index
      ) VALUES (
        $1, $2, 'as_single', 'AS Route',
        'as_level', 'single_series', 'eligible', 0
      )
      RETURNING id
      `,
      [routeSetId, versionId],
    )
  ).rows[0]!;

  await pool.query(
    `
    INSERT INTO public.assessment_route_components (
      route_id, route_set_id, component_id, syllabus_version_id,
      role, qualification_weighting_percent, order_index
    ) VALUES (
      $1, $2, $3, $4, 'current_sitting', '100.0000', 0
    )
    `,
    [route.id, routeSetId, componentId, versionId],
  );

  const group = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_study_option_groups (
        route_set_id, syllabus_version_id, group_key, display_label,
        applicable_qualification_target, applicable_component_id,
        min_selections, max_selections, order_index
      ) VALUES (
        $1, $2, 'opt_group', 'Option Group',
        'both', null, 1, 1, 0
      )
      RETURNING id
      `,
      [routeSetId, versionId],
    )
  ).rows[0]!;

  const option = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_study_options (
        group_id, route_set_id, syllabus_version_id, option_key,
        display_label, description, order_index
      ) VALUES (
        $1, $2, $3, 'opt_a', 'Option A', null, 0
      )
      RETURNING id
      `,
      [group.id, routeSetId, versionId],
    )
  ).rows[0]!;

  await pool.query(
    `
    INSERT INTO public.assessment_study_option_units (
      option_id, unit_id, syllabus_version_id
    ) VALUES ($1, $2, $3)
    `,
    [option.id, unitId, versionId],
  );

  await pool.query(
    `
    INSERT INTO public.assessment_study_option_year_mappings (
      option_id, syllabus_version_id, exam_year, component_id, unit_id, assessment_role
    ) VALUES ($1, $2, 2027, $3, $4, 'source_paper')
    `,
    [option.id, versionId, componentId, unitId],
  );

  return { routeId: route.id, groupId: group.id, optionId: option.id };
}

/**
 * Local DB proof for migration 0017 route-reference immutability.
 */
export async function proveRouteReferenceImmutability(pool: Pool): Promise<void> {
  const { subjectId, versionId, componentId, unitId } = await seedBase(pool);

  // -------------------------------------------------------------------------
  // Route revision identity (0016 UNIQUE syllabus_version_id, route_revision_key)
  // -------------------------------------------------------------------------
  const constraintCheck = await pool.query<{ present: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'assessment_route_sets'
        AND c.conname = 'assessment_route_sets_version_revision_unique'
        AND c.contype = 'u'
    ) AS present
    `,
  );
  if (!constraintCheck.rows[0]?.present) {
    throw new Error(
      "[imm] assessment_route_sets_version_revision_unique constraint missing",
    );
  }

  const versionB = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.syllabus_versions (
        subject_id, exam_board, qualification, label, is_current,
        source_file, lifecycle, logical_revision_key
      ) VALUES (
        $1, 'Cambridge International', 'AS & A Level', 'Imm v2', false,
        'imm-b.csv', 'draft', 'L7IMM01-r002'
      )
      RETURNING id
      `,
      [subjectId],
    )
  ).rows[0]!;

  await insertDraftSet(pool, versionId, "routes-identity-r001");
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_route_sets (
          syllabus_version_id, route_revision_key, lifecycle
        ) VALUES ($1, 'routes-identity-r001', 'draft')
        `,
        [versionId],
      ),
    "assessment_route_sets_version_revision_unique",
    "[imm] Duplicate route_revision_key on same syllabus version was accepted",
  );

  // Same key on a different syllabus version is allowed
  await insertDraftSet(pool, versionB.id, "routes-identity-r001", HASH_B);
  // Different key on the same syllabus version is allowed
  await insertDraftSet(pool, versionId, "routes-identity-r002", HASH_B);

  await pool.query(
    `DELETE FROM public.assessment_route_sets WHERE route_revision_key LIKE 'routes-identity-%'`,
  );
  await pool.query(`DELETE FROM public.syllabus_versions WHERE id = $1`, [
    versionB.id,
  ]);

  // A. Route-set INSERT
  const draftId = await insertDraftSet(pool, versionId, "routes-imm-v1");
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_route_sets (
          syllabus_version_id, route_revision_key, lifecycle, manifest_sha256, published_at
        ) VALUES ($1, 'routes-imm-direct-pub', 'published', $2, now())
        `,
        [versionId, HASH_B],
      ),
    "published/retired route-reference contract is immutable",
    "[imm] Direct published insert accepted",
  );
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_route_sets (
          syllabus_version_id, route_revision_key, lifecycle
        ) VALUES ($1, 'routes-imm-direct-ret', 'retired')
        `,
        [versionId],
      ),
    "published/retired route-reference contract is immutable",
    "[imm] Direct retired insert accepted",
  );

  // Child inserts while draft
  const graph = await insertMinimalGraph(
    pool,
    draftId,
    versionId,
    componentId,
    unitId,
  );

  // Draft child update/delete allowed
  await pool.query(
    `UPDATE public.assessment_routes SET display_label = 'AS Route Draft' WHERE id = $1`,
    [graph.routeId],
  );

  // B. Lifecycle transitions
  await expectRejected(
    () =>
      pool.query(
        `UPDATE public.assessment_route_sets SET lifecycle = 'retired' WHERE id = $1`,
        [draftId],
      ),
    "draft cannot transition directly to retired",
    "[imm] draft→retired accepted",
  );

  await publishSet(pool, draftId);

  await expectRejected(
    () =>
      pool.query(
        `UPDATE public.assessment_route_sets SET lifecycle = 'draft' WHERE id = $1`,
        [draftId],
      ),
    "published/retired route-reference contract is immutable",
    "[imm] published→draft accepted",
  );

  await expectRejected(
    () =>
      pool.query(
        `
        UPDATE public.assessment_route_sets
        SET route_revision_key = 'routes-imm-mutated'
        WHERE id = $1
        `,
        [draftId],
      ),
    "published/retired route-reference contract is immutable",
    "[imm] published semantic mutation accepted",
  );

  await expectRejected(
    () =>
      pool.query(
        `
        UPDATE public.assessment_route_sets
        SET lifecycle = 'retired', route_revision_key = 'changed'
        WHERE id = $1
        `,
        [draftId],
      ),
    "published→retired may only change lifecycle",
    "[imm] published→retired with semantic mutation accepted",
  );

  // C/D/E. Child mutations against published ownership
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_routes (
          route_set_id, syllabus_version_id, route_key, display_label,
          qualification_target, pathway_type, progression_eligibility, order_index
        ) VALUES (
          $1, $2, 'extra_route', 'Extra', 'as_level', 'single_series', 'eligible', 1
        )
        `,
        [draftId, versionId],
      ),
    "route-reference child rows may only be mutated while owning route set is draft",
    "[imm] insert route into published accepted",
  );

  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_route_components (
          route_id, route_set_id, component_id, syllabus_version_id,
          role, qualification_weighting_percent, order_index
        ) VALUES ($1, $2, $3, $4, 'current_sitting', '50.0000', 1)
        `,
        [graph.routeId, draftId, componentId, versionId],
      ),
    "route-reference child rows may only be mutated while owning route set is draft",
    "[imm] insert component into published accepted",
  );

  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_option_groups (
          route_set_id, syllabus_version_id, group_key, display_label,
          applicable_qualification_target, min_selections, max_selections, order_index
        ) VALUES ($1, $2, 'extra_group', 'Extra', 'both', 1, 1, 1)
        `,
        [draftId, versionId],
      ),
    "route-reference child rows may only be mutated while owning route set is draft",
    "[imm] insert option group into published accepted",
  );

  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_options (
          group_id, route_set_id, syllabus_version_id, option_key,
          display_label, order_index
        ) VALUES ($1, $2, $3, 'extra_opt', 'Extra', 1)
        `,
        [graph.groupId, draftId, versionId],
      ),
    "route-reference child rows may only be mutated while owning route set is draft",
    "[imm] insert option into published accepted",
  );

  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_option_units (
          option_id, unit_id, syllabus_version_id
        ) VALUES ($1, $2, $3)
        `,
        [graph.optionId, unitId, versionId],
      ),
    "route-reference child rows may only be mutated while owning route set is draft",
    "[imm] insert option-unit into published accepted",
  );

  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_option_year_mappings (
          option_id, syllabus_version_id, exam_year, component_id, unit_id, assessment_role
        ) VALUES ($1, $2, 2028, $3, $4, 'source_paper')
        `,
        [graph.optionId, versionId, componentId, unitId],
      ),
    "route-reference child rows may only be mutated while owning route set is draft",
    "[imm] insert year mapping into published accepted",
  );

  await expectRejected(
    () =>
      pool.query(
        `UPDATE public.assessment_routes SET display_label = 'Hacked' WHERE id = $1`,
        [graph.routeId],
      ),
    "route-reference child rows may only be mutated while owning route set is draft",
    "[imm] update published child accepted",
  );

  await expectRejected(
    () =>
      pool.query(`DELETE FROM public.assessment_routes WHERE id = $1`, [graph.routeId]),
    "route-reference child rows may only be mutated while owning route set is draft",
    "[imm] delete published child accepted",
  );

  await expectRejected(
    () =>
      pool.query(`DELETE FROM public.assessment_route_sets WHERE id = $1`, [draftId]),
    "published/retired route-reference contract is immutable",
    "[imm] delete published route set accepted",
  );

  // Legal published → retired
  await retireSet(pool, draftId);

  await expectRejected(
    () =>
      pool.query(
        `UPDATE public.assessment_route_sets SET lifecycle = 'published' WHERE id = $1`,
        [draftId],
      ),
    "published/retired route-reference contract is immutable",
    "[imm] retired→published accepted",
  );

  await expectRejected(
    () =>
      pool.query(
        `UPDATE public.assessment_route_sets SET lifecycle = 'draft' WHERE id = $1`,
        [draftId],
      ),
    "published/retired route-reference contract is immutable",
    "[imm] retired→draft accepted",
  );

  await expectRejected(
    () =>
      pool.query(
        `UPDATE public.assessment_routes SET display_label = 'Retired hack' WHERE id = $1`,
        [graph.routeId],
      ),
    "route-reference child rows may only be mutated while owning route set is draft",
    "[imm] update retired child accepted",
  );

  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_routes (
          route_set_id, syllabus_version_id, route_key, display_label,
          qualification_target, pathway_type, progression_eligibility, order_index
        ) VALUES (
          $1, $2, 'retired_extra', 'Extra', 'as_level', 'single_series', 'eligible', 2
        )
        `,
        [draftId, versionId],
      ),
    "route-reference child rows may only be mutated while owning route set is draft",
    "[imm] insert into retired accepted",
  );

  await expectRejected(
    () =>
      pool.query(`DELETE FROM public.assessment_route_sets WHERE id = $1`, [draftId]),
    "published/retired route-reference contract is immutable",
    "[imm] delete retired route set accepted",
  );

  // Cross-owner move protection: draft set + published/retired set
  const draft2 = await insertDraftSet(pool, versionId, "routes-imm-v2", HASH_B);
  const draftRoute = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_routes (
        route_set_id, syllabus_version_id, route_key, display_label,
        qualification_target, pathway_type, progression_eligibility, order_index
      ) VALUES (
        $1, $2, 'draft_only', 'Draft Only',
        'as_level', 'single_series', 'eligible', 0
      )
      RETURNING id
      `,
      [draft2, versionId],
    )
  ).rows[0]!;

  await expectRejected(
    () =>
      pool.query(
        `
        UPDATE public.assessment_routes
        SET route_set_id = $1
        WHERE id = $2
        `,
        [draftId, draftRoute.id],
      ),
    "route-reference child rows may only be mutated while owning route set is draft",
    "[imm] move child draft→retired accepted",
  );

  // Draft delete allowed
  await pool.query(`DELETE FROM public.assessment_routes WHERE id = $1`, [
    draftRoute.id,
  ]);
  await pool.query(`DELETE FROM public.assessment_route_sets WHERE id = $1`, [
    draft2,
  ]);

  await cleanupRouteImmutabilityFixtures(pool);
}
