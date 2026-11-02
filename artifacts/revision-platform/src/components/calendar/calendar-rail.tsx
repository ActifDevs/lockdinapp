import type { ExamDate, Task } from "@workspace/api-client-react";
import { MonthOverview } from "./month-overview";
import { TodayPanel } from "./today-panel";
import { UpcomingDeadlines } from "./upcoming-deadlines";
import type { CalendarExamWithDate, WriteCalendarState } from "./types";

export function CalendarRail({
  selectedDate,
  selectedTasks,
  selectedExams,
  upcomingExams,
  viewMonthLabel,
  monthTaskCount,
  monthExamCount,
  plannedMinutes,
  onWriteCalendarState,
}: {
  selectedDate: Date;
  selectedTasks: Task[];
  selectedExams: ExamDate[];
  upcomingExams: CalendarExamWithDate[];
  viewMonthLabel: string;
  monthTaskCount: number;
  monthExamCount: number;
  plannedMinutes: number;
  onWriteCalendarState: WriteCalendarState;
}) {
  return (
    <div className="flex flex-col gap-4">
      <TodayPanel
        selectedDate={selectedDate}
        tasks={selectedTasks}
        exams={selectedExams}
      />
      <UpcomingDeadlines
        exams={upcomingExams}
        onWriteCalendarState={onWriteCalendarState}
      />
      <MonthOverview
        monthLabel={viewMonthLabel}
        taskCount={monthTaskCount}
        examCount={monthExamCount}
        plannedMinutes={plannedMinutes}
      />
    </div>
  );
}
