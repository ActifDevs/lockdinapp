import { describe, expect, it } from "vitest";
import { formatPercentage } from "./format-percentage";

describe("formatPercentage", () => {
  it("renders integer percentages without a trailing decimal", () => {
    expect(formatPercentage(50)).toBe("50%");
    expect(formatPercentage(80)).toBe("80%");
  });

  it("rounds fractional percentages to at most one decimal place", () => {
    expect(formatPercentage(66.666666)).toBe("66.7%");
    expect(formatPercentage(12.34)).toBe("12.3%");
  });
});
