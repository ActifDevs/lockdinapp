import { format, isSameDay, isToday } from "date-fns";
import type { ExamDate, Task } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { CalendarToolbar } from "./calendar-toolbar";
import type { CalendarFilter, CalendarFilterSubject } from "./calendar-filter";
import type { WriteCalendarState } from "./types";

export function CalendarMobileStrip({
  viewMonth,
  selectedDate,
  today,
  monthDays,
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
  monthDays: Date[];
  tasksByDate: Map<string, Task[]>;
  examsByDate: Map<string, ExamDate[]>;
  filter: CalendarFilter;
  subjects: CalendarFilterSubject[];
  onFilterChange: (filter: CalendarFilter) => void;
  onWriteCalendarState: WriteCalendarState;
}) {
  return (
    <div className="space-y-4 md:hidden">
      <div className="overflow-hidden rounded-[var(--surface-radius)] border border-border/60 bg-card shadow-[var(--elev-2)]">
        <CalendarToolbar
          viewMonth={viewMonth}
          selectedDate={selectedDate}
          today={today}
          filter={filter}
          subjects={subjects}
          filterIdPrefix="calendar-filter-mobile"
          onFilterChange={onFilterChange}
          onWriteCalendarState={onWriteCalendarState}
        />
        <div className="scroll-snap-x flex gap-2 overflow-x-auto p-3 no-scrollbar">
          {monthDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDate.get(key) ?? [];
            const dayExams = examsByDate.get(key) ?? [];
            const eventCount = dayTasks.length + dayExams.length;
            const selected = isSameDay(day, selectedDate);
            const todayDay = isToday(day);
            const hasExam = dayExams.length > 0;
            const eventsLabel =
              eventCount === 0
                ? "no events"
                : `${eventCount} event${eventCount === 1 ? "" : "s"}`;
            return (
              <button
                key={key}
                type="button"
                aria-label={`${format(day, "EEEE, MMMM d, yyyy")}, ${eventsLabel}`}
                aria-current={todayDay ? "date" : undefined}
                aria-selected={selected}
                onClick={() => onWriteCalendarState(viewMonth, day)}
                className={cn(
                  "scroll-snap-start flex min-h-11 min-w-[3.25rem] shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 bg-card hover:bg-muted/40",
                  hasExam && !selected && "border-[hsl(var(--semantic-critical)/0.35)]",
                )}
              >
                <span className="text-[10px] font-medium uppercase text-muted-foreground">
                  {format(day, "EEE")}
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                    todayDay && "bg-primary text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                {eventCount > 0 && (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      hasExam
                        ? "bg-[hsl(var(--semantic-critical))]"
                        : "bg-primary",
                    )}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
