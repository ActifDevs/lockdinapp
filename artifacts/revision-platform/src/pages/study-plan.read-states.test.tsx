import {
  createElement,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => createElement("a", { href, ...props }, children),
}));

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

const task = {
  id: 1,
  title: "Review mechanics",
  completed: false,
  priority: "medium",
  subjectId: 2,
  subjectName: "Physics",
  deadline: null,
};
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
const mutation = () => ({
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
});

beforeEach(() => {
  window.history.replaceState({}, "", "/study-plan");
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
  api.tasks.mockReturnValue(ok([task]));
  api.memberships.mockReturnValue(ok([membership]));
  api.create.mockReturnValue(mutation());
  api.update.mockReturnValue(mutation());
  api.remove.mockReturnValue(mutation());
  api.taskKey.mockImplementation((params?: unknown) => ["/api/tasks", params]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <StudyPlan />
    </QueryClientProvider>,
  );
}

describe("Study Plan read states", () => {
  it("shows the initial task loading state", () => {
    api.tasks.mockReturnValue({
      ...ok(undefined),
      isLoading: true,
      isPending: true,
    });
    renderPage();
    expect(
      screen.getByRole("status", { name: "Loading study plan tasks" }),
    ).toBeVisible();
  });

  it("keeps genuine zero tasks as the existing empty experience", () => {
    api.tasks.mockReturnValue(ok([]));
    renderPage();
    expect(screen.getByText("Ready to make progress?")).toBeVisible();
    expect(
      screen.queryByText("Tasks could not be loaded"),
    ).not.toBeInTheDocument();
  });

  it("shows task failure and retry instead of the empty experience", () => {
    const refetch = vi.fn();
    api.tasks.mockReturnValue({
      ...ok(undefined),
      isError: true,
      error: new Error("Failed to fetch"),
      refetch,
    });
    renderPage();
    expect(screen.getByText("Tasks could not be loaded")).toBeVisible();
    expect(
      screen.queryByText("Ready to make progress?"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("renders recovered tasks after retry", () => {
    api.tasks.mockReturnValue({
      ...ok(undefined),
      isError: true,
      error: new Error("Failed to fetch"),
    });
    const view = renderPage();
    api.tasks.mockReturnValue(ok([task]));
    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <StudyPlan />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Review mechanics")).toBeVisible();
    expect(
      screen.queryByText("Tasks could not be loaded"),
    ).not.toBeInTheDocument();
  });

  it("keeps cached tasks visible with a stale warning", () => {
    api.tasks.mockReturnValue({
      ...ok([task]),
      isError: true,
      error: new Error("Failed to fetch"),
    });
    renderPage();
    expect(screen.getByText("Review mechanics")).toBeVisible();
    expect(screen.getByText("Task refresh failed")).toBeVisible();
  });

  it("membership loading affects creation but not task viewing", () => {
    api.memberships.mockReturnValue({
      ...ok(undefined),
      isLoading: true,
      isPending: true,
    });
    renderPage();
    expect(screen.getByText("Review mechanics")).toBeVisible();
    expect(screen.getByRole("button", { name: /add task/i })).toBeDisabled();
  });

  it("membership failure keeps tasks usable and offers localized retry", () => {
    const refetch = vi.fn();
    api.memberships.mockReturnValue({
      ...ok(undefined),
      isError: true,
      error: Object.assign(new Error("forbidden"), { status: 403 }),
      refetch,
    });
    renderPage();
    expect(screen.getByText("Review mechanics")).toBeVisible();
    expect(screen.getByText("Task creation is unavailable")).toBeVisible();
    expect(screen.getByRole("button", { name: /add task/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("explains genuine zero memberships without presenting an error", () => {
    api.memberships.mockReturnValue(ok([]));
    renderPage();
    expect(screen.getByText(/Choose at least one subject/)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Open subject settings" }),
    ).toBeVisible();
    expect(
      screen.queryByText("Task creation is unavailable"),
    ).not.toBeInTheDocument();
  });
});

describe("Study Plan navigation state", () => {
  it.each([
    ["/study-plan", "Today", "today"],
    ["/study-plan?view=today", "Today", "today"],
    ["/study-plan?view=upcoming", "Upcoming", "upcoming"],
    ["/study-plan?view=completed", "Completed", "completed"],
    ["/study-plan?view=all", "All tasks", "all"],
  ])("restores %s and queries %s", (path, label, filter) => {
    window.history.replaceState({}, "", path);
    const view = renderPage();
    expect(screen.getByRole("tab", { name: label })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(api.tasks.mock.calls.at(-1)?.[0]).toEqual({ filter });
    expect(api.taskKey).toHaveBeenCalledWith({ filter });

    view.unmount();
    renderPage();
    expect(screen.getByRole("tab", { name: label })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(api.tasks.mock.calls.at(-1)?.[0]).toEqual({ filter });
  });

  it("pushes view/query changes, preserves params, and omits Today", async () => {
    window.history.replaceState({}, "", "/study-plan?keep=one&keep=two");
    const push = vi.spyOn(window.history, "pushState");
    renderPage();

    await userEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    await waitFor(() =>
      expect(api.tasks.mock.calls.at(-1)?.[0]).toEqual({
        filter: "upcoming",
      }),
    );
    expect(window.location.search).toBe("?keep=one&keep=two&view=upcoming");
    expect(api.taskKey).toHaveBeenCalledWith({ filter: "upcoming" });
    expect(push).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("tab", { name: "Today" }));
    expect(window.location.search).toBe("?keep=one&keep=two");
    expect(api.tasks.mock.calls.at(-1)?.[0]).toEqual({ filter: "today" });
  });

  it("never sends an invalid URL view to the task query", async () => {
    window.history.replaceState({}, "", "/study-plan?view=wat&keep=1");
    const replace = vi.spyOn(window.history, "replaceState");
    renderPage();
    expect(screen.getByRole("tab", { name: "Today" })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(
      api.tasks.mock.calls.every(([params]) => params.filter !== "wat"),
    ).toBe(true);
    expect(api.tasks.mock.calls.at(-1)?.[0]).toEqual({ filter: "today" });
    await waitFor(() => expect(window.location.search).toBe("?keep=1"));
    expect(replace).toHaveBeenCalled();
  });

  it("restores matching view and query through Back and Forward", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("tab", { name: "Upcoming" }));
    await userEvent.click(screen.getByRole("tab", { name: "Completed" }));

    await act(async () => window.history.back());
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute(
        "data-state",
        "active",
      );
      expect(api.tasks.mock.calls.at(-1)?.[0]).toEqual({ filter: "upcoming" });
    });

    await act(async () => window.history.forward());
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Completed" })).toHaveAttribute(
        "data-state",
        "active",
      );
      expect(api.tasks.mock.calls.at(-1)?.[0]).toEqual({ filter: "completed" });
    });
  });
});
