import { beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const executeMock = vi.fn();

vi.mock("@workspace/db", () => ({
  db: {
    execute: executeMock,
  },
}));

describe("GET /api/healthz/db", () => {
  let app: express.Express;

  beforeAll(async () => {
    const { default: healthRouter } = await import("./health.js");
    app = express();
    app.use("/api", healthRouter);
  });

  it("returns 200 when the database can answer a trivial query", async () => {
    executeMock.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });

    const res = await request(app).get("/api/healthz/db");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "ok",
      database: "ok",
    });
  });

  it("returns 503 with degraded status when the database is unavailable", async () => {
    executeMock.mockRejectedValueOnce(new Error("database unavailable"));

    const res = await request(app).get("/api/healthz/db");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      status: "degraded",
      database: "down",
      message: "database unavailable",
    });
  });
});
