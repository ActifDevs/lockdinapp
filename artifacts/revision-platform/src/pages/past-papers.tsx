import {
  useListPastPaperAttempts,
  getListPastPaperAttemptsQueryKey,
  useListCurrentUserSubjects,
  getListCurrentUserSubjectsQueryKey,
  useListAssessmentComponents,
  getListAssessmentComponentsQueryKey,
  useListSubjectAssessmentRoutes,
  getListSubjectAssessmentRoutesQueryKey,
  useCreatePastPaperAttempt,
  useDeletePastPaperAttempt,
  getGetDashboardSummaryQueryKey,
  getGetProgressOverviewQueryKey,
  getGetSubjectPerformanceQueryKey,
} from "@workspace/api-client-react";
import { PastPaperAttemptInputSession } from "@workspace/api-client-react";
import { useState, lazy, Suspense, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DialogFooter } from "@/components/ui/dialog";
import { ResponsiveFormPanel } from "@/components/responsive-form-panel";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { RichEmptyState } from "@/components/rich-empty-state";
import { PageHeader } from "@/components/page-header";
import { Plus, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { resolveSubjectAccent } from "@/lib/subject-accent";
import { formatPercentage } from "@/lib/format-percentage";
import { buildAssessmentComponentOptions } from "@/lib/assessment-component-options";
import { filterComponentsByRouteDefault } from "@/lib/route-selection";
import { ReadStateNotice } from "@/components/read-state-notice";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { getMutationErrorMessage } from "@/lib/query-error-message";
import { useSearchParams } from "wouter";
import {
  omitDefaultQueryValue,
  updateQueryParams,
} from "@/lib/navigation-query-state";

const ScoreTrendLineChart = lazy(
  () => import("@/components/charts/score-trend-line-chart"),
);

const SESSIONS = Object.values(PastPaperAttemptInputSession);
const VARIANTS = [1, 2, 3, 4, 5];
const NO_VARIANT = "none";

const paperSchema = z
  .object({
    subjectId: z.coerce.number().min(1, "Subject is required"),
    componentId: z.coerce.number().min(1, "Component is required"),
    variant: z.string().default(NO_VARIANT),
    session: z.string().min(1, "Session is required"),
    year: z.coerce
      .number()
      .int()
      .min(1000, "Enter a four-digit year")
      .max(9999, "Enter a four-digit year"),
    score: z.coerce.number().min(0, "Score cannot be negative"),
    totalMarks: z.coerce.number().min(1, "Total marks must be > 0"),
    dateAttempted: z.string().min(1, "Date is required"),
    timeTakenMinutes: z.coerce.number().optional().or(z.literal("")),
    notes: z.string().optional(),
  })
  .refine((data) => data.score <= data.totalMarks, {
    message: "Score cannot exceed total marks",
    path: ["score"],
  });

type PaperFormValues = z.infer<typeof paperSchema>;

export default function PastPapers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: memberships,
    isLoading: membershipsLoading,
    isError: membershipsError,
    refetch: refetchMemberships,
  } = useListCurrentUserSubjects({
    query: { queryKey: getListCurrentUserSubjectsQueryKey() },
  });
  const subjects = memberships?.map((membership) => membership.subject);
  const membershipsAuthoritative =
    memberships !== undefined && !membershipsLoading && !membershipsError;
  const rawSubjectValues = searchParams.getAll("subject");
  const rawSubject = rawSubjectValues[0] ?? null;
  const currentSubjectIds = new Set(
    subjects?.map((subject) => subject.id) ?? [],
  );
  const validCurrentSubject =
    membershipsAuthoritative &&
    rawSubjectValues.length === 1 &&
    rawSubject !== null &&
    /^[1-9]\d*$/.test(rawSubject) &&
    currentSubjectIds.has(Number(rawSubject));
  const filterSubject = validCurrentSubject ? rawSubject : "all";
  const filterNeedsNormalization =
    membershipsAuthoritative &&
    rawSubjectValues.length > 0 &&
    !(rawSubjectValues.length === 1 && rawSubject === "all") &&
    !validCurrentSubject;
  const canLogPaper =
    !membershipsLoading && !membershipsError && (subjects?.length ?? 0) > 0;

  const {
    data: papers,
    isLoading,
    isError: attemptsError,
    error: attemptsLoadError,
    refetch: refetchAttempts,
  } = useListPastPaperAttempts(
    filterSubject !== "all" ? { subjectId: Number(filterSubject) } : {},
    {
      query: {
        queryKey: getListPastPaperAttemptsQueryKey(
          filterSubject !== "all" ? { subjectId: Number(filterSubject) } : {},
        ),
      },
    },
  );

  const createAttempt = useCreatePastPaperAttempt({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListPastPaperAttemptsQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetDashboardSummaryQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetProgressOverviewQueryKey(),
        });
        const subjectId = form.getValues("subjectId");
        if (subjectId) {
          queryClient.invalidateQueries({
            queryKey: getGetSubjectPerformanceQueryKey(subjectId),
          });
        }
        setIsAddDialogOpen(false);
        form.reset();
      },
    },
  });

  const deleteAttempt = useDeletePastPaperAttempt({
    mutation: {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: getListPastPaperAttemptsQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetDashboardSummaryQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetProgressOverviewQueryKey(),
        });
        const subjectId = papers?.find(
          (paper) => paper.id === variables.pastPaperAttemptId,
        )?.subjectId;
        if (subjectId) {
          queryClient.invalidateQueries({
            queryKey: getGetSubjectPerformanceQueryKey(subjectId),
          });
        }
      },
      onError: (error) => {
        toast({
          title: "Could not delete attempt",
          description: getMutationErrorMessage(error),
          variant: "destructive",
        });
      },
    },
  });

  const form = useForm<PaperFormValues>({
    resolver: zodResolver(paperSchema),
    defaultValues: {
      variant: NO_VARIANT,
      session: "",
      year: "" as unknown as number,
      dateAttempted: new Date().toISOString().split("T")[0],
      timeTakenMinutes: "",
      notes: "",
    },
  });

  const selectedSubjectId = form.watch("subjectId");
  const selectedSession = form.watch("session");

  const {
    data: components,
    isPending: componentsLoading,
    isError: componentsError,
    error: componentsLoadError,
    refetch: refetchComponents,
  } = useListAssessmentComponents(selectedSubjectId, {
    query: {
      queryKey: getListAssessmentComponentsQueryKey(selectedSubjectId),
      enabled: !!selectedSubjectId,
    },
  });

  const selectedMembership = (memberships ?? []).find(
    (row) => row.subject.id === selectedSubjectId,
  );
  const {
    data: routeCatalogue,
  } = useListSubjectAssessmentRoutes(
    selectedSubjectId,
    selectedMembership?.syllabusVersion.id ?? 0,
    {
      query: {
        queryKey: getListSubjectAssessmentRoutesQueryKey(
          selectedSubjectId,
          selectedMembership?.syllabusVersion.id ?? 0,
        ),
        enabled:
          !!selectedSubjectId &&
          !!selectedMembership?.syllabusVersion.id &&
          selectedMembership.assessmentRouteId != null,
      },
    },
  );
  const routeComponentIds =
    routeCatalogue?.routes.find(
      (route) => route.id === selectedMembership?.assessmentRouteId,
    )?.components.map((component) => component.componentId) ?? null;
  const routeFiltered = filterComponentsByRouteDefault(
    components ?? [],
    routeComponentIds,
  );
  const componentOptions = buildAssessmentComponentOptions([
    ...routeFiltered.defaults,
    ...routeFiltered.offRoute,
  ]);
  const offRouteComponentIds = new Set(
    routeFiltered.offRoute.map((component) => component.id),
  );
  const selectedComponentId = form.watch("componentId");
  const selectingOffRoute =
    routeFiltered.hasRouteFilter &&
    typeof selectedComponentId === "number" &&
    offRouteComponentIds.has(selectedComponentId);
  const attemptsRefreshFailed = attemptsError && papers !== undefined;
  const componentsRefreshFailed = componentsError && components !== undefined;
  const canSelectComponent =
    !!selectedSubjectId &&
    !componentsLoading &&
    (!componentsError || components !== undefined) &&
    componentOptions.length > 0;

  useEffect(() => {
    if (!filterNeedsNormalization) return;
    setSearchParams(
      (current) => updateQueryParams(current, [["subject", null]]),
      { replace: true },
    );
  }, [filterNeedsNormalization, setSearchParams]);

  const handleFilterSubjectChange = (value: string) => {
    if (
      value !== "all" &&
      !subjects?.some((subject) => subject.id.toString() === value)
    ) {
      return;
    }
    setSearchParams(
      (current) =>
        updateQueryParams(current, [
          ["subject", omitDefaultQueryValue(value, "all")],
        ]),
      { replace: false },
    );
  };

  // Component belongs to a specific subject — clear it (and any dependent
  // variant/session selection) whenever the subject changes so a stale
  // component from a different subject can never be submitted.
  useEffect(() => {
    form.setValue("componentId", undefined as unknown as number);
  }, [selectedSubjectId]);

  useEffect(() => {
    if (!subjects) return;
    const subjectIds = new Set(subjects.map((subject) => subject.id));
    const formSubjectId = form.getValues("subjectId");
    if (formSubjectId && !subjectIds.has(Number(formSubjectId))) {
      form.setValue("subjectId", undefined as unknown as number);
      form.setValue("componentId", undefined as unknown as number);
    }
  }, [subjects, form]);

  const onSubmit = (data: PaperFormValues) => {
    createAttempt.mutate({
      data: {
        subjectId: data.subjectId,
        componentId: data.componentId,
        variant: data.variant !== NO_VARIANT ? Number(data.variant) : undefined,
        session: data.session as PastPaperAttemptInputSession,
        year: data.year,
        score: data.score,
        totalMarks: data.totalMarks,
        dateAttempted: data.dateAttempted,
        timeTakenMinutes: data.timeTakenMinutes
          ? Number(data.timeTakenMinutes)
          : undefined,
        notes: data.notes || undefined,
      },
    });
  };

  // Prepare chart data: group by date across all papers or filtered
  const chartData =
    papers
      ?.slice()
      .reverse()
      .map((p) => ({
        name: `${p.session} ${p.year}`,
        date: format(parseISO(p.dateAttempted), "MMM d"),
        percentage: p.percentage,
        subject: p.subjectName,
        color: p.subjectColor,
      })) || [];

  return (
    <div className="app-page animate-in fade-in duration-300">
      <PageHeader
        title="Past papers"
        subtitle="Log timed attempts to unlock trends, predicted grades, and sharper focus."
        action={
          <Button
            onClick={() => {
              createAttempt.reset();
              setIsAddDialogOpen(true);
            }}
            disabled={!canLogPaper}
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden /> Log paper
          </Button>
        }
      />

      {membershipsError ? (
        <div className="dash-insight-card card-tint-cream" role="alert">
          <p className="font-semibold">
            We couldn't load your current subjects.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void refetchMemberships()}
          >
            Try again
          </Button>
        </div>
      ) : !membershipsLoading && subjects?.length === 0 ? (
        <div className="dash-insight-card card-tint-cream">
          <RichEmptyState
            scene="books"
            title="Choose a subject before logging papers"
            description="Your historical paper log remains available. Add a current subject to log a new attempt."
            actionLabel="Choose subjects in Settings"
            actionHref="/settings?tab=subjects"
            variant="mint"
          />
        </div>
      ) : null}

      {attemptsError && papers === undefined && (
        <ReadStateNotice
          title="Past papers could not be loaded"
          error={attemptsLoadError}
          description="Your paper history and performance trend are unavailable. Logging remains available when its subject data is ready."
          onRetry={() => void refetchAttempts()}
        />
      )}
      {attemptsRefreshFailed && (
        <ReadStateNotice
          stale
          title="Paper history refresh failed"
          error={attemptsLoadError}
          onRetry={() => void refetchAttempts()}
        />
      )}

      {!(attemptsError && papers === undefined) && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="card-tint-cream lg:col-span-3 shadow-[var(--elev-2)]">
            <CardHeader className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-bold tracking-[-0.01em]">
                  Performance trend
                </CardTitle>
                <CardDescription>Percentage scores over time</CardDescription>
              </div>
              <div className="w-full sm:w-[180px]">
                <Select
                  value={filterSubject}
                  onValueChange={handleFilterSubjectChange}
                  disabled={membershipsLoading || membershipsError}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects?.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {chartData.length < 2 ? (
                <RichEmptyState
                  scene="chart"
                  title="Start your paper bank"
                  description="Log at least two past papers to unlock score trends and see which subjects are rising."
                  actionLabel="Log a paper"
                  onAction={
                    canLogPaper ? () => setIsAddDialogOpen(true) : undefined
                  }
                  variant="mint"
                  className="py-10"
                />
              ) : (
                <div className="mt-4">
                  <Suspense
                    fallback={<ChartSkeleton height={300} className="mt-4" />}
                  >
                    <ScoreTrendLineChart
                      data={chartData}
                      xKey="name"
                      stroke="hsl(var(--semantic-progress))"
                      height={300}
                      tooltipLabelFormatter={(label, items) => {
                        const payload = items[0]?.payload as
                          { subject?: string; date?: string } | undefined;
                        if (payload?.subject && payload?.date) {
                          return `${payload.subject} - ${label} (${payload.date})`;
                        }
                        return label;
                      }}
                    />
                  </Suspense>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-tint-cream lg:col-span-3 shadow-[var(--elev-2)]">
            <CardHeader>
              <CardTitle className="text-lg font-bold tracking-[-0.01em]">
                Paper log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="dash-skeleton h-12 rounded-xl" />
                  ))}
                </div>
              ) : !papers || papers.length === 0 ? (
                <RichEmptyState
                  scene="papers"
                  title="Start building your paper bank"
                  description="Every timed paper you log sharpens predicted grades and shows where to focus next."
                  actionLabel="Log your first paper"
                  onAction={
                    canLogPaper ? () => setIsAddDialogOpen(true) : undefined
                  }
                  variant="mint"
                />
              ) : (
                <>
                  <div className="mobile-card-list">
                    {papers.map((paper) => {
                      const accent = resolveSubjectAccent({
                        name: paper.subjectName,
                        color: paper.subjectColor,
                      });
                      return (
                        <div key={paper.id} className="mobile-card-row">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className="border-0 font-medium"
                                style={{
                                  backgroundColor: `${accent}18`,
                                  color: accent,
                                }}
                              >
                                {paper.subjectName}
                              </Badge>
                              <span className="text-sm font-semibold">
                                {paper.paperLabel}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {paper.componentName ?? "Component removed"}
                            </p>
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <span className="text-lg font-bold tabular">
                                {formatPercentage(paper.percentage)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {paper.score}/{paper.totalMarks} marks
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(
                                  parseISO(paper.dateAttempted),
                                  "d MMM yyyy",
                                )}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 shrink-0 self-end text-muted-foreground hover:text-destructive sm:self-center"
                            aria-label={`Delete paper: ${paper.subjectName} ${paper.paperLabel}`}
                            onClick={() =>
                              deleteAttempt.mutate({
                                pastPaperAttemptId: paper.id,
                              })
                            }
                          >
                            <Trash2
                              className="h-4 w-4"
                              aria-hidden
                              strokeWidth={2}
                            />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                        <tr>
                          <th className="px-6 py-3 font-medium">Subject</th>
                          <th className="px-6 py-3 font-medium">Paper</th>
                          <th className="px-6 py-3 font-medium">Session</th>
                          <th className="px-6 py-3 font-medium">Score</th>
                          <th className="px-6 py-3 font-medium">Date</th>
                          <th className="px-6 py-3 text-right font-medium">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y border-b">
                        {papers.map((paper) => {
                          const accent = resolveSubjectAccent({
                            name: paper.subjectName,
                            color: paper.subjectColor,
                          });
                          return (
                            <tr
                              key={paper.id}
                              className="bg-card hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <Badge
                                  variant="outline"
                                  className="border-0 font-medium"
                                  style={{
                                    backgroundColor: `${accent}18`,
                                    color: accent,
                                  }}
                                >
                                  {paper.subjectName}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 font-medium">
                                <div>{paper.paperLabel}</div>
                                <div className="text-xs text-muted-foreground">
                                  {paper.componentName ?? "Component removed"}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground">
                                {paper.session} {paper.year}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-base tabular">
                                    {formatPercentage(paper.percentage)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({paper.score}/{paper.totalMarks})
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                {format(
                                  parseISO(paper.dateAttempted),
                                  "d MMM yyyy",
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-11 w-11 text-muted-foreground hover:text-destructive"
                                  aria-label={`Delete paper: ${paper.subjectName} ${paper.paperLabel}`}
                                  onClick={() =>
                                    deleteAttempt.mutate({
                                      pastPaperAttemptId: paper.id,
                                    })
                                  }
                                >
                                  <Trash2
                                    className="h-4 w-4"
                                    aria-hidden
                                    strokeWidth={2}
                                  />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ResponsiveFormPanel
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) createAttempt.reset();
        }}
        title="Log past paper attempt"
        description="Record your score to track your progress."
        className="sm:max-w-[500px]"
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-2"
          >
            {createAttempt.isError && (
              <Alert variant="destructive">
                <AlertTitle>Could not log attempt</AlertTitle>
                <p>{getMutationErrorMessage(createAttempt.error)}</p>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value?.toString() ?? ""}
                    disabled={!canLogPaper}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects?.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="componentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Component</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value?.toString() ?? ""}
                    disabled={!canSelectComponent}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedSubjectId
                              ? "Select a subject first"
                              : componentsLoading
                                ? "Loading components…"
                                : componentsError && components === undefined
                                  ? "Components unavailable"
                                  : componentOptions.length === 0
                                    ? "No components available"
                                    : "Select a component"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {componentOptions.map((component) => (
                        <SelectItem key={component.id} value={component.value}>
                          {component.label}
                          {offRouteComponentIds.has(component.id)
                            ? " (off-route)"
                            : routeFiltered.hasRouteFilter
                              ? ""
                              : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectingOffRoute ? (
                    <Alert className="mt-2">
                      <AlertTitle>
                        This paper is outside your assessment route. Logging it
                        will not change your route or syllabus.
                      </AlertTitle>
                    </Alert>
                  ) : null}
                  {!!selectedSubjectId && componentsLoading && (
                    <p role="status" className="text-sm text-muted-foreground">
                      Loading assessment components…
                    </p>
                  )}
                  {!!selectedSubjectId &&
                    componentsError &&
                    components === undefined && (
                      <ReadStateNotice
                        compact
                        title="Components could not be loaded"
                        error={componentsLoadError}
                        onRetry={() => void refetchComponents()}
                      />
                    )}
                  {!!selectedSubjectId && componentsRefreshFailed && (
                    <ReadStateNotice
                      stale
                      compact
                      title="Component refresh failed"
                      error={componentsLoadError}
                      onRetry={() => void refetchComponents()}
                    />
                  )}
                  {!!selectedSubjectId &&
                    !componentsLoading &&
                    !componentsError &&
                    components?.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No assessment components are available for this subject.
                      </p>
                    )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="form-grid-2">
              <FormField
                control={form.control}
                name="session"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a session" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SESSIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="variant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variant (optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={
                        selectedSession ===
                        PastPaperAttemptInputSession.Specimen
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_VARIANT}>None</SelectItem>
                        {VARIANTS.map((v) => (
                          <SelectItem key={v} value={v.toString()}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paper Year</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1000}
                      max={9999}
                      placeholder="2024"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="form-grid-2">
              <FormField
                control={form.control}
                name="score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score Achieved</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalMarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Marks</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="75" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch("score") !== undefined &&
              form.watch("totalMarks") &&
              Number(form.watch("totalMarks")) > 0 && (
                <div className="bg-muted p-3 rounded-md flex justify-between items-center text-sm border">
                  <span>Calculated Percentage:</span>
                  <span className="font-semibold">
                    {Math.round(
                      (Number(form.watch("score")) /
                        Number(form.watch("totalMarks"))) *
                        100,
                    )}
                    %
                  </span>
                </div>
              )}

            <div className="form-grid-2">
              <FormField
                control={form.control}
                name="dateAttempted"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Attempted</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timeTakenMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Taken (mins)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  createAttempt.reset();
                  setIsAddDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAttempt.isPending || !canSelectComponent}
              >
                {createAttempt.isPending ? "Logging..." : "Log Paper"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </ResponsiveFormPanel>
    </div>
  );
}
