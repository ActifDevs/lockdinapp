import { lazy, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useGetProgressOverview,
  getGetProgressOverviewQueryKey,
  useListSubjects,
  getListSubjectsQueryKey,
  useUpdateTask,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { RichEmptyState } from "@/components/rich-empty-state";
import { InsightCard } from "@/components/insight-card";
import { DashboardHero, formatExamChip } from "@/components/dashboard/dashboard-hero";
import { GamificationRail } from "@/components/dashboard/gamification-rail";
import { SubjectMasteryGrid } from "@/components/dashboard/subject-mastery-grid";
import { TodaysMission } from "@/components/dashboard/todays-mission";
import { AchievementPanel } from "@/components/dashboard/achievement-panel";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Calendar,
  ChevronRight,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { format, isTomorrow } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import {
  buildAchievements,
  computeLevel,
  computeMissionXp,
  computeTodayXpEarned,
  computeTotalXp,
  consumeNewAchievements,
  motivationalLine,
  pickMissionFocus,
  syncLongestStreak,
} from "@/lib/dashboard-gamification";
import { getQueryErrorMessage } from "@/lib/query-error-message";
import { resolveSubjectAccent } from "@/lib/subject-accent";

const WeeklyActivityBarChart = lazy(
  () => import("@/components/charts/weekly-activity-bar-chart"),
);

function achievementToastTitle(icon: string, title: string): string {
  const labels: Record<string, string> = {
    flame: "Streak unlocked",
    star: "Milestone reached",
    trophy: "Achievement unlocked",
    target: "Goal hit",
    trend: "Progress update",
  };

  const label = labels[icon] ?? "Progress update";
  return `${label}: ${title}`;
}

function SectionHeader({
  title,
  subtitle,
  action,
  titleId,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
  titleId?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 id={titleId} className="section-title">
          {title}
        </h2>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      {action && (
        <Link href={action.href} className="section-link pb-0.5">
          {action.label}
          <ChevronRight className="h-4 w-4" aria-hidden strokeWidth={2.25} />
        </Link>
      )}
    </div>
  );
}

function CardTitle({
  icon: Icon,
  children,
  tone,
}: {
  icon: LucideIcon;
  children: ReactNode;
  tone?: "attention" | "progress" | "exam" | "papers";
}) {
  return (
    <span className="flex items-center gap-2">
      <Icon
        className={cn(
          "h-4 w-4",
          tone === "attention" && "dash-icon-attention",
          tone === "progress" && "dash-icon-progress",
          tone === "exam" && "dash-icon-exam",
          tone === "papers" && "dash-icon-papers",
          !tone && "text-muted-foreground",
        )}
        aria-hidden
        strokeWidth={2}
      />
      {children}
    </span>
  );
}

export default function Dashboard() {
  const { firstName, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: summary, isPending, isError, error, refetch } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  const { data: progressOverview } = useGetProgressOverview({
    query: { queryKey: getGetProgressOverviewQueryKey() },
  });

  const { data: subjects } = useListSubjects({
    query: { queryKey: getListSubjectsQueryKey() },
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProgressOverviewQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      },
    },
  });

  const derived = useMemo(() => {
    if (!summary) return null;

    const todayTasks = summary.todayTasks ?? [];
    const upcomingExams = summary.upcomingExams ?? [];
    const nextExam = upcomingExams
      .map((e) => ({ ...e, daysAway: Math.ceil((new Date(e.date).getTime() - Date.now()) / 86400000) }))
      .sort((a, b) => a.daysAway - b.daysAway)[0];

    const todayPct =
      summary.todayTasksTotal > 0
        ? Math.round((summary.todayTasksCompleted / summary.todayTasksTotal) * 100)
        : 0;

    const attention = progressOverview?.subjectAttentionNeeded ?? [];
    const totalXp = computeTotalXp(summary, progressOverview);
    const level = computeLevel(totalXp);
    const todayXp = computeTodayXpEarned(summary.todayTasksCompleted, summary.todayTasksTotal);
    const missionXp = computeMissionXp(todayTasks);
    const longestStreak = syncLongestStreak(summary.studyStreakDays);

    const nextTask = todayTasks.find((t) => !t.completed) ?? null;
    const focusSession = nextTask
      ? {
          subjectName: nextTask.subjectName,
          subjectColor: nextTask.subjectColor,
          topic: nextTask.topicTitle || nextTask.title,
          estimatedMinutes: nextTask.estimatedMinutes,
          priority: nextTask.priority,
        }
      : null;

    return {
      todayTasks,
      upcomingDeadlines: summary.upcomingDeadlines ?? [],
      recentPerformance: summary.recentPerformance ?? [],
      upcomingExams,
      nextExam,
      todayPct,
      attention,
      level,
      todayXp,
      missionXp,
      longestStreak,
      focusSession,
      achievements: buildAchievements(summary, progressOverview, summary.recentPerformance ?? []),
      missionFocus: pickMissionFocus(todayTasks, attention[0]?.reason),
      motivational: motivationalLine(
        summary.studyStreakDays,
        nextExam?.daysAway ?? null,
        todayPct,
      ),
      examLabel: nextExam
        ? formatExamChip(nextExam.date, nextExam.paperCode, nextExam.daysAway)
        : null,
      tasksRemaining: summary.todayTasksTotal - summary.todayTasksCompleted,
    };
  }, [summary, progressOverview]);

  const celebratedRef = useRef<Set<string>>(new Set());
  const prevCompletedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!derived?.achievements) return;
    const fresh = consumeNewAchievements(derived.achievements);
    for (const achievement of fresh) {
      if (celebratedRef.current.has(achievement.id)) continue;
      celebratedRef.current.add(achievement.id);
      toast({
        title: achievementToastTitle(achievement.icon, achievement.title),
        description: achievement.description,
      });
    }
  }, [derived?.achievements]);

  useEffect(() => {
    if (!summary) return;
    const prev = prevCompletedRef.current;
    const next = summary.todayTasksCompleted;
    prevCompletedRef.current = next;
    if (prev === null || next <= prev) return;

    const gained = next - prev;
    const cleared = next >= summary.todayTasksTotal && summary.todayTasksTotal > 0;
    toast({
      title: cleared ? "Daily goal complete" : `+${gained * 75} XP earned`,
      description: cleared
        ? "Daily goal complete. Every session sharpens your predicted grade."
        : "Progress logged. Keep the momentum going.",
    });
  }, [summary?.todayTasksCompleted, summary?.todayTasksTotal]);

  if (isPending) return <DashboardSkeleton />;

  if (isError || !summary || !derived) {
    return (
      <div className="dash-panel flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Could not load dashboard</h2>
        <p className="max-w-md text-muted-foreground">{getQueryErrorMessage(error)}</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const displayName = firstName || summary.studentName;
  const subjectList = subjects ?? [];
  const hasWeeklyChart =
    !!progressOverview && progressOverview.weeklyTasksCompleted.length > 0;

  return (
    <div className="space-y-9 pb-10 sm:space-y-12">
      <DashboardHero
        greeting={getGreeting()}
        displayName={displayName}
        missionFocus={derived.missionFocus}
        motivational={derived.motivational}
        streak={summary.studyStreakDays}
        longestStreak={derived.longestStreak}
        daysToExam={derived.nextExam?.daysAway ?? null}
        examLabel={
          derived.examLabel ??
          (user?.examSession ? `${user.examSession}${user.level ? ` · ${user.level}` : ""}` : null)
        }
        tasksRemaining={derived.tasksRemaining}
        todayCompleted={summary.todayTasksCompleted}
        todayTotal={summary.todayTasksTotal}
        todayPct={derived.todayPct}
        focusSession={derived.focusSession}
      />

      <section aria-labelledby="today-heading" className="space-y-4">
        <SectionHeader
          titleId="today-heading"
          title={format(new Date(), "EEEE d MMMM")}
          subtitle="Finish the mission. Protect the streak. Build exam confidence."
        />

        <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="lg:col-span-8">
            <TodaysMission
              tasks={derived.todayTasks}
              completed={summary.todayTasksCompleted}
              total={summary.todayTasksTotal}
              rewardXp={derived.missionXp}
              toggling={updateTask.isPending}
              onToggle={(taskId, completed) =>
                updateTask.mutate({ taskId, data: { completed: !completed } })
              }
            />
          </div>

          <div className="lg:col-span-4">
            <GamificationRail
              streak={summary.studyStreakDays}
              todayXp={derived.todayXp}
              level={derived.level}
            />
          </div>
        </div>
      </section>

      {subjectList.length > 0 && (
        <section aria-labelledby="mastery-heading" className="space-y-4">
          <SectionHeader
            titleId="mastery-heading"
            title="Subject mastery"
            subtitle="The signature view of your Cambridge readiness. Mastery, predicted grades, and momentum."
            action={{ label: "All subjects", href: "/subjects" }}
          />
          <SubjectMasteryGrid
            subjects={subjectList}
            attention={derived.attention}
            recentPerformance={derived.recentPerformance}
          />
        </section>
      )}

      <section aria-labelledby="momentum-heading" className="space-y-4">
        <SectionHeader
          titleId="momentum-heading"
          title="What's ahead"
          subtitle="Deadlines first, then scores, exams, and achievements."
        />

        <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
          <InsightCard
            className="dash-insight-emphasis h-full lg:col-span-7"
            tint="coral"
            title={<CardTitle icon={Clock} tone="attention">Approaching deadlines</CardTitle>}
            action={{ label: "Study plan", href: "/study-plan" }}
          >
            {derived.upcomingDeadlines.length === 0 ? (
              <RichEmptyState
                scene="calendar"
                title="Clear runway ahead"
                description="Schedule revision blocks with due dates so exam week stays calm, focused, and winnable."
                actionLabel="Schedule a task"
                actionHref="/study-plan"
                variant="yellow"
                className="py-6"
              />
            ) : (
              <div className="dash-list-rows">
                {derived.upcomingDeadlines.map((task) => {
                  const date = new Date(task.deadline!);
                  const isTaskTomorrow = isTomorrow(date);
                  const accent = resolveSubjectAccent({
                    name: task.subjectName,
                    color: task.subjectColor,
                  });
                  return (
                    <div key={task.id} className="dash-list-row">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: accent }}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold leading-tight">
                            {task.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {task.subjectName}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "dash-chip shrink-0",
                          isTaskTomorrow && "dash-chip-urgent",
                        )}
                      >
                        {isTaskTomorrow ? "Tomorrow" : format(date, "MMM d")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </InsightCard>

          <InsightCard
            className="h-full lg:col-span-5"
            tint="deep"
            title={<CardTitle icon={BarChart2} tone="papers">Recent papers</CardTitle>}
            action={{ label: "View all", href: "/past-papers" }}
          >
            {derived.recentPerformance.length === 0 ? (
              <RichEmptyState
                scene="papers"
                title="Start building your paper bank"
                description="Log timed past papers to unlock trends, predicted grades, and sharper focus for every subject."
                actionLabel="Log your first paper"
                actionHref="/past-papers"
                variant="blue"
                className="py-6"
              />
            ) : (
              <div className="dash-list-rows">
                {derived.recentPerformance.map((perf, i) => {
                  const accent = resolveSubjectAccent({
                    name: perf.subjectName,
                    color: perf.subjectColor,
                  });
                  return (
                  <div key={i} className="dash-list-row">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: accent }}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold leading-tight">
                          {perf.subjectName}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{perf.paperCode}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {perf.change !== null && perf.change !== 0 && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 text-xs font-semibold tabular",
                            perf.change > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-destructive",
                          )}
                        >
                          {perf.change > 0 ? (
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden strokeWidth={2.5} />
                          ) : (
                            <ArrowDownRight
                              className="h-3.5 w-3.5"
                              aria-hidden
                              strokeWidth={2.5}
                            />
                          )}
                          {Math.abs(perf.change)}%
                        </span>
                      )}
                      <p className="w-12 text-right text-lg font-bold leading-none tabular">
                        {perf.latestPercentage}%
                      </p>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </InsightCard>
        </div>

        <div
          className={cn(
            "grid gap-4 md:grid-cols-2",
            hasWeeklyChart && "xl:grid-cols-3",
          )}
        >
          {progressOverview && progressOverview.weeklyTasksCompleted.length > 0 && (
            <InsightCard
              className="h-full"
              tint="cream"
              title={<CardTitle icon={BarChart2} tone="progress">This week</CardTitle>}
              action={{ label: "Details", href: "/progress" }}
            >
              <Suspense fallback={<ChartSkeleton height={140} />}>
                <WeeklyActivityBarChart
                  data={progressOverview.weeklyTasksCompleted}
                  height={140}
                  compact
                />
              </Suspense>
            </InsightCard>
          )}

          <InsightCard
            className="h-full"
            tint="cream"
            title={<CardTitle icon={Calendar} tone="exam">Upcoming exams</CardTitle>}
            action={{ label: "Calendar", href: "/calendar" }}
          >
            {derived.upcomingExams.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                No exams on the calendar yet. Add session dates and the countdown becomes your daily
                focus.
              </p>
            ) : (
              <div className="dash-list-rows">
                {derived.upcomingExams.slice(0, 4).map((exam) => {
                  const examDate = new Date(exam.date);
                  const daysAway = Math.ceil((examDate.getTime() - Date.now()) / 86400000);
                  return (
                    <div key={exam.id} className="dash-list-row">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold leading-tight">
                          {exam.subjectName}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {exam.paperCode} · {format(examDate, "MMM d")}
                        </p>
                      </div>
                      <p className="shrink-0 text-right text-lg font-bold leading-none tabular text-primary">
                        {daysAway}
                        <span className="ml-0.5 text-xs font-semibold text-muted-foreground">
                          d
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </InsightCard>

          <AchievementPanel
            achievements={derived.achievements}
            className={cn("h-full", hasWeeklyChart && "md:col-span-2 xl:col-span-1")}
          />
        </div>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-9 pb-10 sm:space-y-12" aria-busy="true" aria-live="polite">
      <div className="dash-skeleton h-[11.5rem] rounded-2xl sm:h-[10.5rem]" />

      <div className="space-y-4">
        <div className="dash-skeleton h-7 w-56 rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="dash-skeleton h-[24rem] rounded-[1.25rem] lg:col-span-8" />
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
            <div className="dash-skeleton h-32 rounded-[1.25rem]" />
            <div className="dash-skeleton h-40 rounded-[1.25rem]" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="dash-skeleton h-7 w-48 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="dash-skeleton h-56 rounded-[1.25rem]" />
          ))}
        </div>
      </div>
    </div>
  );
}
