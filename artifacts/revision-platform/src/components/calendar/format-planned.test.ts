import { describe, expect, it } from "vitest";
import { formatPlannedDuration } from "./format-planned";

describe("formatPlannedDuration", () => {
  it("formats hours and leftover minutes", () => {
    expect(formatPlannedDuration(0)).toBe("0m");
    expect(formatPlannedDuration(45)).toBe("45m");
    expect(formatPlannedDuration(60)).toBe("1h");
    expect(formatPlannedDuration(150)).toBe("2h 30m");
  });
});
