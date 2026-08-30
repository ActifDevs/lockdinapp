import {
  createElement,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  subjects: vi.fn(),
  memberships: vi.fn(),
  replace: vi.fn(),
  availability: vi.fn(),
}));

vi.mock("wouter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wouter")>()),
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
  useListSubjectAssignmentSessions: api.availability,
  ApiError: class ApiError extends Error {
    status = 500;
    data: unknown;
  },
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
  api.availability.mockReturnValue(
    ok([
      {
        subjectId: subject.id,
        sessions: [{ year: 2027, series: "May/June", label: "May/June 2027" }],
      },
    ]),
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
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

describe("Settings navigation state", () => {
  it.each([
    ["/settings", "Account"],
    ["/settings?tab=account", "Account"],
    ["/settings?tab=subjects", "Subjects"],
    ["/settings?tab=appearance", "Appearance"],
    ["/settings?tab=notifications", "Alerts"],
  ])("restores %s as the %s tab", (path, label) => {
    window.history.replaceState({}, "", path);
    const view = renderPage();
    expect(screen.getByRole("tab", { name: label })).toHaveAttribute(
      "data-state",
      "active",
    );

    view.unmount();
    renderPage();
    expect(screen.getByRole("tab", { name: label })).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  it("pushes tab changes, omits Account, and preserves unrelated params", async () => {
    window.history.replaceState({}, "", "/settings?keep=one&keep=two");
    const push = vi.spyOn(window.history, "pushState");
    renderPage();

    await userEvent.click(screen.getByRole("tab", { name: "Alerts" }));
    expect(window.location.search).toBe("?keep=one&keep=two&tab=notifications");
    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls.map(([, , url]) => String(url))).toEqual([
      "/settings?keep=one&keep=two&tab=notifications",
    ]);

    await userEvent.click(screen.getByRole("tab", { name: "Account" }));
    expect(window.location.search).toBe("?keep=one&keep=two");
    expect(push).toHaveBeenCalledTimes(2);
    expect(push.mock.calls.map(([, , url]) => String(url))).toEqual([
      "/settings?keep=one&keep=two&tab=notifications",
      "/settings?keep=one&keep=two",
    ]);
  });

  it("renders Account and replace-normalizes an invalid tab", async () => {
    window.history.replaceState({}, "", "/settings?tab=garbage&keep=1");
    const replace = vi.spyOn(window.history, "replaceState");
    const push = vi.spyOn(window.history, "pushState");
    renderPage();

    expect(screen.getByRole("tab", { name: "Account" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await waitFor(() => expect(window.location.search).toBe("?keep=1"));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("restores tab selection through browser Back and Forward", async () => {
    window.history.replaceState({}, "", "/settings");
    renderPage();
    await userEvent.click(screen.getByRole("tab", { name: "Subjects" }));
    await userEvent.click(screen.getByRole("tab", { name: "Appearance" }));

    await act(async () => window.history.back());
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Subjects" })).toHaveAttribute(
        "data-state",
        "active",
      ),
    );
    expect(window.location.search).toBe("?tab=subjects");

    await act(async () => window.history.forward());
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Appearance" })).toHaveAttribute(
        "data-state",
        "active",
      ),
    );
    expect(window.location.search).toBe("?tab=appearance");
  });
});
