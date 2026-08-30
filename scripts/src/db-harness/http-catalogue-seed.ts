import type { Pool } from "pg";

export const HTTP_SEED_CODES = [
  "HTTP01",
  "HTTP02",
  "HTTP03",
  "HTTP04",
  "HTTP05",
  "HTTP06",
] as const;

export async function seedHttpIntegrationCatalogue(pool: Pool): Promise<void> {
  await pool.query(`DELETE FROM public.subjects WHERE code = ANY($1::text[])`, [
    [...HTTP_SEED_CODES],
  ]);

  for (const [index, code] of HTTP_SEED_CODES.entries()) {
    const subject = await pool.query<{ id: number }>(
      `
      INSERT INTO public.subjects (code, name, color)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [code, `HTTP Seed ${code}`, `#${(16 + index * 20).toString(16).padStart(2, "0")}3344`],
    );
    const subjectId = subject.rows[0]!.id;
    const sha = `${code.toLowerCase()}${"a".repeat(58)}`.slice(0, 64);
    const version = await pool.query<{ id: number }>(
      `
      INSERT INTO public.syllabus_versions (
        subject_id, exam_board, qualification, label, is_current, source_file,
        lifecycle, logical_revision_key, content_sha256, published_at,
        applicable_from_year, applicable_from_series,
        applicable_to_year, applicable_to_series
      )
      VALUES (
        $1, 'Cambridge International', 'A Level', 'SYNTHETIC HTTP seed',
        true, $2, 'published', $3, $4, now(),
        2020, 'May/June', 2033, 'Oct/Nov'
      )
      RETURNING id
      `,
      [subjectId, `${code}-http-seed.csv`, `${code}-r001`, sha],
    );
    const versionId = version.rows[0]!.id;
    await pool.query(
      `
      INSERT INTO public.syllabus_version_exam_series (
        syllabus_version_id, series, product_auto_assign
      )
      VALUES
        ($1, 'Feb/Mar', false),
        ($1, 'May/June', true),
        ($1, 'Oct/Nov', true)
      `,
      [versionId],
    );
    const unit = await pool.query<{ id: number }>(
      `
      INSERT INTO public.syllabus_units (
        subject_id, syllabus_version_id, title, order_index
      )
      VALUES ($1, $2, 'HTTP Seed Unit', 0)
      RETURNING id
      `,
      [subjectId, versionId],
    );
    await pool.query(
      `
      INSERT INTO public.syllabus_topics (
        subject_id, unit_id, title, order_index
      )
      VALUES
        ($1, $2, 'HTTP Seed Topic A', 0),
        ($1, $2, 'HTTP Seed Topic B', 1)
      `,
      [subjectId, unit.rows[0]!.id],
    );
    await pool.query(
      `
      INSERT INTO public.assessment_components (
        syllabus_version_id, paper_code, level, component_name,
        duration_minutes, total_marks, weighting_percent, order_index
      )
      VALUES ($1, $2, 'AS Level', 'Paper 1', 60, 40, 50, 0)
      `,
      [versionId, `${code}/1`],
    );
  }
}

export async function removeHttpIntegrationCatalogue(pool: Pool): Promise<void> {
  await pool.query(`DELETE FROM public.subjects WHERE code = ANY($1::text[])`, [
    [...HTTP_SEED_CODES],
  ]);
}
