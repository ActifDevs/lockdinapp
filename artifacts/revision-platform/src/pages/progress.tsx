import { lazy, Suspense } from "react";
import { useGetProgressOverview, getGetProgressOverviewQueryKey } from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";
import { ProgressRing } from "@/components/progress-ring";
import { RichEmptyState } from "@/components/rich-empty-state";
import { InsightCard } from "@/components/insight-card";
import { PageHeader } from "@/components/page-header";
import { AlertCircle, BarChart2, CheckCircle2, FileText } from "lucide-react";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { getQueryErrorMessage } from "@/lib/query-error-message";
import { resolveSubjectAccent } from "@/lib/subject-accent";

const WeeklyActivityBarChart = lazy(
  () => import("@/components/charts/weekly-activity-bar-chart"),
);

export default function ProgressPage() {
  const {
    data: progress,
    isPending,
    isError,
    error,
    refetch,
  } = useGetProgressOverview({
    query: { queryKey: getGetProgressOverviewQueryKey() },
  });

  if (isPending) {
    return (
      <div className="app-page animate-pulse">
        <div className="dash-skeleton h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="dash-skeleton h-40 rounded-[var(--surface-radius)] md:col-span-7" />
          <div className="grid gap-4 sm:grid-cols-2 md:col-span-5 md:grid-cols-1">
            <div className="dash-skeleton h-[4.5rem] rounded-[var(--surface-radius)]" />
            <div className="dash-skeleton h-[4.5rem] rounded-[var(--surface-radius)]" />
          </div>
        </div>
        <div className="dash-skeleton h-96 rounded-[var(--surface-radius)]" />
      </div>
    );
  }

  if (isError || !progress) {
    return (
      <div className="app-page">
        <PageHeader
          title="Progress overview"
          subtitle="Syllabus coverage, activity, and subjects that need your next session."
        />
        <div className="dash-panel flex min-h-[40vh] flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Could not load progress</h2>
          <p className="max-w-md text-center text-muted-foreground">
            {getQueryErrorMessage(error)}
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page animate-in fade-in duration-300">
      <PageHeader
        title="Progress overview"
        subtitle="Syllabus coverage, activity, and subjects that need your next session."
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
        <div className="dash-stat-card p-6 md:col-span-7 md:p-8">
          <p className="card-label">Overall syllabus</p>
          <p className="mt-2 text-4xl font-bold tabular tracking-tight text-[hsl(var(--semantic-progress))] md:text-5xl">
            {progress.overallSyllabusProgress}%
          </p>
          <Progress
            value={progress.overallSyllabusProgress}
            className="mt-6"
            indicatorClassName="bg-[hsl(var(--semantic-progress))]"
          />
          <p className="mt-3 text-sm text-muted-foreground">Coverage across all active subjects</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:col-span-5 md:grid-cols-1">
          <div className="dash-stat-card">
            <div className="flex items-center gap-2">
              <span className="dash-stat-icon dash-stat-icon-primary" aria-hidden>
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--semantic-complete))]" strokeWidth={2} />
              </span>
              <p className="card-label">Tasks completed</p>
            </div>
            <p className="mt-3 stat-value dash-stat-value-xp text-[hsl(var(--semantic-progress))]">
              {progress.totalTasksCompleted}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Across all subjects</p>
          </div>
          <div className="dash-stat-card">
            <div className="flex items-center gap-2">
              <span className="dash-stat-icon dash-stat-icon-primary" aria-hidden>
                <FileText className="h-4 w-4 text-[hsl(var(--semantic-progress))]" strokeWidth={2} />
              </span>
              <p className="card-label">Papers logged</p>
            </div>
            <p className="mt-3 stat-value text-[hsl(var(--semantic-progress))]">
              {progress.totalPapersLogged}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Past-paper trail</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <InsightCard
          className="lg:col-span-2"
          tint="cream"
          title={
            <span className="flex items-center gap-2">
              <BarChart2 className="dash-icon-progress h-4 w-4" aria-hidden strokeWidth={2} />
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
          className="dash-insight-emphasis"
          tint="coral"
          title={
            <span className="flex items-center gap-2">
              <AlertCircle className="dash-icon-attention h-4 w-4" aria-hidden strokeWidth={2} />
              Needs attention
            </span>
          }
        >
          {progress.subjectAttentionNeeded.length === 0 ? (
            <RichEmptyState
              scene="calm"
              title="All subjects on track"
              description="Nothing flagged right now. Keep logging papers and clearing syllabus topics."
              variant="mint"
              className="py-8"
            />
          ) : (
            <div className="dash-list-rows">
              {progress.subjectAttentionNeeded.map((item) => {
                const accent = resolveSubjectAccent({
                  name: item.subjectName,
                  color: item.subjectColor,
                });
                return (
                  <div key={item.subjectId} className="dash-list-row !items-start">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: accent }}
                          aria-hidden
                        />
                        <h4 className="text-sm font-semibold">{item.subjectName}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.reason}</p>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium tabular text-muted-foreground">
                          {item.syllabusProgress}% syllabus
                        </span>
                        <Button variant="link" size="sm" className="h-auto p-0" asChild>
                          <Link href={`/subjects/${item.subjectId}`}>Focus on this</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </InsightCard>

        <InsightCard title="Syllabus breakdown" tint="cream">
          <p className="mb-4 text-sm text-muted-foreground">Coverage percentage per subject</p>
          <div className="space-y-3">
            {progress.syllabusCompletion.map((subject) => {
              const accent = resolveSubjectAccent({
                name: subject.subjectName,
                color: subject.subjectColor,
              });
              return (
                <div
                  key={subject.subjectId}
                  className="flex items-center gap-4 rounded-xl border border-border/50 bg-muted/25 p-3"
                >
                  <ProgressRing
                    value={subject.syllabusProgress}
                    label={subject.subjectName}
                    color={accent}
                    size={44}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{subject.subjectName}</p>
                    <p className="text-xs text-muted-foreground tabular">
                      {subject.syllabusProgress}% covered
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </InsightCard>
      </div>
    </div>
  );
}
