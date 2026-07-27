import {
  useListPastPaperAttempts,
  getListPastPaperAttemptsQueryKey,
  useListSubjects,
  getListSubjectsQueryKey,
  useListAssessmentComponents,
  getListAssessmentComponentsQueryKey,
  useCreatePastPaperAttempt,
  useDeletePastPaperAttempt,
} from "@workspace/api-client-react";
import { PastPaperAttemptInputSession } from "@workspace/api-client-react";
import { useState, lazy, Suspense, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DialogFooter } from "@/components/ui/dialog";
import { ResponsiveFormPanel } from "@/components/responsive-form-panel";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { RichEmptyState } from "@/components/rich-empty-state";
import { PageHeader } from "@/components/page-header";
import { Plus, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { resolveSubjectAccent } from "@/lib/subject-accent";

const ScoreTrendLineChart = lazy(
  () => import("@/components/charts/score-trend-line-chart"),
);

const SESSIONS = Object.values(PastPaperAttemptInputSession);
const VARIANTS = [1, 2, 3, 4, 5];
const NO_VARIANT = "none";

const paperSchema = z.object({
  subjectId: z.coerce.number().min(1, "Subject is required"),
  componentId: z.coerce.number().min(1, "Component is required"),
  variant: z.string().default(NO_VARIANT),
  session: z.string().min(1, "Session is required"),
  score: z.coerce.number().min(0, "Score cannot be negative"),
  totalMarks: z.coerce.number().min(1, "Total marks must be > 0"),
  dateAttempted: z.string().min(1, "Date is required"),
  timeTakenMinutes: z.coerce.number().optional().or(z.literal("")),
  notes: z.string().optional(),
}).refine(data => data.score <= data.totalMarks, {
  message: "Score cannot exceed total marks",
  path: ["score"]
});

type PaperFormValues = z.infer<typeof paperSchema>;

export default function PastPapers() {
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: subjects } = useListSubjects({
    query: { queryKey: getListSubjectsQueryKey() }
  });

  const { data: papers, isLoading } = useListPastPaperAttempts(
    filterSubject !== "all" ? { subjectId: Number(filterSubject) } : {},
    { query: { queryKey: getListPastPaperAttemptsQueryKey(filterSubject !== "all" ? { subjectId: Number(filterSubject) } : {}) } }
  );

  const createAttempt = useCreatePastPaperAttempt({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPastPaperAttemptsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); // update dashboard recent
        queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
        setIsAddDialogOpen(false);
        form.reset();
      }
    }
  });

  const deleteAttempt = useDeletePastPaperAttempt({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPastPaperAttemptsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      }
    }
  });

  const form = useForm<PaperFormValues>({
    resolver: zodResolver(paperSchema),
    defaultValues: {
      variant: NO_VARIANT,
      session: "",
      dateAttempted: new Date().toISOString().split('T')[0],
      timeTakenMinutes: "",
      notes: ""
    }
  });

  const selectedSubjectId = form.watch("subjectId");
  const selectedSession = form.watch("session");

  const { data: components } = useListAssessmentComponents(
    selectedSubjectId,
    {
      query: {
        queryKey: getListAssessmentComponentsQueryKey(selectedSubjectId),
        enabled: !!selectedSubjectId,
      },
    }
  );

  // Component belongs to a specific subject — clear it (and any dependent
  // variant/session selection) whenever the subject changes so a stale
  // component from a different subject can never be submitted.
  useEffect(() => {
    form.setValue("componentId", undefined as unknown as number);
  }, [selectedSubjectId]);

  const onSubmit = (data: PaperFormValues) => {
    createAttempt.mutate({
      data: {
        subjectId: data.subjectId,
        componentId: data.componentId,
        variant: data.variant !== NO_VARIANT ? Number(data.variant) : undefined,
        session: data.session as PastPaperAttemptInputSession,
        score: data.score,
        totalMarks: data.totalMarks,
        dateAttempted: new Date(data.dateAttempted).toISOString(),
        timeTakenMinutes: data.timeTakenMinutes ? Number(data.timeTakenMinutes) : undefined,
        notes: data.notes || undefined
      }
    });
  };

  // Prepare chart data: group by date across all papers or filtered
  const chartData = papers?.slice().reverse().map(p => ({
    name: p.session,
    date: format(parseISO(p.dateAttempted), "MMM d"),
    percentage: p.percentage,
    subject: p.subjectName,
    color: p.subjectColor
  })) || [];

  return (
    <div className="app-page animate-in fade-in duration-300">
      <PageHeader
        title="Past papers"
        subtitle="Log timed attempts to unlock trends, predicted grades, and sharper focus."
        action={
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden /> Log paper
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="card-tint-cream lg:col-span-3 shadow-[var(--elev-2)]">
          <CardHeader className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-bold tracking-[-0.01em]">Performance trend</CardTitle>
              <CardDescription>Percentage scores over time</CardDescription>
            </div>
            <div className="w-full sm:w-[180px]">
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects?.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
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
                onAction={() => setIsAddDialogOpen(true)}
                variant="mint"
                className="py-10"
              />
            ) : (
              <div className="mt-4">
                <Suspense fallback={<ChartSkeleton height={300} className="mt-4" />}>
                  <ScoreTrendLineChart
                    data={chartData}
                    xKey="name"
                    stroke="hsl(var(--semantic-progress))"
                    height={300}
                    tooltipLabelFormatter={(label, items) => {
                      const payload = items[0]?.payload as { subject?: string; date?: string } | undefined;
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
            <CardTitle className="text-lg font-bold tracking-[-0.01em]">Paper log</CardTitle>
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
                onAction={() => setIsAddDialogOpen(true)}
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
                            style={{ backgroundColor: `${accent}18`, color: accent }}
                          >
                            {paper.subjectName}
                          </Badge>
                          <span className="text-sm font-semibold">{paper.paperLabel}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{paper.componentName ?? "Component removed"}</p>
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="text-lg font-bold tabular">{paper.percentage}%</span>
                          <span className="text-xs text-muted-foreground">
                            {paper.score}/{paper.totalMarks} marks
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(paper.dateAttempted), "d MMM yyyy")}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 shrink-0 self-end text-muted-foreground hover:text-destructive sm:self-center"
                        aria-label={`Delete paper: ${paper.subjectName} ${paper.paperLabel}`}
                        onClick={() => deleteAttempt.mutate({ pastPaperAttemptId: paper.id })}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden strokeWidth={2} />
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
                      <th className="px-6 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-b">
                    {papers.map(paper => {
                      const accent = resolveSubjectAccent({
                        name: paper.subjectName,
                        color: paper.subjectColor,
                      });
                      return (
                      <tr key={paper.id} className="bg-card hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="border-0 font-medium" style={{ backgroundColor: `${accent}18`, color: accent }}>
                            {paper.subjectName}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-medium">
                          <div>{paper.paperLabel}</div>
                          <div className="text-xs text-muted-foreground">{paper.componentName ?? "Component removed"}</div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{paper.session}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base tabular">{paper.percentage}%</span>
                            <span className="text-xs text-muted-foreground">({paper.score}/{paper.totalMarks})</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                          {format(parseISO(paper.dateAttempted), "d MMM yyyy")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-11 w-11 text-muted-foreground hover:text-destructive"
                            aria-label={`Delete paper: ${paper.subjectName} ${paper.paperLabel}`}
                            onClick={() => deleteAttempt.mutate({ pastPaperAttemptId: paper.id })}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden strokeWidth={2} />
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

      <ResponsiveFormPanel
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title="Log past paper attempt"
        description="Record your score to track your progress."
        className="sm:max-w-[500px]"
      >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects?.map(s => (
                          <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
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
                      disabled={!selectedSubjectId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedSubjectId ? "Select a component" : "Select a subject first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {components?.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.componentName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                          {SESSIONS.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
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
                        disabled={selectedSession === PastPaperAttemptInputSession.Specimen}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_VARIANT}>None</SelectItem>
                          {VARIANTS.map(v => (
                            <SelectItem key={v} value={v.toString()}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              {form.watch("score") !== undefined && form.watch("totalMarks") && Number(form.watch("totalMarks")) > 0 && (
                <div className="bg-muted p-3 rounded-md flex justify-between items-center text-sm border">
                  <span>Calculated Percentage:</span>
                  <span className="font-semibold">
                    {Math.round((Number(form.watch("score")) / Number(form.watch("totalMarks"))) * 100)}%
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
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createAttempt.isPending}>
                  {createAttempt.isPending ? "Logging..." : "Log Paper"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
      </ResponsiveFormPanel>
    </div>
  );
}
