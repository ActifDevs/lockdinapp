import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, Check, Flame, Star, Target, Trophy } from "lucide-react";
import type { Achievement } from "@/lib/dashboard-gamification";
import { entranceProps } from "@/hooks/use-entrance";
import { cn } from "@/lib/utils";

const ICONS = {
  trophy: Trophy,
  flame: Flame,
  book: BookOpen,
  target: Target,
  star: Star,
} as const;

type AchievementPanelProps = {
  achievements: Achievement[];
  className?: string;
};

export function AchievementPanel({ achievements, className }: AchievementPanelProps) {
  const reduceMotion = useReducedMotion();
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);
  const pct = achievements.length > 0 ? (unlocked.length / achievements.length) * 100 : 0;
  const nextUp = locked.slice(0, Math.max(1, 5 - unlocked.length));

  return (
    <section className={cn("dash-achievements", className)} aria-labelledby="achievements-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="achievements-title" className="text-base font-bold tracking-[-0.01em]">
            Achievements
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Milestones from your logged work</p>
        </div>
        <span className="dash-chip dash-chip-gold tabular">
          {unlocked.length} of {achievements.length}
        </span>
      </div>

      <div
        className="dash-meter dash-meter-sm mt-3.5"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Achievements unlocked"
      >
        <div
          className={cn("dash-meter-fill", pct >= 100 && "dash-meter-fill-complete")}
          style={{ width: `${pct}%` }}
          data-complete={pct >= 100 ? "true" : undefined}
        />
      </div>

      <ul className="mt-4 space-y-1.5">
        {unlocked.map((item, index) => {
          const Icon = ICONS[item.icon];
          const entrance = entranceProps(reduceMotion, index, { y: 4, maxDelay: 0.12, duration: 0.22 });
          return (
            <motion.li
              key={item.id}
              className="dash-achievement dash-achievement-unlocked"
              initial={entrance.initial}
              animate={entrance.animate}
              transition={entrance.transition}
            >
              <span
                className={cn("dash-achievement-icon", `dash-achievement-icon-${item.icon}`)}
                aria-hidden
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">{item.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <Check
                className="dash-achievement-check h-4 w-4 shrink-0"
                aria-label="Unlocked"
                strokeWidth={2.5}
              />
            </motion.li>
          );
        })}

        {nextUp.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <li key={item.id} className="dash-achievement dash-achievement-locked">
              <span
                className={cn(
                  "dash-achievement-icon",
                  `dash-achievement-icon-${item.icon}`,
                  "dash-achievement-icon-locked",
                )}
                aria-hidden
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight text-muted-foreground">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground/75">
                  {item.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
