import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useUpdateTask, Task } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Calendar,
  TrendingUp,
  Plus,
  Flame,
} from "lucide-react";
import { format, isTomorrow } from "date-fns";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const { firstName } = useAuth();
  const queryClient = useQueryClient();
  const { data: summary, isLoading, isError } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      },
    },
  });

  const toggleTaskComplete = (task: Task) => {
    updateTask.mutate({
      taskId: task.id,
      data: { completed: !task.completed },
    });
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !summary) {
    return (
      <div className="flex h-[50vh] items-center justify-center flex-col gap-4 text-center">
        <h2 className="font-serif text-2xl">Could not load dashboard</h2>
        <p className="text-muted-foreground">Please check your connection and try again.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const tasksRemaining = summary.todayTasksTotal - summary.todayTasksCompleted;
  const displayName = firstName || summary.studentName;

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {displayName}.
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            {tasksRemaining === 0 
              ? "You've completed all your tasks for today."
              : `You have ${tasksRemaining} task${tasksRemaining === 1 ? '' : 's'} remaining today.`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2 text-sm font-medium text-foreground">
            <Flame className="h-4 w-4 text-primary" aria-hidden />
            <span className="tabular">{summary.studyStreakDays}-day streak</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1 hover:bg-primary/5 hover:border-primary/30 cursor-pointer" asChild>
              <Link href="/study-plan">
                <Plus className="h-4 w-4" aria-hidden />
                <span className="text-xs">Add Task</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1 hover:bg-primary/5 hover:border-primary/30 cursor-pointer" asChild>
              <Link href="/past-papers">
                <FileText className="h-4 w-4" aria-hidden />
                <span className="text-xs">Log Paper</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1 hover:bg-primary/5 hover:border-primary/30 cursor-pointer" asChild>
              <Link href="/subjects">
                <TrendingUp className="h-4 w-4" aria-hidden />
                <span className="text-xs">View Syllabus</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1 hover:bg-primary/5 hover:border-primary/30 cursor-pointer" asChild>
              <Link href="/calendar">
                <Calendar className="h-4 w-4" aria-hidden />
                <span className="text-xs">Calendar</span>
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif text-xl">Today's Tasks</CardTitle>
                <div className="text-sm text-muted-foreground font-medium">
                  {summary.todayTasksCompleted} / {summary.todayTasksTotal} completed
                </div>
              </div>
              <Progress 
                value={summary.todayTasksTotal > 0 ? (summary.todayTasksCompleted / summary.todayTasksTotal) * 100 : 0} 
                className="h-1.5 mt-4" 
              />
            </CardHeader>
            <CardContent className="p-0">
              {summary.todayTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No tasks scheduled for today.</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link href="/study-plan">Plan your study session</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {summary.todayTasks.map(task => (
                    <div key={task.id} className="p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors group">
                      <button
                        type="button"
                        onClick={() => toggleTaskComplete(task)}
                        disabled={updateTask.isPending}
                        className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                        aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
                        aria-pressed={task.completed}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
                        ) : (
                          <Circle className="h-5 w-5" aria-hidden />
                        )}
                      </button>
                      <div className="flex-1 min-w-0 pt-2.5">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className={cn("text-sm font-medium leading-none truncate", task.completed && "text-muted-foreground line-through")}>
                            {task.title}
                          </p>
                          {task.estimatedMinutes && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                              <Clock className="h-3 w-3" aria-hidden /> {task.estimatedMinutes}m
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] h-5 rounded-sm border-0 font-medium" style={{ backgroundColor: `${task.subjectColor}15`, color: task.subjectColor }}>
                            {task.subjectName}
                          </Badge>
                          {task.topicTitle && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{task.topicTitle}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {summary.upcomingDeadlines.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="font-serif text-xl flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" aria-hidden /> 
                  Approaching Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {summary.upcomingDeadlines.map(task => {
                    const date = new Date(task.deadline!);
                    const isTaskTomorrow = isTomorrow(date);
                    return (
                      <div key={task.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.subjectColor }} aria-hidden />
                          <div>
                            <p className="text-sm font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground">{task.subjectName}</p>
                          </div>
                        </div>
                        <Badge variant={isTaskTomorrow ? "destructive" : "secondary"}>
                          {isTaskTomorrow ? "Tomorrow" : format(date, "MMM d")}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-xl flex items-center justify-between">
                Syllabus Progress
                <Link href="/progress" className="text-sm font-sans font-normal text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                  View all <ArrowUpRight className="h-3 w-3" aria-hidden />
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {summary.subjectProgressSummary.map(subject => (
                <div key={subject.subjectId} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{subject.subjectName}</span>
                    <span className="text-muted-foreground tabular">{subject.syllabusProgress}%</span>
                  </div>
                  <Progress 
                    value={subject.syllabusProgress} 
                    className="h-1.5" 
                    indicatorClassName="bg-current"
                    style={{ color: subject.subjectColor }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-serif text-xl">Recent Papers</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.recentPerformance.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">No past papers logged yet.</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/past-papers">Log First Paper</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {summary.recentPerformance.map((perf, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: perf.subjectColor }} aria-hidden />
                          <span className="text-sm font-medium">{perf.subjectName}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{perf.paperCode}</span>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-base font-semibold tabular">{perf.latestPercentage}%</div>
                        {perf.change !== null && perf.change !== 0 && (
                          <div className={cn(
                            "text-xs flex items-center justify-end gap-0.5",
                            perf.change > 0 ? "text-green-600 dark:text-green-500" : "text-destructive"
                          )}>
                            {perf.change > 0 ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
                            {Math.abs(perf.change)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" aria-hidden /> Upcoming Exams
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary.upcomingExams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No exams scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {summary.upcomingExams.map(exam => {
                    const examDate = new Date(exam.date);
                    const daysAway = Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={exam.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{exam.subjectName}</p>
                          <p className="text-xs text-muted-foreground">{exam.paperCode}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{format(examDate, "MMM d")}</p>
                          <p className={cn("text-xs", daysAway <= 14 ? "text-destructive font-medium" : "text-muted-foreground")}>
                            in {daysAway} days
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 pb-8">
      <div className="flex justify-between items-end">
        <div className="space-y-3">
          <div className="h-10 w-64 bg-muted rounded animate-pulse" />
          <div className="h-5 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-muted rounded-full animate-pulse" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted rounded-md animate-pulse" />)}
          </div>
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
          <div className="h-48 bg-muted rounded-xl animate-pulse" />
        </div>
        <div className="space-y-6">
          <div className="h-72 bg-muted rounded-xl animate-pulse" />
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
