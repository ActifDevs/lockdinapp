import { useRef, useState } from "react";
import {
  getListCurrentUserSubjectsQueryKey,
  useListCurrentUserSubjects,
} from "@workspace/api-client-react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskCreateDialog } from "@/components/task-create-dialog";
import { ExamCreateDialog } from "@/components/exam-create-dialog";
import { formatLocalCalendarDate } from "@/lib/navigation-query-state";

export function CalendarCreateMenu({ selectedDate }: { selectedDate: Date }) {
  const [taskOpen, setTaskOpen] = useState(false);
  const [examOpen, setExamOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const selectedKey = formatLocalCalendarDate(selectedDate);
  const {
    data: memberships,
    isLoading: membershipsLoading,
    isError: membershipsError,
  } = useListCurrentUserSubjects({
    query: { queryKey: getListCurrentUserSubjectsQueryKey() },
  });
  const canCreate =
    !membershipsLoading &&
    !membershipsError &&
    (memberships?.length ?? 0) > 0;

  const rememberTrigger = () => {
    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={!canCreate} aria-haspopup="menu">
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            Add task / event
            <ChevronDown className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              rememberTrigger();
              setTaskOpen(true);
            }}
          >
            Add task
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              rememberTrigger();
              setExamOpen(true);
            }}
          >
            Add exam
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TaskCreateDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        defaultDeadline={selectedKey}
        returnFocusRef={triggerRef}
      />
      <ExamCreateDialog
        open={examOpen}
        onOpenChange={setExamOpen}
        defaultDate={selectedKey}
        returnFocusRef={triggerRef}
      />
    </>
  );
}
