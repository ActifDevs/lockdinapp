import { describe, expect, it } from "vitest";
import {
  filterUpcomingExamRows,
  type ExamDateRow,
} from "../lib/exam-dates";

function row(partial: Partial<ExamDateRow> & Pick<ExamDateRow, "id" | "date">): ExamDateRow {
  return {
    user_id: "user",
    subject_id: 1,
    paper_code: "P1",
    notes: null,
    ...partial,
  };
}

describe("filterUpcomingExamRows", () => {
  it("keeps today through +60 days inclusive and drops past/beyond", () => {
    const today = "2026-08-12";
    const filtered = filterUpcomingExamRows(
      [
        row({ id: 1, date: "2026-08-11" }),
        row({ id: 2, date: "2026-08-12" }),
        row({ id: 3, date: "2026-09-11" }),
        row({ id: 4, date: "2026-10-11" }),
        row({ id: 5, date: "2026-10-12" }),
      ],
      today,
    );
    expect(filtered.map((item) => item.id)).toEqual([2, 3, 4]);
  });
});
