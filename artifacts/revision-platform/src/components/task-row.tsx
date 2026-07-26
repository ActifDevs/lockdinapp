import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Clock } from "lucide-react";
import { resolveSubjectAccent } from "@/lib/subject-accent";
import { cn } from "@/lib/utils";
import type { Task } from "@workspace/api-client-react";

export function TaskRow({
  task,
  onToggle,
  disabled,
  trailing,
}: {
  task: Task;
  onToggle: () => void;
  disabled?: boolean;
  trailing?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const accent = resolveSubjectAccent({
    name: task.subjectName,
    color: task.subjectColor,
  });

  return (
    <motion.div
      layout={!reduceMotion}
      initial={false}
      animate={{ opacity: task.completed ? 0.6 : 1 }}
      transition={{ duration: 0.2 }}
      className="list-row group flex items-center gap-3.5"
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          "task-check",
          task.completed && "task-check-done",
        )}
        aria-label={
          task.completed
            ? `Mark "${task.title}" as incomplete`
            : `Mark "${task.title}" as complete`
        }
        aria-pressed={task.completed}
      >
        <motion.span
          initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: task.completed ? 1 : 0.4, opacity: task.completed ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 520, damping: 26 }}
          aria-hidden
        >
          <Check className="h-[15px] w-[15px]" strokeWidth={3} />
        </motion.span>
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-semibold leading-snug tracking-[-0.005em]",
            task.completed && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: accent }}
              aria-hidden
            />
            {task.subjectName}
          </span>

          {task.estimatedMinutes && (
            <>
              <span aria-hidden className="text-muted-foreground/40">
                ·
              </span>
              <span className="inline-flex items-center gap-1 tabular">
                <Clock className="h-3 w-3" aria-hidden strokeWidth={2} />
                {task.estimatedMinutes}m
              </span>
            </>
          )}

          {task.topicTitle && (
            <>
              <span aria-hidden className="text-muted-foreground/40">
                ·
              </span>
              <span className="max-w-[220px] truncate">{task.topicTitle}</span>
            </>
          )}

          {task.priority === "high" && !task.completed && (
            <span className="task-flag">Priority</span>
          )}
        </div>
      </div>

      {trailing}
    </motion.div>
  );
}
