import { format, isToday } from "date-fns";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { ExamDate, Task } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichEmptyState } from "@/components/rich-empty-state";
import { cn } from "@/lib/utils";
import { resolveSubjectAccent } from "@/lib/subject-accent";

export function TodayPanel({
  selectedDate,
  tasks,
  exams,
}: {
  selectedDate: Date;
  tasks: Task[];
  exams: ExamDate[];
}) {
  const today = isToday(selectedDate);
  const heading = `${today ? "Today" : format(selectedDate, "EEEE")} · ${format(selectedDate, "d MMMM yyyy")}`;
  const emptyTitle = today ? "Nothing planned for today" : "Nothing planned";

  const focusAgenda = () => {
    const panel = document.getElementById("calendar-agenda");
    const items = document.getElementById("calendar-agenda-items");
    panel?.scrollIntoView({ block: "nearest" });
    items?.focus();
  };

  return (
    <section
      id="calendar-agenda"
      tabIndex={-1}
      aria-labelledby="calendar-agenda-heading"
      className="overflow-hidden rounded-[var(--surface-radius)] border border-border/60 bg-card shadow-[var(--elev-2)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <h2
          id="calendar-agenda-heading"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {heading}
        </h2>
        <Button
          variant="link"
          className="h-auto px-0 text-xs"
          onClick={focusAgenda}
        >
          View agenda
        </Button>
      </div>

      <div
        id="calendar-agenda-items"
        tabIndex={-1}
        className="outline-none"
      >
        {exams.length === 0 && tasks.length === 0 ? (
          <RichEmptyState
            scene="calendar"
            title={emptyTitle}
            description="Rest, catch up, or add a task to stay on track."
            actionHref="/study-plan"
            actionLabel="Open study plan"
            variant="mint"
            className="px-4 py-6"
          />
        ) : (
          <div className="max-h-[320px] divide-y overflow-y-auto">
            {exams.map((exam) => (
              <div key={`exam-${exam.id}`} className="p-4 pastel-pink">
                <div className="mb-1.5 flex items-center gap-2">
                  <AlertCircle
                    className="h-3.5 w-3.5 flex-shrink-0 text-[hsl(var(--semantic-critical))]"
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
                <p className="break-words text-sm font-semibold text-foreground">
                  {exam.paperCode}
                </p>
                {exam.notes && (
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    {exam.notes}
                  </p>
                )}
              </div>
            ))}

            {tasks.map((task) => {
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
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none"
                          style={{
                            backgroundColor: `${accent}20`,
                            color: accent,
                          }}
                        >
                          {task.subjectName}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium capitalize leading-none",
                            task.priority === "high" &&
                              "bg-[hsl(var(--semantic-critical)/0.12)] text-[hsl(var(--semantic-critical))]",
                            task.priority === "medium" &&
                              "bg-[hsl(var(--semantic-attention)/0.12)] text-[hsl(var(--semantic-attention))]",
                            task.priority === "low" &&
                              "bg-muted text-muted-foreground",
                          )}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "break-words text-sm font-medium leading-snug",
                          task.completed &&
                            "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </p>
                      {task.topicTitle && (
                        <p className="mt-1 break-words text-xs text-muted-foreground">
                          {task.topicTitle}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      {task.completed ? (
                        <CheckCircle2
                          className="h-4 w-4 text-[hsl(var(--semantic-complete))]"
                          strokeWidth={2}
                        />
                      ) : null}
                      {task.estimatedMinutes && (
                        <span className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
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
    </section>
  );
}
