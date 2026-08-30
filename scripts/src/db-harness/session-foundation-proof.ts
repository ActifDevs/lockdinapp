import type { Pool, PoolClient } from "pg";

const SUBJECT_A = "C2A01";
const SUBJECT_B = "C2A02";
const USER_ID = "cccccccc-cccc-4ccc-8ccc-ccccccccccc3";

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
      crypt('c2a-proof', gen_salt('bf')),
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

export async function proveSessionFoundation(pool: Pool): Promise<void> {
  await pool.query(`DELETE FROM public.user_subjects WHERE user_id = $1::uuid`, [
    USER_ID,
  ]);
  await pool.query(`DELETE FROM public.subjects WHERE code = ANY($1::text[])`, [
    [SUBJECT_A, SUBJECT_B],
  ]);
  await pool.query(`DELETE FROM auth.users WHERE id = $1::uuid`, [USER_ID]);

  const subjects = await pool.query<{ id: number; code: string }>(
    `
    INSERT INTO public.subjects (code, name, color)
    VALUES
      ('C2A01', 'C2A Physics', '#111111'),
      ('C2A02', 'C2A Mathematics', '#222222')
    RETURNING id, code
    `,
  );
  const subjectA = subjects.rows.find((row) => row.code === SUBJECT_A);
  const subjectB = subjects.rows.find((row) => row.code === SUBJECT_B);
  if (!subjectA || !subjectB) {
    throw new Error("[db-harness] C2A fixture subjects were not created.");
  }

  const versionsA = await pool.query<{ id: number; label: string }>(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file,
      lifecycle, applicable_from_year, applicable_from_series,
      applicable_to_year, applicable_to_series
    )
    VALUES
      (
        $1, 'Cambridge International', 'A Level', 'Version A',
        false, 'c2a-a.csv', 'published',
        2026, 'May/June', 2027, 'Oct/Nov'
      ),
      (
        $1, 'Cambridge International', 'A Level', 'Version B',
        true, 'c2a-b.csv', 'published',
        2028, 'Feb/Mar', 2029, 'Oct/Nov'
      ),
      (
        $1, 'Cambridge International', 'A Level', 'Draft',
        false, 'c2a-d.csv', 'draft',
        2026, 'May/June', 2027, 'Oct/Nov'
      ),
      (
        $1, 'Cambridge International', 'A Level', 'Retired',
        false, 'c2a-r.csv', 'retired',
        2026, 'May/June', 2027, 'Oct/Nov'
      ),
      (
        $1, 'Cambridge International', 'A Level', 'Archived',
        false, 'c2a-x.csv', 'archived',
        2026, 'May/June', 2027, 'Oct/Nov'
      )
    RETURNING id, label
    `,
    [subjectA.id],
  );
  const versionA = versionsA.rows.find((row) => row.label === "Version A");
  const versionB = versionsA.rows.find((row) => row.label === "Version B");
  if (!versionA || !versionB) {
    throw new Error("[db-harness] C2A applicability versions were not created.");
  }

  await pool.query(
    `
    INSERT INTO public.syllabus_version_exam_series (
      syllabus_version_id, series, product_auto_assign
    )
    VALUES
      ($1, 'May/June', true),
      ($1, 'Oct/Nov', true),
      ($2, 'Feb/Mar', true),
      ($2, 'Oct/Nov', true)
    `,
    [versionA.id, versionB.id],
  );

  const mathsVersion = await pool.query<{ id: number }>(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file,
      lifecycle, applicable_from_year, applicable_from_series,
      applicable_to_year, applicable_to_series
    )
    VALUES (
      $1, 'Cambridge International', 'A Level', 'Maths default',
      true, 'c2a-m.csv', 'published',
      2028, 'May/June', 2029, 'Oct/Nov'
    )
    RETURNING id
    `,
    [subjectB.id],
  );
  await pool.query(
    `
    INSERT INTO public.syllabus_version_exam_series (
      syllabus_version_id, series, product_auto_assign
    ) VALUES ($1, 'Oct/Nov', true)
    `,
    [mathsVersion.rows[0]!.id],
  );

  const resolve = async (year: number, series: string) => {
    const result = await pool.query<{ lockdin_resolve_applicable_syllabus_version: number }>(
      `SELECT public.lockdin_resolve_applicable_syllabus_version($1, $2, $3::public.exam_sitting_series)`,
      [subjectA.id, year, series],
    );
    return result.rows[0]?.lockdin_resolve_applicable_syllabus_version;
  };

  if ((await resolve(2027, "May/June")) !== versionA.id) {
    throw new Error("[db-harness] May/June 2027 did not resolve to Version A.");
  }
  if ((await resolve(2027, "Oct/Nov")) !== versionA.id) {
    throw new Error("[db-harness] Oct/Nov 2027 did not resolve to Version A.");
  }
  if ((await resolve(2028, "Feb/Mar")) !== versionB.id) {
    throw new Error("[db-harness] Feb/Mar 2028 did not resolve to Version B.");
  }
  if ((await resolve(2029, "Oct/Nov")) !== versionB.id) {
    throw new Error("[db-harness] Oct/Nov 2029 did not resolve to Version B.");
  }

  await expectRejected(
    () => resolve(2025, "Oct/Nov"),
    "no_applicable_syllabus_version",
    "[db-harness] Outside-range session was accepted.",
  );
  await expectRejected(
    () =>
      pool.query(
        `SELECT public.lockdin_resolve_applicable_syllabus_version($1, 2027, 'Specimen'::public.exam_sitting_series)`,
        [subjectA.id],
      ),
    "invalid input value for enum exam_sitting_series",
    "[db-harness] Invalid series was accepted.",
  );

  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET is_current = false
    WHERE id = $1
    `,
    [versionB.id],
  );
  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET is_current = true
    WHERE id = $1
    `,
    [versionA.id],
  );
  if ((await resolve(2028, "Feb/Mar")) !== versionB.id) {
    throw new Error("[db-harness] Resolver followed DEFAULT instead of applicability.");
  }
  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET is_current = false
    WHERE id = $1
    `,
    [versionA.id],
  );
  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET is_current = true
    WHERE id = $1
    `,
    [versionB.id],
  );

  const grant = await pool.query<{ has_execute: boolean }>(
    `
    SELECT has_function_privilege(
      'authenticated',
      'public.lockdin_resolve_applicable_syllabus_version(integer, integer, public.exam_sitting_series)',
      'EXECUTE'
    ) AS has_execute
    `,
  );
  if (grant.rows[0]?.has_execute) {
    throw new Error("[db-harness] Authenticated users can execute the resolver.");
  }

  await insertAuthUser(pool, USER_ID, "c2a-foundation@example.test");

  const defaultMaths = await pool.query<{ id: number }>(
    `
    SELECT id FROM public.syllabus_versions
    WHERE subject_id = $1 AND is_current = true
    `,
    [subjectB.id],
  );
  const mathsDefaultId = defaultMaths.rows[0]?.id;
  if (!mathsDefaultId) {
    throw new Error("[db-harness] Maths DEFAULT version is missing.");
  }

  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `
      SELECT public.lockdin_complete_onboarding(
        'C2A Student',
        'c2a_user',
        'AS Level (Year 12)',
        'May/June 2027',
        ARRAY[$1, $2]::integer[],
        2027,
        'May/June'::public.exam_sitting_series,
        ARRAY[$2]::integer[],
        ARRAY[2028]::integer[],
        ARRAY['Oct/Nov']::public.exam_sitting_series[]
      )
      `,
      [subjectA.id, subjectB.id],
    );
  });

  const onboarded = await pool.query<{
    subject_id: number;
    syllabus_version_id: number;
    intended_exam_year: number | null;
    intended_exam_series: string | null;
  }>(
    `
    SELECT subject_id, syllabus_version_id, intended_exam_year, intended_exam_series
    FROM public.user_subjects
    WHERE user_id = $1::uuid
    ORDER BY subject_id
    `,
    [USER_ID],
  );
  const physics = onboarded.rows.find((row) => row.subject_id === subjectA.id);
  const maths = onboarded.rows.find((row) => row.subject_id === subjectB.id);
  if (!physics || !maths) {
    throw new Error("[db-harness] Onboarding did not create both memberships.");
  }
  if (physics.syllabus_version_id !== versionA.id) {
    throw new Error("[db-harness] C2A onboarding did not pin Physics to resolver A.");
  }
  if (maths.syllabus_version_id !== mathsDefaultId) {
    throw new Error("[db-harness] C2A onboarding did not pin Maths to DEFAULT.");
  }
  if (physics.intended_exam_year !== 2027 || physics.intended_exam_series !== "May/June") {
    throw new Error("[db-harness] Physics inherited session was not stored.");
  }
  if (maths.intended_exam_year !== 2028 || maths.intended_exam_series !== "Oct/Nov") {
    throw new Error("[db-harness] Maths override session was not stored.");
  }

  await pool.query(
    `
    UPDATE public.profiles
    SET exam_session = 'Oct/Nov 2029'
    WHERE id = $1::uuid
    `,
    [USER_ID],
  );
  const afterPatch = await pool.query<{
    syllabus_version_id: number;
    intended_exam_year: number | null;
    intended_exam_series: string | null;
  }>(
    `
    SELECT syllabus_version_id, intended_exam_year, intended_exam_series
    FROM public.user_subjects
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_ID, subjectA.id],
  );
  if (
    afterPatch.rows[0]?.syllabus_version_id !== versionA.id ||
    afterPatch.rows[0]?.intended_exam_year !== 2027 ||
    afterPatch.rows[0]?.intended_exam_series !== "May/June"
  ) {
    throw new Error("[db-harness] Profile exam_session change mutated membership state.");
  }

  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `
      SELECT public.lockdin_replace_user_subjects(
        ARRAY[$1, $2]::integer[],
        2028,
        'Oct/Nov'::public.exam_sitting_series,
        NULL,
        NULL,
        NULL
      )
      `,
      [subjectA.id, subjectB.id],
    );
  });

  const retained = await pool.query<{
    syllabus_version_id: number;
    intended_exam_year: number | null;
    intended_exam_series: string | null;
  }>(
    `
    SELECT syllabus_version_id, intended_exam_year, intended_exam_series
    FROM public.user_subjects
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_ID, subjectA.id],
  );
  if (
    retained.rows[0]?.syllabus_version_id !== versionA.id ||
    retained.rows[0]?.intended_exam_year !== 2027 ||
    retained.rows[0]?.intended_exam_series !== "May/June"
  ) {
    throw new Error("[db-harness] Settings resave rewrote a retained membership.");
  }

  await pool.query(`DELETE FROM public.user_subjects WHERE user_id = $1::uuid`, [
    USER_ID,
  ]);
  await pool.query(`DELETE FROM public.tasks WHERE user_id = $1::uuid`, [USER_ID]);

  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.user_subjects (
          user_id, subject_id, syllabus_version_id, intended_exam_year
        ) VALUES ($1::uuid, $2, $3, 2027)
        `,
        [USER_ID, subjectA.id, versionB.id],
      ),
    "user_subjects_intended_session_complete",
    "[db-harness] Year-only intended session was accepted.",
  );

  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.user_subjects (
          user_id, subject_id, syllabus_version_id, intended_exam_series
        ) VALUES ($1::uuid, $2, $3, 'May/June')
        `,
        [USER_ID, subjectB.id, mathsDefaultId],
      ),
    "user_subjects_intended_session_complete",
    "[db-harness] Series-only intended session was accepted.",
  );

  await pool.query(
    `
    UPDATE public.profiles
    SET onboarded_at = NULL, username = NULL, exam_session = NULL
    WHERE id = $1::uuid
    `,
    [USER_ID],
  );

  await expectRejected(
    () =>
      withJwt(pool, USER_ID, (client) =>
        client.query(
          `
          SELECT public.lockdin_complete_onboarding(
            'C2A Legacy',
            'c2a_legacy',
            'A2 Level (Year 13)',
            'Other',
            ARRAY[$1]::integer[]
          )
          `,
          [subjectA.id],
        ),
      ),
    "intended_exam_session_required",
    "[db-harness] Legacy 5-arg onboarding was accepted without a session.",
  );

  await pool.query(`DELETE FROM public.user_subjects WHERE user_id = $1::uuid`, [
    USER_ID,
  ]);
  await pool.query(`DELETE FROM public.tasks WHERE user_id = $1::uuid`, [USER_ID]);
  await pool.query(`DELETE FROM public.subjects WHERE code = ANY($1::text[])`, [
    [SUBJECT_A, SUBJECT_B],
  ]);
  await pool.query(`DELETE FROM auth.users WHERE id = $1::uuid`, [USER_ID]);
}
