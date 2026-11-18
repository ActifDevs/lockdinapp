import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useGetProgressOverview,
  getGetProgressOverviewQueryKey,
  useListCurrentUserSubjects,
  getListCurrentUserSubjectsQueryKey,
  getListTasksQueryKey,
  useUpdateTask,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { RichEmptyState } from "@/components/rich-empty-state";
import { InsightCard } from "@/components/insight-card";
import { formatExamChip } from "@/components/dashboard/dashboard-hero";
import { SubjectMasteryGrid } from "@/components/dashboard/subject-mastery-grid";
import { TodaysMission } from "@/components/dashboard/todays-mission";
import { AchievementPanel } from "@/components/dashboard/achievement-panel";
import { WhatsNextPanel } from "@/components/dashboard/whats-next-panel";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
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
import {
  getMutationErrorMessage,
  getQueryErrorMessage,
} from "@/lib/query-error-message";
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
  actions,
  titleId,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
  actions?: Array<{ label: string; href: string }>;
  titleId?: string;
}) {
  const links = actions ?? (action ? [action] : []);
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 id={titleId} className="section-title">
          {title}
        </h2>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      {links.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 pb-0.5">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="section-link">
              {item.label}
              <ChevronRight className="h-4 w-4" aria-hidden strokeWidth={2.25} />
            </Link>
          ))}
        </div>
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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: summary,
    isPending,
    isError,
    error,
    refetch,
  } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  const {
    data: progressOverview,
    isPending: isProgressPending,
    isError: isProgressError,
    error: progressError,
    refetch: refetchProgress,
  } = useGetProgressOverview({
    query: { queryKey: getGetProgressOverviewQueryKey() },
  });

  const {
    data: subjectMemberships,
    isPending: areMembershipsPending,
    isError: areMembershipsError,
    error: membershipsError,
    refetch: refetchMemberships,
  } = useListCurrentUserSubjects({
    query: { queryKey: getListCurrentUserSubjectsQueryKey() },
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetDashboardSummaryQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetProgressOverviewQueryKey(),
        });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
      onError: (error) => {
        toast({
          title: "Could not update task",
          description: getMutationErrorMessage(error),
          variant: "destructive",
        });
      },
    },
  });

  const derived = useMemo(() => {
    if (!summary || !user) return null;

    const todayTasks = summary.todayTasks ?? [];
    const upcomingExams = summary.upcomingExams ?? [];
    const nextExam = upcomingExams
      .map((e) => ({
        ...e,
        daysAway: Math.ceil(
          (new Date(e.date).getTime() - Date.now()) / 86400000,
        ),
      }))
      .sort((a, b) => a.daysAway - b.daysAway)[0];

    const todayPct =
      summary.todayTasksTotal > 0
        ? Math.round(
            (summary.todayTasksCompleted / summary.todayTasksTotal) * 100,
          )
        : 0;

    const attention = progressOverview?.subjectAttentionNeeded ?? [];
    const totalXp = computeTotalXp(summary, progressOverview);
    const level = computeLevel(totalXp);
    const todayXp = computeTodayXpEarned(
      summary.todayTasksCompleted,
      summary.todayTasksTotal,
    );
    const missionXp = computeMissionXp(todayTasks);
    const longestStreak = syncLongestStreak(user.id, summary.studyStreakDays);

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
      attention,
      level,
      todayXp,
      missionXp,
      longestStreak,
      focusSession,
      achievements: buildAchievements(
        summary,
        progressOverview,
        summary.recentPerformance ?? [],
      ),
      missionFocus: pickMissionFocus(todayTasks, attention[0]?.reason),
      motivational: motivationalLine(
        summary.studyStreakDays,
        nextExam?.daysAway ?? null,
        todayPct,
      ),
      examLabel: nextExam
        ? formatExamChip(nextExam.date, nextExam.paperCode, nextExam.daysAway)
        : null,
    };
  }, [summary, progressOverview, user]);

  const celebratedRef = useRef<Set<string>>(new Set());
  const prevCompletedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!derived?.achievements || !user) return;
    const fresh = consumeNewAchievements(user.id, derived.achievements);
    for (const achievement of fresh) {
      if (celebratedRef.current.has(achievement.id)) continue;
      celebratedRef.current.add(achievement.id);
      toast({
        title: achievementToastTitle(achievement.icon, achievement.title),
        description: achievement.description,
      });
    }
  }, [derived?.achievements, user]);

  useEffect(() => {
    if (!summary) return;
    const prev = prevCompletedRef.current;
    const next = summary.todayTasksCompleted;
    prevCompletedRef.current = next;
    if (prev === null || next <= prev) return;

    const gained = next - prev;
    const cleared =
      next >= summary.todayTasksTotal && summary.todayTasksTotal > 0;
    toast({
      title: cleared ? "Daily goal complete" : `+${gained * 75} XP earned`,
      description: cleared
        ? "Daily goal complete. Every session sharpens your predicted grade."
        : "Progress logged. Keep the momentum going.",
    });
  }, [summary?.todayTasksCompleted, summary?.todayTasksTotal]);

  if (isPending || isProgressPending || areMembershipsPending) {
    return <DashboardSkeleton />;
  }

  if (
    isError ||
    isProgressError ||
    areMembershipsError ||
    !summary ||
    !progressOverview ||
    !subjectMemberships ||
    !derived
  ) {
    const dashboardError = error ?? progressError ?? membershipsError;
    return (
      <div className="dash-panel flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">
          Could not load dashboard
        </h2>
        <p className="max-w-md text-muted-foreground">
          {getQueryErrorMessage(dashboardError)}
        </p>
        <Button
          onClick={() => {
            void refetch();
            void refetchProgress();
            void refetchMemberships();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const displayName = summary.studentName;
  const subjectList = subjectMemberships.flatMap((membership) => {
    const progress = summary.subjectProgressSummary.find(
      (item) => item.subjectId === membership.subject.id,
    );
    if (!progress) return [];
    const performance = derived.recentPerformance.find(
      (item) => item.subjectId === membership.subject.id,
    );
    return [
      {
        ...membership.subject,
        syllabusProgress: progress.syllabusProgress,
        recentPaperScore: performance?.latestPercentage ?? null,
      },
    ];
  });
  const hasWeeklyChart =
    !!progressOverview && progressOverview.weeklyTasksCompleted.length > 0;

  return (
    <div className="space-y-9 pb-10 sm:space-y-12">
      <TodaysMission
        greeting={getGreeting()}
        displayName={displayName}
        missionFocus={derived.missionFocus}
        motivational={derived.motivational}
        tasks={derived.todayTasks}
        completed={summary.todayTasksCompleted}
        total={summary.todayTasksTotal}
        rewardXp={derived.missionXp}
        todayXp={derived.todayXp}
        streak={summary.studyStreakDays}
        longestStreak={derived.longestStreak}
        level={derived.level}
        daysToExam={derived.nextExam?.daysAway ?? null}
        examLabel={
          derived.examLabel ??
          (user?.examSession
            ? `${user.examSession}${user.level ? ` · ${user.level}` : ""}`
            : null)
        }
        focusSession={derived.focusSession}
        toggling={updateTask.isPending}
        onToggle={(taskId, completed) =>
          updateTask.mutate({ taskId, data: { completed: !completed } })
        }
      />

      {subjectList.length > 0 && (
        <section aria-labelledby="mastery-heading" className="space-y-4">
          <SectionHeader
            titleId="mastery-heading"
            title="Subject progress"
            subtitle="Your syllabus progress, predicted grades, and recent paper momentum."
            action={{ label: "All subjects", href: "/subjects" }}
          />
          <SubjectMasteryGrid
            subjects={subjectList}
            attention={derived.attention}
            recentPerformance={derived.recentPerformance}
          />
        </section>
      )}

      <section aria-labelledby="next-heading" className="space-y-4">
        <SectionHeader
          titleId="next-heading"
          title="What's Next?"
          subtitle="Upcoming deadlines and exams after today."
          actions={[
            { label: "Study plan", href: "/study-plan" },
            { label: "Calendar", href: "/calendar" },
          ]}
        />
        <WhatsNextPanel
          deadlines={derived.upcomingDeadlines}
          exams={derived.upcomingExams}
        />
      </section>

      <section aria-labelledby="activity-heading" className="space-y-4">
        <SectionHeader
          titleId="activity-heading"
          title="Your Progress & Activity"
          subtitle="Recent papers, this week, and achievements."
        />

        <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
          <InsightCard
            className="h-full lg:col-span-5"
            tint="deep"
            title={
              <CardTitle icon={BarChart2} tone="papers">
                Recent papers
              </CardTitle>
            }
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
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {perf.paperLabel}
                          </p>
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
                              <ArrowUpRight
                                className="h-3.5 w-3.5"
                                aria-hidden
                                strokeWidth={2.5}
                              />
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

          <div
            className={cn(
              "grid gap-4 lg:col-span-7",
              hasWeeklyChart ? "md:grid-cols-2" : "md:grid-cols-1",
            )}
          >
            {progressOverview &&
              progressOverview.weeklyTasksCompleted.length > 0 && (
                <InsightCard
                  className="h-full"
                  tint="cream"
                  title={
                    <CardTitle icon={BarChart2} tone="progress">
                      This week
                    </CardTitle>
                  }
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

            <AchievementPanel
              achievements={derived.achievements}
              className="h-full"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div
      className="space-y-9 pb-10 sm:space-y-12"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="dash-skeleton h-[22rem] rounded-[1.25rem] sm:h-[18rem]" />

      <div className="space-y-4">
        <div className="dash-skeleton h-7 w-48 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="dash-skeleton h-40 rounded-[1.25rem]" />
          ))}
        </div>
      </div>

      <div className="dash-skeleton h-28 rounded-[1.25rem]" />
    </div>
  );
}
