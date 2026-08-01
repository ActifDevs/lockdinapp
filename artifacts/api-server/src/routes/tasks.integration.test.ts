/**
 * Two-user local Supabase integration tests for Phase 2 Slice 2 corrections.
 *
 * Run only via: `pnpm --filter @workspace/api-server test:integration`
 * That command fails if local Supabase is unavailable and never falls back
 * to hosted. This file must not skip-as-success.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_TEMPORARILY_UNAVAILABLE } from "../lib/feature-quarantine";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

function loadLocalSupabaseEnv(): {
  url: string;
  publishableKey: string;
  serviceRoleKey: string;
  dbUrl: string;
} {
  let raw: string;
  try {
    raw = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "json"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(
      "Local Supabase unavailable. Use `pnpm test:integration` only with a " +
        "running local stack. Never fall back to hosted Supabase.",
    );
  }

  const status = JSON.parse(raw) as Record<string, string>;
  const apiUrl = status.API_URL ?? "";
  if (!apiUrl.includes("127.0.0.1") && !apiUrl.includes("localhost")) {
    throw new Error(
      `Refusing non-local Supabase API URL: ${apiUrl}. Hosted projects are forbidden.`,
    );
  }

  return {
    url: apiUrl,
    publishableKey: status.PUBLISHABLE_KEY || status.ANON_KEY,
    serviceRoleKey: status.SERVICE_ROLE_KEY,
    dbUrl: status.DB_URL,
  };
}

const env = loadLocalSupabaseEnv();
const today = new Date().toISOString().split("T")[0];

describe("two-user local Supabase task isolation (exact)", () => {
  let app: express.Express;
  let admin: ReturnType<typeof createClient>;
  let userAId = "";
  let userBId = "";
  let tokenA = "";
  let tokenB = "";
  let subjectId = 0;
  let topicId: number | null = null;

  let dueAId = 0;
  let completedAId = 0;
  let dueBId = 0;
  const completedBIds: number[] = [];

  beforeAll(async () => {
    process.env.SUPABASE_URL = env.url;
    process.env.SUPABASE_PUBLISHABLE_KEY = env.publishableKey;
    process.env.DATABASE_URL = env.dbUrl;

    admin = createClient(env.url, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const mkUser = async (label: string) => {
      const email = `slice2-corr-${label}-${crypto.randomUUID()}@example.test`;
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

    const { db, subjectsTable, syllabusTopicsTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    const existing = await db.select().from(subjectsTable).limit(1);
    if (existing[0]) {
      subjectId = existing[0].id;
    } else {
      const [created] = await db
        .insert(subjectsTable)
        .values({ name: "Slice2 Corr Subject", code: "S2C", color: "#111111" })
        .returning();
      subjectId = created.id;
    }

    const topics = await db
      .select({ id: syllabusTopicsTable.id })
      .from(syllabusTopicsTable)
      .where(eq(syllabusTopicsTable.subjectId, subjectId))
      .limit(1);
    topicId = topics[0]?.id ?? null;

    const { default: router } = await import("../routes/index.js");
    app = express();
    app.use(express.json());
    app.use("/api", router);

    // User A: 1 incomplete due today + 1 completed today
    const createDueA = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        title: "A due today",
        subjectId,
        priority: "high",
        deadline: today,
      });
    expect(createDueA.status).toBe(201);
    dueAId = createDueA.body.id;

    const createDoneA = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        title: "A completed today",
        subjectId,
        priority: "medium",
        deadline: today,
      });
    expect(createDoneA.status).toBe(201);
    completedAId = createDoneA.body.id;
    const patchA = await request(app)
      .patch(`/api/tasks/${completedAId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ completed: true });
    expect(patchA.status).toBe(200);

    // User B: 1 incomplete due today + 3 completed today
    const createDueB = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({
        title: "B due today",
        subjectId,
        priority: "high",
        deadline: today,
      });
    expect(createDueB.status).toBe(201);
    dueBId = createDueB.body.id;

    for (let i = 1; i <= 3; i++) {
      const created = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${tokenB}`)
        .send({
          title: `B completed today ${i}`,
          subjectId,
          priority: "low",
          deadline: today,
        });
      expect(created.status).toBe(201);
      const patched = await request(app)
        .patch(`/api/tasks/${created.body.id}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ completed: true });
      expect(patched.status).toBe(200);
      completedBIds.push(created.body.id);
    }
  }, 120_000);

  afterAll(async () => {
    if (!admin) return;
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  });

  it("anonymous task requests fail", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(401);
  });

  it("lists are isolated and cross-user mutations fail", async () => {
    const listA = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(listA.status).toBe(200);
    const idsA = listA.body.map((t: { id: number }) => t.id);
    expect(idsA).toContain(dueAId);
    expect(idsA).toContain(completedAId);
    expect(idsA).not.toContain(dueBId);
    for (const id of completedBIds) expect(idsA).not.toContain(id);

    const listB = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(listB.status).toBe(200);
    const idsB = listB.body.map((t: { id: number }) => t.id);
    expect(idsB).toContain(dueBId);
    expect(idsB).not.toContain(dueAId);
    expect(idsB).not.toContain(completedAId);

    expect(
      (
        await request(app)
          .patch(`/api/tasks/${dueBId}`)
          .set("Authorization", `Bearer ${tokenA}`)
          .send({ completed: true })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .delete(`/api/tasks/${dueAId}`)
          .set("Authorization", `Bearer ${tokenB}`)
      ).status,
    ).toBe(404);

    const spoof = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        title: "spoof ownership",
        subjectId,
        priority: "medium",
        userId: userBId,
      });
    expect(spoof.status).toBe(400);
  });

  it("dashboard exact isolation for A and B", async () => {
    const dashA = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(dashA.status).toBe(200);

    const todayIdsA = dashA.body.todayTasks.map((t: { id: number }) => t.id);
    const upcomingIdsA = dashA.body.upcomingDeadlines.map((t: { id: number }) => t.id);
    expect(todayIdsA).toContain(dueAId);
    expect(todayIdsA).not.toContain(dueBId);
    expect(upcomingIdsA).toContain(dueAId);
    expect(upcomingIdsA).not.toContain(dueBId);
    expect(dashA.body.todayTasksTotal).toBe(1);
    expect(dashA.body.todayTasksCompleted).toBe(1);
    // Streak is from A's completions only (at least today).
    expect(dashA.body.studyStreakDays).toBeGreaterThanOrEqual(1);
    expect(dashA.body.recentPerformance).toEqual([]);
    expect(dashA.body.upcomingExams).toEqual([]);
    for (const item of dashA.body.subjectProgressSummary) {
      expect(item.syllabusProgress).toBe(0);
    }

    const dashB = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(dashB.status).toBe(200);

    const todayIdsB = dashB.body.todayTasks.map((t: { id: number }) => t.id);
    const upcomingIdsB = dashB.body.upcomingDeadlines.map((t: { id: number }) => t.id);
    expect(todayIdsB).toContain(dueBId);
    expect(todayIdsB).not.toContain(dueAId);
    expect(upcomingIdsB).toContain(dueBId);
    expect(upcomingIdsB).not.toContain(dueAId);
    expect(dashB.body.todayTasksTotal).toBe(1);
    expect(dashB.body.todayTasksCompleted).toBe(3);
    expect(dashB.body.studyStreakDays).toBeGreaterThanOrEqual(1);
    // Metrics must not combine A+B (A has 1 completed today, B has 3).
    expect(dashB.body.todayTasksCompleted).not.toBe(
      dashA.body.todayTasksCompleted + dashB.body.todayTasksCompleted,
    );
    expect(dashA.body.todayTasksCompleted + dashB.body.todayTasksCompleted).toBe(4);
  });

  it("progress exact isolation for A and B", async () => {
    const progA = await request(app)
      .get("/api/progress/overview")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(progA.status).toBe(200);
    expect(progA.body.totalTasksCompleted).toBe(1);
    expect(progA.body.totalPapersLogged).toBe(0);
    expect(progA.body.overallSyllabusProgress).toBe(0);
    for (const item of progA.body.syllabusCompletion) {
      expect(item.syllabusProgress).toBe(0);
    }
    const weekA = progA.body.weeklyTasksCompleted.find(
      (d: { date: string }) => d.date === today,
    );
    expect(weekA?.tasksCompleted).toBe(1);

    const progB = await request(app)
      .get("/api/progress/overview")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(progB.status).toBe(200);
    expect(progB.body.totalTasksCompleted).toBe(3);
    const weekB = progB.body.weeklyTasksCompleted.find(
      (d: { date: string }) => d.date === today,
    );
    expect(weekB?.tasksCompleted).toBe(3);

    // Neither response contains combined totals.
    expect(progA.body.totalTasksCompleted + progB.body.totalTasksCompleted).toBe(4);
    expect(progA.body.totalTasksCompleted).not.toBe(4);
    expect(progB.body.totalTasksCompleted).not.toBe(4);
  });

  it("public subjects have no task-derived values; create/delete blocked", async () => {
    const list = await request(app).get("/api/subjects");
    expect(list.status).toBe(200);
    for (const subject of list.body) {
      expect(subject.upcomingTasksCount).toBe(0);
      expect(subject.syllabusProgress).toBe(0);
      expect(subject.topicsCompleted).toBe(0);
      expect(subject.topicsInProgress).toBe(0);
      expect(subject.recentPaperScore).toBeNull();
      expect(subject.recentPaperLabel).toBeNull();
    }

    const create = await request(app)
      .post("/api/subjects")
      .send({ name: "Hack Subject", code: "HACK", color: "#000000" });
    expect(create.status).toBe(403);

    const del = await request(app).delete(`/api/subjects/${subjectId}`);
    expect(del.status).toBe(403);

    const perf = await request(app).get(`/api/subjects/${subjectId}/performance`);
    expect(perf.status).toBe(200);
    expect(perf.body.papersCompleted).toBe(0);
    expect(perf.body.latestScore).toBeNull();
    expect(perf.body.trend).toEqual([]);
    expect(perf.body.componentBreakdown).toEqual([]);

    const syllabus = await request(app).get(`/api/subjects/${subjectId}/syllabus`);
    expect(syllabus.status).toBe(200);
    for (const unit of syllabus.body) {
      for (const topic of unit.topics ?? []) {
        expect(topic.status).toBe("not_started");
        expect(topic.notes).toBeNull();
      }
    }
  });

  it("unowned features are quarantined with safe placeholders", async () => {
    const anonPast = await request(app).get("/api/past-paper-attempts");
    expect(anonPast.status).toBe(401);

    const pastGet = await request(app)
      .get("/api/past-paper-attempts")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(pastGet.status).toBe(200);
    expect(pastGet.body).toEqual([]);

    const pastPost = await request(app)
      .post("/api/past-paper-attempts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        subjectId,
        componentId: 1,
        session: "May/June",
        score: 50,
        totalMarks: 100,
        dateAttempted: today,
      });
    expect(pastPost.status).toBe(503);
    expect(pastPost.body.error).toBe(FEATURE_TEMPORARILY_UNAVAILABLE);

    const pastDel = await request(app)
      .delete("/api/past-paper-attempts/1")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(pastDel.status).toBe(503);

    const examGet = await request(app)
      .get("/api/exam-dates")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(examGet.status).toBe(200);
    expect(examGet.body).toEqual([]);

    const examPost = await request(app)
      .post("/api/exam-dates")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ subjectId, paperCode: "P1", date: today });
    expect(examPost.status).toBe(503);
    expect(examPost.body.error).toBe(FEATURE_TEMPORARILY_UNAVAILABLE);

    const examDel = await request(app)
      .delete("/api/exam-dates/1")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(examDel.status).toBe(503);

    const patchTopicId = topicId ?? 1;
    const topicPatch = await request(app)
      .patch(`/api/syllabus-topics/${patchTopicId}`)
      .send({ status: "completed", notes: "should not persist" });
    expect(topicPatch.status).toBe(503);
    expect(topicPatch.body.error).toBe(FEATURE_TEMPORARILY_UNAVAILABLE);
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
    expect(idsA).toContain(dueAId);
    expect(idsA).not.toContain(dueBId);
    expect(idsB).toContain(dueBId);
    expect(idsB).not.toContain(dueAId);
  });
});
