import type { Pool } from "pg";

const SUBJECT_A = "L7A101";
const SUBJECT_B = "L7A102";
const USER_1_ID = "77777777-7777-4777-8777-777777777771";
const USER_2_ID = "77777777-7777-4777-8777-777777777772";

function constraintName(error: unknown): string {
  if (error && typeof error === "object" && "constraint" in error) {
    return String((error as { constraint?: string }).constraint ?? "");
  }
  return error instanceof Error ? error.message : String(error);
}

function assertMessage(error: unknown, fragment: string, accepted: string): void {
  const message = error instanceof Error ? error.message : String(error);
  const constraint = constraintName(error);
  if (message.includes(fragment) || constraint.includes(fragment)) return;
  throw error instanceof Error ? error : new Error(accepted);
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
    assertMessage(error, fragment, acceptedMessage);
  }
}

async function insertAuthUser(pool: Pool, id: string, email: string): Promise<void> {
  await pool.query(
    `
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      $1::uuid,
      'authenticated',
      'authenticated',
      $2,
      crypt('slice-a1-proof', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    ON CONFLICT (id) DO NOTHING
    `,
    [id, email],
  );

  await pool.query(
    `
    INSERT INTO public.profiles (id, full_name, username)
    VALUES ($1::uuid, $2, $3)
    ON CONFLICT (id) DO NOTHING
    `,
    [id, `User ${email}`, `user_${id.slice(0, 8)}`],
  );
}

export async function cleanupRouteSchemaFixtures(pool: Pool): Promise<void> {
  await pool.query(`DELETE FROM public.user_subject_option_selections WHERE user_id = ANY($1::uuid[])`, [
    [USER_1_ID, USER_2_ID],
  ]);
  await pool.query(`DELETE FROM public.user_subjects WHERE user_id = ANY($1::uuid[])`, [
    [USER_1_ID, USER_2_ID],
  ]);
  await pool.query(`DELETE FROM public.profiles WHERE id = ANY($1::uuid[])`, [
    [USER_1_ID, USER_2_ID],
  ]);
  await pool.query(`DELETE FROM auth.users WHERE id = ANY($1::uuid[])`, [
    [USER_1_ID, USER_2_ID],
  ]);
  await pool.query(
    `
    DELETE FROM public.assessment_route_sets
    WHERE syllabus_version_id IN (
      SELECT v.id
      FROM public.syllabus_versions v
      JOIN public.subjects s ON s.id = v.subject_id
      WHERE s.code = ANY($1::text[])
    )
    `,
    [[SUBJECT_A, SUBJECT_B]],
  );
  await pool.query(`DELETE FROM public.subjects WHERE code = ANY($1::text[])`, [
    [SUBJECT_A, SUBJECT_B],
  ]);
}

export async function proveRouteSchemaFoundation(pool: Pool): Promise<void> {
  await cleanupRouteSchemaFixtures(pool);

  await insertAuthUser(pool, USER_1_ID, "user1_slice_a1@example.com");
  await insertAuthUser(pool, USER_2_ID, "user2_slice_a1@example.com");

  // Create two fixture subjects
  const subjectsRes = await pool.query<{ id: number; code: string }>(
    `
    INSERT INTO public.subjects (code, name, color)
    VALUES
      ($1, 'Slice A1 Subject A', '#112233'),
      ($2, 'Slice A1 Subject B', '#445566')
    RETURNING id, code
    `,
    [SUBJECT_A, SUBJECT_B],
  );
  const subjectA = subjectsRes.rows.find((r) => r.code === SUBJECT_A)!;
  const subjectB = subjectsRes.rows.find((r) => r.code === SUBJECT_B)!;

  // Create syllabus versions:
  // Version A1 (Subject A, v1)
  // Version A2 (Subject A, v2)
  // Version B1 (Subject B, v1)
  const versionsRes = await pool.query<{ id: number; label: string; subject_id: number }>(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file, lifecycle, logical_revision_key
    ) VALUES
      ($1, 'Cambridge International', 'AS & A Level', 'Version A1', true, 'a1.csv', 'published', 'A1-r001'),
      ($1, 'Cambridge International', 'AS & A Level', 'Version A2', false, 'a2.csv', 'draft', 'A1-r002'),
      ($2, 'Cambridge International', 'AS & A Level', 'Version B1', true, 'b1.csv', 'published', 'B1-r001')
    RETURNING id, label, subject_id
    `,
    [subjectA.id, subjectB.id],
  );
  const versionA1 = versionsRes.rows.find((r) => r.label === "Version A1")!;
  const versionA2 = versionsRes.rows.find((r) => r.label === "Version A2")!;
  const versionB1 = versionsRes.rows.find((r) => r.label === "Version B1")!;

  // Create assessment components for versions
  const compA1_P1 = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_components (
        syllabus_version_id, paper_code, level, component_name, total_marks, weighting_percent
      ) VALUES ($1, 'A1/1', 'AS Level', 'Paper 1', 40, 40)
      RETURNING id
      `,
      [versionA1.id],
    )
  ).rows[0]!;

  const compA1_P2 = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_components (
        syllabus_version_id, paper_code, level, component_name, total_marks, weighting_percent
      ) VALUES ($1, 'A1/2', 'AS Level', 'Paper 2', 60, 60)
      RETURNING id
      `,
      [versionA1.id],
    )
  ).rows[0]!;

  const compA2_P1 = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_components (
        syllabus_version_id, paper_code, level, component_name, total_marks, weighting_percent
      ) VALUES ($1, 'A2/1', 'AS Level', 'Paper 1 v2', 40, 40)
      RETURNING id
      `,
      [versionA2.id],
    )
  ).rows[0]!;

  // Create syllabus units
  const unitA1_U1 = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.syllabus_units (
        subject_id, syllabus_version_id, title, order_index
      ) VALUES ($1, $2, 'Unit A1 One', 0)
      RETURNING id
      `,
      [subjectA.id, versionA1.id],
    )
  ).rows[0]!;

  const unitA1_U2 = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.syllabus_units (
        subject_id, syllabus_version_id, title, order_index
      ) VALUES ($1, $2, 'Unit A1 Two', 1)
      RETURNING id
      `,
      [subjectA.id, versionA1.id],
    )
  ).rows[0]!;

  const unitA2_U1 = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.syllabus_units (
        subject_id, syllabus_version_id, title, order_index
      ) VALUES ($1, $2, 'Unit A2 One', 0)
      RETURNING id
      `,
      [subjectA.id, versionA2.id],
    )
  ).rows[0]!;

  // =========================================================================
  // 1. ROUTE SETS & PUBLICATION LIFECYCLE
  // =========================================================================
  const routeSetA1_1 = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_route_sets (
        syllabus_version_id, route_revision_key, lifecycle, manifest_sha256, published_at
      ) VALUES (
        $1, 'routes-a1-v1', 'published',
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        now()
      )
      RETURNING id
      `,
      [versionA1.id],
    )
  ).rows[0]!;

  const routeSetA2_1 = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_route_sets (
        syllabus_version_id, route_revision_key, lifecycle
      ) VALUES ($1, 'routes-a2-v1', 'draft')
      RETURNING id
      `,
      [versionA2.id],
    )
  ).rows[0]!;

  // B. Uniqueness: At most one PUBLISHED route set per syllabus version
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_route_sets (
          syllabus_version_id, route_revision_key, lifecycle, manifest_sha256, published_at
        ) VALUES (
          $1, 'routes-a1-v2', 'published',
          'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
          now()
        )
        `,
        [versionA1.id],
      ),
    "assessment_route_sets_one_published_per_version",
    "[db-integrity] Second published route set was accepted for the same syllabus version.",
  );

  // Non-empty route revision key constraint
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_route_sets (
          syllabus_version_id, route_revision_key, lifecycle
        ) VALUES ($1, '', 'draft')
        `,
        [versionA1.id],
      ),
    "assessment_route_sets_non_empty_revision_key",
    "[db-integrity] Empty route revision key was accepted.",
  );

  // Published lifecycle requires published_at and manifest_sha256
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_route_sets (
          syllabus_version_id, route_revision_key, lifecycle
        ) VALUES ($1, 'routes-draft-to-pub', 'published')
        `,
        [versionA2.id],
      ),
    "assessment_route_sets_published_contract",
    "[db-integrity] Published route set without manifest hash or timestamp was accepted.",
  );

  // =========================================================================
  // 2. ASSESSMENT ROUTES
  // =========================================================================
  // A. Version Integrity: Route cannot point to wrong version vs route set
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_routes (
          route_set_id, syllabus_version_id, route_key, display_label,
          qualification_target, pathway_type, progression_eligibility, order_index
        ) VALUES (
          $1, $2, 'wrong_version_route', 'Wrong Version Route',
          'as_level', 'single_series', 'eligible', 0
        )
        `,
        [routeSetA1_1.id, versionA2.id],
      ),
    "assessment_routes_route_set_version_fk",
    "[db-integrity] Route pointing to wrong syllabus version was accepted.",
  );

  // Insert valid Route 1 in Route Set A1
  const routeA1_1 = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_routes (
        route_set_id, syllabus_version_id, route_key, display_label,
        qualification_target, pathway_type, progression_eligibility, order_index
      ) VALUES (
        $1, $2, 'as_single_series', 'AS Level Route',
        'as_level', 'single_series', 'eligible', 0
      )
      RETURNING id
      `,
      [routeSetA1_1.id, versionA1.id],
    )
  ).rows[0]!;

  // B. Uniqueness: Duplicate route_key within route set rejected
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_routes (
          route_set_id, syllabus_version_id, route_key, display_label,
          qualification_target, pathway_type, progression_eligibility, order_index
        ) VALUES (
          $1, $2, 'as_single_series', 'Duplicate AS Level Route',
          'as_level', 'single_series', 'eligible', 1
        )
        `,
        [routeSetA1_1.id, versionA1.id],
      ),
    "assessment_routes_route_set_key_unique",
    "[db-integrity] Duplicate route_key within route set was accepted.",
  );

  // Non-empty route key and non-negative order_index
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_routes (
          route_set_id, syllabus_version_id, route_key, display_label,
          qualification_target, pathway_type, progression_eligibility, order_index
        ) VALUES (
          $1, $2, '', 'Empty key', 'as_level', 'single_series', 'eligible', 0
        )
        `,
        [routeSetA1_1.id, versionA1.id],
      ),
    "assessment_routes_non_empty_route_key",
    "[db-integrity] Empty route key was accepted.",
  );

  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_routes (
          route_set_id, syllabus_version_id, route_key, display_label,
          qualification_target, pathway_type, progression_eligibility, order_index
        ) VALUES (
          $1, $2, 'neg_order', 'Neg order', 'as_level', 'single_series', 'eligible', -1
        )
        `,
        [routeSetA1_1.id, versionA1.id],
      ),
    "assessment_routes_order_index_nonnegative",
    "[db-integrity] Negative order index was accepted.",
  );

  // =========================================================================
  // 3. ROUTE COMPONENTS & EXACT NUMERIC WEIGHTING
  // =========================================================================
  // A. Version Integrity: Route component cannot point to wrong-version component
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_route_components (
          route_id, route_set_id, component_id, syllabus_version_id,
          role, qualification_weighting_percent, order_index
        ) VALUES (
          $1, $2, $3, $4,
          'current_sitting', '40.0000', 0
        )
        `,
        [routeA1_1.id, routeSetA1_1.id, compA2_P1.id, versionA1.id],
      ),
    "assessment_route_components_component_fk",
    "[db-integrity] Route component pointing to wrong-version component was accepted.",
  );

  // C. Weighting: Range checks (zero, negative, >100)
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_route_components (
          route_id, route_set_id, component_id, syllabus_version_id,
          role, qualification_weighting_percent, order_index
        ) VALUES (
          $1, $2, $3, $4,
          'current_sitting', '0.0000', 0
        )
        `,
        [routeA1_1.id, routeSetA1_1.id, compA1_P1.id, versionA1.id],
      ),
    "assessment_route_components_weighting_range",
    "[db-integrity] Zero weighting percent was accepted.",
  );

  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_route_components (
          route_id, route_set_id, component_id, syllabus_version_id,
          role, qualification_weighting_percent, order_index
        ) VALUES (
          $1, $2, $3, $4,
          'current_sitting', '-10.0000', 0
        )
        `,
        [routeA1_1.id, routeSetA1_1.id, compA1_P1.id, versionA1.id],
      ),
    "assessment_route_components_weighting_range",
    "[db-integrity] Negative weighting percent was accepted.",
  );

  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_route_components (
          route_id, route_set_id, component_id, syllabus_version_id,
          role, qualification_weighting_percent, order_index
        ) VALUES (
          $1, $2, $3, $4,
          'current_sitting', '100.0001', 0
        )
        `,
        [routeA1_1.id, routeSetA1_1.id, compA1_P1.id, versionA1.id],
      ),
    "assessment_route_components_weighting_range",
    "[db-integrity] Weighting > 100.0000 was accepted.",
  );

  // Insert valid component 1 with exact decimal 15.5000
  await pool.query(
    `
    INSERT INTO public.assessment_route_components (
      route_id, route_set_id, component_id, syllabus_version_id,
      role, qualification_weighting_percent, order_index
    ) VALUES (
      $1, $2, $3, $4,
      'current_sitting', '15.5000', 0
    )
    `,
    [routeA1_1.id, routeSetA1_1.id, compA1_P1.id, versionA1.id],
  );

  // Verify exact decimal storage
  const weightCheck = await pool.query<{ qualification_weighting_percent: string }>(
    `
    SELECT qualification_weighting_percent
    FROM public.assessment_route_components
    WHERE route_id = $1 AND component_id = $2
    `,
    [routeA1_1.id, compA1_P1.id],
  );
  if (weightCheck.rows[0]?.qualification_weighting_percent !== "15.5000") {
    throw new Error(
      `[db-integrity] Weighting precision drift: expected '15.5000', got '${weightCheck.rows[0]?.qualification_weighting_percent}'`,
    );
  }

  // B. Uniqueness: Duplicate component in same route rejected
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_route_components (
          route_id, route_set_id, component_id, syllabus_version_id,
          role, qualification_weighting_percent, order_index
        ) VALUES (
          $1, $2, $3, $4,
          'current_sitting', '84.5000', 1
        )
        `,
        [routeA1_1.id, routeSetA1_1.id, compA1_P1.id, versionA1.id],
      ),
    "assessment_route_components_pk",
    "[db-integrity] Duplicate component in route was accepted.",
  );

  // B. Uniqueness: Duplicate order_index in same route rejected
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_route_components (
          route_id, route_set_id, component_id, syllabus_version_id,
          role, qualification_weighting_percent, order_index
        ) VALUES (
          $1, $2, $3, $4,
          'current_sitting', '84.5000', 0
        )
        `,
        [routeA1_1.id, routeSetA1_1.id, compA1_P2.id, versionA1.id],
      ),
    "assessment_route_components_route_order_unique",
    "[db-integrity] Duplicate order index in route was accepted.",
  );

  // Insert valid component 2
  await pool.query(
    `
    INSERT INTO public.assessment_route_components (
      route_id, route_set_id, component_id, syllabus_version_id,
      role, qualification_weighting_percent, order_index
    ) VALUES (
      $1, $2, $3, $4,
      'current_sitting', '84.5000', 1
    )
    `,
    [routeA1_1.id, routeSetA1_1.id, compA1_P2.id, versionA1.id],
  );

  // =========================================================================
  // 4. STUDY OPTION GROUPS & STUDY OPTIONS (incl. cardinality metadata)
  // =========================================================================
  // A. Version Integrity: Option group cannot point to wrong-version component
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_option_groups (
          route_set_id, syllabus_version_id, group_key, display_label,
          applicable_qualification_target, applicable_component_id,
          min_selections, max_selections, order_index
        ) VALUES (
          $1, $2, 'wrong_comp_group', 'Wrong Comp Group',
          'both', $3, 1, 1, 0
        )
        `,
        [routeSetA1_1.id, versionA1.id, compA2_P1.id],
      ),
    "assessment_study_option_groups_component_fk",
    "[db-integrity] Option group pointing to wrong-version component was accepted.",
  );

  // Cardinality schema: valid 1/1, 2/2, 2/3 representations
  await pool.query(
    `
    INSERT INTO public.assessment_study_option_groups (
      route_set_id, syllabus_version_id, group_key, display_label,
      applicable_qualification_target, applicable_component_id,
      min_selections, max_selections, order_index
    ) VALUES (
      $1, $2, 'cardinality_1_of_n', '1-of-N Example',
      'both', null, 1, 1, 10
    )
    `,
    [routeSetA1_1.id, versionA1.id],
  );

  await pool.query(
    `
    INSERT INTO public.assessment_study_option_groups (
      route_set_id, syllabus_version_id, group_key, display_label,
      applicable_qualification_target, applicable_component_id,
      min_selections, max_selections, order_index
    ) VALUES (
      $1, $2, 'cardinality_2_of_4', 'Exactly 2-of-4 Example',
      'both', null, 2, 2, 11
    )
    `,
    [routeSetA1_1.id, versionA1.id],
  );

  await pool.query(
    `
    INSERT INTO public.assessment_study_option_groups (
      route_set_id, syllabus_version_id, group_key, display_label,
      applicable_qualification_target, applicable_component_id,
      min_selections, max_selections, order_index
    ) VALUES (
      $1, $2, 'cardinality_at_least_2_of_3', 'At-least-2-of-3 Example',
      'both', null, 2, 3, 12
    )
    `,
    [routeSetA1_1.id, versionA1.id],
  );

  // Cardinality schema: reject min = 0
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_option_groups (
          route_set_id, syllabus_version_id, group_key, display_label,
          applicable_qualification_target, min_selections, max_selections, order_index
        ) VALUES (
          $1, $2, 'bad_min_zero', 'Bad Min Zero', 'both', 0, 1, 13
        )
        `,
        [routeSetA1_1.id, versionA1.id],
      ),
    "assessment_study_option_groups_min_selections_positive",
    "[db-integrity] min_selections = 0 was accepted.",
  );

  // Cardinality schema: reject min < 0
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_option_groups (
          route_set_id, syllabus_version_id, group_key, display_label,
          applicable_qualification_target, min_selections, max_selections, order_index
        ) VALUES (
          $1, $2, 'bad_min_neg', 'Bad Min Neg', 'both', -1, 1, 14
        )
        `,
        [routeSetA1_1.id, versionA1.id],
      ),
    "assessment_study_option_groups_min_selections_positive",
    "[db-integrity] min_selections < 0 was accepted.",
  );

  // Cardinality schema: reject max < min
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_option_groups (
          route_set_id, syllabus_version_id, group_key, display_label,
          applicable_qualification_target, min_selections, max_selections, order_index
        ) VALUES (
          $1, $2, 'bad_max_lt_min', 'Bad Max < Min', 'both', 3, 2, 15
        )
        `,
        [routeSetA1_1.id, versionA1.id],
      ),
    "assessment_study_option_groups_max_gte_min",
    "[db-integrity] max_selections < min_selections was accepted.",
  );

  // Cardinality schema: reject null min
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_option_groups (
          route_set_id, syllabus_version_id, group_key, display_label,
          applicable_qualification_target, min_selections, max_selections, order_index
        ) VALUES (
          $1, $2, 'bad_null_min', 'Bad Null Min', 'both', NULL, 1, 16
        )
        `,
        [routeSetA1_1.id, versionA1.id],
      ),
    "null value in column \"min_selections\"",
    "[db-integrity] null min_selections was accepted.",
  );

  // Cardinality schema: reject null max
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_option_groups (
          route_set_id, syllabus_version_id, group_key, display_label,
          applicable_qualification_target, min_selections, max_selections, order_index
        ) VALUES (
          $1, $2, 'bad_null_max', 'Bad Null Max', 'both', 1, NULL, 17
        )
        `,
        [routeSetA1_1.id, versionA1.id],
      ),
    "null value in column \"max_selections\"",
    "[db-integrity] null max_selections was accepted.",
  );

  // Insert valid option group (History-compatible 1/1)
  const groupA1_1 = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_study_option_groups (
        route_set_id, syllabus_version_id, group_key, display_label,
        applicable_qualification_target, applicable_component_id,
        min_selections, max_selections, order_index
      ) VALUES (
        $1, $2, 'as_history_option', 'AS History Option',
        'both', $3, 1, 1, 0
      )
      RETURNING id
      `,
      [routeSetA1_1.id, versionA1.id, compA1_P1.id],
    )
  ).rows[0]!;

  // Multi-select group for selection coexistence proofs (exactly 2 of N)
  const groupA1_multi = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_study_option_groups (
        route_set_id, syllabus_version_id, group_key, display_label,
        applicable_qualification_target, applicable_component_id,
        min_selections, max_selections, order_index
      ) VALUES (
        $1, $2, 'paper_3_options', 'Paper 3 Options',
        'a_level', $3, 2, 2, 1
      )
      RETURNING id
      `,
      [routeSetA1_1.id, versionA1.id, compA1_P2.id],
    )
  ).rows[0]!;

  // B. Uniqueness: Duplicate group_key in route set rejected
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_option_groups (
          route_set_id, syllabus_version_id, group_key, display_label,
          applicable_qualification_target, applicable_component_id,
          min_selections, max_selections, order_index
        ) VALUES (
          $1, $2, 'as_history_option', 'Duplicate Group',
          'both', null, 1, 1, 2
        )
        `,
        [routeSetA1_1.id, versionA1.id],
      ),
    "assessment_study_option_groups_route_set_key_unique",
    "[db-integrity] Duplicate group_key in route set was accepted.",
  );

  // A. Version Integrity: Option cannot cross group/version
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_options (
          group_id, route_set_id, syllabus_version_id, option_key,
          display_label, order_index
        ) VALUES (
          $1, $2, $3, 'cross_ver_opt',
          'Cross Version Option', 0
        )
        `,
        [groupA1_1.id, routeSetA1_1.id, versionA2.id],
      ),
    "assessment_study_options_group_fk",
    "[db-integrity] Study option crossing version was accepted.",
  );

  // Insert valid option 1 (single-select group)
  const optionA1_1 = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_study_options (
        group_id, route_set_id, syllabus_version_id, option_key,
        display_label, order_index
      ) VALUES (
        $1, $2, $3, 'modern_europe',
        'Modern Europe 1774-1924', 0
      )
      RETURNING id
      `,
      [groupA1_1.id, routeSetA1_1.id, versionA1.id],
    )
  ).rows[0]!;

  // Insert multi-select options A and B in the same group
  const optionMultiA = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_study_options (
        group_id, route_set_id, syllabus_version_id, option_key,
        display_label, order_index
      ) VALUES (
        $1, $2, $3, 'option_a',
        'Option A', 0
      )
      RETURNING id
      `,
      [groupA1_multi.id, routeSetA1_1.id, versionA1.id],
    )
  ).rows[0]!;

  const optionMultiB = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_study_options (
        group_id, route_set_id, syllabus_version_id, option_key,
        display_label, order_index
      ) VALUES (
        $1, $2, $3, 'option_b',
        'Option B', 1
      )
      RETURNING id
      `,
      [groupA1_multi.id, routeSetA1_1.id, versionA1.id],
    )
  ).rows[0]!;

  // B. Uniqueness: Duplicate option_key in same group rejected
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_options (
          group_id, route_set_id, syllabus_version_id, option_key,
          display_label, order_index
        ) VALUES (
          $1, $2, $3, 'modern_europe',
          'Duplicate Modern Europe', 1
        )
        `,
        [groupA1_1.id, routeSetA1_1.id, versionA1.id],
      ),
    "assessment_study_options_group_key_unique",
    "[db-integrity] Duplicate option_key in group was accepted.",
  );

  // =========================================================================
  // 5. STUDY OPTION UNITS & YEAR MAPPINGS
  // =========================================================================
  // A. Version Integrity: Option-unit cannot cross version
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_option_units (
          option_id, unit_id, syllabus_version_id
        ) VALUES ($1, $2, $3)
        `,
        [optionA1_1.id, unitA2_U1.id, versionA1.id],
      ),
    "assessment_study_option_units_unit_fk",
    "[db-integrity] Option-unit link crossing version was accepted.",
  );

  // Insert valid option-unit links
  await pool.query(
    `
    INSERT INTO public.assessment_study_option_units (
      option_id, unit_id, syllabus_version_id
    ) VALUES ($1, $2, $3)
    `,
    [optionA1_1.id, unitA1_U1.id, versionA1.id],
  );

  // B. Uniqueness: Duplicate option-unit rejected
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_option_units (
          option_id, unit_id, syllabus_version_id
        ) VALUES ($1, $2, $3)
        `,
        [optionA1_1.id, unitA1_U1.id, versionA1.id],
      ),
    "assessment_study_option_units_pk",
    "[db-integrity] Duplicate option-unit link was accepted.",
  );

  // D. Year Mapping: Mapped unit MUST belong to mapped option
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_option_year_mappings (
          option_id, syllabus_version_id, exam_year, component_id, unit_id, assessment_role
        ) VALUES (
          $1, $2, 2027, $3, $4, 'source_paper'
        )
        `,
        [optionA1_1.id, versionA1.id, compA1_P1.id, unitA1_U2.id], // unitA1_U2 not linked to option
      ),
    "assessment_study_option_year_mappings_option_unit_version_fk",
    "[db-integrity] Year mapping for unlinked unit was accepted.",
  );

  // Insert valid year mapping
  await pool.query(
    `
    INSERT INTO public.assessment_study_option_year_mappings (
      option_id, syllabus_version_id, exam_year, component_id, unit_id, assessment_role
    ) VALUES (
      $1, $2, 2027, $3, $4, 'source_paper'
    )
    `,
    [optionA1_1.id, versionA1.id, compA1_P1.id, unitA1_U1.id],
  );

  // B/D. Uniqueness: Conflicting logical mapping rejected (same option, exam_year, unit_id)
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.assessment_study_option_year_mappings (
          option_id, syllabus_version_id, exam_year, component_id, unit_id, assessment_role
        ) VALUES (
          $1, $2, 2027, $3, $4, 'outline_paper'
        )
        `,
        [optionA1_1.id, versionA1.id, compA1_P2.id, unitA1_U1.id],
      ),
    "assessment_study_option_year_mappings_logical_unique",
    "[db-integrity] Conflicting year mapping for same option/year/unit was accepted.",
  );

  // =========================================================================
  // 6. USER MEMBERSHIP ALTERATION & USER OPTION SELECTIONS
  // =========================================================================
  // F. Legacy Compatibility: Insert membership with NULL assessment_route_id
  await pool.query(
    `
    INSERT INTO public.user_subjects (
      user_id, subject_id, syllabus_version_id, assessment_route_id,
      intended_exam_year, intended_exam_series
    ) VALUES (
      $1::uuid, $2, $3, NULL, 2027, 'May/June'
    )
    `,
    [USER_1_ID, subjectA.id, versionA1.id],
  );

  const legacyMemCheck = await pool.query<{ assessment_route_id: number | null }>(
    `
    SELECT assessment_route_id
    FROM public.user_subjects
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_1_ID, subjectA.id],
  );
  if (legacyMemCheck.rows[0]?.assessment_route_id !== null) {
    throw new Error("[db-integrity] Legacy membership route id is not NULL.");
  }

  // A. Version Integrity: Membership route cannot point to wrong version
  const routeA2_1 = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.assessment_routes (
        route_set_id, syllabus_version_id, route_key, display_label,
        qualification_target, pathway_type, progression_eligibility, order_index
      ) VALUES (
        $1, $2, 'as_v2_route', 'AS v2 Route',
        'as_level', 'single_series', 'eligible', 0
      )
      RETURNING id
      `,
      [routeSetA2_1.id, versionA2.id],
    )
  ).rows[0]!;

  await expectRejected(
    () =>
      pool.query(
        `
        UPDATE public.user_subjects
        SET assessment_route_id = $1
        WHERE user_id = $2::uuid AND subject_id = $3
        `,
        [routeA2_1.id, USER_1_ID, subjectA.id],
      ),
    "user_subjects_assessment_route_fk",
    "[db-integrity] Assigning route from wrong version to membership was accepted.",
  );

  // Assign valid route to membership
  await pool.query(
    `
    UPDATE public.user_subjects
    SET assessment_route_id = $1
    WHERE user_id = $2::uuid AND subject_id = $3
    `,
    [routeA1_1.id, USER_1_ID, subjectA.id],
  );

  // User option selection
  // A. Version Integrity: Selection cannot cross membership version
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.user_subject_option_selections (
          user_id, subject_id, option_group_id, option_id, syllabus_version_id
        ) VALUES (
          $1::uuid, $2, $3, $4, $5
        )
        `,
        [USER_1_ID, subjectA.id, groupA1_1.id, optionA1_1.id, versionA2.id],
      ),
    "user_subject_option_selections_membership_fk",
    "[db-integrity] Option selection with mismatched version was accepted.",
  );

  // Wrong option group / option identity: option from multi group with history group_id
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.user_subject_option_selections (
          user_id, subject_id, option_group_id, option_id, syllabus_version_id
        ) VALUES (
          $1::uuid, $2, $3, $4, $5
        )
        `,
        [USER_1_ID, subjectA.id, groupA1_1.id, optionMultiA.id, versionA1.id],
      ),
    "user_subject_option_selections_option_fk",
    "[db-integrity] Selection with mismatched option/group identity was accepted.",
  );

  // E. User Ownership: Cross-user selection rejected
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.user_subject_option_selections (
          user_id, subject_id, option_group_id, option_id, syllabus_version_id
        ) VALUES (
          $1::uuid, $2, $3, $4, $5
        )
        `,
        [USER_2_ID, subjectA.id, groupA1_1.id, optionA1_1.id, versionA1.id],
      ),
    "user_subject_option_selections_membership_fk",
    "[db-integrity] Selection without matching user membership was accepted.",
  );

  // Insert valid selection for single-select group (1/1)
  await pool.query(
    `
    INSERT INTO public.user_subject_option_selections (
      user_id, subject_id, option_group_id, option_id, syllabus_version_id
    ) VALUES (
      $1::uuid, $2, $3, $4, $5
    )
    `,
    [USER_1_ID, subjectA.id, groupA1_1.id, optionA1_1.id, versionA1.id],
  );

  // Multi-selection: distinct options A then B in SAME group both PASS
  await pool.query(
    `
    INSERT INTO public.user_subject_option_selections (
      user_id, subject_id, option_group_id, option_id, syllabus_version_id
    ) VALUES (
      $1::uuid, $2, $3, $4, $5
    )
    `,
    [USER_1_ID, subjectA.id, groupA1_multi.id, optionMultiA.id, versionA1.id],
  );

  await pool.query(
    `
    INSERT INTO public.user_subject_option_selections (
      user_id, subject_id, option_group_id, option_id, syllabus_version_id
    ) VALUES (
      $1::uuid, $2, $3, $4, $5
    )
    `,
    [USER_1_ID, subjectA.id, groupA1_multi.id, optionMultiB.id, versionA1.id],
  );

  const multiSelCount = await pool.query<{ n: string }>(
    `
    SELECT count(*)::text AS n
    FROM public.user_subject_option_selections
    WHERE user_id = $1::uuid AND subject_id = $2 AND option_group_id = $3
    `,
    [USER_1_ID, subjectA.id, groupA1_multi.id],
  );
  if (multiSelCount.rows[0]?.n !== "2") {
    throw new Error(
      `[db-integrity] Expected 2 coexisting selections in multi group, got ${multiSelCount.rows[0]?.n}`,
    );
  }

  // Duplicate identical option in same group REJECT
  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.user_subject_option_selections (
          user_id, subject_id, option_group_id, option_id, syllabus_version_id
        ) VALUES (
          $1::uuid, $2, $3, $4, $5
        )
        `,
        [USER_1_ID, subjectA.id, groupA1_multi.id, optionMultiA.id, versionA1.id],
      ),
    "user_subject_option_selections_pk",
    "[db-integrity] Duplicate same-option selection was accepted.",
  );

  // Note: DB does NOT enforce selected-row count against min/max metadata.
  // Selected-count validation is deferred to the atomic study-configuration RPC.

  // E. User Ownership: Deleting membership CASCADE deletes ALL option selections
  await pool.query(
    `
    DELETE FROM public.user_subjects
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_1_ID, subjectA.id],
  );

  const selCount = await pool.query<{ n: string }>(
    `
    SELECT count(*)::text AS n
    FROM public.user_subject_option_selections
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_1_ID, subjectA.id],
  );
  if (selCount.rows[0]?.n !== "0") {
    throw new Error(
      `[db-integrity] Selections were not cascaded on membership deletion: count = ${selCount.rows[0]?.n}`,
    );
  }

  // Cleanup fixtures
  await cleanupRouteSchemaFixtures(pool);
}
