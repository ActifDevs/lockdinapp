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
  exams: vi.fn(),
  memberships: vi.fn(),
  createTask: vi.fn(),
  createExam: vi.fn(),
}));

vi.mock("@workspace/api-client-react", () => ({
  getListTasksQueryKey: (params: unknown) => ["/api/tasks", params],
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

const ok = (data: unknown) => ({
  data,
  isPending: false,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
});

const failed = (refetch: () => void, error = new Error("HTTP 500")) => ({
  data: undefined,
  isPending: false,
  isLoading: false,
  isError: true,
  error,
  refetch,
});

const membership = {
  subject: { id: 2, name: "Physics", code: "9702", color: "#2563eb" },
};

function task(id: number, title: string, deadline = "2026-08-25") {
  return {
    id,
    subjectId: 2,
    subjectName: "Physics",
    subjectColor: "#2563eb",
    title,
    deadline,
    estimatedMinutes: 30,
    completed: false,
    priority: "medium",
  };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 7, 25, 12, 0, 0));
  window.history.replaceState({}, "", "/calendar");
  Element.prototype.scrollIntoView = vi.fn();
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
  api.tasks.mockReturnValue(ok([]));
  api.exams.mockReturnValue(ok([]));
  api.memberships.mockReturnValue(ok([membership]));
  api.createTask.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  });
  api.createExam.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CalendarPage />
    </QueryClientProvider>,
  );
}

describe("Calendar harden", () => {
  it("shows empty rail copy and zero overview counts", () => {
    renderPage();
    expect(screen.getByText("Nothing planned for today")).toBeInTheDocument();
    expect(
      screen.getByText("No exams in the next 60 days."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("0 Tasks")).toBeInTheDocument();
    expect(screen.getByLabelText("0 Exams")).toBeInTheDocument();
    expect(screen.getByLabelText("0m Planned")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute(
      "href",
      "/study-plan",
    );
  });

  it("retries a failed calendar load", () => {
    const refetchTasks = vi.fn();
    const refetchExams = vi.fn();
    api.tasks.mockReturnValue(failed(refetchTasks));
    api.exams.mockReturnValue(failed(refetchExams));
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load calendar",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetchTasks).toHaveBeenCalled();
    expect(refetchExams).toHaveBeenCalled();
  });

  it("keeps the calendar visible when subjects fail to load", () => {
    const refetchMemberships = vi.fn();
    api.memberships.mockReturnValue(failed(refetchMemberships));
    renderPage();
    expect(
      screen.getByText("Task and exam creation is unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add task \/ event/i }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetchMemberships).toHaveBeenCalled();
  });

  it("moves the selected day with arrow keys and keeps one tab stop", async () => {
    renderPage();
    const grid = screen.getByRole("grid", { name: "August 2026" });
    const todayCell = within(grid).getByRole("gridcell", {
      name: /Tuesday, August 25, 2026/,
    });
    expect(todayCell).toHaveAttribute("tabindex", "0");
    expect(
      within(grid)
        .getAllByRole("gridcell")
        .filter((cell) => cell.getAttribute("tabindex") === "0"),
    ).toHaveLength(1);

    todayCell.focus();
    fireEvent.keyDown(todayCell, { key: "ArrowRight" });
    await waitFor(() =>
      expect(window.location.search).toBe("?date=2026-08-26"),
    );
    expect(
      screen.getByText(/Selected: Wednesday, August 26, 2026/),
    ).toBeInTheDocument();
  });

  it("announces an active filter and focuses today's agenda", () => {
    renderPage();
    fireEvent.click(screen.getAllByRole("button", { name: "Filter calendar" })[0]);
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Calendar filters" })).getByRole(
        "radio",
        { name: "Tasks" },
      ),
    );
    expect(
      screen.getByText(/Selected: Tuesday, August 25, 2026.*Filters on: tasks/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View agenda" }));
    expect(document.getElementById("calendar-agenda-items")).toHaveFocus();
  });

  it("lists a mixed day of tasks and exams in the rail", () => {
    api.tasks.mockReturnValue(ok([task(1, "Waves homework")]));
    api.exams.mockReturnValue(
      ok([
        {
          id: 8,
          subjectId: 2,
          subjectName: "Physics",
          subjectColor: "#2563eb",
          paperCode: "9702/1",
          date: "2026-08-25",
        },
      ]),
    );
    renderPage();
    expect(
      screen.getByRole("gridcell", {
        name: /Tuesday, August 25, 2026, 2 events/,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Waves homework").length).toBeGreaterThan(0);
    expect(screen.getAllByText("9702/1").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("1 Tasks")).toBeInTheDocument();
    expect(screen.getByLabelText("1 Exams")).toBeInTheDocument();
  });

  it("shows overflow when a day is dense", () => {
    api.tasks.mockReturnValue(
      ok([
        task(1, "One"),
        task(2, "Two"),
        task(3, "Three"),
        task(4, "Four"),
      ]),
    );
    renderPage();
    expect(screen.getByText("+2 more")).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", {
        name: /Tuesday, August 25, 2026, 4 events/,
      }),
    ).toBeInTheDocument();
  });
});
