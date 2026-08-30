import { beforeEach, describe, expect, it, vi } from "vitest";

const reportAccountCreated = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  reportAccountCreated: (...args: unknown[]) => reportAccountCreated(...args),
}));

describe("frontend account_created reporter", () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    reportAccountCreated.mockReset();
    reportAccountCreated.mockResolvedValue(undefined);
    const { resetFrontendAnalyticsForTests } = await import(
      "./report-account-created"
    );
    resetFrontendAnalyticsForTests();
  });

  it("does not call the API on ordinary login", async () => {
    const { emitAccountCreatedIfPending } = await import(
      "./report-account-created"
    );
    await emitAccountCreatedIfPending("user-a");
    expect(reportAccountCreated).not.toHaveBeenCalled();
  });

  it("calls the first-party endpoint once after pending signup", async () => {
    const { noteLocalSignup, emitAccountCreatedIfPending } = await import(
      "./report-account-created"
    );
    noteLocalSignup("user-a");
    await emitAccountCreatedIfPending("user-a");
    await emitAccountCreatedIfPending("user-a");
    expect(reportAccountCreated).toHaveBeenCalledTimes(1);
    expect(reportAccountCreated.mock.calls[0]?.[0]).toEqual({});
    const options = reportAccountCreated.mock.calls[0]?.[1] as {
      skipUnauthorizedHandler?: boolean;
    };
    expect(options.skipUnauthorizedHandler).toBe(true);
    const body = JSON.stringify(reportAccountCreated.mock.calls);
    expect(body).not.toMatch(/user-a|email|username/);
  });

  it("does not throw when the analytics API fails", async () => {
    reportAccountCreated.mockRejectedValue(new Error("network"));
    const { noteLocalSignup, emitAccountCreatedIfPending } = await import(
      "./report-account-created"
    );
    noteLocalSignup("user-a");
    await expect(emitAccountCreatedIfPending("user-a")).resolves.toBeUndefined();
  });
});
