import { describe, expect, it } from "vitest";
import {
  getUpcomingExamSessionOptions,
  getUpcomingExamSessions,
  structuredSessionFromPickerLabel,
} from "./exam-sessions";

describe("upcoming exam session options", () => {
  it("carries year and series on each picker option", () => {
    const options = getUpcomingExamSessionOptions(
      new Date("2026-08-29T00:00:00.000Z"),
    );
    expect(options.length).toBe(4);
    for (const option of options) {
      expect(option.label).toBe(`${option.series} ${option.year}`);
      expect(["May/June", "Oct/Nov"]).toContain(option.series);
    }
  });

  it("maps a known picker label without parsing display text ad hoc", () => {
    const options = getUpcomingExamSessionOptions(
      new Date("2026-08-29T00:00:00.000Z"),
    );
    const first = options[0];
    expect(structuredSessionFromPickerLabel(first.label, new Date("2026-08-29T00:00:00.000Z"))).toEqual({
      year: first.year,
      series: first.series,
    });
  });

  it("does not infer a structured session from Other", () => {
    expect(
      structuredSessionFromPickerLabel(
        "Other",
        new Date("2026-08-29T00:00:00.000Z"),
      ),
    ).toBeUndefined();
    expect(getUpcomingExamSessions(new Date("2026-08-29T00:00:00.000Z"))).not.toContain(
      "Other",
    );
  });
});
