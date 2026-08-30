/**
 * Two-user local Supabase integration tests for Phase 3 Slice 2A topic progress.
 *
 * Run only via: `pnpm --filter @workspace/api-server test:integration`
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
import { VALID_MAY_JUNE_2027 } from "../test/assignment-session.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");
const supabaseCliScript = path.join(
  repoRoot,
  "node_modules",
  "supabase",
  "dist",
  "supabase.js",
);

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isLoopbackUrl(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    const parsed = new URL(value);
    return LOOPBACK_HOSTNAMES.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function loadLocalSupabaseEnv(): {
  url: string;
  publishableKey: string;
  serviceRoleKey: string;
  dbUrl: string;
} {
  let raw: string;
  try {
    raw = execFileSync(
      process.execPath,
      [supabaseCliScript, "status", "-o", "json"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch {
    throw new Error(
      "Local Supabase unavailable. Use `pnpm test:integration` only with a " +
        "running local stack. Never fall back to hosted Supabase.",
    );
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

describe("two-user local Supabase topic progress isolation", () => {
  let app: express.Express;
  let admin: ReturnType<typeof createClient>;
  let userAId = "";
  let userBId = "";
  let tokenA = "";
  let tokenB = "";
  let subjectId = 0;
  let topicId = 0;

  beforeAll(async () => {
    process.env.DATABASE_URL = env.dbUrl;
    process.env.SUPABASE_URL = env.url;
    process.env.SUPABASE_PUBLISHABLE_KEY = env.publishableKey;

    const { default: router } = await import("./index.js");
    app = express();
    app.use(express.json());
    app.use("/api", router);

    admin = createClient(env.url, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const stamp = Date.now();
    const emailA = `topic-a-${stamp}@example.com`;
    const emailB = `topic-b-${stamp}@example.com`;
    const password = "TopicProgress-Test-1!";

    const createdA = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
    });
    const createdB = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
    });
    if (!createdA.data.user || !createdB.data.user) {
      throw new Error("Failed to create disposable Auth users");
    }
    userAId = createdA.data.user.id;
    userBId = createdB.data.user.id;

    const anon = createClient(env.url, env.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signedA = await anon.auth.signInWithPassword({
      email: emailA,
      password,
    });
    const signedB = await anon.auth.signInWithPassword({
      email: emailB,
      password,
    });
    tokenA = signedA.data.session?.access_token ?? "";
    tokenB = signedB.data.session?.access_token ?? "";
    if (!tokenA || !tokenB) {
      throw new Error("Failed to obtain disposable Auth tokens");
    }

    const { db, subjectsTable, syllabusTopicsTable } =
      await import("@workspace/db");
    const [topic] = await db
      .select({
        id: syllabusTopicsTable.id,
        subjectId: syllabusTopicsTable.subjectId,
      })
      .from(syllabusTopicsTable)
      .orderBy(syllabusTopicsTable.id)
      .limit(1);
    if (!topic) {
      throw new Error("Local catalogue has no topics; import syllabus first");
    }
    topicId = topic.id;
    subjectId = topic.subjectId;

    const [subject] = await db
      .select()
      .from(subjectsTable)
      .where(eq(subjectsTable.id, subjectId))
      .limit(1);
    if (!subject) {
      throw new Error("Local catalogue is missing the topic's subject");
    }

    for (const token of [tokenA, tokenB]) {
      const onboard = await request(app)
        .post("/api/profile/complete-onboarding")
        .set("Authorization", `Bearer ${token}`)
        .send({
          fullName: "Topic Tester",
          username: `topic_${token === tokenA ? "a" : "b"}_${stamp}`,
          level: "AS Level (Year 12)",
          examSession: "May/June 2027",
          intendedExamSession: VALID_MAY_JUNE_2027,
          subjectIds: [subjectId],
        });
      expect([200, 409]).toContain(onboard.status);
    }
  }, 120_000);

  afterAll(async () => {
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  });

  it("rejects unauthenticated topic progress mutations", async () => {
    const patch = await request(app)
      .patch(`/api/syllabus-topics/${topicId}`)
      .send({ status: "completed" });
    const reset = await request(app).delete(`/api/syllabus-topics/${topicId}`);
    expect(patch.status).toBe(401);
    expect(reset.status).toBe(401);
  });

  it("lets User A and User B store different status/notes for the same topic", async () => {
    const patchA = await request(app)
      .patch(`/api/syllabus-topics/${topicId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ status: "in_progress", notes: "A notes" });
    const patchB = await request(app)
      .patch(`/api/syllabus-topics/${topicId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ status: "completed", notes: "B notes" });

    expect(patchA.status).toBe(200);
    expect(patchA.body).toEqual({
      topicId,
      status: "in_progress",
      notes: "A notes",
    });
    expect(patchB.status).toBe(200);
    expect(patchB.body).toEqual({
      topicId,
      status: "completed",
      notes: "B notes",
    });

    const syllabusA = await request(app)
      .get(`/api/subjects/${subjectId}/syllabus`)
      .set("Authorization", `Bearer ${tokenA}`);
    const syllabusB = await request(app)
      .get(`/api/subjects/${subjectId}/syllabus`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(syllabusA.status).toBe(200);
    expect(syllabusB.status).toBe(200);

    const topicA = syllabusA.body
      .flatMap(
        (unit: {
          topics: { id: number; status: string; notes: string | null }[];
        }) => unit.topics,
      )
      .find((topic: { id: number }) => topic.id === topicId);
    const topicB = syllabusB.body
      .flatMap(
        (unit: {
          topics: { id: number; status: string; notes: string | null }[];
        }) => unit.topics,
      )
      .find((topic: { id: number }) => topic.id === topicId);

    expect(topicA).toMatchObject({ status: "in_progress", notes: "A notes" });
    expect(topicB).toMatchObject({ status: "completed", notes: "B notes" });
  });

  it("defaults missing progress rows and rejects nonexistent topic ids", async () => {
    const { db, syllabusTopicsTable } = await import("@workspace/db");
    const topics = await db
      .select({ id: syllabusTopicsTable.id })
      .from(syllabusTopicsTable)
      .where(eq(syllabusTopicsTable.subjectId, subjectId));
    const otherTopic = topics.find((topic) => topic.id !== topicId);
    expect(otherTopic).toBeTruthy();

    const syllabusA = await request(app)
      .get(`/api/subjects/${subjectId}/syllabus`)
      .set("Authorization", `Bearer ${tokenA}`);
    const untouched = syllabusA.body
      .flatMap(
        (unit: {
          topics: { id: number; status: string; notes: string | null }[];
        }) => unit.topics,
      )
      .find((topic: { id: number }) => topic.id === otherTopic!.id);
    expect(untouched).toMatchObject({ status: "not_started", notes: null });

    const missing = await request(app)
      .patch("/api/syllabus-topics/999999999")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ status: "completed" });
    expect(missing.status).toBe(404);
  });

  it("computes enrolled-subject progress overview from caller rows", async () => {
    const overviewA = await request(app)
      .get("/api/progress/overview")
      .set("Authorization", `Bearer ${tokenA}`);
    const overviewB = await request(app)
      .get("/api/progress/overview")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(overviewA.status).toBe(200);
    expect(overviewB.status).toBe(200);
    expect(overviewA.body.syllabusCompletion).toEqual(
      expect.arrayContaining([expect.objectContaining({ subjectId })]),
    );
    expect(overviewB.body.overallSyllabusProgress).toBeGreaterThan(
      overviewA.body.overallSyllabusProgress,
    );

    const dashboardA = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${tokenA}`);
    const dashboardB = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(dashboardA.status).toBe(200);
    expect(dashboardB.status).toBe(200);
    const summaryA = dashboardA.body.subjectProgressSummary.find(
      (item: { subjectId: number }) => item.subjectId === subjectId,
    );
    const summaryB = dashboardB.body.subjectProgressSummary.find(
      (item: { subjectId: number }) => item.subjectId === subjectId,
    );
    expect(summaryA).toBeTruthy();
    expect(summaryB).toBeTruthy();
    expect(summaryB.syllabusProgress).toBeGreaterThan(
      summaryA.syllabusProgress,
    );
  });

  it("resets only User A's row and leaves shared topic + User B unchanged", async () => {
    const resetA = await request(app)
      .delete(`/api/syllabus-topics/${topicId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(resetA.status).toBe(204);

    const syllabusA = await request(app)
      .get(`/api/subjects/${subjectId}/syllabus`)
      .set("Authorization", `Bearer ${tokenA}`);
    const syllabusB = await request(app)
      .get(`/api/subjects/${subjectId}/syllabus`)
      .set("Authorization", `Bearer ${tokenB}`);

    const topicA = syllabusA.body
      .flatMap(
        (unit: {
          topics: { id: number; status: string; notes: string | null }[];
        }) => unit.topics,
      )
      .find((topic: { id: number }) => topic.id === topicId);
    const topicB = syllabusB.body
      .flatMap(
        (unit: {
          topics: { id: number; status: string; notes: string | null }[];
        }) => unit.topics,
      )
      .find((topic: { id: number }) => topic.id === topicId);

    expect(topicA).toMatchObject({ status: "not_started", notes: null });
    expect(topicB).toMatchObject({ status: "completed", notes: "B notes" });

    const { db, syllabusTopicsTable } = await import("@workspace/db");
    const [shared] = await db
      .select({
        id: syllabusTopicsTable.id,
        title: syllabusTopicsTable.title,
        subjectId: syllabusTopicsTable.subjectId,
        unitId: syllabusTopicsTable.unitId,
        orderIndex: syllabusTopicsTable.orderIndex,
      })
      .from(syllabusTopicsTable)
      .where(eq(syllabusTopicsTable.id, topicId));
    expect(shared?.id).toBe(topicId);
    // Slice 2B: legacy shared progress columns are gone; API progress is topic_progress-only.
    expect(shared).not.toHaveProperty("status");
    expect(shared).not.toHaveProperty("notes");

    const legacyCols = await db.execute(sql`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'syllabus_topics'
        and column_name in ('status', 'notes')
    `);
    expect(legacyCols.rows).toEqual([]);

    const clientA = createClient(env.url, env.publishableKey, {
      global: { headers: { Authorization: `Bearer ${tokenA}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const clientB = createClient(env.url, env.publishableKey, {
      global: { headers: { Authorization: `Bearer ${tokenB}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const directA = await clientA
      .from("topic_progress")
      .select("topic_id, status, notes")
      .eq("topic_id", topicId);
    const directB = await clientB
      .from("topic_progress")
      .select("topic_id, status, notes")
      .eq("topic_id", topicId);

    expect(directA.error).toBeNull();
    expect(directB.error).toBeNull();
    expect(directA.data ?? []).toEqual([]);
    expect(directB.data).toEqual([
      { topic_id: topicId, status: "completed", notes: "B notes" },
    ]);

    const spoofInsert = await clientA.from("topic_progress").insert({
      user_id: userBId,
      topic_id: topicId,
      status: "in_progress",
      notes: "spoof",
    });
    expect(spoofInsert.error).toBeTruthy();
  });
});
