import { format, isSameDay, isSameMonth, isToday } from "date-fns";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ExamDate, Task } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { resolveSubjectAccent } from "@/lib/subject-accent";
import type { WriteCalendarState } from "./types";

export function CalendarDayCell({
  day,
  columnIndex,
  viewMonth,
  selectedDate,
  dayTasks,
  dayExams,
  onWriteCalendarState,
}: {
  day: Date;
  columnIndex: number;
  viewMonth: Date;
  selectedDate: Date;
  dayTasks: Task[];
  dayExams: ExamDate[];
  onWriteCalendarState: WriteCalendarState;
}) {
  const eventCount = dayTasks.length + dayExams.length;
  const allEvents = [
    ...dayExams.map((e) => ({
      type: "exam" as const,
      id: `e-${e.id}`,
      label: e.paperCode,
      color: "#ef4444",
      subjectName: e.subjectName,
    })),
    ...dayTasks.map((t) => ({
      type: "task" as const,
      id: `t-${t.id}`,
      label: t.title,
      color: resolveSubjectAccent({
        name: t.subjectName,
        color: t.subjectColor,
      }),
      completed: t.completed,
    })),
  ];
  const overflow = allEvents.length > 3 ? allEvents.length - 2 : 0;
  const visible =
    overflow > 0 ? allEvents.slice(0, 2) : allEvents.slice(0, 3);
  const inMonth = isSameMonth(day, viewMonth);
  const todayDay = isToday(day);
  const selected = isSameDay(day, selectedDate);
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  const dayLabel = format(day, "EEEE, MMMM d, yyyy");
  const eventsLabel =
    eventCount === 0
      ? "no events"
      : `${eventCount} event${eventCount === 1 ? "" : "s"}`;

  return (
    <button
      type="button"
      role="gridcell"
      aria-selected={selected}
      aria-current={todayDay ? "date" : undefined}
      aria-label={`${dayLabel}, ${eventsLabel}`}
      onClick={() => onWriteCalendarState(viewMonth, day)}
      className={cn(
        "relative flex min-h-[90px] flex-col gap-1 border-b border-r p-2 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
        columnIndex === 6 && "border-r-0",
        !inMonth && "bg-muted/30",
        inMonth && isWeekend && "bg-muted/10",
        inMonth && !isWeekend && "bg-card",
        selected && "bg-primary/5 ring-2 ring-inset ring-primary/50",
        !selected && "hover:bg-muted/40",
      )}
    >
      <div className="flex justify-end">
        <span
          aria-hidden
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium leading-none transition-colors",
            !inMonth && "text-muted-foreground/40",
            inMonth && !todayDay && "text-foreground",
            todayDay && "bg-primary font-bold text-primary-foreground",
            selected && !todayDay && "font-semibold text-primary",
          )}
        >
          {format(day, "d")}
        </span>
      </div>

      <div className="flex min-h-0 flex-col gap-0.5" aria-hidden>
        {visible.map((ev) => (
          <div
            key={ev.id}
            className={cn(
              "flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-xs leading-tight font-medium",
              ev.type === "exam"
                ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                : "opacity-90",
            )}
            style={
              ev.type === "task"
                ? {
                    backgroundColor: `${ev.color}18`,
                    color: ev.color,
                  }
                : undefined
            }
          >
            {ev.type === "exam" && (
              <AlertCircle className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
            )}
            <span className="truncate">{ev.label}</span>
            {ev.type === "task" && ev.completed && (
              <CheckCircle2
                className="h-2.5 w-2.5 shrink-0 opacity-70"
                strokeWidth={2}
              />
            )}
          </div>
        ))}
        {overflow > 0 && (
          <div className="px-1.5 text-xs font-medium text-muted-foreground">
            +{overflow} more
          </div>
        )}
      </div>
    </button>
  );
}
