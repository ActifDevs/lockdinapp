import { differenceInCalendarDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { resolveSubjectAccent } from "@/lib/subject-accent";
import type { CalendarExamWithDate, WriteCalendarState } from "./types";

export function UpcomingExamStrip({
  exams,
  onWriteCalendarState,
}: {
  exams: CalendarExamWithDate[];
  onWriteCalendarState: WriteCalendarState;
}) {
  if (exams.length === 0) return null;

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-1 no-scrollbar"
      role="list"
      aria-label="Upcoming exams"
    >
      {exams.slice(0, 5).map((exam) => {
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
              onWriteCalendarState(exam._date, exam._date);
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
              <div className="mt-0.5 text-xs opacity-75">{exam.paperCode}</div>
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
  );
}
