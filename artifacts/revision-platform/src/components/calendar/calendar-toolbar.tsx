import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WriteCalendarState } from "./types";

export function CalendarToolbar({
  variant,
  viewMonth,
  selectedDate,
  today,
  monthTaskCount,
  monthExamCount,
  onWriteCalendarState,
}: {
  variant: "mobile" | "desktop";
  viewMonth: Date;
  selectedDate: Date;
  today: Date;
  monthTaskCount: number;
  monthExamCount: number;
  onWriteCalendarState: WriteCalendarState;
}) {
  const monthLabel = format(viewMonth, "MMMM yyyy");
  const goToday = () => onWriteCalendarState(today, today);
  const goPrev = () =>
    onWriteCalendarState(subMonths(viewMonth, 1), selectedDate);
  const goNext = () =>
    onWriteCalendarState(addMonths(viewMonth, 1), selectedDate);

  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-3 border-b px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-[-0.01em]">{monthLabel}</h2>
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
            onClick={goToday}
          >
            Today
          </Button>
          <MonthStepper onPrev={goPrev} onNext={goNext} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">{monthLabel}</h2>
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
          onClick={goToday}
        >
          Today
        </Button>
        <MonthStepper onPrev={goPrev} onNext={goNext} />
      </div>
    </div>
  );
}

function MonthStepper({
  onPrev,
  onNext,
}: {
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex">
      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11 rounded-r-none border-r-0"
        aria-label="Previous month"
        onClick={onPrev}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden strokeWidth={2} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11 rounded-l-none"
        aria-label="Next month"
        onClick={onNext}
      >
        <ChevronRight className="h-4 w-4" aria-hidden strokeWidth={2} />
      </Button>
    </div>
  );
}
