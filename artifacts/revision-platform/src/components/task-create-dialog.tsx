import { useEffect, useRef, type RefObject } from "react";
import {
  getGetDashboardSummaryQueryKey,
  getGetProgressOverviewQueryKey,
  getListCurrentUserSubjectsQueryKey,
  getListTasksQueryKey,
  useCreateTask,
  useListCurrentUserSubjects,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ReadStateNotice } from "@/components/read-state-notice";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { getMutationErrorMessage } from "@/lib/query-error-message";
import { taskSchema, type TaskFormValues } from "@/lib/task-form-schema";

export { taskSchema } from "@/lib/task-form-schema";

type TaskCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDeadline?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function TaskCreateDialog({
  open,
  onOpenChange,
  defaultDeadline = "",
  returnFocusRef,
}: TaskCreateDialogProps) {
  const queryClient = useQueryClient();
  const wasOpen = useRef(false);
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

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      priority: "medium",
      estimatedMinutes: undefined,
      deadline: defaultDeadline,
    },
  });

  const invalidateTaskAggregates = () => {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({
      queryKey: getGetDashboardSummaryQueryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: getGetProgressOverviewQueryKey(),
    });
  };

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        invalidateTaskAggregates();
        onOpenChange(false);
        form.reset({
          title: "",
          priority: "medium",
          estimatedMinutes: undefined,
          deadline: defaultDeadline,
        });
      },
    },
  });

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    if (wasOpen.current) return;
    wasOpen.current = true;
    createTask.reset();
    form.reset({
      title: "",
      priority: "medium",
      estimatedMinutes: undefined,
      deadline: defaultDeadline,
    });
  }, [open, defaultDeadline, form, createTask]);

  const onSubmit = (data: TaskFormValues) => {
    createTask.mutate({
      data: {
        title: data.title,
        subjectId: data.subjectId,
        priority: data.priority,
        deadline: data.deadline || undefined,
        estimatedMinutes: data.estimatedMinutes
          ? Number(data.estimatedMinutes)
          : undefined,
      },
    });
  };

  return (
    <ResponsiveFormPanel
      open={open}
      returnFocusRef={returnFocusRef}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) createTask.reset();
      }}
      title="Add new task"
      className="sm:max-w-[425px]"
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 py-4"
        >
          {createTask.isError && (
            <Alert variant="destructive">
              <AlertTitle>Could not add task</AlertTitle>
              <p>{getMutationErrorMessage(createTask.error)}</p>
            </Alert>
          )}
          {membershipsLoading && (
            <p role="status" className="text-sm text-muted-foreground">
              Loading subjects for task creation…
            </p>
          )}
          {membershipsError && (
            <ReadStateNotice
              compact
              title="Subjects could not be loaded"
              error={membershipsLoadError}
              onRetry={() => void refetchMemberships()}
            />
          )}
          {!membershipsLoading &&
            !membershipsError &&
            memberships?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Choose a subject in Settings before adding a task.
              </p>
            )}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Read chapter 4, Integration practice..."
                    {...field}
                  />
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value?.toString()}
                  disabled={!canCreateTask}
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
                    <Input
                      type="number"
                      placeholder="45"
                      {...field}
                      value={field.value ?? ""}
                    />
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
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
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                createTask.reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTask.isPending || !canCreateTask}
            >
              {createTask.isPending ? "Adding…" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </ResponsiveFormPanel>
  );
}
