import { describe, expect, it } from "vitest";
import {
  PRIVACY_INIT_FLAGS,
  REDACTED_MESSAGE,
  sanitizeRoutePath,
  sanitizeSentryEvent,
} from "./sanitize.js";

const REPRESENTATIVE_API_EVENT = {
  environment: "production",
  release: "sha",
  message: "Paper 42 score was 67",
  user: { email: "a@b.co" },
  extra: { detail: "My private task content" },
  tags: {
    request_id: "rid-99",
    runtime: "api",
    email: "a@b.co",
    arbitrary: "drop-me",
  },
  request: {
    method: "POST",
    url: "/api/past-paper-attempts?score=12",
    headers: { authorization: "Bearer t", cookie: "a=b" },
    data: { marks: 12 },
    cookies: { session: "1" },
  },
  exception: {
    values: [
      {
        type: "Error",
        value: "Revise photosynthesis chapter 4",
        stacktrace: {
          frames: [
            {
              function: "errorHandler",
              filename: "/app/dist/index.mjs",
              abs_path: "file:///app/dist/index.mjs?x=1",
              lineno: 88,
              colno: 3,
              in_app: true,
              vars: { sql: "select * from users", database_url: "postgres://u:p@h/db" },
            },
          ],
        },
      },
    ],
  },
  breadcrumbs: [
    {
      category: "console",
      message: "My chemistry revision notes",
    },
    {
      category: "http",
      message: "My chemistry revision notes",
      data: { method: "POST", url: "/api/tasks?notes=x", status_code: 500 },
    },
  ],
};

describe("API Sentry sanitization", () => {
  it("keeps stack coordinates and request_id, drops locals and free text", () => {
    const sanitized = sanitizeSentryEvent(REPRESENTATIVE_API_EVENT);
    const frame = sanitized.exception?.values?.[0]?.stacktrace?.frames?.[0];
    expect(sanitized.exception?.values?.[0]?.type).toBe("Error");
    expect(sanitized.exception?.values?.[0]?.value).toBe(REDACTED_MESSAGE);
    expect(sanitized.message).toBeUndefined();
    expect(frame).toMatchObject({
      function: "errorHandler",
      filename: "/app/dist/index.mjs",
      lineno: 88,
      colno: 3,
      in_app: true,
    });
    expect(frame?.abs_path).toBe("/app/dist/index.mjs");
    expect(frame).not.toHaveProperty("vars");
    expect(sanitized.tags).toEqual({ request_id: "rid-99", runtime: "api" });
    expect(sanitized.extra).toBeUndefined();
    expect(sanitized.user).toBeUndefined();
    expect(sanitized.request).toEqual({
      method: "POST",
      url: "/api/past-paper-attempts",
    });
    expect(JSON.stringify(sanitized)).not.toMatch(
      /Revise photosynthesis|Paper 42|My private|Bearer t|postgres:|a@b\.co|chemistry revision/,
    );
  });

  it("minimizes API URLs", () => {
    expect(
      sanitizeRoutePath("/api/tasks/11111111-1111-4111-8111-111111111111?notes=x"),
    ).toBe("/api/tasks/:id");
  });

  it("does not enable default PII", () => {
    expect(PRIVACY_INIT_FLAGS.sendDefaultPii).toBe(false);
  });
});
