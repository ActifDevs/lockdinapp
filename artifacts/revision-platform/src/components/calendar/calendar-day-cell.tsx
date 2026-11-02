import { format, isSameDay, isSameMonth, isToday } from "date-fns";
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
      color: resolveSubjectAccent({
        name: e.subjectName,
        color: e.subjectColor,
      }),
    })),
    ...dayTasks.map((t) => ({
      type: "task" as const,
      id: `t-${t.id}`,
      label: t.title,
      color: resolveSubjectAccent({
        name: t.subjectName,
        color: t.subjectColor,
      }),
    })),
  ];
  const overflow = allEvents.length > 3 ? allEvents.length - 2 : 0;
  const visible =
    overflow > 0 ? allEvents.slice(0, 2) : allEvents.slice(0, 3);
  const inMonth = isSameMonth(day, viewMonth);
  const todayDay = isToday(day);
  const selected = isSameDay(day, selectedDate);
  const hasExam = dayExams.length > 0 && inMonth;
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
        "relative flex min-h-[104px] flex-col gap-1.5 border-b border-r p-2 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
        columnIndex === 6 && "border-r-0",
        !inMonth && "bg-muted/30",
        inMonth && !hasExam && "bg-card",
        hasExam && "bg-[hsl(var(--semantic-critical)/0.1)]",
        todayDay &&
          "z-[1] bg-primary/5 ring-2 ring-inset ring-primary",
        selected &&
          !todayDay &&
          "z-[1] ring-2 ring-inset ring-primary/45",
        !selected && !todayDay && "hover:bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          aria-hidden
          className={cn(
            "flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs font-medium leading-none",
            !inMonth && "text-muted-foreground/40",
            inMonth && !todayDay && "text-foreground",
            todayDay && "bg-primary font-bold text-primary-foreground",
            selected && !todayDay && "font-semibold text-primary",
          )}
        >
          {format(day, "d")}
        </span>
      </div>

      <div className="flex min-h-0 flex-col gap-1" aria-hidden>
        {visible.map((ev) => (
          <div
            key={ev.id}
            className={cn(
              "flex min-w-0 items-center gap-1.5 text-[11px] leading-tight",
              ev.type === "exam"
                ? "font-semibold text-[hsl(var(--semantic-critical))]"
                : "font-medium text-foreground",
            )}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: ev.color }}
            />
            <span className="truncate">{ev.label}</span>
          </div>
        ))}
        {overflow > 0 && (
          <div className="pl-3 text-[11px] font-medium text-muted-foreground">
            +{overflow} more
          </div>
        )}
      </div>
    </button>
  );
}
