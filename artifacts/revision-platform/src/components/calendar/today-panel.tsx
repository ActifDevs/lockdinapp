import { format, isToday } from "date-fns";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { ExamDate, Task } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
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
  return (
    <div className="flex flex-col gap-4 md:col-span-1 xl:col-span-1">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--elev-2)] md:sticky md:top-6">
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

        <div className="overflow-y-auto max-h-[520px]">
          {exams.length === 0 && tasks.length === 0 ? (
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
              {exams.map((exam) => (
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
  );
}
