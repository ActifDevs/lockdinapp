import { format } from "date-fns";
import type { ExamDate, Task } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { CalendarDayCell } from "./calendar-day-cell";
import { CalendarToolbar } from "./calendar-toolbar";
import type { WriteCalendarState } from "./types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthGrid({
  viewMonth,
  selectedDate,
  today,
  calendarWeeks,
  tasksByDate,
  examsByDate,
  onWriteCalendarState,
}: {
  viewMonth: Date;
  selectedDate: Date;
  today: Date;
  calendarWeeks: Date[][];
  tasksByDate: Map<string, Task[]>;
  examsByDate: Map<string, ExamDate[]>;
  onWriteCalendarState: WriteCalendarState;
}) {
  return (
    <div className="hidden overflow-hidden rounded-[var(--surface-radius)] border border-border/60 bg-card shadow-[var(--elev-2)] md:block">
      <CalendarToolbar
        viewMonth={viewMonth}
        selectedDate={selectedDate}
        today={today}
        onWriteCalendarState={onWriteCalendarState}
      />

      <div className="grid grid-cols-7 border-b" role="row">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            role="columnheader"
            className={cn(
              "py-2.5 text-center text-xs font-medium text-muted-foreground",
              (d === "Sat" || d === "Sun") && "text-muted-foreground/60",
            )}
          >
            {d}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-1 auto-rows-[minmax(104px,1fr)]"
        role="grid"
        aria-label={format(viewMonth, "MMMM yyyy")}
      >
        {calendarWeeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7" role="row">
            {week.map((day, idx) => {
              const key = format(day, "yyyy-MM-dd");
              return (
                <CalendarDayCell
                  key={key}
                  day={day}
                  columnIndex={idx}
                  viewMonth={viewMonth}
                  selectedDate={selectedDate}
                  dayTasks={tasksByDate.get(key) ?? []}
                  dayExams={examsByDate.get(key) ?? []}
                  onWriteCalendarState={onWriteCalendarState}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
