import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  tasks: vi.fn(),
  exams: vi.fn(),
}));

vi.mock("@workspace/api-client-react", () => ({
  getListTasksQueryKey: (params: unknown) => ["/api/tasks", params],
  getListExamDatesQueryKey: () => ["/api/exam-dates"],
  useListTasks: api.tasks,
  useListExamDates: api.exams,
}));

import CalendarPage from "./calendar";

const ok = (data: unknown) => ({
  data,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
});

const exam = {
  id: 1,
  subjectId: 9,
  subjectName: "Mathematics",
  subjectColor: "#0f766e",
  paperCode: "9709/1",
  date: "2026-09-14",
  startTime: "09:00",
  durationMinutes: 105,
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 7, 25, 12, 0, 0));
  window.history.replaceState({}, "", "/calendar");
  api.tasks.mockReturnValue(ok([]));
  api.exams.mockReturnValue(ok([exam]));
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

function expectSelectedDate(label: RegExp) {
  expect(screen.getByText(label)).toBeInTheDocument();
}

describe("Calendar navigation state", () => {
  it("defaults to the current local day with a concise URL", () => {
    renderPage();
    expect(
      screen.getAllByRole("heading", { name: "August 2026" }),
    ).not.toHaveLength(0);
    expectSelectedDate(/Selected: Tuesday, August 25, 2026/);
    expect(window.location.search).toBe("");
  });

  it("restores strict month-only, date-only, and differing month/date state", () => {
    window.history.replaceState({}, "", "/calendar?month=2026-10");
    let view = renderPage();
    expect(
      screen.getAllByRole("heading", { name: "October 2026" }),
    ).not.toHaveLength(0);
    expectSelectedDate(/Selected: Tuesday, August 25, 2026/);
    view.unmount();

    window.history.replaceState({}, "", "/calendar?date=2028-02-29");
    view = renderPage();
    expect(
      screen.getAllByRole("heading", { name: "February 2028" }),
    ).not.toHaveLength(0);
    expectSelectedDate(/Selected: Tuesday, February 29, 2028/);
    view.unmount();

    window.history.replaceState(
      {},
      "",
      "/calendar?month=2026-10&date=2026-09-14",
    );
    renderPage();
    expect(
      screen.getAllByRole("heading", { name: "October 2026" }),
    ).not.toHaveLength(0);
    expectSelectedDate(/Selected: Monday, September 14, 2026/);
  });

  it("normalizes invalid values independently and compacts redundant month", async () => {
    window.history.replaceState(
      {},
      "",
      "/calendar?month=2026-13&date=2026-09-14&keep=1",
    );
    const replace = vi.spyOn(window.history, "replaceState");
    let view = renderPage();
    expect(
      screen.getAllByRole("heading", { name: "September 2026" }),
    ).not.toHaveLength(0);
    await waitFor(() =>
      expect(window.location.search).toBe("?date=2026-09-14&keep=1"),
    );
    view.unmount();

    window.history.replaceState(
      {},
      "",
      "/calendar?month=2026-10&date=2026-02-30&keep=1",
    );
    view = renderPage();
    expect(
      screen.getAllByRole("heading", { name: "October 2026" }),
    ).not.toHaveLength(0);
    expectSelectedDate(/Selected: Tuesday, August 25, 2026/);
    await waitFor(() =>
      expect(window.location.search).toBe("?month=2026-10&keep=1"),
    );
    view.unmount();

    window.history.replaceState(
      {},
      "",
      "/calendar?month=2026-09&date=2026-09-14&keep=1",
    );
    renderPage();
    await waitFor(() =>
      expect(window.location.search).toBe("?date=2026-09-14&keep=1"),
    );
    expect(replace).toHaveBeenCalled();
  });

  it("uses one replace update for month navigation across a year boundary", async () => {
    window.history.replaceState({}, "", "/calendar?month=2027-01&keep=1");
    const replace = vi.spyOn(window.history, "replaceState");
    const push = vi.spyOn(window.history, "pushState");
    renderPage();

    fireEvent.click(
      screen.getAllByRole("button", { name: "Previous month" })[0],
    );
    await waitFor(() =>
      expect(window.location.search).toBe("?keep=1&month=2026-12"),
    );
    expect(replace).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("selects a day atomically and keeps the compact date-only form", async () => {
    window.history.replaceState({}, "", "/calendar?month=2026-09&keep=1");
    const replace = vi.spyOn(window.history, "replaceState");
    renderPage();
    const target = screen.getAllByRole("button", {
      name: /Monday, September 14/,
    })[0];

    fireEvent.click(target);
    await waitFor(() =>
      expect(window.location.search).toBe("?keep=1&date=2026-09-14"),
    );
    expect(replace).toHaveBeenCalledTimes(1);
    expectSelectedDate(/Selected: Monday, September 14, 2026/);
  });

  it("preserves both values when an adjacent grid date differs from the viewed month", async () => {
    window.history.replaceState({}, "", "/calendar?month=2026-09");
    renderPage();
    fireEvent.click(
      screen.getByRole("gridcell", {
        name: /Monday, August 31, 2026/,
      }),
    );
    await waitFor(() =>
      expect(window.location.search).toBe("?month=2026-09&date=2026-08-31"),
    );
  });

  it("uses compact replace-mode state for an exam jump and Today", async () => {
    const replace = vi.spyOn(window.history, "replaceState");
    const push = vi.spyOn(window.history, "pushState");
    renderPage();
    fireEvent.click(
      screen.getByRole("listitem", {
        name: /Mathematics 9709\/1, 20 days away on September 14/,
      }),
    );
    await waitFor(() =>
      expect(window.location.search).toBe("?date=2026-09-14"),
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Today" })[0]);
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(replace).toHaveBeenCalledTimes(2);
    expect(push).not.toHaveBeenCalled();
  });

  it("restores the final state on remount and does not add Calendar Back stops", async () => {
    window.history.replaceState({}, "", "/dashboard");
    window.history.pushState({}, "", "/calendar?keep=1");
    const push = vi.spyOn(window.history, "pushState");
    const view = renderPage();
    fireEvent.click(screen.getAllByRole("button", { name: "Next month" })[0]);
    await waitFor(() =>
      expect(window.location.search).toBe("?keep=1&month=2026-09"),
    );
    expect(push).not.toHaveBeenCalled();

    view.unmount();
    renderPage();
    expect(
      screen.getAllByRole("heading", { name: "September 2026" }),
    ).not.toHaveLength(0);

    await act(async () => window.history.back());
    await waitFor(() => expect(window.location.pathname).toBe("/dashboard"));
  });
});
