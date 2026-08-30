import { beforeEach, describe, expect, it, vi } from "vitest";

const init = vi.fn();
const capture = vi.fn();
const reset = vi.fn();

vi.mock("posthog-js", () => ({
  default: {
    init,
    capture,
    reset,
  },
}));

describe("browser analytics client", () => {
  beforeEach(() => {
    vi.resetModules();
    init.mockReset();
    capture.mockReset();
    reset.mockReset();
    localStorage.clear();
    sessionStorage.clear();
    import.meta.env.VITE_POSTHOG_PROJECT_TOKEN = "";
    import.meta.env.VITE_POSTHOG_HOST = "";
    import.meta.env.VITE_LOCKDIN_ANALYTICS_ENV = "preview";
  });

  it("is a no-op without client config", async () => {
    const { trackAccountCreated, isBrowserAnalyticsConfigured } = await import(
      "./client"
    );
    expect(isBrowserAnalyticsConfigured()).toBe(false);
    await trackAccountCreated();
    expect(init).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it("captures account_created without identity fields", async () => {
    import.meta.env.VITE_POSTHOG_PROJECT_TOKEN = "phc_test";
    import.meta.env.VITE_POSTHOG_HOST = "https://eu.i.posthog.com";
    const { trackAccountCreated } = await import("./client");
    await trackAccountCreated();
    expect(init).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith("account_created", {
      environment: "preview",
    });
    const payload = JSON.stringify(capture.mock.calls);
    expect(payload).not.toMatch(/email|username|11111111/);
  });

  it("resetAnalyticsIdentity calls posthog.reset after init", async () => {
    import.meta.env.VITE_POSTHOG_PROJECT_TOKEN = "phc_test";
    import.meta.env.VITE_POSTHOG_HOST = "https://eu.i.posthog.com";
    const { trackAccountCreated, resetAnalyticsIdentity } = await import(
      "./client"
    );
    await trackAccountCreated();
    resetAnalyticsIdentity();
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
