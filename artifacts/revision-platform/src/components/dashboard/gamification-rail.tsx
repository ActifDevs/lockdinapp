import { motion, useReducedMotion } from "framer-motion";
import { Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type LevelInfo = {
  level: number;
  title: string;
  xpInLevel: number;
  xpToNext: number;
  progressPct: number;
};

type GamificationRailProps = {
  streak: number;
  todayXp: number;
  level: LevelInfo;
};

function streakEncouragement(streak: number): string {
  if (streak === 0) return "Finish one task today to open your streak.";
  if (streak === 1) return "Day one down. Show up tomorrow to make it two.";
  if (streak >= 7) return `${streak} days of momentum. This is what top grades look like.`;
  return `Study tomorrow to reach ${streak + 1} days in a row.`;
}

export function GamificationRail({ streak, todayXp, level }: GamificationRailProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="dash-stat-card">
          <div className="flex items-center gap-3">
            <span
              className={cn("dash-stat-icon", streak > 0 && "dash-stat-icon-active")}
              aria-hidden
            >
              <Flame
                className={cn("h-4 w-4", streak >= 3 && "dash-flame-icon")}
                strokeWidth={2}
              />
            </span>
            <p className="card-label flex-1">Study streak</p>
            {streak >= 7 && <span className="dash-chip dash-chip-streak">On fire</span>}
          </div>

          <p className="mt-3 flex items-baseline gap-1.5">
            <span className={cn("stat-value", streak > 0 && "dash-stat-value-streak")}>
              {streak}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {streak === 1 ? "day" : "days"}
            </span>
          </p>

          <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
            {streakEncouragement(streak)}
          </p>
        </div>

        <div className="dash-stat-card">
          <div className="flex items-center gap-3">
            <span className="dash-stat-icon dash-stat-icon-primary" aria-hidden>
              <Zap className="h-4 w-4" strokeWidth={2} />
            </span>
            <p className="card-label flex-1">Earned today</p>
          </div>

          <p className="mt-3 flex items-baseline gap-1.5">
            <motion.span
              key={todayXp}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="stat-value dash-stat-value-xp"
            >
              +{todayXp}
            </motion.span>
            <span className="text-sm font-medium text-muted-foreground">XP</span>
          </p>

          <div className="mt-4">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-[0.8125rem] font-semibold">
                Level {level.level}
                <span className="font-medium text-muted-foreground"> · {level.title}</span>
              </span>
              <span className="text-[11px] font-medium tabular text-muted-foreground">
                {level.xpToNext} to go
              </span>
            </div>
            <div
              className="dash-meter"
              role="progressbar"
              aria-valuenow={level.progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Level ${level.level} progress`}
            >
              <motion.div
                className="dash-meter-fill dash-meter-fill-xp"
                initial={false}
                animate={{ width: `${level.progressPct}%` }}
                transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </div>
      </div>

      <p className="estimate-label">
        XP, levels and streaks are motivation estimates from your logged tasks and syllabus
        progress, not official Cambridge grades.
      </p>
    </div>
  );
}
