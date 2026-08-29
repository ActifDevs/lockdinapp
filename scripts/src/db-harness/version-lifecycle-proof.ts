import type { Pool } from "pg";

const FIXTURE_CODES = ["L63A01", "L63A02"] as const;

const WINDOW_W = {
  fromYear: 2025,
  fromSeries: "May/June",
  toYear: 2027,
  toSeries: "Oct/Nov",
} as const;

function constraintName(error: unknown): string {
  if (error && typeof error === "object" && "constraint" in error) {
    return String((error as { constraint?: string }).constraint ?? "");
  }
  return error instanceof Error ? error.message : String(error);
}

function assertConstraint(error: unknown, name: string): void {
  const actual = constraintName(error);
  const message = error instanceof Error ? error.message : String(error);
  if (actual === name || message.includes(name)) return;
  throw error instanceof Error ? error : new Error(message);
}

async function expectRejected(
  operation: () => Promise<unknown>,
  constraint: string,
  acceptedMessage: string,
): Promise<void> {
  try {
    await operation();
    throw new Error(acceptedMessage);
  } catch (error) {
    if (error instanceof Error && error.message === acceptedMessage) throw error;
    assertConstraint(error, constraint);
  }
}

export async function proveSyllabusVersionLifecycle(pool: Pool): Promise<void> {
  await pool.query(`DELETE FROM public.subjects WHERE code = ANY($1::text[])`, [
    FIXTURE_CODES,
  ]);

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
      subject_id, exam_board, qualification, label, is_current, source_file, lifecycle
    ) VALUES (
      $1, 'Cambridge International', 'AS & A Level', 'Published current',
      true, 'l63a01-pub.csv', 'published'
    )
    `,
    [subjectA.id],
  );

  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.syllabus_versions (
          subject_id, exam_board, qualification, label, is_current, source_file, lifecycle
        ) VALUES (
          $1, 'Cambridge International', 'AS & A Level', 'Second default',
          true, 'l63a01-dup.csv', 'published'
        )
        `,
        [subjectA.id],
      ),
    "syllabus_versions_one_default_per_subject",
    "[db-harness] Duplicate DEFAULT version was accepted.",
  );

  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.syllabus_versions (
          subject_id, exam_board, qualification, label, is_current, source_file, lifecycle
        ) VALUES (
          $1, 'Cambridge International', 'AS & A Level', 'Draft current',
          true, 'l63a01-draft-cur.csv', 'draft'
        )
        `,
        [subjectA.id],
      ),
    "syllabus_versions_default_must_be_published",
    "[db-harness] Draft DEFAULT was accepted.",
  );

  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.syllabus_versions (
          subject_id, exam_board, qualification, label, is_current, source_file, lifecycle
        ) VALUES (
          $1, 'Cambridge International', 'AS & A Level', 'Retired current',
          true, 'l63a01-ret-cur.csv', 'retired'
        )
        `,
        [subjectA.id],
      ),
    "syllabus_versions_default_must_be_published",
    "[db-harness] Retired DEFAULT was accepted.",
  );

  await expectRejected(
    () =>
      pool.query(
        `
        INSERT INTO public.syllabus_versions (
          subject_id, exam_board, qualification, label, is_current, source_file, lifecycle
        ) VALUES (
          $1, 'Cambridge International', 'AS & A Level', 'Archived current',
          true, 'l63a01-arch-cur.csv', 'archived'
        )
        `,
        [subjectA.id],
      ),
    "syllabus_versions_default_must_be_published",
    "[db-harness] Archived DEFAULT was accepted.",
  );

  await pool.query(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file, lifecycle
    ) VALUES
      ($1, 'Cambridge International', 'AS & A Level', 'Draft ok', false, 'l63a01-draft.csv', 'draft'),
      ($1, 'Cambridge International', 'AS & A Level', 'Retired ok', false, 'l63a01-retired.csv', 'retired'),
      ($1, 'Cambridge International', 'AS & A Level', 'Archived ok', false, 'l63a01-archived.csv', 'archived')
    `,
    [subjectA.id],
  );

  await pool.query(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file, lifecycle
    ) VALUES (
      $1, 'Cambridge International', 'AS & A Level', 'Subject B default',
      true, 'l63a02-pub.csv', 'published'
    )
    `,
    [subjectB.id],
  );

  await expectRejected(
    () =>
      pool.query(
        `
        UPDATE public.syllabus_versions
        SET applicable_from_year = 2025
        WHERE source_file = 'l63a01-draft.csv'
        `,
      ),
    "syllabus_versions_applicability_complete",
    "[db-harness] Partial applicability window was accepted.",
  );

  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET
      applicable_from_year = $1,
      applicable_from_series = $2,
      applicable_to_year = $3,
      applicable_to_series = $4
    WHERE source_file = 'l63a01-pub.csv'
    `,
    [WINDOW_W.fromYear, WINDOW_W.fromSeries, WINDOW_W.toYear, WINDOW_W.toSeries],
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
      WHERE source_file = 'l63a01-draft.csv'
      `,
    );
    throw new Error("[db-harness] Inverted applicability window was accepted.");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "[db-harness] Inverted applicability window was accepted."
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    const invertedRejected =
      constraintName(error) === "syllabus_versions_applicability_order" ||
      message.includes("syllabus_versions_applicability_order") ||
      message.includes("range lower bound must be less than or equal to range upper bound");
    if (!invertedRejected) throw error instanceof Error ? error : new Error(String(error));
  }

  await pool.query(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file, lifecycle
    ) VALUES (
      $1, 'Cambridge International', 'AS & A Level', 'Published later',
      false, 'l63a01-pub2.csv', 'published'
    )
    `,
    [subjectA.id],
  );

  await expectRejected(
    () =>
      pool.query(
        `
        UPDATE public.syllabus_versions
        SET
          applicable_from_year = $1,
          applicable_from_series = $2,
          applicable_to_year = $3,
          applicable_to_series = $4
        WHERE source_file = 'l63a01-pub2.csv'
        `,
        [WINDOW_W.fromYear, WINDOW_W.fromSeries, WINDOW_W.toYear, WINDOW_W.toSeries],
      ),
    "syllabus_versions_applicable_windows_no_overlap",
    "[db-harness] Published vs published overlap was accepted.",
  );

  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET
      applicable_from_year = 2028,
      applicable_from_series = 'Feb/Mar',
      applicable_to_year = 2029,
      applicable_to_series = 'Oct/Nov'
    WHERE source_file = 'l63a01-pub2.csv'
    `,
  );

  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET
      applicable_from_year = $1,
      applicable_from_series = $2,
      applicable_to_year = $3,
      applicable_to_series = $4
    WHERE source_file IN ('l63a01-draft.csv', 'l63a01-retired.csv', 'l63a01-archived.csv')
    `,
    [WINDOW_W.fromYear, WINDOW_W.fromSeries, WINDOW_W.toYear, WINDOW_W.toSeries],
  );

  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET
      applicable_from_year = $1,
      applicable_from_series = $2,
      applicable_to_year = $3,
      applicable_to_series = $4
    WHERE source_file = 'l63a02-pub.csv'
    `,
    [WINDOW_W.fromYear, WINDOW_W.fromSeries, WINDOW_W.toYear, WINDOW_W.toSeries],
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
      INSERT INTO public.syllabus_versions (
        subject_id, exam_board, qualification, label, is_current, source_file, lifecycle,
        applicable_from_year, applicable_from_series, applicable_to_year, applicable_to_series
      ) VALUES (
        $1, 'Cambridge International', 'AS & A Level', 'Replacement draft',
        false, 'l63a01-replace.csv', 'draft',
        $2, $3, $4, $5
      )
      `,
      [subjectA.id, WINDOW_W.fromYear, WINDOW_W.fromSeries, WINDOW_W.toYear, WINDOW_W.toSeries],
    );
    await client.query(
      `
      UPDATE public.syllabus_versions
      SET is_current = false, lifecycle = 'retired', retired_at = now()
      WHERE source_file = 'l63a01-pub.csv'
      `,
    );
    await client.query(
      `
      UPDATE public.syllabus_versions
      SET lifecycle = 'published', is_current = true, published_at = now()
      WHERE source_file = 'l63a01-replace.csv'
      `,
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const transition = await pool.query<{
    source_file: string;
    lifecycle: string;
    is_current: boolean;
    from_year: number | null;
  }>(
    `
    SELECT source_file, lifecycle, is_current,
           applicable_from_year AS from_year
    FROM public.syllabus_versions
    WHERE source_file IN ('l63a01-pub.csv', 'l63a01-replace.csv')
    ORDER BY source_file
    `,
  );
  const retiredA = transition.rows.find((row) => row.source_file === "l63a01-pub.csv");
  const publishedB = transition.rows.find(
    (row) => row.source_file === "l63a01-replace.csv",
  );
  if (
    !retiredA ||
    retiredA.lifecycle !== "retired" ||
    retiredA.is_current !== false ||
    retiredA.from_year !== WINDOW_W.fromYear
  ) {
    throw new Error("[db-harness] Publication transition did not retain retired A.");
  }
  if (
    !publishedB ||
    publishedB.lifecycle !== "published" ||
    publishedB.is_current !== true ||
    publishedB.from_year !== WINDOW_W.fromYear
  ) {
    throw new Error("[db-harness] Publication transition did not publish B as DEFAULT.");
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
