import type { Pool, PoolClient } from "pg";

const SUBJECT_X = "C2B201";
const SUBJECT_Y = "C2B202";
const USER_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5";

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
      crypt('c2b2-proof', gen_salt('bf')),
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
    `,
    [id, email],
  );
}

async function withJwt<T>(
  pool: Pool,
  userId: string,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function resetProfile(pool: Pool): Promise<void> {
  await pool.query(`DELETE FROM public.user_subjects WHERE user_id = $1::uuid`, [
    USER_ID,
  ]);
  await pool.query(`DELETE FROM public.tasks WHERE user_id = $1::uuid`, [USER_ID]);
  await pool.query(
    `
    UPDATE public.profiles
    SET onboarded_at = NULL, username = NULL, exam_session = NULL
    WHERE id = $1::uuid
    `,
    [USER_ID],
  );
}

export async function proveStrictAssignment(pool: Pool): Promise<void> {
  await resetProfile(pool);
  await pool.query(`DELETE FROM public.subjects WHERE code = ANY($1::text[])`, [
    [SUBJECT_X, SUBJECT_Y],
  ]);
  await pool.query(`DELETE FROM auth.users WHERE id = $1::uuid`, [USER_ID]);

  const subjects = await pool.query<{ id: number; code: string }>(
    `
    INSERT INTO public.subjects (code, name, color)
    VALUES
      ('C2B201', 'C2B2 Physics', '#111111'),
      ('C2B202', 'C2B2 Chemistry', '#222222')
    RETURNING id, code
    `,
  );
  const subjectX = subjects.rows.find((row) => row.code === SUBJECT_X)!.id;
  const subjectY = subjects.rows.find((row) => row.code === SUBJECT_Y)!.id;

  const insertFamily = async (subjectId: number, prefix: string) => {
    const versions = await pool.query<{ id: number; label: string }>(
      `
      INSERT INTO public.syllabus_versions (
        subject_id, exam_board, qualification, label, is_current, source_file,
        lifecycle, applicable_from_year, applicable_from_series,
        applicable_to_year, applicable_to_series
      )
      VALUES
        (
          $1, 'Cambridge International', 'A Level', $2,
          true, $3, 'published',
          2020, 'May/June', 2024, 'Oct/Nov'
        ),
        (
          $1, 'Cambridge International', 'A Level', $4,
          false, $5, 'published',
          2025, 'Feb/Mar', 2028, 'Oct/Nov'
        )
      RETURNING id, label
      `,
      [subjectId, `${prefix} A`, `${prefix}-a.csv`, `${prefix} B`, `${prefix}-b.csv`],
    );
    const versionA = versions.rows.find((row) => row.label === `${prefix} A`)!.id;
    const versionB = versions.rows.find((row) => row.label === `${prefix} B`)!.id;
    await pool.query(
      `
      INSERT INTO public.syllabus_version_exam_series (
        syllabus_version_id, series, product_auto_assign
      )
      VALUES
        ($1, 'May/June', true),
        ($1, 'Oct/Nov', true),
        ($2, 'Feb/Mar', false),
        ($2, 'May/June', true),
        ($2, 'Oct/Nov', true)
      `,
      [versionA, versionB],
    );
    return { versionA, versionB };
  };

  const physics = await insertFamily(subjectX, "Physics");
  const chemistry = await insertFamily(subjectY, "Chemistry");

  const defaultStillA = await pool.query<{ id: number }>(
    `SELECT id FROM public.syllabus_versions WHERE id = $1 AND is_current`,
    [physics.versionA],
  );
  if (defaultStillA.rows[0]?.id !== physics.versionA) {
    throw new Error("[db-harness] Public DEFAULT fixture is not Version A.");
  }

  await insertAuthUser(pool, USER_ID, "c2b2-strict@example.test");

  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `
      SELECT public.lockdin_complete_onboarding(
        'C2B2 Student',
        'c2b2_user',
        'AS Level (Year 12)',
        'May/June 2026',
        ARRAY[$1]::integer[],
        2026,
        'May/June'::public.exam_sitting_series,
        NULL, NULL, NULL
      )
      `,
      [subjectX],
    );
  });

  const core = await pool.query<{
    syllabus_version_id: number;
    intended_exam_year: number | null;
    intended_exam_series: string | null;
  }>(
    `
    SELECT syllabus_version_id, intended_exam_year, intended_exam_series
    FROM public.user_subjects
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_ID, subjectX],
  );
  if (core.rows[0]?.syllabus_version_id !== physics.versionB) {
    throw new Error(
      "[db-harness] C2B2 STRICT ASSIGNMENT ACTIVE: onboarding pinned DEFAULT A instead of resolver B.",
    );
  }
  if (
    core.rows[0]?.intended_exam_year !== 2026 ||
    core.rows[0]?.intended_exam_series !== "May/June"
  ) {
    throw new Error("[db-harness] C2B2 onboarding did not store the structured session.");
  }
  console.log("[db-harness] C2B2 STRICT ASSIGNMENT ACTIVE: PASS");

  const afterDefaultFlip = await pool.query<{ is_current: boolean }>(
    `SELECT is_current FROM public.syllabus_versions WHERE id = $1`,
    [physics.versionA],
  );
  if (!afterDefaultFlip.rows[0]?.is_current) {
    throw new Error("[db-harness] Public DEFAULT A was mutated by assignment.");
  }

  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `
      SELECT public.lockdin_replace_user_subjects(
        ARRAY[$1, $2]::integer[],
        2026,
        'May/June'::public.exam_sitting_series,
        NULL, NULL, NULL
      )
      `,
      [subjectX, subjectY],
    );
  });
  const settingsAdd = await pool.query<{
    subject_id: number;
    syllabus_version_id: number;
    intended_exam_year: number | null;
    intended_exam_series: string | null;
  }>(
    `
    SELECT subject_id, syllabus_version_id, intended_exam_year, intended_exam_series
    FROM public.user_subjects
    WHERE user_id = $1::uuid
    `,
    [USER_ID],
  );
  const retainedX = settingsAdd.rows.find((row) => row.subject_id === subjectX);
  const addedY = settingsAdd.rows.find((row) => row.subject_id === subjectY);
  if (
    retainedX?.syllabus_version_id !== physics.versionB ||
    retainedX.intended_exam_year !== 2026 ||
    retainedX.intended_exam_series !== "May/June"
  ) {
    throw new Error("[db-harness] Settings new-add mutated retained Physics.");
  }
  if (
    addedY?.syllabus_version_id !== chemistry.versionB ||
    addedY.intended_exam_year !== 2026 ||
    addedY.intended_exam_series !== "May/June"
  ) {
    throw new Error("[db-harness] Settings new-add did not strictly pin Chemistry B.");
  }

  await resetProfile(pool);
  await pool.query(
    `UPDATE public.syllabus_versions SET lifecycle = 'retired' WHERE id = $1`,
    [physics.versionB],
  );
  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET
      applicable_from_year = 2025,
      applicable_from_series = 'Feb/Mar',
      applicable_to_year = 2028,
      applicable_to_series = 'Oct/Nov'
    WHERE id = $1
    `,
    [physics.versionA],
  );
  await pool.query(
    `
    INSERT INTO public.syllabus_version_exam_series (
      syllabus_version_id, series, product_auto_assign
    )
    VALUES ($1, 'Feb/Mar', false)
    ON CONFLICT DO NOTHING
    `,
    [physics.versionA],
  );
  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `
      SELECT public.lockdin_complete_onboarding(
        'C2B2 Retain',
        'c2b2_ret',
        'AS Level (Year 12)',
        'May/June 2026',
        ARRAY[$1]::integer[],
        2026,
        'May/June'::public.exam_sitting_series,
        NULL, NULL, NULL
      )
      `,
      [subjectX],
    );
  });
  const pinnedA = await pool.query<{ syllabus_version_id: number }>(
    `SELECT syllabus_version_id FROM public.user_subjects WHERE user_id = $1::uuid AND subject_id = $2`,
    [USER_ID, subjectX],
  );
  if (pinnedA.rows[0]?.syllabus_version_id !== physics.versionA) {
    throw new Error("[db-harness] Immutability setup did not pin Version A.");
  }
  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET
      applicable_from_year = 2020,
      applicable_from_series = 'May/June',
      applicable_to_year = 2024,
      applicable_to_series = 'Oct/Nov'
    WHERE id = $1
    `,
    [physics.versionA],
  );
  await pool.query(
    `UPDATE public.syllabus_versions SET lifecycle = 'published' WHERE id = $1`,
    [physics.versionB],
  );
  const nowResolvesB = await pool.query<{
    lockdin_resolve_applicable_syllabus_version: number;
  }>(
    `SELECT public.lockdin_resolve_applicable_syllabus_version($1, 2026, 'May/June'::public.exam_sitting_series)`,
    [subjectX],
  );
  if (
    nowResolvesB.rows[0]?.lockdin_resolve_applicable_syllabus_version !==
    physics.versionB
  ) {
    throw new Error("[db-harness] Updated metadata did not resolve 2026 to Version B.");
  }
  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `SELECT public.lockdin_replace_user_subjects(ARRAY[$1]::integer[])`,
      [subjectX],
    );
  });
  const stillPinned = await pool.query<{ syllabus_version_id: number }>(
    `SELECT syllabus_version_id FROM public.user_subjects WHERE user_id = $1::uuid AND subject_id = $2`,
    [USER_ID, subjectX],
  );
  if (stillPinned.rows[0]?.syllabus_version_id !== physics.versionA) {
    throw new Error("[db-harness] Retained pin was reassigned after metadata change.");
  }

  await resetProfile(pool);
  await expectRejected(
    () =>
      withJwt(pool, USER_ID, (client) =>
        client.query(
          `
          SELECT public.lockdin_complete_onboarding(
            'C2B2 Missing',
            'c2b2_miss',
            'AS Level (Year 12)',
            'Other',
            ARRAY[$1]::integer[]
          )
          `,
          [subjectX],
        ),
      ),
    "intended_exam_session_required",
    "[db-harness] Missing-session onboarding was accepted.",
  );
  const noOnboard = await pool.query<{ count: string }>(
    `SELECT count(*)::text FROM public.user_subjects WHERE user_id = $1::uuid`,
    [USER_ID],
  );
  if (noOnboard.rows[0]?.count !== "0") {
    throw new Error("[db-harness] Rejected onboarding wrote memberships.");
  }

  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `
      SELECT public.lockdin_complete_onboarding(
        'C2B2 Student',
        'c2b2_user',
        'AS Level (Year 12)',
        'May/June 2026',
        ARRAY[$1]::integer[],
        2026,
        'May/June'::public.exam_sitting_series,
        NULL, NULL, NULL
      )
      `,
      [subjectX],
    );
  });

  await expectRejected(
    () =>
      withJwt(pool, USER_ID, (client) =>
        client.query(
          `SELECT public.lockdin_replace_user_subjects(ARRAY[$1, $2]::integer[])`,
          [subjectX, subjectY],
        ),
      ),
    "intended_exam_session_required",
    "[db-harness] Missing-session Settings add was accepted.",
  );
  const afterFailedAdd = await pool.query<{ subject_id: number }>(
    `SELECT subject_id FROM public.user_subjects WHERE user_id = $1::uuid`,
    [USER_ID],
  );
  if (
    afterFailedAdd.rows.length !== 1 ||
    afterFailedAdd.rows[0]?.subject_id !== subjectX
  ) {
    throw new Error("[db-harness] Failed Settings add partially mutated memberships.");
  }

  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `SELECT public.lockdin_replace_user_subjects(ARRAY[$1]::integer[])`,
      [subjectX],
    );
  });
  const retainedOnly = await pool.query<{
    syllabus_version_id: number;
    intended_exam_year: number | null;
  }>(
    `
    SELECT syllabus_version_id, intended_exam_year
    FROM public.user_subjects
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_ID, subjectX],
  );
  if (retainedOnly.rows[0]?.syllabus_version_id !== physics.versionB) {
    throw new Error("[db-harness] Retained-only Settings without session changed the pin.");
  }

  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `
      SELECT public.lockdin_replace_user_subjects(
        ARRAY[$1, $2]::integer[],
        2026,
        'May/June'::public.exam_sitting_series,
        NULL, NULL, NULL
      )
      `,
      [subjectX, subjectY],
    );
  });
  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `SELECT public.lockdin_replace_user_subjects(ARRAY[$1]::integer[])`,
      [subjectX],
    );
  });
  const afterRemoval = await pool.query<{ count: string }>(
    `SELECT count(*)::text FROM public.user_subjects WHERE user_id = $1::uuid`,
    [USER_ID],
  );
  if (afterRemoval.rows[0]?.count !== "1") {
    throw new Error("[db-harness] Removal-only Settings without session failed.");
  }

  await pool.query(
    `
    UPDATE public.user_subjects
    SET intended_exam_year = NULL, intended_exam_series = NULL
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_ID, subjectX],
  );
  const legacyNull = await pool.query<{
    syllabus_version_id: number;
    intended_exam_year: number | null;
    intended_exam_series: string | null;
  }>(
    `
    SELECT syllabus_version_id, intended_exam_year, intended_exam_series
    FROM public.user_subjects
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_ID, subjectX],
  );
  if (
    legacyNull.rows[0]?.syllabus_version_id !== physics.versionB ||
    legacyNull.rows[0]?.intended_exam_year !== null ||
    legacyNull.rows[0]?.intended_exam_series !== null
  ) {
    throw new Error("[db-harness] Legacy NULL-session membership is invalid.");
  }
  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `SELECT public.lockdin_replace_user_subjects(ARRAY[$1]::integer[])`,
      [subjectX],
    );
  });
  if (
    (
      await pool.query<{ syllabus_version_id: number }>(
        `SELECT syllabus_version_id FROM public.user_subjects WHERE user_id = $1::uuid AND subject_id = $2`,
        [USER_ID, subjectX],
      )
    ).rows[0]?.syllabus_version_id !== physics.versionB
  ) {
    throw new Error("[db-harness] Retaining a NULL-session membership repinned it.");
  }

  await resetProfile(pool);
  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `
      SELECT public.lockdin_complete_onboarding(
        'C2B2 Override',
        'c2b2_over',
        'AS Level (Year 12)',
        'May/June 2026',
        ARRAY[$1, $2]::integer[],
        2026,
        'May/June'::public.exam_sitting_series,
        ARRAY[$2]::integer[],
        ARRAY[2023]::integer[],
        ARRAY['Oct/Nov']::public.exam_sitting_series[]
      )
      `,
      [subjectX, subjectY],
    );
  });
  const overrides = await pool.query<{
    subject_id: number;
    syllabus_version_id: number;
    intended_exam_year: number;
    intended_exam_series: string;
  }>(
    `
    SELECT subject_id, syllabus_version_id, intended_exam_year, intended_exam_series
    FROM public.user_subjects
    WHERE user_id = $1::uuid
    `,
    [USER_ID],
  );
  const overX = overrides.rows.find((row) => row.subject_id === subjectX);
  const overY = overrides.rows.find((row) => row.subject_id === subjectY);
  if (
    overX?.syllabus_version_id !== physics.versionB ||
    overX.intended_exam_year !== 2026
  ) {
    throw new Error("[db-harness] Global session did not pin Physics B.");
  }
  if (
    overY?.syllabus_version_id !== chemistry.versionA ||
    overY.intended_exam_year !== 2023 ||
    overY.intended_exam_series !== "Oct/Nov"
  ) {
    throw new Error("[db-harness] Subject override leaked or missed Version A.");
  }

  await resetProfile(pool);
  await expectRejected(
    () =>
      withJwt(pool, USER_ID, (client) =>
        client.query(
          `
          SELECT public.lockdin_complete_onboarding(
            'C2B2 Feb',
            'c2b2_feb',
            'AS Level (Year 12)',
            'Feb/Mar 2026',
            ARRAY[$1]::integer[],
            2026,
            'Feb/Mar'::public.exam_sitting_series,
            NULL, NULL, NULL
          )
          `,
          [subjectX],
        ),
      ),
    "no_applicable_syllabus_version",
    "[db-harness] Feb/Mar new membership was accepted.",
  );
  if (
    (
      await pool.query<{ count: string }>(
        `SELECT count(*)::text FROM public.user_subjects WHERE user_id = $1::uuid`,
        [USER_ID],
      )
    ).rows[0]?.count !== "0"
  ) {
    throw new Error("[db-harness] Feb/Mar rejection wrote a membership.");
  }

  await expectRejected(
    () =>
      withJwt(pool, USER_ID, (client) =>
        client.query(
          `
          SELECT public.lockdin_complete_onboarding(
            'C2B2 Range',
            'c2b2_range',
            'AS Level (Year 12)',
            'May/June 2031',
            ARRAY[$1]::integer[],
            2031,
            'May/June'::public.exam_sitting_series,
            NULL, NULL, NULL
          )
          `,
          [subjectX],
        ),
      ),
    "no_applicable_syllabus_version",
    "[db-harness] Outside-range membership was accepted.",
  );

  await expectRejected(
    () =>
      withJwt(pool, USER_ID, (client) =>
        client.query(
          `
          SELECT public.lockdin_complete_onboarding(
            'C2B2 Atomic',
            'c2b2_atom',
            'AS Level (Year 12)',
            'May/June 2026',
            ARRAY[$1, $2]::integer[],
            2026,
            'May/June'::public.exam_sitting_series,
            ARRAY[$2]::integer[],
            ARRAY[2031]::integer[],
            ARRAY['May/June']::public.exam_sitting_series[]
          )
          `,
          [subjectX, subjectY],
        ),
      ),
    "no_applicable_syllabus_version",
    "[db-harness] Atomic multi-subject failure was accepted.",
  );
  if (
    (
      await pool.query<{ count: string }>(
        `SELECT count(*)::text FROM public.user_subjects WHERE user_id = $1::uuid`,
        [USER_ID],
      )
    ).rows[0]?.count !== "0"
  ) {
    throw new Error("[db-harness] Atomic failure created a partial membership.");
  }

  await pool.query(`
    ALTER TABLE public.syllabus_versions
    DROP CONSTRAINT syllabus_versions_applicable_windows_no_overlap
  `);
  try {
    const twin = await pool.query<{ id: number }>(
      `
      INSERT INTO public.syllabus_versions (
        subject_id, exam_board, qualification, label, is_current, source_file,
        lifecycle, applicable_from_year, applicable_from_series,
        applicable_to_year, applicable_to_series
      )
      VALUES (
        $1, 'Cambridge International', 'A Level', 'Twin B',
        false, 'c2b2-twin.csv', 'published',
        2025, 'Feb/Mar', 2028, 'Oct/Nov'
      )
      RETURNING id
      `,
      [subjectX],
    );
    await pool.query(
      `
      INSERT INTO public.syllabus_version_exam_series (
        syllabus_version_id, series, product_auto_assign
      ) VALUES ($1, 'May/June', true)
      `,
      [twin.rows[0]!.id],
    );
    await expectRejected(
      () =>
        withJwt(pool, USER_ID, (client) =>
          client.query(
            `
            SELECT public.lockdin_complete_onboarding(
              'C2B2 Ambig',
              'c2b2_amb',
              'AS Level (Year 12)',
              'May/June 2026',
              ARRAY[$1]::integer[],
              2026,
              'May/June'::public.exam_sitting_series,
              NULL, NULL, NULL
            )
            `,
            [subjectX],
          ),
        ),
      "ambiguous_applicable_syllabus_version",
      "[db-harness] Ambiguous resolver membership was accepted.",
    );
    await pool.query(`DELETE FROM public.syllabus_versions WHERE id = $1`, [
      twin.rows[0]!.id,
    ]);
  } finally {
    await pool.query(`
      ALTER TABLE public.syllabus_versions
      ADD CONSTRAINT syllabus_versions_applicable_windows_no_overlap
      EXCLUDE USING gist (
        subject_id WITH =,
        applicable_session_range WITH &&
      )
      WHERE (
        applicable_session_range IS NOT NULL
        AND lifecycle = 'published'::public.syllabus_version_lifecycle
      )
    `);
  }

  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `
      SELECT public.lockdin_complete_onboarding(
        'C2B2 Publish',
        'c2b2_pub',
        'AS Level (Year 12)',
        'May/June 2026',
        ARRAY[$1]::integer[],
        2026,
        'May/June'::public.exam_sitting_series,
        NULL, NULL, NULL
      )
      `,
      [subjectX],
    );
  });
  const beforePublish = await pool.query<{ syllabus_version_id: number }>(
    `SELECT syllabus_version_id FROM public.user_subjects WHERE user_id = $1::uuid AND subject_id = $2`,
    [USER_ID, subjectX],
  );
  await pool.query(
    `
    UPDATE public.syllabus_versions SET is_current = false WHERE id = $1
    `,
    [physics.versionA],
  );
  const r002 = await pool.query<{ id: number }>(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file,
      lifecycle, applicable_from_year, applicable_from_series,
      applicable_to_year, applicable_to_series
    )
    VALUES (
      $1, 'Cambridge International', 'A Level', 'Physics r002',
      true, 'c2b2-r002.csv', 'published',
      2029, 'May/June', 2030, 'Oct/Nov'
    )
    RETURNING id
    `,
    [subjectX],
  );
  await pool.query(
    `
    INSERT INTO public.syllabus_version_exam_series (
      syllabus_version_id, series, product_auto_assign
    ) VALUES ($1, 'May/June', true)
    `,
    [r002.rows[0]!.id],
  );
  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `SELECT public.lockdin_replace_user_subjects(ARRAY[$1]::integer[])`,
      [subjectX],
    );
  });
  const afterPublish = await pool.query<{ syllabus_version_id: number }>(
    `SELECT syllabus_version_id FROM public.user_subjects WHERE user_id = $1::uuid AND subject_id = $2`,
    [USER_ID, subjectX],
  );
  if (
    afterPublish.rows[0]?.syllabus_version_id !==
      beforePublish.rows[0]?.syllabus_version_id ||
    afterPublish.rows[0]?.syllabus_version_id !== physics.versionB
  ) {
    throw new Error("[db-harness] Publishing r002 auto-repinned an existing membership.");
  }

  const studentResolver = await pool.query<{ has_execute: boolean }>(
    `
    SELECT has_function_privilege(
      'authenticated',
      'public.lockdin_resolve_applicable_syllabus_version(integer, integer, public.exam_sitting_series)',
      'EXECUTE'
    ) AS has_execute
    `,
  );
  if (studentResolver.rows[0]?.has_execute) {
    throw new Error("[db-harness] Students can execute the resolver after C2B2.");
  }

  await resetProfile(pool);
  await pool.query(`DELETE FROM public.subjects WHERE code = ANY($1::text[])`, [
    [SUBJECT_X, SUBJECT_Y],
  ]);
  await pool.query(`DELETE FROM auth.users WHERE id = $1::uuid`, [USER_ID]);
}
