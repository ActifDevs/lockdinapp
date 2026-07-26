import { Link } from "wouter";
import { ChevronRight, Flame, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type DashboardHeroProps = {
  greeting: string;
  displayName: string;
  missionFocus: string;
  motivational: string;
  streak: number;
  longestStreak: number;
  daysToExam: number | null;
  examLabel: string | null;
  tasksRemaining: number;
};

export function DashboardHero({
  greeting,
  displayName,
  missionFocus,
  motivational,
  streak,
  longestStreak,
  daysToExam,
  examLabel,
  tasksRemaining,
}: DashboardHeroProps) {
  return (
    <section className="dash-hero">
      <div className="dash-hero-glow dash-hero-glow-a" aria-hidden />
      <div className="dash-hero-glow dash-hero-glow-b" aria-hidden />

      <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-white/80">
              {greeting}, {displayName}
            </p>
            {daysToExam !== null && (
              <p className="mt-2 text-lg font-medium text-white/90">
                You&apos;re{" "}
                <span className="text-2xl font-extrabold tabular text-white">{daysToExam}</span>{" "}
                days from your exams
              </p>
            )}
          </div>

          <div className="dash-hero-mission">
            <p className="flex items-center gap-2 text-xs font-medium text-white/70">
              <Target className="h-3.5 w-3.5" aria-hidden />
              Your mission today
            </p>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
              {missionFocus}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85">{motivational}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className={cn("dash-pill", streak >= 7 && "dash-pill-flame")}>
              <Flame className={cn("h-4 w-4", streak >= 3 && "dash-flame-icon")} aria-hidden />
              <span className="font-bold tabular">{streak}</span>
              <span>day streak</span>
            </div>
            {longestStreak > 0 && (
              <div className="dash-pill dash-pill-muted">
                Longest: <span className="font-bold tabular">{longestStreak}</span> days
              </div>
            )}
            {examLabel && (
              <div className="dash-pill dash-pill-muted">
                <Sparkles className="h-4 w-4" aria-hidden />
                {examLabel}
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-col">
          <Button asChild size="lg" variant="secondary" className="cta-on-brand h-12 w-full px-6 text-base font-bold sm:w-auto lg:w-full">
            <Link href="/study-plan">
              {tasksRemaining > 0 ? "Start mission" : "Plan tomorrow"}
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="hero-band-outline-btn h-12 w-full border-0 px-6 text-base font-semibold shadow-none hover:shadow-none sm:w-auto lg:w-full"
          >
            <Link href="/past-papers">Log a paper</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function formatExamChip(date: string, paperCode: string, daysAway: number): string {
  return `${paperCode} · ${format(new Date(date), "MMM d")} · ${daysAway}d`;
}
