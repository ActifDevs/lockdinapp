import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useGetProgressOverview: vi.fn(),
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetProgressOverviewQueryKey: () => ["/api/progress/overview"],
  useGetProgressOverview: mocks.useGetProgressOverview,
}));

vi.mock("@/components/charts/weekly-activity-bar-chart", () => ({
  default: () => null,
}));

import ProgressPage from "./progress";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProgressPage", () => {
  it("visibly renders the caller-owned paper count from the API", () => {
    mocks.useGetProgressOverview.mockReturnValue({
      data: {
        syllabusCompletion: [],
        weeklyTasksCompleted: [],
        subjectAttentionNeeded: [],
        totalTasksCompleted: 5,
        totalPapersLogged: 2,
        overallSyllabusProgress: 40,
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ProgressPage />);

    expect(screen.getByText("Papers logged")).toBeVisible();
    expect(screen.getByText("2")).toBeVisible();
  });
});
