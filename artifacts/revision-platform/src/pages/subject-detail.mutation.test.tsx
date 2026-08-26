import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
const toast = vi.hoisted(() => vi.fn());

vi.mock("wouter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wouter")>()),
  useRoute: () => [true, { id: "9" }],
  Link: ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => createElement("a", { href }, children),
}));
vi.mock("@/hooks/use-toast", () => ({ toast }));
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
  topicsTotal: 2,
};
const syllabus = [
  {
    id: 1,
    title: "1 Pure mathematics",
    topics: [
      { id: 11, title: "1 Algebra", status: "not_started", notes: null },
      { id: 12, title: "2 Quadratics", status: "not_started", notes: null },
    ],
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

let topicMutation: { onSuccess?: () => void; onError?: (error: unknown) => void } =
  {};
let taskMutation: { onSuccess?: () => void; onError?: (error: unknown) => void } =
  {};
const topicMutate = vi.fn();
const topicMutateAsync = vi.fn();
const taskMutate = vi.fn();

beforeEach(() => {
  window.history.replaceState({}, "", "/subjects/9?tab=syllabus");
  toast.mockReset();
  topicMutate.mockReset();
  topicMutateAsync.mockReset();
  taskMutate.mockReset();
  topicMutation = {};
  taskMutation = {};
  api.subject.mockReturnValue(ok(subject));
  api.syllabus.mockReturnValue(ok(syllabus));
  api.performance.mockReturnValue(
    ok({
      latestScore: null,
      papersCompleted: 0,
      averageScore: null,
      bestScore: null,
      insight: null,
      trend: [],
      componentBreakdown: [],
    }),
  );
  api.tasks.mockReturnValue(
    ok([
      {
        id: 21,
        title: "Practice algebra",
        completed: false,
        priority: "medium",
        subjectId: 9,
        subjectName: "Mathematics",
        deadline: null,
      },
    ]),
  );
  api.attempts.mockReturnValue(ok([]));
  api.updateTopic.mockImplementation(
    (opts?: { mutation?: typeof topicMutation }) => {
      if (opts?.mutation) topicMutation = opts.mutation;
      return {
        mutate: topicMutate,
        mutateAsync: topicMutateAsync,
        isPending: false,
      };
    },
  );
  api.updateTask.mockImplementation(
    (opts?: { mutation?: typeof taskMutation }) => {
      taskMutation = opts?.mutation ?? {};
      return { mutate: taskMutate, isPending: false };
    },
  );
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
        <SubjectDetail />
      </QueryClientProvider>,
    ),
  };
}

describe("Subject Detail mutations", () => {
  it("toasts a safe message when a task toggle fails and keeps the tab", () => {
    window.history.replaceState({}, "", "/subjects/9?tab=tasks");
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: /Tasks/ }));
    fireEvent.click(
      screen.getByRole("button", { name: 'Mark "Practice algebra" as complete' }),
    );
    expect(taskMutate).toHaveBeenCalledOnce();
    taskMutation.onError?.(
      Object.assign(new Error("db boom"), { status: 500 }),
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Could not update task",
        description:
          "The API returned a server error. Please retry while we investigate.",
      }),
    );
    expect(window.location.search).toContain("tab=tasks");
  });

  it("toasts a safe message when a single topic cycle fails", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Syllabus" }));
    fireEvent.click(screen.getByText("Pure mathematics"));
    fireEvent.click(
      screen.getByRole("button", {
        name: "1 Algebra: Not started. Mark as in progress.",
      }),
    );
    expect(topicMutate).toHaveBeenCalledOnce();
    topicMutation.onError?.(
      Object.assign(new Error("permission denied internals"), { status: 403 }),
    );
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Could not update topic",
        description: "You don't have permission to complete this action.",
      }),
    );
    expect(window.location.search).toContain("tab=syllabus");
  });

  it("invalidates topic aggregates once on single-topic success", () => {
    const { client } = renderPage();
    const spy = vi.spyOn(client, "invalidateQueries");
    fireEvent.click(screen.getByRole("tab", { name: "Syllabus" }));
    fireEvent.click(screen.getByText("Pure mathematics"));
    fireEvent.click(
      screen.getByRole("button", {
        name: "1 Algebra: Not started. Mark as in progress.",
      }),
    );
    topicMutation.onSuccess?.();
    expect(spy).toHaveBeenCalledWith({
      queryKey: ["/api/subjects/9/syllabus"],
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["/api/subjects/9"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["/api/progress/overview"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["/api/dashboard/summary"] });
  });

  it("settles bulk updates, toasts once, clears busy, and invalidates once", async () => {
    topicMutateAsync
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("second topic failed"));
    const { client } = renderPage();
    const spy = vi.spyOn(client, "invalidateQueries");
    fireEvent.click(screen.getByRole("tab", { name: "Syllabus" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Mark all subtopics in Pure mathematics as completed",
      }),
    );
    await screen.findByRole("button", {
      name: "Mark all subtopics in Pure mathematics as completed",
    });
    expect(topicMutateAsync).toHaveBeenCalledTimes(2);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Could not update all topics",
      }),
    );
    expect(spy.mock.calls.filter((call) => call[0]?.queryKey?.[0] === "/api/subjects/9/syllabus")).toHaveLength(1);
    expect(
      screen.getByRole("button", {
        name: "Mark all subtopics in Pure mathematics as completed",
      }),
    ).not.toBeDisabled();
  });
});
