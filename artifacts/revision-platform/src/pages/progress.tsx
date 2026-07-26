import { useGetProgressOverview, getGetProgressOverviewQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, BarChart2 } from "lucide-react";
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
          <div className="h-40 bg-muted rounded-xl md:col-span-2" />
          <div className="space-y-6">
            <div className="h-[4.5rem] bg-muted rounded-xl" />
            <div className="h-[4.5rem] bg-muted rounded-xl" />
          </div>
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

      {/* High-level metrics — asymmetric, not three equal cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="rounded-xl bg-primary p-6 text-primary-foreground shadow-md md:col-span-7 md:p-8">
          <p className="text-sm font-medium text-primary-foreground/80">Overall syllabus</p>
          <p className="mt-2 font-serif text-5xl font-bold tracking-tight tabular md:text-6xl">
            {progress.overallSyllabusProgress}%
          </p>
          <Progress
            value={progress.overallSyllabusProgress}
            className="mt-8 h-1.5 bg-primary-foreground/20"
            indicatorClassName="bg-white"
          />
          <p className="mt-3 text-sm text-primary-foreground/70">Coverage across all active subjects</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 md:col-span-5 md:grid-cols-1">
          <div className="rounded-xl border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Tasks completed</p>
            <p className="mt-2 font-serif text-4xl font-bold tracking-tight tabular">
              {progress.totalTasksCompleted}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Across all subjects</p>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Papers logged</p>
            <p className="mt-2 font-serif text-4xl font-bold tracking-tight tabular">
              {progress.totalPapersLogged}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Past-paper trail</p>
          </div>
        </div>
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
        <Card className="border-border bg-secondary/40">
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              Needs attention
            </CardTitle>
            <CardDescription>Subjects falling behind in syllabus coverage or scores</CardDescription>
          </CardHeader>
          <CardContent>
            {progress.subjectAttentionNeeded.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>All subjects are on track.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {progress.subjectAttentionNeeded.map(item => (
                  <div key={item.subjectId} className="bg-card border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.subjectColor }} />
                      <h4 className="font-semibold text-sm">{item.subjectName}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{item.reason}</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium tabular">{item.syllabusProgress}% syllabus</span>
                      <Button variant="link" size="sm" className="h-auto p-0" asChild>
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
                  <span className="font-semibold tabular">{subject.syllabusProgress}%</span>
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
