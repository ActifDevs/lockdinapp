import { beforeEach, describe, expect, it, vi } from "vitest";

const init = vi.fn();
const setTag = vi.fn();
const captureException = vi.fn();

vi.mock("@sentry/node", () => ({
  init: (...args: unknown[]) => init(...args),
  setTag: (...args: unknown[]) => setTag(...args),
  captureException: (...args: unknown[]) => captureException(...args),
}));

describe("API Sentry client", () => {
  beforeEach(async () => {
    init.mockReset();
    setTag.mockReset();
    captureException.mockReset();
    const { resetApiSentryForTests } = await import("./client.js");
    resetApiSentryForTests();
  });

  it("is a safe no-op without SENTRY_DSN", async () => {
    const { initApiSentry, reportApiException } = await import("./client.js");
    expect(initApiSentry({})).toBe(false);
    reportApiException(new Error("boom"), { requestId: "r1" });
    expect(init).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  it("tags environment, release, and request_id", async () => {
    const { initApiSentry, reportApiException } = await import("./client.js");
    initApiSentry({
      SENTRY_DSN: "https://example.ingest.sentry.io/1",
      SENTRY_ENVIRONMENT: "preview",
      VERCEL_GIT_COMMIT_SHA: "abc123def",
    });
    const options = init.mock.calls[0]?.[0] as {
      environment: string;
      release: string;
      sendDefaultPii: boolean;
    };
    expect(options.environment).toBe("preview");
    expect(options.release).toBe("abc123def");
    expect(options.sendDefaultPii).toBe(false);
    expect((options as { skipOpenTelemetrySetup?: boolean }).skipOpenTelemetrySetup).toBe(
      true,
    );
    expect(setTag).toHaveBeenCalledOnce();
    expect(setTag).toHaveBeenCalledWith("runtime", "api");

    reportApiException(new Error("route failed"), { requestId: "req-77" });
    expect(captureException).toHaveBeenCalledTimes(1);
    const hint = captureException.mock.calls[0]?.[1] as {
      tags: Record<string, string>;
    };
    expect(hint.tags).toEqual({
      runtime: "api",
      request_id: "req-77",
    });

    const beforeSend = (init.mock.calls[0]?.[0] as {
      beforeSend: (event: { tags?: Record<string, string> }) => {
        tags?: Record<string, unknown>;
      };
    }).beforeSend;
    expect(
      beforeSend({
        tags: {
          ...hint.tags,
          unknown: "drop-me",
        },
      }).tags,
    ).toEqual({ runtime: "api", request_id: "req-77" });
  });

  it("swallows Sentry failures", async () => {
    const { initApiSentry, reportApiException } = await import("./client.js");
    initApiSentry({ SENTRY_DSN: "https://example.ingest.sentry.io/1" });
    captureException.mockImplementation(() => {
      throw new Error("ingest down");
    });
    expect(() => reportApiException(new Error("x"))).not.toThrow();
  });
});
