import { describe, expect, it } from "vitest";
import {
  resolveMonitoringEnvironment,
  resolveMonitoringRelease,
} from "./environment";

describe("frontend monitoring environment", () => {
  it("prefers explicit preview over Vite production mode", () => {
    expect(
      resolveMonitoringEnvironment({
        explicit: "preview",
        mode: "production",
        nodeEnv: "production",
      }),
    ).toBe("preview");
  });

  it("uses Git SHA when no hardcoded release is present", () => {
    expect(resolveMonitoringRelease({ vercelSha: "47c50dac" })).toBe("47c50dac");
    expect(resolveMonitoringRelease({})).toBeUndefined();
  });
});
