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
    const { trackTaskCreated, trackPastPaperAttemptCreated, setApiAnalyticsClientForTests } =
      await import("./client.js");
    setApiAnalyticsClientForTests({ captureImmediate });

    await trackTaskCreated({ userId: USER });
    await trackTaskCreated({ userId: USER });
    await trackPastPaperAttemptCreated({ userId: USER });
    await trackPastPaperAttemptCreated({ userId: USER });

    expect(captureImmediate).toHaveBeenCalledTimes(4);
    const events = captureImmediate.mock.calls.map((call) => call[0].event);
    expect(events).toEqual([
      "task_created",
      "task_created",
      "past_paper_attempt_created",
      "past_paper_attempt_created",
    ]);
    for (const call of captureImmediate.mock.calls) {
      expect(call[0].distinctId).not.toBe(USER);
      expect(call[0].distinctId).not.toContain(USER);
      expect(call[0].properties).toEqual({
        environment: "production",
        $process_person_profile: false,
      });
    }
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
