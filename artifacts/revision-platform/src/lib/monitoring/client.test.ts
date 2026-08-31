import { beforeEach, describe, expect, it, vi } from "vitest";

const init = vi.fn();
const setTag = vi.fn();
const captureReactException = vi.fn();
const captureException = vi.fn();
const reactErrorHandler = vi.fn(() => vi.fn());

vi.mock("@sentry/react", () => ({
  init: (...args: unknown[]) => init(...args),
  setTag: (...args: unknown[]) => setTag(...args),
  captureReactException: (...args: unknown[]) => captureReactException(...args),
  captureException: (...args: unknown[]) => captureException(...args),
  reactErrorHandler: (...args: unknown[]) => reactErrorHandler(...args),
}));

describe("frontend Sentry client", () => {
  beforeEach(async () => {
    init.mockReset();
    setTag.mockReset();
    captureReactException.mockReset();
    captureException.mockReset();
    reactErrorHandler.mockClear();
    const { resetFrontendSentryForTests } = await import("./client");
    resetFrontendSentryForTests();
  });

  it("is a safe no-op when the DSN is missing", async () => {
    const { initFrontendSentry, reportBoundaryError } = await import("./client");
    expect(await initFrontendSentry({ MODE: "development" })).toBe(false);
    reportBoundaryError(new Error("boom"), { componentStack: "x" });
    expect(init).not.toHaveBeenCalled();
    expect(captureReactException).not.toHaveBeenCalled();
  });

  it("uses the Vercel Git SHA as release when no explicit override is set", async () => {
    const { initFrontendSentry } = await import("./client");
    await initFrontendSentry({
      VITE_SENTRY_DSN: "https://example.ingest.sentry.io/1",
      VITE_VERCEL_ENV: "preview",
      VITE_VERCEL_GIT_COMMIT_SHA: "cafebabe99",
      MODE: "production",
    });
    const options = init.mock.calls[0]?.[0] as { release: string; environment: string };
    expect(options.release).toBe("cafebabe99");
    expect(options.environment).toBe("preview");
  });

  it("initializes with privacy flags and tagged environment/release", async () => {
    const { initFrontendSentry } = await import("./client");
    expect(
      await initFrontendSentry({
        VITE_SENTRY_DSN: "https://example.ingest.sentry.io/1",
        VITE_SENTRY_ENVIRONMENT: "preview",
        VITE_SENTRY_RELEASE: "deadbeef",
        MODE: "production",
      }),
    ).toBe(true);
    expect(init).toHaveBeenCalledTimes(1);
    const options = init.mock.calls[0]?.[0] as {
      sendDefaultPii: boolean;
      replaysSessionSampleRate: number;
      environment: string;
      release: string;
    };
    expect(options.sendDefaultPii).toBe(false);
    expect(options.replaysSessionSampleRate).toBe(0);
    expect(options.environment).toBe("preview");
    expect(options.release).toBe("deadbeef");
    expect(setTag).toHaveBeenCalledOnce();
    expect(setTag).toHaveBeenCalledWith("runtime", "frontend");

    const beforeSend = (init.mock.calls[0]?.[0] as {
      beforeSend: (event: { tags?: Record<string, string> }) => {
        tags?: Record<string, unknown>;
      };
    }).beforeSend;
    expect(
      beforeSend({
        tags: {
          runtime: "frontend",
          request_id: "not-approved-for-frontend",
          unknown: "drop-me",
        },
      }).tags,
    ).toEqual({ runtime: "frontend" });
  });

  it("captures a boundary error once and ignores Sentry failures", async () => {
    const { initFrontendSentry, reportBoundaryError } = await import("./client");
    await initFrontendSentry({
      VITE_SENTRY_DSN: "https://example.ingest.sentry.io/1",
      MODE: "development",
    });
    captureReactException.mockImplementation(() => {
      throw new Error("sentry down");
    });
    expect(() =>
      reportBoundaryError(new Error("ui"), { componentStack: "App" }),
    ).not.toThrow();
    expect(captureReactException).toHaveBeenCalledTimes(1);
    expect(captureException).not.toHaveBeenCalled();
  });
});
