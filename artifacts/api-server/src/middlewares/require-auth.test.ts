import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

const getClaims = vi.fn();

vi.mock("../lib/supabase-verifier.js", () => ({
  getSupabaseVerifier: () => ({
    auth: { getClaims },
  }),
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import { requireAuth } from "./require-auth.js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe("requireAuth", () => {
  beforeEach(() => {
    getClaims.mockReset();
  });

  it("rejects a missing Authorization header with 401", async () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a malformed Bearer header with 401", async () => {
    const req = { headers: { authorization: "Token abc" } } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an invalid token with a generic 401", async () => {
    getClaims.mockResolvedValue({ data: null, error: { message: "bad" } });
    const req = { headers: { authorization: "Bearer not-a-jwt" } } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
    expect(JSON.stringify(res.body)).not.toMatch(/bad|jwt|claim/i);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects missing or invalid claims.sub with 401", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "not-a-uuid" } },
      error: null,
    });
    const req = { headers: { authorization: "Bearer valid-looking" } } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("populates req.userId and req.accessToken for a valid token", async () => {
    const userId = "02444f79-c2bb-4596-ae99-d5d6877f1001";
    getClaims.mockResolvedValue({
      data: { claims: { sub: userId, role: "authenticated" } },
      error: null,
    });
    const req = {
      headers: { authorization: "Bearer good-token" },
    } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.userId).toBe(userId);
    expect(req.accessToken).toBe("good-token");
  });
});
