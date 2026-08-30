import type { Pool, PoolClient } from "pg";

const SUBJECT = "C2B101";
const USER_ID = "dddddddd-dddd-4ddd-8ddd-ddddddddddd4";

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
      crypt('c2b1-proof', gen_salt('bf')),
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

export async function proveSeriesPolicyFoundation(pool: Pool): Promise<void> {
  await pool.query(`DELETE FROM public.user_subjects WHERE user_id = $1::uuid`, [
    USER_ID,
  ]);
  await pool.query(`DELETE FROM public.subjects WHERE code = $1`, [SUBJECT]);
  await pool.query(`DELETE FROM auth.users WHERE id = $1::uuid`, [USER_ID]);

  const subject = await pool.query<{ id: number }>(
    `
    INSERT INTO public.subjects (code, name, color)
    VALUES ('C2B101', 'C2B1 Physics', '#333333')
    RETURNING id
    `,
  );
  const subjectId = subject.rows[0]?.id;
  if (!subjectId) {
    throw new Error("[db-harness] C2B1 subject was not created.");
  }

  const versions = await pool.query<{ id: number; label: string }>(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file,
      lifecycle, applicable_from_year, applicable_from_series,
      applicable_to_year, applicable_to_series
    )
    VALUES
      (
        $1, 'Cambridge International', 'A Level', 'Range A',
        true, 'c2b1-a.csv', 'published',
        2026, 'May/June', 2027, 'Oct/Nov'
      ),
      (
        $1, 'Cambridge International', 'A Level', 'Null window DEFAULT bait',
        false, 'c2b1-null.csv', 'published',
        NULL, NULL, NULL, NULL
      ),
      (
        $1, 'Cambridge International', 'A Level', 'Draft window',
        false, 'c2b1-d.csv', 'draft',
        2026, 'May/June', 2027, 'Oct/Nov'
      ),
      (
        $1, 'Cambridge International', 'A Level', 'Retired window',
        false, 'c2b1-r.csv', 'retired',
        2026, 'May/June', 2027, 'Oct/Nov'
      ),
      (
        $1, 'Cambridge International', 'A Level', 'Archived window',
        false, 'c2b1-x.csv', 'archived',
        2026, 'May/June', 2027, 'Oct/Nov'
      )
    RETURNING id, label
    `,
    [subjectId],
  );
  const rangeA = versions.rows.find((row) => row.label === "Range A");
  const nullWindow = versions.rows.find(
    (row) => row.label === "Null window DEFAULT bait",
  );
  const draft = versions.rows.find((row) => row.label === "Draft window");
  const retired = versions.rows.find((row) => row.label === "Retired window");
  const archived = versions.rows.find((row) => row.label === "Archived window");
  if (!rangeA || !nullWindow || !draft || !retired || !archived) {
    throw new Error("[db-harness] C2B1 versions were not created.");
  }

  await pool.query(
    `
    INSERT INTO public.syllabus_version_exam_series (
      syllabus_version_id, series, product_auto_assign
    )
    VALUES
      ($1, 'May/June', true),
      ($1, 'Oct/Nov', true),
      ($1, 'Feb/Mar', false),
      ($2, 'May/June', true),
      ($3, 'May/June', true),
      ($4, 'May/June', true),
      ($5, 'May/June', true)
    `,
    [rangeA.id, nullWindow.id, draft.id, retired.id, archived.id],
  );

  const resolve = async (year: number, series: string) => {
    const result = await pool.query<{
      lockdin_resolve_applicable_syllabus_version: number;
    }>(
      `SELECT public.lockdin_resolve_applicable_syllabus_version($1, $2, $3::public.exam_sitting_series)`,
      [subjectId, year, series],
    );
    return result.rows[0]?.lockdin_resolve_applicable_syllabus_version;
  };

  for (const [year, series] of [
    [2026, "May/June"],
    [2026, "Oct/Nov"],
    [2027, "May/June"],
    [2027, "Oct/Nov"],
  ] as const) {
    if ((await resolve(year, series)) !== rangeA.id) {
      throw new Error(
        `[db-harness] CASE A ${series} ${year} did not resolve to Range A.`,
      );
    }
  }

  await expectRejected(
    () => resolve(2027, "Feb/Mar"),
    "no_applicable_syllabus_version",
    "[db-harness] CASE A Feb/Mar 2027 was accepted inside the continuous range.",
  );

  await pool.query(
    `
    DELETE FROM public.syllabus_version_exam_series
    WHERE syllabus_version_id = $1 AND series = 'Oct/Nov'
    `,
    [rangeA.id],
  );
  await expectRejected(
    () => resolve(2026, "Oct/Nov"),
    "no_applicable_syllabus_version",
    "[db-harness] CASE B absent policy row was accepted.",
  );
  await pool.query(
    `
    INSERT INTO public.syllabus_version_exam_series (
      syllabus_version_id, series, product_auto_assign
    ) VALUES ($1, 'Oct/Nov', true)
    `,
    [rangeA.id],
  );

  await expectRejected(
    () => resolve(2027, "Feb/Mar"),
    "no_applicable_syllabus_version",
    "[db-harness] CASE C FALSE policy row was accepted.",
  );

  await expectRejected(
    () => resolve(2025, "May/June"),
    "no_applicable_syllabus_version",
    "[db-harness] CASE D outside-range session was accepted.",
  );

  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET is_current = false
    WHERE subject_id = $1
    `,
    [subjectId],
  );
  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET is_current = true
    WHERE id = $1
    `,
    [nullWindow.id],
  );
  if ((await resolve(2026, "May/June")) !== rangeA.id) {
    throw new Error(
      "[db-harness] CASE E/F resolver followed DEFAULT or selected a non-published version.",
    );
  }

  await pool.query(`
    ALTER TABLE public.syllabus_versions
    DROP CONSTRAINT syllabus_versions_applicable_windows_no_overlap
  `);
  try {
    const extra = await pool.query<{ id: number }>(
      `
      INSERT INTO public.syllabus_versions (
        subject_id, exam_board, qualification, label, is_current, source_file,
        lifecycle, applicable_from_year, applicable_from_series,
        applicable_to_year, applicable_to_series
      )
      VALUES (
        $1, 'Cambridge International', 'A Level', 'Overlap twin',
        false, 'c2b1-twin.csv', 'published',
        2026, 'May/June', 2027, 'Oct/Nov'
      )
      RETURNING id
      `,
      [subjectId],
    );
    await pool.query(
      `
      INSERT INTO public.syllabus_version_exam_series (
        syllabus_version_id, series, product_auto_assign
      ) VALUES ($1, 'May/June', true)
      `,
      [extra.rows[0]!.id],
    );
    await expectRejected(
      () => resolve(2026, "May/June"),
      "ambiguous_applicable_syllabus_version",
      "[db-harness] CASE G overlapping published candidates were accepted.",
    );
    await pool.query(`DELETE FROM public.syllabus_versions WHERE id = $1`, [
      extra.rows[0]!.id,
    ]);
  } finally {
    await pool.query(`
      ALTER TABLE public.syllabus_versions
      ADD CONSTRAINT syllabus_versions_applicable_windows_no_overlap
      EXCLUDE USING gist (
        subject_id WITH =,
        applicable_session_range WITH &&
      ) WHERE (
        applicable_session_range IS NOT NULL
        AND lifecycle = 'published'::public.syllabus_version_lifecycle
      )
    `);
  }

  if ((await resolve(2026, "May/June")) === nullWindow.id) {
    throw new Error("[db-harness] NULL applicability version was selected.");
  }

  const secondSubject = await pool.query<{ id: number }>(
    `
    INSERT INTO public.subjects (code, name, color)
    VALUES ('C2B102', 'C2B1 Chemistry', '#444444')
    RETURNING id
    `,
  );
  const subjectB = secondSubject.rows[0]!.id;
  const defaults = await pool.query<{ id: number }>(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file,
      lifecycle, applicable_from_year, applicable_from_series,
      applicable_to_year, applicable_to_series
    )
    VALUES (
      $1, 'Cambridge International', 'A Level', 'Chem DEFAULT',
      true, 'c2b1-chem.csv', 'published',
      2026, 'May/June', 2029, 'Oct/Nov'
    )
    RETURNING id
    `,
    [subjectB],
  );
  const chemDefault = defaults.rows[0]!.id;
  await pool.query(
    `
    INSERT INTO public.syllabus_version_exam_series (
      syllabus_version_id, series, product_auto_assign
    ) VALUES ($1, 'May/June', true)
    `,
    [chemDefault],
  );

  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET is_current = false
    WHERE subject_id = $1
    `,
    [subjectId],
  );
  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET lifecycle = 'retired'
    WHERE id = $1
    `,
    [rangeA.id],
  );
  const applicableB = await pool.query<{ id: number }>(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file,
      lifecycle, applicable_from_year, applicable_from_series,
      applicable_to_year, applicable_to_series
    )
    VALUES (
      $1, 'Cambridge International', 'A Level', 'Strict B',
      false, 'c2b1-b.csv', 'published',
      2026, 'May/June', 2027, 'Oct/Nov'
    )
    RETURNING id
    `,
    [subjectId],
  );
  const versionB = applicableB.rows[0]!.id;
  await pool.query(
    `
    INSERT INTO public.syllabus_version_exam_series (
      syllabus_version_id, series, product_auto_assign
    ) VALUES ($1, 'May/June', true)
    `,
    [versionB],
  );
  const defaultA = await pool.query<{ id: number }>(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file, lifecycle
    )
    VALUES (
      $1, 'Cambridge International', 'A Level', 'DEFAULT A',
      true, 'c2b1-default.csv', 'published'
    )
    RETURNING id
    `,
    [subjectId],
  );
  if (defaultA.rows[0] == null) {
    throw new Error("[db-harness] DEFAULT A fixture was not created.");
  }

  if ((await resolve(2026, "May/June")) !== versionB) {
    throw new Error(
      "[db-harness] Assignment-still-DEFAULT setup: resolver did not choose B.",
    );
  }

  await insertAuthUser(pool, USER_ID, "c2b1-foundation@example.test");
  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `
      SELECT public.lockdin_complete_onboarding(
        'C2B1 Student',
        'c2b1_user',
        'AS Level (Year 12)',
        'May/June 2026',
        ARRAY[$1]::integer[],
        2026,
        'May/June'::public.exam_sitting_series,
        NULL,
        NULL,
        NULL
      )
      `,
      [subjectId],
    );
  });

  const onboarded = await pool.query<{
    syllabus_version_id: number;
    intended_exam_year: number | null;
    intended_exam_series: string | null;
  }>(
    `
    SELECT syllabus_version_id, intended_exam_year, intended_exam_series
    FROM public.user_subjects
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_ID, subjectId],
  );
  if (onboarded.rows[0]?.syllabus_version_id !== versionB) {
    throw new Error(
      "[db-harness] C2B2 assignment: onboarding pinned DEFAULT A instead of resolver B.",
    );
  }
  if (
    onboarded.rows[0]?.intended_exam_year !== 2026 ||
    onboarded.rows[0]?.intended_exam_series !== "May/June"
  ) {
    throw new Error("[db-harness] Structured session was not stored as metadata.");
  }

  await pool.query(
    `
    UPDATE public.user_subjects
    SET intended_exam_year = NULL, intended_exam_series = NULL
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_ID, subjectId],
  );
  const legacy = await pool.query<{
    syllabus_version_id: number;
    intended_exam_year: number | null;
    intended_exam_series: string | null;
  }>(
    `
    SELECT syllabus_version_id, intended_exam_year, intended_exam_series
    FROM public.user_subjects
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_ID, subjectId],
  );
  if (
    legacy.rows[0]?.syllabus_version_id !== versionB ||
    legacy.rows[0]?.intended_exam_year !== null ||
    legacy.rows[0]?.intended_exam_series !== null
  ) {
    throw new Error("[db-harness] Legacy NULL-session membership is invalid.");
  }

  await withJwt(pool, USER_ID, async (client) => {
    await client.query(
      `
      SELECT public.lockdin_replace_user_subjects(
        ARRAY[$1, $2]::integer[],
        2026,
        'May/June'::public.exam_sitting_series,
        NULL,
        NULL,
        NULL
      )
      `,
      [subjectId, subjectB],
    );
  });
  const afterReplace = await pool.query<{
    subject_id: number;
    syllabus_version_id: number;
  }>(
    `
    SELECT subject_id, syllabus_version_id
    FROM public.user_subjects
    WHERE user_id = $1::uuid
    ORDER BY subject_id
    `,
    [USER_ID],
  );
  const physicsPin = afterReplace.rows.find((row) => row.subject_id === subjectId);
  const chemPin = afterReplace.rows.find((row) => row.subject_id === subjectB);
  if (physicsPin?.syllabus_version_id !== versionB) {
    throw new Error(
      "[db-harness] C2B2 assignment: replace mutated the retained Physics pin.",
    );
  }
  if (chemPin?.syllabus_version_id !== chemDefault) {
    throw new Error(
      "[db-harness] Settings addition did not pin Chemistry via the resolver.",
    );
  }

  await pool.query(`DELETE FROM public.user_subjects WHERE user_id = $1::uuid`, [
    USER_ID,
  ]);
  await pool.query(`DELETE FROM public.tasks WHERE user_id = $1::uuid`, [USER_ID]);
  await pool.query(`DELETE FROM public.subjects WHERE code = ANY($1::text[])`, [
    [SUBJECT, "C2B102"],
  ]);
  await pool.query(`DELETE FROM auth.users WHERE id = $1::uuid`, [USER_ID]);
}
