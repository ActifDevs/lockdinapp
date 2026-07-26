import { useState } from "react";
import { Link } from "wouter";
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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CheckCircle2, Circle, Clock, Plus, Trash2, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
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
  const queryClient = useQueryClient();

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
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setIsAddDialogOpen(false);
        form.reset();
      }
    }
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        // Also invalidate dashboard since tasks might show up there
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      }
    }
  });

  const deleteTask = useDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      }
    }
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
      <div key={task.id} className={cn("p-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors flex items-start gap-4 group", task.completed && "opacity-60")}>
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
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={cn("text-base font-medium", task.completed && "line-through text-muted-foreground")}>
                {task.title}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs h-6 rounded-sm border-0 font-medium" style={{ backgroundColor: `${task.subjectColor}15`, color: task.subjectColor }}>
                  {task.subjectName}
                </Badge>
                
                {task.priority === 'high' && (
                  <Badge variant="destructive" className="h-6 text-[10px] uppercase tracking-wider rounded-sm px-1.5 py-0">High Priority</Badge>
                )}
                
                {task.estimatedMinutes && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {task.estimatedMinutes}m
                  </span>
                )}

                {deadlineStr && (
                  <span className={cn("text-xs flex items-center gap-1", 
                    deadlineStr === "Today" ? "text-destructive font-medium" : "text-muted-foreground"
                  )}>
                    <CalendarIcon className="h-3 w-3" /> {deadlineStr}
                  </span>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => deleteTask.mutate({ taskId: task.id })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">Study Plan</h1>
          <p className="text-muted-foreground mt-2">Organise your revision session and track what needs to be done.</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader className="pb-0 border-b">
            <TabsList className="bg-transparent border-b-0 h-auto p-0 gap-6 w-full justify-start overflow-x-auto rounded-none">
              <TabsTrigger 
                value="today" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 pt-2"
              >
                Today
              </TabsTrigger>
              <TabsTrigger 
                value="upcoming" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 pt-2"
              >
                Upcoming
              </TabsTrigger>
              <TabsTrigger 
                value="completed" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 pt-2"
              >
                Completed
              </TabsTrigger>
              <TabsTrigger 
                value="all" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 pt-2"
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
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
                <p className="text-muted-foreground max-w-sm">
                  {activeTab === 'today' 
                    ? "You don't have any tasks scheduled for today. Take a break or plan ahead."
                    : activeTab === 'completed'
                    ? "You haven't completed any tasks yet."
                    : "Your study plan is empty."}
                </p>
                {activeTab !== 'completed' && (
                  <Button variant="outline" className="mt-6" onClick={() => setIsAddDialogOpen(true)}>
                    Create a task
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y border-t-0">
                {tasks.map(renderTask)}
              </div>
            )}
          </CardContent>
        </Tabs>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif">Add New Task</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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

              <div className="grid grid-cols-2 gap-4">
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
                  {createTask.isPending ? "Adding..." : "Add Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
