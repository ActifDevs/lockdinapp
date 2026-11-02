import { useEffect, useRef, type RefObject } from "react";
import {
  getGetDashboardSummaryQueryKey,
  getListCurrentUserSubjectsQueryKey,
  getListExamDatesQueryKey,
  useCreateExamDate,
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
import {
  examDateFormSchema,
  type ExamDateFormValues,
} from "@/lib/task-form-schema";

type ExamCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function ExamCreateDialog({
  open,
  onOpenChange,
  defaultDate = "",
  returnFocusRef,
}: ExamCreateDialogProps) {
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
  const canCreateExam =
    !membershipsLoading && !membershipsError && (subjects?.length ?? 0) > 0;

  const form = useForm<ExamDateFormValues>({
    resolver: zodResolver(examDateFormSchema),
    defaultValues: {
      paperCode: "",
      date: defaultDate,
      notes: "",
    },
  });

  const createExam = useCreateExamDate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExamDatesQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getGetDashboardSummaryQueryKey(),
        });
        onOpenChange(false);
        form.reset({
          paperCode: "",
          date: defaultDate,
          notes: "",
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
    createExam.reset();
    form.reset({
      paperCode: "",
      date: defaultDate,
      notes: "",
    });
  }, [open, defaultDate, form, createExam]);

  const onSubmit = (data: ExamDateFormValues) => {
    createExam.mutate({
      data: {
        subjectId: data.subjectId,
        paperCode: data.paperCode,
        date: data.date,
        notes: data.notes?.trim() || undefined,
      },
    });
  };

  return (
    <ResponsiveFormPanel
      open={open}
      returnFocusRef={returnFocusRef}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) createExam.reset();
      }}
      title="Add exam date"
      className="sm:max-w-[425px]"
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 py-4"
        >
          {createExam.isError && (
            <Alert variant="destructive">
              <AlertTitle>Could not add exam</AlertTitle>
              <p>{getMutationErrorMessage(createExam.error)}</p>
            </Alert>
          )}
          {membershipsLoading && (
            <p role="status" className="text-sm text-muted-foreground">
              Loading subjects for exam dates…
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
                Choose a subject in Settings before adding an exam.
              </p>
            )}
          <FormField
            control={form.control}
            name="paperCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paper code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 9709/1" {...field} />
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
                  disabled={!canCreateExam}
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
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Hall, start time, reminders..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                createExam.reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createExam.isPending || !canCreateExam}
            >
              {createExam.isPending ? "Adding…" : "Add exam"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </ResponsiveFormPanel>
  );
}
