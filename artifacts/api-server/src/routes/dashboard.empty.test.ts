import { beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

/**
 * Empty thenable query chain that matches the subset of the Drizzle builder
 * used by dashboard.ts (select/from/where/orderBy/limit).
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
    tasksTable: {},
    pastPaperAttemptsTable: {},
    assessmentComponentsTable: {},
    examDatesTable: {},
  };
});

describe("GET /api/dashboard/summary — empty / new-user DB", () => {
  let app: express.Express;

  beforeAll(async () => {
    // Import after mock so the route binds to the empty db stub.
    const { default: dashboardRouter } = await import("./dashboard.js");
    app = express();
    app.use("/api", dashboardRouter);
  });

  it("returns 200 with an empty dashboard payload (no subjects/tasks/exams/papers)", async () => {
    const res = await request(app).get("/api/dashboard/summary");

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
