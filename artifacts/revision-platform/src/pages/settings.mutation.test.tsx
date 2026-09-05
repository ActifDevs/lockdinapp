import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  subjects: vi.fn(),
  memberships: vi.fn(),
  replace: vi.fn(),
  availability: vi.fn(),
  routes: vi.fn(),
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
  useAssignCurrentUserSubjectAssessmentRoute: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  listSubjectAssessmentRoutes: api.routes,
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
const routeCatalogue = (
  subjectId: number,
  syllabusVersionId: number,
  selectionMode: "none_available" | "auto" | "explicit" = "auto",
  optionGroups: Array<{
    id: number;
    displayLabel: string;
    applicableQualificationTarget: "as_level" | "a_level" | "both";
    minSelections: number;
    maxSelections: number;
    options: Array<{ id: number; displayLabel: string }>;
  }> = [],
) => ({
  subjectId,
  syllabusVersionId,
  selectionMode,
  routes:
    selectionMode === "none_available"
      ? []
      : [
          {
            id: subjectId * 1000 + 1,
            routeKey: "default",
            displayLabel: "Standard route",
            qualificationTarget: "as_level",
          },
          ...(selectionMode === "explicit"
            ? [
                {
                  id: subjectId * 1000 + 2,
                  routeKey: "full",
                  displayLabel: "Full A Level",
                  qualificationTarget: "a_level",
                },
              ]
            : []),
        ],
  optionGroups,
});
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
        syllabusVersion: {
          id: 10,
          label: "2025–2027",
          examBoard: "CAIE",
          qualification: "A Level",
        },
        assessmentRouteId: null,
        intendedExamSession: { year: 2026, series: "May/June" },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]),
  );
  api.replace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  api.routes.mockImplementation(
    (subjectId: number, syllabusVersionId: number) =>
      Promise.resolve(routeCatalogue(subjectId, syllabusVersionId)),
  );
  api.availability.mockReturnValue(
    ok([
      {
        subjectId: subject.id,
        sessions: [
          {
            year: 2026,
            series: "Oct/Nov",
            label: "Oct/Nov 2026",
            syllabusVersionId: 10,
          },
          {
            year: 2027,
            series: "May/June",
            label: "May/June 2027",
            syllabusVersionId: 10,
          },
        ],
      },
      {
        subjectId: chemistry.id,
        sessions: [
          {
            year: 2026,
            series: "Oct/Nov",
            label: "Oct/Nov 2026",
            syllabusVersionId: 10,
          },
          {
            year: 2027,
            series: "May/June",
            label: "May/June 2027",
            syllabusVersionId: 10,
          },
        ],
      },
      {
        subjectId: history.id,
        sessions: [
          {
            year: 2027,
            series: "May/June",
            label: "May/June 2027",
            syllabusVersionId: 10,
          },
        ],
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
    const save = screen.getByRole("button", { name: "Save subjects" });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    expect(mutateAsync).toHaveBeenCalledWith({
      data: {
        subjectIds: [9, 1, 2],
        intendedExamSession: { year: 2026, series: "Oct/Nov" },
        subjectSessionOverrides: [
          { subjectId: 2, year: 2027, series: "May/June" },
        ],
        routeAssignments: [
          { subjectId: 1, routeId: 1001, optionIds: [] },
          { subjectId: 2, routeId: 2001, optionIds: [] },
        ],
      },
    });
    expect(mutateAsync.mock.calls[0]?.[0]).not.toHaveProperty(
      "syllabusVersionId",
    );
  });

  it("keeps route state independent across multiple new subjects", async () => {
    api.routes.mockImplementation(
      (subjectId: number, syllabusVersionId: number) =>
        Promise.resolve(
          routeCatalogue(subjectId, syllabusVersionId, "explicit"),
        ),
    );
    const mutateAsync = vi
      .fn()
      .mockResolvedValue([
        { subject },
        { subject: chemistry },
        { subject: history },
      ]);
    api.replace.mockReturnValue({ mutateAsync, isPending: false });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Chemistry/i }));
    let chemistryRoutes = await screen.findByRole("radiogroup", {
      name: "How are you taking Chemistry?",
    });
    fireEvent.click(
      within(chemistryRoutes).getByRole("radio", { name: "Full A Level" }),
    );

    fireEvent.click(screen.getByRole("button", { name: /History/i }));
    const historyRoutes = await screen.findByRole("radiogroup", {
      name: "How are you taking History?",
    });
    chemistryRoutes = screen.getByRole("radiogroup", {
      name: "How are you taking Chemistry?",
    });
    await waitFor(() =>
      expect(
        within(chemistryRoutes).getByRole("radio", { name: "Full A Level" }),
      ).toHaveAttribute("aria-checked", "true"),
    );
    expect(
      within(historyRoutes).getByRole("radio", { name: "Full A Level" }),
    ).toHaveAttribute("aria-checked", "false");
    fireEvent.click(
      within(historyRoutes).getByRole("radio", { name: "Standard route" }),
    );
    const save = screen.getByRole("button", { name: "Save subjects" });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    expect(mutateAsync).toHaveBeenCalledWith({
      data: {
        subjectIds: [9, 1, 2],
        intendedExamSession: { year: 2027, series: "May/June" },
        routeAssignments: [
          { subjectId: 1, routeId: 1002, optionIds: [] },
          { subjectId: 2, routeId: 2001, optionIds: [] },
        ],
      },
    });
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
        {
          subject,
          syllabusVersion: {
            id: 10,
            label: "2025–2027",
            examBoard: "CAIE",
            qualification: "A Level",
          },
          assessmentRouteId: null,
          intendedExamSession: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          subject: history,
          syllabusVersion: {
            id: 11,
            label: "2025–2027",
            examBoard: "CAIE",
            qualification: "A Level",
          },
          assessmentRouteId: null,
          intendedExamSession: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
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
    expect(
      screen.getByRole("button", { name: "Save subjects" }),
    ).toBeDisabled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("preserves a safe assignment reason when the atomic save is rejected", async () => {
    const mutateAsync = vi.fn().mockRejectedValue(
      new api.ApiError(409, {
        error: "No syllabus matches that exam session.",
      }),
    );
    api.replace.mockReturnValue({ mutateAsync, isPending: false });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Chemistry/i }));
    const save = screen.getByRole("button", { name: "Save subjects" });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          description:
            "No syllabus matches that exam session. Your subject selection was not changed.",
        }),
      ),
    );
    expect(
      screen.getByText(
        "No syllabus matches that exam session. Your subject selection was not changed.",
      ),
    ).toBeVisible();
  });

  it("requires an explicit History route and one generic study option", async () => {
    api.routes.mockImplementation(
      (subjectId: number, syllabusVersionId: number) => {
        if (subjectId !== history.id) {
          return Promise.resolve(routeCatalogue(subjectId, syllabusVersionId));
        }
        const catalogue = routeCatalogue(
          subjectId,
          syllabusVersionId,
          "explicit",
          [
            {
              id: 51,
              displayLabel: "Depth study",
              applicableQualificationTarget: "both",
              minSelections: 1,
              maxSelections: 1,
              options: [
                { id: 501, displayLabel: "European history" },
                { id: 502, displayLabel: "American history" },
              ],
            },
          ],
        );
        return Promise.resolve({
          ...catalogue,
          routes: [
            ...catalogue.routes,
            {
              id: 2003,
              routeKey: "staged",
              displayLabel: "Staged A Level",
              qualificationTarget: "a_level",
            },
          ],
        });
      },
    );
    const mutateAsync = vi
      .fn()
      .mockResolvedValue([{ subject }, { subject: history }]);
    api.replace.mockReturnValue({ mutateAsync, isPending: false });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /History/i }));
    const routeGroup = await screen.findByRole("radiogroup", {
      name: "How are you taking History?",
    });
    expect(api.routes).toHaveBeenCalledWith(history.id, 10);
    expect(within(routeGroup).getAllByRole("radio")).toHaveLength(3);
    const save = screen.getByRole("button", { name: "Save subjects" });
    expect(save).toBeDisabled();
    fireEvent.click(
      within(routeGroup).getByRole("radio", { name: "Standard route" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "European history" }));
    await waitFor(() => expect(save).toBeEnabled());

    fireEvent.click(
      within(routeGroup).getByRole("radio", { name: "Full A Level" }),
    );
    expect(
      screen.getByRole("checkbox", { name: "European history" }),
    ).toBeChecked();
    expect(save).toBeEnabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "European history" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "American history" }));
    expect(
      screen.getByRole("checkbox", { name: "American history" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "European history" }),
    ).not.toBeChecked();
    fireEvent.click(save);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    expect(mutateAsync).toHaveBeenCalledWith({
      data: {
        subjectIds: [9, 2],
        intendedExamSession: { year: 2027, series: "May/June" },
        routeAssignments: [{ subjectId: 2, routeId: 2002, optionIds: [502] }],
      },
    });
  });

  it("B5D-003: History Full A Level accepts one option from each of three 1/1 groups", async () => {
    api.routes.mockImplementation(
      (subjectId: number, syllabusVersionId: number) => {
        if (subjectId !== history.id) {
          return Promise.resolve(routeCatalogue(subjectId, syllabusVersionId));
        }
        return Promise.resolve(
          routeCatalogue(subjectId, syllabusVersionId, "explicit", [
            {
              id: 4,
              displayLabel: "AS History Option",
              applicableQualificationTarget: "both",
              minSelections: 1,
              maxSelections: 1,
              options: [
                { id: 10, displayLabel: "Modern Europe, 1774–1924" },
                { id: 11, displayLabel: "The History of the USA, 1820–1941" },
              ],
            },
            {
              id: 5,
              displayLabel: "Paper 3 Prescribed Topic",
              applicableQualificationTarget: "a_level",
              minSelections: 1,
              maxSelections: 1,
              options: [
                { id: 13, displayLabel: "The origins of the First World War" },
                { id: 14, displayLabel: "The Holocaust" },
              ],
            },
            {
              id: 6,
              displayLabel: "Paper 4 Depth Study Option",
              applicableQualificationTarget: "a_level",
              minSelections: 1,
              maxSelections: 1,
              options: [
                {
                  id: 16,
                  displayLabel: "Depth Study 1: European History",
                },
                { id: 17, displayLabel: "Depth Study 2: The USA, 1945–93" },
              ],
            },
          ]),
        );
      },
    );
    const mutateAsync = vi
      .fn()
      .mockResolvedValue([{ subject }, { subject: history }]);
    api.replace.mockReturnValue({ mutateAsync, isPending: false });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /History/i }));
    const routeGroup = await screen.findByRole("radiogroup", {
      name: "How are you taking History?",
    });
    const save = screen.getByRole("button", { name: "Save subjects" });
    fireEvent.click(
      within(routeGroup).getByRole("radio", { name: "Full A Level" }),
    );
    expect(save).toBeDisabled();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Modern Europe, 1774–1924" }),
    );
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "The Holocaust" }));
    expect(save).toBeDisabled();
    // Same-group over-select must remain blocked after other groups fill.
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "The History of the USA, 1820–1941",
      }),
    );
    expect(
      screen.getByRole("checkbox", { name: "Modern Europe, 1774–1924" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", {
        name: "The History of the USA, 1820–1941",
      }),
    ).not.toBeChecked();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Depth Study 2: The USA, 1945–93" }),
    );
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    expect(mutateAsync).toHaveBeenCalledWith({
      data: {
        subjectIds: [9, 2],
        intendedExamSession: { year: 2027, series: "May/June" },
        routeAssignments: [
          { subjectId: 2, routeId: 2002, optionIds: [10, 14, 17] },
        ],
      },
    });
  });

  it("B5D-005: History AS renders and submits only the applicable AS group", async () => {
    api.routes.mockImplementation(
      (subjectId: number, syllabusVersionId: number) =>
        Promise.resolve(
          routeCatalogue(subjectId, syllabusVersionId, "explicit", [
            {
              id: 4,
              displayLabel: "AS History Option",
              applicableQualificationTarget: "both",
              minSelections: 1,
              maxSelections: 1,
              options: [{ id: 10, displayLabel: "Modern Europe" }],
            },
            {
              id: 5,
              displayLabel: "Paper 3 Prescribed Topic",
              applicableQualificationTarget: "a_level",
              minSelections: 1,
              maxSelections: 1,
              options: [{ id: 14, displayLabel: "The Holocaust" }],
            },
            {
              id: 6,
              displayLabel: "Paper 4 Depth Study Option",
              applicableQualificationTarget: "a_level",
              minSelections: 1,
              maxSelections: 1,
              options: [{ id: 17, displayLabel: "Depth Study 2" }],
            },
          ]),
        ),
    );
    const mutateAsync = vi
      .fn()
      .mockResolvedValue([{ subject }, { subject: history }]);
    api.replace.mockReturnValue({ mutateAsync, isPending: false });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /History/i }));
    const routeGroup = await screen.findByRole("radiogroup", {
      name: "How are you taking History?",
    });
    fireEvent.click(
      within(routeGroup).getByRole("radio", { name: "Standard route" }),
    );

    expect(screen.getByText("AS History Option")).toBeVisible();
    expect(
      screen.queryByText("Paper 3 Prescribed Topic"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Paper 4 Depth Study Option"),
    ).not.toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Save subjects" });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Modern Europe" }));
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    expect(mutateAsync).toHaveBeenCalledWith({
      data: {
        subjectIds: [9, 2],
        intendedExamSession: { year: 2027, series: "May/June" },
        routeAssignments: [{ subjectId: 2, routeId: 2001, optionIds: [10] }],
      },
    });
  });

  it("clears a new subject route when its session changes", async () => {
    api.routes.mockImplementation(
      (subjectId: number, syllabusVersionId: number) =>
        Promise.resolve(
          routeCatalogue(subjectId, syllabusVersionId, "explicit"),
        ),
    );
    const mutateAsync = vi
      .fn()
      .mockResolvedValue([{ subject }, { subject: chemistry }]);
    api.replace.mockReturnValue({ mutateAsync, isPending: false });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Chemistry/i }));
    let routeGroup = await screen.findByRole("radiogroup", {
      name: "How are you taking Chemistry?",
    });
    fireEvent.click(
      within(routeGroup).getByRole("radio", { name: "Full A Level" }),
    );
    const save = screen.getByRole("button", { name: "Save subjects" });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Session for Chemistry"), {
      target: { value: "Oct/Nov 2026" },
    });
    expect(save).toBeDisabled();
    await waitFor(() =>
      expect(api.routes).toHaveBeenCalledWith(chemistry.id, 10),
    );
    routeGroup = await screen.findByRole("radiogroup", {
      name: "How are you taking Chemistry?",
    });
    const fullRoute = within(routeGroup).getByRole("radio", {
      name: "Full A Level",
    });
    expect(fullRoute).toHaveAttribute("aria-checked", "false");
    fireEvent.click(fullRoute);
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    expect(mutateAsync).toHaveBeenCalledWith({
      data: {
        subjectIds: [9, 1],
        intendedExamSession: { year: 2027, series: "May/June" },
        subjectSessionOverrides: [
          { subjectId: 1, year: 2026, series: "Oct/Nov" },
        ],
        routeAssignments: [{ subjectId: 1, routeId: 1002, optionIds: [] }],
      },
    });
  });

  it("blocks every new enrollment when one route catalogue is unavailable", async () => {
    api.routes.mockImplementation(
      (subjectId: number, syllabusVersionId: number) =>
        Promise.resolve(
          subjectId === history.id
            ? routeCatalogue(subjectId, syllabusVersionId, "none_available")
            : routeCatalogue(subjectId, syllabusVersionId),
        ),
    );
    const mutateAsync = vi.fn();
    api.replace.mockReturnValue({ mutateAsync, isPending: false });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Chemistry/i }));
    fireEvent.click(screen.getByRole("button", { name: /History/i }));
    expect(
      (
        await screen.findAllByText(
          /Assessment routes are not available for this subject yet/i,
        )
      )[0],
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Save subjects" }),
    ).toBeDisabled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("blocks save and shows a safe retry when route catalogues fail to load", async () => {
    api.routes.mockRejectedValue(new Error("private route table detail"));
    const mutateAsync = vi.fn();
    api.replace.mockReturnValue({ mutateAsync, isPending: false });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Chemistry/i }));
    expect(
      await screen.findByText(
        "Could not load assessment choices. Please try again.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByText("private route table detail"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save subjects" }),
    ).toBeDisabled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("keeps Save disabled until the route catalogue resolves", async () => {
    let releaseRoutes: (() => void) | null = null;
    api.routes.mockImplementation(
      (subjectId: number, syllabusVersionId: number) =>
        new Promise<void>((resolve) => {
          releaseRoutes = resolve;
        }).then(() => routeCatalogue(subjectId, syllabusVersionId)),
    );
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Chemistry/i }));
    const save = screen.getByRole("button", { name: "Save subjects" });
    expect(save).toBeDisabled();
    await act(async () => {
      releaseRoutes?.();
    });
    await waitFor(() => expect(save).toBeEnabled());
  });

  it("does not restore a stale route after subject deselection and reselection", async () => {
    api.routes.mockImplementation(
      (subjectId: number, syllabusVersionId: number) =>
        Promise.resolve(
          routeCatalogue(subjectId, syllabusVersionId, "explicit"),
        ),
    );
    renderPage();

    const chemistryButton = screen.getByRole("button", { name: /Chemistry/i });
    fireEvent.click(chemistryButton);
    let routeGroup = await screen.findByRole("radiogroup", {
      name: "How are you taking Chemistry?",
    });
    fireEvent.click(
      within(routeGroup).getByRole("radio", { name: "Full A Level" }),
    );
    const save = screen.getByRole("button", { name: "Save subjects" });
    await waitFor(() => expect(save).toBeEnabled());

    fireEvent.click(chemistryButton);
    fireEvent.click(chemistryButton);
    expect(save).toBeDisabled();
    routeGroup = await screen.findByRole("radiogroup", {
      name: "How are you taking Chemistry?",
    });
    expect(
      within(routeGroup).getByRole("radio", { name: "Full A Level" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("shows safe route API reasons inline and hides unknown server details", async () => {
    const mutateAsync = vi
      .fn()
      .mockRejectedValueOnce(
        new api.ApiError(400, {
          error: "Choose how you are taking this subject.",
        }),
      )
      .mockRejectedValueOnce(
        new api.ApiError(500, { error: "private route_assignment row 77" }),
      );
    api.replace.mockReturnValue({ mutateAsync, isPending: false });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Chemistry/i }));
    const save = screen.getByRole("button", { name: "Save subjects" });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    expect(
      await screen.findByText(
        "Choose how you are taking this subject. Your subject selection was not changed.",
      ),
    ).toBeVisible();

    fireEvent.click(save);
    expect(
      await screen.findByText(
        "Your previous selection is unchanged. Please try again.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByText("private route_assignment row 77"),
    ).not.toBeInTheDocument();
  });

  it("does not resend or alter a retained assessment route", async () => {
    api.memberships.mockReturnValue(
      ok([
        {
          subject,
          syllabusVersion: {
            id: 10,
            label: "2025–2027",
            examBoard: "CAIE",
            qualification: "A Level",
          },
          assessmentRouteId: 9001,
          intendedExamSession: { year: 2026, series: "May/June" },
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    );
    const mutateAsync = vi.fn().mockResolvedValue([{ subject }]);
    api.replace.mockReturnValue({ mutateAsync, isPending: false });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Save subjects" }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    expect(mutateAsync).toHaveBeenCalledWith({ data: { subjectIds: [9] } });
  });
});
