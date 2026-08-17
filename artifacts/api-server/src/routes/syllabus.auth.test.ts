import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const getClaims = vi.fn();
const rpc = vi.fn();

vi.mock("@workspace/db", () => ({
  db: {},
}));

vi.mock("../lib/supabase-verifier.js", () => ({
  getSupabaseVerifier: () => ({ auth: { getClaims } }),
}));

vi.mock("../lib/supabase-user-client.js", () => ({
  createUserScopedSupabaseClient: () => ({ rpc }),
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

describe("syllabus topic progress auth and validation", () => {
  let app: express.Express;

  beforeAll(async () => {
    const { default: router } = await import("./syllabus.js");
    app = express();
    app.use(express.json());
    app.use("/api", router);
  });

  beforeEach(() => {
    getClaims.mockReset();
    rpc.mockReset();
  });

  function authenticate() {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "02444f79-c2bb-4596-ae99-d5d6877f1001" } },
      error: null,
    });
  }

  it("rejects unauthenticated patch and reset", async () => {
    const patch = await request(app)
      .patch("/api/syllabus-topics/1")
      .send({ status: "completed" });
    const reset = await request(app).delete("/api/syllabus-topics/1");
    expect(patch.status).toBe(401);
    expect(reset.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects client-controlled ownership fields", async () => {
    authenticate();
    const response = await request(app)
      .patch("/api/syllabus-topics/1")
      .set("Authorization", "Bearer good-token")
      .send({
        userId: "11111111-1111-1111-1111-111111111111",
        status: "completed",
      });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects invalid status before RPC", async () => {
    authenticate();
    const response = await request(app)
      .patch("/api/syllabus-topics/1")
      .set("Authorization", "Bearer good-token")
      .send({ status: "done" });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects oversized notes before RPC", async () => {
    authenticate();
    const response = await request(app)
      .patch("/api/syllabus-topics/1")
      .set("Authorization", "Bearer good-token")
      .send({ status: "in_progress", notes: "x".repeat(2001) });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("trims empty notes to null for upsert RPC", async () => {
    authenticate();
    rpc.mockResolvedValue({
      data: [
        {
          topic_id: 1,
          status: "in_progress",
          notes: null,
        },
      ],
      error: null,
    });

    const response = await request(app)
      .patch("/api/syllabus-topics/1")
      .set("Authorization", "Bearer good-token")
      .send({ status: "in_progress", notes: "   " });

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("lockdin_upsert_topic_progress", {
      p_topic_id: 1,
      p_status: "in_progress",
      p_notes: null,
    });
    expect(response.body).toEqual({
      topicId: 1,
      status: "in_progress",
      notes: null,
    });
  });

  it("maps reset-to-default empty RPC result to not_started", async () => {
    authenticate();
    rpc.mockResolvedValue({ data: [], error: null });

    const response = await request(app)
      .patch("/api/syllabus-topics/9")
      .set("Authorization", "Bearer good-token")
      .send({ status: "not_started" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      topicId: 9,
      status: "not_started",
      notes: null,
    });
  });

  it("maps topic_not_found RPC errors to 404", async () => {
    authenticate();
    rpc.mockResolvedValue({
      data: null,
      error: { code: "22023", message: "topic_not_found" },
    });

    const response = await request(app)
      .patch("/api/syllabus-topics/999999")
      .set("Authorization", "Bearer good-token")
      .send({ status: "completed" });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Topic not found");
  });

  it("calls reset RPC and returns 204", async () => {
    authenticate();
    rpc.mockResolvedValue({ data: null, error: null });

    const response = await request(app)
      .delete("/api/syllabus-topics/3")
      .set("Authorization", "Bearer good-token");

    expect(response.status).toBe(204);
    expect(rpc).toHaveBeenCalledWith("lockdin_reset_topic_progress", {
      p_topic_id: 3,
    });
  });
});
