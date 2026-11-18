import type { CSSProperties } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  CalendarClock,
  Clock,
  Flame,
  Play,
  Sparkles,
  Zap,
} from "lucide-react";
import type { Task } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TaskRow } from "@/components/task-row";
import { RichEmptyState } from "@/components/rich-empty-state";
import { format } from "date-fns";
import { streakEncouragement } from "@/components/dashboard/gamification-rail";
import { computeLevel } from "@/lib/dashboard-gamification";
import { priorityDifficulty, subjectMark } from "@/lib/subject-mark";
import { resolveSubjectAccent } from "@/lib/subject-accent";
import { cn } from "@/lib/utils";

export type MissionFocusSession = {
  subjectName: string;
  subjectColor: string;
  topic: string;
  estimatedMinutes: number | null;
  priority: "low" | "medium" | "high";
};

type TodaysMissionProps = {
  greeting: string;
  displayName: string;
  missionFocus: string;
  motivational: string;
  tasks: Task[];
  completed: number;
  total: number;
  rewardXp: number;
  todayXp: number;
  streak: number;
  longestStreak: number;
  level: ReturnType<typeof computeLevel>;
  daysToExam: number | null;
  examLabel: string | null;
  focusSession: MissionFocusSession | null;
  onToggle: (taskId: number, completed: boolean) => void;
  toggling: boolean;
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

function DifficultyDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="dash-mission-diff" aria-label={`Difficulty ${level} of 3`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn("dash-mission-diff-dot", n <= level && "dash-mission-diff-dot-on")}
          aria-hidden
        />
      ))}
    </span>
  );
}

function primaryAction(hasMission: boolean, remaining: number) {
  if (!hasMission) {
    return {
      href: "/study-plan",
      label: "Create today's mission",
      icon: "play" as const,
    };
  }
  if (remaining > 0) {
    return {
      href: "#todays-mission-tasks",
      label: "Start session",
      icon: "play" as const,
    };
  }
  return {
    href: "/study-plan",
    label: "Review mission",
    icon: "arrow" as const,
  };
}

export function TodaysMission({
  greeting,
  displayName,
  missionFocus,
  motivational,
  tasks,
  completed,
  total,
  rewardXp,
  todayXp,
  streak,
  longestStreak,
  level,
  daysToExam,
  examLabel,
  focusSession,
  onToggle,
  toggling,
}: TodaysMissionProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = Math.max(0, total - completed);
  const estimatedMinutes = tasks
    .filter((t) => !t.completed)
    .reduce((s, t) => s + (t.estimatedMinutes ?? 45), 0);
  const hasMission = total > 0;
  const allDone = hasMission && remaining === 0;
  const cta = primaryAction(hasMission, remaining);
  const xpLabel =
    todayXp > 0
      ? `+${todayXp} XP`
      : rewardXp > 0
        ? `+${rewardXp} XP`
        : null;
  const accent = focusSession
    ? resolveSubjectAccent({
        name: focusSession.subjectName,
        color: focusSession.subjectColor,
      })
    : undefined;
  const Mark = focusSession ? subjectMark(focusSession.subjectName) : null;
  const difficulty = focusSession
    ? priorityDifficulty(focusSession.priority)
    : 1;

  return (
    <section
      id="todays-mission"
      className="dash-mission scroll-mt-6"
      aria-labelledby="todays-mission-title"
    >
      <div className="dash-mission-top">
        <div className="min-w-0">
          <p className="dash-mission-greeting">
            {greeting}, {displayName}
            <span className="dash-mission-date">
              {format(new Date(), "EEEE d MMMM")}
            </span>
          </p>
          <h1
            id="todays-mission-title"
            className="dash-mission-title"
          >
            Today&apos;s mission
          </h1>
          <p className="dash-mission-focus-line">{missionFocus}</p>
          <p className="dash-mission-lede">{motivational}</p>
        </div>

        <div className="dash-mission-cta-wrap">
          <Button
            asChild
            size="lg"
            className="dash-mission-cta h-11 px-5 text-sm font-bold"
            data-mission-cta="primary"
          >
            {cta.href.startsWith("#") ? (
              <a href={cta.href}>
                <Play className="h-4 w-4" aria-hidden strokeWidth={2} />
                {cta.label}
              </a>
            ) : (
              <Link href={cta.href}>
                {cta.icon === "play" ? (
                  <Play className="h-4 w-4" aria-hidden strokeWidth={2} />
                ) : (
                  <ArrowRight className="h-4 w-4" aria-hidden strokeWidth={2} />
                )}
                {cta.label}
              </Link>
            )}
          </Button>
        </div>
      </div>

      <ul className="dash-mission-chips" aria-label="Mission stats">
        <li className={cn("dash-chip", streak > 0 && "dash-chip-streak")}>
          <Flame
            className={cn("h-3.5 w-3.5", streak >= 3 && "dash-flame-icon")}
            aria-hidden
            strokeWidth={2}
          />
          <span>
            Streak {streak}
            {streak === 1 ? " day" : " days"}
            {longestStreak > 0 && longestStreak !== streak
              ? ` · best ${longestStreak}`
              : ""}
          </span>
        </li>
        {xpLabel && (
          <li className="dash-chip dash-chip-primary tabular">
            <Zap className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
            {xpLabel}
          </li>
        )}
        <li className="dash-chip tabular">
          Level {level.level}
          <span className="text-muted-foreground"> · {level.title}</span>
        </li>
        {daysToExam !== null && (
          <li className="dash-chip">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
            <span className="truncate">
              Exam in {daysToExam}d
              {examLabel ? ` · ${examLabel.split(" · ")[0]}` : ""}
            </span>
          </li>
        )}
        {allDone && (
          <li className="dash-chip dash-chip-complete">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Mission complete
          </li>
        )}
      </ul>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {streakEncouragement(streak)}
      </p>

      {hasMission && (
        <div className="dash-mission-progress">
          <div className="flex items-baseline justify-between gap-3">
            <p className="card-label">
              {allDone ? "Mission clear" : "Progress"}
            </p>
            <p
              className={cn(
                "text-sm font-bold tabular",
                allDone ? "dash-mission-pct-complete" : "dash-mission-pct",
              )}
            >
              {completed}/{total}
              <span className="ml-1.5 font-semibold text-muted-foreground">
                · {pct}%
              </span>
            </p>
          </div>
          <Progress
            value={pct}
            complete={allDone}
            className="mt-2.5 h-2"
            aria-label="Today's mission progress"
          />
          {estimatedMinutes > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
              About {formatDuration(estimatedMinutes)} of focused work left
            </p>
          )}
        </div>
      )}

      <div className={cn("dash-mission-body", focusSession && Mark && "dash-mission-body-split")}>
        <div className="min-w-0">
          {tasks.length === 0 ? (
            <RichEmptyState
              scene="tasks"
              title="Ready to make progress?"
              description="Plan your first study block. Every completed session earns XP, protects your streak, and improves your predicted grade."
              variant="purple"
              className="py-6"
            />
          ) : (
            <>
              <div id="todays-mission-tasks" className="dash-mission-tasks">
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    disabled={toggling}
                    onToggle={() => onToggle(task.id, task.completed)}
                  />
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <Link href="/study-plan" className="section-link">
                  Edit mission
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
                </Link>
              </div>
            </>
          )}
        </div>

        {focusSession && Mark && (
          <aside
            className="dash-mission-session"
            aria-label="Today's focus session"
            style={{ "--focus-accent": accent } as CSSProperties}
          >
            <p className="card-label">Today&apos;s focus</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="dash-mission-session-mark" aria-hidden>
                <Mark className="h-4 w-4" strokeWidth={2} />
              </span>
              <p className="truncate text-sm font-bold">{focusSession.subjectName}</p>
            </div>
            <p className="mt-1.5 text-sm font-semibold leading-snug tracking-[-0.01em]">
              {focusSession.topic}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {focusSession.estimatedMinutes != null && (
                <span className="dash-chip">
                  <Clock className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
                  {focusSession.estimatedMinutes} mins
                </span>
              )}
              <span className="dash-chip">
                Difficulty
                <DifficultyDots level={difficulty} />
              </span>
            </div>
          </aside>
        )}
      </div>

      <p className="estimate-label mt-4">
        XP, levels and streaks are motivation estimates from your logged tasks and syllabus
        progress, not official Cambridge grades.
      </p>
    </section>
  );
}
