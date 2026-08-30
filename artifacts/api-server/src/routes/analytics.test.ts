import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const getClaims = vi.fn();
const trackAccountCreated = vi.fn();

vi.mock("../lib/supabase-verifier.js", () => ({
  getSupabaseVerifier: () => ({
    auth: { getClaims },
  }),
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock("../lib/analytics/index.js", () => ({
  fireAndForgetAnalytics: async (work: () => Promise<void>) => {
    try {
      await work();
    } catch {
      // product writes must not fail
    }
  },
  trackAccountCreated: (...args: unknown[]) => trackAccountCreated(...args),
}));

const USER = "02444f79-c2bb-4596-ae99-d5d6877f1001";
const OTHER = "11111111-1111-1111-1111-111111111111";

describe("POST /api/analytics/account-created", () => {
  let app: express.Express;

  beforeAll(async () => {
    const { default: analyticsRouter } = await import("./analytics.js");
    app = express();
    app.use(express.json());
    app.use("/api", analyticsRouter);
  });

  beforeEach(() => {
    getClaims.mockReset();
    trackAccountCreated.mockReset();
    getClaims.mockResolvedValue({
      data: { claims: { sub: USER } },
      error: null,
    });
    trackAccountCreated.mockResolvedValue(undefined);
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/api/analytics/account-created");
    expect(res.status).toBe(401);
    expect(trackAccountCreated).not.toHaveBeenCalled();
  });

  it("uses the verified session user and ignores a body userId", async () => {
    const res = await request(app)
      .post("/api/analytics/account-created")
      .set("Authorization", "Bearer good-token")
      .send({ userId: OTHER, email: "ada@example.com" });
    expect(res.status).toBe(400);
    expect(trackAccountCreated).not.toHaveBeenCalled();
  });

  it("returns 204 and captures for the authenticated user", async () => {
    const res = await request(app)
      .post("/api/analytics/account-created")
      .set("Authorization", "Bearer good-token")
      .send({});
    expect(res.status).toBe(204);
    expect(trackAccountCreated).toHaveBeenCalledTimes(1);
    expect(trackAccountCreated).toHaveBeenCalledWith({ userId: USER });
  });

  it("still returns 204 when PostHog throws", async () => {
    trackAccountCreated.mockRejectedValue(new Error("posthog down"));
    const res = await request(app)
      .post("/api/analytics/account-created")
      .set("Authorization", "Bearer good-token")
      .send({});
    expect(res.status).toBe(204);
  });
});
