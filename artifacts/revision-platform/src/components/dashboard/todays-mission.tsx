import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Clock, Sparkles, Swords, Zap } from "lucide-react";
import type { Task } from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";
import { TaskRow } from "@/components/task-row";
import { RichEmptyState } from "@/components/rich-empty-state";
import { cn } from "@/lib/utils";

type TodaysMissionProps = {
  tasks: Task[];
  completed: number;
  total: number;
  rewardXp: number;
  onToggle: (taskId: number, completed: boolean) => void;
  toggling: boolean;
};

export function TodaysMission({
  tasks,
  completed,
  total,
  rewardXp,
  onToggle,
  toggling,
}: TodaysMissionProps) {
  const reduceMotion = useReducedMotion();
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const estimatedMinutes = tasks
    .filter((t) => !t.completed)
    .reduce((s, t) => s + (t.estimatedMinutes ?? 45), 0);
  const allDone = total > 0 && completed === total;

  return (
    <div className="dash-mission">
      <div className="dash-mission-header flex-col items-stretch sm:flex-row sm:items-start">
        <div className="flex items-center gap-3">
          <div className="dash-mission-icon">
            <Swords className="h-5 w-5" aria-hidden strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Today&apos;s mission</h2>
            <p className="text-sm text-muted-foreground">Complete tasks to earn XP and protect your streak</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-muted-foreground">Reward</p>
          <p className="flex items-center justify-end gap-1 text-lg font-extrabold tabular text-primary">
            <Zap className="h-4 w-4" aria-hidden />
            +{rewardXp} XP
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span className="text-muted-foreground">Estimated:</span>
          <span className="tabular">
            {estimatedMinutes >= 60
              ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
              : `${estimatedMinutes}m`}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-muted-foreground">Progress:</span>
          <span className="tabular">
            {completed}/{total}
          </span>
        </div>
        {allDone && (
          <motion.span
            initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="dash-chip dash-chip-gold inline-flex items-center gap-1"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Mission complete
          </motion.span>
        )}
      </div>

      <Progress value={pct} className="mt-4 h-2.5" />

      <div className="mt-4">
        {tasks.length === 0 ? (
          <RichEmptyState
            scene="tasks"
            title="No mission tasks yet"
            description="Add focused revision blocks to your study plan — each one moves you closer to an A."
            actionLabel="Build today's mission"
            actionHref="/study-plan"
            variant="purple"
            className="py-10"
          />
        ) : (
          <div className="list-divider rounded-xl border border-border/50 bg-background/50">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                disabled={toggling}
                onToggle={() => onToggle(task.id, task.completed)}
              />
            ))}
          </div>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="mt-4 flex justify-end">
          <Link href="/study-plan" className={cn("text-sm font-semibold text-primary hover:underline")}>
            Edit mission →
          </Link>
        </div>
      )}
    </div>
  );
}
