import { describe, expect, it } from "vitest";
import { moveCalendarFocus } from "./calendar-grid-navigation";

const start = new Date(2026, 6, 27);
const end = new Date(2026, 8, 6);
const tuesday = new Date(2026, 7, 25);

describe("moveCalendarFocus", () => {
  it("moves by day, week, and week edges inside the visible grid", () => {
    expect(moveCalendarFocus(tuesday, "ArrowRight", start, end)).toEqual(
      new Date(2026, 7, 26),
    );
    expect(moveCalendarFocus(tuesday, "ArrowLeft", start, end)).toEqual(
      new Date(2026, 7, 24),
    );
    expect(moveCalendarFocus(tuesday, "ArrowDown", start, end)).toEqual(
      new Date(2026, 8, 1),
    );
    expect(moveCalendarFocus(tuesday, "Home", start, end)).toEqual(
      new Date(2026, 7, 24),
    );
    expect(moveCalendarFocus(tuesday, "End", start, end)).toEqual(
      new Date(2026, 7, 30),
    );
  });

  it("stays put at the grid edges and ignores other keys", () => {
    expect(moveCalendarFocus(start, "ArrowLeft", start, end)).toBeNull();
    expect(moveCalendarFocus(end, "ArrowRight", start, end)).toBeNull();
    expect(moveCalendarFocus(tuesday, "Enter", start, end)).toBeNull();
  });
});
