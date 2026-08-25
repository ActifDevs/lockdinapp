import {
  createElement,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  subject: vi.fn(),
  syllabus: vi.fn(),
  performance: vi.fn(),
  tasks: vi.fn(),
  attempts: vi.fn(),
  updateTopic: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("wouter", () => ({
  useRoute: () => [true, { id: "9" }],
  Link: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => createElement("a", { href, ...props }, children),
}));

vi.mock("@/components/charts/score-trend-line-chart", () => ({
  default: () => null,
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetSubjectQueryKey: (id: number) => [`/api/subjects/${id}`],
  getGetSubjectSyllabusQueryKey: (id: number) => [
    `/api/subjects/${id}/syllabus`,
  ],
  getGetSubjectPerformanceQueryKey: (id: number) => [
    `/api/subjects/${id}/performance`,
  ],
  getListTasksQueryKey: () => ["/api/tasks"],
  getListPastPaperAttemptsQueryKey: () => ["/api/past-paper-attempts"],
  getGetDashboardSummaryQueryKey: () => ["/api/dashboard/summary"],
  getGetProgressOverviewQueryKey: () => ["/api/progress/overview"],
  useGetSubject: api.subject,
  useGetSubjectSyllabus: api.syllabus,
  useGetSubjectPerformance: api.performance,
  useListTasks: api.tasks,
  useListPastPaperAttempts: api.attempts,
  useUpdateSyllabusTopic: api.updateTopic,
  useUpdateTask: api.updateTask,
}));

import SubjectDetail from "./subject-detail";

const subject = {
  id: 9,
  name: "Mathematics",
  code: "9709",
  color: "#0f766e",
  topicsTotal: 1,
};
const syllabus = [
  {
    id: 1,
    title: "1 Pure mathematics",
    topics: [
      { id: 11, title: "1 Algebra", status: "not_started", notes: null },
    ],
  },
];
const performance = {
  latestScore: null,
  papersCompleted: 0,
  averageScore: null,
  bestScore: null,
  insight: null,
  trend: [],
  componentBreakdown: [],
};
const tasks = [
  {
    id: 21,
    title: "Practice algebra",
    completed: false,
    priority: "medium",
    subjectId: 9,
    subjectName: "Mathematics",
    deadline: null,
  },
];

const ok = (data: unknown) => ({
  data,
  isPending: false,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
});

beforeEach(() => {
  api.subject.mockReturnValue(ok(subject));
  api.syllabus.mockReturnValue(ok(syllabus));
  api.performance.mockReturnValue(ok(performance));
  api.tasks.mockReturnValue(ok(tasks));
  api.attempts.mockReturnValue(ok([]));
  api.updateTopic.mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  });
  api.updateTask.mockReturnValue({ mutate: vi.fn(), isPending: false });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SubjectDetail />
    </QueryClientProvider>,
  );
}

describe("Subject Detail read states", () => {
  it("shows primary loading before subject content", () => {
    api.subject.mockReturnValue({
      ...ok(undefined),
      isPending: true,
      isLoading: true,
    });
    renderPage();
    expect(
      screen.getByRole("status", { name: "Loading subject" }),
    ).toBeVisible();
    expect(screen.queryByText("Mathematics")).not.toBeInTheDocument();
  });

  it("renders primary success", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Mathematics" })).toBeVisible();
    expect(screen.getByText("Practice algebra")).toBeVisible();
  });

  it("uses a deliberate non-retry-first 404 presentation", () => {
    api.subject.mockReturnValue({
      ...ok(undefined),
      isError: true,
      error: Object.assign(new Error("hidden"), { status: 404 }),
    });
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Subject not found" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Back to subjects" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument();
  });

  it("keeps transient primary failures retryable", () => {
    const refetch = vi.fn();
    api.subject.mockReturnValue({
      ...ok(undefined),
      isError: true,
      error: Object.assign(new Error("forbidden"), { status: 403 }),
      refetch,
    });
    renderPage();
    expect(
      screen.getByText("You don't have permission to view this information."),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("keeps cached subject content visible after refresh failure", () => {
    api.subject.mockReturnValue({
      ...ok(subject),
      isError: true,
      error: new Error("Failed to fetch"),
    });
    renderPage();
    expect(screen.getByRole("heading", { name: "Mathematics" })).toBeVisible();
    expect(screen.getByText("Subject refresh failed")).toBeVisible();
  });

  it("localizes syllabus loading and failure without claiming zero progress", async () => {
    api.syllabus.mockReturnValue({
      ...ok(undefined),
      isPending: true,
      isLoading: true,
    });
    const view = renderPage();
    expect(screen.getByText("Loading…")).toBeVisible();
    await userEvent.click(screen.getByRole("tab", { name: "Syllabus" }));
    expect(
      screen.getByRole("status", { name: "Loading syllabus" }),
    ).toBeVisible();

    api.syllabus.mockReturnValue({
      ...ok(undefined),
      isError: true,
      error: new Error("Failed to fetch"),
    });
    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <SubjectDetail />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Unavailable")).toBeVisible();
    expect(screen.getByText("Syllabus is unavailable")).toBeVisible();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mathematics" })).toBeVisible();
  });

  it("retries a failed syllabus and renders recovered data", async () => {
    const refetch = vi.fn();
    api.syllabus.mockReturnValue({
      ...ok(undefined),
      isError: true,
      error: new Error("Failed to fetch"),
      refetch,
    });
    const view = renderPage();
    await userEvent.click(screen.getByRole("tab", { name: "Syllabus" }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();

    api.syllabus.mockReturnValue(ok(syllabus));
    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <SubjectDetail />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Pure mathematics")).toBeVisible();
  });

  it("does not turn performance or task failures into empty-data claims", () => {
    api.performance.mockReturnValue({
      ...ok(undefined),
      isError: true,
      error: new Error("HTTP 500 Internal Server Error"),
    });
    api.tasks.mockReturnValue({
      ...ok(undefined),
      isError: true,
      error: new Error("Failed to fetch"),
    });
    renderPage();
    expect(screen.getByText("Performance is unavailable")).toBeVisible();
    expect(screen.getByText("Tasks are unavailable")).toBeVisible();
    expect(screen.queryByText("No pending tasks")).not.toBeInTheDocument();
    expect(screen.queryByText("0 papers")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mathematics" })).toBeVisible();
  });
});
