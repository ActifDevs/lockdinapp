import { useGetProgressOverview, getGetProgressOverviewQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, AlertCircle, BarChart2, BookOpen } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function ProgressPage() {
  const { data: progress, isLoading } = useGetProgressOverview({
    query: { queryKey: getGetProgressOverviewQueryKey() }
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!progress) return null;

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Progress Overview</h1>
        <p className="text-muted-foreground mt-2">Bird's-eye view of your revision status and areas needing attention.</p>
      </div>

      {/* High-level metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground shadow-md border-transparent">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-primary-foreground/80 font-medium text-sm">Overall Syllabus</p>
                <p className="text-4xl font-bold tracking-tight">{progress.overallSyllabusProgress}%</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Target className="h-6 w-6 text-white" />
              </div>
            </div>
            <Progress 
              value={progress.overallSyllabusProgress} 
              className="h-1.5 mt-6 bg-primary-foreground/20" 
              indicatorClassName="bg-white"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-muted-foreground font-medium text-sm">Tasks Completed</p>
                <p className="text-4xl font-bold tracking-tight">{progress.totalTasksCompleted}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-6">Across all subjects</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-muted-foreground font-medium text-sm">Papers Logged</p>
                <p className="text-4xl font-bold tracking-tight">{progress.totalPapersLogged}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-6">Track record is growing</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-muted-foreground" />
              Activity (Last 7 Days)
            </CardTitle>
            <CardDescription>Number of tasks completed per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progress.weeklyTasksCompleted} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 12 }} allowDecimals={false} />
                  <RechartsTooltip 
                    cursor={{ fill: 'currentColor', opacity: 0.05 }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
                    formatter={(value) => [value, 'Tasks']}
                  />
                  <Bar dataKey="tasksCompleted" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card className="border-orange-200 dark:border-orange-900/50 bg-orange-50/30 dark:bg-orange-950/10">
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2 text-orange-800 dark:text-orange-500">
              <AlertCircle className="h-5 w-5" />
              Needs Attention
            </CardTitle>
            <CardDescription>Subjects falling behind in syllabus coverage or scores</CardDescription>
          </CardHeader>
          <CardContent>
            {progress.subjectAttentionNeeded.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>All subjects are on track! Keep up the good work.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {progress.subjectAttentionNeeded.map(item => (
                  <div key={item.subjectId} className="bg-card border rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.subjectColor }} />
                      <h4 className="font-semibold text-sm">{item.subjectName}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{item.reason}</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium">{item.syllabusProgress}% syllabus</span>
                      <Button variant="link" size="sm" className="h-auto p-0 text-orange-600 dark:text-orange-500" asChild>
                        <Link href={`/subjects/${item.subjectId}`}>Focus on this</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completion by Subject */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Syllabus Breakdown</CardTitle>
            <CardDescription>Coverage percentage per subject</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {progress.syllabusCompletion.map(subject => (
              <div key={subject.subjectId} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.subjectColor }} />
                    <span className="font-medium">{subject.subjectName}</span>
                  </div>
                  <span className="font-semibold">{subject.syllabusProgress}%</span>
                </div>
                <Progress 
                  value={subject.syllabusProgress} 
                  className="h-2 bg-secondary"
                  indicatorClassName="bg-current"
                  style={{ color: subject.subjectColor }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
