import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import {
  assessmentRouteSetsTable,
  assessmentRoutesTable,
  userSubjectsTable,
} from "@workspace/db";
import * as schema from "@workspace/db/schema";
import type { Pool } from "pg";
import { withTriggerBypassCleanup } from "../db-harness/trigger-bypass-cleanup.js";
import { hashRouteManifest } from "./hash.js";
import { publishRouteManifest } from "./publish.js";
import type { ReferenceCatalog } from "./resolve.js";
import { baseStaticManifest } from "./__tests__/fixtures/synthetic.js";
import { RouteManifestError, RouteManifestValidationError } from "./errors.js";
import type { RouteManifest } from "./types.js";

export const PUBLISH_SUBJECT = "8999";
export const PUBLISH_REVISION = "8999-r001";

function harnessDb(pool: Pool) {
  return drizzle(pool, { schema });
}
export async function cleanupRoutePublicationFixtures(pool: Pool): Promise<void> {
  await withTriggerBypassCleanup(pool, async (client) => {
    await client.query(
      `
      DELETE FROM public.user_subjects
      WHERE subject_id IN (SELECT id FROM public.subjects WHERE code = $1)
      `,
      [PUBLISH_SUBJECT],
    );
    await client.query(
      `
      DELETE FROM public.assessment_route_sets
      WHERE syllabus_version_id IN (
        SELECT v.id FROM public.syllabus_versions v
        JOIN public.subjects s ON s.id = v.subject_id
        WHERE s.code = $1
      )
      `,
      [PUBLISH_SUBJECT],
    );
    await client.query(
      `
      DELETE FROM public.syllabus_versions
      WHERE subject_id IN (SELECT id FROM public.subjects WHERE code = $1)
      `,
      [PUBLISH_SUBJECT],
    );
    await client.query(`DELETE FROM public.subjects WHERE code = $1`, [
      PUBLISH_SUBJECT,
    ]);
  });

  const leftover = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM public.subjects WHERE code = $1`,
    [PUBLISH_SUBJECT],
  );
  if (leftover.rows[0]?.n !== "0") {
    throw new Error("[pub] publication fixture subject was not cleaned");
  }
}

export function publishableManifest(
  overrides: Partial<RouteManifest> = {},
): RouteManifest {
  return baseStaticManifest({
    subjectCode: PUBLISH_SUBJECT,
    syllabusRevisionKey: PUBLISH_REVISION,
    routeRevisionKey: "8999-routes-v1",
    ...overrides,
  });
}

export async function seedPublishableSyllabus(pool: Pool): Promise<{
  subjectId: number;
  versionId: number;
  catalog: ReferenceCatalog;
}> {
  await cleanupRoutePublicationFixtures(pool);

  const subject = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.subjects (code, name, color)
      VALUES ($1, 'Publication Proof Subject', '#13579a')
      RETURNING id
      `,
      [PUBLISH_SUBJECT],
    )
  ).rows[0]!;

  const version = (
    await pool.query<{ id: number }>(
      `
      INSERT INTO public.syllabus_versions (
        subject_id, exam_board, qualification, label, is_current,
        source_file, lifecycle, logical_revision_key,
        applicable_from_year, applicable_from_series,
        applicable_to_year, applicable_to_series
      ) VALUES (
        $1, 'Cambridge International', 'AS & A Level', 'Pub v1', true,
        'pub.csv', 'published', $2,
        2027, 'May/June', 2029, 'Oct/Nov'
      )
      RETURNING id
      `,
      [subject.id, PUBLISH_REVISION],
    )
  ).rows[0]!;

  const components = [
    { paperCode: "9999/1", level: "AS Level", name: "P1", marks: 40, weight: 40 },
    { paperCode: "9999/2", level: "AS Level", name: "P2", marks: 60, weight: 60 },
    { paperCode: "9999/3", level: "A Level", name: "P3", marks: 40, weight: 20 },
    { paperCode: "9999/4", level: "A Level", name: "P4", marks: 60, weight: 30 },
  ] as const;

  const componentIds: Array<{ paperCode: string; level: string; id: number }> = [];
  for (const component of components) {
    const row = (
      await pool.query<{ id: number }>(
        `
        INSERT INTO public.assessment_components (
          syllabus_version_id, paper_code, level, component_name, total_marks, weighting_percent
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        `,
        [
          version.id,
          component.paperCode,
          component.level,
          component.name,
          component.marks,
          component.weight,
        ],
      )
    ).rows[0]!;
    componentIds.push({
      paperCode: component.paperCode,
      level: component.level,
      id: row.id,
    });
  }

  const unitTitles = ["Unit Alpha", "Unit Beta"];
  const units: Array<{ unitTitle: string; id: number }> = [];
  for (const [index, title] of unitTitles.entries()) {
    const row = (
      await pool.query<{ id: number }>(
        `
        INSERT INTO public.syllabus_units (subject_id, syllabus_version_id, title, order_index)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `,
        [subject.id, version.id, title, index],
      )
    ).rows[0]!;
    units.push({ unitTitle: title, id: row.id });
  }

  return {
    subjectId: subject.id,
    versionId: version.id,
    catalog: {
      versions: [
        {
          subjectCode: PUBLISH_SUBJECT,
          logicalRevisionKey: PUBLISH_REVISION,
          applicableFromYear: 2027,
          applicableToYear: 2029,
          components: componentIds,
          units,
        },
      ],
    },
  };
}

/**
 * Local DB proof for A2B publication, idempotency, replacement, rollback, concurrency.
 */
export async function proveRoutePublication(pool: Pool): Promise<void> {
  const seeded = await seedPublishableSyllabus(pool);
  const catalogLoader = async () => seeded.catalog;
  const database = harnessDb(pool);
  const publishOpts = { catalogLoader, database };

  const manifestA = publishableManifest();
  const hashA = hashRouteManifest(manifestA);

  let dryRun;
  try {
    dryRun = await publishRouteManifest(manifestA, {
      dryRun: true,
      ...publishOpts,
    });
  } catch (error) {
    if (error instanceof RouteManifestValidationError) {
      throw new Error(
        `[pub] dry-run validation failed: ${error.issues.map((i) => `${i.code}:${i.path}:${i.message}`).join(" | ")}`,
      );
    }
    throw error;
  }
  if (dryRun.operation !== "dry_run" || dryRun.wouldNoop || dryRun.wouldReplace) {
    throw new Error("[pub] unexpected dry-run state before first publish");
  }

  const first = await publishRouteManifest(manifestA, publishOpts);
  if (first.operation !== "published" || first.manifestSha256 !== hashA) {
    throw new Error("[pub] first publish failed");
  }

  const setsAfterFirst = await database
    .select()
    .from(assessmentRouteSetsTable)
    .where(eq(assessmentRouteSetsTable.syllabusVersionId, seeded.versionId));
  if (setsAfterFirst.length !== 1 || setsAfterFirst[0]!.lifecycle !== "published") {
    throw new Error("[pub] expected exactly one published route set");
  }
  if (setsAfterFirst[0]!.manifestSha256 !== hashA) {
    throw new Error("[pub] persisted hash mismatch");
  }
  if (!setsAfterFirst[0]!.sourceManifest) {
    throw new Error("[pub] source_manifest missing");
  }

  const routes = await database
    .select()
    .from(assessmentRoutesTable)
    .where(eq(assessmentRoutesTable.routeSetId, first.routeSetId));
  if (routes.length !== first.counts.routes) {
    throw new Error("[pub] route count mismatch");
  }

  // Idempotency: same revision + same hash → NO-OP
  const second = await publishRouteManifest(manifestA, publishOpts);
  if (second.operation !== "noop_existing" || second.routeSetId !== first.routeSetId) {
    throw new Error("[pub] idempotent republish did not NO-OP");
  }
  const setsAfterNoop = await database
    .select()
    .from(assessmentRouteSetsTable)
    .where(eq(assessmentRouteSetsTable.syllabusVersionId, seeded.versionId));
  if (setsAfterNoop.length !== 1) {
    throw new Error("[pub] idempotent republish created duplicate sets");
  }

  // Same revision + different hash → REJECT
  const mutated = publishableManifest({
    routes: manifestA.routes.map((route, index) =>
      index === 0
        ? { ...route, label: "Mutated AS Label" }
        : route,
    ),
  });
  try {
    await publishRouteManifest(mutated, publishOpts);
    throw new Error("[pub] same revision different hash was accepted");
  } catch (error) {
    if (!(error instanceof RouteManifestError) || error.code !== "route_revision_hash_conflict") {
      throw error;
    }
  }
  const unchanged = await database
    .select()
    .from(assessmentRouteSetsTable)
    .where(eq(assessmentRouteSetsTable.id, first.routeSetId));
  if (unchanged[0]!.routeRevisionKey !== manifestA.routeRevisionKey) {
    throw new Error("[pub] conflicting publish mutated existing contract");
  }

  // Membership untouched check: create a membership pointing at published route
  const membershipUser = "88888888-8888-4888-8888-888888888881";
  await pool.query(
    `
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', $1::uuid, 'authenticated', 'authenticated',
      'pub_proof@example.com', crypt('x', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    ) ON CONFLICT (id) DO NOTHING
    `,
    [membershipUser],
  );
  await pool.query(
    `
    INSERT INTO public.profiles (id, full_name, username)
    VALUES ($1::uuid, 'Pub Proof', 'pub_proof')
    ON CONFLICT (id) DO NOTHING
    `,
    [membershipUser],
  );
  await pool.query(
    `
    INSERT INTO public.user_subjects (
      user_id, subject_id, syllabus_version_id, assessment_route_id,
      intended_exam_year, intended_exam_series
    ) VALUES ($1::uuid, $2, $3, $4, 2027, 'May/June')
    `,
    [membershipUser, seeded.subjectId, seeded.versionId, routes[0]!.id],
  );

  // Replacement: new revision key
  const manifestB = publishableManifest({
    routeRevisionKey: "8999-routes-v2",
    routes: manifestA.routes.map((route) => ({
      ...route,
      label: `${route.label} v2`,
    })),
  });
  const replaced = await publishRouteManifest(manifestB, publishOpts);
  if (
    replaced.operation !== "published" ||
    replaced.previousPublishedRouteSetId !== first.routeSetId
  ) {
    throw new Error("[pub] replacement did not retire previous set");
  }

  const afterReplace = await database
    .select()
    .from(assessmentRouteSetsTable)
    .where(eq(assessmentRouteSetsTable.syllabusVersionId, seeded.versionId));
  const oldSet = afterReplace.find((row) => row.id === first.routeSetId);
  const newSet = afterReplace.find((row) => row.id === replaced.routeSetId);
  if (!oldSet || oldSet.lifecycle !== "retired") {
    throw new Error("[pub] old set not retired");
  }
  if (!newSet || newSet.lifecycle !== "published") {
    throw new Error("[pub] new set not published");
  }

  const oldRoutes = await database
    .select()
    .from(assessmentRoutesTable)
    .where(eq(assessmentRoutesTable.routeSetId, first.routeSetId));
  if (oldRoutes.length === 0) {
    throw new Error("[pub] retired child graph missing");
  }

  const membership = await database
    .select()
    .from(userSubjectsTable)
    .where(eq(userSubjectsTable.userId, membershipUser));
  if (membership[0]!.assessmentRouteId !== routes[0]!.id) {
    throw new Error("[pub] membership route rewritten during replacement");
  }

  // Failed replacement preserves old published
  const manifestC = publishableManifest({
    routeRevisionKey: "8999-routes-v3",
  });
  try {
    await publishRouteManifest(manifestC, {
      ...publishOpts,
      afterRetireBeforePublish: () => {
        throw new RouteManifestError(
          "injected_failure",
          "deliberate failure after retire before publish",
        );
      },
    });
    throw new Error("[pub] injected failure did not abort");
  } catch (error) {
    if (!(error instanceof RouteManifestError) || error.code !== "injected_failure") {
      throw error;
    }
  }

  const afterFail = await database
    .select()
    .from(assessmentRouteSetsTable)
    .where(eq(assessmentRouteSetsTable.syllabusVersionId, seeded.versionId));
  const stillPublished = afterFail.filter((row) => row.lifecycle === "published");
  if (stillPublished.length !== 1 || stillPublished[0]!.id !== replaced.routeSetId) {
    throw new Error("[pub] failed replacement did not preserve published set");
  }
  if (afterFail.some((row) => row.routeRevisionKey === "8999-routes-v3")) {
    throw new Error("[pub] partial replacement draft leaked after rollback");
  }

  // Concurrent same-manifest publish: both resolve deterministically
  const concurrent = await Promise.allSettled([
    publishRouteManifest(manifestB, publishOpts),
    publishRouteManifest(manifestB, publishOpts),
  ]);
  const fulfilled = concurrent.filter((result) => result.status === "fulfilled");
  if (fulfilled.length !== 2) {
    throw new Error("[pub] concurrent idempotent publish did not both settle successfully");
  }
  for (const result of fulfilled) {
    if (result.status !== "fulfilled") continue;
    if (
      result.value.operation !== "noop_existing" ||
      result.value.routeSetId !== replaced.routeSetId
    ) {
      throw new Error("[pub] concurrent publish produced unexpected result");
    }
  }

  const publishedCount = (
    await database
      .select()
      .from(assessmentRouteSetsTable)
      .where(eq(assessmentRouteSetsTable.syllabusVersionId, seeded.versionId))
  ).filter((row) => row.lifecycle === "published");
  if (publishedCount.length !== 1) {
    throw new Error("[pub] concurrent publish left multiple published sets");
  }

  // RLS / privilege: authenticated cannot INSERT route-reference rows
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL ROLE authenticated`);
    try {
      await client.query(
        `
        INSERT INTO public.assessment_route_sets (
          syllabus_version_id, route_revision_key, lifecycle
        ) VALUES ($1, 'auth-write', 'draft')
        `,
        [seeded.versionId],
      );
      throw new Error("[pub] authenticated INSERT into route sets was accepted");
    } catch (error) {
      if (error instanceof Error && error.message.includes("authenticated INSERT")) {
        throw error;
      }
    }
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }

  await pool.query(`DELETE FROM public.user_subjects WHERE user_id = $1::uuid`, [
    membershipUser,
  ]);
  await pool.query(`DELETE FROM public.profiles WHERE id = $1::uuid`, [
    membershipUser,
  ]);
  await pool.query(`DELETE FROM auth.users WHERE id = $1::uuid`, [
    membershipUser,
  ]);

  await cleanupRoutePublicationFixtures(pool);
}
