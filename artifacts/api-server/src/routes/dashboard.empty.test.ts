import { beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

/**
 * Empty thenable query chain that matches the subset of the Drizzle builder
 * used by dashboard.ts (select/from/where/orderBy).
 */
function emptyQuery() {
  const result: never[] = [];
  const api: Record<string, unknown> = {
    where: () => api,
    orderBy: () => api,
    limit: () => api,
    then: (onFulfilled: (v: never[]) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
    catch: (onRejected: (e: unknown) => unknown) => Promise.resolve(result).catch(onRejected),
    finally: (onFinally: () => void) => Promise.resolve(result).finally(onFinally),
  };
  return api;
}

vi.mock("@workspace/db", () => {
  const db = {
    select: () => ({
      from: () => emptyQuery(),
    }),
  };
  return {
    db,
    subjectsTable: {},
    syllabusTopicsTable: {},
  };
});

vi.mock("../middlewares/require-auth.js", () => ({
  requireAuth: (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.userId = "02444f79-c2bb-4596-ae99-d5d6877f1001";
    req.accessToken = "test-token";
    next();
  },
}));

vi.mock("../lib/supabase-user-client.js", () => ({
  createUserScopedSupabaseClient: () => ({}),
}));

vi.mock("../lib/user-tasks.js", () => ({
  listUserTaskRows: async () => ({ data: [], error: null }),
  mappedUserTasks: () => [],
}));

vi.mock("../lib/enrich-task.js", () => ({
  enrichTasks: async () => [],
}));

vi.mock("../lib/past-paper-attempts.js", () => ({
  listUserPastPaperRows: async () => ({ data: [], error: null }),
  enrichPastPaperRows: async () => [],
}));

vi.mock("../lib/exam-dates.js", () => ({
  listUserExamDateRows: async () => ({ data: [], error: null }),
  filterUpcomingExamRows: () => [],
  enrichExamDateRows: async () => [],
}));

describe("GET /api/dashboard/summary — empty / new-user DB", () => {
  let app: express.Express;

  beforeAll(async () => {
    const { default: dashboardRouter } = await import("./dashboard.js");
    app = express();
    app.use("/api", dashboardRouter);
  });

  it("returns 200 with an empty dashboard payload (no subjects/tasks/exams/papers)", async () => {
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      studentName: "Student",
      studyStreakDays: 0,
      todayTasksTotal: 0,
      todayTasksCompleted: 0,
      todayTasks: [],
      upcomingDeadlines: [],
      subjectProgressSummary: [],
      recentPerformance: [],
      upcomingExams: [],
    });
  });
});
