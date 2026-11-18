import type { ExamDate, Task } from "@workspace/api-client-react";
import {
  buildWhatsNextItems,
  localDateKey,
  type WhatsNextItem,
} from "@/lib/upcoming-next";
import { resolveSubjectAccent } from "@/lib/subject-accent";
import { cn } from "@/lib/utils";

function KindLabel({ kind }: { kind: WhatsNextItem["kind"] }) {
  return (
    <span
      className={cn(
        "dash-chip shrink-0",
        kind === "exam" ? "dash-chip-exam" : "dash-chip-deadline",
      )}
    >
      {kind === "exam" ? "Exam" : "Deadline"}
    </span>
  );
}

export function WhatsNextPanel({
  deadlines,
  exams,
}: {
  deadlines: Task[];
  exams: ExamDate[];
}) {
  const items = buildWhatsNextItems(deadlines, exams, localDateKey());

  return (
    <div className="dash-next-panel">
      {items.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Nothing scheduled after today. Add due dates in the study plan or exam
          sittings on the calendar.
        </p>
      ) : (
        <ul className="dash-next-list">
          {items.map((item) => {
            const accent = resolveSubjectAccent({
              name: item.detail,
              color: item.subjectColor,
            });
            return (
              <li key={item.id} className="dash-next-row">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <KindLabel kind={item.kind} />
                    <p className="truncate text-sm font-semibold leading-tight">
                      {item.title}
                    </p>
                  </div>
                  {item.kind === "deadline" && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {item.detail}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "dash-chip shrink-0 tabular",
                    item.whenLabel === "Tomorrow" && "dash-chip-urgent",
                  )}
                >
                  {item.whenLabel}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
