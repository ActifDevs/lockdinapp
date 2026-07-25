import { useGetSubject, getGetSubjectQueryKey, useGetSubjectSyllabus, getGetSubjectSyllabusQueryKey, useGetSubjectPerformance, getGetSubjectPerformanceQueryKey, useListTasks, getListTasksQueryKey, useListPastPapers, getListPastPapersQueryKey, useUpdateSyllabusTopic } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Clock, ListTodo, Trophy, ChevronDown, CheckCircle2, Circle, ArrowUpRight, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

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
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); // update dashboard overall
      }
    }
  });

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
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-primary" />;
      case 'in_progress': return <Circle className="h-5 w-5 text-orange-500 fill-orange-500/20" />;
      default: return <Circle className="h-5 w-5 text-muted-foreground/30" />;
    }
  };

  const pendingTasks = tasks?.filter(t => !t.completed) || [];

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-card border shadow-sm p-8">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5 rounded-bl-[100px]" style={{ backgroundColor: subject.color }} />
        
        <div className="relative z-10 flex items-start gap-6">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center font-serif text-2xl font-bold text-white shadow-md shrink-0" style={{ backgroundColor: subject.color }}>
            {subject.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
              <h1 className="font-serif text-3xl font-bold tracking-tight">{subject.name}</h1>
              <span className="text-muted-foreground font-medium">{subject.code}</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 mt-4 text-sm">
              <div className="flex-1 min-w-[200px] max-w-md">
                <div className="flex justify-between mb-1.5">
                  <span className="text-muted-foreground font-medium">Syllabus Coverage</span>
                  <span className="font-bold">{subject.syllabusProgress}%</span>
                </div>
                <Progress 
                  value={subject.syllabusProgress} 
                  className="h-2 bg-secondary"
                  indicatorClassName="bg-current"
                  style={{ color: subject.color }}
                />
              </div>
              <div className="flex items-center gap-4 border-l pl-6 py-1">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Tasks</p>
                  <p className="font-bold text-base">{subject.upcomingTasksCount} <span className="text-muted-foreground text-xs font-normal">pending</span></p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Latest Score</p>
                  <p className="font-bold text-base">{subject.recentPaperScore !== null ? `${subject.recentPaperScore}%` : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-transparent border-b h-auto p-0 gap-6 w-full justify-start overflow-x-auto rounded-none mb-6">
          <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 pt-2 font-medium">Overview</TabsTrigger>
          <TabsTrigger value="syllabus" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 pt-2 font-medium">Syllabus</TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 pt-2 font-medium">Tasks ({pendingTasks.length})</TabsTrigger>
          <TabsTrigger value="performance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 pt-2 font-medium">Performance</TabsTrigger>
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
              
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-lg">Upcoming Tasks</CardTitle>
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
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-lg">Stats</CardTitle>
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
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">Syllabus Progress</CardTitle>
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
                              onClick={() => cycleTopicStatus(topic.id, topic.status)}
                              className="mt-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full shrink-0"
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
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">Subject Tasks</CardTitle>
            </CardHeader>
            <CardContent className="p-0 border-t">
              {!tasks || tasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No tasks for this subject.</div>
              ) : (
                <div className="divide-y">
                  {tasks.map(task => (
                    <div key={task.id} className={cn("p-4 flex items-center justify-between hover:bg-muted/30", task.completed && "opacity-60")}>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className={cn("h-5 w-5", task.completed ? "text-primary" : "text-muted-foreground/30")} />
                        <div>
                          <p className={cn("text-sm font-medium", task.completed && "line-through text-muted-foreground")}>{task.title}</p>
                          {task.topicTitle && <p className="text-xs text-muted-foreground">{task.topicTitle}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2 text-xs">
                        {task.estimatedMinutes && <span className="flex items-center text-muted-foreground"><Clock className="h-3 w-3 mr-1" /> {task.estimatedMinutes}m</span>}
                        {task.deadline && <span className="text-muted-foreground">{format(parseISO(task.deadline), "MMM d")}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">Score Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {!performance || performance.trend.length < 2 ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <TrendingUp className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">Log at least two papers to see your trend.</p>
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performance.trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 12 }} dy={10} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 12 }} dx={-10} tickFormatter={(v) => `${v}%`} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }}
                        itemStyle={{ color: 'var(--foreground)' }}
                        formatter={(value: number) => [`${value}%`, 'Score']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="percentage" 
                        stroke={subject.color} 
                        strokeWidth={3}
                        dot={{ r: 4, fill: subject.color, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: subject.color, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">Component Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0 border-t">
              {!performance || performance.componentBreakdown.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">No component data.</div>
              ) : (
                <table className="w-full text-sm text-left">
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
