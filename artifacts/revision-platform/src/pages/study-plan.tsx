import { useState } from "react";
import { 
  useListTasks, 
  getListTasksQueryKey, 
  useCreateTask, 
  useUpdateTask,
  useDeleteTask,
  useListSubjects,
  getListSubjectsQueryKey,
  Task,
  TaskPriority
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TaskRow } from "@/components/task-row";
import { RichEmptyState } from "@/components/rich-empty-state";
import { Plus, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subjectId: z.coerce.number().min(1, "Subject is required"),
  deadline: z.string().optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high"]),
  estimatedMinutes: z.coerce.number().min(1, "Must be at least 1 min").optional().or(z.literal(""))
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function StudyPlan() {
  const [activeTab, setActiveTab] = useState("today");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutationMessage = (error: unknown) =>
    error instanceof Error && error.message.trim()
      ? error.message
      : "We couldn't save your changes. Try again.";

  const { data: tasks, isLoading: tasksLoading } = useListTasks(
    { filter: activeTab as any },
    { query: { queryKey: getListTasksQueryKey({ filter: activeTab as any }) } }
  );

  const { data: subjects } = useListSubjects({
    query: { queryKey: getListSubjectsQueryKey() }
  });

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        setActionError(null);
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setIsAddDialogOpen(false);
        form.reset();
      },
      onError: (error) => setActionError(mutationMessage(error)),
    },
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        setActionError(null);
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      },
      onError: (error) => setActionError(mutationMessage(error)),
    },
  });

  const deleteTask = useDeleteTask({
    mutation: {
      onSuccess: () => {
        setActionError(null);
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
      onError: (error) => setActionError(mutationMessage(error)),
    },
  });

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      priority: "medium",
      estimatedMinutes: "",
      deadline: ""
    }
  });

  const onSubmit = (data: TaskFormValues) => {
    createTask.mutate({
      data: {
        title: data.title,
        subjectId: data.subjectId,
        priority: data.priority as any,
        deadline: data.deadline || undefined,
        estimatedMinutes: data.estimatedMinutes ? Number(data.estimatedMinutes) : undefined,
      }
    });
  };

  const toggleTaskComplete = (task: Task) => {
    updateTask.mutate({
      taskId: task.id,
      data: { completed: !task.completed }
    });
  };

  const renderTask = (task: Task) => {
    let deadlineStr = "";
    if (task.deadline) {
      const date = parseISO(task.deadline);
      if (isToday(date)) deadlineStr = "Today";
      else if (isTomorrow(date)) deadlineStr = "Tomorrow";
      else deadlineStr = format(date, "MMM d");
    }

    return (
      <TaskRow
        key={task.id}
        task={task}
        disabled={updateTask.isPending}
        onToggle={() => toggleTaskComplete(task)}
        trailing={
          <div className="flex shrink-0 items-center gap-2 self-center pt-1">
            {deadlineStr && (
              <span
                className={cn(
                  "hidden items-center gap-1 text-xs sm:flex",
                  deadlineStr === "Today" ? "font-medium text-destructive" : "text-muted-foreground",
                )}
              >
                <CalendarIcon className="h-3 w-3" strokeWidth={1.75} /> {deadlineStr}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-destructive group-hover:opacity-100"
              aria-label={`Delete task: ${task.title}`}
              onClick={() => deleteTask.mutate({ taskId: task.id })}
            >
              <Trash2 className="h-4 w-4" aria-hidden strokeWidth={1.75} />
            </Button>
          </div>
        }
      />
    );
  };

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Study plan</h1>
          <p className="page-subtitle">Organise revision sessions and track what needs doing.</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add task
        </Button>
      </div>

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {actionError}
        </div>
      )}

      <Card className="card-tint-cream border-border/60">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader className="pb-0 border-b">
            <TabsList className="tabs-scroll rounded-none border-b bg-transparent p-0">
              <TabsTrigger
                value="today"
                className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Today
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Upcoming
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Completed
              </TabsTrigger>
              <TabsTrigger
                value="all"
                className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                All Tasks
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="p-0">
            {tasksLoading ? (
              <div className="p-8 space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : !tasks || tasks.length === 0 ? (
              <RichEmptyState
                scene={
                  activeTab === "completed"
                    ? "calm"
                    : activeTab === "today"
                      ? "tasks"
                      : "tasks"
                }
                title={
                  activeTab === "today"
                    ? "No tasks for today yet"
                    : activeTab === "completed"
                      ? "No completed tasks yet"
                      : "Your study plan is empty"
                }
                description={
                  activeTab === "today"
                    ? "Add today's first task to protect your streak and unlock Daily Champion."
                    : activeTab === "completed"
                      ? "You haven't completed any tasks yet — your first checkmark is waiting."
                      : "Break revision into small, finishable blocks and schedule the next session."
                }
                actionLabel={activeTab !== "completed" ? "Create a task" : undefined}
                onAction={activeTab !== "completed" ? () => setIsAddDialogOpen(true) : undefined}
                variant={activeTab === "today" ? "purple" : activeTab === "completed" ? "mint" : "blue"}
              />
            ) : (
              <div className="list-divider group">
                {tasks.map(renderTask)}
              </div>
            )}
          </CardContent>
        </Tabs>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add new task</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              {createTask.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {mutationMessage(createTask.error)}
                </p>
              )}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Read chapter 4, Integration practice..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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

              <div className="grid form-grid-2">
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="estimatedMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Est. Minutes</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="45" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createTask.isPending}>
                  {createTask.isPending ? "Adding…" : "Add task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
