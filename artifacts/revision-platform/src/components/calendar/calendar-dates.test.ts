import { describe, expect, it } from "vitest";
import {
  calendarItemDateKey,
  isCalendarItemInMonth,
  parseCalendarItemDate,
} from "./calendar-dates";

describe("calendar item dates", () => {
  it("reads date-only keys in local time instead of UTC midnight", () => {
    expect(calendarItemDateKey("2026-08-31T23:00:00.000Z")).toBe("2026-08-31");
    expect(parseCalendarItemDate("2026-08-31")?.getDate()).toBe(31);
    expect(parseCalendarItemDate("2026-08-31")?.getMonth()).toBe(7);
    expect(
      isCalendarItemInMonth("2026-08-31", new Date(2026, 7, 1)),
    ).toBe(true);
    expect(
      isCalendarItemInMonth("2026-09-01", new Date(2026, 7, 1)),
    ).toBe(false);
  });
});
