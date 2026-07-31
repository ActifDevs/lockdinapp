import { beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../lib/logger.js", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("API error handler", () => {
  let app: express.Express;
  let logger: { error: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    const { errorHandler } = await import("../lib/error-handler.js");
    ({ logger } = await import("../lib/logger.js") as unknown as {
      logger: { error: ReturnType<typeof vi.fn> };
    });

    app = express();
    app.get("/api/boom", () => {
      throw new Error("simulated failure", {
        cause: new Error("db unavailable"),
      });
    });
    app.use(errorHandler);
  });

  it("returns JSON 500 and logs the underlying error", async () => {
    const res = await request(app).get("/api/boom");

    expect(res.status).toBe(500);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toEqual({ error: "Internal server error" });
    expect(logger.error).toHaveBeenCalled();
    const [payload, message] = logger.error.mock.calls.at(-1) ?? [];
    expect(message).toBe("Unhandled API error");
    expect(payload.err.message).toBe("simulated failure");
    expect(payload.err.cause).toEqual({
      message: "db unavailable",
      name: "Error",
    });
  });
});
