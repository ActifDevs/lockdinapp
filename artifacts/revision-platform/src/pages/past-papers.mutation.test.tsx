import { createElement, Fragment, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  useListCurrentUserSubjects: vi.fn(),
  useListPastPaperAttempts: vi.fn(),
  useListAssessmentComponents: vi.fn(),
  useCreatePastPaperAttempt: vi.fn(),
  useDeletePastPaperAttempt: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-toast", () => ({ toast }));
vi.mock("@workspace/api-client-react", () => ({
  PastPaperAttemptInputSession: { MayJune: "May/June" },
  getGetDashboardSummaryQueryKey: () => ["/api/dashboard/summary"],
  getGetProgressOverviewQueryKey: () => ["/api/progress/overview"],
  getGetSubjectPerformanceQueryKey: (subjectId: number) => [
    `/api/subjects/${subjectId}/performance`,
  ],
  getListAssessmentComponentsQueryKey: (subjectId: number) => [
    `/api/subjects/${subjectId}/assessment-components`,
  ],
  getListPastPaperAttemptsQueryKey: () => ["/api/past-paper-attempts"],
  getListCurrentUserSubjectsQueryKey: () => ["/api/user-subjects"],
  useCreatePastPaperAttempt: api.useCreatePastPaperAttempt,
  useDeletePastPaperAttempt: api.useDeletePastPaperAttempt,
  useListAssessmentComponents: api.useListAssessmentComponents,
  useListPastPaperAttempts: api.useListPastPaperAttempts,
  useListCurrentUserSubjects: api.useListCurrentUserSubjects,
}));
vi.mock("@/components/charts/score-trend-line-chart", () => ({
  default: () => null,
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
      value,
      defaultValue,
    }: {
      children: ReactNode;
      disabled?: boolean;
      onValueChange?: (value: string) => void;
      value?: string;
      defaultValue?: string;
    }) =>
      create(
        "select",
        {
          disabled,
          value: value ?? defaultValue ?? "",
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

import PastPapers from "./past-papers";

let createMutation: { onSuccess?: () => void } = {};
let deleteMutation: { onSuccess?: () => void; onError?: (error: unknown) => void } =
  {};
const createMutate = vi.fn();
const createReset = vi.fn();
const deleteMutate = vi.fn();
let createState = {
  mutate: createMutate,
  isPending: false,
  isError: false,
  error: null as unknown,
  reset: createReset,
};

beforeEach(() => {
  window.history.replaceState({}, "", "/past-papers?subject=9");
  toast.mockReset();
  createMutate.mockReset();
  createReset.mockReset();
  deleteMutate.mockReset();
  createMutation = {};
  deleteMutation = {};
  createState = {
    mutate: createMutate,
    isPending: false,
    isError: false,
    error: null,
    reset: createReset,
  };
  api.useListCurrentUserSubjects.mockReturnValue({
    data: [
      {
        subject: {
          id: 9,
          name: "Mathematics",
          code: "9709",
          color: "#0f766e",
          topicsTotal: 20,
        },
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  api.useListPastPaperAttempts.mockReturnValue({
    data: [
      {
        id: 1,
        subjectId: 9,
        subjectName: "Mathematics",
        subjectColor: "#0f766e",
        componentName: "Paper 1 Pure Mathematics 1",
        paperLabel: "9709/1",
        session: "May/June",
        year: 2026,
        score: 50,
        totalMarks: 75,
        percentage: 66.666666,
        dateAttempted: "2026-08-11",
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  api.useListAssessmentComponents.mockReturnValue({
    data: [
      {
        id: 42,
        subjectId: 9,
        paperCode: "9709/1",
        componentName: "Paper 1 Pure Mathematics 1",
        level: "AS Level",
        durationMinutes: 105,
        totalMarks: 75,
        weightingPercent: 60,
        orderIndex: 0,
      },
    ],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  api.useCreatePastPaperAttempt.mockImplementation(
    (opts?: { mutation?: typeof createMutation }) => {
      createMutation = opts?.mutation ?? {};
      return createState;
    },
  );
  api.useDeletePastPaperAttempt.mockImplementation(
    (opts?: { mutation?: typeof deleteMutation }) => {
      deleteMutation = opts?.mutation ?? {};
      return { mutate: deleteMutate, isPending: false };
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
        <PastPapers />
      </QueryClientProvider>,
    ),
  };
}

async function fillLogForm() {
  fireEvent.click(screen.getByRole("button", { name: /Log paper/i }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Paper Year"), {
    target: { value: "2026" },
  });
  fireEvent.change(within(dialog).getByLabelText("Score Achieved"), {
    target: { value: "40" },
  });
  fireEvent.change(within(dialog).getByLabelText("Total Marks"), {
    target: { value: "75" },
  });
  return dialog;
}

describe("Past Papers mutations", () => {
  it("shows a safe modal error and keeps entered data after create failure", async () => {
    const { rerender, client } = renderPage();
    const dialog = await fillLogForm();
    createMutate({
      data: {
        subjectId: 9,
        componentId: 42,
        session: "May/June",
        year: 2026,
        score: 40,
        totalMarks: 75,
        dateAttempted: "2026-08-25",
      },
    });
    expect(createMutate).toHaveBeenCalledOnce();
    createState = {
      ...createState,
      isError: true,
      error: Object.assign(new Error("insert failed stack"), { status: 500 }),
    };
    rerender(
      <QueryClientProvider client={client}>
        <PastPapers />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByLabelText("Paper Year")).toHaveValue(2026);
    expect(screen.getByLabelText("Score Achieved")).toHaveValue(40);
    expect(screen.getByText("Could not log attempt")).toBeVisible();
    expect(screen.queryByText("insert failed stack")).not.toBeInTheDocument();
    expect(window.location.search).toContain("subject=9");
  });

  it("retries create and invalidates attempt aggregates on success", async () => {
    const { client, rerender } = renderPage();
    const spy = vi.spyOn(client, "invalidateQueries");
    const dialog = await fillLogForm();
    createMutate({
      data: {
        subjectId: 9,
        componentId: 42,
        session: "May/June",
        year: 2026,
        score: 40,
        totalMarks: 75,
        dateAttempted: "2026-08-25",
      },
    });
    createState = {
      ...createState,
      isError: true,
      error: Object.assign(new Error("hidden"), { status: 403 }),
    };
    rerender(
      <QueryClientProvider client={client}>
        <PastPapers />
      </QueryClientProvider>,
    );
    createMutate({
      data: {
        subjectId: 9,
        componentId: 42,
        session: "May/June",
        year: 2026,
        score: 40,
        totalMarks: 75,
        dateAttempted: "2026-08-25",
      },
    });
    expect(createMutate).toHaveBeenCalledTimes(2);
    fireEvent.change(
      within(dialog).getByRole("option", { name: "Mathematics" }).closest("select")!,
      { target: { value: "9" } },
    );
    createMutation.onSuccess?.();
    expect(spy).toHaveBeenCalledWith({
      queryKey: ["/api/past-paper-attempts"],
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["/api/dashboard/summary"] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["/api/progress/overview"] });
    expect(spy).toHaveBeenCalledWith({
      queryKey: ["/api/subjects/9/performance"],
    });
  });

  it("does not submit while logging is pending", async () => {
    createState.isPending = true;
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Log paper/i }));
    expect(screen.getByRole("button", { name: "Logging..." })).toBeDisabled();
  });

  it("toasts a safe message when delete fails", () => {
    renderPage();
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Delete paper: Mathematics 9709/1",
      })[0]!,
    );
    expect(deleteMutate).toHaveBeenCalledOnce();
    deleteMutation.onError?.(
      Object.assign(new Error("fk violation"), { status: 500 }),
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Could not delete attempt",
        description:
          "The API returned a server error. Please retry while we investigate.",
      }),
    );
    expect(window.location.search).toContain("subject=9");
  });
});
