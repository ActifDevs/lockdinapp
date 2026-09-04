import { createHash } from "node:crypto";
import type { Pool } from "pg";

/**
 * Synthetic HTTP integration catalogue.
 * After 0018: subjects must be explicitly selectable; new memberships require
 * a published route set (fail closed). Published route sets are immutable (0017),
 * so fixtures persist until the next public-schema wipe.
 */
export const HTTP_SEED_CODES = [
  "HTTP01",
  "HTTP02",
  "HTTP03",
  "HTTP04",
  "HTTP05",
  "HTTP06",
] as const;

/** Selectable subject with no published route set — new membership must fail closed. */
export const HTTP_ZERO_ROUTE_CODE = "HTTPZR";

/** Hidden from new-membership catalogue; may still be owned. */
export const HTTP_HIDDEN_CODE = "HTTPHD";

/** Selectable subject with two published routes — explicit selection required. */
export const HTTP_MULTI_ROUTE_CODE = "HTTPML";

const ALL_SEED_CODES = [
  ...HTTP_SEED_CODES,
  HTTP_ZERO_ROUTE_CODE,
  HTTP_HIDDEN_CODE,
  HTTP_MULTI_ROUTE_CODE,
] as const;

function hex64(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

async function ensurePublishedSingleRoute(
  pool: Pool,
  versionId: number,
  routeKey: string,
): Promise<void> {
  const existing = await pool.query<{ id: number }>(
    `
    SELECT id FROM assessment_route_sets
    WHERE syllabus_version_id = $1 AND lifecycle = 'published'
    LIMIT 1
    `,
    [versionId],
  );
  if (existing.rowCount && existing.rowCount > 0) return;

  const routeSet = await pool.query<{ id: number }>(
    `
    INSERT INTO assessment_route_sets (
      syllabus_version_id, route_revision_key, lifecycle, manifest_sha256
    )
    VALUES ($1, $2, 'draft', $3)
    RETURNING id
    `,
    [versionId, `${routeKey}-routes`, hex64(`http-seed-route:${routeKey}`)],
  );
  await pool.query(
    `
    INSERT INTO assessment_routes (
      route_set_id, syllabus_version_id, route_key, display_label,
      qualification_target, pathway_type, progression_eligibility, order_index
    )
    VALUES (
      $1, $2, 'al', 'A Level',
      'a_level', 'full_same_series', 'not_applicable', 0
    )
    `,
    [routeSet.rows[0]!.id, versionId],
  );
  await pool.query(
    `
    UPDATE assessment_route_sets
    SET lifecycle = 'published', published_at = now()
    WHERE id = $1
    `,
    [routeSet.rows[0]!.id],
  );
}

async function insertSubjectGraph(
  pool: Pool,
  args: {
    code: string;
    name: string;
    color: string;
    selectable: boolean;
    withSingleRoute: boolean;
    withMultiRoute: boolean;
  },
): Promise<{ subjectId: number; versionId: number }> {
  const subject = await pool.query<{ id: number }>(
    `
    INSERT INTO public.subjects (code, name, color, selectable_for_new_memberships)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          color = EXCLUDED.color,
          selectable_for_new_memberships = EXCLUDED.selectable_for_new_memberships
    RETURNING id
    `,
    [args.code, args.name, args.color, args.selectable],
  );
  const subjectId = subject.rows[0]!.id;

  let version = await pool.query<{ id: number }>(
    `
    SELECT id FROM public.syllabus_versions
    WHERE subject_id = $1 AND is_current = true
    LIMIT 1
    `,
    [subjectId],
  );
  if (version.rowCount === 0) {
    const sha = `${args.code.toLowerCase()}${"a".repeat(58)}`.slice(0, 64);
    version = await pool.query<{ id: number }>(
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
      [subjectId, `${args.code}-http-seed.csv`, `${args.code}-r001`, sha],
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
      [versionId, `${args.code}/1`],
    );
  }

  const versionId = version.rows[0]!.id;

  if (args.withSingleRoute) {
    await ensurePublishedSingleRoute(pool, versionId, args.code.toLowerCase());
  }

  if (args.withMultiRoute) {
    const published = await pool.query(
      `
      SELECT id FROM assessment_route_sets
      WHERE syllabus_version_id = $1 AND lifecycle = 'published'
      LIMIT 1
      `,
      [versionId],
    );
    if ((published.rowCount ?? 0) === 0) {
      const routeSet = await pool.query<{ id: number }>(
        `
        INSERT INTO assessment_route_sets (
          syllabus_version_id, route_revision_key, lifecycle, manifest_sha256
        )
        VALUES ($1, $2, 'draft', $3)
        RETURNING id
        `,
        [
          versionId,
          `${args.code.toLowerCase()}-multi`,
          hex64(`http-seed-multi:${args.code}`),
        ],
      );
      await pool.query(
        `
        INSERT INTO assessment_routes (
          route_set_id, syllabus_version_id, route_key, display_label,
          qualification_target, pathway_type, progression_eligibility, order_index
        )
        VALUES
          ($1, $2, 'as', 'AS Level', 'as_level', 'single_series', 'eligible', 0),
          ($1, $2, 'al', 'A Level', 'a_level', 'full_same_series', 'not_applicable', 1)
        `,
        [routeSet.rows[0]!.id, versionId],
      );
      const group = await pool.query<{ id: number }>(
        `
        INSERT INTO assessment_study_option_groups (
          route_set_id, syllabus_version_id, group_key, display_label,
          min_selections, max_selections, order_index
        )
        VALUES ($1, $2, 'topics', 'Topics', 2, 2, 0)
        RETURNING id
        `,
        [routeSet.rows[0]!.id, versionId],
      );
      await pool.query(
        `
        INSERT INTO assessment_study_options (
          group_id, route_set_id, syllabus_version_id, option_key, display_label, order_index
        )
        VALUES
          ($1, $2, $3, 'a', 'Option A', 0),
          ($1, $2, $3, 'b', 'Option B', 1),
          ($1, $2, $3, 'c', 'Option C', 2)
        `,
        [group.rows[0]!.id, routeSet.rows[0]!.id, versionId],
      );
      await pool.query(
        `
        UPDATE assessment_route_sets
        SET lifecycle = 'published', published_at = now()
        WHERE id = $1
        `,
        [routeSet.rows[0]!.id],
      );
    }
  }

  return { subjectId, versionId };
}

export async function seedHttpIntegrationCatalogue(pool: Pool): Promise<void> {
  for (const [index, code] of HTTP_SEED_CODES.entries()) {
    await insertSubjectGraph(pool, {
      code,
      name: `HTTP Seed ${code}`,
      color: `#${(16 + index * 20).toString(16).padStart(2, "0")}3344`,
      selectable: true,
      withSingleRoute: true,
      withMultiRoute: false,
    });
  }

  await insertSubjectGraph(pool, {
    code: HTTP_ZERO_ROUTE_CODE,
    name: "HTTP Zero Route",
    color: "#991111",
    selectable: true,
    withSingleRoute: false,
    withMultiRoute: false,
  });

  await insertSubjectGraph(pool, {
    code: HTTP_HIDDEN_CODE,
    name: "HTTP Hidden",
    color: "#444444",
    selectable: false,
    withSingleRoute: true,
    withMultiRoute: false,
  });

  await insertSubjectGraph(pool, {
    code: HTTP_MULTI_ROUTE_CODE,
    name: "HTTP Multi Route",
    color: "#115599",
    selectable: true,
    withSingleRoute: false,
    withMultiRoute: true,
  });
}

export async function removeHttpIntegrationCatalogue(pool: Pool): Promise<void> {
  // 0017 makes published route sets non-deletable. Clear memberships only;
  // catalogue rows remain until the next ensureCleanPublicSchema wipe.
  await pool.query(
    `
    DELETE FROM public.user_subject_option_selections
    WHERE subject_id IN (
      SELECT id FROM public.subjects WHERE code = ANY($1::text[])
    )
    `,
    [[...ALL_SEED_CODES]],
  );
  await pool.query(
    `
    DELETE FROM public.user_subjects
    WHERE subject_id IN (
      SELECT id FROM public.subjects WHERE code = ANY($1::text[])
    )
    `,
    [[...ALL_SEED_CODES]],
  );
}
