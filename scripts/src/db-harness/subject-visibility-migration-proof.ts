import type { Pool } from "pg";

const REHEARSAL_USER_ID = "b5e00000-0000-4000-8000-000000000020";
const REHEARSAL_SUBJECT_CODE = "B5E0020";

type IntegritySnapshot = {
  memberships: string;
  membershipCount: number;
  routeAssignmentCount: number;
  optionSelectionCount: number;
  hiddenFlagCount: number;
};

async function snapshot(pool: Pool): Promise<IntegritySnapshot> {
  const result = await pool.query<{
    memberships: unknown;
    membership_count: number;
    route_assignment_count: number;
    option_selection_count: number;
    hidden_flag_count: number;
  }>(`
    SELECT
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'user_id', us.user_id,
          'subject_id', us.subject_id,
          'syllabus_version_id', us.syllabus_version_id,
          'assessment_route_id', us.assessment_route_id,
          'intended_exam_year', us.intended_exam_year,
          'intended_exam_series', us.intended_exam_series
        ) ORDER BY us.user_id, us.subject_id)
        FROM public.user_subjects us
      ), '[]'::jsonb) AS memberships,
      (SELECT count(*)::int FROM public.user_subjects) AS membership_count,
      (SELECT count(*)::int FROM public.user_subjects
        WHERE assessment_route_id IS NOT NULL) AS route_assignment_count,
      (SELECT count(*)::int FROM public.user_subject_option_selections)
        AS option_selection_count,
      (SELECT count(*)::int FROM public.subjects
        WHERE code = '${REHEARSAL_SUBJECT_CODE}'
          AND selectable_for_new_memberships = false) AS hidden_flag_count
  `);
  const row = result.rows[0]!;
  return {
    memberships: JSON.stringify(row.memberships),
    membershipCount: Number(row.membership_count),
    routeAssignmentCount: Number(row.route_assignment_count),
    optionSelectionCount: Number(row.option_selection_count),
    hiddenFlagCount: Number(row.hidden_flag_count),
  };
}

export async function prepareSubjectVisibilityMigrationRehearsal(
  pool: Pool,
): Promise<IntegritySnapshot> {
  await pool.query(
    `
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', $1::uuid,
      'authenticated', 'authenticated', 'b5e-0020@example.test',
      crypt('b5e-0020-proof', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    )
    `,
    [REHEARSAL_USER_ID],
  );

  const subject = await pool.query<{ id: number }>(`
    INSERT INTO public.subjects (
      code, name, color, selectable_for_new_memberships
    ) VALUES ('${REHEARSAL_SUBJECT_CODE}', 'B5E Migration Rehearsal', '#002020', false)
    RETURNING id
  `);
  const subjectId = subject.rows[0]!.id;
  const version = await pool.query<{ id: number }>(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file,
      lifecycle, logical_revision_key, content_sha256, published_at,
      applicable_from_year, applicable_from_series,
      applicable_to_year, applicable_to_series
    ) VALUES (
      $1, 'Cambridge International', 'A Level', 'B5E rehearsal', true,
      'b5e-0020.csv', 'published', 'b5e-0020-r001', $2, now(),
      2026, 'May/June', 2028, 'Oct/Nov'
    ) RETURNING id
    `,
    [subjectId, "2".repeat(64)],
  );
  const versionId = version.rows[0]!.id;
  const routeSet = await pool.query<{ id: number }>(
    `
    INSERT INTO public.assessment_route_sets (
      syllabus_version_id, route_revision_key, lifecycle, manifest_sha256
    ) VALUES ($1, 'b5e-0020-routes', 'draft', $2)
    RETURNING id
    `,
    [versionId, "3".repeat(64)],
  );
  const routeSetId = routeSet.rows[0]!.id;
  const route = await pool.query<{ id: number }>(
    `
    INSERT INTO public.assessment_routes (
      route_set_id, syllabus_version_id, route_key, display_label,
      qualification_target, pathway_type, progression_eligibility, order_index
    ) VALUES ($1, $2, 'al', 'A Level', 'a_level', 'full_same_series',
      'not_applicable', 0)
    RETURNING id
    `,
    [routeSetId, versionId],
  );
  const group = await pool.query<{ id: number }>(
    `
    INSERT INTO public.assessment_study_option_groups (
      route_set_id, syllabus_version_id, group_key, display_label,
      applicable_qualification_target, min_selections, max_selections,
      order_index
    ) VALUES ($1, $2, 'proof', 'Proof option', 'a_level', 1, 1, 0)
    RETURNING id
    `,
    [routeSetId, versionId],
  );
  const groupId = group.rows[0]!.id;
  const option = await pool.query<{ id: number }>(
    `
    INSERT INTO public.assessment_study_options (
      group_id, route_set_id, syllabus_version_id, option_key,
      display_label, order_index
    ) VALUES ($1, $2, $3, 'proof', 'Proof option', 0)
    RETURNING id
    `,
    [groupId, routeSetId, versionId],
  );
  await pool.query(
    `
    INSERT INTO public.user_subjects (
      user_id, subject_id, syllabus_version_id, assessment_route_id,
      intended_exam_year, intended_exam_series
    ) VALUES ($1::uuid, $2, $3, $4, 2027, 'May/June')
    `,
    [REHEARSAL_USER_ID, subjectId, versionId, route.rows[0]!.id],
  );
  await pool.query(
    `
    INSERT INTO public.user_subject_option_selections (
      user_id, subject_id, option_group_id, option_id, syllabus_version_id
    ) VALUES ($1::uuid, $2, $3, $4, $5)
    `,
    [REHEARSAL_USER_ID, subjectId, groupId, option.rows[0]!.id, versionId],
  );

  const before = await snapshot(pool);
  if (
    before.membershipCount < 1 ||
    before.routeAssignmentCount < 1 ||
    before.optionSelectionCount < 1 ||
    before.hiddenFlagCount !== 1
  ) {
    throw new Error(
      "[db-harness] B5E populated rehearsal fixture is incomplete.",
    );
  }
  return before;
}

export async function verifySubjectVisibilityMigrationRehearsal(
  pool: Pool,
  before: IntegritySnapshot,
): Promise<void> {
  const after = await snapshot(pool);
  if (JSON.stringify(after) !== JSON.stringify(before)) {
    throw new Error(
      "[db-harness] Migration 0020 caused passive membership drift.",
    );
  }
  const grants = await pool.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM public.subject_visibility_grants",
  );
  if (Number(grants.rows[0]!.n) !== 0) {
    throw new Error("[db-harness] Migration 0020 unexpectedly created grants.");
  }
}

export async function removeSubjectVisibilityMigrationRehearsal(
  pool: Pool,
): Promise<void> {
  await pool.query("DELETE FROM auth.users WHERE id = $1::uuid", [
    REHEARSAL_USER_ID,
  ]);
  const routeSets = `SELECT rs.id FROM public.assessment_route_sets rs
    JOIN public.syllabus_versions v ON v.id = rs.syllabus_version_id
    JOIN public.subjects s ON s.id = v.subject_id
    WHERE s.code = $1`;
  await pool.query(
    `DELETE FROM public.assessment_study_options WHERE route_set_id IN (${routeSets})`,
    [REHEARSAL_SUBJECT_CODE],
  );
  await pool.query(
    `DELETE FROM public.assessment_study_option_groups WHERE route_set_id IN (${routeSets})`,
    [REHEARSAL_SUBJECT_CODE],
  );
  await pool.query(
    `DELETE FROM public.assessment_routes WHERE route_set_id IN (${routeSets})`,
    [REHEARSAL_SUBJECT_CODE],
  );
  await pool.query(
    `DELETE FROM public.assessment_route_sets WHERE id IN (${routeSets})`,
    [REHEARSAL_SUBJECT_CODE],
  );
  await pool.query("DELETE FROM public.subjects WHERE code = $1", [
    REHEARSAL_SUBJECT_CODE,
  ]);
}
