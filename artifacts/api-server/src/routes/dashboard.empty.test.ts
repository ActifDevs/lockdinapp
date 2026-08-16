import { beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const profileName = vi.hoisted(() => ({
  value: "Ada Student" as string | null,
}));

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
  createUserScopedSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { full_name: profileName.value },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("../lib/user-subject-progress.js", () => ({
  getUserSubjectProgress: async () => ({
    data: {
      syllabusCompletion: [
        {
          subjectId: 2,
          subjectName: "Chemistry",
          subjectColor: "#222222",
          syllabusProgress: 75,
        },
        {
          subjectId: 1,
          subjectName: "Physics",
          subjectColor: "#111111",
          syllabusProgress: 25,
        },
      ],
      overallSyllabusProgress: 50,
    },
    error: null,
    context: null,
  }),
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

  it("falls back to Student only when the caller profile name is null", async () => {
    profileName.value = null;
    const response = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", "Bearer test-token");
    expect(response.status).toBe(200);
    expect(response.body.studentName).toBe("Student");
    profileName.value = "Ada Student";
  });

  it("returns the profile name and real membership-scoped progress", async () => {
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      studentName: "Ada Student",
      studyStreakDays: 0,
      todayTasksTotal: 0,
      todayTasksCompleted: 0,
      todayTasks: [],
      upcomingDeadlines: [],
      subjectProgressSummary: [
        {
          subjectId: 2,
          subjectName: "Chemistry",
          subjectColor: "#222222",
          syllabusProgress: 75,
        },
        {
          subjectId: 1,
          subjectName: "Physics",
          subjectColor: "#111111",
          syllabusProgress: 25,
        },
      ],
      recentPerformance: [],
      upcomingExams: [],
    });
  });
});
