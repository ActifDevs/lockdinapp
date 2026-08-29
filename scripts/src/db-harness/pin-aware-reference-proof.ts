import type { Pool } from "pg";

const SUBJECT_CODE = "C1PIN01";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";

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
      crypt('c1-proof', gen_salt('bf')),
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

export async function provePinAwareReferenceContext(pool: Pool): Promise<void> {
  await pool.query(`DELETE FROM public.user_subjects WHERE user_id = ANY($1::uuid[])`, [
    [USER_A, USER_B],
  ]);
  await pool.query(`DELETE FROM public.subjects WHERE code = $1`, [SUBJECT_CODE]);
  await pool.query(`DELETE FROM auth.users WHERE id = ANY($1::uuid[])`, [
    [USER_A, USER_B],
  ]);

  const subject = await pool.query<{ id: number }>(
    `
    INSERT INTO public.subjects (code, name, color)
    VALUES ($1, 'C1 Pin Fixture', '#0f766e')
    RETURNING id
    `,
    [SUBJECT_CODE],
  );
  const subjectId = subject.rows[0]?.id;
  if (!subjectId) {
    throw new Error("[db-harness] C1 pin fixture subject was not created.");
  }

  const versions = await pool.query<{ id: number; is_current: boolean }>(
    `
    INSERT INTO public.syllabus_versions (
      subject_id, exam_board, qualification, label, is_current, source_file, lifecycle
    )
    VALUES
      ($1, 'Cambridge International', 'A Level', 'Graph A', true, 'c1-a.csv', 'published'),
      ($1, 'Cambridge International', 'A Level', 'Graph B', false, 'c1-b.csv', 'published'),
      ($1, 'Cambridge International', 'A Level', 'Graph Draft', false, 'c1-d.csv', 'draft')
    RETURNING id, is_current, source_file
    `,
    [subjectId],
  );

  const versionA = versions.rows.find((row) => row.is_current);
  const versionB = versions.rows.find(
    (row) => !row.is_current && versions.rows.indexOf(row) === 1,
  );
  const rowsByFile = await pool.query<{ id: number; source_file: string }>(
    `SELECT id, source_file FROM public.syllabus_versions WHERE subject_id = $1`,
    [subjectId],
  );
  const idA = rowsByFile.rows.find((row) => row.source_file === "c1-a.csv")?.id;
  const idB = rowsByFile.rows.find((row) => row.source_file === "c1-b.csv")?.id;
  const idDraft = rowsByFile.rows.find((row) => row.source_file === "c1-d.csv")?.id;
  if (!idA || !idB || !idDraft || !versionA) {
    throw new Error("[db-harness] C1 pin fixture versions were not created.");
  }

  const unitA = await pool.query<{ id: number }>(
    `
    INSERT INTO public.syllabus_units (subject_id, syllabus_version_id, title, order_index)
    VALUES ($1, $2, 'Unit A', 0)
    RETURNING id
    `,
    [subjectId, idA],
  );
  const unitB = await pool.query<{ id: number }>(
    `
    INSERT INTO public.syllabus_units (subject_id, syllabus_version_id, title, order_index)
    VALUES ($1, $2, 'Unit B', 0)
    RETURNING id
    `,
    [subjectId, idB],
  );

  const topicA = await pool.query<{ id: number }>(
    `
    INSERT INTO public.syllabus_topics (unit_id, subject_id, title, order_index)
    VALUES ($1, $2, 'Topic A', 0)
    RETURNING id
    `,
    [unitA.rows[0]!.id, subjectId],
  );
  const topicB = await pool.query<{ id: number }>(
    `
    INSERT INTO public.syllabus_topics (unit_id, subject_id, title, order_index)
    VALUES ($1, $2, 'Topic B', 0)
    RETURNING id
    `,
    [unitB.rows[0]!.id, subjectId],
  );

  await pool.query(
    `
    INSERT INTO public.assessment_components (
      syllabus_version_id, paper_code, level, component_name, order_index
    )
    VALUES
      ($1, 'C1/A', 'A Level', 'Paper A', 0),
      ($2, 'C1/B', 'A Level', 'Paper B', 0)
    `,
    [idA, idB],
  );

  const defaultTopicCount = await pool.query<{ n: string }>(
    `
    SELECT count(*)::text AS n
    FROM public.syllabus_topics AS topic
    JOIN public.syllabus_units AS unit ON unit.id = topic.unit_id
    JOIN public.syllabus_versions AS version ON version.id = unit.syllabus_version_id
    WHERE version.subject_id = $1 AND version.is_current = true
    `,
    [subjectId],
  );
  if (defaultTopicCount.rows[0]?.n !== "1") {
    throw new Error("[db-harness] Catalogue DEFAULT topic count mixed graphs.");
  }

  const mixedUnits = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM public.syllabus_units WHERE subject_id = $1`,
    [subjectId],
  );
  if (mixedUnits.rows[0]?.n !== "2") {
    throw new Error("[db-harness] Expected two version-scoped units.");
  }

  const unitsA = await pool.query<{ title: string }>(
    `SELECT title FROM public.syllabus_units WHERE syllabus_version_id = $1`,
    [idA],
  );
  const unitsB = await pool.query<{ title: string }>(
    `SELECT title FROM public.syllabus_units WHERE syllabus_version_id = $1`,
    [idB],
  );
  if (unitsA.rows.map((row) => row.title).join() !== "Unit A") {
    throw new Error("[db-harness] Version A graph mixed with B.");
  }
  if (unitsB.rows.map((row) => row.title).join() !== "Unit B") {
    throw new Error("[db-harness] Version B graph mixed with A.");
  }

  await insertAuthUser(pool, USER_A, "c1-user-a@example.test");
  await insertAuthUser(pool, USER_B, "c1-user-b@example.test");

  await pool.query(
    `
    INSERT INTO public.user_subjects (user_id, subject_id, syllabus_version_id)
    VALUES ($1::uuid, $3, $4), ($2::uuid, $3, $5)
    `,
    [USER_A, USER_B, subjectId, idA, idB],
  );

  const pinA = await pool.query<{ syllabus_version_id: number }>(
    `
    SELECT syllabus_version_id FROM public.user_subjects
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_A, subjectId],
  );
  const pinB = await pool.query<{ syllabus_version_id: number }>(
    `
    SELECT syllabus_version_id FROM public.user_subjects
    WHERE user_id = $1::uuid AND subject_id = $2
    `,
    [USER_B, subjectId],
  );
  if (pinA.rows[0]?.syllabus_version_id !== idA) {
    throw new Error("[db-harness] User A pin is not Graph A.");
  }
  if (pinB.rows[0]?.syllabus_version_id !== idB) {
    throw new Error("[db-harness] User B pin is not Graph B.");
  }
  if (pinA.rows[0]?.syllabus_version_id === pinB.rows[0]?.syllabus_version_id) {
    throw new Error("[db-harness] Cross-user pins collapsed.");
  }

  await pool.query(
    `
    INSERT INTO public.topic_progress (user_id, topic_id, status)
    VALUES ($1::uuid, $2, 'completed'), ($1::uuid, $3, 'completed')
    `,
    [USER_A, topicA.rows[0]!.id, topicB.rows[0]!.id],
  );

  const currentCompleted = await pool.query<{ n: string }>(
    `
    SELECT count(*)::text AS n
    FROM public.topic_progress AS progress
    JOIN public.syllabus_topics AS topic ON topic.id = progress.topic_id
    JOIN public.syllabus_units AS unit ON unit.id = topic.unit_id
    WHERE progress.user_id = $1::uuid
      AND progress.status = 'completed'
      AND unit.syllabus_version_id = $2
    `,
    [USER_A, idA],
  );
  if (currentCompleted.rows[0]?.n !== "1") {
    throw new Error("[db-harness] Off-pin progress inflated the pin universe.");
  }

  const storedOffPin = await pool.query<{ n: string }>(
    `
    SELECT count(*)::text AS n FROM public.topic_progress
    WHERE user_id = $1::uuid AND topic_id = $2
    `,
    [USER_A, topicB.rows[0]!.id],
  );
  if (storedOffPin.rows[0]?.n !== "1") {
    throw new Error("[db-harness] Historical off-pin progress was deleted.");
  }

  await pool.query(
    `
    INSERT INTO public.tasks (user_id, title, subject_id, topic_id, priority, completed)
    VALUES ($1::uuid, 'Historical B topic', $2, $3, 'medium', false)
    `,
    [USER_A, subjectId, topicB.rows[0]!.id],
  );
  const historicalTask = await pool.query<{ topic_id: number }>(
    `SELECT topic_id FROM public.tasks WHERE user_id = $1::uuid`,
    [USER_A],
  );
  if (historicalTask.rows[0]?.topic_id !== topicB.rows[0]!.id) {
    throw new Error("[db-harness] Historical task topic was remapped.");
  }

  const draftLifecycle = await pool.query<{ lifecycle: string }>(
    `SELECT lifecycle FROM public.syllabus_versions WHERE id = $1`,
    [idDraft],
  );
  if (draftLifecycle.rows[0]?.lifecycle !== "draft") {
    throw new Error("[db-harness] Draft fixture lifecycle is not draft.");
  }

  await pool.query(`DELETE FROM public.user_subjects WHERE user_id = ANY($1::uuid[])`, [
    [USER_A, USER_B],
  ]);
  await pool.query(`DELETE FROM public.tasks WHERE user_id = ANY($1::uuid[])`, [
    [USER_A, USER_B],
  ]);
  await pool.query(`DELETE FROM public.topic_progress WHERE user_id = ANY($1::uuid[])`, [
    [USER_A, USER_B],
  ]);
  await pool.query(`DELETE FROM public.subjects WHERE code = $1`, [SUBJECT_CODE]);
  await pool.query(`DELETE FROM auth.users WHERE id = ANY($1::uuid[])`, [
    [USER_A, USER_B],
  ]);
}
