import type { Pool } from "pg";

const FIXTURE_CODES = ["L63A01", "L63A02"] as const;

function constraintName(error: unknown): string {
  if (error && typeof error === "object" && "constraint" in error) {
    return String((error as { constraint?: string }).constraint ?? "");
  }
  return error instanceof Error ? error.message : String(error);
}

function assertConstraint(error: unknown, name: string, fallback: string): void {
  const actual = constraintName(error);
  if (actual === name || (error instanceof Error && error.message.includes(name))) {
    return;
  }
  throw error instanceof Error ? error : new Error(fallback);
}

export async function proveSyllabusVersionLifecycle(pool: Pool): Promise<void> {
  await pool.query(
    `DELETE FROM public.subjects WHERE code = ANY($1::text[])`,
    [FIXTURE_CODES],
  );

  const subjects = await pool.query<{ id: number; code: string }>(
    `
    INSERT INTO public.subjects (code, name, color)
    VALUES
      ('L63A01', 'Lifecycle Fixture One', '#111111'),
      ('L63A02', 'Lifecycle Fixture Two', '#222222')
    RETURNING id, code
    `,
  );
  const subjectA = subjects.rows.find((row) => row.code === "L63A01");
  const subjectB = subjects.rows.find((row) => row.code === "L63A02");
  if (!subjectA || !subjectB) {
    throw new Error("[db-harness] Lifecycle fixture subjects were not created.");
  }

  const pinCountBefore = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM public.user_subjects`,
  );

  await pool.query(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file
    ) VALUES (
      $1, 'Cambridge International', 'AS & A Level', 'Version A', true, 'l63a01-a.csv'
    )
    `,
    [subjectA.id],
  );

  await pool.query(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file, lifecycle
    ) VALUES (
      $1, 'Cambridge International', 'AS & A Level', 'Version B', false, 'l63a01-b.csv', 'published'
    )
    `,
    [subjectA.id],
  );

  try {
    await pool.query(
      `
      INSERT INTO public.syllabus_versions (
        subject_id, exam_board, qualification, label, is_current, source_file
      ) VALUES (
        $1, 'Cambridge International', 'AS & A Level', 'Second default', true, 'l63a01-c.csv'
      )
      `,
      [subjectA.id],
    );
    throw new Error("[db-harness] Duplicate DEFAULT version was accepted.");
  } catch (error) {
    assertConstraint(
      error,
      "syllabus_versions_one_default_per_subject",
      "[db-harness] Duplicate DEFAULT failed for the wrong reason.",
    );
  }

  await pool.query(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file
    ) VALUES (
      $1, 'Cambridge International', 'AS & A Level', 'Subject B default', true, 'l63a02-a.csv'
    )
    `,
    [subjectB.id],
  );

  try {
    await pool.query(
      `
      UPDATE public.syllabus_versions
      SET applicable_from_year = 2025
      WHERE subject_id = $1 AND source_file = 'l63a01-b.csv'
      `,
      [subjectA.id],
    );
    throw new Error("[db-harness] Partial applicability window was accepted.");
  } catch (error) {
    assertConstraint(
      error,
      "syllabus_versions_applicability_complete",
      "[db-harness] Partial window failed for the wrong reason.",
    );
  }

  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET
      applicable_from_year = 2025,
      applicable_from_series = 'May/June',
      applicable_to_year = 2027,
      applicable_to_series = 'Oct/Nov'
    WHERE subject_id = $1 AND source_file = 'l63a01-a.csv'
    `,
    [subjectA.id],
  );

  try {
    await pool.query(
      `
      UPDATE public.syllabus_versions
      SET
        applicable_from_year = 2027,
        applicable_from_series = 'May/June',
        applicable_to_year = 2026,
        applicable_to_series = 'Oct/Nov'
      WHERE subject_id = $1 AND source_file = 'l63a01-b.csv'
      `,
      [subjectA.id],
    );
    throw new Error("[db-harness] Inverted applicability window was accepted.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const invertedRejected =
      constraintName(error) === "syllabus_versions_applicability_order" ||
      message.includes("syllabus_versions_applicability_order") ||
      message.includes("range lower bound must be less than or equal to range upper bound");
    if (!invertedRejected) {
      throw error instanceof Error
        ? error
        : new Error("[db-harness] Inverted window failed for the wrong reason.");
    }
  }

  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET
      applicable_from_year = 2028,
      applicable_from_series = 'Feb/Mar',
      applicable_to_year = 2029,
      applicable_to_series = 'Oct/Nov'
    WHERE subject_id = $1 AND source_file = 'l63a01-b.csv'
    `,
    [subjectA.id],
  );

  try {
    await pool.query(
      `
      UPDATE public.syllabus_versions
      SET
        applicable_from_year = 2026,
        applicable_from_series = 'May/June',
        applicable_to_year = 2028,
        applicable_to_series = 'May/June'
      WHERE subject_id = $1 AND source_file = 'l63a01-b.csv'
      `,
      [subjectA.id],
    );
    throw new Error("[db-harness] Overlapping same-subject windows were accepted.");
  } catch (error) {
    assertConstraint(
      error,
      "syllabus_versions_applicable_windows_no_overlap",
      "[db-harness] Overlap failed for the wrong reason.",
    );
  }

  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET
      applicable_from_year = 2026,
      applicable_from_series = 'May/June',
      applicable_to_year = 2028,
      applicable_to_series = 'May/June'
    WHERE subject_id = $1 AND source_file = 'l63a02-a.csv'
    `,
    [subjectB.id],
  );

  const nullWindow = await pool.query<{ n: string }>(
    `
    SELECT count(*)::text AS n
    FROM public.syllabus_versions
    WHERE subject_id = $1 AND applicable_session_range IS NULL
    `,
    [subjectB.id],
  );
  if (nullWindow.rows[0]?.n === "1") {
    throw new Error("[db-harness] Subject B window was not stored.");
  }

  const defaults = await pool.query<{ subject_id: number; n: string }>(
    `
    SELECT subject_id, count(*)::text AS n
    FROM public.syllabus_versions
    WHERE is_current = true AND subject_id = ANY($1::int[])
    GROUP BY subject_id
    `,
    [[subjectA.id, subjectB.id]],
  );
  if (defaults.rows.some((row) => Number(row.n) !== 1) || defaults.rows.length !== 2) {
    throw new Error("[db-harness] DEFAULT uniqueness proof failed.");
  }

  const pinCountAfter = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM public.user_subjects`,
  );
  if (pinCountBefore.rows[0]?.n !== pinCountAfter.rows[0]?.n) {
    throw new Error("[db-harness] user_subjects pin count changed during lifecycle proof.");
  }

  const btreeGist = await pool.query<{ extname: string }>(
    `SELECT extname FROM pg_extension WHERE extname = 'btree_gist'`,
  );
  if (btreeGist.rows.length !== 1) {
    throw new Error("[db-harness] btree_gist is not installed in the disposable database.");
  }

  await pool.query(`DELETE FROM public.subjects WHERE code = ANY($1::text[])`, [
    FIXTURE_CODES,
  ]);
}
