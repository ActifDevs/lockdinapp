import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  return (
    <motion.div
      layout={!reduceMotion}
      initial={false}
      animate={{ opacity: task.completed ? 0.65 : 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "list-row group flex items-start gap-3 border-l-4 pl-4 pr-4",
        task.completed && "opacity-70",
      )}
      style={{ borderLeftColor: task.subjectColor }}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-muted/70 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
        aria-pressed={task.completed}
      >
        <motion.span
          key={task.completed ? "done" : "open"}
          initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
        >
          {task.completed ? (
            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden strokeWidth={1.75} />
          ) : (
            <Circle className="h-5 w-5" aria-hidden strokeWidth={1.75} />
          )}
        </motion.span>
      </button>
      <div className="min-w-0 flex-1 pt-2.5">
        <p
          className={cn(
            "text-sm font-medium leading-snug sm:truncate",
            task.completed && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {task.estimatedMinutes && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden strokeWidth={1.75} /> {task.estimatedMinutes}m
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="h-6 rounded-full border-0 px-2.5 text-[10px] font-medium"
            style={{ backgroundColor: `${task.subjectColor}18`, color: task.subjectColor }}
          >
            {task.subjectName}
          </Badge>
          {task.priority === "high" && (
            <Badge variant="destructive" className="h-6 rounded-full px-2 text-[10px] uppercase tracking-wide">
              High
            </Badge>
          )}
          {task.topicTitle && (
            <span className="max-w-[200px] truncate text-xs text-muted-foreground">{task.topicTitle}</span>
          )}
        </div>
      </div>
      {trailing}
    </motion.div>
  );
}
