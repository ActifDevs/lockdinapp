import express from "express";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

const reportApiException = vi.fn();

vi.mock("../lib/logger.js", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("./monitoring.js", () => ({
  reportApiException: (...args: unknown[]) => reportApiException(...args),
}));
vi.mock("./monitoring", () => ({
  reportApiException: (...args: unknown[]) => reportApiException(...args),
}));

describe("API error handler Sentry path", () => {
  let app: express.Express;

  beforeAll(async () => {
    const { errorHandler } = await import("./error-handler.js");
    app = express();
    app.use((req, _res, next) => {
      req.id = "11111111-1111-4111-8111-111111111111";
      next();
    });
    app.get("/api/boom", () => {
      throw new Error("central failure");
    });
    app.use(errorHandler);
  });

  it("captures once at the central handler and keeps the JSON 500", async () => {
    reportApiException.mockReset();
    const res = await request(app).get("/api/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
    expect(reportApiException).toHaveBeenCalledTimes(1);
    expect(reportApiException.mock.calls[0]?.[1]).toEqual({
      requestId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("does not change the response when Sentry reporting throws", async () => {
    reportApiException.mockImplementation(() => {
      throw new Error("sentry");
    });
    const res = await request(app).get("/api/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});
