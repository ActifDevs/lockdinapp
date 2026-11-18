import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { addDays, format } from "date-fns";
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

describe("Dashboard unified today's mission", () => {
  it("renders one mission heading, one primary CTA, and one progress indicator", () => {
    const { container } = renderPage();

    expect(
      screen.getAllByRole("heading", { name: "Today's mission" }),
    ).toHaveLength(1);
    expect(container.querySelectorAll("[data-mission-cta='primary']")).toHaveLength(
      1,
    );
    expect(
      screen.getByRole("link", { name: /start session/i }),
    ).toHaveAttribute("href", "#todays-mission-tasks");
    expect(screen.queryByRole("link", { name: /open mission/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /log a paper/i })).toBeNull();
    expect(
      screen.getAllByRole("progressbar", { name: "Today's mission progress" }),
    ).toHaveLength(1);
    expect(screen.getAllByText(/streak 1 day/i)).toHaveLength(1);
    expect(screen.queryByText("Study streak")).toBeNull();
    expect(screen.queryByText("Earned today")).toBeNull();
  });

  it("keeps empty-mission creation as the only primary CTA", () => {
    api.summary.mockReturnValue(
      ok({
        ...summary,
        todayTasksTotal: 0,
        todayTasksCompleted: 0,
        todayTasks: [],
      }),
    );
    const { container } = renderPage();

    expect(
      screen.getByRole("link", { name: /create today's mission/i }),
    ).toHaveAttribute("href", "/study-plan");
    expect(container.querySelectorAll("[data-mission-cta='primary']")).toHaveLength(
      1,
    );
    expect(
      screen.queryByRole("progressbar", { name: "Today's mission progress" }),
    ).toBeNull();
  });
});

describe("Dashboard what's next", () => {
  it("lists future deadlines and exams in date order and skips today's tasks", () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const later = format(addDays(new Date(), 8), "yyyy-MM-dd");

    api.summary.mockReturnValue(
      ok({
        ...summary,
        upcomingDeadlines: [
          { ...task, id: 1, title: "Due today", deadline: today },
          {
            ...task,
            id: 2,
            title: "Complete Mechanics revision",
            deadline: tomorrow,
          },
        ],
        upcomingExams: [
          {
            id: 9,
            subjectId: 2,
            subjectName: "Mathematics",
            subjectColor: "#0f766e",
            paperCode: "9709 Paper 3",
            date: later,
            notes: null,
          },
        ],
      }),
    );

    renderPage();

    expect(
      screen.getByRole("heading", { name: "What's Next?" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Your Progress & Activity" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /study plan/i })).toHaveAttribute(
      "href",
      "/study-plan",
    );
    expect(screen.getByRole("link", { name: /calendar/i })).toHaveAttribute(
      "href",
      "/calendar",
    );
    expect(screen.queryByText("Due today")).toBeNull();
    expect(screen.getByText("Complete Mechanics revision")).toBeVisible();
    expect(screen.getByText("Mathematics 9709 Paper 3")).toBeVisible();
    expect(screen.getByText("Deadline")).toBeVisible();
    expect(screen.getByText("Exam")).toBeVisible();
    expect(screen.queryByText("Approaching deadlines")).toBeNull();
    expect(screen.queryByText("Upcoming exams")).toBeNull();
  });
});

describe("Dashboard progress and activity", () => {
  it("shows compact paper rows, week caption, and a quiet achievements heading", () => {
    api.summary.mockReturnValue(
      ok({
        ...summary,
        recentPerformance: [
          {
            subjectId: 2,
            subjectName: "Physics",
            subjectColor: "#2563eb",
            paperLabel: "9702/1 — May/June 2024",
            previousPercentage: 50,
            latestPercentage: 80,
            change: 30,
          },
        ],
      }),
    );
    api.progress.mockReturnValue(
      ok({
        ...progress,
        weeklyTasksCompleted: [
          { date: "2026-11-12", tasksCompleted: 0 },
          { date: "2026-11-13", tasksCompleted: 0 },
          { date: "2026-11-14", tasksCompleted: 0 },
          { date: "2026-11-15", tasksCompleted: 0 },
          { date: "2026-11-16", tasksCompleted: 0 },
          { date: "2026-11-17", tasksCompleted: 0 },
          { date: "2026-11-18", tasksCompleted: 0 },
        ],
      }),
    );

    renderPage();

    expect(
      screen.getByRole("heading", { name: "Your Progress & Activity" }),
    ).toBeVisible();
    expect(screen.getByText("9702/1 — May/June 2024")).toBeVisible();
    expect(screen.getByText("80%")).toBeVisible();
    expect(screen.getByText("30%")).toBeVisible();
    expect(screen.getByRole("link", { name: /view all/i })).toHaveAttribute(
      "href",
      "/past-papers",
    );
    expect(
      screen.queryByRole("link", { name: /9702\/1 — May\/June 2024/i }),
    ).toBeNull();
    expect(screen.getByRole("link", { name: /details/i })).toHaveAttribute(
      "href",
      "/progress",
    );
    expect(
      screen.getByText("No tasks completed in the last seven days."),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 3, name: "Achievements" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("progressbar", { name: "Achievements unlocked" }),
    ).toBeNull();
    expect(screen.getByText("First A Grade")).toBeVisible();
    expect(screen.getByText("Next: 30 Day Streak")).toBeVisible();
    expect(screen.queryByText("Start building your paper bank")).toBeNull();
  });

  it("keeps compact paper empty-state navigation", () => {
    renderPage();

    expect(
      screen.getByRole("link", { name: /log your first paper/i }),
    ).toHaveAttribute("href", "/past-papers");
    expect(screen.getByRole("link", { name: /view all/i })).toHaveAttribute(
      "href",
      "/past-papers",
    );
    expect(screen.getByText("This week")).toBeVisible();
    expect(
      screen.getByText("No activity recorded in the last seven days."),
    ).toBeVisible();
    expect(screen.queryByText("Start building your paper bank")).toBeNull();
    const papersHeading = screen.getByRole("heading", { name: "Recent papers" });
    const papersCard = papersHeading.closest(".dash-insight-card");
    expect(papersCard).toHaveClass("lg:self-start");
    expect(papersCard).not.toHaveClass("h-full");
  });
});
