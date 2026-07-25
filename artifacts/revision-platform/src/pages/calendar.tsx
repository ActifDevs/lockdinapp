import { useState, useMemo } from "react";
import {
  useListTasks,
  getListTasksQueryKey,
  useListExamDates,
  getListExamDatesQueryKey,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  differenceInCalendarDays,
  addMonths,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: tasks } = useListTasks(
    { filter: "all" },
    { query: { queryKey: getListTasksQueryKey({ filter: "all" }) } }
  );
  const { data: exams } = useListExamDates({
    query: { queryKey: getListExamDatesQueryKey() },
  });

  // Build lookup maps keyed by YYYY-MM-DD
  const tasksByDate = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    if (!tasks) return map;
    tasks.forEach((t) => {
      if (!t.deadline) return;
      const key = t.deadline.split("T")[0];
      map.set(key, [...(map.get(key) ?? []), t]);
    });
    return map;
  }, [tasks]);

  const examsByDate = useMemo(() => {
    const map = new Map<string, typeof exams>();
    if (!exams) return map;
    exams.forEach((e) => {
      const key = e.date.split("T")[0];
      map.set(key, [...(map.get(key) ?? []), e]);
    });
    return map;
  }, [exams]);

  // Calendar grid: Mon-start weeks covering the month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  // Selected day items
  const selKey = format(selectedDate, "yyyy-MM-dd");
  const selTasks = tasksByDate.get(selKey) ?? [];
  const selExams = examsByDate.get(selKey) ?? [];

  // Upcoming exams (next 60 days)
  const upcomingExams = useMemo(() => {
    if (!exams) return [];
    const today = new Date();
    return exams
      .map((e) => ({ ...e, _date: parseISO(e.date) }))
      .filter((e) => {
        const diff = differenceInCalendarDays(e._date, today);
        return diff >= 0 && diff <= 60;
      })
      .sort((a, b) => differenceInCalendarDays(a._date, b._date));
  }, [exams]);

  // Month stats
  const monthTaskCount = useMemo(() => {
    if (!tasks) return 0;
    return tasks.filter((t) => {
      if (!t.deadline) return false;
      const d = parseISO(t.deadline);
      return isSameMonth(d, viewMonth);
    }).length;
  }, [tasks, viewMonth]);

  const monthExamCount = useMemo(() => {
    if (!exams) return 0;
    return exams.filter((e) => isSameMonth(parseISO(e.date), viewMonth)).length;
  }, [exams, viewMonth]);

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      {/* Page header */}
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground mt-1.5">
          Your revision schedule and upcoming exams at a glance.
        </p>
      </div>

      {/* Exam countdown strip */}
      {upcomingExams.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {upcomingExams.slice(0, 5).map((exam) => {
            const diff = differenceInCalendarDays(exam._date, new Date());
            const urgency = diff <= 7 ? "urgent" : diff <= 21 ? "soon" : "upcoming";
            return (
              <div
                key={exam.id}
                className={cn(
                  "flex-shrink-0 flex items-center gap-3 rounded-xl px-4 py-3 border text-sm cursor-pointer transition-all",
                  urgency === "urgent" &&
                    "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300",
                  urgency === "soon" &&
                    "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-300",
                  urgency === "upcoming" &&
                    "bg-muted/60 border-border text-foreground"
                )}
                onClick={() => {
                  setSelectedDate(exam._date);
                  setViewMonth(exam._date);
                }}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: exam.subjectColor }}
                />
                <div>
                  <div className="font-semibold leading-tight">{exam.subjectName}</div>
                  <div className="text-xs opacity-75 mt-0.5">{exam.paperCode}</div>
                </div>
                <div className="ml-2 text-right flex-shrink-0">
                  <div className="font-bold tabular-nums">
                    {diff === 0 ? "Today" : diff === 1 ? "1 day" : `${diff}d`}
                  </div>
                  <div className="text-xs opacity-60">{format(exam._date, "d MMM")}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main grid layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* ── Calendar grid ── */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          {/* Month nav header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-xl font-bold">
                {format(viewMonth, "MMMM yyyy")}
              </h2>
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1">
                <span>{monthTaskCount} tasks</span>
                <span className="mx-1 opacity-40">·</span>
                <span>{monthExamCount} exams</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  const today = new Date();
                  setViewMonth(today);
                  setSelectedDate(today);
                }}
              >
                Today
              </Button>
              <div className="flex">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-r-none border-r-0"
                  onClick={() => setViewMonth((m) => subMonths(m, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-l-none"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className={cn(
                  "py-2.5 text-center text-xs font-medium text-muted-foreground",
                  (d === "Sat" || d === "Sun") && "text-muted-foreground/60"
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 auto-rows-[minmax(90px,1fr)]">
            {calendarDays.map((day, idx) => {
              const key = format(day, "yyyy-MM-dd");
              const dayTasks = tasksByDate.get(key) ?? [];
              const dayExams = examsByDate.get(key) ?? [];
              const allEvents = [...dayExams.map(e => ({ type: "exam" as const, id: `e-${e.id}`, label: e.paperCode, color: "#ef4444", subjectName: e.subjectName })),
                                 ...dayTasks.map(t => ({ type: "task" as const, id: `t-${t.id}`, label: t.title, color: t.subjectColor ?? "#6366f1", completed: t.completed }))];
              const overflow = allEvents.length > 3 ? allEvents.length - 2 : 0;
              const visible = overflow > 0 ? allEvents.slice(0, 2) : allEvents.slice(0, 3);
              const inMonth = isSameMonth(day, viewMonth);
              const todayDay = isToday(day);
              const selected = isSameDay(day, selectedDate);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative flex flex-col gap-1 p-2 cursor-pointer transition-colors border-b border-r group",
                    // remove double borders on last row / col
                    idx % 7 === 6 && "border-r-0",
                    !inMonth && "bg-muted/30",
                    inMonth && isWeekend && "bg-muted/10",
                    inMonth && !isWeekend && "bg-card",
                    selected && "ring-2 ring-inset ring-primary/50 bg-primary/5",
                    !selected && "hover:bg-muted/40"
                  )}
                >
                  {/* Day number */}
                  <div className="flex justify-end">
                    <span
                      className={cn(
                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full leading-none transition-colors",
                        !inMonth && "text-muted-foreground/40",
                        inMonth && !todayDay && "text-foreground",
                        todayDay &&
                          "bg-primary text-primary-foreground font-bold",
                        selected && !todayDay && "text-primary font-semibold"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Event chips */}
                  <div className="flex flex-col gap-0.5 min-h-0">
                    {visible.map((ev) => (
                      <div
                        key={ev.id}
                        className={cn(
                          "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] leading-tight truncate font-medium",
                          ev.type === "exam"
                            ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                            : "opacity-90"
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
                          <AlertCircle className="h-2.5 w-2.5 flex-shrink-0" />
                        )}
                        <span className="truncate">{ev.label}</span>
                        {ev.type === "task" && ev.completed && (
                          <CheckCircle2 className="h-2.5 w-2.5 flex-shrink-0 opacity-70" />
                        )}
                      </div>
                    ))}
                    {overflow > 0 && (
                      <div className="text-[10px] text-muted-foreground font-medium px-1.5">
                        +{overflow} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Day detail sidebar ── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden sticky top-6">
            {/* Sidebar header */}
            <div className="px-5 py-4 border-b">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}
              </div>
              <div className="font-serif text-2xl font-bold">
                {format(selectedDate, "MMMM d")}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(selectedDate, "yyyy")}
              </div>
            </div>

            {/* Events */}
            <div className="overflow-y-auto max-h-[520px]">
              {selExams.length === 0 && selTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Nothing scheduled
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    A free day — use it well.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {/* Exams first */}
                  {selExams.map((exam) => (
                    <div
                      key={`exam-${exam.id}`}
                      className="p-4 bg-red-50/60 dark:bg-red-950/20"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-1.5 py-0 h-4 uppercase tracking-wider"
                        >
                          Exam
                        </Badge>
                        <span
                          className="text-xs font-medium"
                          style={{ color: exam.subjectColor }}
                        >
                          {exam.subjectName}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {exam.paperCode}
                      </p>
                      {exam.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {exam.notes}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Tasks */}
                  {selTasks.map((task) => (
                    <div
                      key={`task-${task.id}`}
                      className={cn(
                        "p-4 transition-colors",
                        task.completed && "opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none"
                              style={{
                                backgroundColor: `${task.subjectColor}20`,
                                color: task.subjectColor,
                              }}
                            >
                              {task.subjectName}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded leading-none capitalize",
                                task.priority === "high" &&
                                  "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400",
                                task.priority === "medium" &&
                                  "bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
                                task.priority === "low" &&
                                  "bg-muted text-muted-foreground"
                              )}
                            >
                              {task.priority}
                            </span>
                          </div>
                          <p
                            className={cn(
                              "text-sm font-medium leading-snug",
                              task.completed &&
                                "line-through text-muted-foreground"
                            )}
                          >
                            {task.title}
                          </p>
                          {task.topicTitle && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {task.topicTitle}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {task.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : null}
                          {task.estimatedMinutes && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                              <Clock className="h-3 w-3" />
                              {task.estimatedMinutes}m
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar footer: legend */}
            <div className="px-5 py-3 border-t bg-muted/20 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm bg-primary/30" />
                Tasks
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm bg-red-400" />
                Exams
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
