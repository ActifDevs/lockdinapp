/**
 * Two-user local Supabase integration tests for Phase 2 Slice 2.
 *
 * Requires a running local Supabase stack with migration 0001 applied.
 * Skips automatically when SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY /
 * SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL are not all set for local.
 *
 * Never points at the hosted production project.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

function loadLocalSupabaseEnv(): {
  url: string;
  publishableKey: string;
  serviceRoleKey: string;
  dbUrl: string;
} | null {
  try {
    const raw = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "json"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const status = JSON.parse(raw) as Record<string, string>;
    if (!status.API_URL?.includes("127.0.0.1") && !status.API_URL?.includes("localhost")) {
      return null;
    }
    return {
      url: status.API_URL,
      publishableKey: status.PUBLISHABLE_KEY || status.ANON_KEY,
      serviceRoleKey: status.SERVICE_ROLE_KEY,
      dbUrl: status.DB_URL,
    };
  } catch {
    return null;
  }
}

const local = loadLocalSupabaseEnv();
const describeIfLocal = local ? describe : describe.skip;

describeIfLocal("two-user local Supabase task isolation", () => {
  const env = local!;
  let app: express.Express;
  let admin: ReturnType<typeof createClient>;
  let userAId = "";
  let userBId = "";
  let tokenA = "";
  let tokenB = "";
  let subjectId = 0;
  let taskAId = 0;
  let taskBId = 0;

  beforeAll(async () => {
    process.env.SUPABASE_URL = env.url;
    process.env.SUPABASE_PUBLISHABLE_KEY = env.publishableKey;
    process.env.DATABASE_URL = env.dbUrl;

    admin = createClient(env.url, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const mkUser = async (label: string) => {
      const email = `slice2-${label}-${crypto.randomUUID()}@example.test`;
      const password = `Tmp-${crypto.randomUUID()}!Aa1`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: label },
      });
      if (error || !data.user) throw error ?? new Error("createUser failed");
      const pub = createClient(env.url, env.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data: sess, error: se } = await pub.auth.signInWithPassword({ email, password });
      if (se || !sess.session) throw se ?? new Error("signIn failed");
      return { id: data.user.id, token: sess.session.access_token };
    };

    const a = await mkUser("user-a");
    const b = await mkUser("user-b");
    userAId = a.id;
    userBId = b.id;
    tokenA = a.token;
    tokenB = b.token;

    // Subject lookup via privileged Drizzle connection (reference data).
    const { db, subjectsTable } = await import("@workspace/db");
    const existing = await db.select().from(subjectsTable).limit(1);
    if (existing[0]) {
      subjectId = existing[0].id;
    } else {
      const [created] = await db
        .insert(subjectsTable)
        .values({ name: "Slice2 Subject", code: "SL2", color: "#111111" })
        .returning();
      subjectId = created.id;
    }

    const { default: router } = await import("../routes/index.js");
    app = express();
    app.use(express.json());
    app.use("/api", router);
  }, 60_000);

  afterAll(async () => {
    if (!admin) return;
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  });

  it("anonymous task requests fail", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(401);
  });

  it("A creates a task; B creates a task; lists are isolated", async () => {
    const createA = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ title: "A owned integration task", subjectId, priority: "medium" });
    expect(createA.status).toBe(201);
    expect(createA.body).not.toHaveProperty("userId");
    taskAId = createA.body.id;

    const createB = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ title: "B owned integration task", subjectId, priority: "low" });
    expect(createB.status).toBe(201);
    taskBId = createB.body.id;

    const listA = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(listA.status).toBe(200);
    const idsA = listA.body.map((t: { id: number }) => t.id);
    expect(idsA).toContain(taskAId);
    expect(idsA).not.toContain(taskBId);

    const listB = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(listB.status).toBe(200);
    const idsB = listB.body.map((t: { id: number }) => t.id);
    expect(idsB).toContain(taskBId);
    expect(idsB).not.toContain(taskAId);
  });

  it("A cannot fetch/update/delete B's task", async () => {
    const upd = await request(app)
      .patch(`/api/tasks/${taskBId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ completed: true });
    expect(upd.status).toBe(404);

    const del = await request(app)
      .delete(`/api/tasks/${taskBId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(del.status).toBe(404);

    // B's task still exists
    const listB = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(listB.body.map((t: { id: number }) => t.id)).toContain(taskBId);
  });

  it("B cannot fetch/update/delete A's task", async () => {
    const upd = await request(app)
      .patch(`/api/tasks/${taskAId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ title: "hijack" });
    expect(upd.status).toBe(404);

    const del = await request(app)
      .delete(`/api/tasks/${taskAId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(del.status).toBe(404);
  });

  it("A cannot create a B-owned task via body userId", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        title: "spoof ownership",
        subjectId,
        priority: "medium",
        userId: userBId,
      });
    expect(res.status).toBe(400);
  });

  it("dashboard and progress only reflect the current user's tasks", async () => {
    const dashA = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(dashA.status).toBe(200);
    const dashIds = [
      ...dashA.body.todayTasks,
      ...dashA.body.upcomingDeadlines,
    ].map((t: { id: number }) => t.id);
    expect(dashIds).not.toContain(taskBId);

    const progA = await request(app)
      .get("/api/progress/overview")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(progA.status).toBe(200);
    expect(typeof progA.body.totalTasksCompleted).toBe("number");
  });

  it("public subjects do not expose the other user's task counts", async () => {
    const res = await request(app).get("/api/subjects");
    expect(res.status).toBe(200);
    for (const subject of res.body) {
      expect(subject.upcomingTasksCount).toBe(0);
    }
  });

  it("concurrent A/B requests do not exchange bearer context", async () => {
    const [resA, resB] = await Promise.all([
      request(app).get("/api/tasks").set("Authorization", `Bearer ${tokenA}`),
      request(app).get("/api/tasks").set("Authorization", `Bearer ${tokenB}`),
    ]);
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    const idsA = resA.body.map((t: { id: number }) => t.id);
    const idsB = resB.body.map((t: { id: number }) => t.id);
    expect(idsA).toContain(taskAId);
    expect(idsA).not.toContain(taskBId);
    expect(idsB).toContain(taskBId);
    expect(idsB).not.toContain(taskAId);
  });
});
