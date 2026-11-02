import { differenceInCalendarDays, format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { resolveSubjectAccent } from "@/lib/subject-accent";
import type { CalendarExamWithDate, WriteCalendarState } from "./types";

const PREVIEW_COUNT = 3;

export function UpcomingDeadlines({
  exams,
  onWriteCalendarState,
}: {
  exams: CalendarExamWithDate[];
  onWriteCalendarState: WriteCalendarState;
}) {
  const visible = exams.slice(0, PREVIEW_COUNT);

  return (
    <section
      id="calendar-deadlines"
      className="overflow-hidden rounded-[var(--surface-radius)] border border-border/60 bg-card shadow-[var(--elev-2)]"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Upcoming deadlines
        </h2>
        <Button variant="link" className="h-auto px-0 text-xs" asChild>
          <Link href="/study-plan">View all</Link>
        </Button>
      </div>

      {exams.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">
          No exams in the next 60 days.
        </p>
      ) : (
        <div className="flex flex-col pb-2" role="list" aria-label="Upcoming exams">
          {visible.map((exam) => {
            const diff = differenceInCalendarDays(exam._date, new Date());
            const countdown =
              diff === 0 ? "Today" : diff === 1 ? "1 day" : `${diff} days`;
            const accent = resolveSubjectAccent({
              name: exam.subjectName,
              color: exam.subjectColor,
            });
            return (
              <button
                key={exam.id}
                type="button"
                role="listitem"
                aria-label={`${exam.subjectName} ${exam.paperCode}, ${countdown} away on ${format(exam._date, "MMMM d")}. Show on calendar.`}
                className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                onClick={() => onWriteCalendarState(exam._date, exam._date)}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {exam.subjectName} {exam.paperCode}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {format(exam._date, "d MMM yyyy")}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-lg font-bold tabular-nums leading-none text-foreground">
                    {diff === 0 ? "0" : diff}
                  </span>
                  <span className="mt-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
                    {diff === 1 ? "day left" : "days left"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
