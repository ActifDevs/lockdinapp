import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  subjects: vi.fn(),
  memberships: vi.fn(),
  replace: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());
const updateUser = vi.hoisted(() => vi.fn());

vi.mock("wouter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wouter")>()),
  Link: ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => createElement("a", { href }, children),
}));
vi.mock("@workspace/api-client-react", () => ({
  getListSubjectsQueryKey: () => ["/api/subjects"],
  getListCurrentUserSubjectsQueryKey: () => ["/api/user-subjects"],
  getGetDashboardSummaryQueryKey: () => ["/api/dashboard/summary"],
  getGetProgressOverviewQueryKey: () => ["/api/progress/overview"],
  getGetSubjectSyllabusQueryKey: (id: number) => [`/api/subjects/${id}/syllabus`],
  getListAssessmentComponentsQueryKey: (id: number) => [
    `/api/subjects/${id}/assessment-components`,
  ],
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
    updateUser,
  }),
}));
vi.mock("@/hooks/use-notification-prefs", () => ({
  useNotificationPrefs: () => ({
    prefs: { morningSummary: true, deadlineReminders: true, examAlerts: false },
    updatePref: vi.fn(),
    requestBrowserPermission: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ toast }));

import Settings from "./settings";

const subject = { id: 9, name: "Mathematics", code: "9709", color: "#0f766e" };
const ok = (data: unknown) => ({
  data,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
});

beforeEach(() => {
  window.history.replaceState({}, "", "/settings?tab=account");
  toast.mockReset();
  updateUser.mockReset();
  updateUser.mockResolvedValue({});
  api.subjects.mockReturnValue(ok([subject]));
  api.memberships.mockReturnValue(ok([{ subject }]));
  api.replace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
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
        <Settings />
      </QueryClientProvider>,
    ),
  };
}

describe("Settings profile mutations", () => {
  it("invalidates Dashboard summary after a successful profile save", async () => {
    const { client } = renderPage();
    const spy = vi.spyOn(client, "invalidateQueries");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledOnce());
    expect(spy).toHaveBeenCalledWith({
      queryKey: ["/api/dashboard/summary"],
    });
    expect(toast).toHaveBeenCalledWith({ title: "Profile updated" });
    expect(window.location.search).toContain("tab=account");
  });

  it("does not invalidate Dashboard summary when profile save fails", async () => {
    updateUser.mockRejectedValue(new Error("hidden server detail"));
    const { client } = renderPage();
    const spy = vi.spyOn(client, "invalidateQueries");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Could not save profile",
          variant: "destructive",
        }),
      ),
    );
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByText("hidden server detail")).not.toBeInTheDocument();
  });
});
