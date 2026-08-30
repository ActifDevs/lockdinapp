import type { Pool } from "pg";
import type { ApplicabilityManifest } from "../syllabus/applicability-manifest.js";
import type { NormalizedSyllabus } from "../syllabus/normalize.js";

const SUBJECT_CODE = "R002X1";
const USER_ID = "ffffffff-ffff-4fff-8fff-fffffffffff6";

function syntheticSyllabus(
  label: "r001" | "r002",
): NormalizedSyllabus {
  return {
    subjectCode: SUBJECT_CODE,
    subjectName: "Synthetic Future Revision Subject",
    color: "#334155",
    csvFile: `SYNTHETIC-${SUBJECT_CODE}-${label}.csv`,
    examBoard: "Cambridge International",
    qualification: "Cambridge International AS & A Level",
    versionLabel: `SYNTHETIC ${label} — not Cambridge curriculum content`,
    validFrom: null,
    validTo: null,
    isCurrent: false,
    units: [
      {
        title: label === "r001" ? "Historical Unit" : "Successor Unit",
        orderIndex: 0,
        topics: [
          {
            title: label === "r001" ? "Historical Topic" : "Successor Topic",
            orderIndex: 0,
            learningOutcomes: [
              {
                outcome:
                  label === "r001"
                    ? "SYNTHETIC r001 outcome only"
                    : "SYNTHETIC r002 outcome only",
                orderIndex: 0,
                occurrences: [{ componentKey: "SX/1|AS Level", level: "AS Level" }],
              },
            ],
          },
        ],
      },
    ],
    components: [
      {
        paperCode: "SX/1",
        level: "AS Level",
        componentName: "Paper 1",
        durationMinutes: 60,
        totalMarks: 40,
        weightingPercent: 50,
        orderIndex: 0,
      },
    ],
    notices: [],
  };
}

function manifestFor(
  key: "r001" | "r002",
  sha: string,
  fromYear: number,
  toYear: number,
): ApplicabilityManifest {
  return {
    schemaVersion: 1,
    provenance: {
      report: "docs/cursor/reports/111-phase6-slice4-release-operational-hardening.md",
      researchArtifact: "synthetic fixture",
      ownerDecision: "Disposable r001→r002 lifecycle proof only",
    },
    versions: [
      {
        subjectCode: SUBJECT_CODE,
        logicalRevisionKey: `${SUBJECT_CODE}-${key}`,
        expectedContentSha256: sha,
        applicability: {
          from: { year: fromYear, series: "May/June" },
          to: { year: toYear, series: "Oct/Nov" },
        },
        seriesPolicy: {
          "Feb/Mar": false,
          "May/June": true,
          "Oct/Nov": true,
        },
      },
    ],
  };
}

async function insertAuthUser(pool: Pool): Promise<void> {
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
      'r002-lifecycle@example.test',
      crypt('r002-proof', gen_salt('bf')),
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
    [USER_ID],
  );
}

export async function proveFutureRevisionLifecycle(pool: Pool): Promise<void> {
  const { eq } = await import("drizzle-orm");
  const { db, subjectsTable } = await import("@workspace/db");
  const { applyApplicabilityPopulation } = await import(
    "../syllabus/applicability-populate.js"
  );
  const { hashNormalizedSyllabus } = await import("../syllabus/canonical-graph.js");
  const { importSyllabusRevision } = await import("../syllabus/db-upsert.js");
  const { publishSyllabusRevision } = await import("../syllabus/publish.js");

  await pool.query(`DELETE FROM public.user_subjects WHERE user_id = $1::uuid`, [
    USER_ID,
  ]);
  await pool.query(`DELETE FROM public.tasks WHERE user_id = $1::uuid`, [USER_ID]);
  await pool.query(`DELETE FROM public.profiles WHERE id = $1::uuid`, [USER_ID]);
  await pool.query(`DELETE FROM public.subjects WHERE code = $1`, [SUBJECT_CODE]);
  await pool.query(`DELETE FROM auth.users WHERE id = $1::uuid`, [USER_ID]);

  const r001 = syntheticSyllabus("r001");
  const r002 = syntheticSyllabus("r002");
  const r001Sha = hashNormalizedSyllabus(r001);
  const r002Sha = hashNormalizedSyllabus(r002);
  if (r001Sha === r002Sha) {
    throw new Error("[db-harness] Synthetic r001 and r002 graphs must differ.");
  }

  const importedR001 = await importSyllabusRevision(r001, `${SUBJECT_CODE}-r001`);
  if (importedR001.operation !== "draft-created") {
    throw new Error("[db-harness] r001 import did not create a draft.");
  }
  await publishSyllabusRevision({
    subjectCode: SUBJECT_CODE,
    logicalRevisionKey: `${SUBJECT_CODE}-r001`,
    makeDefault: true,
  });
  await applyApplicabilityPopulation(manifestFor("r001", r001Sha, 2020, 2026));

  const [subject] = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.code, SUBJECT_CODE));
  if (!subject) throw new Error("[db-harness] Synthetic subject missing.");

  const r001Id = await pool.query<{ id: number }>(
    `
    SELECT id FROM public.syllabus_versions
    WHERE logical_revision_key = $1
    `,
    [`${SUBJECT_CODE}-r001`],
  );
  const publishedR001 = r001Id.rows[0]!.id;

  await insertAuthUser(pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: USER_ID, role: "authenticated" }),
    ]);
    await client.query(
      `
      SELECT public.lockdin_complete_onboarding(
        'R002 Student',
        'r002_user',
        'AS Level (Year 12)',
        'May/June 2024',
        ARRAY[$1]::integer[],
        2024,
        'May/June'::public.exam_sitting_series,
        NULL, NULL, NULL
      )
      `,
      [subject.id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  const pinBefore = await pool.query<{
    syllabus_version_id: number;
    intended_exam_year: number | null;
    intended_exam_series: string | null;
  }>(
    `
    SELECT syllabus_version_id, intended_exam_year, intended_exam_series
    FROM public.user_subjects
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_ID, subject.id],
  );
  if (pinBefore.rows[0]?.syllabus_version_id !== publishedR001) {
    throw new Error("[db-harness] Existing membership was not pinned to r001.");
  }

  const importedR002 = await importSyllabusRevision(r002, `${SUBJECT_CODE}-r002`);
  if (importedR002.operation !== "draft-created") {
    throw new Error("[db-harness] r002 import did not create a distinct draft.");
  }
  await applyApplicabilityPopulation(manifestFor("r002", r002Sha, 2027, 2033));
  await publishSyllabusRevision({
    subjectCode: SUBJECT_CODE,
    logicalRevisionKey: `${SUBJECT_CODE}-r002`,
    makeDefault: false,
  });

  const defaultAfterPublish = await pool.query<{ logical_revision_key: string }>(
    `
    SELECT logical_revision_key
    FROM public.syllabus_versions
    WHERE subject_id = $1 AND is_current
    `,
    [subject.id],
  );
  if (defaultAfterPublish.rows[0]?.logical_revision_key !== `${SUBJECT_CODE}-r001`) {
    throw new Error("[db-harness] Publishing r002 mutated DEFAULT.");
  }

  const r002Id = await pool.query<{ id: number }>(
    `SELECT id FROM public.syllabus_versions WHERE logical_revision_key = $1`,
    [`${SUBJECT_CODE}-r002`],
  );
  const publishedR002 = r002Id.rows[0]!.id;

  const future = await pool.query<{ id: number }>(
    `
    SELECT public.lockdin_resolve_applicable_syllabus_version(
      $1, 2031, 'May/June'::public.exam_sitting_series
    ) AS id
    `,
    [subject.id],
  );
  if (future.rows[0]?.id !== publishedR002) {
    throw new Error("[db-harness] Future valid session did not resolve to r002.");
  }

  const historical = await pool.query<{ id: number }>(
    `
    SELECT public.lockdin_resolve_applicable_syllabus_version(
      $1, 2024, 'May/June'::public.exam_sitting_series
    ) AS id
    `,
    [subject.id],
  );
  if (historical.rows[0]?.id !== publishedR001) {
    throw new Error("[db-harness] Historical session did not remain on r001.");
  }

  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET is_current = false
    WHERE subject_id = $1 AND is_current
    `,
    [subject.id],
  );
  await pool.query(
    `
    UPDATE public.syllabus_versions
    SET is_current = true
    WHERE id = $1 AND lifecycle = 'published'
    `,
    [publishedR002],
  );

  const pinAfter = await pool.query<{ syllabus_version_id: number }>(
    `
    SELECT syllabus_version_id
    FROM public.user_subjects
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_ID, subject.id],
  );
  if (pinAfter.rows[0]?.syllabus_version_id !== publishedR001) {
    throw new Error("[db-harness] Promoting r002 automatically repinned the membership.");
  }

  const publicDefault = await pool.query<{ logical_revision_key: string }>(
    `
    SELECT logical_revision_key
    FROM public.syllabus_versions
    WHERE subject_id = $1 AND is_current AND lifecycle = 'published'
    `,
    [subject.id],
  );
  if (publicDefault.rows[0]?.logical_revision_key !== `${SUBJECT_CODE}-r002`) {
    throw new Error("[db-harness] Un-enrolled DEFAULT did not become r002 after promotion.");
  }

  const rewrite = await importSyllabusRevision(
    syntheticSyllabus("r002"),
    `${SUBJECT_CODE}-r001`,
  ).then(
    () => "wrote",
    (error: unknown) => (error instanceof Error ? error.message : String(error)),
  );
  if (typeof rewrite === "string" && !rewrite.includes("immutable")) {
    if (rewrite === "wrote") {
      throw new Error("[db-harness] Published r001 was silently overwritten.");
    }
  }

  try {
    await pool.query(
      `
      UPDATE public.syllabus_versions
      SET
        applicable_from_year = 2024,
        applicable_from_series = 'May/June',
        applicable_to_year = 2026,
        applicable_to_series = 'Oct/Nov'
      WHERE id = $1
      `,
      [publishedR002],
    );
    throw new Error("[db-harness] Overlapping published windows were accepted.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "[db-harness] Overlapping published windows were accepted.") {
      throw error;
    }
    if (
      !message.includes("exclusion") &&
      !message.includes("applicable_session_range") &&
      !message.includes("overlap")
    ) {
      throw error;
    }
  }

  await pool.query(`DELETE FROM public.user_subjects WHERE user_id = $1::uuid`, [
    USER_ID,
  ]);
  await pool.query(`DELETE FROM public.tasks WHERE user_id = $1::uuid`, [USER_ID]);
  await pool.query(`DELETE FROM public.profiles WHERE id = $1::uuid`, [USER_ID]);
  await pool.query(`DELETE FROM public.subjects WHERE code = $1`, [SUBJECT_CODE]);
  await pool.query(`DELETE FROM auth.users WHERE id = $1::uuid`, [USER_ID]);
}
