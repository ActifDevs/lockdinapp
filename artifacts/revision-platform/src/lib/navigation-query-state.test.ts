import { describe, expect, it } from "vitest";
import {
  formatLocalCalendarDate,
  formatLocalCalendarMonth,
  omitDefaultQueryValue,
  parseLocalCalendarDate,
  parseLocalCalendarMonth,
  resolveQueryParam,
  updateQueryParams,
} from "./navigation-query-state";

const tabs = ["account", "subjects", "appearance", "notifications"] as const;

describe("navigation query state", () => {
  it("resolves missing, valid, invalid, and duplicate owned values", () => {
    expect(
      resolveQueryParam(new URLSearchParams(), "tab", tabs, "account"),
    ).toEqual({ value: "account", needsNormalization: false });
    expect(
      resolveQueryParam(
        new URLSearchParams("tab=notifications"),
        "tab",
        tabs,
        "account",
      ),
    ).toEqual({ value: "notifications", needsNormalization: false });
    expect(
      resolveQueryParam(
        new URLSearchParams("tab=garbage"),
        "tab",
        tabs,
        "account",
      ),
    ).toEqual({ value: "account", needsNormalization: true });
    expect(
      resolveQueryParam(
        new URLSearchParams("tab=subjects&tab=appearance"),
        "tab",
        tabs,
        "account",
      ),
    ).toEqual({ value: "account", needsNormalization: true });
  });

  it("omits deliberately written defaults", () => {
    expect(omitDefaultQueryValue("account", "account")).toBeNull();
    expect(omitDefaultQueryValue("subjects", "account")).toBe("subjects");
  });

  it("updates owned keys without destroying or collapsing unrelated params", () => {
    const next = updateQueryParams(
      new URLSearchParams("tag=one&tab=account&tag=two&note=%F0%9F%93%9A"),
      [["tab", "subjects"]],
    );

    expect(next.get("tab")).toBe("subjects");
    expect(next.getAll("tag")).toEqual(["one", "two"]);
    expect(next.get("note")).toBe("📚");
  });

  it("encodes new values safely and can remove one owned key", () => {
    const encoded = updateQueryParams(new URLSearchParams("keep=yes"), [
      ["label", "Math & Physics"],
    ]);
    expect(encoded.toString()).toContain("label=Math+%26+Physics");
    expect(updateQueryParams(encoded, [["label", null]]).toString()).toBe(
      "keep=yes",
    );
  });

  it("updates multiple owned keys atomically", () => {
    const next = updateQueryParams(
      new URLSearchParams("month=2026-08&date=2026-08-25&keep=1"),
      [
        ["month", null],
        ["date", "2026-09-14"],
      ],
    );
    expect(next.toString()).toBe("keep=1&date=2026-09-14");
  });

  it("parses and formats strict local calendar dates without rollover", () => {
    const leapDay = parseLocalCalendarDate("2028-02-29");
    expect(leapDay).not.toBeNull();
    expect(leapDay?.getFullYear()).toBe(2028);
    expect(leapDay?.getMonth()).toBe(1);
    expect(leapDay?.getDate()).toBe(29);
    expect(formatLocalCalendarDate(leapDay!)).toBe("2028-02-29");

    expect(parseLocalCalendarDate("2027-02-29")).toBeNull();
    expect(parseLocalCalendarDate("2026-04-31")).toBeNull();
    expect(parseLocalCalendarDate("2026-2-03")).toBeNull();
  });

  it("keeps date-only values on the same local day in a non-UTC timezone", () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      const date = parseLocalCalendarDate("2026-01-01");
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(0);
      expect(date?.getDate()).toBe(1);
      expect(date?.getHours()).toBe(12);
      expect(formatLocalCalendarDate(date!)).toBe("2026-01-01");
    } finally {
      process.env.TZ = originalTimezone;
    }
  });

  it("parses and formats strict local calendar months", () => {
    const december = parseLocalCalendarMonth("2026-12");
    expect(december).not.toBeNull();
    expect(december?.getMonth()).toBe(11);
    expect(formatLocalCalendarMonth(december!)).toBe("2026-12");
    expect(parseLocalCalendarMonth("2026-13")).toBeNull();
    expect(parseLocalCalendarMonth("2026-2")).toBeNull();
  });
});
