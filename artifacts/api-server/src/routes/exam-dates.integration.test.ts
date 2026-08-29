/**
 * Two-user local Supabase integration tests for Phase 3 Slice 4 exam-date ownership.
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
import { sql } from "drizzle-orm";

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
      "Exam-date integration targets must use exact loopback hostnames",
    );
  }

  return {
    url: apiUrl,
    publishableKey: status.PUBLISHABLE_KEY || status.ANON_KEY,
    serviceRoleKey: status.SERVICE_ROLE_KEY,
    dbUrl,
  };
}

function daysFromToday(offset: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

const env = loadLocalSupabaseEnv();

describe("two-user local Supabase exam-date ownership", () => {
  let app: express.Express;
  let admin: ReturnType<typeof createClient>;
  let clientA: ReturnType<typeof createClient>;
  let clientB: ReturnType<typeof createClient>;
  let userAId = "";
  let userBId = "";
  let tokenA = "";
  let tokenB = "";
  let subjectId = 0;
  let examANearId = 0;
  let examAFarId = 0;
  let examABeyondId = 0;
  let examBId = 0;

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
    const emailA = `exam-a-${stamp}@example.com`;
    const emailB = `exam-b-${stamp}@example.com`;
    const password = "ExamDate-Test-1!";
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

    const { db, subjectsTable } = await import("@workspace/db");
    const subjects = await db
      .select({ id: subjectsTable.id })
      .from(subjectsTable)
      .orderBy(subjectsTable.id)
      .limit(1);
    const subject = subjects[0];
    if (!subject) {
      throw new Error(
        "Local catalogue has no subjects; import syllabus first",
      );
    }
    subjectId = subject.id;
  }, 120_000);

  afterAll(async () => {
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  });

  it("requires authentication and rejects ownership spoof aliases", async () => {
    expect((await request(app).get("/api/exam-dates")).status).toBe(401);

    for (const field of ["userId", "user_id", "ownerId", "owner_id"] as const) {
      const res = await request(app)
        .post("/api/exam-dates")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          subjectId,
          paperCode: "P1",
          date: daysFromToday(7),
          [field]: userBId,
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Ownership fields/i);
    }

    const missingSubject = await request(app)
      .post("/api/exam-dates")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        subjectId: 999999999,
        paperCode: "P1",
        date: daysFromToday(7),
      });
    expect(missingSubject.status).toBe(400);

    const badDate = await request(app)
      .post("/api/exam-dates")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        subjectId,
        paperCode: "P1",
        date: "2026-02-30",
      });
    expect(badDate.status).toBe(400);
  });

  it("lets each user create and list only their own chronological exam dates", async () => {
    const near = daysFromToday(3);
    const far = daysFromToday(40);
    const past = daysFromToday(-5);
    const beyondWindow = daysFromToday(90);

    const createANear = await request(app)
      .post("/api/exam-dates")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ subjectId, paperCode: "P1", date: near, notes: "near" });
    expect(createANear.status).toBe(201);
    examANearId = createANear.body.id;
    expect(createANear.body).toMatchObject({
      subjectId,
      paperCode: "P1",
      date: near,
      notes: "near",
    });
    expect(createANear.body).not.toHaveProperty("userId");
    expect(createANear.body).not.toHaveProperty("user_id");

    const createAFar = await request(app)
      .post("/api/exam-dates")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ subjectId, paperCode: "P2", date: far });
    expect(createAFar.status).toBe(201);
    examAFarId = createAFar.body.id;

    const createAPast = await request(app)
      .post("/api/exam-dates")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ subjectId, paperCode: "Past", date: past });
    expect(createAPast.status).toBe(201);

    const createABeyond = await request(app)
      .post("/api/exam-dates")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ subjectId, paperCode: "Far", date: beyondWindow });
    expect(createABeyond.status).toBe(201);
    examABeyondId = createABeyond.body.id;

    const createB = await request(app)
      .post("/api/exam-dates")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ subjectId, paperCode: "B1", date: near });
    expect(createB.status).toBe(201);
    examBId = createB.body.id;

    const [listA, listB] = await Promise.all([
      request(app)
        .get("/api/exam-dates")
        .set("Authorization", `Bearer ${tokenA}`),
      request(app)
        .get("/api/exam-dates")
        .set("Authorization", `Bearer ${tokenB}`),
    ]);
    expect(listA.status).toBe(200);
    expect(listB.status).toBe(200);

    const idsA = listA.body.map((row: { id: number }) => row.id);
    const idsB = listB.body.map((row: { id: number }) => row.id);
    expect(idsA).toContain(examANearId);
    expect(idsA).toContain(examAFarId);
    expect(idsA).toContain(examABeyondId);
    expect(idsA).not.toContain(examBId);
    expect(idsB).toEqual([examBId]);

    const datesA = listA.body.map((row: { date: string }) => row.date);
    expect(datesA).toEqual([...datesA].sort());

    const dashboard = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(dashboard.status).toBe(200);
    const upcomingIds = dashboard.body.upcomingExams.map(
      (row: { id: number }) => row.id,
    );
    // date >= today only — exams beyond +60 days must still be included.
    expect(upcomingIds).toEqual([examANearId, examAFarId, examABeyondId]);
    expect(upcomingIds).not.toContain(examBId);
    expect(
      dashboard.body.upcomingExams.find(
        (row: { id: number }) => row.id === examABeyondId,
      )?.date,
    ).toBe(beyondWindow);

    const dashboardB = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(
      dashboardB.body.upcomingExams.map((row: { id: number }) => row.id),
    ).toEqual([examBId]);
  });

  it("enforces RLS and denies UPDATE and cross-user writes", async () => {
    const spoofInsert = await clientA.from("exam_dates").insert({
      user_id: userBId,
      subject_id: subjectId,
      paper_code: "SPOOF",
      date: daysFromToday(10),
    } as never);
    expect(spoofInsert.error).toBeTruthy();

    const foreignSelect = await clientB
      .from("exam_dates")
      .select("id")
      .eq("id", examANearId);
    expect(foreignSelect.data ?? []).toEqual([]);

    const foreignDirectDelete = await clientB
      .from("exam_dates")
      .delete()
      .eq("id", examANearId)
      .select("id");
    expect(foreignDirectDelete.error).toBeNull();
    expect(foreignDirectDelete.data ?? []).toEqual([]);

    const updateDenied = await clientA
      .from("exam_dates")
      .update({ paper_code: "HACK" } as never)
      .eq("id", examANearId)
      .select("id");
    expect(
      Boolean(updateDenied.error) || (updateDenied.data ?? []).length === 0,
    ).toBe(true);

    const stillNear = await request(app)
      .get("/api/exam-dates")
      .set("Authorization", `Bearer ${tokenA}`);
    const nearRow = stillNear.body.find(
      (row: { id: number }) => row.id === examANearId,
    );
    expect(nearRow?.paperCode).toBe("P1");
  });

  it("deletes only caller-owned rows with nondisclosing 404", async () => {
    const foreignDelete = await request(app)
      .delete(`/api/exam-dates/${examANearId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(foreignDelete.status).toBe(404);

    const missing = await request(app)
      .delete("/api/exam-dates/999999999")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(missing.status).toBe(404);

    const deleted = await request(app)
      .delete(`/api/exam-dates/${examANearId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(deleted.status).toBe(204);

    const listA = await request(app)
      .get("/api/exam-dates")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(
      listA.body.map((row: { id: number }) => row.id),
    ).not.toContain(examANearId);
  });

  it("has the reviewed columns, lock, guard, FK, index, RLS, grants, and journal", async () => {
    const { db } = await import("@workspace/db");
    const columns = await db.execute(sql`
      select column_name, data_type, is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'exam_dates'
        and column_name = 'user_id'
    `);
    expect(columns.rows).toEqual([
      { column_name: "user_id", data_type: "uuid", is_nullable: "NO" },
    ]);

    const security = await db.execute(sql`
      select
        (select relrowsecurity from pg_class where oid = 'public.exam_dates'::regclass) as rls,
        (select confdeltype from pg_constraint
          where conname = 'exam_dates_user_id_auth_users_id_fk') as delete_action,
        (select json_agg(policyname order by policyname) from pg_policies
          where schemaname = 'public' and tablename = 'exam_dates') as policies,
        (select json_agg(privilege_type order by privilege_type)
          from information_schema.role_table_grants
          where table_schema = 'public' and table_name = 'exam_dates'
            and grantee = 'authenticated') as grants,
        (select json_agg(indexname order by indexname) from pg_indexes
          where schemaname = 'public' and tablename = 'exam_dates'
            and indexname like 'exam_dates_user_%') as indexes,
        (select count(*)::int from information_schema.role_table_grants
          where table_schema = 'public' and table_name = 'exam_dates'
            and grantee = 'anon') as anon_grants,
        pg_get_serial_sequence('public.exam_dates', 'id') as backing_sequence,
        json_build_object(
          'usage', has_sequence_privilege(
            'authenticated',
            pg_get_serial_sequence('public.exam_dates', 'id'),
            'USAGE'
          ),
          'select', has_sequence_privilege(
            'authenticated',
            pg_get_serial_sequence('public.exam_dates', 'id'),
            'SELECT'
          ),
          'update', has_sequence_privilege(
            'authenticated',
            pg_get_serial_sequence('public.exam_dates', 'id'),
            'UPDATE'
          )
        ) as sequence_grants,
        has_table_privilege('authenticated', 'public.exam_dates', 'UPDATE') as can_update
    `);
    expect(security.rows[0]).toMatchObject({
      rls: true,
      delete_action: "c",
      policies: [
        "exam_dates_delete_own",
        "exam_dates_insert_own",
        "exam_dates_select_own",
      ],
      grants: ["DELETE", "INSERT", "SELECT"],
      indexes: ["exam_dates_user_date_id_idx"],
      anon_grants: 0,
      sequence_grants: { usage: true, select: true, update: false },
      can_update: false,
    });
    expect(security.rows[0].backing_sequence).toEqual(expect.any(String));

    const migrationPath = path.join(
      repoRoot,
      "lib",
      "db",
      "migrations",
      "0009_dear_mathemanic.sql",
    );
    const migration = readFileSync(migrationPath, "utf8");
    expect(migration).toContain("LOCK TABLE public.exam_dates");
    expect(migration).toContain("exam_dates_not_empty");
    expect(migration).toContain("ERRCODE = '55000'");
    expect(migration).toContain("pg_get_serial_sequence('public.exam_dates', 'id')");
    expect(migration).not.toContain("FOR UPDATE");
    expect(migration).not.toContain("GRANT UPDATE");

    const migration0011Path = path.join(
      repoRoot,
      "lib",
      "db",
      "migrations",
      "0011_open_sunfire.sql",
    );
    const expectedLatestHash = createHash("sha256")
      .update(readFileSync(migration0011Path))
      .digest("hex");

    const journal = await db.execute(sql`
      select count(*)::int as count, max(created_at)::text as latest,
        (array_agg(hash order by created_at desc))[1] as latest_hash
      from drizzle.__drizzle_migrations
    `);
    expect(journal.rows[0]).toEqual({
      count: 12,
      latest: "1788003568152",
      latest_hash: expectedLatestHash,
    });
  });
});
