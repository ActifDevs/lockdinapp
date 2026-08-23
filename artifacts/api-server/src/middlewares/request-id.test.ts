import { Writable } from "node:stream";
import cors from "cors";
import express, { type ErrorRequestHandler, type Request } from "express";
import pino from "pino";
import { pinoHttp } from "pino-http";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { generateRequestId, requestIdHeader } from "./request-id";

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createHarness() {
  const logLines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      logLines.push(String(chunk));
      callback();
    },
  });
  const testLogger = pino(stream);
  const app = express();

  app.use(
    pinoHttp({
      logger: testLogger,
      genReqId: generateRequestId,
      serializers: {
        req(req: Request) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
      },
    }),
  );
  app.use(requestIdHeader);
  app.use(cors());

  app.get("/public", (_req, res) => res.status(200).json({ ok: true }));
  app.get("/optional", (_req, res) => res.status(200).json({ ok: true }));
  app.get("/protected", (_req, res) =>
    res.status(401).json({ error: "Unauthorized" }),
  );
  app.post("/forbidden", (_req, res) =>
    res.status(403).json({ error: "Forbidden" }),
  );
  app.get("/correlation", (req, res) =>
    res.status(200).json({ requestId: req.id }),
  );
  app.get("/error", () => {
    throw new Error("simulated handled error");
  });
  app.use((_req, res) => res.status(401).json({ error: "Unauthorized" }));

  const errorHandler: ErrorRequestHandler = (_err, _req, res, _next) => {
    res.status(500).json({ error: "Internal server error" });
  };
  app.use(errorHandler);

  return { app, logLines };
}

function requestIdFrom(response: request.Response): string {
  const value = response.headers["x-request-id"];
  expect(value).toBeTypeOf("string");
  expect(value).toMatch(UUID_V4_PATTERN);
  return value;
}

describe("request ID contract", () => {
  it.each([
    ["public 200", "get", "/public", 200],
    ["optional-auth 200", "get", "/optional", 200],
    ["protected anonymous 401", "get", "/protected", 401],
    ["deliberate 403", "post", "/forbidden", 403],
    ["fail-secure unknown 401", "get", "/unknown", 401],
    ["CORS preflight 204", "options", "/protected", 204],
    ["handled error 500", "get", "/error", 500],
  ] as const)(
    "adds a UUID header to %s",
    async (_label, method, path, status) => {
      const { app } = createHarness();
      const pending = request(app)[method](path);

      if (method === "options") {
        pending
          .set("Origin", "https://example.com")
          .set("Access-Control-Request-Method", "GET");
      }

      const response = await pending;

      expect(response.status).toBe(status);
      requestIdFrom(response);
    },
  );

  it("uses the same request ID in the response, request object, and Pino log", async () => {
    const { app, logLines } = createHarness();
    const response = await request(app).get("/correlation");
    const responseId = requestIdFrom(response);
    const logs = logLines
      .flatMap((line) => line.trim().split("\n"))
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { req?: { id?: string } });
    const requestLog = logs.find((entry) => entry.req?.id === responseId);

    expect(response.body.requestId).toBe(responseId);
    expect(requestLog?.req?.id).toBe(responseId);
  });

  it("generates a distinct UUID for each independent request", async () => {
    const { app } = createHarness();
    const responses = await Promise.all(
      Array.from({ length: 20 }, () => request(app).get("/public")),
    );
    const ids = responses.map(requestIdFrom);

    expect(new Set(ids)).toHaveLength(20);
  });

  it("ignores an untrusted client X-Request-Id", async () => {
    const { app } = createHarness();
    const response = await request(app)
      .get("/correlation")
      .set("X-Request-Id", "attacker-controlled-id");
    const responseId = requestIdFrom(response);

    expect(responseId).not.toBe("attacker-controlled-id");
    expect(response.body.requestId).toBe(responseId);
  });
});
