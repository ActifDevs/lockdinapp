/**
 * B5BR HTTP/RPC integration: visibility fail-safe, new-membership route contract,
 * legacy null-route remediation, atomic rollback.
 *
 * Run via: pnpm --filter @workspace/api-server test:integration
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { VALID_MAY_JUNE_2027 } from "../test/assignment-session.js";
import { loadHarnessSupabaseEnv } from "../test/harness-supabase.js";

const env = loadHarnessSupabaseEnv();

describe("B5BR visibility + route membership HTTP/RPC", () => {
  let app: express.Express;
  let admin: ReturnType<typeof createClient>;
  let db: typeof import("@workspace/db").db;
  let token = "";
  let userId = "";
  let selectableIds: number[] = [];
  let zeroRouteId = 0;
  let zeroRouteVersionId = 0;
  let hiddenId = 0;
  let hiddenVersionId = 0;
  let multiId = 0;
  let multiVersionId = 0;
  let multiRouteIds: number[] = [];
  let multiOptionIds: number[] = [];
  let singleId = 0;
  let singleVersionId = 0;
  let singleRouteId = 0;

  const mkUser = async () => {
    const email = `b5br-${crypto.randomUUID()}@example.test`;
    const password = `Tmp-${crypto.randomUUID()}!Aa1`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "B5BR Tester" },
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

    const user = await mkUser();
    userId = user.id;
    token = user.token;

    const subjects = await db.execute(sql`
      select code, id,
        (select id from syllabus_versions v
          where v.subject_id = s.id and v.is_current = true limit 1) as version_id
      from subjects s
      where code in ('HTTP01','HTTPZR','HTTPHD','HTTPML')
    `);
    const byCode = new Map(
      subjects.rows.map((row) => [
        String(row.code),
        {
          id: Number(row.id),
          versionId: Number(row.version_id),
        },
      ]),
    );
    singleId = byCode.get("HTTP01")!.id;
    singleVersionId = byCode.get("HTTP01")!.versionId;
    zeroRouteId = byCode.get("HTTPZR")!.id;
    zeroRouteVersionId = byCode.get("HTTPZR")!.versionId;
    hiddenId = byCode.get("HTTPHD")!.id;
    hiddenVersionId = byCode.get("HTTPHD")!.versionId;
    multiId = byCode.get("HTTPML")!.id;
    multiVersionId = byCode.get("HTTPML")!.versionId;

    const routes = await db.execute(sql`
      select r.id, r.route_key
      from assessment_routes r
      join assessment_route_sets rs on rs.id = r.route_set_id
      where r.syllabus_version_id = ${multiVersionId}
        and rs.lifecycle = 'published'
      order by r.order_index
    `);
    multiRouteIds = routes.rows.map((row) => Number(row.id));

    const options = await db.execute(sql`
      select o.id
      from assessment_study_options o
      join assessment_study_option_groups g on g.id = o.group_id
      join assessment_route_sets rs on rs.id = g.route_set_id
      where o.syllabus_version_id = ${multiVersionId}
        and rs.lifecycle = 'published'
      order by o.order_index
    `);
    multiOptionIds = options.rows.map((row) => Number(row.id));

    const singleRoute = await db.execute(sql`
      select r.id
      from assessment_routes r
      join assessment_route_sets rs on rs.id = r.route_set_id
      where r.syllabus_version_id = ${singleVersionId}
        and rs.lifecycle = 'published'
      limit 1
    `);
    singleRouteId = Number(singleRoute.rows[0]!.id);

    const selectable = await db.execute(sql`
      select id from subjects
      where selectable_for_new_memberships = true
        and code like 'HTTP0%'
      order by id
      limit 3
    `);
    selectableIds = selectable.rows.map((row) => Number(row.id));

    const { default: router } = await import("../routes/index.js");
    app = express();
    app.use(express.json());
    app.use("/api", router);
  }, 120_000);

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("omits hidden subjects from catalogue but resolves owned subject by id", async () => {
    const list = await request(app).get("/api/subjects");
    expect(list.status).toBe(200);
    const ids = (list.body as { id: number }[]).map((row) => row.id);
    expect(ids).not.toContain(hiddenId);
    expect(ids).toContain(singleId);
    expect(ids).toContain(zeroRouteId);

    const hidden = await request(app).get(`/api/subjects/${hiddenId}`);
    expect(hidden.status).toBe(200);
    expect(hidden.body.id).toBe(hiddenId);
  });

  it("returns version-scoped route catalogue modes", async () => {
    const zero = await request(app).get(
      `/api/subjects/${zeroRouteId}/syllabus-versions/${zeroRouteVersionId}/assessment-routes`,
    );
    expect(zero.status).toBe(200);
    expect(zero.body.selectionMode).toBe("none_available");

    const single = await request(app).get(
      `/api/subjects/${singleId}/syllabus-versions/${singleVersionId}/assessment-routes`,
    );
    expect(single.status).toBe(200);
    expect(single.body.selectionMode).toBe("auto");
    expect(single.body.routes).toHaveLength(1);

    const multi = await request(app).get(
      `/api/subjects/${multiId}/syllabus-versions/${multiVersionId}/assessment-routes`,
    );
    expect(multi.status).toBe(200);
    expect(multi.body.selectionMode).toBe("explicit");
    expect(multi.body.routes.length).toBeGreaterThanOrEqual(2);

    const cross = await request(app).get(
      `/api/subjects/${singleId}/syllabus-versions/${multiVersionId}/assessment-routes`,
    );
    expect(cross.status).toBe(404);
  });

  it("fail-closes new membership when published routes are zero", async () => {
    const before = await db.execute(sql`
      select count(*)::int as n from user_subjects where user_id = ${userId}
    `);

    const res = await request(app)
      .post("/api/profile/complete-onboarding")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fullName: "B5BR Tester",
        username: `b5br${crypto.randomUUID().slice(0, 8)}`,
        level: "A Level",
        examSession: "May/June 2027",
        subjectIds: [zeroRouteId],
        intendedExamSession: VALID_MAY_JUNE_2027,
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(String(res.body.error ?? "")).toMatch(/route|assessment/i);

    const after = await db.execute(sql`
      select count(*)::int as n from user_subjects where user_id = ${userId}
    `);
    expect(Number(after.rows[0]!.n)).toBe(Number(before.rows[0]!.n));
  });

  it("onboards with single-route auto-resolve and rejects hidden add", async () => {
    const username = `b5br${crypto.randomUUID().slice(0, 8)}`;
    const res = await request(app)
      .post("/api/profile/complete-onboarding")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fullName: "B5BR Tester",
        username,
        level: "A Level",
        examSession: "May/June 2027",
        subjectIds: [singleId],
        intendedExamSession: VALID_MAY_JUNE_2027,
      });
    expect(res.status).toBe(200);

    const memberships = await request(app)
      .get("/api/user-subjects")
      .set("Authorization", `Bearer ${token}`);
    expect(memberships.status).toBe(200);
    const row = (memberships.body as { subject: { id: number }; assessmentRouteId: number | null }[])
      .find((m) => m.subject.id === singleId);
    expect(row?.assessmentRouteId).toBe(singleRouteId);

    const hiddenAdd = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", `Bearer ${token}`)
      .send({
        subjectIds: [singleId, hiddenId],
        intendedExamSession: VALID_MAY_JUNE_2027,
      });
    expect(hiddenAdd.status).toBe(400);
  });

  it("requires explicit multi-route + option cardinality; rolls back on failure", async () => {
    const beforeOpts = await db.execute(sql`
      select count(*)::int as n from user_subject_option_selections where user_id = ${userId}
    `);
    const beforeRoute = await db.execute(sql`
      select assessment_route_id from user_subjects
      where user_id = ${userId} and subject_id = ${singleId}
    `);

    const badCardinality = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", `Bearer ${token}`)
      .send({
        subjectIds: [singleId, multiId],
        intendedExamSession: VALID_MAY_JUNE_2027,
        routeAssignments: [
          {
            subjectId: multiId,
            routeId: multiRouteIds[0],
            optionIds: [multiOptionIds[0]],
          },
        ],
      });
    expect(badCardinality.status).toBeGreaterThanOrEqual(400);

    const afterOpts = await db.execute(sql`
      select count(*)::int as n from user_subject_option_selections where user_id = ${userId}
    `);
    expect(Number(afterOpts.rows[0]!.n)).toBe(Number(beforeOpts.rows[0]!.n));

    const afterMemberships = await request(app)
      .get("/api/user-subjects")
      .set("Authorization", `Bearer ${token}`);
    const ids = (
      afterMemberships.body as { subject: { id: number } }[]
    ).map((m) => m.subject.id);
    expect(ids).toEqual([singleId]);
    expect(Number(beforeRoute.rows[0]!.assessment_route_id)).toBe(singleRouteId);

    const ok = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", `Bearer ${token}`)
      .send({
        subjectIds: [singleId, multiId],
        intendedExamSession: VALID_MAY_JUNE_2027,
        routeAssignments: [
          {
            subjectId: multiId,
            routeId: multiRouteIds[1] ?? multiRouteIds[0],
            optionIds: [multiOptionIds[0], multiOptionIds[1]],
          },
        ],
      });
    expect(ok.status).toBe(200);
    const multiRow = (
      ok.body as { subject: { id: number }; assessmentRouteId: number | null }[]
    ).find((m) => m.subject.id === multiId);
    expect(multiRow?.assessmentRouteId).toBeTruthy();
  });

  it("preserves legacy null-route membership and remediates intentionally", async () => {
    // Force a legacy null route on the single membership without changing pin.
    const pinBefore = await db.execute(sql`
      select syllabus_version_id, assessment_route_id
      from user_subjects
      where user_id = ${userId} and subject_id = ${singleId}
    `);
    const pin = Number(pinBefore.rows[0]!.syllabus_version_id);

    await db.execute(sql`
      update user_subjects
      set assessment_route_id = null
      where user_id = ${userId} and subject_id = ${singleId}
    `);

    const list = await request(app)
      .get("/api/user-subjects")
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    const legacy = (
      list.body as {
        subject: { id: number };
        assessmentRouteId: number | null;
        syllabusVersion: { id: number };
      }[]
    ).find((m) => m.subject.id === singleId);
    expect(legacy?.assessmentRouteId).toBeNull();
    expect(legacy?.syllabusVersion.id).toBe(pin);

    const catalogue = await request(app).get(
      `/api/subjects/${singleId}/syllabus-versions/${pin}/assessment-routes`,
    );
    expect(catalogue.status).toBe(200);

    // Viewing catalogue must not mutate route.
    const stillNull = await db.execute(sql`
      select assessment_route_id from user_subjects
      where user_id = ${userId} and subject_id = ${singleId}
    `);
    expect(stillNull.rows[0]!.assessment_route_id).toBeNull();

    const assign = await request(app)
      .put(`/api/user-subjects/${singleId}/assessment-route`)
      .set("Authorization", `Bearer ${token}`)
      .send({ routeId: singleRouteId, optionIds: [] });
    expect(assign.status).toBe(200);
    expect(assign.body.assessmentRouteId).toBe(singleRouteId);
    expect(assign.body.syllabusVersion.id).toBe(pin);

    const pinAfter = await db.execute(sql`
      select syllabus_version_id from user_subjects
      where user_id = ${userId} and subject_id = ${singleId}
    `);
    expect(Number(pinAfter.rows[0]!.syllabus_version_id)).toBe(pin);
  });

  it("rejects cross-version route assignment", async () => {
    const res = await request(app)
      .put(`/api/user-subjects/${singleId}/assessment-route`)
      .set("Authorization", `Bearer ${token}`)
      .send({ routeId: multiRouteIds[0], optionIds: [] });
    expect(res.status).toBeGreaterThanOrEqual(400);

    const pin = await db.execute(sql`
      select syllabus_version_id, assessment_route_id from user_subjects
      where user_id = ${userId} and subject_id = ${singleId}
    `);
    expect(Number(pin.rows[0]!.assessment_route_id)).toBe(singleRouteId);
    expect(Number(pin.rows[0]!.syllabus_version_id)).toBe(singleVersionId);
  });

  it("keeps owned hidden membership accessible via user-subjects", async () => {
    // Direct insert simulates pre-existing owned hidden subject (not via catalogue add).
    await db.execute(sql`
      insert into user_subjects (
        user_id, subject_id, syllabus_version_id,
        intended_exam_year, intended_exam_series, assessment_route_id
      )
      values (
        ${userId}, ${hiddenId}, ${hiddenVersionId},
        2027, 'May/June', null
      )
      on conflict (user_id, subject_id) do nothing
    `);

    const list = await request(app)
      .get("/api/user-subjects")
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    const owned = (
      list.body as { subject: { id: number } }[]
    ).map((m) => m.subject.id);
    expect(owned).toContain(hiddenId);

    const catalogue = await request(app).get("/api/subjects");
    const catalogueIds = (catalogue.body as { id: number }[]).map((r) => r.id);
    expect(catalogueIds).not.toContain(hiddenId);
    void selectableIds;
  });
});
