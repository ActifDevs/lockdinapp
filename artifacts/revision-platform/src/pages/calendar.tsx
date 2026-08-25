import { useEffect, useMemo } from "react";
import {
  useListTasks,
  getListTasksQueryKey,
  useListExamDates,
  getListExamDatesQueryKey,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichEmptyState } from "@/components/rich-empty-state";
import { PageHeader } from "@/components/page-header";
import { getQueryErrorMessage } from "@/lib/query-error-message";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveSubjectAccent } from "@/lib/subject-accent";
import { useSearchParams } from "wouter";
import {
  formatLocalCalendarDate,
  formatLocalCalendarMonth,
  parseLocalCalendarDate,
  parseLocalCalendarMonth,
  updateQueryParams,
} from "@/lib/navigation-query-state";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = useMemo(() => new Date(), []);
  const rawDateValues = searchParams.getAll("date");
  const rawMonthValues = searchParams.getAll("month");
  const parsedDate =
    rawDateValues.length === 1
      ? parseLocalCalendarDate(rawDateValues[0])
      : null;
  const parsedMonth =
    rawMonthValues.length === 1
      ? parseLocalCalendarMonth(rawMonthValues[0])
      : null;
  const selectedDate = parsedDate ?? today;
  const viewMonth = parsedMonth ?? startOfMonth(parsedDate ?? today);
  const dateNeedsNormalization =
    rawDateValues.length > 0 &&
    (rawDateValues.length !== 1 ||
      parsedDate === null ||
      isSameDay(parsedDate, today));
  const monthNeedsNormalization =
    rawMonthValues.length > 0 &&
    (rawMonthValues.length !== 1 ||
      parsedMonth === null ||
      isSameMonth(parsedMonth, selectedDate));

  useEffect(() => {
    if (!dateNeedsNormalization && !monthNeedsNormalization) return;
    const updates: Array<readonly [string, string | null]> = [];
    if (dateNeedsNormalization) updates.push(["date", null]);
    if (monthNeedsNormalization) updates.push(["month", null]);
    setSearchParams((current) => updateQueryParams(current, updates), {
      replace: true,
    });
  }, [dateNeedsNormalization, monthNeedsNormalization, setSearchParams]);

  const writeCalendarState = (nextMonth: Date, nextDate: Date) => {
    setSearchParams(
      (current) =>
        updateQueryParams(current, [
          [
            "month",
            isSameMonth(nextMonth, nextDate)
              ? null
              : formatLocalCalendarMonth(nextMonth),
          ],
          [
            "date",
            isSameDay(nextDate, today)
              ? null
              : formatLocalCalendarDate(nextDate),
          ],
        ]),
      { replace: true },
    );
  };

  const {
    data: tasks,
    isPending: tasksPending,
    isError: tasksError,
    error: tasksLoadError,
    refetch: refetchTasks,
  } = useListTasks(
    { filter: "all" },
    { query: { queryKey: getListTasksQueryKey({ filter: "all" }) } },
  );
  const {
    data: exams,
    isPending: examsPending,
    isError: examsError,
    error: examsLoadError,
    refetch: refetchExams,
  } = useListExamDates({
    query: { queryKey: getListExamDatesQueryKey() },
  });

  const isPending = tasksPending || examsPending;
  const isError = tasksError || examsError;
  const loadError = tasksLoadError ?? examsLoadError;

  const refetchCalendar = () => {
    void refetchTasks();
    void refetchExams();
  };

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

  const calendarWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    return weeks;
  }, [calendarDays]);

  const monthDays = useMemo(
    () => calendarDays.filter((day) => isSameMonth(day, viewMonth)),
    [calendarDays, viewMonth],
  );

  const selectedDateLabel = `${format(selectedDate, "EEEE, MMMM d, yyyy")}${
    selTasks.length + selExams.length > 0
      ? `, ${selTasks.length + selExams.length} scheduled item${selTasks.length + selExams.length === 1 ? "" : "s"}`
      : ", nothing scheduled"
  }`;

  if (isPending) {
    return (
      <div className="app-page animate-pulse">
        <div className="dash-skeleton h-10 w-48 rounded-xl" />
        <div className="dash-skeleton h-24 rounded-[var(--surface-radius)]" />
        <div className="dash-skeleton h-[28rem] rounded-[var(--surface-radius)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="app-page">
        <PageHeader
          title="Calendar"
          subtitle="Revision deadlines and exam countdowns in one calm view."
        />
        <div className="dash-panel flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">
            Could not load calendar
          </h2>
          <p className="max-w-md text-center text-muted-foreground">
            {getQueryErrorMessage(loadError)}
          </p>
          <Button onClick={refetchCalendar}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page animate-in fade-in duration-300 md:pb-10">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Selected: {selectedDateLabel}
      </p>
      <PageHeader
        title="Calendar"
        subtitle="Revision deadlines and exam countdowns in one calm view."
      />

      {/* Exam countdown strip */}
      {upcomingExams.length > 0 && (
        <div
          className="flex gap-3 overflow-x-auto pb-1 no-scrollbar"
          role="list"
          aria-label="Upcoming exams"
        >
          {upcomingExams.slice(0, 5).map((exam) => {
            const diff = differenceInCalendarDays(exam._date, new Date());
            const urgency =
              diff <= 7 ? "urgent" : diff <= 21 ? "soon" : "upcoming";
            const countdown =
              diff === 0 ? "Today" : diff === 1 ? "1 day" : `${diff} days`;
            return (
              <button
                key={exam.id}
                type="button"
                role="listitem"
                aria-label={`${exam.subjectName} ${exam.paperCode}, ${countdown} away on ${format(exam._date, "MMMM d")}. Show on calendar.`}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  urgency === "urgent" && "pastel-pink pastel-border-pink",
                  urgency === "soon" && "pastel-yellow pastel-border-yellow",
                  urgency === "upcoming" && "surface-card border-border/60",
                )}
                onClick={() => {
                  writeCalendarState(exam._date, exam._date);
                }}
              >
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: resolveSubjectAccent({
                      name: exam.subjectName,
                      color: exam.subjectColor,
                    }),
                  }}
                  aria-hidden
                />
                <div>
                  <div className="font-semibold leading-tight">
                    {exam.subjectName}
                  </div>
                  <div className="mt-0.5 text-xs opacity-75">
                    {exam.paperCode}
                  </div>
                </div>
                <div className="ml-2 shrink-0 text-right">
                  <div className="font-bold tabular-nums">
                    {diff === 0 ? "Today" : diff === 1 ? "1 day" : `${diff}d`}
                  </div>
                  <div className="text-xs opacity-60">
                    {format(exam._date, "d MMM")}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        {/* Mobile: day picker + detail first */}
        <div className="space-y-4 md:hidden">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--elev-2)]">
            <div className="flex flex-col gap-3 border-b px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold tracking-[-0.01em]">
                  {format(viewMonth, "MMMM yyyy")}
                </h2>
                <div className="flex items-center gap-1 text-xs text-muted-foreground rounded-full bg-muted px-2.5 py-1">
                  <span>{monthTaskCount} tasks</span>
                  <span className="mx-1 opacity-40">·</span>
                  <span>{monthExamCount} exams</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 text-xs"
                  onClick={() => {
                    writeCalendarState(today, today);
                  }}
                >
                  Today
                </Button>
                <div className="flex">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 rounded-r-none border-r-0"
                    aria-label="Previous month"
                    onClick={() =>
                      writeCalendarState(subMonths(viewMonth, 1), selectedDate)
                    }
                  >
                    <ChevronLeft
                      className="h-4 w-4"
                      aria-hidden
                      strokeWidth={2}
                    />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 rounded-l-none"
                    aria-label="Next month"
                    onClick={() =>
                      writeCalendarState(addMonths(viewMonth, 1), selectedDate)
                    }
                  >
                    <ChevronRight
                      className="h-4 w-4"
                      aria-hidden
                      strokeWidth={2}
                    />
                  </Button>
                </div>
              </div>
            </div>
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
                    onClick={() => writeCalendarState(viewMonth, day)}
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

        {/* ── Calendar grid (tablet+) ── */}
        <div className="hidden overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--elev-2)] md:block">
          {/* Month nav header */}
          <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold">
                {format(viewMonth, "MMMM yyyy")}
              </h2>
              <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                <span>{monthTaskCount} tasks</span>
                <span className="mx-1 opacity-40">·</span>
                <span>{monthExamCount} exams</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-11 text-xs"
                onClick={() => {
                  writeCalendarState(today, today);
                }}
              >
                Today
              </Button>
              <div className="flex">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-r-none border-r-0"
                  aria-label="Previous month"
                  onClick={() =>
                    writeCalendarState(subMonths(viewMonth, 1), selectedDate)
                  }
                >
                  <ChevronLeft
                    className="h-4 w-4"
                    aria-hidden
                    strokeWidth={2}
                  />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-l-none"
                  aria-label="Next month"
                  onClick={() =>
                    writeCalendarState(addMonths(viewMonth, 1), selectedDate)
                  }
                >
                  <ChevronRight
                    className="h-4 w-4"
                    aria-hidden
                    strokeWidth={2}
                  />
                </Button>
              </div>
            </div>
          </div>

          {/* Weekday headers */}
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

          {/* Day cells */}
          <div
            className="grid grid-cols-1 auto-rows-[minmax(90px,1fr)]"
            role="grid"
            aria-label={format(viewMonth, "MMMM yyyy")}
          >
            {calendarWeeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7" role="row">
                {week.map((day, idx) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayTasks = tasksByDate.get(key) ?? [];
                  const dayExams = examsByDate.get(key) ?? [];
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
                  const overflow =
                    allEvents.length > 3 ? allEvents.length - 2 : 0;
                  const visible =
                    overflow > 0
                      ? allEvents.slice(0, 2)
                      : allEvents.slice(0, 3);
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
                      key={key}
                      type="button"
                      role="gridcell"
                      aria-selected={selected}
                      aria-current={todayDay ? "date" : undefined}
                      aria-label={`${dayLabel}, ${eventsLabel}`}
                      onClick={() => writeCalendarState(viewMonth, day)}
                      className={cn(
                        "relative flex min-h-[90px] flex-col gap-1 border-b border-r p-2 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                        idx === 6 && "border-r-0",
                        !inMonth && "bg-muted/30",
                        inMonth && isWeekend && "bg-muted/10",
                        inMonth && !isWeekend && "bg-card",
                        selected &&
                          "bg-primary/5 ring-2 ring-inset ring-primary/50",
                        !selected && "hover:bg-muted/40",
                      )}
                    >
                      {/* Day number */}
                      <div className="flex justify-end">
                        <span
                          aria-hidden
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium leading-none transition-colors",
                            !inMonth && "text-muted-foreground/40",
                            inMonth && !todayDay && "text-foreground",
                            todayDay &&
                              "bg-primary font-bold text-primary-foreground",
                            selected &&
                              !todayDay &&
                              "font-semibold text-primary",
                          )}
                        >
                          {format(day, "d")}
                        </span>
                      </div>

                      {/* Event chips */}
                      <div
                        className="flex min-h-0 flex-col gap-0.5"
                        aria-hidden
                      >
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
                              <AlertCircle
                                className="h-2.5 w-2.5 shrink-0"
                                strokeWidth={2}
                              />
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
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ── Day detail ── */}
        <div className="flex flex-col gap-4 md:col-span-1 xl:col-span-1">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--elev-2)] md:sticky md:top-6">
            {/* Sidebar header */}
            <div className="px-5 py-4 border-b">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={2} />
                {isToday(selectedDate) ? "Today" : format(selectedDate, "EEEE")}
              </div>
              <div className="text-2xl font-bold">
                {format(selectedDate, "MMMM d")}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(selectedDate, "yyyy")}
              </div>
            </div>

            {/* Events */}
            <div className="overflow-y-auto max-h-[520px]">
              {selExams.length === 0 && selTasks.length === 0 ? (
                <RichEmptyState
                  scene="calendar"
                  title="Nothing scheduled"
                  description="A free day — use it well, or add tasks from your study plan."
                  actionHref="/study-plan"
                  actionLabel="Open study plan"
                  variant="mint"
                  className="py-10"
                />
              ) : (
                <div className="divide-y">
                  {/* Exams first */}
                  {selExams.map((exam) => (
                    <div key={`exam-${exam.id}`} className="p-4 pastel-pink">
                      <div className="flex items-center gap-2 mb-1.5">
                        <AlertCircle
                          className="h-3.5 w-3.5 text-[hsl(var(--semantic-critical))] flex-shrink-0"
                          strokeWidth={2}
                        />
                        <Badge
                          variant="destructive"
                          className="h-auto px-2 py-0.5 text-xs font-medium"
                        >
                          Exam
                        </Badge>
                        <span
                          className="text-xs font-medium"
                          style={{
                            color: resolveSubjectAccent({
                              name: exam.subjectName,
                              color: exam.subjectColor,
                            }),
                          }}
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
                  {selTasks.map((task) => {
                    const accent = resolveSubjectAccent({
                      name: task.subjectName,
                      color: task.subjectColor,
                    });
                    return (
                      <div
                        key={`task-${task.id}`}
                        className={cn(
                          "p-4 transition-colors",
                          task.completed && "opacity-60",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none"
                                style={{
                                  backgroundColor: `${accent}20`,
                                  color: accent,
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
                                    "bg-muted text-muted-foreground",
                                )}
                              >
                                {task.priority}
                              </span>
                            </div>
                            <p
                              className={cn(
                                "text-sm font-medium leading-snug",
                                task.completed &&
                                  "line-through text-muted-foreground",
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
                              <CheckCircle2
                                className="h-4 w-4 text-[hsl(var(--semantic-complete))]"
                                strokeWidth={2}
                              />
                            ) : null}
                            {task.estimatedMinutes && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                                <Clock className="h-3 w-3" strokeWidth={2} />
                                {task.estimatedMinutes}m
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
