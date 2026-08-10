/**
 * Two-user local Supabase integration tests for Phase 3 Slice 3 past-paper ownership.
 *
 * Run only via: `pnpm --filter @workspace/api-server test:integration`
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";

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
    return LOOPBACK_HOSTNAMES.has(new URL(value).hostname.toLowerCase());
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
      "Local Supabase unavailable. Run the integration suite only with a local stack; " +
        "never fall back to hosted Supabase.",
    );
  }

  const status = JSON.parse(raw) as Record<string, string>;
  const apiUrl = status.API_URL ?? "";
  const dbUrl = status.DB_URL ?? "";
  if (!isLoopbackUrl(apiUrl) || !isLoopbackUrl(dbUrl)) {
    throw new Error(
      "Past-paper integration targets must use exact loopback hostnames",
    );
  }

  return {
    url: apiUrl,
    publishableKey: status.PUBLISHABLE_KEY || status.ANON_KEY,
    serviceRoleKey: status.SERVICE_ROLE_KEY,
    dbUrl,
  };
}

const env = loadLocalSupabaseEnv();

describe("two-user local Supabase past-paper ownership and year", () => {
  let app: express.Express;
  let admin: ReturnType<typeof createClient>;
  let clientA: ReturnType<typeof createClient>;
  let clientB: ReturnType<typeof createClient>;
  let userAId = "";
  let userBId = "";
  let tokenA = "";
  let tokenB = "";
  let subjectId = 0;
  let componentId = 0;
  let foreignComponentId = 0;
  let paperCode = "";
  let attemptAOldId = 0;
  let attemptANewId = 0;
  let attemptBId = 0;

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
    const emailA = `paper-a-${stamp}@example.com`;
    const emailB = `paper-b-${stamp}@example.com`;
    const password = "PastPaper-Test-1!";
    const [createdA, createdB] = await Promise.all([
      admin.auth.admin.createUser({
        email: emailA,
        password,
        email_confirm: true,
      }),
      admin.auth.admin.createUser({
        email: emailB,
        password,
        email_confirm: true,
      }),
    ]);
    if (!createdA.data.user || !createdB.data.user) {
      throw new Error("Failed to create disposable Auth users");
    }
    userAId = createdA.data.user.id;
    userBId = createdB.data.user.id;

    const anon = createClient(env.url, env.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const [signedA, signedB] = await Promise.all([
      anon.auth.signInWithPassword({ email: emailA, password }),
      anon.auth.signInWithPassword({ email: emailB, password }),
    ]);
    tokenA = signedA.data.session?.access_token ?? "";
    tokenB = signedB.data.session?.access_token ?? "";
    if (!tokenA || !tokenB)
      throw new Error("Failed to obtain disposable Auth tokens");

    clientA = createClient(env.url, env.publishableKey, {
      global: { headers: { Authorization: `Bearer ${tokenA}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    clientB = createClient(env.url, env.publishableKey, {
      global: { headers: { Authorization: `Bearer ${tokenB}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { assessmentComponentsTable, db, syllabusVersionsTable } =
      await import("@workspace/db");
    const components = await db
      .select({
        id: assessmentComponentsTable.id,
        paperCode: assessmentComponentsTable.paperCode,
        subjectId: syllabusVersionsTable.subjectId,
      })
      .from(assessmentComponentsTable)
      .innerJoin(
        syllabusVersionsTable,
        eq(
          assessmentComponentsTable.syllabusVersionId,
          syllabusVersionsTable.id,
        ),
      )
      .orderBy(assessmentComponentsTable.id)
      .limit(100);
    const component = components[0];
    if (!component) {
      throw new Error(
        "Local catalogue has no assessment component; import syllabus first",
      );
    }
    componentId = component.id;
    subjectId = component.subjectId;
    paperCode = component.paperCode;
    const foreignComponent = components.find(
      (candidate) => candidate.subjectId !== subjectId,
    );
    if (!foreignComponent) {
      throw new Error(
        "Local catalogue needs components for at least two subjects",
      );
    }
    foreignComponentId = foreignComponent.id;
  }, 120_000);

  afterAll(async () => {
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  });

  it("requires authentication and validates server-owned identity, year, and marks", async () => {
    expect((await request(app).get("/api/past-paper-attempts")).status).toBe(
      401,
    );
    expect(
      (await request(app).get(`/api/subjects/${subjectId}/performance`)).status,
    ).toBe(401);

    const base = {
      subjectId,
      componentId,
      session: "May/June",
      year: 2024,
      score: 50,
      totalMarks: 100,
      dateAttempted: "2026-01-10",
    };
    const spoof = await request(app)
      .post("/api/past-paper-attempts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ ...base, userId: userBId });
    const invalidYear = await request(app)
      .post("/api/past-paper-attempts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ ...base, year: 999 });
    const invalidMarks = await request(app)
      .post("/api/past-paper-attempts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ ...base, score: 101 });
    const negativeScore = await request(app)
      .post("/api/past-paper-attempts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ ...base, score: -1 });
    const zeroMarks = await request(app)
      .post("/api/past-paper-attempts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ ...base, totalMarks: 0 });
    const missingSubject = await request(app)
      .post("/api/past-paper-attempts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ ...base, subjectId: 999_999_999 });
    const mismatchedComponent = await request(app)
      .post("/api/past-paper-attempts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ ...base, componentId: foreignComponentId });
    const invalidDate = await request(app)
      .post("/api/past-paper-attempts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ ...base, dateAttempted: "2026-02-30" });

    expect(spoof.status).toBe(400);
    expect(invalidYear.status).toBe(400);
    expect(invalidMarks.status).toBe(400);
    expect(negativeScore.status).toBe(400);
    expect(zeroMarks.status).toBe(400);
    expect(missingSubject.status).toBe(400);
    expect(mismatchedComponent.status).toBe(400);
    expect(invalidDate.status).toBe(400);
  });

  it("creates owned attempts, derives percentage, and includes year in identity", async () => {
    const oldA = await request(app)
      .post("/api/past-paper-attempts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        subjectId,
        componentId,
        variant: 1,
        session: "May/June",
        year: 2024,
        score: 50,
        totalMarks: 100,
        percentage: 1,
        dateAttempted: "2026-01-10",
        notes: "first A attempt",
      });
    const newA = await request(app)
      .post("/api/past-paper-attempts")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        subjectId,
        componentId,
        variant: 1,
        session: "May/June",
        year: 2024,
        score: 80,
        totalMarks: 100,
        dateAttempted: "2026-02-10",
      });
    const onlyB = await request(app)
      .post("/api/past-paper-attempts")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({
        subjectId,
        componentId,
        variant: 1,
        session: "May/June",
        year: 2024,
        score: 30,
        totalMarks: 100,
        dateAttempted: "2026-03-10",
      });

    expect(oldA.status).toBe(201);
    expect(newA.status).toBe(201);
    expect(onlyB.status).toBe(201);
    expect(oldA.body.percentage).toBe(50);
    expect(newA.body).toMatchObject({
      year: 2024,
      percentage: 80,
      paperLabel: `${paperCode}1 — May/June 2024`,
    });
    expect(onlyB.body.paperLabel).toBe(`${paperCode}1 — May/June 2024`);
    expect(oldA.body).not.toHaveProperty("userId");
    attemptAOldId = oldA.body.id;
    attemptANewId = newA.body.id;
    attemptBId = onlyB.body.id;
    expect(new Set([attemptAOldId, attemptANewId, attemptBId]).size).toBe(3);
  });

  it("isolates list/read rows and orders each caller's newest attempt first", async () => {
    const [listA, listB] = await Promise.all([
      request(app)
        .get(`/api/past-paper-attempts?subjectId=${subjectId}`)
        .set("Authorization", `Bearer ${tokenA}`),
      request(app)
        .get("/api/past-paper-attempts")
        .set("Authorization", `Bearer ${tokenB}`),
    ]);
    expect(listA.status).toBe(200);
    expect(listB.status).toBe(200);
    expect(listA.body.map((row: { id: number }) => row.id)).toEqual([
      attemptANewId,
      attemptAOldId,
    ]);
    expect(listB.body.map((row: { id: number }) => row.id)).toEqual([
      attemptBId,
    ]);
    expect(listA.body.map((row: { year: number }) => row.year)).toEqual([
      2024, 2024,
    ]);

    const directA = await clientA
      .from("past_paper_attempts")
      .select("id,user_id");
    const directB = await clientB
      .from("past_paper_attempts")
      .select("id,user_id");
    expect(directA.error).toBeNull();
    expect(directB.error).toBeNull();
    expect(directA.data).toEqual([
      expect.objectContaining({ id: attemptAOldId, user_id: userAId }),
      expect.objectContaining({ id: attemptANewId, user_id: userAId }),
    ]);
    expect(directB.data).toEqual([
      expect.objectContaining({ id: attemptBId, user_id: userBId }),
    ]);
  });

  it("blocks owner spoofing, cross-user delete, and every update path", async () => {
    const spoofInsert = await clientA.from("past_paper_attempts").insert({
      user_id: userBId,
      subject_id: subjectId,
      component_id: componentId,
      session: "Specimen",
      year: 2026,
      score: 10,
      total_marks: 20,
      percentage: 50,
      date_attempted: "2026-04-10",
    } as never);
    expect(spoofInsert.error).toBeTruthy();

    const directDelete = await clientB
      .from("past_paper_attempts")
      .delete()
      .eq("id", attemptAOldId)
      .select("id");
    expect(directDelete.error).toBeNull();
    expect(directDelete.data).toEqual([]);

    const apiDelete = await request(app)
      .delete(`/api/past-paper-attempts/${attemptAOldId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    const missingDelete = await request(app)
      .delete("/api/past-paper-attempts/999999999")
      .set("Authorization", `Bearer ${tokenA}`);
    const apiPatch = await request(app)
      .patch(`/api/past-paper-attempts/${attemptAOldId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ notes: "not supported" });
    const directUpdate = await clientA
      .from("past_paper_attempts")
      .update({ notes: "not granted" } as never)
      .eq("id", attemptAOldId);
    expect(apiDelete.status).toBe(404);
    expect(missingDelete.status).toBe(404);
    expect(apiPatch.status).toBe(404);
    expect(directUpdate.error).toBeTruthy();
  });

  it("computes caller-only dashboard, progress, and subject performance", async () => {
    const [
      dashboardA,
      dashboardB,
      progressA,
      progressB,
      performanceA,
      performanceB,
    ] = await Promise.all([
      request(app)
        .get("/api/dashboard/summary")
        .set("Authorization", `Bearer ${tokenA}`),
      request(app)
        .get("/api/dashboard/summary")
        .set("Authorization", `Bearer ${tokenB}`),
      request(app)
        .get("/api/progress/overview")
        .set("Authorization", `Bearer ${tokenA}`),
      request(app)
        .get("/api/progress/overview")
        .set("Authorization", `Bearer ${tokenB}`),
      request(app)
        .get(`/api/subjects/${subjectId}/performance`)
        .set("Authorization", `Bearer ${tokenA}`),
      request(app)
        .get(`/api/subjects/${subjectId}/performance`)
        .set("Authorization", `Bearer ${tokenB}`),
    ]);

    for (const response of [
      dashboardA,
      dashboardB,
      progressA,
      progressB,
      performanceA,
      performanceB,
    ]) {
      expect(response.status).toBe(200);
    }
    expect(dashboardA.body.recentPerformance).toEqual([
      expect.objectContaining({
        subjectId,
        latestPercentage: 80,
        previousPercentage: 50,
        change: 30,
        paperLabel: `${paperCode}1 — May/June 2024`,
      }),
    ]);
    expect(dashboardB.body.recentPerformance).toEqual([
      expect.objectContaining({
        subjectId,
        latestPercentage: 30,
        previousPercentage: null,
        change: null,
      }),
    ]);
    expect(progressA.body.totalPapersLogged).toBe(2);
    expect(progressB.body.totalPapersLogged).toBe(1);
    expect(performanceA.body).toMatchObject({
      subjectId,
      latestScore: 80,
      averageScore: 65,
      bestScore: 80,
      papersCompleted: 2,
      insight: null,
    });
    expect(performanceA.body.trend).toEqual([
      { label: "May/June 2024", percentage: 50, session: "May/June" },
      { label: "May/June 2024", percentage: 80, session: "May/June" },
    ]);
    expect(performanceA.body.componentBreakdown).toEqual([
      expect.objectContaining({
        componentId,
        latestPercentage: 80,
        attempts: 2,
      }),
    ]);
    expect(performanceB.body).toMatchObject({
      latestScore: 30,
      averageScore: 30,
      bestScore: 30,
      papersCompleted: 1,
    });

    const publicSubjects = await request(app).get("/api/subjects");
    const publicSubject = publicSubjects.body.find(
      (subject: { id: number }) => subject.id === subjectId,
    );
    expect(publicSubject).toMatchObject({
      recentPaperScore: null,
      recentPaperLabel: null,
    });
  });

  it("has the reviewed columns, guard, FK, indexes, RLS, grants, and journal", async () => {
    const { db } = await import("@workspace/db");
    const columns = await db.execute(sql`
      select column_name, data_type, is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'past_paper_attempts'
        and column_name in ('user_id', 'year')
      order by column_name
    `);
    expect(columns.rows).toEqual([
      { column_name: "user_id", data_type: "uuid", is_nullable: "NO" },
      { column_name: "year", data_type: "integer", is_nullable: "NO" },
    ]);

    const security = await db.execute(sql`
      select
        (select relrowsecurity from pg_class where oid = 'public.past_paper_attempts'::regclass) as rls,
        (select confdeltype from pg_constraint
          where conname = 'past_paper_attempts_user_id_auth_users_id_fk') as delete_action,
        (select json_agg(policyname order by policyname) from pg_policies
          where schemaname = 'public' and tablename = 'past_paper_attempts') as policies,
        (select json_agg(privilege_type order by privilege_type)
          from information_schema.role_table_grants
          where table_schema = 'public' and table_name = 'past_paper_attempts'
            and grantee = 'authenticated') as grants,
        (select json_agg(indexname order by indexname) from pg_indexes
          where schemaname = 'public' and tablename = 'past_paper_attempts'
            and indexname like 'past_paper_attempts_user_%') as indexes,
        (select pg_get_constraintdef(oid) from pg_constraint
          where conname = 'past_paper_attempts_year_four_digit') as year_check,
        (select count(*)::int from information_schema.role_table_grants
          where table_schema = 'public' and table_name = 'past_paper_attempts'
            and grantee = 'anon') as anon_grants,
        json_build_object(
          'usage', has_sequence_privilege('authenticated', 'public.past_papers_id_seq', 'USAGE'),
          'select', has_sequence_privilege('authenticated', 'public.past_papers_id_seq', 'SELECT')
        ) as sequence_grants
    `);
    expect(security.rows[0]).toEqual({
      rls: true,
      delete_action: "c",
      policies: [
        "past_paper_attempts_delete_own",
        "past_paper_attempts_insert_own",
        "past_paper_attempts_select_own",
      ],
      grants: ["DELETE", "INSERT", "SELECT"],
      indexes: [
        "past_paper_attempts_user_date_id_idx",
        "past_paper_attempts_user_subject_date_id_idx",
      ],
      year_check: "CHECK (((year >= 1000) AND (year <= 9999)))",
      anon_grants: 0,
      sequence_grants: { usage: true, select: true },
    });

    const migrationPath = path.join(
      repoRoot,
      "lib",
      "db",
      "migrations",
      "0008_uneven_mojo.sql",
    );
    const migration = readFileSync(migrationPath, "utf8");
    const expectedHash = createHash("sha256").update(migration).digest("hex");
    expect(migration).toContain("past_paper_attempts_not_empty");
    expect(migration).toContain("ERRCODE = '55000'");
    expect(migration).not.toContain("FOR UPDATE TO authenticated");

    const journal = await db.execute(sql`
      select count(*)::int as count, max(created_at)::text as latest,
        (array_agg(hash order by created_at desc))[1] as latest_hash
      from drizzle.__drizzle_migrations
    `);
    expect(journal.rows[0]).toEqual({
      count: 9,
      latest: "1786394449630",
      latest_hash: expectedHash,
    });
  });

  it("lets User A delete only their own attempt", async () => {
    const deleted = await request(app)
      .delete(`/api/past-paper-attempts/${attemptAOldId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(deleted.status).toBe(204);

    const [listA, listB] = await Promise.all([
      request(app)
        .get("/api/past-paper-attempts")
        .set("Authorization", `Bearer ${tokenA}`),
      request(app)
        .get("/api/past-paper-attempts")
        .set("Authorization", `Bearer ${tokenB}`),
    ]);
    expect(listA.body.map((row: { id: number }) => row.id)).toEqual([
      attemptANewId,
    ]);
    expect(listB.body.map((row: { id: number }) => row.id)).toEqual([
      attemptBId,
    ]);
  });
});
