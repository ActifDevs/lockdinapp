import { describe, expect, it } from "vitest";
import { scoreTrendSummary } from "./chart-summaries";

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
