import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const getClaims = vi.fn();
const from = vi.fn();

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
  enrichTasks: async (tasks: unknown[]) =>
    tasks.map((task) => ({
      ...(task as object),
      subjectName: "Physics",
      subjectColor: "#000",
      topicTitle: null,
    })),
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

describe("tasks auth contract", () => {
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
  });

  it("rejects anonymous list with 401", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("rejects body userId on create", async () => {
    getClaims.mockResolvedValue({
      data: {
        claims: { sub: "02444f79-c2bb-4596-ae99-d5d6877f1001" },
      },
      error: null,
    });

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", "Bearer good-token")
      .send({
        title: "Owned?",
        subjectId: 1,
        priority: "medium",
        userId: "11111111-1111-1111-1111-111111111111",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/userId/i);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects body user_id on create", async () => {
    getClaims.mockResolvedValue({
      data: {
        claims: { sub: "02444f79-c2bb-4596-ae99-d5d6877f1001" },
      },
      error: null,
    });

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", "Bearer good-token")
      .send({
        title: "Owned?",
        subjectId: 1,
        priority: "medium",
        user_id: "11111111-1111-1111-1111-111111111111",
      });

    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
});
