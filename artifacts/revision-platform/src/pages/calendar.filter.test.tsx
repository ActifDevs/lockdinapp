import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
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

const physicsTask = {
  id: 1,
  subjectId: 2,
  subjectName: "Physics",
  subjectColor: "#2563eb",
  title: "Waves homework",
  deadline: "2026-08-25",
  estimatedMinutes: 45,
  status: "pending",
};

const mathsExam = {
  id: 8,
  subjectId: 9,
  subjectName: "Mathematics",
  subjectColor: "#0f766e",
  paperCode: "9709/1",
  date: "2026-08-31",
};

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
  api.tasks.mockReturnValue(ok([physicsTask]));
  api.exams.mockReturnValue(ok([mathsExam]));
  api.memberships.mockReturnValue(
    ok([
      { subject: { id: 2, name: "Physics", code: "9702", color: "#2563eb" } },
      {
        subject: { id: 9, name: "Mathematics", code: "9709", color: "#0f766e" },
      },
    ]),
  );
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

function openFilter() {
  fireEvent.click(screen.getAllByRole("button", { name: "Filter calendar" })[0]);
  return screen.getByRole("dialog", { name: "Calendar filters" });
}

describe("Calendar filter", () => {
  it("keeps tasks, exams, and the URL until a filter is chosen", () => {
    renderPage();
    expect(screen.getAllByText("Waves homework").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("gridcell", {
        name: /Monday, August 31, 2026, 1 event/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", {
        name: /Mathematics 9709\/1, 6 days away on August 31/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute(
      "href",
      "/study-plan",
    );
    expect(screen.getByLabelText("1 Tasks")).toBeInTheDocument();
    expect(screen.getByLabelText("1 Exams")).toBeInTheDocument();
    expect(screen.getByLabelText("45m Planned")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("hides exams from the grid, rail, and overview when Tasks is selected", () => {
    renderPage();
    const panel = openFilter();
    fireEvent.click(within(panel).getByRole("radio", { name: "Tasks" }));

    expect(screen.getAllByText("Waves homework").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("gridcell", {
        name: /Monday, August 31, 2026, no events/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No exams in the next 60 days."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("listitem", { name: /Mathematics 9709\/1/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("1 Tasks")).toBeInTheDocument();
    expect(screen.getByLabelText("0 Exams")).toBeInTheDocument();
    expect(screen.getByLabelText("45m Planned")).toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(
      screen.getAllByRole("button", { name: "Filter calendar (filters on)" })
        .length,
    ).toBeGreaterThan(0);
  });

  it("hides other subjects and can be cleared", () => {
    renderPage();
    let panel = openFilter();
    fireEvent.click(within(panel).getByRole("radio", { name: "Physics" }));

    expect(screen.getAllByText("Waves homework").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("gridcell", {
        name: /Monday, August 31, 2026, no events/,
      }),
    ).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Clear filters" }));
    expect(
      screen.getByRole("gridcell", {
        name: /Monday, August 31, 2026, 1 event/,
      }),
    ).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("radio", { name: "Mathematics" }));
    expect(screen.queryByText("Waves homework")).not.toBeInTheDocument();
    expect(screen.getByText("Nothing planned for today")).toBeInTheDocument();
    expect(screen.getByLabelText("0 Tasks")).toBeInTheDocument();
    expect(screen.getByLabelText("1 Exams")).toBeInTheDocument();
    expect(screen.getByLabelText("0m Planned")).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", {
        name: /Mathematics 9709\/1, 6 days away on August 31/,
      }),
    ).toBeInTheDocument();
  });

  it("still offers subjects from loaded items when memberships are empty", () => {
    api.memberships.mockReturnValue(ok([]));
    renderPage();
    const panel = openFilter();
    expect(
      within(panel).getByRole("radio", { name: "Physics" }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("radio", { name: "Mathematics" }),
    ).toBeInTheDocument();
  });
});
