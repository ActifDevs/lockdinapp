import { describe, expect, it } from "vitest";
import {
  resolveMonitoringEnvironment,
  resolveMonitoringRelease,
} from "./environment.js";

describe("API monitoring environment", () => {
  it("uses Vercel preview when SENTRY_ENVIRONMENT is unset", () => {
    expect(
      resolveMonitoringEnvironment({
        vercelEnv: "preview",
        nodeEnv: "production",
      }),
    ).toBe("preview");
  });

  it("does not invent a release SHA", () => {
    expect(resolveMonitoringRelease({ explicit: " ", vercelSha: "" })).toBeUndefined();
    expect(resolveMonitoringRelease({ vercelSha: "cafe123" })).toBe("cafe123");
  });
});
