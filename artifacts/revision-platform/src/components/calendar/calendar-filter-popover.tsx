import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  EMPTY_CALENDAR_FILTER,
  isCalendarFilterActive,
  type CalendarFilter,
  type CalendarFilterSubject,
  type CalendarItemKind,
} from "./calendar-filter";

const TYPE_OPTIONS: Array<{ value: CalendarItemKind; label: string }> = [
  { value: "all", label: "All" },
  { value: "tasks", label: "Tasks" },
  { value: "exams", label: "Exams" },
];

export function CalendarFilterPopover({
  filter,
  subjects,
  onFilterChange,
  idPrefix,
}: {
  filter: CalendarFilter;
  subjects: CalendarFilterSubject[];
  onFilterChange: (filter: CalendarFilter) => void;
  idPrefix: string;
}) {
  const active = isCalendarFilterActive(filter);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-11 shrink-0 gap-1.5 px-3 text-xs",
            active && "border-primary/50 bg-primary/5 text-primary",
          )}
          aria-label={active ? "Filter calendar (filters on)" : "Filter calendar"}
        >
          <ListFilter className="h-4 w-4" strokeWidth={2} aria-hidden />
          Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 space-y-4 p-4"
        aria-label="Calendar filters"
      >
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Type
          </legend>
          <div className="flex flex-col gap-1.5">
            {TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name={`${idPrefix}-type`}
                  value={option.value}
                  checked={filter.kind === option.value}
                  onChange={() =>
                    onFilterChange({ ...filter, kind: option.value })
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Subject
          </legend>
          <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={`${idPrefix}-subject`}
                value="all"
                checked={filter.subjectId == null}
                onChange={() =>
                  onFilterChange({ ...filter, subjectId: null })
                }
              />
              All subjects
            </label>
            {subjects.map((subject) => (
              <label
                key={subject.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                name={`${idPrefix}-subject`}
                value={String(subject.id)}
                  checked={filter.subjectId === subject.id}
                  onChange={() =>
                    onFilterChange({ ...filter, subjectId: subject.id })
                  }
                />
                {subject.name}
              </label>
            ))}
          </div>
        </fieldset>

        {active && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-full"
            onClick={() => onFilterChange(EMPTY_CALENDAR_FILTER)}
          >
            Clear filters
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
