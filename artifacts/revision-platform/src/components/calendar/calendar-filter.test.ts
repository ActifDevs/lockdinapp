import { describe, expect, it } from "vitest";
import type { ExamDate, Task } from "@workspace/api-client-react";
import {
  describeCalendarFilter,
  EMPTY_CALENDAR_FILTER,
  filterCalendarExams,
  filterCalendarTasks,
  isCalendarFilterActive,
} from "./calendar-filter";

const physicsTask = { id: 1, subjectId: 2, title: "Waves" } as Task;
const mathsTask = { id: 2, subjectId: 9, title: "Pure 1" } as Task;
const physicsExam = { id: 3, subjectId: 2, paperCode: "9702/1" } as ExamDate;
const mathsExam = { id: 4, subjectId: 9, paperCode: "9709/1" } as ExamDate;

describe("calendar filter", () => {
  it("is inactive until type or subject is chosen", () => {
    expect(isCalendarFilterActive(EMPTY_CALENDAR_FILTER)).toBe(false);
    expect(
      isCalendarFilterActive({ kind: "tasks", subjectId: null }),
    ).toBe(true);
    expect(
      isCalendarFilterActive({ kind: "all", subjectId: 2 }),
    ).toBe(true);
  });

  it("keeps matching tasks and exams, and drops the other type", () => {
    const tasks = [physicsTask, mathsTask];
    const exams = [physicsExam, mathsExam];

    expect(filterCalendarTasks(tasks, EMPTY_CALENDAR_FILTER)).toEqual(tasks);
    expect(filterCalendarExams(exams, EMPTY_CALENDAR_FILTER)).toEqual(exams);

    expect(
      filterCalendarTasks(tasks, { kind: "exams", subjectId: null }),
    ).toEqual([]);
    expect(
      filterCalendarExams(exams, { kind: "tasks", subjectId: null }),
    ).toEqual([]);

    expect(
      filterCalendarTasks(tasks, { kind: "all", subjectId: 2 }),
    ).toEqual([physicsTask]);
    expect(
      filterCalendarExams(exams, { kind: "all", subjectId: 2 }),
    ).toEqual([physicsExam]);
  });

  it("describes an active filter for the live region", () => {
    expect(
      describeCalendarFilter(EMPTY_CALENDAR_FILTER, [
        { id: 2, name: "Physics" },
      ]),
    ).toBeNull();
    expect(
      describeCalendarFilter(
        { kind: "tasks", subjectId: 2 },
        [{ id: 2, name: "Physics" }],
      ),
    ).toBe("Filters on: tasks, Physics.");
  });
});
