import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const getClaims = vi.fn();
const rpc = vi.fn();
const trackOnboardingCompleted = vi.fn();

vi.mock("../lib/supabase-verifier.js", () => ({
  getSupabaseVerifier: () => ({
    auth: { getClaims },
  }),
}));

vi.mock("../lib/supabase-user-client.js", () => ({
  createUserScopedSupabaseClient: () => ({ rpc }),
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
  trackOnboardingCompleted: (...args: unknown[]) =>
    trackOnboardingCompleted(...args),
}));

const USER = "02444f79-c2bb-4596-ae99-d5d6877f1001";

const profileRow = {
  id: USER,
  full_name: "Ada Lovelace",
  username: "ada",
  level: "AS Level (Year 12)",
  exam_session: "May/June 2026",
  onboarded_at: "2026-08-30T00:00:00Z",
  created_at: "2026-08-30T00:00:00Z",
  updated_at: "2026-08-30T00:00:00Z",
};

describe("onboarding analytics", () => {
  let app: express.Express;

  beforeAll(async () => {
    const { default: profileRouter } = await import("./profile.js");
    app = express();
    app.use(express.json());
    app.use("/api", profileRouter);
  });

  beforeEach(() => {
    getClaims.mockReset();
    rpc.mockReset();
    trackOnboardingCompleted.mockReset();
    getClaims.mockResolvedValue({
      data: { claims: { sub: USER } },
      error: null,
    });
    rpc.mockResolvedValue({ data: profileRow, error: null });
  });

  it("still completes onboarding when PostHog throws", async () => {
    trackOnboardingCompleted.mockRejectedValue(new Error("posthog down"));
    const res = await request(app)
      .post("/api/profile/complete-onboarding")
      .set("Authorization", "Bearer good-token")
      .send({
        fullName: "Ada Lovelace",
        username: "ada",
        level: "AS Level (Year 12)",
        examSession: "May/June 2026",
        subjectIds: [1, 2],
      });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("ada");
    expect(trackOnboardingCompleted).toHaveBeenCalledWith({
      userId: USER,
      subjectCount: 2,
    });
  });
});
