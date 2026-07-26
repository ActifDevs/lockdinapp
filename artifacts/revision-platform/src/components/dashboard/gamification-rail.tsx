import { motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";
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

export function GamificationRail({ streak, todayXp, level }: GamificationRailProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-2">
      <p className="estimate-label px-0.5">
        Motivation metrics — estimated from your tasks and syllabus progress, not official grades.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="dash-stat-card dash-stat-streak">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-orange-800/80 dark:text-orange-200/80">
                Study streak
              </p>
              <p className="mt-2 flex items-center gap-2">
                <Flame className={cn("h-6 w-6 text-orange-500", streak >= 3 && "dash-flame-icon")} aria-hidden />
                <span className="text-3xl font-bold tabular tracking-tight">{streak}</span>
                <span className="text-sm font-medium text-muted-foreground">days</span>
              </p>
            </div>
            {streak >= 7 && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                On fire
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Come back tomorrow to protect your streak.</p>
        </div>

        <div className="dash-stat-card dash-stat-xp">
          <p className="text-xs font-medium text-primary/80">Today&apos;s XP</p>
          <p className="mt-2 flex items-baseline gap-2">
            <motion.span
              key={todayXp}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold tabular tracking-tight text-primary"
            >
              +{todayXp}
            </motion.span>
            <span className="text-sm font-medium text-muted-foreground">XP</span>
          </p>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>Level {level.level} · {level.title}</span>
              <span className="tabular">{level.xpToNext} to next</span>
            </div>
            <div className="dash-xp-track">
              <motion.div
                className="dash-xp-fill"
                initial={false}
                animate={{ width: `${level.progressPct}%` }}
                transition={{ duration: reduceMotion ? 0 : 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
