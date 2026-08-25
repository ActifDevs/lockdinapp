import {
  createElement,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  subjects: vi.fn(),
  memberships: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("wouter", () => ({
  Link: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => createElement("a", { href, ...props }, children),
}));

vi.mock("@workspace/api-client-react", () => ({
  getListSubjectsQueryKey: () => ["/api/subjects"],
  getListCurrentUserSubjectsQueryKey: () => ["/api/user-subjects"],
  getGetDashboardSummaryQueryKey: () => ["/api/dashboard/summary"],
  getGetProgressOverviewQueryKey: () => ["/api/progress/overview"],
  useListSubjects: api.subjects,
  useListCurrentUserSubjects: api.memberships,
  useReplaceCurrentUserSubjects: api.replace,
}));

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-a",
      name: "Amina",
      email: "amina@example.test",
      username: "amina",
      level: "A Level",
      examSession: "May/June 2027",
    },
    updateUser: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-notification-prefs", () => ({
  useNotificationPrefs: () => ({
    prefs: { morningSummary: true, deadlineReminders: true, examAlerts: false },
    updatePref: vi.fn(),
    requestBrowserPermission: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import Settings from "./settings";

const subject = { id: 9, name: "Mathematics", code: "9709", color: "#0f766e" };
const membership = { subject };
const ok = (data: unknown) => ({
  data,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
});

beforeEach(() => {
  window.history.replaceState({}, "", "/settings?tab=subjects");
  api.subjects.mockReturnValue(ok([subject]));
  api.memberships.mockReturnValue(ok([membership]));
  api.replace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <Settings />
    </QueryClientProvider>,
  );
}

describe("Settings catalogue read states", () => {
  it("shows catalogue loading distinctly", () => {
    api.subjects.mockReturnValue({ ...ok(undefined), isLoading: true });
    renderPage();
    expect(
      screen.getByRole("status", { name: "Loading subject catalogue" }),
    ).toBeVisible();
    expect(
      screen.queryByText("The subject catalogue is currently empty."),
    ).not.toBeInTheDocument();
  });

  it("disables subject editing on initial catalogue failure and offers retry", () => {
    const refetch = vi.fn();
    api.subjects.mockReturnValue({
      ...ok(undefined),
      isError: true,
      error: Object.assign(new Error("forbidden"), { status: 403 }),
      refetch,
    });
    renderPage();
    expect(screen.getByText("Subject catalogue is unavailable")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Save subjects" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();

    expect(screen.getByRole("tab", { name: "Alerts" })).toBeVisible();
  });

  it("renders a recovered catalogue after retry", () => {
    api.subjects.mockReturnValue({
      ...ok(undefined),
      isError: true,
      error: new Error("Failed to fetch"),
    });
    const view = renderPage();
    api.subjects.mockReturnValue(ok([subject]));
    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <Settings />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Mathematics")).toBeVisible();
    expect(
      screen.queryByText("Subject catalogue is unavailable"),
    ).not.toBeInTheDocument();
  });

  it("distinguishes a genuinely empty catalogue from an error", () => {
    api.subjects.mockReturnValue(ok([]));
    renderPage();
    expect(
      screen.getByText("The subject catalogue is currently empty."),
    ).toBeVisible();
    expect(
      screen.queryByText("Subject catalogue is unavailable"),
    ).not.toBeInTheDocument();
  });

  it("keeps cached catalogue choices with a refresh warning", () => {
    api.subjects.mockReturnValue({
      ...ok([subject]),
      isError: true,
      error: new Error("Failed to fetch"),
    });
    renderPage();
    expect(screen.getByText("Subject catalogue refresh failed")).toBeVisible();
    expect(screen.getByText("Mathematics")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save subjects" })).toBeEnabled();
  });
});
