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

export function AchievementPanel({ achievements, className }: AchievementPanelProps) {
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  return (
    <div className={cn("dash-achievements", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Achievements</h2>
          <p className="text-xs text-muted-foreground">
            {unlocked.length} of {achievements.length} unlocked · based on your activity
          </p>
        </div>
        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold tabular text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {unlocked.length} earned
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {unlocked.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <div key={item.id} className="dash-achievement dash-achievement-unlocked">
              <div className="dash-achievement-icon">
                <Icon className="h-4 w-4" aria-hidden strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          );
        })}
        {locked.slice(0, 3).map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <div key={item.id} className={cn("dash-achievement", "opacity-55")}>
              <div className="dash-achievement-icon dash-achievement-icon-locked">
                <Icon className="h-4 w-4" aria-hidden strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
