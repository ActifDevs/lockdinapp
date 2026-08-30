import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureImmediate = vi.fn();

vi.mock("posthog-node", () => ({
  PostHog: class {
    captureImmediate = captureImmediate;
  },
}));

vi.mock("../logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

describe("API analytics client", () => {
  const USER = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    vi.resetModules();
    captureImmediate.mockReset();
    captureImmediate.mockResolvedValue(undefined);
    delete process.env.POSTHOG_PROJECT_TOKEN;
    delete process.env.POSTHOG_HOST;
    delete process.env.LOCKDIN_ANALYTICS_ALIAS_SECRET;
    delete process.env.LOCKDIN_ANALYTICS_ENV;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("is a safe no-op when configuration is missing", async () => {
    const { trackTaskCreated, isApiAnalyticsConfigured } = await import(
      "./client.js"
    );
    expect(isApiAnalyticsConfigured()).toBe(false);
    await trackTaskCreated({ userId: USER });
    expect(captureImmediate).not.toHaveBeenCalled();
  });

  it("does not emit unknown events even when configured", async () => {
    process.env.POSTHOG_PROJECT_TOKEN = "phc_test";
    process.env.POSTHOG_HOST = "https://eu.i.posthog.com";
    process.env.LOCKDIN_ANALYTICS_ALIAS_SECRET = "unit-test-alias-secret";
    process.env.LOCKDIN_ANALYTICS_ENV = "preview";
    const { tryEmitUnknownEvent, setApiAnalyticsClientForTests } = await import(
      "./client.js"
    );
    setApiAnalyticsClientForTests({ captureImmediate });
    expect(
      tryEmitUnknownEvent("first_task_created", { environment: "preview" }),
    ).toBe(false);
    expect(captureImmediate).not.toHaveBeenCalled();
  });

  it("captures occurrence events with alias distinct id, never raw UUID", async () => {
    process.env.POSTHOG_PROJECT_TOKEN = "phc_test";
    process.env.POSTHOG_HOST = "https://eu.i.posthog.com";
    process.env.LOCKDIN_ANALYTICS_ALIAS_SECRET = "unit-test-alias-secret";
    process.env.LOCKDIN_ANALYTICS_ENV = "production";
    const {
      trackAccountCreated,
      trackOnboardingCompleted,
      trackTaskCreated,
      trackPastPaperAttemptCreated,
      setApiAnalyticsClientForTests,
    } = await import("./client.js");
    setApiAnalyticsClientForTests({ captureImmediate });

    await trackAccountCreated({ userId: USER });
    await trackOnboardingCompleted({ userId: USER, subjectCount: 2 });
    await trackTaskCreated({ userId: USER });
    await trackPastPaperAttemptCreated({ userId: USER });

    expect(captureImmediate).toHaveBeenCalledTimes(4);
    const distinctIds = new Set(
      captureImmediate.mock.calls.map((call) => call[0].distinctId),
    );
    expect(distinctIds.size).toBe(1);
    const sharedId = [...distinctIds][0];
    expect(sharedId).not.toBe(USER);
    expect(sharedId).not.toContain(USER);

    const account = captureImmediate.mock.calls[0][0];
    expect(account.event).toBe("account_created");
    expect(account.uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(account.uuid).not.toBe(USER);
    expect(JSON.stringify(account)).not.toContain(USER);

    expect(captureImmediate.mock.calls[1][0].event).toBe("onboarding_completed");
    expect(captureImmediate.mock.calls[2][0].uuid).toBeUndefined();
    expect(captureImmediate.mock.calls[3][0].uuid).toBeUndefined();
  });

  it("emits task and past-paper events on every successful capture, not 0→1", async () => {
    process.env.POSTHOG_PROJECT_TOKEN = "phc_test";
    process.env.POSTHOG_HOST = "https://eu.i.posthog.com";
    process.env.LOCKDIN_ANALYTICS_ALIAS_SECRET = "unit-test-alias-secret";
    process.env.LOCKDIN_ANALYTICS_ENV = "production";
    const { trackTaskCreated, trackPastPaperAttemptCreated, setApiAnalyticsClientForTests } =
      await import("./client.js");
    setApiAnalyticsClientForTests({ captureImmediate });
    await trackTaskCreated({ userId: USER });
    await trackTaskCreated({ userId: USER });
    await trackPastPaperAttemptCreated({ userId: USER });
    await trackPastPaperAttemptCreated({ userId: USER });
    expect(captureImmediate.mock.calls.map((call) => call[0].event)).toEqual([
      "task_created",
      "task_created",
      "past_paper_attempt_created",
      "past_paper_attempt_created",
    ]);
  });

  it("swallows PostHog failures", async () => {
    process.env.POSTHOG_PROJECT_TOKEN = "phc_test";
    process.env.POSTHOG_HOST = "https://eu.i.posthog.com";
    process.env.LOCKDIN_ANALYTICS_ALIAS_SECRET = "unit-test-alias-secret";
    const { fireAndForgetAnalytics, trackOnboardingCompleted, setApiAnalyticsClientForTests } =
      await import("./client.js");
    captureImmediate.mockRejectedValue(new Error("posthog down"));
    setApiAnalyticsClientForTests({ captureImmediate });
    await expect(
      fireAndForgetAnalytics(() =>
        trackOnboardingCompleted({ userId: USER, subjectCount: 2 }),
      ),
    ).resolves.toBeUndefined();
  });
});
