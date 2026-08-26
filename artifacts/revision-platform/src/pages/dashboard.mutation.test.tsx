import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  summary: vi.fn(),
  progress: vi.fn(),
  memberships: vi.fn(),
  update: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-toast", () => ({ toast }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-a",
      name: "Amina",
      examSession: "May/June 2027",
      level: "A Level",
    },
  }),
}));
vi.mock("@/components/charts/weekly-activity-bar-chart", () => ({
  default: () => null,
}));
vi.mock("@workspace/api-client-react", () => ({
  getGetDashboardSummaryQueryKey: () => ["/api/dashboard/summary"],
  getGetProgressOverviewQueryKey: () => ["/api/progress/overview"],
  getListCurrentUserSubjectsQueryKey: () => ["/api/user-subjects"],
  getListTasksQueryKey: () => ["/api/tasks"],
  useGetDashboardSummary: api.summary,
  useGetProgressOverview: api.progress,
  useListCurrentUserSubjects: api.memberships,
  useUpdateTask: api.update,
}));

import Dashboard from "./dashboard";

const task = {
  id: 7,
  title: "Review mechanics",
  completed: false,
  priority: "medium",
  subjectId: 2,
  subjectName: "Physics",
  deadline: null,
};
const summary = {
  studentName: "Amina",
  studyStreakDays: 1,
  todayTasksTotal: 1,
  todayTasksCompleted: 0,
  todayTasks: [task],
  upcomingDeadlines: [],
  subjectProgressSummary: [],
  recentPerformance: [],
  upcomingExams: [],
};
const progress = {
  syllabusCompletion: [],
  weeklyTasksCompleted: [],
  subjectAttentionNeeded: [],
  totalTasksCompleted: 0,
  totalPapersLogged: 0,
  overallSyllabusProgress: 0,
};
const ok = (data: unknown) => ({
  data,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
});

let mutation: { onSuccess?: () => void; onError?: (error: unknown) => void } =
  {};
const mutate = vi.fn();

beforeEach(() => {
  localStorage.clear();
  toast.mockReset();
  mutate.mockReset();
  mutation = {};
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
  api.summary.mockReturnValue(ok(summary));
  api.progress.mockReturnValue(ok(progress));
  api.memberships.mockReturnValue(
    ok([{ subject: { id: 2, name: "Physics", code: "9702", color: "#2563eb" } }]),
  );
  api.update.mockImplementation((opts?: { mutation?: typeof mutation }) => {
    mutation = opts?.mutation ?? {};
    return { mutate, isPending: false };
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <Dashboard />
      </QueryClientProvider>,
    ),
  };
}

describe("Dashboard mission task mutations", () => {
  it("shows a safe toast on toggle failure without raw server detail", () => {
    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: 'Mark "Review mechanics" as complete' }),
    );
    expect(mutate).toHaveBeenCalledOnce();
    mutation.onError?.(
      Object.assign(new Error("SQLSTATE 23503"), { status: 500 }),
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Could not update task",
        variant: "destructive",
        description:
          "The API returned a server error. Please retry while we investigate.",
      }),
    );
    expect(JSON.stringify(toast.mock.calls)).not.toContain("SQLSTATE");
  });

  it("keeps 403 local and does not duplicate while pending", () => {
    api.update.mockImplementation((opts?: { mutation?: typeof mutation }) => {
      mutation = opts?.mutation ?? {};
      return { mutate, isPending: true };
    });
    renderPage();
    const checkbox = screen.getByRole("button", {
      name: 'Mark "Review mechanics" as complete',
    });
    expect(checkbox).toBeDisabled();
    fireEvent.click(checkbox);
    expect(mutate).not.toHaveBeenCalled();
    mutation.onError?.(
      Object.assign(new Error("forbidden internals"), { status: 403 }),
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "You don't have permission to complete this action.",
      }),
    );
  });

  it("invalidates task aggregates on success", () => {
    const { client } = renderPage();
    const spy = vi.spyOn(client, "invalidateQueries");
    fireEvent.click(
      screen.getByRole("button", { name: 'Mark "Review mechanics" as complete' }),
    );
    mutation.onSuccess?.();
    expect(spy).toHaveBeenCalledWith({ queryKey: ["/api/dashboard/summary"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["/api/progress/overview"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["/api/tasks"] });
  });
});
