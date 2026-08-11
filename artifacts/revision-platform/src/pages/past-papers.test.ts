import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, Fragment, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  useListSubjects: vi.fn(),
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
  getListSubjectsQueryKey: () => ["/api/subjects"],
  useCreatePastPaperAttempt: apiMocks.useCreatePastPaperAttempt,
  useDeletePastPaperAttempt: apiMocks.useDeletePastPaperAttempt,
  useListAssessmentComponents: apiMocks.useListAssessmentComponents,
  useListPastPaperAttempts: apiMocks.useListPastPaperAttempts,
  useListSubjects: apiMocks.useListSubjects,
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
  apiMocks.useListSubjects.mockReturnValue({
    data: [{ id: 9, name: "Mathematics", code: "9709", color: "#0f766e" }],
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
        dateAttempted: "2026-08-11T00:00:00.000Z",
      },
    ],
    isLoading: false,
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
});
