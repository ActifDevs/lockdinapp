import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const getClaims = vi.fn();
const from = vi.fn();
const rpc = vi.fn();

vi.mock("@workspace/db", () => ({
  db: {},
  subjectsTable: {},
  syllabusTopicsTable: {},
  syllabusVersionsTable: {},
}));

vi.mock("../lib/supabase-verifier.js", () => ({
  getSupabaseVerifier: () => ({ auth: { getClaims } }),
}));

vi.mock("../lib/supabase-user-client.js", () => ({
  createUserScopedSupabaseClient: () => ({ from, rpc }),
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

describe("user-subject membership auth and validation", () => {
  let app: express.Express;

  beforeAll(async () => {
    const { default: router } = await import("./user-subjects.js");
    app = express();
    app.use(express.json());
    app.use("/api", router);
  });

  beforeEach(() => {
    getClaims.mockReset();
    from.mockReset();
    rpc.mockReset();
  });

  function authenticate() {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "02444f79-c2bb-4596-ae99-d5d6877f1001" } },
      error: null,
    });
    rpc.mockResolvedValue({
      data: null,
      error: { code: "22023", message: "invalid_subject_selection" },
    });
  }

  it("rejects unauthenticated list and replacement", async () => {
    const list = await request(app).get("/api/user-subjects");
    const replace = await request(app).put("/api/user-subjects").send({ subjectIds: [1] });
    expect(list.status).toBe(401);
    expect(replace.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects client-controlled ownership fields", async () => {
    authenticate();
    const response = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", "Bearer good-token")
      .send({
        userId: "11111111-1111-1111-1111-111111111111",
        subjectIds: [1],
      });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects client-supplied syllabus version ids", async () => {
    authenticate();
    const response = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", "Bearer good-token")
      .send({
        subjectIds: [1],
        syllabusVersionId: 99,
      });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["zero", []],
    ["six", [1, 2, 3, 4, 5, 6]],
    ["duplicates", [1, 1]],
    ["zero ID", [0]],
    ["fractional ID", [1.5]],
  ])("rejects %s subjects before RPC", async (_label, subjectIds) => {
    authenticate();
    const response = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", "Bearer good-token")
      .send({ subjectIds });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    { subjectIds: [1] },
    { subjectIds: [1, 2] },
    { subjectIds: [1, 2, 3] },
    { subjectIds: [1, 2, 3, 4] },
    { subjectIds: [1, 2, 3, 4, 5] },
    { subjectIds: [999999] },
  ])(
    "passes a contract-valid selection to the database RPC: $subjectIds",
    async ({ subjectIds }) => {
      authenticate();
      const response = await request(app)
        .put("/api/user-subjects")
        .set("Authorization", "Bearer good-token")
        .send({ subjectIds });
      expect(response.status).toBe(400);
      expect(rpc).toHaveBeenCalledWith("lockdin_replace_user_subjects", {
        p_subject_ids: subjectIds,
      });
    },
  );

  it("maps missing-session assignment to a safe 400", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "02444f79-c2bb-4596-ae99-d5d6877f1001" } },
      error: null,
    });
    rpc.mockResolvedValue({
      data: null,
      error: { code: "22023", message: "intended_exam_session_required" },
    });
    const response = await request(app)
      .put("/api/user-subjects")
      .set("Authorization", "Bearer good-token")
      .send({ subjectIds: [1] });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Choose a supported exam session.");
  });
});
