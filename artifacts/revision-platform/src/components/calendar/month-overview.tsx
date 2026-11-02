import { CalendarDays, Clock, ListChecks } from "lucide-react";
import { formatPlannedDuration } from "./format-planned";

export function MonthOverview({
  monthLabel,
  taskCount,
  examCount,
  plannedMinutes,
}: {
  monthLabel: string;
  taskCount: number;
  examCount: number;
  plannedMinutes: number;
}) {
  return (
    <section className="overflow-hidden rounded-[var(--surface-radius)] border border-border/60 bg-card p-5 shadow-[var(--elev-2)]">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        This month overview
      </h2>
      <p className="sr-only">{monthLabel}</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <OverviewStat
          icon={ListChecks}
          value={String(taskCount)}
          label="Tasks"
        />
        <OverviewStat
          icon={CalendarDays}
          value={String(examCount)}
          label="Exams"
        />
        <OverviewStat
          icon={Clock}
          value={formatPlannedDuration(plannedMinutes)}
          label="Planned"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          Tasks
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full bg-[hsl(var(--semantic-critical))]"
            aria-hidden
          />
          Exams
        </span>
      </div>
    </section>
  );
}

function OverviewStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof ListChecks;
  value: string;
  label: string;
}) {
  return (
    <div className="min-w-0" aria-label={`${value} ${label}`}>
      <span className="dash-stat-icon" aria-hidden>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <p className="mt-2 truncate text-lg font-bold tabular-nums tracking-tight">
        {value}
      </p>
      <p className="card-label mt-1">{label}</p>
    </div>
  );
}
