import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
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
  Clock,
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

const WeeklyActivityBarChart = lazy(
  () => import("@/components/charts/weekly-activity-bar-chart"),
);

function getDashboardErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Please check your connection and try again.";
  }

  const message = error.message.trim();
  if (message === "HTTP 500 Internal Server Error" || /^HTTP 5\d\d/.test(message)) {
    return "The API server is not running or returned an error. From the project root, run pnpm dev to start the frontend and API together.";
  }

  if (/fetch failed|Failed to fetch|NetworkError|ECONNREFUSED/i.test(message)) {
    return "Could not reach the API. Make sure the API server is running (pnpm dev from the project root).";
  }

  return message;
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

  useEffect(() => {
    if (!derived?.achievements) return;
    const fresh = consumeNewAchievements(derived.achievements);
    for (const achievement of fresh) {
      if (celebratedRef.current.has(achievement.id)) continue;
      celebratedRef.current.add(achievement.id);
      toast({
        title: `Achievement unlocked: ${achievement.title}`,
        description: achievement.description,
      });
    }
  }, [derived?.achievements]);

  if (isPending) return <DashboardSkeleton />;

  if (isError || !summary || !derived) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[hsl(var(--brand-teal)/0.35)] bg-card p-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Could not load dashboard</h2>
        <p className="max-w-md text-muted-foreground">{getDashboardErrorMessage(error)}</p>
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

  return (
    <div className="space-y-8 pb-8">
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
      />

      <GamificationRail
        streak={summary.studyStreakDays}
        todayXp={derived.todayXp}
        level={derived.level}
      />

      <SubjectMasteryGrid
        subjects={subjects ?? []}
        attention={derived.attention}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="order-1 lg:col-span-8">
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

        <div className="order-2 flex flex-col gap-6 lg:order-2 lg:col-span-4">
          <AchievementPanel achievements={derived.achievements} className="hidden lg:block" />

          {progressOverview && progressOverview.weeklyTasksCompleted.length > 0 && (
            <InsightCard
              tint="teal"
              title={
                <span className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-primary" aria-hidden strokeWidth={2} />
                  This week
                </span>
              }
              action={{ label: "Details", href: "/progress" }}
            >
              <Suspense fallback={<ChartSkeleton height={120} />}>
                <WeeklyActivityBarChart
                  data={progressOverview.weeklyTasksCompleted}
                  height={120}
                  compact
                />
              </Suspense>
            </InsightCard>
          )}

          <InsightCard
            tint="amber"
            title={
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" aria-hidden strokeWidth={2} />
                Upcoming exams
              </span>
            }
            action={{ label: "Calendar", href: "/calendar" }}
          >
            <div className="space-y-3">
              {derived.upcomingExams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No exams scheduled yet.</p>
              ) : (
                derived.upcomingExams.slice(0, 4).map((exam) => {
                  const examDate = new Date(exam.date);
                  const daysAway = Math.ceil((examDate.getTime() - Date.now()) / 86400000);
                  return (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{exam.subjectName}</p>
                        <p className="text-xs text-muted-foreground">{exam.paperCode}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-extrabold tabular text-primary">{daysAway}d</p>
                        <p className="text-[10px] font-semibold text-muted-foreground">
                          {format(examDate, "MMM d")}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </InsightCard>
        </div>

        <div className="order-3 lg:col-span-6">
          <InsightCard
            className="h-full"
            tint="deep"
            title="Recent papers"
            action={{ label: "View all", href: "/past-papers" }}
          >
              {derived.recentPerformance.length === 0 ? (
                <RichEmptyState
                  scene="papers"
                  title="No papers logged yet"
                  description="Log past papers to track scores and unlock grade predictions."
                  actionLabel="Log first paper"
                  actionHref="/past-papers"
                  variant="blue"
                  className="py-8"
                />
              ) : (
                <div className="space-y-3">
                  {derived.recentPerformance.map((perf, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/25 px-4 py-3 transition-colors hover:bg-muted/45"
                      style={{ borderLeftWidth: 4, borderLeftColor: perf.subjectColor }}
                    >
                      <div>
                        <p className="text-sm font-bold">{perf.subjectName}</p>
                        <p className="text-xs text-muted-foreground">{perf.paperCode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-extrabold tabular">{perf.latestPercentage}%</p>
                        {perf.change !== null && perf.change !== 0 && (
                          <p
                            className={cn(
                              "flex items-center justify-end gap-0.5 text-xs font-semibold",
                              perf.change > 0 ? "text-emerald-600" : "text-destructive",
                            )}
                          >
                            {perf.change > 0 ? (
                              <ArrowUpRight className="h-3 w-3" aria-hidden />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" aria-hidden />
                            )}
                            {Math.abs(perf.change)}%
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </InsightCard>
        </div>

        <div className="order-4 lg:col-span-6">
          <InsightCard
            className="h-full"
            tint="coral"
            title={
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden strokeWidth={2} />
                Approaching deadlines
              </span>
            }
            action={{ label: "Study plan", href: "/study-plan" }}
          >
              {derived.upcomingDeadlines.length === 0 ? (
                <RichEmptyState
                  scene="calendar"
                  title="No deadlines coming up"
                  description="Add due dates to tasks so revision stays exam-ready."
                  actionLabel="Plan a task"
                  actionHref="/study-plan"
                  variant="yellow"
                  className="py-8"
                />
              ) : (
                <div className="space-y-3">
                  {derived.upcomingDeadlines.map((task) => {
                    const date = new Date(task.deadline!);
                    const isTaskTomorrow = isTomorrow(date);
                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/25 px-4 py-3"
                        style={{ borderLeftWidth: 4, borderLeftColor: task.subjectColor }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{task.subjectName}</p>
                        </div>
                        <Badge variant={isTaskTomorrow ? "destructive" : "secondary"} className="shrink-0">
                          {isTaskTomorrow ? "Tomorrow" : format(date, "MMM d")}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
          </InsightCard>
        </div>

        <div className="order-5 lg:col-span-12 lg:hidden">
          <AchievementPanel achievements={derived.achievements} />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 pb-8" aria-busy="true" aria-live="polite">
      <div className="h-52 animate-pulse rounded-2xl bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="h-96 animate-pulse rounded-2xl bg-muted lg:col-span-8" />
        <div className="h-96 animate-pulse rounded-2xl bg-muted lg:col-span-4" />
      </div>
    </div>
  );
}
