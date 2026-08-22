import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import cors from "cors";
import express from "express";
import request from "supertest";

const getClaims = vi.fn();

vi.mock("../lib/supabase-verifier.js", () => ({
  getSupabaseVerifier: () => ({ auth: { getClaims } }),
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

const USER_ID = "02444f79-c2bb-4596-ae99-d5d6877f1001";

describe("global API authentication policy", () => {
  let app: express.Express;

  beforeAll(async () => {
    const { default: globalAuthPolicy } =
      await import("./global-auth-policy.js");
    const { optionalAuth } = await import("./optional-auth.js");
    const { requireAuth } = await import("./require-auth.js");

    app = express();
    app.use(cors());
    app.use("/api", globalAuthPolicy);

    app.post("/api/subjects", (_req, res) => {
      res.status(403).json({ error: "catalogue is read-only" });
    });
    app.delete("/api/subjects/:subjectId", (_req, res) => {
      res.status(403).json({ error: "catalogue is read-only" });
    });
    app.get("/api/subjects/:subjectId/syllabus", optionalAuth, (req, res) => {
      res.json({ userId: req.userId ?? null });
    });
    app.get("/api/route-level-guard", requireAuth, (_req, res) => {
      res.status(204).send();
    });
    app.use("/api", (_req, res) => {
      res.status(204).send();
    });
  });

  beforeEach(() => {
    getClaims.mockReset();
  });

  it.each([
    "/healthz",
    "/healthz/db",
    "/subjects",
    "/subjects/1",
    "/subjects/1/assessment-components",
  ])("allows anonymous GET %s", async (path) => {
    const response = await request(app).get(`/api${path}`);

    expect(response.status).toBe(204);
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("preserves anonymous, invalid, and valid optional auth", async () => {
    const anonymous = await request(app).get("/api/subjects/1/syllabus");
    expect(anonymous.status).toBe(200);
    expect(anonymous.body).toEqual({ userId: null });

    getClaims.mockResolvedValueOnce({
      data: null,
      error: { message: "invalid token" },
    });
    const invalid = await request(app)
      .get("/api/subjects/1/syllabus")
      .set("Authorization", "Bearer invalid-token");
    expect(invalid.status).toBe(401);
    expect(invalid.body).toEqual({ error: "Unauthorized" });

    getClaims.mockReset();
    getClaims.mockResolvedValueOnce({
      data: { claims: { sub: USER_ID } },
      error: null,
    });
    const valid = await request(app)
      .get("/api/subjects/1/syllabus")
      .set("Authorization", "Bearer valid-token");
    expect(valid.status).toBe(200);
    expect(valid.body).toEqual({ userId: USER_ID });
    expect(getClaims).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["get", "/subjects/1/performance"],
    ["patch", "/syllabus-topics/1"],
    ["delete", "/syllabus-topics/1"],
    ["get", "/tasks"],
    ["post", "/tasks"],
    ["patch", "/tasks/1"],
    ["delete", "/tasks/1"],
    ["get", "/past-paper-attempts"],
    ["post", "/past-paper-attempts"],
    ["delete", "/past-paper-attempts/1"],
    ["get", "/exam-dates"],
    ["post", "/exam-dates"],
    ["delete", "/exam-dates/1"],
    ["get", "/dashboard/summary"],
    ["get", "/progress/overview"],
    ["get", "/profile"],
    ["patch", "/profile"],
    ["post", "/profile/complete-onboarding"],
    ["get", "/user-subjects"],
    ["put", "/user-subjects"],
  ] as const)("rejects anonymous %s %s", async (method, path) => {
    const response = await request(app)[method](`/api${path}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Unauthorized" });
  });

  it("keeps deliberate catalogue writes anonymous at the auth layer", async () => {
    const create = await request(app).post("/api/subjects");
    const remove = await request(app).delete("/api/subjects/1");

    expect(create.status).toBe(403);
    expect(remove.status).toBe(403);
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("is method-aware and does not inherit public GET access", async () => {
    const create = await request(app).put("/api/subjects");
    const remove = await request(app).patch("/api/subjects/1");
    const head = await request(app).head("/api/subjects");

    expect(create.status).toBe(401);
    expect(remove.status).toBe(401);
    expect(head.status).toBe(401);
  });

  it("is path-aware and does not expose nested subject routes", async () => {
    const response = await request(app).get("/api/subjects/1/performance");

    expect(response.status).toBe(401);
  });

  it("allows CORS preflight without attempting authentication", async () => {
    const response = await request(app)
      .options("/api/tasks")
      .set("Origin", "https://example.com")
      .set("Access-Control-Request-Method", "GET");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(getClaims).not.toHaveBeenCalled();
  });

  it("authenticates an unclassified route by default", async () => {
    const anonymous = await request(app).get("/api/new-protected-route");
    expect(anonymous.status).toBe(401);

    getClaims.mockResolvedValueOnce({
      data: { claims: { sub: USER_ID } },
      error: null,
    });
    const authenticated = await request(app)
      .get("/api/new-protected-route")
      .set("Authorization", "Bearer valid-token");
    expect(authenticated.status).toBe(204);
  });

  it("does not verify twice when a route-level guard is retained", async () => {
    getClaims.mockResolvedValueOnce({
      data: { claims: { sub: USER_ID } },
      error: null,
    });

    const response = await request(app)
      .get("/api/route-level-guard")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(204);
    expect(getClaims).toHaveBeenCalledTimes(1);
  });

  it("returns 401 for an anonymous unknown API route", async () => {
    const response = await request(app).get("/api/definitely-not-a-real-route");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Unauthorized" });
  });
});
