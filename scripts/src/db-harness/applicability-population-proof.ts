import type { Pool } from "pg";
import { applyApplicabilityPopulation } from "../syllabus/applicability-populate.js";
import { loadApplicabilityManifest } from "../syllabus/applicability-manifest.js";
import { SyllabusOperatorError } from "../syllabus/errors.js";

const USER_ID = "dddddddd-dddd-4ddd-8ddd-ddddddddddd5";

function constraintName(error: unknown): string {
  if (error && typeof error === "object" && "constraint" in error) {
    return String((error as { constraint?: string }).constraint ?? "");
  }
  return error instanceof Error ? error.message : String(error);
}

function assertMessage(error: unknown, fragment: string): void {
  const message = error instanceof Error ? error.message : String(error);
  const constraint = constraintName(error);
  if (message.includes(fragment) || constraint.includes(fragment)) return;
  throw error instanceof Error ? error : new Error(String(error));
}

async function expectRejected(
  operation: () => Promise<unknown>,
  fragment: string,
  accepted: string,
): Promise<void> {
  try {
    await operation();
    throw new Error(accepted);
  } catch (error) {
    if (error instanceof Error && error.message === accepted) throw error;
    assertMessage(error, fragment);
  }
}

export async function proveApplicabilityPopulation(pool: Pool): Promise<void> {
  const manifest = loadApplicabilityManifest();

  for (const entry of manifest.versions) {
    await pool.query(`DELETE FROM public.subjects WHERE code = $1`, [
      entry.subjectCode,
    ]);
  }
  await pool.query(`DELETE FROM public.user_subjects WHERE user_id = $1::uuid`, [
    USER_ID,
  ]);
  await pool.query(`DELETE FROM public.subjects WHERE code = $1`, ["APPX01"]);
  await pool.query(`DELETE FROM auth.users WHERE id = $1::uuid`, [USER_ID]);

  for (const entry of manifest.versions) {
    const subject = await pool.query<{ id: number }>(
      `
      INSERT INTO public.subjects (code, name, color)
      VALUES ($1, $2, '#111111')
      RETURNING id
      `,
      [entry.subjectCode, `${entry.subjectCode} Applicability`],
    );
    await pool.query(
      `
      INSERT INTO public.syllabus_versions (
        subject_id, exam_board, qualification, label, is_current, source_file,
        lifecycle, logical_revision_key, content_sha256
      )
      VALUES (
        $1, 'Cambridge International', 'A Level', 'r001',
        true, $2, 'published', $3, $4
      )
      `,
      [
        subject.rows[0]!.id,
        `${entry.subjectCode}.csv`,
        entry.logicalRevisionKey,
        entry.expectedContentSha256,
      ],
    );
  }

  const first = await applyApplicabilityPopulation(manifest);
  if (first.operation !== "populated" || first.targets.length !== 9) {
    throw new Error("[db-harness] First applicability apply did not populate 9/9.");
  }

  const counts = await pool.query<{
    applicable: number;
    policy: number;
    true_rows: number;
    false_rows: number;
  }>(`
    SELECT
      (SELECT count(*)::int FROM public.syllabus_versions WHERE logical_revision_key LIKE '%-r001' AND applicable_from_year IS NOT NULL) AS applicable,
      (SELECT count(*)::int
        FROM public.syllabus_version_exam_series p
        JOIN public.syllabus_versions v ON v.id = p.syllabus_version_id
        WHERE v.logical_revision_key LIKE '%-r001') AS policy,
      (SELECT count(*)::int
        FROM public.syllabus_version_exam_series p
        JOIN public.syllabus_versions v ON v.id = p.syllabus_version_id
        WHERE v.logical_revision_key LIKE '%-r001' AND p.product_auto_assign) AS true_rows,
      (SELECT count(*)::int
        FROM public.syllabus_version_exam_series p
        JOIN public.syllabus_versions v ON v.id = p.syllabus_version_id
        WHERE v.logical_revision_key LIKE '%-r001' AND NOT p.product_auto_assign) AS false_rows
  `);
  if (
    counts.rows[0]?.applicable !== 9 ||
    counts.rows[0]?.policy !== 27 ||
    counts.rows[0]?.true_rows !== 18 ||
    counts.rows[0]?.false_rows !== 9
  ) {
    throw new Error(
      `[db-harness] Population counts were ${JSON.stringify(counts.rows[0])}`,
    );
  }

  const resolve = async (code: string, year: number, series: string) => {
    const subject = await pool.query<{ id: number }>(
      `SELECT id FROM public.subjects WHERE code = $1`,
      [code],
    );
    const result = await pool.query<{
      lockdin_resolve_applicable_syllabus_version: number;
    }>(
      `SELECT public.lockdin_resolve_applicable_syllabus_version($1, $2, $3::public.exam_sitting_series)`,
      [subject.rows[0]!.id, year, series],
    );
    return result.rows[0]?.lockdin_resolve_applicable_syllabus_version;
  };

  const versionId = async (key: string) => {
    const result = await pool.query<{ id: number }>(
      `SELECT id FROM public.syllabus_versions WHERE logical_revision_key = $1`,
      [key],
    );
    return result.rows[0]!.id;
  };

  for (const entry of manifest.versions) {
    const expected = await versionId(entry.logicalRevisionKey);
    if ((await resolve(entry.subjectCode, entry.applicability.from.year, "May/June")) !== expected) {
      throw new Error(`[db-harness] May/June start failed for ${entry.subjectCode}`);
    }
    if ((await resolve(entry.subjectCode, entry.applicability.to.year, "Oct/Nov")) !== expected) {
      throw new Error(`[db-harness] Oct/Nov end failed for ${entry.subjectCode}`);
    }
    await expectRejected(
      () => resolve(entry.subjectCode, entry.applicability.from.year, "Feb/Mar"),
      "no_applicable_syllabus_version",
      `[db-harness] Feb/Mar was accepted for ${entry.subjectCode}`,
    );
  }

  await expectRejected(
    () => resolve("9489", 2026, "May/June"),
    "no_applicable_syllabus_version",
    "[db-harness] History 2026 May/June was accepted.",
  );
  await expectRejected(
    () => resolve("9489", 2026, "Oct/Nov"),
    "no_applicable_syllabus_version",
    "[db-harness] History 2026 Oct/Nov was accepted.",
  );
  if ((await resolve("9489", 2027, "May/June")) !== (await versionId("9489-r001"))) {
    throw new Error("[db-harness] History 2027 May/June did not resolve.");
  }
  if ((await resolve("9489", 2029, "Oct/Nov")) !== (await versionId("9489-r001"))) {
    throw new Error("[db-harness] History 2029 Oct/Nov did not resolve.");
  }
  await expectRejected(
    () => resolve("9489", 2030, "May/June"),
    "no_applicable_syllabus_version",
    "[db-harness] History 2030 May/June was accepted.",
  );

  await expectRejected(
    () => resolve("9702", 2026, "Feb/Mar"),
    "no_applicable_syllabus_version",
    "[db-harness] Physics 2026 Feb/Mar inside the window was accepted.",
  );
  await expectRejected(
    () => resolve("9702", 2024, "Oct/Nov"),
    "no_applicable_syllabus_version",
    "[db-harness] Physics 2024 Oct/Nov was accepted.",
  );
  if ((await resolve("9702", 2025, "May/June")) !== (await versionId("9702-r001"))) {
    throw new Error("[db-harness] Physics 2025 May/June did not resolve.");
  }
  if ((await resolve("9702", 2030, "May/June")) !== (await versionId("9702-r001"))) {
    throw new Error("[db-harness] Physics 2030 May/June did not resolve.");
  }
  if ((await resolve("9702", 2030, "Oct/Nov")) !== (await versionId("9702-r001"))) {
    throw new Error("[db-harness] Physics 2030 Oct/Nov did not resolve.");
  }
  await expectRejected(
    () => resolve("9702", 2031, "May/June"),
    "no_applicable_syllabus_version",
    "[db-harness] Physics 2031 May/June was accepted.",
  );

  const second = await applyApplicabilityPopulation(manifest);
  if (second.operation !== "already-applied") {
    throw new Error("[db-harness] Second apply was not idempotent.");
  }
  const policyAgain = await pool.query<{ n: number }>(
    `
    SELECT count(*)::int AS n
    FROM public.syllabus_version_exam_series p
    JOIN public.syllabus_versions v ON v.id = p.syllabus_version_id
    WHERE v.logical_revision_key LIKE '%-r001'
    `,
  );
  if (policyAgain.rows[0]?.n !== 27) {
    throw new Error("[db-harness] Idempotent apply duplicated policy rows.");
  }

  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET applicable_from_year = 2010
    WHERE logical_revision_key = '9231-r001'
    `,
  );
  try {
    await applyApplicabilityPopulation(manifest);
    throw new Error("[db-harness] Conflict apply succeeded.");
  } catch (error) {
    if (error instanceof Error && error.message === "[db-harness] Conflict apply succeeded.") {
      throw error;
    }
    if (!(error instanceof SyllabusOperatorError) || error.code !== "applicability_conflict") {
      throw error;
    }
  }
  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET applicable_from_year = 2023
    WHERE logical_revision_key = '9231-r001'
    `,
  );

  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET content_sha256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    WHERE logical_revision_key = '9708-r001'
    `,
  );
  const beforeAtomic = await pool.query<{ year: number | null }>(
    `SELECT applicable_from_year AS year FROM public.syllabus_versions WHERE logical_revision_key = '9709-r001'`,
  );
  try {
    await applyApplicabilityPopulation(manifest);
    throw new Error("[db-harness] Atomic failure apply succeeded.");
  } catch (error) {
    if (error instanceof Error && error.message === "[db-harness] Atomic failure apply succeeded.") {
      throw error;
    }
    if (
      !(error instanceof SyllabusOperatorError) ||
      error.code !== "published_identity_mismatch"
    ) {
      throw error;
    }
  }
  const afterAtomic = await pool.query<{ year: number | null }>(
    `SELECT applicable_from_year AS year FROM public.syllabus_versions WHERE logical_revision_key = '9709-r001'`,
  );
  if (afterAtomic.rows[0]?.year !== beforeAtomic.rows[0]?.year) {
    throw new Error("[db-harness] Atomic failure mutated another version.");
  }
  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET content_sha256 = $1
    WHERE logical_revision_key = '9708-r001'
    `,
    [manifest.versions.find((row) => row.subjectCode === "9708")!.expectedContentSha256],
  );

  const extra = await pool.query<{ id: number }>(
    `
    INSERT INTO public.subjects (code, name, color)
    VALUES ('APPX01', 'Assignment still DEFAULT', '#222222')
    RETURNING id
    `,
  );
  const subjectId = extra.rows[0]!.id;
  await pool.query(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file, lifecycle
    ) VALUES (
      $1, 'Cambridge International', 'A Level', 'DEFAULT A', true, 'a.csv', 'published'
    )
    `,
    [subjectId],
  );
  const versionB = await pool.query<{ id: number }>(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file,
      lifecycle, applicable_from_year, applicable_from_series,
      applicable_to_year, applicable_to_series
    ) VALUES (
      $1, 'Cambridge International', 'A Level', 'Strict B', false, 'b.csv',
      'published', 2026, 'May/June', 2027, 'Oct/Nov'
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
    [versionB.rows[0]!.id],
  );
  const resolvedB = await pool.query<{
    lockdin_resolve_applicable_syllabus_version: number;
  }>(
    `SELECT public.lockdin_resolve_applicable_syllabus_version($1, 2026, 'May/June'::public.exam_sitting_series)`,
    [subjectId],
  );
  if (
    resolvedB.rows[0]?.lockdin_resolve_applicable_syllabus_version !==
    versionB.rows[0]!.id
  ) {
    throw new Error("[db-harness] Assignment-still-DEFAULT setup resolver missed B.");
  }
  const defaultA = await pool.query<{ id: number }>(
    `SELECT id FROM public.syllabus_versions WHERE subject_id = $1 AND is_current`,
    [subjectId],
  );
  await pool.query(
    `
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', $1::uuid, 'authenticated',
      'authenticated', 'app-pop@example.test', crypt('x', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    )
    `,
    [USER_ID],
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: USER_ID, role: "authenticated" }),
    ]);
    await client.query(
      `
      SELECT public.lockdin_complete_onboarding(
        'Pop Student', 'pop_user', 'AS Level (Year 12)', 'May/June 2026',
        ARRAY[$1]::integer[], 2026, 'May/June'::public.exam_sitting_series,
        NULL, NULL, NULL
      )
      `,
      [subjectId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  const pin = await pool.query<{ syllabus_version_id: number }>(
    `SELECT syllabus_version_id FROM public.user_subjects WHERE user_id = $1::uuid AND subject_id = $2`,
    [USER_ID, subjectId],
  );
  if (pin.rows[0]?.syllabus_version_id !== defaultA.rows[0]!.id) {
    throw new Error("[db-harness] ASSIGNMENT-STILL-DEFAULT: onboarding pinned resolver B.");
  }

  await pool.query(`DELETE FROM public.user_subjects WHERE user_id = $1::uuid`, [
    USER_ID,
  ]);
  await pool.query(`DELETE FROM public.tasks WHERE user_id = $1::uuid`, [USER_ID]);
  await pool.query(`DELETE FROM public.subjects WHERE code = ANY($1::text[])`, [
    [...manifest.versions.map((row) => row.subjectCode), "APPX01"],
  ]);
  await pool.query(`DELETE FROM auth.users WHERE id = $1::uuid`, [USER_ID]);
}
