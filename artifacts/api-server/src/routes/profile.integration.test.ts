/**
 * Local Supabase integration tests for profile routes and atomic onboarding.
 * Run via: pnpm --filter @workspace/api-server test:integration
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import {
  VALID_MAY_JUNE_2027,
  VALID_OCT_NOV_2027,
} from "../test/assignment-session.js";
import { loadCommittedMigrationJournal } from "../test/committed-migrations.js";
import { loadHarnessSupabaseEnv } from "../test/harness-supabase.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");
const env = loadHarnessSupabaseEnv();

describe("profile and atomic onboarding (local)", () => {
  let app: express.Express;
  let admin: ReturnType<typeof createClient>;
  let db: typeof import("@workspace/db").db;
  let userAId = "";
  let userBId = "";
  let tokenA = "";
  let tokenB = "";
  let subjectIds: number[] = [];

  const mkUser = async (label: string, fullName: string) => {
    const email = `slice3-${label}-${crypto.randomUUID()}@example.test`;
    const password = `Tmp-${crypto.randomUUID()}!Aa1`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) throw error ?? new Error("createUser failed");
    const pub = createClient(env.url, env.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data: sess, error: se } = await pub.auth.signInWithPassword({
      email,
      password,
    });
    if (se || !sess.session) throw se ?? new Error("signIn failed");
    return { id: data.user.id, token: sess.session.access_token };
  };

  beforeAll(async () => {
    process.env.SUPABASE_URL = env.url;
    process.env.SUPABASE_PUBLISHABLE_KEY = env.publishableKey;
    process.env.DATABASE_URL = env.dbUrl;

    admin = createClient(env.url, env.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    ({ db } = await import("@workspace/db"));

    const a = await mkUser("user-a", "Alice Slice3");
    const b = await mkUser("user-b", "Bob Slice3");
    userAId = a.id;
    userBId = b.id;
    tokenA = a.token;
    tokenB = b.token;

    const subjects = await db.execute(sql`
      select subject.id
      from public.subjects subject
      join public.syllabus_versions version
        on version.subject_id = subject.id and version.is_current = true
      group by subject.id
      having count(version.id) = 1
      order by subject.id
      limit 6
    `);
    if (subjects.rows.length < 6) {
      throw new Error(
        "Local integration tests require at least six imported subjects",
      );
    }
    subjectIds = subjects.rows.map((subject) => Number(subject.id));
    const committed = loadCommittedMigrationJournal(repoRoot);
    const journal = await db.execute(sql`
      select count(*)::int as n from drizzle.__drizzle_migrations
    `);
    if (Number(journal.rows[0].n) !== committed.count) {
      throw new Error(
        `Local integration database journal count ${journal.rows[0].n} does not match committed head ${committed.latestTag} (${committed.count}). Apply Drizzle migrations through the current journal; do not use hosted Production.`,
      );
    }

    const { default: router } = await import("../routes/index.js");
    app = express();
    app.use(express.json());
    app.use("/api", router);
  }, 120_000);

  afterAll(async () => {
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  });

  it("anonymous profile is unauthorized", async () => {
    const res = await request(app).get("/api/profile");
    expect(res.status).toBe(401);
  });

  it("bootstrap profiles exist with metadata and null onboarding", async () => {
    const resA = await request(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(resA.status).toBe(200);
    expect(resA.body.fullName).toBe("Alice Slice3");
    expect(resA.body.username).toBeNull();
    expect(resA.body.onboardedAt).toBeNull();
    expect(resA.body.id).toBe(userAId);

    const resB = await request(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(resB.status).toBe(200);
    expect(resB.body.id).toBe(userBId);
    expect(resB.body.id).not.toBe(userAId);
  });

  it("profile update allows only safe fields", async () => {
    const ok = await request(app)
      .patch("/api/profile")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        fullName: "Alice Updated",
        level: "AS Level (Year 12)",
        examSession: "May/June 2027",
      });
    expect(ok.status).toBe(200);
    expect(ok.body.fullName).toBe("Alice Updated");
    expect(ok.body.level).toBe("AS Level (Year 12)");
    expect(ok.body.examSession).toBe("May/June 2027");

    const forbidden = await request(app)
      .patch("/api/profile")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ username: "hijack", onboardedAt: new Date().toISOString() });
    expect(forbidden.status).toBe(400);

    const withId = await request(app)
      .patch("/api/profile")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ id: userBId, fullName: "Nope" });
    expect(withId.status).toBe(400);
  });

  it("completes onboarding atomically for A", async () => {
    const username = `alice_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const pick = subjectIds.slice(0, Math.min(2, subjectIds.length));

    const res = await request(app)
      .post("/api/profile/complete-onboarding")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        fullName: "Alice Updated",
        username: username.toUpperCase(),
        level: "AS Level (Year 12)",
        examSession: "May/June 2027",
        intendedExamSession: VALID_MAY_JUNE_2027,
        subjectIds: pick,
      });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(username.toLowerCase());
    expect(res.body.onboardedAt).toBeTruthy();

    const tasks = await db.execute(sql`
      select id, user_id, subject_id, title, deadline::text as deadline, priority, estimated_minutes
      from public.tasks where user_id = ${userAId} order by subject_id
    `);
    expect(tasks.rows).toHaveLength(pick.length);
    for (const row of tasks.rows as Array<Record<string, unknown>>) {
      expect(row.user_id).toBe(userAId);
      expect(row.priority).toBe("medium");
      expect(row.estimated_minutes).toBe(30);
      expect(row.title).toMatch(/^Review .+ syllabus overview$/);
      expect(pick).toContain(row.subject_id);
    }

    const memberships = await db.execute(sql`
      select membership.subject_id, membership.syllabus_version_id, version.subject_id as version_subject_id
      from public.user_subjects membership
      join public.syllabus_versions version on version.id = membership.syllabus_version_id
      where membership.user_id = ${userAId}
      order by membership.subject_id
    `);
    expect(memberships.rows).toHaveLength(pick.length);
    expect(memberships.rows.map((row) => Number(row.subject_id))).toEqual(
      [...pick].sort((a, b) => a - b),
    );
    for (const row of memberships.rows) {
      expect(row.version_subject_id).toBe(row.subject_id);
    }

    const bTasks = await db.execute(sql`
      select count(*)::int as n from public.tasks where user_id = ${userBId}
    `);
    expect(Number((bTasks.rows[0] as { n: number }).n)).toBe(0);

    // Idempotent retry with same username
    const retry = await request(app)
      .post("/api/profile/complete-onboarding")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        fullName: "Alice Updated",
        username,
        level: "AS Level (Year 12)",
        examSession: "May/June 2027",
        intendedExamSession: VALID_MAY_JUNE_2027,
        subjectIds: pick,
      });
    expect(retry.status).toBe(200);
    expect(retry.body.username).toBe(username.toLowerCase());

    const tasksAfter = await db.execute(sql`
      select count(*)::int as n from public.tasks where user_id = ${userAId}
    `);
    expect(Number((tasksAfter.rows[0] as { n: number }).n)).toBe(pick.length);
    const membershipsAfter = await db.execute(sql`
      select count(*)::int as n from public.user_subjects where user_id = ${userAId}
    `);
    expect(Number((membershipsAfter.rows[0] as { n: number }).n)).toBe(
      pick.length,
    );

    // B cannot take A's username
    const clash = await request(app)
      .post("/api/profile/complete-onboarding")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({
        fullName: "Bob Slice3",
        username,
        level: "A2 Level (Year 13)",
        examSession: "Oct/Nov 2027",
        intendedExamSession: VALID_OCT_NOV_2027,
        subjectIds: [pick[0]],
      });
    expect(clash.status).toBe(409);
    expect(clash.body.error).toBe("Username is unavailable.");
    expect(JSON.stringify(clash.body)).not.toContain(userAId);

    const bUsername = `bob_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const bOk = await request(app)
      .post("/api/profile/complete-onboarding")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({
        fullName: "Bob Slice3",
        username: bUsername,
        level: "A2 Level (Year 13)",
        examSession: "Oct/Nov 2027",
        intendedExamSession: VALID_OCT_NOV_2027,
        subjectIds: [pick[0]],
      });
    expect(bOk.status).toBe(200);
    expect(bOk.body.username).toBe(bUsername);
  });

  it("rejects invalid onboarding payloads", async () => {
    // Use a fresh user so onboarding isn't already completed
    const email = `slice3-val-${crypto.randomUUID()}@example.test`;
    const password = `Tmp-${crypto.randomUUID()}!Aa1`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Val User" },
    });
    if (error || !data.user) throw error ?? new Error("createUser failed");
    const pub = createClient(env.url, env.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data: sess } = await pub.auth.signInWithPassword({
      email,
      password,
    });
    const token = sess!.session!.access_token;
    const uid = data.user.id;

    try {
      const cases = [
        { username: "ab", subjectIds: [subjectIds[0]] },
        { username: "a".repeat(25), subjectIds: [subjectIds[0]] },
        { username: "Bad-Name", subjectIds: [subjectIds[0]] },
        { username: "valid_user_x", subjectIds: [] },
        {
          username: "valid_user_y",
          subjectIds:
            subjectIds.length >= 1 ? [subjectIds[0], subjectIds[0]] : [1, 1],
        },
        { username: "valid_user_z", subjectIds: [999999] },
        {
          username: "valid_user_w",
          subjectIds: subjectIds.slice(0, 6),
        },
      ];

      for (const c of cases) {
        const res = await request(app)
          .post("/api/profile/complete-onboarding")
          .set("Authorization", `Bearer ${token}`)
          .send({
            fullName: "Val User",
            username: c.username,
            level: "AS Level (Year 12)",
            examSession: "May/June 2027",
            intendedExamSession: VALID_MAY_JUNE_2027,
            subjectIds: c.subjectIds,
          });
        expect([400, 409]).toContain(res.status);
        if (c.username === "valid_user_w" && c.subjectIds.length > 5) {
          expect(res.status).toBe(400);
        }
      }

      const blankName = await request(app)
        .post("/api/profile/complete-onboarding")
        .set("Authorization", `Bearer ${token}`)
        .send({
          fullName: " ",
          username: "valid_blank",
          level: "AS Level (Year 12)",
          examSession: "May/June 2027",
          intendedExamSession: VALID_MAY_JUNE_2027,
          subjectIds: [subjectIds[0]],
        });
      expect(blankName.status).toBe(400);
    } finally {
      await admin.auth.admin.deleteUser(uid);
    }
  });

  it.each([1, 2, 3, 4, 5])(
    "onboards with %i selected subject(s)",
    async (count) => {
      const user = await mkUser(`boundary-${count}`, `Boundary ${count}`);
      try {
        const response = await request(app)
          .post("/api/profile/complete-onboarding")
          .set("Authorization", `Bearer ${user.token}`)
          .send({
            fullName: `Boundary ${count}`,
            username: `boundary_${count}_${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`,
            level: "AS Level (Year 12)",
            examSession: "May/June 2027",
            intendedExamSession: VALID_MAY_JUNE_2027,
            subjectIds: subjectIds.slice(0, count),
          });
        expect(response.status).toBe(200);

        const state = await db.execute(sql`
        select
          (select count(*)::int from public.user_subjects where user_id = ${user.id}) memberships,
          (select count(*)::int from public.tasks where user_id = ${user.id}) tasks
      `);
        expect(Number(state.rows[0].memberships)).toBe(count);
        expect(Number(state.rows[0].tasks)).toBe(count);
      } finally {
        await admin.auth.admin.deleteUser(user.id);
      }
    },
  );

  it("rejects invalid selections inside the onboarding RPC without partial state", async () => {
    const user = await mkUser("rpc-boundaries", "RPC Boundaries");
    const scoped = createClient(env.url, env.publishableKey, {
      global: { headers: { Authorization: `Bearer ${user.token}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const invoke = (ids: number[]) =>
      scoped.rpc("lockdin_complete_onboarding", {
        p_full_name: "RPC Boundaries",
        p_username: `rpc_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
        p_level: "AS Level (Year 12)",
        p_exam_session: "May/June 2027",
        p_subject_ids: ids,
      });

    try {
      for (const ids of [
        [],
        subjectIds.slice(0, 6),
        [subjectIds[0], subjectIds[0]],
        [999999],
      ]) {
        const { error } = await invoke(ids);
        expect(error).toBeTruthy();
      }
      const state = await db.execute(sql`
        select
          (select onboarded_at from public.profiles where id = ${user.id}) onboarded_at,
          (select count(*)::int from public.user_subjects where user_id = ${user.id}) memberships,
          (select count(*)::int from public.tasks where user_id = ${user.id}) tasks
      `);
      expect(state.rows[0].onboarded_at).toBeNull();
      expect(Number(state.rows[0].memberships)).toBe(0);
      expect(Number(state.rows[0].tasks)).toBe(0);
    } finally {
      await admin.auth.admin.deleteUser(user.id);
    }
  });

  it("lists and atomically replaces only the caller's memberships", async () => {
    const listA = await request(app)
      .get("/api/user-subjects")
      .set("Authorization", `Bearer ${tokenA}`);
    const listB = await request(app)
      .get("/api/user-subjects")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(listA.status).toBe(200);
    expect(
      listA.body.map((item: { subject: { id: number } }) => item.subject.id),
    ).toEqual(subjectIds.slice(0, 2).sort((a, b) => a - b));
    expect(listB.status).toBe(200);
    expect(listB.body).toHaveLength(1);
    for (const membership of [...listA.body, ...listB.body]) {
      expect(membership.subject).toEqual({
        id: expect.any(Number),
        name: expect.any(String),
        code: expect.any(String),
        color: expect.any(String),
        topicsTotal: expect.any(Number),
      });
      expect(membership.subject).not.toHaveProperty("syllabusProgress");
      expect(membership.subject).not.toHaveProperty("topicsCompleted");
      expect(membership.subject).not.toHaveProperty("upcomingTasksCount");
      expect(membership.subject).not.toHaveProperty("recentPaperScore");
    }

    const replaceFor = async (token: string, selected: number[]) => {
      const response = await request(app)
        .put("/api/user-subjects")
        .set("Authorization", `Bearer ${token}`)
        .send({
          subjectIds: selected,
          intendedExamSession: VALID_MAY_JUNE_2027,
        });
      expect(response.status).toBe(200);
      expect(
        response.body.map(
          (item: { subject: { id: number } }) => item.subject.id,
        ),
      ).toEqual([...selected].sort((a, b) => a - b));
    };

    await replaceFor(tokenA, [subjectIds[0]]);
    await replaceFor(tokenA, subjectIds.slice(0, 5));
    await replaceFor(tokenA, [subjectIds[5]]);
    await replaceFor(tokenA, [subjectIds[0]]);
    await replaceFor(tokenA, subjectIds.slice(1, 6));
    await replaceFor(tokenA, subjectIds.slice(1, 5));
    await replaceFor(tokenA, subjectIds.slice(0, 5));
    await replaceFor(tokenA, subjectIds.slice(0, 4));
    await replaceFor(tokenA, subjectIds.slice(0, 5));

    await replaceFor(tokenB, [subjectIds[5]]);
    const aAfterBReplacement = await request(app)
      .get("/api/user-subjects")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(aAfterBReplacement.status).toBe(200);
    expect(
      aAfterBReplacement.body.map(
        (item: { subject: { id: number } }) => item.subject.id,
      ),
    ).toEqual(subjectIds.slice(0, 5).sort((a, b) => a - b));

    const tasksAfterReplacement = await db.execute(sql`
      select count(*)::int as n from public.tasks where user_id = ${userAId}
    `);
    expect(Number(tasksAfterReplacement.rows[0].n)).toBe(2);

    const invalid = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ subjectIds: [999999] });
    expect(invalid.status).toBe(400);

    const unchanged = await request(app)
      .get("/api/user-subjects")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(unchanged.body).toHaveLength(5);

    const spoof = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ userId: userBId, subjectIds: [subjectIds[0]] });
    expect(spoof.status).toBe(400);

    const bUnchanged = await request(app)
      .get("/api/user-subjects")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(bUnchanged.body).toHaveLength(1);

    const integrity = await db.execute(sql`
      select membership.subject_id,
             membership.syllabus_version_id,
             version.is_current,
             version.subject_id as version_subject_id
      from public.user_subjects membership
      join public.syllabus_versions version
        on version.id = membership.syllabus_version_id
      where membership.user_id = ${userAId}
      order by membership.subject_id
    `);
    expect(integrity.rows).toHaveLength(5);
    expect(new Set(integrity.rows.map((row) => row.subject_id)).size).toBe(5);
    expect(integrity.rows.every((row) => row.is_current === true)).toBe(true);
    expect(
      integrity.rows.every((row) => row.subject_id === row.version_subject_id),
    ).toBe(true);
  });

  it("preserves existing syllabus version pins on replace while pinning new subjects to current", async () => {
    const user = await mkUser("pin-preserve", "Pin Preserve");
    const keptSubject = subjectIds[0]!;
    const droppedSubject = subjectIds[1]!;
    const newSubject = subjectIds[2]!;
    let extraVersionId: number | null = null;
    let originalVersionId: number | null = null;

    try {
      const onboard = await request(app)
        .post("/api/profile/complete-onboarding")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          fullName: "Pin Preserve",
          username: `pin_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
          level: "AS Level (Year 12)",
          examSession: "May/June 2027",
          intendedExamSession: VALID_MAY_JUNE_2027,
          subjectIds: [keptSubject, droppedSubject],
        });
      expect(onboard.status).toBe(200);

      const before = await db.execute(sql`
        select membership.subject_id, membership.syllabus_version_id, version.is_current
        from public.user_subjects membership
        join public.syllabus_versions version
          on version.id = membership.syllabus_version_id
        where membership.user_id = ${user.id}
        order by membership.subject_id
      `);
      expect(before.rows).toHaveLength(2);
      expect(before.rows.every((row) => row.is_current === true)).toBe(true);
      originalVersionId = Number(
        before.rows.find((row) => Number(row.subject_id) === keptSubject)!
          .syllabus_version_id,
      );

      const originalMeta = await db.execute(sql`
        select exam_board, qualification
        from public.syllabus_versions
        where id = ${originalVersionId}
      `);
      const examBoard = String(originalMeta.rows[0].exam_board);
      const qualification = String(originalMeta.rows[0].qualification);

      const inserted = await db.execute(sql`
        insert into public.syllabus_versions (
          subject_id, exam_board, qualification, label, is_current, source_file
        )
        values (
          ${keptSubject},
          ${examBoard},
          ${qualification},
          'Successor syllabus (test)',
          false,
          ${`pin-preserve-test-${crypto.randomUUID()}.csv`}
        )
        returning id
      `);
      extraVersionId = Number(inserted.rows[0].id);

      await db.execute(sql`
        update public.syllabus_versions
        set is_current = false
        where id = ${originalVersionId}
      `);
      await db.execute(sql`
        update public.syllabus_versions
        set is_current = true
        where id = ${extraVersionId}
      `);

      const replaced = await request(app)
        .put("/api/user-subjects")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          subjectIds: [keptSubject, newSubject],
          intendedExamSession: VALID_MAY_JUNE_2027,
        });
      expect(replaced.status).toBe(200);
      expect(
        replaced.body.map((item: { subject: { id: number } }) => item.subject.id),
      ).toEqual([keptSubject, newSubject].sort((a, b) => a - b));

      const after = await db.execute(sql`
        select membership.subject_id, membership.syllabus_version_id
        from public.user_subjects membership
        where membership.user_id = ${user.id}
        order by membership.subject_id
      `);
      expect(after.rows.map((row) => Number(row.subject_id))).toEqual(
        [keptSubject, newSubject].sort((a, b) => a - b),
      );
      expect(
        Number(
          after.rows.find((row) => Number(row.subject_id) === keptSubject)!
            .syllabus_version_id,
        ),
      ).toBe(originalVersionId);
      expect(after.rows.some((row) => Number(row.subject_id) === droppedSubject)).toBe(
        false,
      );

      const newPin = await db.execute(sql`
        select membership.syllabus_version_id, version.is_current, version.id
        from public.user_subjects membership
        join public.syllabus_versions version
          on version.id = membership.syllabus_version_id
        where membership.user_id = ${user.id}
          and membership.subject_id = ${newSubject}
      `);
      expect(newPin.rows).toHaveLength(1);
      expect(newPin.rows[0].is_current).toBe(true);
      expect(Number(newPin.rows[0].syllabus_version_id)).not.toBe(
        extraVersionId,
      );
    } finally {
      if (extraVersionId != null) {
        await db.execute(sql`
          update public.syllabus_versions
          set is_current = false
          where id = ${extraVersionId}
        `);
      }
      if (originalVersionId != null) {
        await db.execute(sql`
          update public.syllabus_versions
          set is_current = true
          where id = ${originalVersionId}
        `);
      }
      if (extraVersionId != null) {
        await db.execute(sql`
          delete from public.syllabus_versions where id = ${extraVersionId}
        `);
      }
      await admin.auth.admin.deleteUser(user.id);
    }
  });

  it("allows owner SELECT but denies all direct Data API membership writes", async () => {
    const userA = createClient(env.url, env.publishableKey, {
      global: { headers: { Authorization: `Bearer ${tokenA}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const userB = createClient(env.url, env.publishableKey, {
      global: { headers: { Authorization: `Bearer ${tokenB}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const anonymous = createClient(env.url, env.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const versions = await db.execute(sql`
      select subject_id, id from public.syllabus_versions
      where is_current = true and subject_id in (
        ${sql.join(
          subjectIds.map((id) => sql`${id}`),
          sql`, `,
        )}
      )
    `);
    const versionBySubject = new Map(
      versions.rows.map((row) => [Number(row.subject_id), Number(row.id)]),
    );

    const own = await userA.from("user_subjects").select("user_id, subject_id");
    expect(own.error).toBeNull();
    expect(own.data).toHaveLength(5);
    expect(own.data?.every((row) => row.user_id === userAId)).toBe(true);
    const ownB = await userB
      .from("user_subjects")
      .select("user_id, subject_id");
    expect(ownB.error).toBeNull();
    expect(ownB.data).toHaveLength(1);
    expect(ownB.data?.every((row) => row.user_id === userBId)).toBe(true);

    const anonymousSelect = await anonymous
      .from("user_subjects")
      .select("user_id, subject_id");
    expect(anonymousSelect.error).toMatchObject({ code: "42501" });

    const expectWriteDenied = (
      error: { code?: string; message?: string } | null,
    ) => {
      expect(error).toMatchObject({ code: "42501" });
      expect(error?.message).toContain("permission denied");
    };

    const crossInsert = await userA.from("user_subjects").insert({
      user_id: userBId,
      subject_id: subjectIds[1],
      syllabus_version_id: versionBySubject.get(subjectIds[1])!,
    });
    expectWriteDenied(crossInsert.error);

    const ownInsert = await userA.from("user_subjects").insert({
      user_id: userAId,
      subject_id: subjectIds[5],
      syllabus_version_id: versionBySubject.get(subjectIds[5])!,
    });
    expectWriteDenied(ownInsert.error);

    const crossUpdate = await userA
      .from("user_subjects")
      .update({ syllabus_version_id: versionBySubject.get(subjectIds[0])! })
      .eq("user_id", userBId)
      .select();
    expectWriteDenied(crossUpdate.error);

    const crossDelete = await userA
      .from("user_subjects")
      .delete()
      .eq("user_id", userBId)
      .select();
    expectWriteDenied(crossDelete.error);

    const bCrossUpdate = await userB
      .from("user_subjects")
      .update({ syllabus_version_id: versionBySubject.get(subjectIds[0])! })
      .eq("user_id", userAId)
      .select();
    expectWriteDenied(bCrossUpdate.error);

    const bCrossDelete = await userB
      .from("user_subjects")
      .delete()
      .eq("user_id", userAId)
      .select();
    expectWriteDenied(bCrossDelete.error);

    const ownSubject = subjectIds[4];
    const ownUpdate = await userA
      .from("user_subjects")
      .update({ syllabus_version_id: versionBySubject.get(ownSubject)! })
      .eq("subject_id", ownSubject)
      .select();
    expectWriteDenied(ownUpdate.error);

    const ownDelete = await userA
      .from("user_subjects")
      .delete()
      .eq("subject_id", ownSubject)
      .select();
    expectWriteDenied(ownDelete.error);

    await expect(
      db.execute(sql`
        insert into public.user_subjects (user_id, subject_id, syllabus_version_id)
        values (
          ${userAId},
          ${subjectIds[5]},
          ${versionBySubject.get(subjectIds[5])!}
        )
      `),
    ).rejects.toMatchObject({
      cause: {
        message: expect.stringContaining("user_subject_limit_exceeded"),
      },
    });

    const bCount = await db.execute(sql`
      select count(*)::int as n from public.user_subjects where user_id = ${userBId}
    `);
    expect(Number(bCount.rows[0].n)).toBe(1);
  });

  it("rejects a mismatched subject and syllabus version at the database layer", async () => {
    const versions = await db.execute(sql`
      select subject_id, id from public.syllabus_versions
      where is_current = true and subject_id in (
        ${sql.join(
          subjectIds.slice(0, 2).map((id) => sql`${id}`),
          sql`, `,
        )}
      )
      order by subject_id
    `);
    const first = versions.rows[0];
    const second = versions.rows.find(
      (row) => row.subject_id !== first.subject_id,
    )!;

    await expect(
      db.execute(sql`
        insert into public.user_subjects (user_id, subject_id, syllabus_version_id)
        values (${userBId}, ${Number(second.subject_id)}, ${Number(first.id)})
      `),
    ).rejects.toMatchObject({
      cause: { constraint: "user_subjects_subject_version_fk" },
    });
  });

  it("has the reviewed membership schema, policies, grants, and migration journal", async () => {
    const columns = await db.execute(sql`
      select column_name, is_nullable
      from information_schema.columns
      where table_schema = 'public' and table_name = 'user_subjects'
      order by ordinal_position
    `);
    expect(columns.rows.map((row) => row.column_name)).toEqual([
      "user_id",
      "subject_id",
      "syllabus_version_id",
      "created_at",
      "updated_at",
      "intended_exam_year",
      "intended_exam_series",
      "assessment_route_id",
    ]);
    const required = new Set([
      "user_id",
      "subject_id",
      "syllabus_version_id",
      "created_at",
      "updated_at",
    ]);
    expect(
      columns.rows
        .filter((row) => required.has(String(row.column_name)))
        .every((row) => row.is_nullable === "NO"),
    ).toBe(true);
    expect(
      columns.rows.find((row) => row.column_name === "assessment_route_id")
        ?.is_nullable,
    ).toBe("YES");

    const constraints = await db.execute(sql`
      select conname
      from pg_constraint
      where conrelid = 'public.user_subjects'::regclass
      order by conname
    `);
    const constraintNames = constraints.rows.map((row) => row.conname);
    expect(constraintNames).toEqual(
      expect.arrayContaining([
        "user_subjects_user_id_subject_id_pk",
        "user_subjects_user_id_auth_users_id_fk",
        "user_subjects_subject_id_subjects_id_fk",
        "user_subjects_subject_version_fk",
        "user_subjects_user_id_subject_id_syllabus_version_id_unique",
        "user_subjects_assessment_route_fk",
      ]),
    );

    const security = await db.execute(sql`
      select c.relrowsecurity,
             array_agg(p.policyname order by p.policyname) policies
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
      where n.nspname = 'public' and c.relname = 'user_subjects'
      group by c.relrowsecurity
    `);
    expect(security.rows[0].relrowsecurity).toBe(true);
    expect(String(security.rows[0].policies)).toBe(
      "{user_subjects_select_own}",
    );

    const grants = await db.execute(sql`
      select grantee, privilege_type
      from information_schema.table_privileges
      where table_schema = 'public' and table_name = 'user_subjects'
        and grantee in ('PUBLIC', 'anon', 'authenticated')
      order by grantee, privilege_type
    `);
    expect(grants.rows).toEqual([
      { grantee: "authenticated", privilege_type: "SELECT" },
    ]);

    const journal = await db.execute(sql`
      select count(*)::int as n from drizzle.__drizzle_migrations
    `);
    expect(Number(journal.rows[0].n)).toBe(
      loadCommittedMigrationJournal(repoRoot).count,
    );
  });

  it("function privileges and definition are correct", async () => {
    const def = await db.execute(sql`
      select prosecdef, proconfig, pronargs
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'lockdin_complete_onboarding'
    `);
    expect(def.rows.length).toBeGreaterThan(0);
    expect(
      def.rows.every((row) => (row as { prosecdef: boolean }).prosecdef),
    ).toBe(true);
    expect(
      def.rows.every((row) =>
        ((row as { proconfig: string[] | null }).proconfig ?? []).includes(
          'search_path=""',
        ),
      ),
    ).toBe(true);
    expect(
      def.rows.some((row) => Number((row as { pronargs: number }).pronargs) === 5),
    ).toBe(true);
    expect(
      def.rows.some((row) => Number((row as { pronargs: number }).pronargs) === 10),
    ).toBe(true);

    const grants = await db.execute(sql`
      select grantee, privilege_type
      from information_schema.routine_privileges
      where routine_schema = 'public'
        and routine_name = 'lockdin_complete_onboarding'
    `);
    const grantees = grants.rows.map((r) => (r as { grantee: string }).grantee);
    expect(grantees).toContain("authenticated");
    expect(grantees).not.toContain("PUBLIC");
    expect(grantees).not.toContain("anon");

    const replaceDef = await db.execute(sql`
      select prosecdef, proconfig, pronargs
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'lockdin_replace_user_subjects'
    `);
    expect(replaceDef.rows.length).toBeGreaterThan(0);
    expect(
      replaceDef.rows.every((row) => (row as { prosecdef: boolean }).prosecdef),
    ).toBe(true);
    expect(
      replaceDef.rows.some((row) => Number((row as { pronargs: number }).pronargs) === 1),
    ).toBe(true);
    expect(
      replaceDef.rows.some((row) => Number((row as { pronargs: number }).pronargs) === 6),
    ).toBe(true);
    expect(
      replaceDef.rows.every((row) =>
        ((row as { proconfig: string[] | null }).proconfig ?? []).includes(
          'search_path=""',
        ),
      ),
    ).toBe(true);

    const replaceGrants = await db.execute(sql`
      select grantee
      from information_schema.routine_privileges
      where routine_schema = 'public'
        and routine_name = 'lockdin_replace_user_subjects'
    `);
    const replaceGrantees = replaceGrants.rows.map((row) => row.grantee);
    expect(replaceGrantees).toContain("authenticated");
    expect(replaceGrantees).not.toContain("PUBLIC");
    expect(replaceGrantees).not.toContain("anon");

    const replaceBody = await db.execute(sql`
      select p.proname, pg_get_functiondef(p.oid) as def
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'lockdin_replace_user_subjects',
          'lockdin_replace_user_subjects_apply'
        )
    `);
    const replaceDefs = replaceBody.rows.map((row) => String(row.def));
    expect(
      replaceDefs.some(
        (def) =>
          def.includes("ON CONFLICT (user_id, subject_id) DO NOTHING") ||
          def.includes("AND NOT EXISTS"),
      ),
    ).toBe(true);
    expect(
      replaceDefs.every(
        (def) => !def.includes("SET syllabus_version_id = EXCLUDED.syllabus_version_id"),
      ),
    ).toBe(true);
  });

  it("requires a structured intended session for new onboarding memberships", async () => {
    const user = await mkUser("strict-session", "Strict Session");
    try {
      const missing = await request(app)
        .post("/api/profile/complete-onboarding")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          fullName: "Strict Session",
          username: `strict_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
          level: "AS Level (Year 12)",
          examSession: "May/June 2027",
          subjectIds: [subjectIds[0]],
        });
      expect(missing.status).toBe(400);
      expect(missing.body.error).toBe("Choose a supported exam session.");
      expect(JSON.stringify(missing.body)).not.toMatch(/P0001|sql|postgres/i);
    } finally {
      await admin.auth.admin.deleteUser(user.id);
    }
  });

  it("denies Feb/Mar automatic assignment with a safe client error", async () => {
    const user = await mkUser("feb-mar", "Feb Mar");
    try {
      const denied = await request(app)
        .post("/api/profile/complete-onboarding")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          fullName: "Feb Mar",
          username: `febmar_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
          level: "AS Level (Year 12)",
          examSession: "Feb/Mar 2027",
          intendedExamSession: {
            year: 2027,
            series: "Feb/Mar",
          },
          subjectIds: [subjectIds[0]],
        });
      expect(denied.status).toBe(400);
      expect(denied.body.error).toBe("No syllabus matches that exam session.");
      expect(JSON.stringify(denied.body)).not.toMatch(/P0001|sql|postgres/i);
    } finally {
      await admin.auth.admin.deleteUser(user.id);
    }
  });

  it("denies an out-of-range session and accepts a per-subject override", async () => {
    const user = await mkUser("override-range", "Override Range");
    try {
      const outOfRange = await request(app)
        .post("/api/profile/complete-onboarding")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          fullName: "Override Range",
          username: `range_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
          level: "AS Level (Year 12)",
          examSession: "May/June 1999",
          intendedExamSession: { year: 1999, series: "May/June" },
          subjectIds: [subjectIds[0]],
        });
      expect(outOfRange.status).toBe(400);
      expect(outOfRange.body.error).toBe("No syllabus matches that exam session.");

      const mixed = await request(app)
        .post("/api/profile/complete-onboarding")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          fullName: "Override Range",
          username: `mix_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
          level: "AS Level (Year 12)",
          examSession: "May/June 2027",
          intendedExamSession: VALID_MAY_JUNE_2027,
          subjectSessionOverrides: [
            {
              subjectId: subjectIds[1],
              year: 2027,
              series: "Oct/Nov",
            },
          ],
          subjectIds: [subjectIds[0], subjectIds[1]],
        });
      expect(mixed.status).toBe(200);
      const memberships = await db.execute(sql`
        select subject_id, intended_exam_year, intended_exam_series
        from public.user_subjects
        where user_id = ${user.id}
        order by subject_id
      `);
      const bySubject = new Map(
        memberships.rows.map((row) => [
          Number(row.subject_id),
          row,
        ]),
      );
      expect(bySubject.get(subjectIds[0])?.intended_exam_series).toBe("May/June");
      expect(bySubject.get(subjectIds[1])?.intended_exam_series).toBe("Oct/Nov");
    } finally {
      await admin.auth.admin.deleteUser(user.id);
    }
  });
});
