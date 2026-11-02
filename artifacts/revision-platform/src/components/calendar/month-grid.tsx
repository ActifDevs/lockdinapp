import { useEffect, useRef } from "react";
import { format } from "date-fns";
import type { ExamDate, Task } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { parseLocalCalendarDate } from "@/lib/navigation-query-state";
import { CalendarDayCell } from "./calendar-day-cell";
import { CalendarToolbar } from "./calendar-toolbar";
import { moveCalendarFocus } from "./calendar-grid-navigation";
import type { CalendarFilter, CalendarFilterSubject } from "./calendar-filter";
import type { WriteCalendarState } from "./types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthGrid({
  viewMonth,
  selectedDate,
  today,
  calendarWeeks,
  tasksByDate,
  examsByDate,
  filter,
  subjects,
  onFilterChange,
  onWriteCalendarState,
}: {
  viewMonth: Date;
  selectedDate: Date;
  today: Date;
  calendarWeeks: Date[][];
  tasksByDate: Map<string, Task[]>;
  examsByDate: Map<string, ExamDate[]>;
  filter: CalendarFilter;
  subjects: CalendarFilterSubject[];
  onFilterChange: (filter: CalendarFilter) => void;
  onWriteCalendarState: WriteCalendarState;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const pendingKeyboardFocus = useRef(false);
  const rangeStart = calendarWeeks[0]?.[0];
  const lastWeek = calendarWeeks[calendarWeeks.length - 1];
  const rangeEnd = lastWeek?.[lastWeek.length - 1];

  useEffect(() => {
    if (!pendingKeyboardFocus.current) return;
    pendingKeyboardFocus.current = false;
    const key = format(selectedDate, "yyyy-MM-dd");
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-date="${key}"]`)
      ?.focus();
  }, [selectedDate]);

  return (
    <div className="hidden overflow-hidden rounded-[var(--surface-radius)] border border-border/60 bg-card shadow-[var(--elev-2)] md:block">
      <CalendarToolbar
        viewMonth={viewMonth}
        selectedDate={selectedDate}
        today={today}
        filter={filter}
        subjects={subjects}
        filterIdPrefix="calendar-filter-desktop"
        onFilterChange={onFilterChange}
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
        ref={gridRef}
        className="grid grid-cols-1 auto-rows-[minmax(104px,1fr)]"
        role="grid"
        aria-label={format(viewMonth, "MMMM yyyy")}
        onKeyDown={(event) => {
          if (!rangeStart || !rangeEnd) return;
          const target = event.target;
          if (
            !(target instanceof HTMLElement) ||
            target.getAttribute("role") !== "gridcell"
          ) {
            return;
          }
          const current = target.dataset.date
            ? parseLocalCalendarDate(target.dataset.date)
            : null;
          if (!current) return;
          const next = moveCalendarFocus(
            current,
            event.key,
            rangeStart,
            rangeEnd,
          );
          if (!next) return;
          event.preventDefault();
          pendingKeyboardFocus.current = true;
          onWriteCalendarState(viewMonth, next);
        }}
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
