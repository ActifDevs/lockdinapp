import { useGetSubject, getGetSubjectQueryKey, useGetSubjectSyllabus, getGetSubjectSyllabusQueryKey, useGetSubjectPerformance, getGetSubjectPerformanceQueryKey, useListTasks, getListTasksQueryKey, useListPastPaperAttempts, getListPastPaperAttemptsQueryKey, useUpdateSyllabusTopic, useUpdateTask, getGetProgressOverviewQueryKey, type SyllabusUnit, type SyllabusTopic } from "@workspace/api-client-react";
import { Link, useRoute } from "wouter";
import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import { APP_NAME } from "@/lib/app-config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressRing } from "@/components/progress-ring";
import { TaskRow } from "@/components/task-row";
import { RichEmptyState } from "@/components/rich-empty-state";
import { InsightCard } from "@/components/insight-card";
import { BarChart, CheckCircle2, ChevronDown, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { format, parseISO } from "date-fns";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryErrorMessage } from "@/lib/query-error-message";
import { resolveSubjectAccent } from "@/lib/subject-accent";
import { subjectMark } from "@/lib/subject-mark";
import { cn } from "@/lib/utils";

const ScoreTrendLineChart = lazy(
  () => import("@/components/charts/score-trend-line-chart"),
);

/** Strip leading "1 ", "01.", "2)" etc. so UI can own the 01/02 index. */
function stripLeadingIndex(title: string): string {
  return title.replace(/^\s*\d+[\.\:\)]?\s+/, "").trim() || title;
}

function unitProgressStatus(topics: SyllabusTopic[]): "not_started" | "in_progress" | "completed" {
  if (topics.length === 0) return "not_started";
  if (topics.every((t) => t.status === "completed")) return "completed";
  if (topics.some((t) => t.status === "completed" || t.status === "in_progress")) return "in_progress";
  return "not_started";
}

export default function SubjectDetail() {
  const [, params] = useRoute("/subjects/:id");
  const subjectId = params?.id ? parseInt(params.id) : null;
  const queryClient = useQueryClient();
  const [expandedUnits, setExpandedUnits] = useState<Set<number>>(() => new Set());
  const [unitBusyId, setUnitBusyId] = useState<number | null>(null);

  // Queries
  const {
    data: subject,
    isPending: subjectLoading,
    isError: subjectError,
    error: subjectLoadError,
    refetch: refetchSubject,
  } = useGetSubject(subjectId!, {
    query: { enabled: !!subjectId, queryKey: getGetSubjectQueryKey(subjectId!) }
  });

  const { data: syllabus } = useGetSubjectSyllabus(subjectId!, {
    query: { enabled: !!subjectId, queryKey: getGetSubjectSyllabusQueryKey(subjectId!) }
  });

  const { data: performance } = useGetSubjectPerformance(subjectId!, {
    query: { enabled: !!subjectId, queryKey: getGetSubjectPerformanceQueryKey(subjectId!) }
  });

  const { data: tasks } = useListTasks({ subjectId: subjectId! }, {
    query: { enabled: !!subjectId, queryKey: getListTasksQueryKey({ subjectId: subjectId! }) }
  });

  const { data: papers } = useListPastPaperAttempts({ subjectId: subjectId! }, {
    query: { enabled: !!subjectId, queryKey: getListPastPaperAttemptsQueryKey({ subjectId: subjectId! }) }
  });

  const updateTopic = useUpdateSyllabusTopic({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSubjectSyllabusQueryKey(subjectId!) });
        queryClient.invalidateQueries({ queryKey: getGetSubjectQueryKey(subjectId!) });
        queryClient.invalidateQueries({ queryKey: getGetProgressOverviewQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      }
    }
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ subjectId: subjectId! }) });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      },
    },
  });

  useEffect(() => {
    if (!subject?.name) return;
    document.title = `${subject.name} · ${APP_NAME}`;
  }, [subject?.name]);

  if (!subjectId) {
    return (
      <div className="app-page">
        <div className="dash-panel flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Subject not found</h2>
          <p className="max-w-md text-center text-muted-foreground">
            This link does not point to a valid subject.
          </p>
          <Button asChild>
            <Link href="/subjects">Back to subjects</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (subjectLoading) {
    return (
      <div className="app-page animate-pulse">
        <div className="h-20 rounded-xl bg-muted" />
        <div className="h-10 w-full rounded bg-muted" />
        <div className="h-96 rounded-xl bg-muted" />
      </div>
    );
  }

  if (subjectError || !subject) {
    return (
      <div className="app-page">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/subjects">Subjects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Subject</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="dash-panel mt-6 flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Could not load subject</h2>
          <p className="max-w-md text-center text-muted-foreground">
            {getQueryErrorMessage(subjectLoadError)}
          </p>
          <Button onClick={() => refetchSubject()}>Retry</Button>
        </div>
      </div>
    );
  }

  const allSyllabusTopics = syllabus?.flatMap((unit) => unit.topics) ?? [];
  const syllabusProgress =
    allSyllabusTopics.length === 0
      ? 0
      : Math.round(
          (allSyllabusTopics.filter((topic) => topic.status === "completed").length /
            allSyllabusTopics.length) *
            100,
        );

  const cycleTopicStatus = (topicId: number, currentStatus: string) => {
    let nextStatus: 'not_started' | 'in_progress' | 'completed' = 'in_progress';
    if (currentStatus === 'not_started') nextStatus = 'in_progress';
    else if (currentStatus === 'in_progress') nextStatus = 'completed';
    else nextStatus = 'not_started';

    updateTopic.mutate({
      topicId,
      data: { status: nextStatus }
    });
  };

  const toggleUnitExpanded = (unitId: number) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const toggleUnitComplete = async (unit: SyllabusUnit) => {
    const allDone = unit.topics.length > 0 && unit.topics.every((t) => t.status === "completed");
    const nextStatus = allDone ? "not_started" : "completed";
    const targets = unit.topics.filter((t) => t.status !== nextStatus);
    if (targets.length === 0) return;

    setUnitBusyId(unit.id);
    try {
      await Promise.all(
        targets.map((topic) =>
          updateTopic.mutateAsync({
            topicId: topic.id,
            data: { status: nextStatus },
          }),
        ),
      );
    } finally {
      setUnitBusyId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-[hsl(var(--semantic-complete))]" aria-hidden strokeWidth={2} />;
      case 'in_progress': return <Circle className="h-5 w-5 text-[hsl(var(--semantic-attention))] fill-[hsl(var(--semantic-attention)/0.2)]" aria-hidden strokeWidth={2} />;
      default: return <Circle className="h-5 w-5 text-muted-foreground/30" aria-hidden strokeWidth={2} />;
    }
  };

  const topicStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In progress';
      default: return 'Not started';
    }
  };

  const topicStatusAction = (status: string) => {
    switch (status) {
      case 'not_started': return 'Mark as in progress';
      case 'in_progress': return 'Mark as completed';
      default: return 'Mark as not started';
    }
  };

  const pendingTasks = tasks?.filter(t => !t.completed) || [];
  const accent = resolveSubjectAccent({
    code: subject.code,
    name: subject.name,
    color: subject.color,
  });
  const Mark = subjectMark(subject.name);

  return (
    <div className="app-page animate-in fade-in duration-300">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/subjects">Subjects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{subject.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div
        className="dash-mastery-card relative overflow-hidden p-4 sm:p-8"
        style={{ "--subject-accent": accent } as CSSProperties}
      >
        <span className="dash-mastery-accent" aria-hidden />
        <span className="dash-mastery-glow" aria-hidden />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div
            className="dash-mastery-mark flex h-14 w-14 shrink-0 items-center justify-center sm:h-16 sm:w-16"
            style={{ color: accent }}
            aria-hidden
          >
            <Mark className="h-7 w-7" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="page-title">{subject.name}</h1>
              <span className="font-medium text-muted-foreground">{subject.code}</span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-6">
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={syllabusProgress}
                  label={`${subject.name} syllabus`}
                  color={accent}
                  size={56}
                  strokeWidth={5}
                />
                <div>
                  <p className="card-label">Syllabus</p>
                  <p className="text-2xl font-bold tabular-nums">{syllabusProgress}%</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-border/50 bg-muted/20 p-4 sm:border-l sm:border-border/50 sm:bg-transparent sm:p-0 sm:pl-6 lg:border-l">
                <div>
                  <p className="card-label mb-0.5">Tasks</p>
                  <p className="text-base font-bold">{subject.upcomingTasksCount} <span className="text-xs font-normal text-muted-foreground">pending</span></p>
                </div>
                <div>
                  <p className="card-label mb-0.5">Latest score</p>
                  <p className="text-base font-bold tabular">{subject.recentPaperScore !== null ? `${subject.recentPaperScore}%` : "N/A"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="tabs-scroll mb-6 rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Overview</TabsTrigger>
          <TabsTrigger value="syllabus" className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Syllabus</TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Tasks ({pendingTasks.length})</TabsTrigger>
          <TabsTrigger value="performance" className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Insight if available */}
              {performance?.insight && (
                <InsightCard
                  tint="cream"
                  title={
                    <span className="flex items-center gap-2">
                      <BarChart className="h-4 w-4 text-[hsl(var(--semantic-progress))]" strokeWidth={2} aria-hidden />
                      Performance insight
                    </span>
                  }
                >
                  <p className="text-sm leading-relaxed text-foreground/90">{performance.insight}</p>
                </InsightCard>
              )}
              
              <Card className="card-tint-cream shadow-[var(--elev-2)]">
                <CardHeader>
                  <CardTitle className="text-lg font-bold tracking-[-0.01em]">Upcoming tasks</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {pendingTasks.length === 0 ? (
                    <RichEmptyState
                      scene="tasks"
                      title="No pending tasks"
                      description={`Clear runway for ${subject.name} — add a finishable block from your study plan.`}
                      actionHref="/study-plan"
                      actionLabel="Open study plan"
                      variant="mint"
                      className="py-8"
                    />
                  ) : (
                    <div className="divide-y divide-border/30">
                      {pendingTasks.slice(0, 5).map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                          <div>
                            <p className="text-sm font-medium">{task.title}</p>
                            {task.topicTitle && <p className="text-xs text-muted-foreground">{task.topicTitle}</p>}
                          </div>
                          {task.deadline && (
                            <Badge variant="secondary" className="text-xs font-normal">
                              {format(parseISO(task.deadline), "MMM d")}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="card-tint-cream shadow-[var(--elev-2)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold tracking-[-0.01em]">Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="text-sm text-muted-foreground">Papers completed</span>
                    <span className="text-lg font-semibold tabular">{performance?.papersCompleted || 0}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="text-sm text-muted-foreground">Average score</span>
                    <span className="text-lg font-semibold tabular">{performance?.averageScore ? `${performance.averageScore}%` : '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Best score</span>
                    <span className="text-lg font-semibold tabular text-[hsl(var(--semantic-progress))]">{performance?.bestScore ? `${performance.bestScore}%` : '-'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="syllabus" className="space-y-4">
          <Card className="card-tint-cream shadow-[var(--elev-2)]">
            <CardHeader>
              <CardTitle className="text-xl font-bold tracking-[-0.01em]">Syllabus progress</CardTitle>
              <CardDescription>
                Expand a topic to update subtopics. Checking a main topic marks every subtopic done.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {syllabus?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Syllabus data unavailable.</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {syllabus?.map((unit, uIdx) => {
                    const expanded = expandedUnits.has(unit.id);
                    const unitStatus = unitProgressStatus(unit.topics);
                    const doneCount = unit.topics.filter((t) => t.status === "completed").length;
                    const indexLabel = (uIdx + 1).toString().padStart(2, "0");
                    const title = stripLeadingIndex(unit.title);
                    const busy = unitBusyId === unit.id;

                    return (
                      <div
                        key={unit.id}
                        className="bg-card"
                        style={{ "--subject-accent": accent } as CSSProperties}
                      >
                        <div className="flex items-center gap-1 py-1 pl-3 pr-2 sm:pl-4 sm:pr-3">
                          <button
                            type="button"
                            disabled={busy || unit.topics.length === 0 || updateTopic.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              void toggleUnitComplete(unit);
                            }}
                            aria-label={
                              unitStatus === "completed"
                                ? `Mark all subtopics in ${title} as not started`
                                : `Mark all subtopics in ${title} as completed`
                            }
                            aria-pressed={unitStatus === "completed"}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                          >
                            {getStatusIcon(unitStatus)}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleUnitExpanded(unit.id)}
                            aria-expanded={expanded}
                            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-2 text-left transition-colors hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums"
                              style={{
                                color: accent,
                                backgroundColor: `color-mix(in oklab, ${accent} 14%, transparent)`,
                              }}
                            >
                              {indexLabel}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  "block truncate text-sm font-semibold leading-5 tracking-[-0.01em]",
                                  unitStatus === "completed" && "text-muted-foreground",
                                )}
                              >
                                {title}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                                {doneCount}/{unit.topics.length} subtopics
                              </span>
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                                expanded && "rotate-180",
                              )}
                              strokeWidth={2}
                              aria-hidden
                            />
                          </button>
                        </div>

                        {expanded && (
                          <div className="bg-muted/15 pb-2 pl-3 pr-2 pt-1 sm:pl-4 sm:pr-3">
                            {unit.topics.length === 0 ? (
                              <p className="px-3 py-3 text-sm text-muted-foreground">No subtopics yet.</p>
                            ) : (
                              unit.topics.map((topic) => (
                                <div
                                  key={topic.id}
                                  className="flex items-center gap-1 rounded-lg py-0.5 pl-1 hover:bg-muted/40"
                                >
                                  <button
                                    type="button"
                                    onClick={() => cycleTopicStatus(topic.id, topic.status)}
                                    disabled={updateTopic.isPending}
                                    aria-label={`${topic.title}: ${topicStatusLabel(topic.status)}. ${topicStatusAction(topic.status)}.`}
                                    aria-pressed={topic.status === "completed"}
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                                  >
                                    {getStatusIcon(topic.status)}
                                  </button>
                                  <div className="min-w-0 flex-1 py-2 pr-2">
                                    <p
                                      className={cn(
                                        "text-sm font-medium leading-5",
                                        topic.status === "completed" && "text-muted-foreground",
                                      )}
                                    >
                                      {stripLeadingIndex(topic.title)}
                                    </p>
                                    {topic.notes && (
                                      <p className="mt-1 inline-block rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                                        {topic.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="card-tint-cream shadow-[var(--elev-2)]">
            <CardHeader>
              <CardTitle className="text-xl font-bold tracking-[-0.01em]">Subject tasks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!tasks || tasks.length === 0 ? (
                <RichEmptyState
                  scene="tasks"
                  title="Ready to schedule this subject?"
                  description="Add revision tasks from your study plan and link them here to keep momentum."
                  actionHref="/study-plan"
                  actionLabel="Go to study plan"
                  variant="mint"
                />
              ) : (
                <div className="list-divider">
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      disabled={updateTask.isPending}
                      onToggle={() =>
                        updateTask.mutate({
                          taskId: task.id,
                          data: { completed: !task.completed },
                        })
                      }
                      trailing={
                        task.deadline ? (
                          <span className="hidden shrink-0 self-center pt-1 text-xs text-muted-foreground sm:inline">
                            {format(parseISO(task.deadline), "MMM d")}
                          </span>
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card className="card-tint-cream shadow-[var(--elev-2)]">
            <CardHeader>
              <CardTitle className="text-xl font-bold tracking-[-0.01em]">Score trend</CardTitle>
            </CardHeader>
            <CardContent>
              {!performance || performance.trend.length < 2 ? (
                <RichEmptyState
                  scene="chart"
                  title="Log two papers to unlock trends"
                  description="Timed attempts reveal your score trajectory and sharpen predicted grades."
                  actionHref="/past-papers"
                  actionLabel="Log a paper"
                  variant="mint"
                  className="py-10"
                />
              ) : (
                <Suspense fallback={<ChartSkeleton height={300} />}>
                  <ScoreTrendLineChart
                    data={performance.trend}
                    xKey="label"
                    stroke={accent}
                    height={300}
                  />
                </Suspense>
              )}
            </CardContent>
          </Card>

          <Card className="card-tint-cream shadow-[var(--elev-2)]">
            <CardHeader>
              <CardTitle className="text-xl font-bold tracking-[-0.01em]">Component breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!performance || performance.componentBreakdown.length === 0 ? (
                <RichEmptyState
                  scene="chart"
                  title="No component data yet"
                  description="As you log papers with paper codes, component averages will appear here."
                  actionHref="/past-papers"
                  actionLabel="Log a paper"
                  variant="mint"
                  className="py-8"
                />
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] text-left text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3 font-medium">Component</th>
                      <th className="px-6 py-3 font-medium text-center">Attempts</th>
                      <th className="px-6 py-3 font-medium text-right">Latest Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {performance.componentBreakdown.map((cb, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 font-medium">{cb.componentName}</td>
                        <td className="px-6 py-4 text-center text-muted-foreground">{cb.attempts}</td>
                        <td className="px-6 py-4 text-right font-semibold">{cb.latestPercentage ? `${cb.latestPercentage}%` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
