import { describe, expect, it } from "vitest";
import {
  PRIVACY_INIT_FLAGS,
  REDACTED_MESSAGE,
  sanitizeRoutePath,
  sanitizeSentryEvent,
} from "./sanitize";

const REPRESENTATIVE_EVENT = {
  environment: "preview",
  release: "deadbeef",
  message: "Revise photosynthesis chapter 4",
  user: { email: "a@b.co", username: "sam" },
  extra: { detail: "My private task content" },
  contexts: { culture: { notes: "My chemistry notes about equilibrium" } },
  tags: {
    request_id: "req-1",
    runtime: "frontend",
    email: "a@b.co",
  },
  request: {
    method: "POST",
    url: "/api/tasks?title=secret#frag",
    headers: { authorization: "Bearer secret", cookie: "sid=1" },
    cookies: { sid: "1" },
    data: { title: "Revise photosynthesis chapter 4" },
    query_string: "email=a@b.co",
  },
  exception: {
    values: [
      {
        type: "TypeError",
        value: "Revise photosynthesis chapter 4",
        mechanism: { type: "generic", handled: true, data: { body: "secret" } },
        stacktrace: {
          frames: [
            {
              function: "createTask",
              module: "App",
              filename: "https://app.example/assets/index.js?token=abc#x",
              abs_path: "https://app.example/src/pages/study-plan.tsx?user=1",
              lineno: 42,
              colno: 7,
              in_app: true,
              platform: "javascript",
              vars: { notes: "My chemistry revision notes", title: "task" },
              context_line: "throw new Error(task.title)",
              pre_context: ["const title = task.title"],
              post_context: ["return null"],
              module_metadata: { secret: true },
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
      data: { arguments: ["Paper 42 score was 67"] },
    },
    {
      category: "ui.click",
      message: "clicked Revise photosynthesis",
    },
    {
      category: "navigation",
      message: "My chemistry revision notes",
      timestamp: 1,
      data: { from: "/dashboard?email=a@b.co", to: "/study-plan#unit" },
    },
    {
      category: "fetch",
      message: "should not keep",
      data: {
        method: "GET",
        url: "/api/tasks?notes=x",
        status_code: 200,
        authorization: "Bearer x",
      },
    },
  ],
};

describe("frontend Sentry sanitization", () => {
  it("preserves usable stack frames and drops locals", () => {
    const sanitized = sanitizeSentryEvent(REPRESENTATIVE_EVENT);
    const frame = sanitized.exception?.values?.[0]?.stacktrace?.frames?.[0];
    expect(sanitized.exception?.values?.[0]?.type).toBe("TypeError");
    expect(frame).toMatchObject({
      function: "createTask",
      module: "App",
      lineno: 42,
      colno: 7,
      in_app: true,
      platform: "javascript",
    });
    expect(frame?.filename).toBe("/assets/index.js");
    expect(frame?.abs_path).toBe("/src/pages/study-plan.tsx");
    expect(frame).not.toHaveProperty("vars");
    expect(frame).not.toHaveProperty("context_line");
    expect(frame).not.toHaveProperty("pre_context");
    expect(frame).not.toHaveProperty("module_metadata");
    expect(JSON.stringify(frame)).not.toMatch(/\?|#|token=abc/);
  });

  it("fails closed on arbitrary exception and event messages", () => {
    const sanitized = sanitizeSentryEvent(REPRESENTATIVE_EVENT);
    expect(sanitized.message).toBeUndefined();
    expect(sanitized.exception?.values?.[0]?.value).toBe(REDACTED_MESSAGE);
    expect(JSON.stringify(sanitized)).not.toContain("Revise photosynthesis chapter 4");
    expect(JSON.stringify(sanitized)).not.toContain("My private task content");
    expect(JSON.stringify(sanitized)).not.toContain("Paper 42 score was 67");
  });

  it("drops breadcrumb free text and non-diagnostic categories", () => {
    const sanitized = sanitizeSentryEvent(REPRESENTATIVE_EVENT);
    expect(sanitized.breadcrumbs?.some((b) => b.category === "console")).toBe(false);
    expect(sanitized.breadcrumbs?.some((b) => b.category === "ui.click")).toBe(false);
    expect(sanitized.breadcrumbs?.some((b) => b.message)).toBe(false);
    expect(JSON.stringify(sanitized.breadcrumbs)).not.toContain(
      "My chemistry revision notes",
    );
    const nav = sanitized.breadcrumbs?.find((b) => b.category === "navigation");
    expect(nav?.data).toEqual({ from: "/dashboard", to: "/study-plan" });
    const fetchCrumb = sanitized.breadcrumbs?.find((b) => b.category === "fetch");
    expect(fetchCrumb?.data).toEqual({
      method: "GET",
      url: "/api/tasks",
      status_code: 200,
    });
  });

  it("drops extra, user, contexts, auth, cookies, bodies, and query strings", () => {
    const sanitized = sanitizeSentryEvent(REPRESENTATIVE_EVENT);
    expect(sanitized.extra).toBeUndefined();
    expect(sanitized.user).toBeUndefined();
    expect(sanitized.contexts).toBeUndefined();
    expect(sanitized.request).toEqual({ method: "POST", url: "/api/tasks" });
    expect(sanitized.tags).toEqual({ runtime: "frontend" });
    expect(JSON.stringify(sanitized)).not.toMatch(
      /a@b\.co|Bearer secret|postgres:|sid=1/,
    );
  });

  it("allows only the frontend runtime tag", () => {
    const sanitized = sanitizeSentryEvent({
      tags: {
        runtime: "frontend",
        request_id: "not-approved-for-frontend",
        arbitrary: "drop-me",
      },
    });
    expect(sanitized.tags).toEqual({ runtime: "frontend" });
  });

  it("strips query strings from routes", () => {
    expect(
      sanitizeRoutePath("/subjects/11111111-1111-4111-8111-111111111111?email=a@b.co#x"),
    ).toBe("/subjects/:id");
  });

  it("keeps Session Replay and default PII disabled", () => {
    expect(PRIVACY_INIT_FLAGS.sendDefaultPii).toBe(false);
    expect(PRIVACY_INIT_FLAGS.replaysSessionSampleRate).toBe(0);
    expect(PRIVACY_INIT_FLAGS.replaysOnErrorSampleRate).toBe(0);
    expect(PRIVACY_INIT_FLAGS.tracesSampleRate).toBe(0);
    expect(PRIVACY_INIT_FLAGS.profilesSampleRate).toBe(0);
  });
});
