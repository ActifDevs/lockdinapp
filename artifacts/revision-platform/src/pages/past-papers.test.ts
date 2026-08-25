import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, Fragment, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  useListCurrentUserSubjects: vi.fn(),
  useListPastPaperAttempts: vi.fn(),
  useListAssessmentComponents: vi.fn(),
  useCreatePastPaperAttempt: vi.fn(),
  useDeletePastPaperAttempt: vi.fn(),
}));

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
  useCreatePastPaperAttempt: apiMocks.useCreatePastPaperAttempt,
  useDeletePastPaperAttempt: apiMocks.useDeletePastPaperAttempt,
  useListAssessmentComponents: apiMocks.useListAssessmentComponents,
  useListPastPaperAttempts: apiMocks.useListPastPaperAttempts,
  useListCurrentUserSubjects: apiMocks.useListCurrentUserSubjects,
}));

vi.mock("@/components/charts/score-trend-line-chart", () => ({
  default: () => null,
}));

vi.mock("@/components/responsive-form-panel", () => ({
  ResponsiveFormPanel: ({ children }: { children: ReactNode }) =>
    createElement(Fragment, null, children),
}));

vi.mock("@/components/ui/select", async () => {
  const { createElement: create } = await import("react");
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
      create(Fragment, null, children),
    SelectItem: ({ children, value }: { children: ReactNode; value: string }) =>
      create("option", { value }, children),
    SelectTrigger: () => null,
    SelectValue: () => null,
  };
});

import PastPapers from "./past-papers";

const source = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "past-papers.tsx"),
  "utf8",
);

beforeEach(() => {
  apiMocks.useListCurrentUserSubjects.mockReturnValue({
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
  apiMocks.useListPastPaperAttempts.mockReturnValue({
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
  apiMocks.useListAssessmentComponents.mockReturnValue({
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
      {
        id: 46,
        subjectId: 9,
        paperCode: "9709/1",
        componentName: "Paper 1 Pure Mathematics 1",
        level: "A Level",
        durationMinutes: 105,
        totalMarks: 75,
        weightingPercent: 30,
        orderIndex: 4,
      },
    ],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  apiMocks.useCreatePastPaperAttempt.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  apiMocks.useDeletePastPaperAttempt.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPastPapers() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(PastPapers),
    ),
  );
}

describe("past-paper ownership and year UI wiring", () => {
  it("requires an explicit four-digit paper year and sends it on create", () => {
    expect(source).toMatch(
      /year:\s*z\.coerce\s*\.number\(\)\s*\.int\(\)\s*\.min\(1000/,
    );
    expect(source).toMatch(/max\(9999/);
    expect(source).toMatch(/name="year"/);
    expect(source).toMatch(/<FormLabel>Paper Year<\/FormLabel>/);
    expect(source).toMatch(/year:\s*data\.year/);
    expect(source).not.toMatch(/year:\s*new Date\(\)\.getFullYear/);
  });

  it("shows year in paper identity and provides create/delete only", () => {
    expect(source).toMatch(/`\$\{p\.session\} \$\{p\.year\}`/);
    expect(source).toMatch(/\{paper\.session\} \{paper\.year\}/);
    expect(source).toMatch(/useCreatePastPaperAttempt/);
    expect(source).toMatch(/useDeletePastPaperAttempt/);
    expect(source).not.toMatch(/useUpdatePastPaperAttempt|\.patch\(/);
    expect(source).not.toMatch(/userId:\s*data|ownerId:\s*data/);
  });

  it("uses current memberships for selectors and submits the raw calendar date", () => {
    expect(source).toMatch(/useListCurrentUserSubjects/);
    expect(source).not.toMatch(/useListSubjects/);
    expect(source).toMatch(/dateAttempted:\s*data\.dateAttempted/);
    expect(source).not.toMatch(/new Date\(data\.dateAttempted\)\.toISOString/);
  });

  it("invalidates every affected caller-owned aggregate after create/delete", () => {
    for (const key of [
      "getListPastPaperAttemptsQueryKey",
      "getGetDashboardSummaryQueryKey",
      "getGetProgressOverviewQueryKey",
      "getGetSubjectPerformanceQueryKey",
    ]) {
      expect(source.match(new RegExp(key, "g"))?.length).toBeGreaterThanOrEqual(
        3,
      );
    }
  });

  it("renders bounded percentage precision in the visible paper log", () => {
    renderPastPapers();

    expect(screen.getAllByText("66.7%").length).toBeGreaterThan(0);
    expect(screen.queryByText("66.666666%")).not.toBeInTheDocument();
  });

  it("keeps same-code AS and A Level components independently selectable by ID", async () => {
    renderPastPapers();

    const mathematicsOptions = screen.getAllByRole("option", {
      name: "Mathematics",
    });
    const subjectSelect = mathematicsOptions.at(-1)?.closest("select");
    expect(subjectSelect).not.toBeNull();
    fireEvent.change(subjectSelect!, { target: { value: "9" } });

    const asOption = screen.getByRole("option", {
      name: "9709/1 — Paper 1 Pure Mathematics 1 — AS Level",
    }) as HTMLOptionElement;
    const aLevelOption = screen.getByRole("option", {
      name: "9709/1 — Paper 1 Pure Mathematics 1 — A Level",
    }) as HTMLOptionElement;
    const componentSelect = asOption.closest("select");

    expect(componentSelect).not.toBeNull();
    await waitFor(() => expect(componentSelect).toBeEnabled());
    expect(asOption.value).toBe("42");
    expect(aLevelOption.value).toBe("46");

    fireEvent.change(componentSelect!, { target: { value: "42" } });
    expect(componentSelect).toHaveValue("42");
    fireEvent.change(componentSelect!, { target: { value: "46" } });
    expect(componentSelect).toHaveValue("46");
  });

  it("disables logging while memberships load", () => {
    apiMocks.useListCurrentUserSubjects.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });
    renderPastPapers();
    expect(
      screen.getAllByRole("button", { name: /log paper/i })[0],
    ).toBeDisabled();
  });

  it("shows a Settings CTA when there are no current memberships", () => {
    apiMocks.useListCurrentUserSubjects.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderPastPapers();
    expect(screen.getByText("Choose subjects in Settings")).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: /log paper/i })[0],
    ).toBeDisabled();
    expect(screen.getByRole("option", { name: "All Subjects" })).toBeVisible();
  });

  it("resets an invalid filter and form subject after membership removal", async () => {
    const view = renderPastPapers();
    const mathematicsOptions = screen.getAllByRole("option", {
      name: "Mathematics",
    });
    fireEvent.change(mathematicsOptions[0]!.closest("select")!, {
      target: { value: "9" },
    });
    fireEvent.change(mathematicsOptions.at(-1)!.closest("select")!, {
      target: { value: "9" },
    });

    apiMocks.useListCurrentUserSubjects.mockReturnValue({
      data: [
        {
          subject: {
            id: 10,
            name: "Physics",
            code: "9702",
            color: "#1d4ed8",
            topicsTotal: 18,
          },
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    view.rerender(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(PastPapers),
      ),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: "All Subjects" }).closest("select"),
      ).toHaveValue("all");
      expect(
        screen.queryByRole("option", { name: "Mathematics" }),
      ).not.toBeInTheDocument();
    });
    expect(source).toContain(
      'form.setValue("subjectId", undefined as unknown as number)',
    );
  });

  it("keeps genuine zero attempts as the paper-bank empty experience", () => {
    apiMocks.useListPastPaperAttempts.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPastPapers();
    expect(screen.getByText("Start building your paper bank")).toBeVisible();
    expect(
      screen.queryByText("Past papers could not be loaded"),
    ).not.toBeInTheDocument();
  });

  it("shows attempts failure and retry instead of false empty history", () => {
    const refetch = vi.fn();
    apiMocks.useListPastPaperAttempts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Failed to fetch"),
      refetch,
    });
    renderPastPapers();
    expect(screen.getByText("Past papers could not be loaded")).toBeVisible();
    expect(
      screen.queryByText("Start building your paper bank"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("keeps cached attempt history visible with a stale warning", () => {
    const cached = apiMocks.useListPastPaperAttempts();
    apiMocks.useListPastPaperAttempts.mockReturnValue({
      ...cached,
      isError: true,
      error: new Error("Failed to fetch"),
    });
    renderPastPapers();
    expect(screen.getByText("Paper history refresh failed")).toBeVisible();
    expect(screen.getAllByText("66.7%").length).toBeGreaterThan(0);
  });

  it("renders recovered attempt history after retry", () => {
    apiMocks.useListPastPaperAttempts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Failed to fetch"),
      refetch: vi.fn(),
    });
    const view = renderPastPapers();
    apiMocks.useListPastPaperAttempts.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    view.rerender(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(PastPapers),
      ),
    );
    expect(screen.getByText("Start building your paper bank")).toBeVisible();
  });

  it("shows component loading only inside the logging form", () => {
    apiMocks.useListAssessmentComponents.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPastPapers();
    fireEvent.change(
      screen
        .getAllByRole("option", { name: "Mathematics" })
        .at(-1)!
        .closest("select")!,
      {
        target: { value: "9" },
      },
    );
    expect(screen.getByText("Loading assessment components…")).toBeVisible();
    expect(screen.getAllByText("66.7%").length).toBeGreaterThan(0);
  });

  it("keeps component failure form-local and retryable", () => {
    const refetch = vi.fn();
    apiMocks.useListAssessmentComponents.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: Object.assign(new Error("forbidden"), { status: 403 }),
      refetch,
    });
    renderPastPapers();
    fireEvent.change(
      screen
        .getAllByRole("option", { name: "Mathematics" })
        .at(-1)!
        .closest("select")!,
      {
        target: { value: "9" },
      },
    );
    expect(screen.getByText("Components could not be loaded")).toBeVisible();
    expect(screen.getAllByText("66.7%").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("distinguishes a genuinely empty component catalogue", () => {
    apiMocks.useListAssessmentComponents.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    renderPastPapers();
    fireEvent.change(
      screen
        .getAllByRole("option", { name: "Mathematics" })
        .at(-1)!
        .closest("select")!,
      {
        target: { value: "9" },
      },
    );
    expect(
      screen.getByText(
        "No assessment components are available for this subject.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByText("Components could not be loaded"),
    ).not.toBeInTheDocument();
  });

  it("renders recovered components after retry", () => {
    apiMocks.useListAssessmentComponents.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Failed to fetch"),
      refetch: vi.fn(),
    });
    const view = renderPastPapers();
    fireEvent.change(
      screen
        .getAllByRole("option", { name: "Mathematics" })
        .at(-1)!
        .closest("select")!,
      {
        target: { value: "9" },
      },
    );
    apiMocks.useListAssessmentComponents.mockReturnValue({
      data: [
        {
          id: 42,
          paperCode: "9709/1",
          componentName: "Pure Mathematics 1",
          level: "AS Level",
        },
      ],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    view.rerender(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(PastPapers),
      ),
    );
    expect(
      screen.getByRole("option", { name: /Pure Mathematics 1/ }),
    ).toBeVisible();
  });
});
