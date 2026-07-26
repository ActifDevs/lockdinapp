import { useGetSubject, getGetSubjectQueryKey, useGetSubjectSyllabus, getGetSubjectSyllabusQueryKey, useGetSubjectPerformance, getGetSubjectPerformanceQueryKey, useListTasks, getListTasksQueryKey, useListPastPapers, getListPastPapersQueryKey, useUpdateSyllabusTopic, useUpdateTask } from "@workspace/api-client-react";
import { Link, useRoute } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressRing } from "@/components/progress-ring";
import { TaskRow } from "@/components/task-row";
import { RichEmptyState } from "@/components/rich-empty-state";
import { BarChart, Clock, CheckCircle2, Circle, ArrowUpRight, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const ScoreTrendLineChart = lazy(
  () => import("@/components/charts/score-trend-line-chart"),
);

export default function SubjectDetail() {
  const [, params] = useRoute("/subjects/:id");
  const subjectId = params?.id ? parseInt(params.id) : null;
  const queryClient = useQueryClient();

  // Queries
  const { data: subject, isLoading: subjectLoading } = useGetSubject(subjectId!, {
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

  const { data: papers } = useListPastPapers({ subjectId: subjectId! }, {
    query: { enabled: !!subjectId, queryKey: getListPastPapersQueryKey({ subjectId: subjectId! }) }
  });

  const updateTopic = useUpdateSyllabusTopic({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSubjectSyllabusQueryKey(subjectId!) });
        queryClient.invalidateQueries({ queryKey: getGetSubjectQueryKey(subjectId!) });
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
    document.title = `${subject.name} · Scholr`;
  }, [subject?.name]);

  if (subjectLoading || !subject) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-20 bg-muted rounded-xl" />
        <div className="h-10 w-full bg-muted rounded" />
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    );
  }

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

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />;
      case 'in_progress': return <Circle className="h-5 w-5 text-orange-500 fill-orange-500/20" aria-hidden />;
      default: return <Circle className="h-5 w-5 text-muted-foreground/30" aria-hidden />;
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

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      <Link
        href="/subjects"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden strokeWidth={1.75} />
        All subjects
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--brand-teal)/0.22)] bg-card p-4 shadow-sm sm:p-8">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-bl-[100px] opacity-5" style={{ backgroundColor: subject.color }} />
        
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-bold text-white shadow-md sm:h-16 sm:w-16" style={{ backgroundColor: subject.color }}>
            {subject.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="page-title">{subject.name}</h1>
              <span className="font-medium text-muted-foreground">{subject.code}</span>
            </div>
            
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-6">
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={subject.syllabusProgress}
                  label={`${subject.name} syllabus`}
                  color={subject.color}
                  size={56}
                  strokeWidth={5}
                />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Syllabus</p>
                  <p className="text-2xl font-bold tabular-nums">{subject.syllabusProgress}%</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-border/50 bg-muted/20 p-4 sm:border-l sm:border-border/50 sm:bg-transparent sm:p-0 sm:pl-6 lg:border-l">
                <div>
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tasks</p>
                  <p className="text-base font-bold">{subject.upcomingTasksCount} <span className="text-xs font-normal text-muted-foreground">pending</span></p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Latest score</p>
                  <p className="text-base font-bold">{subject.recentPaperScore !== null ? `${subject.recentPaperScore}%` : "N/A"}</p>
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
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-sm leading-relaxed text-foreground/90">
                  <div className="flex gap-2 mb-2 text-primary font-semibold items-center">
                    <BarChart className="h-4 w-4" /> Performance Insight
                  </div>
                  {performance.insight}
                </div>
              )}
              
              <Card className="card-tint-coral">
                <CardHeader>
                  <CardTitle className="text-lg">Upcoming Tasks</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {pendingTasks.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">No tasks pending for {subject.name}.</div>
                  ) : (
                    <div className="divide-y border-t">
                      {pendingTasks.slice(0, 5).map(task => (
                        <div key={task.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                          <div>
                            <p className="font-medium text-sm">{task.title}</p>
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
              <Card className="card-tint-teal">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="text-sm text-muted-foreground">Papers Completed</span>
                    <span className="font-semibold text-lg">{performance?.papersCompleted || 0}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-3">
                    <span className="text-sm text-muted-foreground">Average Score</span>
                    <span className="font-semibold text-lg">{performance?.averageScore ? `${performance.averageScore}%` : '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Best Score</span>
                    <span className="font-semibold text-lg text-primary">{performance?.bestScore ? `${performance.bestScore}%` : '-'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="syllabus" className="space-y-4">
          <Card className="card-tint-amber">
            <CardHeader>
              <CardTitle className="text-xl">Syllabus Progress</CardTitle>
              <CardDescription>Click the circle icon to update a topic's status.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 border-t">
              {syllabus?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Syllabus data unavailable.</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {syllabus?.map((unit, uIdx) => (
                    <div key={unit.id} className="p-4 sm:p-6 bg-card">
                      <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                        <span className="text-muted-foreground font-normal text-sm w-6">{(uIdx + 1).toString().padStart(2, '0')}</span> 
                        {unit.title}
                      </h3>
                      <div className="space-y-1 ml-8">
                        {unit.topics.map(topic => (
                          <div key={topic.id} className="flex items-start gap-3 py-2 group hover:bg-muted/30 -ml-2 pl-2 rounded-md transition-colors">
                            <button
                              type="button"
                              onClick={() => cycleTopicStatus(topic.id, topic.status)}
                              aria-label={`${topic.title}: ${topicStatusLabel(topic.status)}. ${topicStatusAction(topic.status)}.`}
                              aria-pressed={topic.status === 'completed'}
                              className="mt-0.5 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              {getStatusIcon(topic.status)}
                            </button>
                            <div>
                              <p className={cn("text-sm font-medium transition-colors", topic.status === 'completed' && "text-muted-foreground")}>
                                {topic.title}
                              </p>
                              {topic.notes && (
                                <p className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded inline-block">{topic.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="card-tint-deep">
            <CardHeader>
              <CardTitle className="text-xl">Subject Tasks</CardTitle>
            </CardHeader>
            <CardContent className="p-0 border-t">
              {!tasks || tasks.length === 0 ? (
                <RichEmptyState
                  scene="tasks"
                  title="No tasks for this subject"
                  description="Add revision tasks from your study plan and link them to this subject."
                  actionHref="/study-plan"
                  actionLabel="Go to study plan"
                  variant="blue"
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
          <Card className="card-tint-teal">
            <CardHeader>
              <CardTitle className="text-xl">Score Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {!performance || performance.trend.length < 2 ? (
                <RichEmptyState
                  scene="chart"
                  title="Not enough data yet"
                  description="Log at least two past papers for this subject to see your score trend."
                  actionHref="/past-papers"
                  actionLabel="Log a paper"
                  variant="purple"
                  className="py-10"
                />
              ) : (
                <Suspense fallback={<ChartSkeleton height={300} />}>
                  <ScoreTrendLineChart
                    data={performance.trend}
                    xKey="label"
                    stroke={subject.color}
                    height={300}
                  />
                </Suspense>
              )}
            </CardContent>
          </Card>

          <Card className="card-tint-coral">
            <CardHeader>
              <CardTitle className="text-xl">Component Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0 border-t">
              {!performance || performance.componentBreakdown.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">No component data.</div>
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
                        <td className="px-6 py-4 font-medium">{cb.component}</td>
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
