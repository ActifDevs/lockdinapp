import { useEffect, useMemo, useState } from "react";
import {
  useListTasks,
  getListTasksQueryKey,
  useListExamDates,
  getListExamDatesQueryKey,
  getListCurrentUserSubjectsQueryKey,
  useListCurrentUserSubjects,
  type ExamDate,
  type Task,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { CalendarCreateMenu } from "@/components/calendar/calendar-create-menu";
import {
  EMPTY_CALENDAR_FILTER,
  filterCalendarExams,
  filterCalendarTasks,
} from "@/components/calendar/calendar-filter";
import { CalendarMobileStrip } from "@/components/calendar/calendar-mobile-strip";
import { CalendarRail } from "@/components/calendar/calendar-rail";
import { MonthGrid } from "@/components/calendar/month-grid";
import { ReadStateNotice } from "@/components/read-state-notice";
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
  parseISO,
  differenceInCalendarDays,
} from "date-fns";
import { Link, useSearchParams } from "wouter";
import {
  formatLocalCalendarDate,
  formatLocalCalendarMonth,
  parseLocalCalendarDate,
  parseLocalCalendarMonth,
  updateQueryParams,
} from "@/lib/navigation-query-state";

const CALENDAR_SUBTITLE =
  "Your study schedule, deadlines and exam countdowns - all in one place.";

export default function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [calendarFilter, setCalendarFilter] = useState(EMPTY_CALENDAR_FILTER);
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

  const {
    data: memberships,
    isLoading: membershipsLoading,
    isError: membershipsError,
    error: membershipsLoadError,
    refetch: refetchMemberships,
  } = useListCurrentUserSubjects({
    query: { queryKey: getListCurrentUserSubjectsQueryKey() },
  });

  const isPending = tasksPending || examsPending;
  const isError = tasksError || examsError;
  const loadError = tasksLoadError ?? examsLoadError;
  const filterSubjects = useMemo(
    () =>
      (memberships ?? []).map((membership) => ({
        id: membership.subject.id,
        name: membership.subject.name,
      })),
    [memberships],
  );
  const visibleTasks = useMemo(
    () => filterCalendarTasks(tasks, calendarFilter),
    [tasks, calendarFilter],
  );
  const visibleExams = useMemo(
    () => filterCalendarExams(exams, calendarFilter),
    [exams, calendarFilter],
  );

  const refetchCalendar = () => {
    void refetchTasks();
    void refetchExams();
  };

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    visibleTasks.forEach((t) => {
      if (!t.deadline) return;
      const key = t.deadline.split("T")[0];
      map.set(key, [...(map.get(key) ?? []), t]);
    });
    return map;
  }, [visibleTasks]);

  const examsByDate = useMemo(() => {
    const map = new Map<string, ExamDate[]>();
    visibleExams.forEach((e) => {
      const key = e.date.split("T")[0];
      map.set(key, [...(map.get(key) ?? []), e]);
    });
    return map;
  }, [visibleExams]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  const selKey = format(selectedDate, "yyyy-MM-dd");
  const selTasks = tasksByDate.get(selKey) ?? [];
  const selExams = examsByDate.get(selKey) ?? [];

  const upcomingExams = useMemo(() => {
    const todayDate = new Date();
    return visibleExams
      .map((e) => ({ ...e, _date: parseISO(e.date) }))
      .filter((e) => {
        const diff = differenceInCalendarDays(e._date, todayDate);
        return diff >= 0 && diff <= 60;
      })
      .sort((a, b) => differenceInCalendarDays(a._date, b._date));
  }, [visibleExams]);

  const monthTaskCount = useMemo(() => {
    return visibleTasks.filter((t) => {
      if (!t.deadline) return false;
      const d = parseISO(t.deadline);
      return isSameMonth(d, viewMonth);
    }).length;
  }, [visibleTasks, viewMonth]);

  const monthExamCount = useMemo(() => {
    return visibleExams.filter((e) =>
      isSameMonth(parseISO(e.date), viewMonth),
    ).length;
  }, [visibleExams, viewMonth]);

  const plannedMinutes = useMemo(() => {
    return visibleTasks.reduce((sum, task) => {
      if (!task.deadline || !task.estimatedMinutes) return sum;
      if (!isSameMonth(parseISO(task.deadline), viewMonth)) return sum;
      return sum + task.estimatedMinutes;
    }, 0);
  }, [visibleTasks, viewMonth]);

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
        <div className="dash-skeleton h-[28rem] rounded-[var(--surface-radius)]" />
        <div className="dash-skeleton h-64 rounded-[var(--surface-radius)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="app-page">
        <PageHeader title="Calendar" subtitle={CALENDAR_SUBTITLE} />
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
        subtitle={CALENDAR_SUBTITLE}
        action={<CalendarCreateMenu selectedDate={selectedDate} />}
      />

      {membershipsError && (
        <ReadStateNotice
          title="Task and exam creation is unavailable"
          error={membershipsLoadError}
          description="The calendar is still available, but subjects could not be loaded for new items."
          onRetry={() => void refetchMemberships()}
        />
      )}
      {!membershipsLoading &&
        !membershipsError &&
        memberships?.length === 0 && (
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Choose at least one subject before adding tasks or exams.{" "}
            <Link
              href="/settings?tab=subjects"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Open subject settings
            </Link>
          </div>
        )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <CalendarMobileStrip
          viewMonth={viewMonth}
          selectedDate={selectedDate}
          today={today}
          monthDays={monthDays}
          tasksByDate={tasksByDate}
          examsByDate={examsByDate}
          filter={calendarFilter}
          subjects={filterSubjects}
          onFilterChange={setCalendarFilter}
          onWriteCalendarState={writeCalendarState}
        />

        <MonthGrid
          viewMonth={viewMonth}
          selectedDate={selectedDate}
          today={today}
          calendarWeeks={calendarWeeks}
          tasksByDate={tasksByDate}
          examsByDate={examsByDate}
          filter={calendarFilter}
          subjects={filterSubjects}
          onFilterChange={setCalendarFilter}
          onWriteCalendarState={writeCalendarState}
        />

        <CalendarRail
          selectedDate={selectedDate}
          selectedTasks={selTasks}
          selectedExams={selExams}
          upcomingExams={upcomingExams}
          viewMonthLabel={format(viewMonth, "MMMM yyyy")}
          monthTaskCount={monthTaskCount}
          monthExamCount={monthExamCount}
          plannedMinutes={plannedMinutes}
          onWriteCalendarState={writeCalendarState}
        />
      </div>
    </div>
  );
}
