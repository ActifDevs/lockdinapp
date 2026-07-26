import type { CSSProperties } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarClock, ChevronRight, Clock, Flame, ListChecks, Play, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { priorityDifficulty, subjectMark } from "@/lib/subject-mark";
import { resolveSubjectAccent } from "@/lib/subject-accent";
import { cn } from "@/lib/utils";

export type HeroFocusSession = {
  subjectName: string;
  subjectColor: string;
  topic: string;
  estimatedMinutes: number | null;
  priority: "low" | "medium" | "high";
};

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
  todayCompleted: number;
  todayTotal: number;
  todayPct: number;
  focusSession: HeroFocusSession | null;
};

function DifficultyDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="dash-hero-focus-diff" aria-label={`Difficulty ${level} of 3`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn("dash-hero-focus-dot", n <= level && "dash-hero-focus-dot-on")}
          aria-hidden
        />
      ))}
    </span>
  );
}

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
  todayCompleted,
  todayTotal,
  todayPct,
  focusSession,
}: DashboardHeroProps) {
  const reduceMotion = useReducedMotion();
  const remaining = Math.max(0, tasksRemaining);
  const showCountdown = daysToExam !== null;
  const hasMission = todayTotal > 0;
  const missionClear = hasMission && remaining === 0;

  const accent = focusSession
    ? resolveSubjectAccent({
        name: focusSession.subjectName,
        color: focusSession.subjectColor,
      })
    : undefined;
  const Mark = focusSession ? subjectMark(focusSession.subjectName) : null;
  const difficulty = focusSession ? priorityDifficulty(focusSession.priority) : 1;

  return (
    <motion.section
      className="dash-hero"
      aria-labelledby="dash-hero-title"
      initial={reduceMotion ? false : { opacity: 0, transform: "translateY(6px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="dash-hero-body">
        <div className="dash-hero-main">
          <p className="dash-hero-greeting">
            {greeting}, {displayName}
          </p>

          <p className="dash-hero-kicker">Today&apos;s mission</p>
          <h1 id="dash-hero-title" className="dash-hero-title">
            {missionFocus}
          </h1>
          <p className="dash-hero-lede">{motivational}</p>

          {hasMission && (
            <div
              className="dash-hero-pulse dash-hero-pulse-inline"
              role="progressbar"
              aria-valuenow={todayPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Today's mission progress"
            >
              <div className="dash-hero-pulse-row">
                <p className="dash-hero-pulse-label">
                  {missionClear ? "Mission clear" : "Mission progress"}
                </p>
                <p className="dash-hero-pulse-value tabular">
                  {todayCompleted}
                  <span className="dash-hero-pulse-total">/{todayTotal}</span>
                  <span className="dash-hero-pulse-pct tabular"> · {todayPct}%</span>
                </p>
              </div>
              <div className="dash-hero-pulse-track">
                <motion.div
                  className={cn(
                    "dash-hero-pulse-fill",
                    missionClear && "dash-hero-pulse-fill-done",
                  )}
                  initial={false}
                  animate={{ transform: `scaleX(${Math.max(todayPct, 2) / 100})` }}
                  transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.23, 1, 0.32, 1] }}
                />
              </div>
            </div>
          )}

          <div className="dash-hero-actions">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="cta-on-brand h-11 px-5 text-sm font-bold"
            >
              <a href="#todays-mission">
                {remaining > 0 ? "Open mission" : hasMission ? "Review mission" : "Plan tomorrow"}
                <ChevronRight className="h-4 w-4" aria-hidden strokeWidth={2} />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="hero-band-outline-btn h-11 border-0 px-5 text-sm font-semibold shadow-none hover:shadow-none"
            >
              <Link href="/past-papers">Log a paper</Link>
            </Button>
          </div>
        </div>

        <aside
          className="dash-hero-aside"
          aria-label={focusSession ? "Today's focus session" : "Exam countdown"}
          style={accent ? ({ "--focus-accent": accent } as CSSProperties) : undefined}
        >
          {focusSession && Mark ? (
            <>
              <p className="dash-hero-aside-label">Today&apos;s focus</p>
              <div className="dash-hero-focus-subject">
                <span className="dash-hero-focus-mark" aria-hidden>
                  <Mark className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="truncate">{focusSession.subjectName}</span>
              </div>
              <p className="dash-hero-focus-topic">{focusSession.topic}</p>

              <div className="dash-hero-focus-meta">
                {focusSession.estimatedMinutes != null && (
                  <span className="dash-hero-focus-chip">
                    <Clock className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
                    {focusSession.estimatedMinutes} mins
                  </span>
                )}
                <span className="dash-hero-focus-chip">
                  Difficulty
                  <DifficultyDots level={difficulty} />
                </span>
              </div>

              {showCountdown && (
                <p className="dash-hero-focus-exam">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={2} />
                  <span className="truncate">
                    Exam in {daysToExam}d
                    {examLabel ? ` · ${examLabel.split(" · ")[0]}` : ""}
                  </span>
                </p>
              )}

              <Button
                asChild
                size="lg"
                className="dash-hero-focus-cta mt-auto h-10 w-full text-sm font-bold"
              >
                <a href="#todays-mission">
                  <Play className="h-4 w-4" aria-hidden strokeWidth={2} />
                  Start session
                </a>
              </Button>
            </>
          ) : showCountdown ? (
            <>
              <p className="dash-hero-aside-label">
                <CalendarClock
                  className="dash-hero-metric-icon-exam h-3.5 w-3.5"
                  aria-hidden
                  strokeWidth={2}
                />
                Next exam
              </p>
              <p className="dash-hero-countdown">
                <span className="tabular">{daysToExam}</span>
                <span className="dash-hero-countdown-unit">
                  {daysToExam === 1 ? "day" : "days"}
                </span>
              </p>
              {examLabel && (
                <p className="dash-hero-aside-meta">
                  <span className="truncate">{examLabel}</span>
                </p>
              )}
              <Button asChild size="lg" className="dash-hero-focus-cta mt-auto h-10 w-full text-sm font-bold">
                <Link href="/study-plan">
                  Plan a session
                  <ChevronRight className="h-4 w-4" aria-hidden strokeWidth={2} />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="dash-hero-aside-label">Today&apos;s focus</p>
              <p className="dash-hero-focus-topic mt-2">Build your first mission block</p>
              <p className="dash-hero-aside-meta mt-2">
                Every session earns XP and protects your streak.
              </p>
              <Button asChild size="lg" className="dash-hero-focus-cta mt-auto h-10 w-full text-sm font-bold">
                <Link href="/study-plan">
                  Create mission
                  <ChevronRight className="h-4 w-4" aria-hidden strokeWidth={2} />
                </Link>
              </Button>
            </>
          )}
        </aside>
      </div>

      <ul className="dash-hero-metrics">
        <li className="dash-hero-metric">
          <span className="dash-hero-metric-label">
            <Flame
              className={cn(
                "h-3.5 w-3.5",
                streak > 0 ? "dash-hero-metric-icon-streak dash-flame-icon" : "dash-hero-metric-icon",
              )}
              aria-hidden
              strokeWidth={2}
            />
            Streak
          </span>
          <span className="dash-hero-metric-value tabular">{streak}</span>
        </li>

        <li className="dash-hero-metric">
          <span className="dash-hero-metric-label">
            <ListChecks
              className="dash-hero-metric-icon dash-hero-metric-icon-tasks h-3.5 w-3.5"
              aria-hidden
              strokeWidth={2}
            />
            {remaining > 0 ? "Left today" : "Cleared"}
          </span>
          <span className="dash-hero-metric-value tabular">{remaining}</span>
        </li>

        {longestStreak > 0 && (
          <li className="dash-hero-metric">
            <span className="dash-hero-metric-label">
              <Trophy
                className="dash-hero-metric-icon dash-hero-metric-icon-best h-3.5 w-3.5"
                aria-hidden
                strokeWidth={2}
              />
              Best
            </span>
            <span className="dash-hero-metric-value tabular">{longestStreak}</span>
          </li>
        )}
      </ul>
    </motion.section>
  );
}

export function formatExamChip(date: string, paperCode: string, daysAway: number): string {
  const when = format(new Date(date), "EEE d MMM");
  return daysAway <= 7 ? `${paperCode} · ${when} · this week` : `${paperCode} · ${when}`;
}
