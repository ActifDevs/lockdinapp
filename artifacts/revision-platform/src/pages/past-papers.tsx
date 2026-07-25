import { useListPastPapers, getListPastPapersQueryKey, useListSubjects, getListSubjectsQueryKey, useCreatePastPaper, useDeletePastPaper } from "@workspace/api-client-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Library, TrendingUp, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const paperSchema = z.object({
  subjectId: z.coerce.number().min(1, "Subject is required"),
  paperCode: z.string().min(1, "Paper code is required (e.g. 9709/12)"),
  session: z.string().min(1, "Session is required (e.g. M/J 23)"),
  score: z.coerce.number().min(0, "Score cannot be negative"),
  totalMarks: z.coerce.number().min(1, "Total marks must be > 0"),
  dateAttempted: z.string().min(1, "Date is required"),
  timeTakenMinutes: z.coerce.number().optional().or(z.literal("")),
  notes: z.string().optional()
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

  const { data: papers, isLoading } = useListPastPapers(
    filterSubject !== "all" ? { subjectId: Number(filterSubject) } : {},
    { query: { queryKey: getListPastPapersQueryKey(filterSubject !== "all" ? { subjectId: Number(filterSubject) } : {}) } }
  );

  const createPaper = useCreatePastPaper({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPastPapersQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }); // update dashboard recent
        queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
        setIsAddDialogOpen(false);
        form.reset();
      }
    }
  });

  const deletePaper = useDeletePastPaper({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPastPapersQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      }
    }
  });

  const form = useForm<PaperFormValues>({
    resolver: zodResolver(paperSchema),
    defaultValues: {
      paperCode: "",
      session: "",
      dateAttempted: new Date().toISOString().split('T')[0],
      timeTakenMinutes: "",
      notes: ""
    }
  });

  const onSubmit = (data: PaperFormValues) => {
    createPaper.mutate({
      data: {
        subjectId: data.subjectId,
        paperCode: data.paperCode,
        session: data.session,
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
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">Past Papers</h1>
          <p className="text-muted-foreground mt-2">Log your past paper attempts and track your progress over time.</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Log Paper
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="font-serif text-xl">Performance Trend</CardTitle>
              <CardDescription>Percentage scores over time</CardDescription>
            </div>
            <div className="w-[180px]">
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
              <div className="h-[300px] flex items-center justify-center text-muted-foreground flex-col">
                <TrendingUp className="h-10 w-10 mb-2 opacity-20" />
                <p>Not enough data to show a trend.</p>
                <p className="text-sm">Log at least two papers.</p>
              </div>
            ) : (
              <div className="h-[300px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 12 }} dy={10} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'currentColor', opacity: 0.5, fontSize: 12 }} dx={-10} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }}
                      itemStyle={{ color: 'var(--foreground)' }}
                      formatter={(value: number) => [`${value}%`, 'Score']}
                      labelFormatter={(label, items) => {
                        if (items.length > 0 && items[0].payload) {
                          return `${items[0].payload.subject} - ${label} (${items[0].payload.date})`;
                        }
                        return label;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="percentage" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Paper Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
              </div>
            ) : !papers || papers.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Library className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No papers logged</h3>
                <p className="text-muted-foreground max-w-sm mb-6">
                  Keep track of every past paper you attempt to see your improvement over time.
                </p>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>Log a Paper</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                    <tr>
                      <th className="px-6 py-3 font-medium">Subject</th>
                      <th className="px-6 py-3 font-medium">Paper Code</th>
                      <th className="px-6 py-3 font-medium">Session</th>
                      <th className="px-6 py-3 font-medium">Score</th>
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-b">
                    {papers.map(paper => (
                      <tr key={paper.id} className="bg-card hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="font-medium border-0 rounded-sm" style={{ backgroundColor: `${paper.subjectColor}15`, color: paper.subjectColor }}>
                            {paper.subjectName}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-medium">{paper.paperCode}</td>
                        <td className="px-6 py-4 text-muted-foreground">{paper.session}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base">{paper.percentage}%</span>
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
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deletePaper.mutate({ pastPaperId: paper.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-serif">Log Past Paper Attempt</DialogTitle>
            <DialogDescription>Record your score to track your progress.</DialogDescription>
          </DialogHeader>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paperCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paper Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 9709/12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="session"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. May/June 2023" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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
                <Button type="submit" disabled={createPaper.isPending}>
                  {createPaper.isPending ? "Logging..." : "Log Paper"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
