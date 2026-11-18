import { describe, expect, it } from "vitest";
import {
  compactWeekdayTick,
  scoreTrendSummary,
  weeklyQuietCaption,
} from "./chart-summaries";

describe("scoreTrendSummary", () => {
  it("uses the same bounded percentage precision as the visible chart", () => {
    expect(
      scoreTrendSummary(
        [
          { label: "First", percentage: 50 },
          { label: "Second", percentage: 66.666666 },
        ],
        (point) => point.label,
      ),
    ).toBe(
      "Score trend over 2 entries, latest 66.7%, up from 50%. First: 50%; Second: 66.7%.",
    );
  });
});

describe("compactWeekdayTick", () => {
  it("formats ISO dates as weekday abbreviations", () => {
    expect(compactWeekdayTick("2026-11-18")).toBe("Wed");
    expect(compactWeekdayTick(new Date(2026, 10, 18))).toBe("Wed");
    expect(compactWeekdayTick("not-a-date")).toBe("not-a-date");
  });
});

describe("weeklyQuietCaption", () => {
  it("explains missing and all-zero weeks", () => {
    expect(weeklyQuietCaption(undefined)).toBe(
      "No activity recorded in the last seven days.",
    );
    expect(
      weeklyQuietCaption([
        { date: "2026-11-12", tasksCompleted: 0 },
        { date: "2026-11-13", tasksCompleted: 0 },
      ]),
    ).toBe("No tasks completed in the last seven days.");
    expect(
      weeklyQuietCaption([{ date: "2026-11-12", tasksCompleted: 1 }]),
    ).toBeNull();
  });
});
