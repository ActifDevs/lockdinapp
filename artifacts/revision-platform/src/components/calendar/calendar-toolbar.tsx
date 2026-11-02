import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarFilterPopover } from "./calendar-filter-popover";
import type { CalendarFilter, CalendarFilterSubject } from "./calendar-filter";
import type { WriteCalendarState } from "./types";

export function CalendarToolbar({
  viewMonth,
  selectedDate,
  today,
  filter,
  subjects,
  filterIdPrefix,
  onFilterChange,
  onWriteCalendarState,
}: {
  viewMonth: Date;
  selectedDate: Date;
  today: Date;
  filter: CalendarFilter;
  subjects: CalendarFilterSubject[];
  filterIdPrefix: string;
  onFilterChange: (filter: CalendarFilter) => void;
  onWriteCalendarState: WriteCalendarState;
}) {
  const monthLabel = format(viewMonth, "MMMM yyyy");
  const goToday = () => onWriteCalendarState(today, today);
  const goPrev = () =>
    onWriteCalendarState(subMonths(viewMonth, 1), selectedDate);
  const goNext = () =>
    onWriteCalendarState(addMonths(viewMonth, 1), selectedDate);

  return (
    <div className="flex items-center gap-2 border-b px-3 py-3 sm:px-4">
      <Button
        variant="outline"
        size="sm"
        className="h-11 shrink-0 px-3 text-xs"
        onClick={goToday}
      >
        Today
      </Button>
      <div className="flex shrink-0 gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11"
          aria-label="Previous month"
          onClick={goPrev}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden strokeWidth={2} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11"
          aria-label="Next month"
          onClick={goNext}
        >
          <ChevronRight className="h-4 w-4" aria-hidden strokeWidth={2} />
        </Button>
      </div>
      <h2 className="min-w-0 flex-1 truncate text-center text-base font-semibold tracking-tight sm:text-lg">
        {monthLabel}
      </h2>
      <CalendarFilterPopover
        idPrefix={filterIdPrefix}
        filter={filter}
        subjects={subjects}
        onFilterChange={onFilterChange}
      />
    </div>
  );
}
