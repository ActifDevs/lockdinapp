import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const getClaims = vi.fn();
const from = vi.fn();
const trackTaskCreated = vi.fn();

vi.mock("../lib/supabase-verifier.js", () => ({
  getSupabaseVerifier: () => ({
    auth: { getClaims },
  }),
}));

vi.mock("../lib/supabase-user-client.js", () => ({
  createUserScopedSupabaseClient: () => ({ from }),
}));

vi.mock("../lib/enrich-task.js", () => ({
  enrichTask: async (task: unknown) => ({
    ...(task as object),
    subjectName: "Physics",
    subjectColor: "#000",
    topicTitle: null,
  }),
  enrichTasks: async (tasks: unknown[]) => tasks,
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock("../lib/pin-reference-writes.js", () => ({
  assertTopicOnCallerPin: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("../lib/analytics/index.js", () => ({
  fireAndForgetAnalytics: async (work: () => Promise<void>) => {
    try {
      await work();
    } catch {
      // product writes must not fail
    }
  },
  trackTaskCreated: (...args: unknown[]) => trackTaskCreated(...args),
}));

const USER = "02444f79-c2bb-4596-ae99-d5d6877f1001";

function mockInsertOk() {
  from.mockReturnValue({
    insert: () => ({
      select: () => ({
        single: async () => ({
          data: {
            id: 9,
            user_id: USER,
            title: "Revise",
            subject_id: 1,
            topic_id: null,
            deadline: null,
            priority: "medium",
            estimated_minutes: null,
            completed: false,
            completed_at: null,
            created_at: "2026-08-30T00:00:00Z",
          },
          error: null,
        }),
      }),
    }),
  });
}

describe("task create analytics", () => {
  let app: express.Express;

  beforeAll(async () => {
    const { default: tasksRouter } = await import("./tasks.js");
    app = express();
    app.use(express.json());
    app.use("/api", tasksRouter);
  });

  beforeEach(() => {
    getClaims.mockReset();
    from.mockReset();
    trackTaskCreated.mockReset();
    getClaims.mockResolvedValue({
      data: { claims: { sub: USER } },
      error: null,
    });
    mockInsertOk();
  });

  it("emits task_created on every successful create, not 0→1", async () => {
    trackTaskCreated.mockResolvedValue(undefined);
    const first = await request(app)
      .post("/api/tasks")
      .set("Authorization", "Bearer good-token")
      .send({ title: "One", subjectId: 1, priority: "medium" });
    const second = await request(app)
      .post("/api/tasks")
      .set("Authorization", "Bearer good-token")
      .send({ title: "Two", subjectId: 1, priority: "medium" });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(trackTaskCreated).toHaveBeenCalledTimes(2);
    expect(trackTaskCreated).toHaveBeenCalledWith({ userId: USER });
  });

  it("still creates the task when PostHog throws", async () => {
    trackTaskCreated.mockRejectedValue(new Error("posthog down"));
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", "Bearer good-token")
      .send({ title: "Survive", subjectId: 1, priority: "medium" });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Revise");
  });
});
