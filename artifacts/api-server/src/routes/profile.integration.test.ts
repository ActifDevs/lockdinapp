/**
 * Local Supabase integration tests for profile routes and atomic onboarding.
 * Run via: pnpm --filter @workspace/api-server test:integration
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

const LOOPBACK_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

function isLoopbackUrl(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    return LOOPBACK_HOSTNAMES.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function loadLocalSupabaseEnv() {
  let raw: string;
  try {
    raw = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "json"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error("Local Supabase unavailable for profile integration tests.");
  }
  const status = JSON.parse(raw) as Record<string, string>;
  const apiUrl = status.API_URL ?? "";
  const dbUrl = status.DB_URL ?? "";
  if (!isLoopbackUrl(apiUrl)) {
    throw new Error("Integration API_URL must use an exact loopback hostname");
  }
  if (!isLoopbackUrl(dbUrl)) {
    throw new Error("Integration DB_URL must use an exact loopback hostname");
  }
  return {
    url: apiUrl,
    publishableKey: status.PUBLISHABLE_KEY || status.ANON_KEY,
    serviceRoleKey: status.SERVICE_ROLE_KEY,
    dbUrl,
  };
}

const env = loadLocalSupabaseEnv();

describe("profile and atomic onboarding (local)", () => {
  let app: express.Express;
  let admin: ReturnType<typeof createClient>;
  let db: typeof import("@workspace/db").db;
  let userAId = "";
  let userBId = "";
  let tokenA = "";
  let tokenB = "";
  let subjectIds: number[] = [];

  beforeAll(async () => {
    process.env.SUPABASE_URL = env.url;
    process.env.SUPABASE_PUBLISHABLE_KEY = env.publishableKey;
    process.env.DATABASE_URL = env.dbUrl;

    admin = createClient(env.url, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    ({ db } = await import("@workspace/db"));

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
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data: sess, error: se } = await pub.auth.signInWithPassword({ email, password });
      if (se || !sess.session) throw se ?? new Error("signIn failed");
      return { id: data.user.id, token: sess.session.access_token };
    };

    const a = await mkUser("user-a", "Alice Slice3");
    const b = await mkUser("user-b", "Bob Slice3");
    userAId = a.id;
    userBId = b.id;
    tokenA = a.token;
    tokenB = b.token;

    const { subjectsTable } = await import("@workspace/db");
    const subjects = await db.select().from(subjectsTable).limit(3);
    if (subjects.length < 1) {
      const [created] = await db
        .insert(subjectsTable)
        .values({ name: "Slice3 Subject", code: "S3A", color: "#111111" })
        .returning();
      subjectIds = [created.id];
    } else {
      subjectIds = subjects.map((s) => s.id);
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
        subjectIds: pick,
      });
    expect(retry.status).toBe(200);
    expect(retry.body.username).toBe(username.toLowerCase());

    const tasksAfter = await db.execute(sql`
      select count(*)::int as n from public.tasks where user_id = ${userAId}
    `);
    expect(Number((tasksAfter.rows[0] as { n: number }).n)).toBe(pick.length);

    // B cannot take A's username
    const clash = await request(app)
      .post("/api/profile/complete-onboarding")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({
        fullName: "Bob Slice3",
        username,
        level: "A2 Level (Year 13)",
        examSession: "Oct/Nov 2027",
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
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: sess } = await pub.auth.signInWithPassword({ email, password });
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
          subjectIds: subjectIds.length >= 1 ? [subjectIds[0], subjectIds[0]] : [1, 1],
        },
        { username: "valid_user_z", subjectIds: [999999] },
        {
          username: "valid_user_w",
          subjectIds: [subjectIds[0], subjectIds[0] + 1, subjectIds[0] + 2, subjectIds[0] + 3].slice(0, 4),
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
            subjectIds: c.subjectIds,
          });
        expect([400, 409]).toContain(res.status);
        if (c.username === "valid_user_w" && c.subjectIds.length > 3) {
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
          subjectIds: [subjectIds[0]],
        });
      expect(blankName.status).toBe(400);
    } finally {
      await admin.auth.admin.deleteUser(uid);
    }
  });

  it("function privileges and definition are correct", async () => {
    const def = await db.execute(sql`
      select prosecdef, proconfig, pronargs
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'lockdin_complete_onboarding'
    `);
    const row = def.rows[0] as {
      prosecdef: boolean;
      proconfig: string[] | null;
      pronargs: number;
    };
    expect(row.prosecdef).toBe(true);
    expect(row.proconfig).toContain('search_path=""');
    expect(Number(row.pronargs)).toBe(5);

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
  });
});
