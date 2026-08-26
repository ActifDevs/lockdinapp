import { createElement, Fragment, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  tasks: vi.fn(),
  memberships: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  taskKey: vi.fn(),
}));

vi.mock("wouter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wouter")>()),
  Link: ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => createElement("a", { href }, children),
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
  const { createElement: create, Fragment: Frag } = await import("react");
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
        "select",
        {
          disabled,
          defaultValue: defaultValue ?? "",
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            onValueChange?.(event.target.value),
        },
        children,
      ),
    SelectContent: ({ children }: { children: ReactNode }) =>
      create(Frag, null, children),
    SelectItem: ({ children, value }: { children: ReactNode; value: string }) =>
      create("option", { value }, children),
    SelectTrigger: () => null,
    SelectValue: () => null,
  };
});

vi.mock("@workspace/api-client-react", () => ({
  getListTasksQueryKey: api.taskKey,
  getListCurrentUserSubjectsQueryKey: () => ["/api/user-subjects"],
  getGetDashboardSummaryQueryKey: () => ["/api/dashboard/summary"],
  getGetProgressOverviewQueryKey: () => ["/api/progress/overview"],
  useListTasks: api.tasks,
  useListCurrentUserSubjects: api.memberships,
  useCreateTask: api.create,
  useUpdateTask: api.update,
  useDeleteTask: api.remove,
}));

import StudyPlan from "./study-plan";

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

let createMutation: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
} = {};
const mutate = vi.fn();
const reset = vi.fn();
let createState = {
  mutate,
  isPending: false,
  isError: false,
  error: null as unknown,
  reset,
};

beforeEach(() => {
  window.history.replaceState({}, "", "/study-plan?view=upcoming");
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
  mutate.mockReset();
  reset.mockReset();
  createMutation = {};
  createState = {
    mutate,
    isPending: false,
    isError: false,
    error: null,
    reset,
  };
  api.tasks.mockReturnValue(ok([]));
  api.memberships.mockReturnValue(ok([membership]));
  api.create.mockImplementation((opts?: { mutation?: typeof createMutation }) => {
    createMutation = opts?.mutation ?? {};
    return createState;
  });
  api.update.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  });
  api.remove.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  });
  api.taskKey.mockImplementation((params?: unknown) => ["/api/tasks", params]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const view = render(
    <QueryClientProvider client={client}>
      <StudyPlan />
    </QueryClientProvider>,
  );
  return { ...view, client };
}

async function openAndFill() {
  fireEvent.click(screen.getByRole("button", { name: /Add task/i }));
  const dialog = screen.getByRole("dialog", { name: "Add new task" });
  fireEvent.change(screen.getByLabelText("Task Title"), {
    target: { value: "Review waves" },
  });
  fireEvent.change(screen.getByRole("option", { name: "Physics" }).closest("select")!, {
    target: { value: "2" },
  });
  return dialog;
}

describe("Study Plan create-task mutations", () => {
  it("keeps the dialog open with entered values and safe modal error", async () => {
    const { rerender, client } = renderPage();
    const dialog = await openAndFill();
    mutate({
      data: { title: "Review waves", subjectId: 2, priority: "medium" },
    });
    expect(mutate).toHaveBeenCalledOnce();

    createState = {
      ...createState,
      isError: true,
      error: Object.assign(new Error("relation tasks does not exist"), {
        status: 500,
      }),
    };
    rerender(
      <QueryClientProvider client={client}>
        <StudyPlan />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("dialog", { name: "Add new task" })).toBeVisible();
    expect(screen.getByLabelText("Task Title")).toHaveValue("Review waves");
    expect(screen.getByText("Could not add task")).toBeVisible();
    expect(
      screen.getByText(
        "The API returned a server error. Please retry while we investigate.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByText("relation tasks does not exist"),
    ).not.toBeInTheDocument();
    expect(window.location.search).toContain("view=upcoming");
  });

  it("retries after failure and invalidates task aggregates on success", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(client, "invalidateQueries");
    const { rerender } = renderPage(client);
    const dialog = await openAndFill();
    mutate({
      data: { title: "Review waves", subjectId: 2, priority: "medium" },
    });

    createState = {
      ...createState,
      isError: true,
      error: Object.assign(new Error("hidden"), { status: 403 }),
    };
    rerender(
      <QueryClientProvider client={client}>
        <StudyPlan />
      </QueryClientProvider>,
    );
    expect(
      screen.getByText("You don't have permission to complete this action."),
    ).toBeVisible();

    mutate({
      data: { title: "Review waves", subjectId: 2, priority: "medium" },
    });
    expect(mutate).toHaveBeenCalledTimes(2);
    createMutation.onSuccess?.();
    expect(spy).toHaveBeenCalledWith({ queryKey: ["/api/tasks", undefined] });
    expect(spy).toHaveBeenCalledWith({
      queryKey: ["/api/dashboard/summary"],
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: ["/api/progress/overview"],
    });
  });

  it("does not duplicate create requests while pending", async () => {
    createState.isPending = true;
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Add task/i }));
    expect(screen.getByRole("button", { name: "Adding…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Adding…" }));
    expect(mutate).not.toHaveBeenCalled();
  });

  it("clears stale modal error when opening a fresh dialog", async () => {
    const { rerender, client } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Add task/i }));
    createState = {
      ...createState,
      isError: true,
      error: Object.assign(new Error("hidden"), { status: 500 }),
    };
    rerender(
      <QueryClientProvider client={client}>
        <StudyPlan />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Could not add task")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(reset).toHaveBeenCalled();
    createState = { ...createState, isError: false, error: null };
    fireEvent.click(screen.getByRole("button", { name: /Add task/i }));
    rerender(
      <QueryClientProvider client={client}>
        <StudyPlan />
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.queryByText("Could not add task")).not.toBeInTheDocument();
    });
  });
});
