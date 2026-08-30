import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  subjects: vi.fn(),
  memberships: vi.fn(),
  replace: vi.fn(),
  availability: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    data: unknown;
    constructor(status: number, data: unknown) {
      super("API request failed");
      this.status = status;
      this.data = data;
    }
  },
}));
const toast = vi.hoisted(() => vi.fn());
const updateUser = vi.hoisted(() => vi.fn());

vi.mock("wouter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wouter")>()),
  Link: ({ children, href }: { children: ReactNode; href: string }) =>
    createElement("a", { href }, children),
}));
vi.mock("@workspace/api-client-react", () => ({
  getListSubjectsQueryKey: () => ["/api/subjects"],
  getListCurrentUserSubjectsQueryKey: () => ["/api/user-subjects"],
  getGetDashboardSummaryQueryKey: () => ["/api/dashboard/summary"],
  getGetProgressOverviewQueryKey: () => ["/api/progress/overview"],
  getGetSubjectSyllabusQueryKey: (id: number) => [
    `/api/subjects/${id}/syllabus`,
  ],
  getListAssessmentComponentsQueryKey: (id: number) => [
    `/api/subjects/${id}/assessment-components`,
  ],
  useListSubjects: api.subjects,
  useListCurrentUserSubjects: api.memberships,
  useReplaceCurrentUserSubjects: api.replace,
  useListSubjectAssignmentSessions: api.availability,
  ApiError: api.ApiError,
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
const chemistry = { id: 1, name: "Chemistry", code: "9701", color: "#2563eb" };
const history = { id: 2, name: "History", code: "9489", color: "#dc2626" };
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
  api.subjects.mockReturnValue(ok([subject, chemistry, history]));
  api.memberships.mockReturnValue(
    ok([
      {
        subject,
        intendedExamSession: { year: 2026, series: "May/June" },
      },
    ]),
  );
  api.replace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  api.availability.mockReturnValue(
    ok([
      {
        subjectId: subject.id,
        sessions: [
          { year: 2026, series: "Oct/Nov", label: "Oct/Nov 2026" },
          { year: 2027, series: "May/June", label: "May/June 2027" },
        ],
      },
      {
        subjectId: chemistry.id,
        sessions: [
          { year: 2026, series: "Oct/Nov", label: "Oct/Nov 2026" },
          { year: 2027, series: "May/June", label: "May/June 2027" },
        ],
      },
      {
        subjectId: history.id,
        sessions: [{ year: 2027, series: "May/June", label: "May/June 2027" }],
      },
    ]),
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

describe("Settings subject-session mutations", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/settings?tab=subjects");
  });

  it("displays a retained membership session without an edit control", () => {
    renderPage();
    expect(screen.getByText("May/June 2026")).toBeVisible();
    expect(
      screen.getByText(/Recorded exam session · read-only/i),
    ).toBeVisible();
    expect(
      screen.queryByLabelText("Session for Mathematics"),
    ).not.toBeInTheDocument();
  });

  it("adds two subjects with different sessions and sends overrides only for new rows", async () => {
    const mutateAsync = vi
      .fn()
      .mockResolvedValue([
        { subject },
        { subject: chemistry },
        { subject: history },
      ]);
    api.replace.mockReturnValue({ mutateAsync, isPending: false });
    renderPage();

    fireEvent.change(
      screen.getByLabelText("Default session for newly added subjects"),
      {
        target: { value: "Oct/Nov 2026" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /Chemistry/i }));
    fireEvent.click(screen.getByRole("button", { name: /History/i }));
    expect(
      screen.getByText(/Choose an available session for History/i),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("Session for History"), {
      target: { value: "May/June 2027" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save subjects" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    expect(mutateAsync).toHaveBeenCalledWith({
      data: {
        subjectIds: [9, 1, 2],
        intendedExamSession: { year: 2026, series: "Oct/Nov" },
        subjectSessionOverrides: [
          { subjectId: 2, year: 2027, series: "May/June" },
        ],
      },
    });
    expect(mutateAsync.mock.calls[0]?.[0]).not.toHaveProperty(
      "syllabusVersionId",
    );
  });

  it("allows a retained-only save without sending assignment sessions", async () => {
    const mutateAsync = vi.fn().mockResolvedValue([{ subject }]);
    api.replace.mockReturnValue({ mutateAsync, isPending: false });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Save subjects" }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    expect(mutateAsync).toHaveBeenCalledWith({ data: { subjectIds: [9] } });
  });

  it("allows removal-only without validating the profile/default session", async () => {
    api.memberships.mockReturnValue(
      ok([
        { subject, intendedExamSession: null },
        { subject: history, intendedExamSession: null },
      ]),
    );
    const mutateAsync = vi.fn().mockResolvedValue([{ subject }]);
    api.replace.mockReturnValue({ mutateAsync, isPending: false });
    renderPage();
    fireEvent.change(
      screen.getByLabelText("Default session for newly added subjects"),
      {
        target: { value: "" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /History/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save subjects" }));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ data: { subjectIds: [9] } }),
    );
  });

  it("blocks a new add without a structured available session", async () => {
    const mutateAsync = vi.fn();
    api.replace.mockReturnValue({ mutateAsync, isPending: false });
    renderPage();
    fireEvent.change(
      screen.getByLabelText("Default session for newly added subjects"),
      {
        target: { value: "" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /Chemistry/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save subjects" }));
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Choose a supported exam session" }),
    );
  });

  it("preserves a safe assignment reason when the atomic save is rejected", async () => {
    const mutateAsync = vi
      .fn()
      .mockRejectedValue(
        new api.ApiError(409, {
          error: "No syllabus matches that exam session.",
        }),
      );
    api.replace.mockReturnValue({ mutateAsync, isPending: false });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Chemistry/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save subjects" }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          description:
            "No syllabus matches that exam session. Your subject selection was not changed.",
        }),
      ),
    );
  });
});
