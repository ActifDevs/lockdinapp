import { act, cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReminderRunner } from "./reminder-runner";

const state = vi.hoisted(() => ({ userId: "user-a" }));
const listTasks = vi.hoisted(() => vi.fn(async () => []));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isOnboarded: true,
    user: { id: state.userId },
  }),
}));

vi.mock("@/hooks/use-notification-prefs", () => ({
  useNotificationPrefs: () => ({
    prefs: {
      morningSummary: true,
      deadlineReminders: false,
      examAlerts: false,
    },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

vi.mock("@workspace/api-client-react", () => ({
  listTasks,
  listExamDates: vi.fn(async () => []),
  getGetDashboardSummaryQueryKey: () => ["/api/dashboard/summary"],
}));

describe("ReminderRunner account switches", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T08:00:00.000Z"));
    localStorage.clear();
    listTasks.mockClear();
    state.userId = "user-a";
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("runs an initial evaluation for B after A already ran", async () => {
    const queryClient = new QueryClient();
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ReminderRunner />
      </QueryClientProvider>,
    );

    await act(async () => vi.advanceTimersByTimeAsync(2500));
    expect(listTasks).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("lockdin_morning_ping:user-a")).toBe(
      "2026-08-14",
    );

    state.userId = "user-b";
    rerender(
      <QueryClientProvider client={queryClient}>
        <ReminderRunner />
      </QueryClientProvider>,
    );
    await act(async () => vi.advanceTimersByTimeAsync(2500));

    expect(listTasks).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem("lockdin_morning_ping:user-b")).toBe(
      "2026-08-14",
    );
  });
});
