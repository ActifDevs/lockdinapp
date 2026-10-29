import { format, isSameDay, isToday } from "date-fns";
import type { ExamDate, Task } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { CalendarToolbar } from "./calendar-toolbar";
import type { WriteCalendarState } from "./types";

export function CalendarMobileStrip({
  viewMonth,
  selectedDate,
  today,
  monthDays,
  tasksByDate,
  examsByDate,
  monthTaskCount,
  monthExamCount,
  onWriteCalendarState,
}: {
  viewMonth: Date;
  selectedDate: Date;
  today: Date;
  monthDays: Date[];
  tasksByDate: Map<string, Task[]>;
  examsByDate: Map<string, ExamDate[]>;
  monthTaskCount: number;
  monthExamCount: number;
  onWriteCalendarState: WriteCalendarState;
}) {
  return (
    <div className="space-y-4 md:hidden">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--elev-2)]">
        <CalendarToolbar
          variant="mobile"
          viewMonth={viewMonth}
          selectedDate={selectedDate}
          today={today}
          monthTaskCount={monthTaskCount}
          monthExamCount={monthExamCount}
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
            return (
              <button
                key={key}
                type="button"
                aria-label={format(day, "EEEE, MMMM d")}
                aria-current={todayDay ? "date" : undefined}
                aria-selected={selected}
                onClick={() => onWriteCalendarState(viewMonth, day)}
                className={cn(
                  "scroll-snap-start flex min-w-[3.25rem] shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 bg-card hover:bg-muted/40",
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
                    className="h-1.5 w-1.5 rounded-full bg-primary"
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
