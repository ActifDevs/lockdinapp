import { useEffect, useRef, useState } from "react";
import {
  useListTasks,
  getListTasksQueryKey,
  useUpdateTask,
  useDeleteTask,
  useListCurrentUserSubjects,
  getListCurrentUserSubjectsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetProgressOverviewQueryKey,
  Task,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TaskRow } from "@/components/task-row";
import { RichEmptyState } from "@/components/rich-empty-state";
import { PageHeader } from "@/components/page-header";
import { TaskCreateDialog } from "@/components/task-create-dialog";
import { Plus, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { ReadStateNotice } from "@/components/read-state-notice";
import { getMutationErrorMessage } from "@/lib/query-error-message";
import { taskSchema } from "@/lib/task-form-schema";
import { Link, useSearchParams } from "wouter";
import {
  omitDefaultQueryValue,
  resolveQueryParam,
  updateQueryParams,
} from "@/lib/navigation-query-state";
import { useIdempotentControlledNavigation } from "@/hooks/use-idempotent-controlled-navigation";

export { taskSchema };

const TASK_VIEWS = ["today", "upcoming", "completed", "all"] as const;

export default function StudyPlan() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { value: activeTab, needsNormalization: viewNeedsNormalization } =
    resolveQueryParam(searchParams, "view", TASK_VIEWS, "today");
  const shouldNavigateToView = useIdempotentControlledNavigation(activeTab);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const addDialogTriggerRef = useRef<HTMLElement | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!viewNeedsNormalization) return;
    setSearchParams((current) => updateQueryParams(current, [["view", null]]), {
      replace: true,
    });
  }, [setSearchParams, viewNeedsNormalization]);

  const handleViewChange = (value: string) => {
    if (!TASK_VIEWS.includes(value as (typeof TASK_VIEWS)[number])) return;
    if (!shouldNavigateToView(value as (typeof TASK_VIEWS)[number])) return;
    setSearchParams(
      (current) =>
        updateQueryParams(current, [
          [
            "view",
            omitDefaultQueryValue(
              value as (typeof TASK_VIEWS)[number],
              "today",
            ),
          ],
        ]),
      { replace: false },
    );
  };

  const mutationMessage = (error: unknown) => getMutationErrorMessage(error);

  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksLoadError,
    refetch: refetchTasks,
  } = useListTasks(
    { filter: activeTab as any },
    { query: { queryKey: getListTasksQueryKey({ filter: activeTab as any }) } },
  );

  const {
    data: memberships,
    isLoading: membershipsLoading,
    isError: membershipsError,
    error: membershipsLoadError,
    refetch: refetchMemberships,
  } = useListCurrentUserSubjects({
    query: { queryKey: getListCurrentUserSubjectsQueryKey() },
  });
  const subjects = memberships?.map((membership) => membership.subject);
  const canCreateTask =
    !membershipsLoading && !membershipsError && (subjects?.length ?? 0) > 0;
  const tasksRefreshFailed = tasksError && tasks !== undefined;

  const invalidateTaskAggregates = () => {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({
      queryKey: getGetDashboardSummaryQueryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: getGetProgressOverviewQueryKey(),
    });
  };

  const openAddDialog = () => {
    addDialogTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setIsAddDialogOpen(true);
  };

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        setActionError(null);
        invalidateTaskAggregates();
      },
      onError: (error) => setActionError(mutationMessage(error)),
    },
  });

  const deleteTask = useDeleteTask({
    mutation: {
      onSuccess: () => {
        setActionError(null);
        invalidateTaskAggregates();
      },
      onError: (error) => setActionError(mutationMessage(error)),
    },
  });

  const toggleTaskComplete = (task: Task) => {
    updateTask.mutate({
      taskId: task.id,
      data: { completed: !task.completed },
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
                  deadlineStr === "Today"
                    ? "font-medium text-destructive"
                    : "text-muted-foreground",
                )}
              >
                <CalendarIcon className="h-3 w-3" strokeWidth={2} />{" "}
                {deadlineStr}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-destructive group-hover:opacity-100"
              aria-label={`Delete task: ${task.title}`}
              onClick={() => deleteTask.mutate({ taskId: task.id })}
            >
              <Trash2 className="h-4 w-4" aria-hidden strokeWidth={2} />
            </Button>
          </div>
        }
      />
    );
  };

  return (
    <div className="app-page animate-in fade-in duration-300">
      <PageHeader
        title="Study plan"
        subtitle="Build today's mission, protect your streak, and keep revision finishable."
        action={
          <Button onClick={openAddDialog} disabled={!canCreateTask}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden /> Add task
          </Button>
        }
      />

      {membershipsError && (
        <ReadStateNotice
          title="Task creation is unavailable"
          error={membershipsLoadError}
          description="Your tasks are still available, but subjects could not be loaded for task creation."
          onRetry={() => void refetchMemberships()}
        />
      )}
      {!membershipsLoading &&
        !membershipsError &&
        memberships?.length === 0 && (
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Choose at least one subject before creating tasks.{" "}
            <Link
              href="/settings"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Open subject settings
            </Link>
          </div>
        )}

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {actionError}
        </div>
      )}

      <Card className="card-tint-cream overflow-hidden border-[hsl(var(--card-border))] shadow-[var(--elev-2)]">
        <Tabs
          value={activeTab}
          onValueChange={handleViewChange}
          className="w-full"
        >
          <CardHeader className="bg-muted/10 pb-0">
            <TabsList className="tabs-scroll rounded-none border-b-0 bg-transparent p-0">
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
                All tasks
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="p-0">
            {tasksLoading && tasks === undefined ? (
              <div
                className="space-y-3 p-6"
                role="status"
                aria-label="Loading study plan tasks"
              >
                <span className="sr-only">Loading study plan tasks</span>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="dash-skeleton h-16 rounded-xl" />
                ))}
              </div>
            ) : tasksError && tasks === undefined ? (
              <ReadStateNotice
                title="Tasks could not be loaded"
                error={tasksLoadError}
                onRetry={() => void refetchTasks()}
                className="m-6"
              />
            ) : !tasks || tasks.length === 0 ? (
              <RichEmptyState
                scene={activeTab === "completed" ? "calm" : "tasks"}
                title={
                  activeTab === "today"
                    ? "Ready to make progress?"
                    : activeTab === "completed"
                      ? "Your first checkmark is waiting"
                      : "Build your revision plan"
                }
                description={
                  activeTab === "today"
                    ? "Plan your first study block. Every completed session earns XP, protects your streak, and improves your predicted grade."
                    : activeTab === "completed"
                      ? "Finish a mission task and it will show up here as proof of momentum."
                      : "Break revision into small, finishable blocks and schedule the next session."
                }
                actionLabel={
                  activeTab !== "completed" && canCreateTask
                    ? "Create today's mission"
                    : undefined
                }
                onAction={
                  activeTab !== "completed" && canCreateTask
                    ? openAddDialog
                    : undefined
                }
                variant="mint"
              />
            ) : (
              <div>
                {tasksRefreshFailed && (
                  <ReadStateNotice
                    stale
                    compact
                    title="Task refresh failed"
                    error={tasksLoadError}
                    onRetry={() => void refetchTasks()}
                    className="m-4"
                  />
                )}
                <div className="list-divider group">
                  {tasks.map(renderTask)}
                </div>
              </div>
            )}
          </CardContent>
        </Tabs>
      </Card>

      <TaskCreateDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        returnFocusRef={addDialogTriggerRef}
      />
    </div>
  );
}
