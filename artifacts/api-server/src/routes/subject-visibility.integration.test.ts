/**
 * B5E-F1 local-only HTTP/RPC integration for controlled subject visibility.
 * Run only inside the dedicated disposable Supabase harness.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { VALID_MAY_JUNE_2027 } from "../test/assignment-session.js";
import { loadHarnessSupabaseEnv } from "../test/harness-supabase.js";

const env = loadHarnessSupabaseEnv();
const CURRENT_NINE = [
  "9231",
  "9489",
  "9609",
  "9618",
  "9700",
  "9701",
  "9702",
  "9708",
  "9709",
] as const;
const NEW_SEVEN = [
  "8021",
  "9093",
  "9626",
  "9696",
  "9699",
  "9706",
  "9990",
] as const;

type Assignment = { subjectId: number; routeId: number; optionIds: number[] };

describe("B5E-F1 controlled subject visibility", () => {
  let app: express.Express;
  // The generated app Database type intentionally does not expose this private
  // operational table, so these local security probes use an untyped client.
  let admin: any;
  let userAClient: any;
  let db: typeof import("@workspace/db").db;
  let userAId = "";
  let userBId = "";
  let tokenA = "";
  let tokenB = "";
  const subjectIdByCode = new Map<string, number>();
  const assignments = new Map<string, Assignment>();

  async function mkUser(label: string) {
    const email = `b5e-f1-${label}-${crypto.randomUUID()}@example.test`;
    const password = `Tmp-${crypto.randomUUID()}!Aa1`;
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `B5E ${label}` },
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("createUser failed");
    }
    const client = createClient(env.url, env.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const session = await client.auth.signInWithPassword({ email, password });
    if (session.error || !session.data.session) {
      throw session.error ?? new Error("signIn failed");
    }
    return {
      id: created.data.user.id,
      token: session.data.session.access_token,
      client,
    };
  }

  async function grant(userId: string, code: string): Promise<void> {
    const result = await admin.from("subject_visibility_grants").insert({
      user_id: userId,
      subject_id: subjectIdByCode.get(code)!,
      granted_by: userBId,
    });
    if (result.error) throw result.error;
  }

  async function revoke(userId: string, code: string): Promise<void> {
    const result = await admin
      .from("subject_visibility_grants")
      .delete()
      .eq("user_id", userId)
      .eq("subject_id", subjectIdByCode.get(code)!);
    if (result.error) throw result.error;
  }

  async function catalogue(token?: string) {
    const req = request(app).get("/api/subjects");
    if (token) req.set("Authorization", `Bearer ${token}`);
    return req;
  }

  function listedCodes(response: request.Response): string[] {
    return (response.body as Array<{ code: string }>).map((row) => row.code);
  }

  function replacementBody(code: string) {
    const assignment = assignments.get(code)!;
    return {
      subjectIds: [assignment.subjectId],
      intendedExamSession: VALID_MAY_JUNE_2027,
      routeAssignments: [assignment],
    };
  }

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

    const a = await mkUser("user-a");
    const b = await mkUser("user-b");
    userAId = a.id;
    userBId = b.id;
    tokenA = a.token;
    tokenB = b.token;
    userAClient = a.client;

    const subjects = await db.execute(sql`
      select id, code from public.subjects
      where code in ('HTTP01', 'HTTPHD', '8021', '9093', '9626', '9696',
        '9699', '9706', '9990')
    `);
    for (const row of subjects.rows) {
      subjectIdByCode.set(String(row.code), Number(row.id));
    }
    expect(subjectIdByCode.size).toBe(9);

    for (const code of ["HTTP01", "HTTPHD", ...NEW_SEVEN]) {
      const target = code === "8021" ? "as_level" : "a_level";
      const route = await db.execute(sql`
        select s.id as subject_id, v.id as version_id, rs.id as route_set_id,
          r.id as route_id
        from public.subjects s
        join public.syllabus_versions v on v.subject_id = s.id and v.is_current
        join public.assessment_route_sets rs
          on rs.syllabus_version_id = v.id and rs.lifecycle = 'published'
        join public.assessment_routes r on r.route_set_id = rs.id
        where s.code = ${code}
          and r.qualification_target::text = ${target}
        order by r.order_index
        limit 1
      `);
      const selected = route.rows[0]!;
      const options = await db.execute(sql`
        select g.id as group_id, g.min_selections, o.id as option_id,
          row_number() over (partition by g.id order by o.order_index) as rn
        from public.assessment_study_option_groups g
        join public.assessment_study_options o on o.group_id = g.id
        where g.route_set_id = ${Number(selected.route_set_id)}
          and (g.applicable_qualification_target = 'both'
            or g.applicable_qualification_target::text = ${target})
        order by g.order_index, o.order_index
      `);
      const optionIds = options.rows
        .filter((row) => Number(row.rn) <= Number(row.min_selections))
        .map((row) => Number(row.option_id));
      assignments.set(code, {
        subjectId: Number(selected.subject_id),
        routeId: Number(selected.route_id),
        optionIds,
      });
    }

    const { default: router } = await import("../routes/index.js");
    app = express();
    app.use(express.json());
    app.use("/api", router);
  }, 120_000);

  beforeEach(async () => {
    await db.execute(sql`delete from public.user_subjects
      where user_id in (${userAId}::uuid, ${userBId}::uuid)`);
    await db.execute(sql`delete from public.subject_visibility_grants
      where user_id in (${userAId}::uuid, ${userBId}::uuid)`);
  });

  afterAll(async () => {
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  });

  it("keeps the grant table private from an ordinary authenticated client", async () => {
    const row = {
      user_id: userAId,
      subject_id: subjectIdByCode.get("8021")!,
      granted_by: userAId,
    };
    expect(
      (await userAClient.from("subject_visibility_grants").select("*")).error,
    ).not.toBeNull();
    expect(
      (await userAClient.from("subject_visibility_grants").insert(row)).error,
    ).not.toBeNull();
    expect(
      (
        await userAClient
          .from("subject_visibility_grants")
          .update({ granted_by: userAId })
          .eq("user_id", userAId)
      ).error,
    ).not.toBeNull();
    expect(
      (
        await userAClient
          .from("subject_visibility_grants")
          .delete()
          .eq("user_id", userAId)
      ).error,
    ).not.toBeNull();
  });

  it("applies global OR own-grant catalogue semantics without duplicates", async () => {
    const anonymous = await catalogue();
    const normalA = await catalogue(tokenA);
    expect(anonymous.status).toBe(200);
    expect(normalA.status).toBe(200);
    for (const code of NEW_SEVEN) {
      expect(listedCodes(anonymous)).not.toContain(code);
      expect(listedCodes(normalA)).not.toContain(code);
    }

    await grant(userAId, "8021");
    await grant(userAId, "9696");
    await grant(userAId, "HTTP01");
    const grantedA = await catalogue(tokenA);
    const ungrantedB = await catalogue(tokenB);
    expect(listedCodes(grantedA)).toEqual(
      expect.arrayContaining(["8021", "9696"]),
    );
    expect(listedCodes(ungrantedB)).not.toContain("8021");
    expect(listedCodes(ungrantedB)).not.toContain("9696");
    expect(
      listedCodes(grantedA).filter((code) => code === "HTTP01"),
    ).toHaveLength(1);

    const sessionsA = await request(app)
      .get("/api/subjects/assignment-sessions")
      .set("Authorization", `Bearer ${tokenA}`);
    const sessionsB = await request(app)
      .get("/api/subjects/assignment-sessions")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(sessionsA.status).toBe(200);
    expect(
      (sessionsA.body as Array<{ subjectId: number }>).map(
        (row) => row.subjectId,
      ),
    ).toEqual(
      expect.arrayContaining([
        subjectIdByCode.get("8021")!,
        subjectIdByCode.get("9696")!,
      ]),
    );
    expect(
      (sessionsB.body as Array<{ subjectId: number }>).map(
        (row) => row.subjectId,
      ),
    ).not.toContain(subjectIdByCode.get("8021")!);

    await revoke(userAId, "8021");
    expect(listedCodes(await catalogue(tokenA))).not.toContain("8021");
  });

  it("preserves all current-nine global flags and all new-seven hidden flags", async () => {
    const flags = await db.execute(sql`
      select
        count(*) filter (where code in ('9231','9489','9609','9618','9700','9701','9702','9708','9709')
          and selectable_for_new_memberships)::int as current_visible,
        count(*) filter (where code in ('8021','9093','9626','9696','9699','9706','9990')
          and selectable_for_new_memberships)::int as new_visible
      from public.subjects
    `);
    expect(Number(flags.rows[0]!.current_visible)).toBe(CURRENT_NINE.length);
    expect(Number(flags.rows[0]!.new_visible)).toBe(0);
  });

  it("enforces grants at the direct membership API and rolls back rejected writes", async () => {
    const global = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(replacementBody("HTTP01"));
    expect(global.status).toBe(200);

    await db.execute(
      sql`delete from public.user_subjects where user_id = ${userAId}::uuid`,
    );
    const denied = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(replacementBody("HTTPHD"));
    expect(denied.status).toBe(400);
    expect(denied.body).toEqual({ error: "Invalid subject selection" });

    await grant(userBId, "HTTPHD");
    const crossUser = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(replacementBody("HTTPHD"));
    expect(crossUser.status).toBe(400);

    await grant(userAId, "HTTPHD");
    await revoke(userAId, "HTTPHD");
    const revokedBeforeWrite = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(replacementBody("HTTPHD"));
    expect(revokedBeforeWrite.status).toBe(400);

    const writes = await db.execute(sql`
      select
        (select count(*)::int from public.user_subjects where user_id = ${userAId}::uuid) as memberships,
        (select count(*)::int from public.user_subject_option_selections where user_id = ${userAId}::uuid) as options
    `);
    expect(Number(writes.rows[0]!.memberships)).toBe(0);
    expect(Number(writes.rows[0]!.options)).toBe(0);
  });

  it("keeps an existing hidden membership accessible after grant removal", async () => {
    await grant(userAId, "HTTPHD");
    const enrolled = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(replacementBody("HTTPHD"));
    expect(enrolled.status).toBe(200);
    await revoke(userAId, "HTTPHD");

    const owned = await request(app)
      .get("/api/user-subjects")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(owned.status).toBe(200);
    expect(
      (owned.body as Array<{ subject: { code: string } }>).map(
        (row) => row.subject.code,
      ),
    ).toContain("HTTPHD");
    expect(listedCodes(await catalogue(tokenA))).not.toContain("HTTPHD");

    const retained = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(replacementBody("HTTPHD"));
    expect(retained.status).toBe(200);
  });

  it("rejects a granted hidden subject with a mismatched route atomically", async () => {
    await grant(userAId, "HTTPHD");
    const bad = replacementBody("HTTPHD");
    bad.routeAssignments[0]!.routeId = assignments.get("HTTP01")!.routeId;
    const response = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(bad);
    expect(response.status).toBe(400);
    const count = await db.execute(sql`select count(*)::int as n
      from public.user_subjects where user_id = ${userAId}::uuid`);
    expect(Number(count.rows[0]!.n)).toBe(0);
  });

  it.each(NEW_SEVEN)(
    "enrolls granted representative %s while its global flag is false",
    async (code) => {
      await grant(userAId, code);
      const response = await request(app)
        .put("/api/user-subjects")
        .set("Authorization", `Bearer ${tokenA}`)
        .send(replacementBody(code));
      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        expect.objectContaining({
          subject: expect.objectContaining({ code }),
          assessmentRouteId: assignments.get(code)!.routeId,
          optionIds: assignments.get(code)!.optionIds,
        }),
      ]);
    },
  );
});
