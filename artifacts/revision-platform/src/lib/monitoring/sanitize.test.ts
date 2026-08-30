import { describe, expect, it } from "vitest";
import {
  PRIVACY_INIT_FLAGS,
  redactSensitiveText,
  sanitizeRoutePath,
  sanitizeSentryEvent,
} from "./sanitize";

describe("frontend Sentry sanitization", () => {
  it("redacts email, jwt, bearer, and database URLs", () => {
    const text = redactSensitiveText(
      "user a@b.co token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb Bearer abc postgres://u:p@host/db",
    );
    expect(text).not.toMatch(/@/);
    expect(text).not.toContain("eyJ");
    expect(text).not.toContain("Bearer abc");
    expect(text).not.toContain("postgres://");
  });

  it("strips query strings, fragments, and opaque ids", () => {
    expect(
      sanitizeRoutePath("/subjects/11111111-1111-4111-8111-111111111111?email=a@b.co#x"),
    ).toBe("/subjects/:id");
    expect(sanitizeRoutePath("https://app.example/past-papers?score=90")).toBe(
      "/past-papers",
    );
  });

  it("drops PII, study content, auth, cookies, bodies, and credentials", () => {
    const sanitized = sanitizeSentryEvent({
      environment: "preview",
      release: "abc123",
      message: "boom a@b.co",
      exception: { values: [{ type: "Error", value: "title: revise cells" }] },
      user: { email: "a@b.co", username: "sam", name: "Sam" },
      extra: {
        email: "a@b.co",
        name: "Sam",
        username: "sam",
        title: "Revise cells",
        notes: "page 12",
        score: 90,
        marks: 12,
        percentage: 80,
        authorization: "Bearer secret",
        cookie: "sid=1",
        database_url: "postgres://u:p@host/db",
        sql: "select * from users",
      },
      request: {
        method: "POST",
        url: "/api/tasks?title=secret",
        headers: { authorization: "Bearer x", cookie: "a=b" },
        cookies: { sid: "1" },
        data: { title: "Revise cells" },
        query_string: "email=a@b.co",
      },
      tags: {
        request_id: "req-1",
        runtime: "frontend",
        email: "a@b.co",
      },
      breadcrumbs: [
        {
          category: "http",
          data: { authorization: "Bearer x", url: "/api/tasks?q=1" },
        },
        {
          category: "navigation",
          data: { url: "/dashboard?user=sam" },
        },
      ],
    });

    expect(sanitized.user).toBeUndefined();
    expect(sanitized.extra).toBeUndefined();
    expect(sanitized.request).toEqual({ method: "POST", url: "/api/tasks" });
    expect(sanitized.request).not.toHaveProperty("headers");
    expect(sanitized.request).not.toHaveProperty("cookies");
    expect(sanitized.request).not.toHaveProperty("data");
    expect(sanitized.request).not.toHaveProperty("query_string");
    expect(sanitized.tags).toEqual({ request_id: "req-1", runtime: "frontend" });
    expect(JSON.stringify(sanitized)).not.toMatch(/a@b\.co|Bearer x|Revise cells|postgres:/);
    expect(sanitized.environment).toBe("preview");
    expect(sanitized.release).toBe("abc123");
    expect(sanitized.breadcrumbs?.some((b) => b.data && "authorization" in b.data)).toBe(
      false,
    );
  });

  it("keeps Session Replay and default PII disabled", () => {
    expect(PRIVACY_INIT_FLAGS.sendDefaultPii).toBe(false);
    expect(PRIVACY_INIT_FLAGS.replaysSessionSampleRate).toBe(0);
    expect(PRIVACY_INIT_FLAGS.replaysOnErrorSampleRate).toBe(0);
  });
});
