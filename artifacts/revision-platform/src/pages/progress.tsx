import { lazy, Suspense } from "react";
import { useGetProgressOverview, getGetProgressOverviewQueryKey } from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";
import { ProgressRing } from "@/components/progress-ring";
import { RichEmptyState } from "@/components/rich-empty-state";
import { InsightCard } from "@/components/insight-card";
import { AlertCircle, BarChart2 } from "lucide-react";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const WeeklyActivityBarChart = lazy(
  () => import("@/components/charts/weekly-activity-bar-chart"),
);

export default function ProgressPage() {
  const { data: progress, isLoading } = useGetProgressOverview({
    query: { queryKey: getGetProgressOverviewQueryKey() },
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 rounded bg-muted" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="h-40 rounded-xl bg-muted md:col-span-7" />
          <div className="grid gap-4 sm:grid-cols-2 md:col-span-5 md:grid-cols-1">
            <div className="h-[4.5rem] rounded-xl bg-muted" />
            <div className="h-[4.5rem] rounded-xl bg-muted" />
          </div>
        </div>
        <div className="h-96 rounded-xl bg-muted" />
      </div>
    );
  }

  if (!progress) return null;

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-300">
      <div>
        <h1 className="page-title">Progress overview</h1>
        <p className="page-subtitle">
          A bird&apos;s-eye view of syllabus coverage, activity, and subjects that need attention.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="hero-band md:col-span-7">
          <p className="hero-band-muted text-sm font-medium">Overall syllabus</p>
          <p className="hero-band-stat tabular">{progress.overallSyllabusProgress}%</p>
          <Progress
            value={progress.overallSyllabusProgress}
            className="mt-8 bg-primary-foreground/20"
            indicatorClassName="!bg-primary-foreground"
          />
          <p className="hero-band-muted mt-3 text-sm">Coverage across all active subjects</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:col-span-5 md:grid-cols-1">
          <div className="dash-stat-card">
            <p className="text-sm font-medium text-muted-foreground">Tasks completed</p>
            <p className="mt-2 text-4xl font-bold tabular tracking-tight text-primary">
              {progress.totalTasksCompleted}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Across all subjects</p>
          </div>
          <div className="dash-stat-card">
            <p className="text-sm font-medium text-muted-foreground">Papers logged</p>
            <p className="mt-2 text-4xl font-bold tabular tracking-tight text-primary">
              {progress.totalPapersLogged}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Past-paper trail</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InsightCard
          className="lg:col-span-2"
          tint="teal"
          title={
            <span className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" aria-hidden strokeWidth={2} />
              Activity (last 7 days)
            </span>
          }
        >
          <p className="mb-4 text-sm text-muted-foreground">Tasks completed per day</p>
          <Suspense fallback={<ChartSkeleton height={250} />}>
            <WeeklyActivityBarChart data={progress.weeklyTasksCompleted} height={250} />
          </Suspense>
        </InsightCard>

        <InsightCard
          tint="coral"
          title={
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" aria-hidden strokeWidth={2} />
              Needs attention
            </span>
          }
        >
          {progress.subjectAttentionNeeded.length === 0 ? (
            <RichEmptyState
              scene="calm"
              title="All subjects on track"
              description="Nothing flagged for attention right now. Keep logging papers and marking syllabus topics."
              variant="mint"
              className="py-8"
            />
          ) : (
            <div className="space-y-3">
              {progress.subjectAttentionNeeded.map((item) => (
                <div
                  key={item.subjectId}
                  className="rounded-xl border border-border/60 bg-muted/25 p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: item.subjectColor }}
                      aria-hidden
                    />
                    <h4 className="text-sm font-semibold">{item.subjectName}</h4>
                  </div>
                  <p className="mb-3 text-sm text-muted-foreground">{item.reason}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium tabular">{item.syllabusProgress}% syllabus</span>
                    <Button variant="link" size="sm" className="h-auto p-0" asChild>
                      <Link href={`/subjects/${item.subjectId}`}>Focus on this</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </InsightCard>

        <InsightCard title="Syllabus breakdown" tint="amber">
          <p className="mb-4 text-sm text-muted-foreground">Coverage percentage per subject</p>
          <div className="space-y-4">
            {progress.syllabusCompletion.map((subject) => (
              <div key={subject.subjectId} className="flex items-center gap-4 rounded-xl bg-muted/35 p-3">
                <ProgressRing
                  value={subject.syllabusProgress}
                  label={subject.subjectName}
                  color={subject.subjectColor}
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{subject.subjectName}</p>
                  <p className="text-xs text-muted-foreground tabular">{subject.syllabusProgress}% covered</p>
                </div>
              </div>
            ))}
          </div>
        </InsightCard>
      </div>
    </div>
  );
}
