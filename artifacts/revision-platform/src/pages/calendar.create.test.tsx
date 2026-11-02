import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  tasks: vi.fn(),
  exams: vi.fn(),
  memberships: vi.fn(),
  createTask: vi.fn(),
  createExam: vi.fn(),
  taskKey: vi.fn(),
}));

vi.mock("wouter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wouter")>()),
  Link: ({ children, href }: { children: ReactNode; href: string }) =>
    createElement("a", { href }, children),
}));

vi.mock("@/components/responsive-form-panel", () => ({
  ResponsiveFormPanel: ({
    children,
    open,
    title,
  }: {
    children: ReactNode;
    open: boolean;
    title?: string;
  }) =>
    open
      ? createElement("div", { role: "dialog", "aria-label": title }, children)
      : null,
}));

vi.mock("@/components/ui/select", async () => {
  const {
    createContext,
    createElement: create,
    useContext,
  } = await import("react");
  const SelectContext = createContext<{
    disabled?: boolean;
    onValueChange?: (value: string) => void;
    value?: string;
  }>({});
  return {
    Select: ({
      children,
      disabled,
      onValueChange,
      defaultValue,
    }: {
      children: ReactNode;
      disabled?: boolean;
      onValueChange?: (value: string) => void;
      defaultValue?: string;
    }) =>
      create(
        SelectContext.Provider,
        { value: { disabled, onValueChange, value: defaultValue ?? "" } },
        children,
      ),
    SelectContent: ({ children }: { children: ReactNode }) => {
      const select = useContext(SelectContext);
      return create(
        "select",
        {
          disabled: select.disabled,
          value: select.value,
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            select.onValueChange?.(event.target.value),
        },
        children,
      );
    },
    SelectItem: ({ children, value }: { children: ReactNode; value: string }) =>
      create("option", { value }, children),
    SelectTrigger: ({ children, ...props }: { children?: ReactNode }) => {
      const select = useContext(SelectContext);
      return create(
        "button",
        {
          type: "button",
          role: "combobox",
          disabled: select.disabled,
          ...props,
        },
        children,
      );
    },
    SelectValue: ({ placeholder }: { placeholder?: string }) =>
      placeholder ?? null,
  };
});

vi.mock("@workspace/api-client-react", () => ({
  getListTasksQueryKey: api.taskKey,
  getListExamDatesQueryKey: () => ["/api/exam-dates"],
  getListCurrentUserSubjectsQueryKey: () => ["/api/user-subjects"],
  getGetDashboardSummaryQueryKey: () => ["/api/dashboard/summary"],
  getGetProgressOverviewQueryKey: () => ["/api/progress/overview"],
  useListTasks: api.tasks,
  useListExamDates: api.exams,
  useListCurrentUserSubjects: api.memberships,
  useCreateTask: api.createTask,
  useCreateExamDate: api.createExam,
}));

import CalendarPage from "./calendar";

const membership = {
  subject: { id: 2, name: "Physics", code: "9702", color: "#2563eb" },
};
const ok = (data: unknown) => ({
  data,
  isLoading: false,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
});

const mutateTask = vi.fn();
const mutateExam = vi.fn();
const resetTask = vi.fn();
const resetExam = vi.fn();
let createTaskMutation: { onSuccess?: () => void } = {};
let createExamMutation: { onSuccess?: () => void } = {};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 7, 25, 12, 0, 0));
  window.history.replaceState({}, "", "/calendar");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  mutateTask.mockReset();
  mutateExam.mockReset();
  resetTask.mockReset();
  resetExam.mockReset();
  createTaskMutation = {};
  createExamMutation = {};
  api.tasks.mockReturnValue(ok([]));
  api.exams.mockReturnValue(ok([]));
  api.memberships.mockReturnValue(ok([membership]));
  api.taskKey.mockImplementation((params?: unknown) => ["/api/tasks", params]);
  api.createTask.mockImplementation(
    (opts?: { mutation?: typeof createTaskMutation }) => {
      createTaskMutation = opts?.mutation ?? {};
      return {
        mutate: mutateTask,
        isPending: false,
        isError: false,
        error: null,
        reset: resetTask,
      };
    },
  );
  api.createExam.mockImplementation(
    (opts?: { mutation?: typeof createExamMutation }) => {
      createExamMutation = opts?.mutation ?? {};
      return {
        mutate: mutateExam,
        isPending: false,
        isError: false,
        error: null,
        reset: resetExam,
      };
    },
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

function renderPage(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const view = render(
    <QueryClientProvider client={client}>
      <CalendarPage />
    </QueryClientProvider>,
  );
  return { ...view, client };
}

async function openMenuItem(name: string) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  await user.click(screen.getByRole("button", { name: /Add task \/ event/i }));
  await user.click(await screen.findByRole("menuitem", { name }));
}

describe("Calendar create actions", () => {
  it("prefills the selected day and creates a task", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(client, "invalidateQueries");
    renderPage(client);
    await openMenuItem("Add task");

    const dialog = screen.getByRole("dialog", { name: "Add new task" });
    expect(within(dialog).getByLabelText("Deadline (Optional)")).toHaveValue(
      "2026-08-25",
    );
    fireEvent.change(within(dialog).getByLabelText("Task Title"), {
      target: { value: "Review waves" },
    });
    fireEvent.change(
      within(dialog).getByRole("option", { name: "Physics" }).closest("select")!,
      { target: { value: "2" } },
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Add task" }));

    await waitFor(() =>
      expect(mutateTask).toHaveBeenCalledWith({
      data: {
        title: "Review waves",
        subjectId: 2,
        priority: "medium",
        deadline: "2026-08-25",
        estimatedMinutes: undefined,
      },
      }),
    );
    createTaskMutation.onSuccess?.();
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ queryKey: ["/api/tasks", undefined] }),
    );
  });

  it("prefills the selected day and creates an exam", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const spy = vi.spyOn(client, "invalidateQueries");
    renderPage(client);
    await openMenuItem("Add exam");

    const dialog = screen.getByRole("dialog", { name: "Add exam date" });
    expect(within(dialog).getByLabelText("Date")).toHaveValue("2026-08-25");
    fireEvent.change(within(dialog).getByLabelText("Paper code"), {
      target: { value: "9702/1" },
    });
    fireEvent.change(
      within(dialog).getByRole("option", { name: "Physics" }).closest("select")!,
      { target: { value: "2" } },
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Add exam" }));

    await waitFor(() =>
      expect(mutateExam).toHaveBeenCalledWith({
      data: {
        subjectId: 2,
        paperCode: "9702/1",
        date: "2026-08-25",
        notes: undefined,
      },
      }),
    );
    createExamMutation.onSuccess?.();
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ queryKey: ["/api/exam-dates"] }),
    );
  });

  it("disables create when the student has no subjects", () => {
    api.memberships.mockReturnValue(ok([]));
    renderPage();
    expect(
      screen.getByRole("button", { name: /Add task \/ event/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/Choose at least one subject before adding tasks or exams/),
    ).toBeInTheDocument();
  });
});
