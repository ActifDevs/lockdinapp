import { describe, expect, it } from "vitest";
import {
  PRIVACY_INIT_FLAGS,
  redactSensitiveText,
  sanitizeRoutePath,
  sanitizeSentryEvent,
} from "./sanitize.js";

describe("API Sentry sanitization", () => {
  it("redacts credentials and identity from messages", () => {
    expect(
      redactSensitiveText(
        "fail postgres://user:pass@db.example/lockdin Authorization Bearer abc",
      ),
    ).not.toMatch(/postgres:\/\/|Bearer abc|user:pass/);
  });

  it("minimizes API URLs", () => {
    expect(
      sanitizeRoutePath("/api/tasks/11111111-1111-4111-8111-111111111111?notes=x"),
    ).toBe("/api/tasks/:id");
  });

  it("removes request bodies, headers, cookies, and study extra", () => {
    const sanitized = sanitizeSentryEvent({
      environment: "production",
      release: "sha",
      extra: { title: "Essay", notes: "secret", email: "a@b.co" },
      user: { email: "a@b.co" },
      request: {
        method: "POST",
        url: "/api/past-paper-attempts?score=12",
        headers: { authorization: "Bearer t", cookie: "a=b" },
        data: { marks: 12 },
        cookies: { session: "1" },
      },
      tags: { request_id: "rid", email: "a@b.co" },
    });
    expect(sanitized.user).toBeUndefined();
    expect(sanitized.extra).toBeUndefined();
    expect(sanitized.request).toEqual({
      method: "POST",
      url: "/api/past-paper-attempts",
    });
    expect(sanitized.tags).toEqual({ request_id: "rid" });
    expect(JSON.stringify(sanitized)).not.toMatch(/Bearer|Essay|a@b\.co|marks/);
  });

  it("does not enable default PII", () => {
    expect(PRIVACY_INIT_FLAGS.sendDefaultPii).toBe(false);
  });
});
