import { BookOpen, Flame, Star, Target, Trophy } from "lucide-react";
import type { Achievement } from "@/lib/dashboard-gamification";
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

function LockedMilestone({ item }: { item: Achievement }) {
  const Icon = ICONS[item.icon];
  return (
    <li
      className="dash-achievement dash-achievement-locked"
      title={item.description}
    >
      <span
        className={cn(
          "dash-achievement-icon",
          `dash-achievement-icon-${item.icon}`,
          "dash-achievement-icon-locked",
        )}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight text-muted-foreground">
          Next: {item.title}
        </p>
        <p className="sr-only">{item.description}</p>
      </div>
    </li>
  );
}

export function pickNextAchievement(
  achievements: Achievement[],
): Achievement | undefined {
  const locked = achievements.filter((item) => !item.unlocked);
  return locked.find((item) => item.id !== "daily-clear") ?? locked[0];
}

export function AchievementPanel({
  achievements,
  className,
}: AchievementPanelProps) {
  const unlocked = [
    ...achievements.filter((item) => item.unlocked && item.id !== "daily-clear"),
    ...achievements.filter((item) => item.unlocked && item.id === "daily-clear"),
  ];
  const nextUp = pickNextAchievement(achievements);

  return (
    <section
      className={cn("dash-achievements dash-quiet-card", className)}
      aria-labelledby="achievements-title"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="achievements-title" className="text-sm font-semibold tracking-[-0.01em]">
          Achievements
        </h3>
        <span className="text-xs tabular text-muted-foreground">
          {unlocked.length} of {achievements.length}
        </span>
      </div>

      {unlocked.length === 0 && !nextUp ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Milestones appear here as you log work.
        </p>
      ) : (
        <ul className="mt-2.5 space-y-0.5">
          {unlocked.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <li
                key={item.id}
                className="dash-achievement dash-achievement-unlocked"
                title={item.description}
              >
                <span
                  className={cn(
                    "dash-achievement-icon",
                    `dash-achievement-icon-${item.icon}`,
                  )}
                  aria-hidden
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium leading-tight">
                  {item.title}
                </p>
                <span className="sr-only">{item.description}. Unlocked.</span>
              </li>
            );
          })}

          {nextUp && <LockedMilestone item={nextUp} />}
        </ul>
      )}
    </section>
  );
}
