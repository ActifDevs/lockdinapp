import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Clock, Sparkles, Swords, Zap } from "lucide-react";
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

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

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
    <section
      id="todays-mission"
      className="dash-mission scroll-mt-6"
      aria-labelledby="todays-mission-title"
    >
      <div className="dash-mission-header">
        <div className="flex items-start gap-3.5">
          <span className="dash-mission-icon" aria-hidden>
            <Swords className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <div>
            <h2
              id="todays-mission-title"
              className="text-xl font-bold leading-tight tracking-[-0.02em]"
            >
              Today&apos;s mission
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {allDone
                ? "Everything cleared. Your streak is safe for today."
                : "Clear these to earn XP and keep your streak alive."}
            </p>
          </div>
        </div>

        {allDone ? (
          <motion.span
            initial={reduceMotion ? false : { scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="dash-chip dash-chip-complete dash-chip-lg"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Mission complete
          </motion.span>
        ) : (
          rewardXp > 0 && (
            <span className="dash-chip dash-chip-primary dash-chip-lg tabular">
              <Zap className="h-3.5 w-3.5" aria-hidden />
              +{rewardXp} XP on offer
            </span>
          )
        )}
      </div>

      {total > 0 && (
        <div className="dash-mission-progress">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="card-label">Progress</p>
              <p className="mt-2 text-2xl font-bold leading-none tracking-[-0.02em] tabular">
                {completed}
                <span className="text-base font-semibold text-muted-foreground">
                  /{total} done
                </span>
              </p>
            </div>
            <p
              className={cn(
                "text-2xl font-bold leading-none tracking-[-0.02em] tabular",
                allDone ? "dash-mission-pct-complete" : "dash-mission-pct",
              )}
            >
              {pct}%
            </p>
          </div>

          <Progress
            value={pct}
            complete={allDone}
            className="mt-3.5 h-2.5"
            aria-label="Today's mission progress"
          />

          {estimatedMinutes > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
              About {formatDuration(estimatedMinutes)} of focused work left
            </p>
          )}
        </div>
      )}

      {tasks.length === 0 ? (
        <RichEmptyState
          scene="tasks"
          title="Ready to make progress?"
          description="Plan your first study block. Every completed session earns XP, protects your streak, and improves your predicted grade."
          actionLabel="Create today's mission"
          actionHref="/study-plan"
          variant="purple"
          className="py-10"
        />
      ) : (
        <>
          <div className="dash-mission-tasks">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                disabled={toggling}
                onToggle={() => onToggle(task.id, task.completed)}
              />
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Link href="/study-plan" className="section-link">
              Edit mission
              <ArrowRight className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
